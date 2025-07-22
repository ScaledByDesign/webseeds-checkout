const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting checkout flow test...\n');
  
  const browser = await chromium.launch({ 
    headless: false,  // Set to true to run in background
    slowMo: 500      // Slow down actions to see what's happening
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to checkout
    console.log('📍 Navigating to checkout page...');
    await page.goto('http://localhost:3000/checkout');
    
    // Generate unique email for this test run
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const testEmail = `test-${timestamp}-${randomStr}@example.com`;
    
    // Fill contact info
    console.log('📝 Filling contact information...');
    console.log(`📧 Using email: ${testEmail}`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="phone"]', '5559876543');
    
    // Fill billing address
    console.log('🏠 Filling billing address...');
    await page.fill('input[name="billingAddress"]', '456 Test Avenue');
    await page.fill('input[name="billingCity"]', 'San Francisco');
    await page.fill('input[name="billingState"]', 'CA');
    await page.fill('input[name="billingZipCode"]', '94102');
    
    // Wait before credit card details
    console.log('\n⏳ Waiting 3 seconds before entering payment details...\n');
    await page.waitForTimeout(3000);
    
    // Wait for CollectJS to be ready
    console.log('💳 Waiting for payment system to load...');
    await page.waitForSelector('text=✅ Payment system ready', { timeout: 15000 });
    
    // Fill credit card details
    console.log('💳 Entering credit card details...');
    
    // Card number
    const cardNumberFrame = page.frameLocator('#card-number-field iframe');
    await cardNumberFrame.locator('input#ccnumber').fill('4111111111111111');
    
    // Expiry
    const expiryFrame = page.frameLocator('#card-expiry-field iframe');
    await expiryFrame.locator('input#ccexp').fill('12/25');
    
    // CVV
    const cvvFrame = page.frameLocator('#card-cvv-field iframe');
    await cvvFrame.locator('input#cvv').fill('999');
    
    // Name on card
    await page.fill('input[name="nameOnCard"]', 'Test User');
    
    // Take screenshot
    await page.screenshot({ path: 'test-checkout-filled.png' });
    console.log('📸 Screenshot saved: test-checkout-filled.png');
    
    // Wait a moment before submitting
    console.log('\n⏳ Form filled. Waiting 2 seconds before submitting...\n');
    await page.waitForTimeout(2000);
    
    // Submit form
    console.log('🚀 Submitting payment...');
    await page.click('button:has-text("Complete Order")');
    
    // Wait for result
    console.log('⏳ Processing payment...');
    
    // Wait for either success or error
    const result = await Promise.race([
      page.waitForURL('**/thankyou', { timeout: 30000 }).then(() => 'success'),
      page.locator('text=/Payment failed|declined|error/i').first()
        .waitFor({ state: 'visible', timeout: 30000 }).then(() => 'error')
    ]);
    
    if (result === 'success') {
      console.log('\n✅ SUCCESS! Payment processed and redirected to thank you page');
      await page.screenshot({ path: 'test-checkout-success.png' });
      console.log('📸 Success screenshot saved: test-checkout-success.png');
      
      // Try to get transaction ID
      const transactionText = await page.locator('body').textContent();
      const transactionMatch = transactionText.match(/Transaction ID:?\s*([A-Za-z0-9_]+)/);
      if (transactionMatch) {
        console.log(`📋 Transaction ID: ${transactionMatch[1]}`);
      }
    } else {
      console.log('\n❌ Payment failed or was declined');
      const errorText = await page.locator('text=/Payment failed|declined|error/i').first().textContent();
      console.log(`❌ Error: ${errorText}`);
      await page.screenshot({ path: 'test-checkout-error.png' });
      console.log('📸 Error screenshot saved: test-checkout-error.png');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ path: 'test-checkout-error.png' });
  } finally {
    console.log('\n🏁 Test completed. Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();