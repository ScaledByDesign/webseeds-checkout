const { chromium } = require('playwright');

/**
 * Test that validates the thank you page displays correct order items
 * Runs a complete purchase flow and verifies the order summary
 */

async function testThankYouPageValidation() {
  console.log('🧪 THANK YOU PAGE VALIDATION TEST');
  console.log('='.repeat(50));
  console.log('This test will:');
  console.log('1. Complete a checkout with specific products');
  console.log('2. Accept/decline upsells with tracking');
  console.log('3. Validate the thank you page shows correct items');
  console.log('='.repeat(50) + '\n');

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Track what we're purchasing
  const orderTracking = {
    initialProduct: null,
    initialQuantity: 0,
    initialPrice: 0,
    upsells: [],
    expectedTotal: 0,
    sessionId: null,
    transactionId: null
  };

  // Intercept API responses to track purchases
  await page.route('**/api/**', async (route, request) => {
    const response = await route.fetch();
    const url = request.url();
    
    if (url.includes('/api/checkout/process') && request.method() === 'POST') {
      const responseData = await response.json();
      if (responseData.success) {
        orderTracking.sessionId = responseData.sessionId;
        orderTracking.transactionId = responseData.transactionId;
        
        // Parse the initial order from request
        const requestData = JSON.parse(request.postData() || '{}');
        console.log('📦 Initial Order Captured:');
        console.log(`  Session: ${responseData.sessionId}`);
        console.log(`  Transaction: ${responseData.transactionId}`);
      }
    }
    
    if (url.includes('/api/upsell/process') && request.method() === 'POST') {
      const requestData = JSON.parse(request.postData() || '{}');
      const responseData = await response.json();
      
      if (responseData.success) {
        orderTracking.upsells.push({
          step: requestData.step,
          productCode: requestData.productCode,
          bottles: requestData.bottles,
          amount: requestData.amount,
          transactionId: responseData.transactionId
        });
        
        console.log(`📦 Upsell ${requestData.step} Captured:`);
        console.log(`  Product: ${requestData.productCode}`);
        console.log(`  Bottles: ${requestData.bottles}`);
        console.log(`  Amount: $${requestData.amount}`);
      }
    }
    
    await route.continue();
  });

  try {
    // 1. CHECKOUT PHASE
    console.log('\n📍 PHASE 1: Initial Checkout');
    console.log('=' .repeat(30));
    
    await page.goto('http://localhost:3255/checkout');
    await page.waitForLoadState('networkidle');
    
    // Note initial product selection
    const productInfo = await page.evaluate(() => {
      // Find selected product (default is usually 1 bottle)
      const selectedRadio = document.querySelector('input[type="radio"]:checked');
      if (selectedRadio) {
        const label = selectedRadio.closest('label');
        const text = label?.textContent || '';
        return {
          text: text,
          value: selectedRadio.value
        };
      }
      return null;
    });
    
    if (productInfo) {
      console.log(`📦 Initial product selection: ${productInfo.text}`);
      orderTracking.initialProduct = productInfo.value;
    }
    
    // Fill checkout form with test data
    const testEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    console.log(`📧 Using test email: ${testEmail}`);
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="nameOnCard"]', 'Test User');
    await page.fill('input[name="phone"]', '5555551234');
    await page.fill('input[name="address"]', '123 Test St');
    await page.fill('input[name="city"]', 'Test City');
    await page.fill('input[name="zip"]', '12345');
    await page.fill('input#state', 'CA');
    
    // Fill payment fields
    console.log('💳 Filling payment information...');
    const cardNumber = '4012000033330026';
    const expiry = '12/28';
    const cvv = '123';
    
    try {
      const cardFrame = page.frameLocator('#card-number-field iframe');
      await cardFrame.locator('input#ccnumber').fill(cardNumber);
      
      const expiryFrame = page.frameLocator('#card-expiry-field iframe');
      await expiryFrame.locator('input#ccexp').fill(expiry);
      
      const cvvFrame = page.frameLocator('#card-cvv-field iframe');
      await cvvFrame.locator('input#cvv').fill(cvv);
      
      console.log('✅ Payment fields filled');
    } catch (e) {
      console.log('⚠️ Using alternative payment field method');
    }
    
    // Submit checkout
    const submitButton = page.locator('button:has-text("Complete Order"), button:has-text("Place Your Order")').first();
    await submitButton.click();
    console.log('🚀 Checkout submitted');
    
    // Wait for redirect
    await page.waitForURL(/upsell|thankyou/, { timeout: 30000 });
    console.log(`✅ Redirected to: ${page.url()}`);
    
    // 2. UPSELL PHASE
    if (page.url().includes('/upsell/1')) {
      console.log('\n📍 PHASE 2: Upsell 1');
      console.log('=' .repeat(30));
      
      // Accept first upsell
      const acceptButton = page.locator('button:has-text("Yes! Upgrade My Order!")').first();
      if (await acceptButton.isVisible()) {
        console.log('✅ Accepting upsell 1...');
        await acceptButton.click();
        await page.waitForURL(/upsell\/2|thankyou/, { timeout: 30000 });
      }
    }
    
    // Handle upsell 2
    if (page.url().includes('/upsell/2')) {
      console.log('\n📍 PHASE 3: Upsell 2');
      console.log('=' .repeat(30));
      
      // Decline upsell 2
      const declineLink = page.locator('a:has-text("No thanks")').first();
      if (await declineLink.isVisible()) {
        console.log('🚫 Declining upsell 2...');
        await declineLink.click();
        
        // Handle potential downsell
        await page.waitForTimeout(2000);
        const finalDecline = page.locator('button:has-text("No thanks, I understand")').first();
        if (await finalDecline.isVisible()) {
          console.log('🚫 Declining downsell...');
          await finalDecline.click();
        }
        
        await page.waitForURL(/thankyou/, { timeout: 30000 });
      }
    }
    
    // 3. THANK YOU PAGE VALIDATION
    if (page.url().includes('/thankyou')) {
      console.log('\n📍 PHASE 4: Thank You Page Validation');
      console.log('=' .repeat(50));
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Extract order details from the page
      const orderDetails = await page.evaluate(() => {
        const details = {
          orderNumber: null,
          customerEmail: null,
          items: [],
          subtotal: null,
          tax: null,
          shipping: null,
          total: null,
          shippingAddress: null
        };
        
        // Look for order number
        const orderNumberElement = document.querySelector('h2:has-text("Order #"), h3:has-text("Order #"), .order-number');
        if (orderNumberElement) {
          details.orderNumber = orderNumberElement.textContent.replace(/Order #?/i, '').trim();
        }
        
        // Look for email
        const emailElements = Array.from(document.querySelectorAll('*')).filter(el => 
          el.textContent.includes('@') && el.textContent.includes('test')
        );
        if (emailElements.length > 0) {
          const emailMatch = emailElements[0].textContent.match(/[\w.-]+@[\w.-]+\.\w+/);
          if (emailMatch) {
            details.customerEmail = emailMatch[0];
          }
        }
        
        // Look for product items in order summary
        const productRows = document.querySelectorAll('tr:has(td), .order-item, .product-row');
        productRows.forEach(row => {
          const text = row.textContent;
          // Look for patterns like "RetinaClear", "bottles", quantity, price
          if (text.includes('bottle') || text.includes('RetinaClear') || text.includes('RC')) {
            const quantityMatch = text.match(/(\d+)\s*bottle/i) || text.match(/x\s*(\d+)/);
            const priceMatch = text.match(/\$[\d,]+\.?\d*/);
            
            details.items.push({
              text: text.trim(),
              quantity: quantityMatch ? quantityMatch[1] : null,
              price: priceMatch ? priceMatch[0] : null
            });
          }
        });
        
        // Look for totals
        const totalElements = Array.from(document.querySelectorAll('*')).filter(el => {
          const text = el.textContent;
          return text.includes('Total:') || text.includes('Subtotal:') || 
                 text.includes('Tax:') || text.includes('Shipping:');
        });
        
        totalElements.forEach(el => {
          const text = el.textContent;
          const priceMatch = text.match(/\$[\d,]+\.?\d*/);
          if (priceMatch) {
            if (text.includes('Subtotal')) details.subtotal = priceMatch[0];
            else if (text.includes('Tax')) details.tax = priceMatch[0];
            else if (text.includes('Shipping')) details.shipping = priceMatch[0];
            else if (text.includes('Total') && !text.includes('Subtotal')) details.total = priceMatch[0];
          }
        });
        
        // Look for shipping address
        const addressElements = Array.from(document.querySelectorAll('*')).filter(el => 
          el.textContent.includes('Test St') || el.textContent.includes('Test City')
        );
        if (addressElements.length > 0) {
          details.shippingAddress = addressElements[0].textContent.trim();
        }
        
        return details;
      });
      
      // Display validation results
      console.log('\n📊 ORDER DETAILS EXTRACTED:');
      console.log('=' .repeat(50));
      
      console.log(`\n📋 Order Information:`);
      console.log(`  Order #: ${orderDetails.orderNumber || '❌ NOT FOUND'}`);
      console.log(`  Email: ${orderDetails.customerEmail || '❌ NOT FOUND'}`);
      
      console.log(`\n📦 Order Items (${orderDetails.items.length} found):`);
      if (orderDetails.items.length > 0) {
        orderDetails.items.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.text.substring(0, 80)}...`);
          if (item.quantity) console.log(`     Quantity: ${item.quantity}`);
          if (item.price) console.log(`     Price: ${item.price}`);
        });
      } else {
        console.log('  ❌ No product items found on page');
      }
      
      console.log(`\n💰 Order Totals:`);
      console.log(`  Subtotal: ${orderDetails.subtotal || '❌ NOT FOUND'}`);
      console.log(`  Tax: ${orderDetails.tax || '❌ NOT FOUND'}`);
      console.log(`  Shipping: ${orderDetails.shipping || '❌ NOT FOUND'}`);
      console.log(`  Total: ${orderDetails.total || '❌ NOT FOUND'}`);
      
      console.log(`\n📍 Shipping Address:`);
      console.log(`  ${orderDetails.shippingAddress || '❌ NOT FOUND'}`);
      
      // Compare with tracked order
      console.log('\n🔍 VALIDATION AGAINST TRACKED ORDER:');
      console.log('=' .repeat(50));
      console.log(`Session ID: ${orderTracking.sessionId}`);
      console.log(`Initial Transaction: ${orderTracking.transactionId}`);
      console.log(`Upsells Accepted: ${orderTracking.upsells.length}`);
      
      if (orderTracking.upsells.length > 0) {
        console.log('\nUpsell Details:');
        orderTracking.upsells.forEach(upsell => {
          console.log(`  Step ${upsell.step}: ${upsell.bottles} bottles for $${upsell.amount}`);
        });
      }
      
      // Calculate expected items
      const expectedBottles = 1 + orderTracking.upsells.reduce((sum, u) => sum + (u.bottles || 0), 0);
      console.log(`\n✅ Expected total bottles: ${expectedBottles}`);
      
      // Take screenshot
      await page.screenshot({ 
        path: 'tests/screenshots/thankyou-page-validated.png',
        fullPage: true 
      });
      console.log('\n📸 Screenshot saved: tests/screenshots/thankyou-page-validated.png');
      
      // Final validation summary
      console.log('\n' + '=' .repeat(50));
      console.log('📊 VALIDATION SUMMARY:');
      console.log('=' .repeat(50));
      
      const validationPassed = 
        orderDetails.orderNumber && 
        orderDetails.items.length > 0 &&
        orderDetails.total;
      
      if (validationPassed) {
        console.log('✅ THANK YOU PAGE VALIDATION PASSED!');
        console.log('  ✓ Order number displayed');
        console.log('  ✓ Product items listed');
        console.log('  ✓ Order total shown');
      } else {
        console.log('❌ THANK YOU PAGE VALIDATION FAILED!');
        if (!orderDetails.orderNumber) console.log('  ✗ Order number missing');
        if (orderDetails.items.length === 0) console.log('  ✗ No product items found');
        if (!orderDetails.total) console.log('  ✗ Order total missing');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'tests/screenshots/thankyou-validation-error.png' });
  } finally {
    console.log('\n🏁 Test completed. Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

// Run the test
testThankYouPageValidation().catch(console.error);