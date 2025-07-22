const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Running COMPLETE FRESH checkout + upsell flow test...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Track console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('🎉') || text.includes('✅') || text.includes('❌') || 
        text.includes('🎯') || text.includes('🔐') || text.includes('🎟️') ||
        text.includes('Session') || text.includes('session') || text.includes('vault')) {
      console.log('📌 PAGE LOG:', text);
    }
  });
  
  // Track network requests for upsell API
  page.on('request', request => {
    if (request.url().includes('/api/upsell/process')) {
      console.log('📡 UPSELL API REQUEST:', request.method());
      console.log('📦 REQUEST BODY:', request.postData());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/upsell/process')) {
      console.log('📨 UPSELL API RESPONSE:', response.status());
      response.text().then(text => {
        try {
          const json = JSON.parse(text);
          console.log('📊 UPSELL RESPONSE:', JSON.stringify(json, null, 2));
        } catch {
          console.log('📊 UPSELL TEXT:', text);
        }
      });
    }
  });
  
  try {
    // 1. FRESH CHECKOUT
    console.log('📍 PHASE 1: Fresh Checkout');
    console.log('===========================\n');
    
    await page.goto('http://localhost:3000/checkout');
    
    // Unique data for this test
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const testEmail = `fresh-${timestamp}-${randomStr}@example.com`;
    const randomZip = `900${Math.floor(Math.random() * 90) + 10}`;
    
    console.log(`📧 Using email: ${testEmail}`);
    
    // Fill form quickly
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="firstName"]', 'Fresh');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="phone"]', '5551234567');
    await page.fill('input[name="billingAddress"]', '456 Fresh St');
    await page.fill('input[name="billingCity"]', 'Fresh City');
    await page.fill('input[name="billingState"]', 'CA');
    await page.fill('input[name="billingZipCode"]', randomZip);
    
    // Wait for payment system
    console.log('💳 Waiting for payment system...');
    await page.waitForSelector('text=✅ Payment system ready', { timeout: 15000 });
    
    // Fill card details with randomized values to avoid duplicates
    const cardNumberFrame = page.frameLocator('#card-number-field iframe');
    await cardNumberFrame.locator('input#ccnumber').fill('4111111111111111');
    
    // Randomize expiry month (01-12) and year (25-29)
    const randomMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const randomYear = String(Math.floor(Math.random() * 5) + 25);
    const expiryFrame = page.frameLocator('#card-expiry-field iframe');
    await expiryFrame.locator('input#ccexp').fill(`${randomMonth}/${randomYear}`);
    
    // Randomize CVV (100-999)
    const randomCvv = String(Math.floor(Math.random() * 900) + 100);
    const cvvFrame = page.frameLocator('#card-cvv-field iframe');
    await cvvFrame.locator('input#cvv').fill(randomCvv);
    
    console.log(`💳 Using expiry: ${randomMonth}/${randomYear}, CVV: ${randomCvv}`);
    
    await page.fill('input[name="nameOnCard"]', 'Fresh Test');
    
    // Submit checkout
    console.log('🚀 Submitting payment...');
    await page.click('button:has-text("Complete Order")');
    
    // Wait for redirect to upsell 1
    console.log('⏳ Waiting for redirect to upsell...');
    await page.waitForURL('**/upsell/1**', { timeout: 45000 });
    
    console.log('✅ Redirected to upsell 1 successfully!');
    
    // Extract session ID from URL
    const url = new URL(page.url());
    const sessionId = url.searchParams.get('session');
    const transactionId = url.searchParams.get('transaction');
    console.log(`📋 Session ID: ${sessionId}`);
    console.log(`📋 Transaction ID: ${transactionId}`);
    
    // 2. IMMEDIATE UPSELL 1 TEST
    console.log('\n📍 PHASE 2: Immediate Upsell 1');
    console.log('===============================\n');
    
    // Wait for page to fully load
    await page.waitForTimeout(2000);
    
    // Find the upsell button
    console.log('🔍 Looking for upsell button...');
    const buttonSelector = 'button:has-text("Yes! Upgrade My Order!")';
    
    await page.waitForSelector(buttonSelector, { timeout: 10000 });
    console.log('✅ Found upsell button');
    
    // Click the button
    console.log('👆 Clicking upsell button...');
    await page.click(buttonSelector);
    
    // Wait for either redirect to upsell 2 or error
    console.log('⏳ Waiting for upsell processing...');
    
    const upsellResult = await Promise.race([
      // Success - redirect to upsell 2
      page.waitForURL('**/upsell/2**', { timeout: 20000 }).then(() => 'success'),
      // Error message appears
      page.waitForSelector('text=/error|failed|unauthorized/i', { timeout: 20000 }).then(() => 'error')
    ]);
    
    if (upsellResult === 'success') {
      console.log('✅ Upsell 1 successful! Redirected to upsell 2');
      
      // 3. UPSELL 2 TEST
      console.log('\n📍 PHASE 3: Upsell 2');
      console.log('===================\n');
      
      await page.waitForTimeout(2000);
      
      // Take screenshot
      await page.screenshot({ path: 'test-upsell-2-success.png' });
      console.log('📸 Upsell 2 screenshot: test-upsell-2-success.png');
      
      // Click "No thanks" to go to thank you page
      console.log('🚫 Clicking "No thanks" to skip upsell 2...');
      const noThanksButton = page.locator('text=/No thanks|continue to order confirmation/i').first();
      
      if (await noThanksButton.isVisible()) {
        await noThanksButton.click();
        
        // Wait for thank you page
        await page.waitForURL('**/thankyou**', { timeout: 15000 });
        console.log('✅ Reached thank you page!');
        
        // 4. THANK YOU PAGE
        console.log('\n📍 PHASE 4: Thank You Page');
        console.log('==========================\n');
        
        await page.screenshot({ path: 'test-complete-flow-success.png' });
        console.log('📸 Final screenshot: test-complete-flow-success.png');
        
        console.log('\n🎉 COMPLETE FLOW TEST SUCCESSFUL!');
        console.log('===================================');
        console.log('✅ Checkout processed');
        console.log('✅ Upsell 1 processed');
        console.log('✅ Upsell 2 skipped');
        console.log('✅ Thank you page reached');
        
      } else {
        console.log('⚠️ Could not find "No thanks" button on upsell 2');
      }
      
    } else {
      console.error('❌ Upsell 1 failed or timed out');
      
      // Check for error messages
      try {
        const errorElement = await page.locator('text=/error|failed|unauthorized/i').first();
        if (await errorElement.isVisible()) {
          const errorText = await errorElement.textContent();
          console.error('📋 Error message:', errorText);
        }
      } catch (e) {
        console.error('📋 Could not extract error message');
      }
      
      // Take debug screenshot
      await page.screenshot({ path: 'test-upsell-1-failed.png' });
      console.error('📸 Error screenshot: test-upsell-1-failed.png');
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'test-complete-flow-error.png' });
    console.error('📸 Error screenshot: test-complete-flow-error.png');
    console.error('📍 Current URL:', page.url());
  } finally {
    console.log('\n🏁 Test completed. Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();