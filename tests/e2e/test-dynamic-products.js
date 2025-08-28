const { chromium } = require('playwright');

(async () => {
  console.log('🛍️ Testing complete dynamic product listing...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Track console logs
  page.on('console', msg => {
    if (msg.text().includes('📋') || msg.text().includes('✅') || msg.text().includes('❌') || msg.text().includes('🎯')) {
      console.log('📌 PAGE LOG:', msg.text());
    }
  });
  
  try {
    // 1. Quick checkout to generate session with order data
    console.log('📍 STEP 1: Processing checkout to create order data...');
    await page.goto('http://localhost:3000/checkout');
    
    // Generate unique test data
    const timestamp = Date.now();
    const testEmail = `dynamic-${timestamp}@example.com`;
    const randomZip = `900${Math.floor(Math.random() * 90) + 10}`;
    
    // Fill form quickly
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="firstName"]', 'Dynamic');
    await page.fill('input[name="lastName"]', 'Product');
    await page.fill('input[name="phone"]', '5551234567');
    await page.fill('input[name="billingAddress"]', '789 Dynamic St');
    await page.fill('input[name="billingCity"]', 'Product City');
    await page.fill('input[name="billingState"]', 'CA');
    await page.fill('input[name="billingZipCode"]', randomZip);
    
    // Wait for payment system
    await page.waitForSelector('text=✅ Payment system ready', { timeout: 15000 });
    
    // Fill card details with random values
    const randomMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const randomYear = String(Math.floor(Math.random() * 5) + 25);
    const randomCvv = String(Math.floor(Math.random() * 900) + 100);
    
    const cardNumberFrame = page.frameLocator('#card-number-field iframe');
    await cardNumberFrame.locator('input#ccnumber').fill('4111111111111111');
    
    const expiryFrame = page.frameLocator('#card-expiry-field iframe');
    await expiryFrame.locator('input#ccexp').fill(`${randomMonth}/${randomYear}`);
    
    const cvvFrame = page.frameLocator('#card-cvv-field iframe');
    await cvvFrame.locator('input#cvv').fill(randomCvv);
    
    await page.fill('input[name="nameOnCard"]', 'Dynamic Product');
    
    console.log(`💳 Using expiry: ${randomMonth}/${randomYear}, CVV: ${randomCvv}`);
    
    // Submit checkout
    console.log('🚀 Submitting checkout...');
    await page.click('button:has-text("Complete Order")');
    
    // Wait for redirect to upsell 1
    await page.waitForURL('**/upsell/1**', { timeout: 30000 });
    
    const url = new URL(page.url());
    const sessionId = url.searchParams.get('session');
    const transactionId = url.searchParams.get('transaction');
    
    console.log(`✅ Checkout successful! Session: ${sessionId}, Transaction: ${transactionId}`);
    
    // 2. Test upsell purchase to add upsell products
    console.log('\n📍 STEP 2: Adding upsell product to test dynamic listing...');
    
    // Wait for upsell page to load
    await page.waitForTimeout(3000);
    
    // Click the "Yes! Upgrade My Order!" button for the 12-bottle RetinaClear upsell
    const upsellButton = page.locator('button:has-text("Yes! Upgrade My Order!")').first();
    if (await upsellButton.isVisible()) {
      console.log('🛒 Clicking upsell button for RetinaClear 12 bottles...');
      await upsellButton.click();
      
      // Wait for either redirect to upsell 2 or processing
      try {
        await Promise.race([
          page.waitForURL('**/upsell/2**', { timeout: 15000 }),
          page.waitForTimeout(10000) // Or just wait 10 seconds
        ]);
        console.log('✅ Upsell 1 processed (may or may not have redirected)');
      } catch (e) {
        console.log('⚠️ Upsell 1 processing timeout or redirect issue');
      }
    }
    
    // 3. Navigate directly to thank you page to test dynamic products
    console.log('\n📍 STEP 3: Testing dynamic thank you page...');
    
    await page.goto(`http://localhost:3000/thankyou?session=${sessionId}`);
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'test-dynamic-products.png', fullPage: true });
    console.log('📸 Dynamic products screenshot: test-dynamic-products.png');
    
    // Check what products are displayed
    try {
      const productElements = await page.locator('[class*="flex items-center gap-4"]:has(h4)').all();
      console.log(`\n🛍️ PRODUCTS DISPLAYED (${productElements.length} total):`);
      
      for (let i = 0; i < productElements.length; i++) {
        try {
          const productName = await productElements[i].locator('h4').textContent();
          const productDesc = await productElements[i].locator('p').first().textContent();
          const priceElement = await productElements[i].locator('div:last-child p').textContent();
          
          console.log(`   ${i + 1}. ${productName} - ${productDesc} - ${priceElement}`);
        } catch (e) {
          console.log(`   ${i + 1}. [Could not extract product details]`);
        }
      }
    } catch (e) {
      console.log('⚠️ Could not extract product information');
    }
    
    // Test API directly to see what data is stored
    console.log('\n📍 STEP 4: Checking API data...');
    
    const apiResponse = await page.evaluate(async (sessionId) => {
      try {
        const response = await fetch(`/api/order/details?session=${sessionId}`);
        return await response.json();
      } catch (error) {
        return { error: error.message };
      }
    }, sessionId);
    
    console.log('📊 API Response:');
    console.log('   Success:', apiResponse.success);
    console.log('   Products found:', apiResponse.order?.products?.length || 0);
    if (apiResponse.order?.products) {
      apiResponse.order.products.forEach((p, i) => {
        console.log(`   Product ${i + 1}: ${p.name} (${p.type}) - $${p.amount}`);
      });
    }
    
    console.log('\n✅ Dynamic product listing test completed!');
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'test-dynamic-products-error.png' });
    console.error('📸 Error screenshot: test-dynamic-products-error.png');
  } finally {
    console.log('\n🏁 Test completed. Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
})();