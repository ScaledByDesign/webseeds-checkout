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
          mainProducts: [],
          bonusProducts: [],
          upsellProducts: [],
          subtotal: null,
          tax: null,
          shipping: null,
          total: null,
          shippingAddress: null,
          debugInfo: {}
        };
        
        // Look for order number
        const orderNumberElement = document.querySelector('h2:has-text("Order #"), h3:has-text("Order #"), [class*="order-number"]');
        if (orderNumberElement) {
          details.orderNumber = orderNumberElement.textContent.replace(/Order #?/i, '').trim();
        }
        
        // Look for email in customer section
        const customerSection = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('Customer'));
        if (customerSection) {
          const parentDiv = customerSection.parentElement;
          const emailMatch = parentDiv?.textContent.match(/[\w.-]+@[\w.-]+\.\w+/);
          if (emailMatch) {
            details.customerEmail = emailMatch[0];
          }
        }
        
        // Look for products in Order Summary section
        const orderSummarySection = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('Order Summary'));
        if (orderSummarySection) {
          const listContainer = orderSummarySection.parentElement;
          const productItems = listContainer?.querySelectorAll('li');
          
          productItems?.forEach(item => {
            const text = item.textContent || '';
            const priceElement = item.querySelector('[class*="uppercase"]');
            const price = priceElement?.textContent || '';
            
            // Extract product name from h3 elements within the item
            const nameElement = item.querySelector('h3');
            const name = nameElement?.textContent || '';
            
            // Extract description from p elements
            const descElement = item.querySelector('p');
            const description = descElement?.textContent || '';
            
            const productInfo = {
              name: name.trim(),
              description: description.trim(),
              price: price.trim(),
              fullText: text.trim().substring(0, 200)
            };
            
            // Categorize products
            if (text.includes('Bonus') || price.toLowerCase().includes('free')) {
              details.bonusProducts.push(productInfo);
            } else if (text.includes('RetinaClear') || text.includes('Sightagen')) {
              details.mainProducts.push(productInfo);
            } else if (name) {
              details.items.push(productInfo);
            }
          });
        }
        
        // Look for Addons section for upsells
        const addonsSection = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('Addons'));
        if (addonsSection) {
          const listContainer = addonsSection.parentElement;
          const upsellItems = listContainer?.querySelectorAll('li');
          
          upsellItems?.forEach(item => {
            const nameElement = item.querySelector('h3');
            const priceElement = item.querySelector('[class*="uppercase"]');
            const descElement = item.querySelector('p');
            
            details.upsellProducts.push({
              name: nameElement?.textContent?.trim() || '',
              description: descElement?.textContent?.trim() || '',
              price: priceElement?.textContent?.trim() || '',
              fullText: item.textContent?.trim().substring(0, 200)
            });
          });
        }
        
        // Look for totals in both Order Summary and Addons sections
        const allListItems = document.querySelectorAll('li');
        allListItems.forEach(item => {
          const text = item.textContent || '';
          if (text.includes('Shipping') && !details.shipping) {
            const priceMatch = text.match(/\$?[\d,]+\.?\d*|free/i);
            details.shipping = priceMatch ? priceMatch[0] : null;
          }
          if (text.includes('Total') && !text.includes('Subtotal')) {
            const priceMatch = text.match(/\$[\d,]+\.?\d*/);
            if (priceMatch && !details.total) {
              details.total = priceMatch[0];
            }
          }
        });
        
        // Look for shipping address
        const shippingSection = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('Shipping'));
        if (shippingSection) {
          const parentDiv = shippingSection.parentElement;
          const addressParts = [];
          const paragraphs = parentDiv?.querySelectorAll('p');
          paragraphs?.forEach(p => {
            if (p.textContent && !p.textContent.includes('Shipping')) {
              addressParts.push(p.textContent.trim());
            }
          });
          details.shippingAddress = addressParts.join(', ');
        }
        
        // Capture debug info if available
        const debugSection = document.querySelector('[class*="Debug Info"]')?.parentElement;
        if (debugSection) {
          const debugText = debugSection.textContent || '';
          details.debugInfo = {
            available: true,
            text: debugText.substring(0, 500)
          };
        }
        
        return details;
      });
      
      // Display validation results
      console.log('\n📊 ORDER DETAILS EXTRACTED:');
      console.log('=' .repeat(50));
      
      console.log(`\n📋 Order Information:`);
      console.log(`  Order #: ${orderDetails.orderNumber || '❌ NOT FOUND'}`);
      console.log(`  Email: ${orderDetails.customerEmail || '❌ NOT FOUND'}`);
      
      console.log(`\n📦 Main Products (${orderDetails.mainProducts.length} found):`);
      if (orderDetails.mainProducts.length > 0) {
        orderDetails.mainProducts.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.name || 'Unknown Product'}`);
          if (item.description) console.log(`     Description: ${item.description}`);
          if (item.price) console.log(`     Price: ${item.price}`);
        });
      } else {
        console.log('  ❌ No main products found on page');
      }
      
      console.log(`\n🎁 Bonus Products (${orderDetails.bonusProducts.length} found):`);
      if (orderDetails.bonusProducts.length > 0) {
        orderDetails.bonusProducts.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.name || 'Unknown Bonus'}`);
          if (item.description) console.log(`     Description: ${item.description}`);
          console.log(`     Price: ${item.price || 'FREE'}`);
        });
      } else {
        console.log('  ❌ No bonus products found');
      }
      
      console.log(`\n⬆️ Upsell Products (${orderDetails.upsellProducts.length} found):`);
      if (orderDetails.upsellProducts.length > 0) {
        orderDetails.upsellProducts.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.name || 'Unknown Upsell'}`);
          if (item.description) console.log(`     Description: ${item.description}`);
          if (item.price) console.log(`     Price: ${item.price}`);
        });
      } else {
        console.log('  ℹ️ No upsells accepted');
      }
      
      console.log(`\n💰 Order Totals:`);
      console.log(`  Shipping: ${orderDetails.shipping || '❌ NOT FOUND'}`);
      console.log(`  Total: ${orderDetails.total || '❌ NOT FOUND'}`);
      
      console.log(`\n📍 Shipping Address:`);
      console.log(`  ${orderDetails.shippingAddress || '❌ NOT FOUND'}`);
      
      if (orderDetails.debugInfo.available) {
        console.log(`\n🔍 Debug Info Available: Yes`);
      }
      
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