const { chromium } = require('playwright');

(async () => {
  console.log('🐞 Debugging checkout submission...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Track ALL console messages
  page.on('console', msg => {
    console.log(`📌 ${msg.type().toUpperCase()}:`, msg.text());
  });
  
  // Track errors specifically
  page.on('pageerror', error => {
    console.error('❌ PAGE ERROR:', error.message);
  });
  
  // Track network requests and responses
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log('📡 API REQUEST:', request.method(), request.url());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log('📨 API RESPONSE:', response.status(), response.url());
      if (!response.ok()) {
        console.log('❌ Response not OK:', response.status(), response.statusText());
      }
    }
  });
  
  try {
    console.log('📍 Navigating to checkout page...');
    await page.goto('http://localhost:3000/checkout');
    
    // Wait for page to load completely
    await page.waitForTimeout(3000);
    
    // Generate unique test data
    const timestamp = Date.now();
    const testEmail = `debug-${timestamp}@example.com`;
    const randomZip = `900${Math.floor(Math.random() * 90) + 10}`;
    
    console.log(`📧 Using email: ${testEmail}`);
    
    // Fill contact info
    console.log('📝 Filling contact information...');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="firstName"]', 'Debug');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="phone"]', '5551234567');
    
    // Fill billing address
    console.log('🏠 Filling billing address...');
    await page.fill('input[name="billingAddress"]', '123 Debug St');
    await page.fill('input[name="billingCity"]', 'Test City');
    await page.fill('input[name="billingState"]', 'CA');
    await page.fill('input[name="billingZipCode"]', randomZip);
    
    // Wait for CollectJS to load
    console.log('💳 Waiting for payment system...');
    await page.waitForSelector('text=✅ Payment system ready', { timeout: 20000 });
    console.log('✅ Payment system is ready');
    
    // Fill card details
    console.log('💳 Entering card details...');
    const randomMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const randomYear = String(Math.floor(Math.random() * 5) + 25);
    const randomCvv = String(Math.floor(Math.random() * 900) + 100);
    
    const cardNumberFrame = page.frameLocator('#card-number-field iframe');
    await cardNumberFrame.locator('input#ccnumber').fill('4111111111111111');
    
    const expiryFrame = page.frameLocator('#card-expiry-field iframe');
    await expiryFrame.locator('input#ccexp').fill(`${randomMonth}/${randomYear}`);
    
    const cvvFrame = page.frameLocator('#card-cvv-field iframe');
    await cvvFrame.locator('input#cvv').fill(randomCvv);
    
    await page.fill('input[name="nameOnCard"]', 'Debug Test');
    
    console.log(`💳 Using expiry: ${randomMonth}/${randomYear}, CVV: ${randomCvv}`);
    
    // Take screenshot before submission
    await page.screenshot({ path: 'debug-before-submit.png' });
    console.log('📸 Pre-submission screenshot: debug-before-submit.png');
    
    // Check if the submit button is enabled
    const submitButton = page.locator('button:has-text("Complete Order")');
    const isEnabled = await submitButton.isEnabled();
    const isVisible = await submitButton.isVisible();
    
    console.log(`🔍 Submit button - Visible: ${isVisible}, Enabled: ${isEnabled}`);
    
    if (!isEnabled) {
      console.log('⚠️ Submit button is disabled. Checking form validation...');
      
      // Check for any error messages
      const errorElements = await page.locator('[class*="error"], [role="alert"], .text-red').all();
      if (errorElements.length > 0) {
        for (let i = 0; i < errorElements.length; i++) {
          const errorText = await errorElements[i].textContent();
          if (errorText && errorText.trim()) {
            console.log(`❌ Form error ${i + 1}:`, errorText);
          }
        }
      }
      
      // Check for required field validation
      const requiredFields = await page.locator('input[required], select[required]').all();
      for (let field of requiredFields) {
        const name = await field.getAttribute('name');
        const value = await field.inputValue();
        const isValid = await field.evaluate(el => el.checkValidity());
        console.log(`📋 Field ${name}: value="${value}", valid=${isValid}`);
      }
    }
    
    if (isEnabled && isVisible) {
      console.log('🚀 Attempting to submit form...');
      await submitButton.click();
      
      console.log('⏳ Waiting for processing...');
      await page.waitForTimeout(10000);
      
      // Check what happened
      const currentUrl = page.url();
      console.log('📍 Current URL after submit:', currentUrl);
      
      if (currentUrl.includes('/upsell/')) {
        console.log('✅ Successfully redirected to upsell!');
      } else if (currentUrl.includes('/thankyou')) {
        console.log('✅ Successfully redirected to thank you page!');
      } else {
        console.log('❌ Still on checkout page. Checking for errors...');
        
        // Take screenshot after submission attempt
        await page.screenshot({ path: 'debug-after-submit.png' });
        console.log('📸 Post-submission screenshot: debug-after-submit.png');
        
        // Look for any error messages that appeared
        const visibleErrors = await page.locator(':visible').filter({ hasText: /error|failed|declined/i }).all();
        if (visibleErrors.length > 0) {
          for (let error of visibleErrors) {
            const errorText = await error.textContent();
            console.log('❌ Visible error:', errorText);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ Debug error:', error.message);
    await page.screenshot({ path: 'debug-error.png' });
    console.error('📸 Error screenshot: debug-error.png');
  } finally {
    console.log('\n🏁 Debug completed. Browser will stay open for manual inspection...');
    await page.waitForTimeout(15000);
    await browser.close();
  }
})();