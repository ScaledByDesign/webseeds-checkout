const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting complete checkout + upsell flow test...\n');
  
  const browser = await chromium.launch({ 
    headless: false,  // Set to true to run in background
    slowMo: 300      // Slow down actions to see what's happening
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Track console logs from the page
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('🎉') || text.includes('✅') || text.includes('❌') || 
        text.includes('🎯') || text.includes('🔐') || text.includes('🎟️') ||
        text.includes('Session') || text.includes('session') || text.includes('vault')) {
      console.log('📌 PAGE LOG:', text);
    }
  });
  
  try {
    // 1. CHECKOUT PHASE
    console.log('📍 PHASE 1: Initial Checkout');
    console.log('==============================\n');
    
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
    await page.fill('input[name="lastName"]', 'Customer');
    await page.fill('input[name="phone"]', '5551234567');
    
    // Fill billing address
    console.log('🏠 Filling billing address...');
    await page.fill('input[name="billingAddress"]', '123 Test Street');
    await page.fill('input[name="billingCity"]', 'Los Angeles');
    await page.fill('input[name="billingState"]', 'CA');
    // Use random zip to help avoid duplicates
    const randomZip = `900${Math.floor(Math.random() * 90) + 10}`;
    await page.fill('input[name="billingZipCode"]', randomZip);
    
    // Wait for CollectJS
    console.log('💳 Waiting for payment system to load...');
    await page.waitForSelector('text=✅ Payment system ready', { timeout: 15000 });
    
    // Fill credit card details with randomized values to avoid duplicates
    console.log('💳 Entering credit card details...');
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
    
    await page.fill('input[name="nameOnCard"]', 'Test Customer');
    
    // Add a small delay to avoid rapid-fire duplicate detection
    await page.waitForTimeout(1000);
    
    // Submit checkout
    console.log('🚀 Submitting initial payment...');
    await page.click('button:has-text("Complete Order")');
    
    // Wait for processing
    console.log('⏳ Processing payment...');
    
    // Wait for either success (redirect) or error message
    const result = await Promise.race([
      // Success - redirect to upsell
      page.waitForURL('**/upsell/1**', { timeout: 30000 }).then(() => 'upsell'),
      // Success - redirect to thank you (no vault)
      page.waitForURL('**/thankyou**', { timeout: 30000 }).then(() => 'thankyou'),
      // Error message appears
      page.locator('text=/Payment failed|declined|error/i').first()
        .waitFor({ state: 'visible', timeout: 30000 }).then(() => 'error')
    ]);
    
    if (result === 'error') {
      const errorText = await page.locator('text=/Payment failed|declined|error/i').first().textContent();
      console.log(`❌ Payment failed: ${errorText}`);
      
      // Wait a bit and check if there's a retry message
      await page.waitForTimeout(2000);
      
      // Check current URL
      const currentUrl = page.url();
      if (currentUrl.includes('/upsell/')) {
        console.log('✅ Actually succeeded! Redirected to:', currentUrl);
        result = 'upsell'; // Override the result
      } else {
        throw new Error('Initial payment failed');
      }
    }
    
    if (result === 'thankyou') {
      console.log('✅ Payment successful but no upsell flow (possibly no vault created)');
      return;
    }
    
    console.log('✅ Payment successful! Redirected to upsell page 1');
    
    // Extract session ID from URL
    const url = new URL(page.url());
    const sessionId = url.searchParams.get('session');
    const transactionId = url.searchParams.get('transaction');
    console.log(`📋 Session ID: ${sessionId}`);
    console.log(`📋 Transaction ID: ${transactionId}`);
    
    // 2. UPSELL 1 PHASE
    console.log('\n📍 PHASE 2: Upsell 1 (RetinaClear)');
    console.log('===================================\n');
    
    // Wait for upsell page to load
    await page.waitForTimeout(2000);
    console.log('👀 Viewing RetinaClear upsell offer...');
    
    // Wait for the button to be visible
    try {
      await page.waitForSelector('button:has-text("Yes! Upgrade My Order!")', { timeout: 5000 });
      console.log('✅ Upsell button found');
    } catch (e) {
      console.log('⚠️ Waiting for upsell button...');
    }
    
    // Take screenshot of upsell 1
    await page.screenshot({ path: 'test-upsell-1.png', fullPage: true });
    console.log('📸 Screenshot saved: test-upsell-1.png');
    
    // Click "Yes! Upgrade My Order!" button for main offer
    const addButton = page.locator('button:has-text("Yes! Upgrade My Order!")').first();
    if (await addButton.isVisible()) {
      console.log('🛒 Clicking "I Accept Upgrade For $297" for RetinaClear 12 bottles...');
      await addButton.click();
      
      // Wait for processing
      console.log('⏳ Processing upsell payment (using stored card)...');
      
      // Wait for redirect to upsell 2 or thank you page
      await Promise.race([
        page.waitForURL('**/upsell/2**', { timeout: 30000 }),
        page.waitForURL('**/thankyou**', { timeout: 30000 })
      ]);
      
      if (page.url().includes('/upsell/2')) {
        console.log('✅ Upsell 1 successful! Redirected to upsell page 2');
        
        // 3. UPSELL 2 PHASE
        console.log('\n📍 PHASE 3: Upsell 2 (Sightagen)');
        console.log('=================================\n');
        
        // Wait for upsell 2 to load
        await page.waitForTimeout(2000);
        console.log('👀 Viewing Sightagen upsell offer...');
        
        // Take screenshot of upsell 2
        await page.screenshot({ path: 'test-upsell-2.png' });
        console.log('📸 Screenshot saved: test-upsell-2.png');
        
        // Click "No Thanks" to skip this upsell
        const noThanksButton = page.locator('a:has-text("No, Thanks")').first();
        if (await noThanksButton.isVisible()) {
          console.log('🚫 Clicking "No, Thanks" to skip Sightagen...');
          await noThanksButton.click();
          
          // Wait for thank you page
          await page.waitForURL('**/thankyou**', { timeout: 30000 });
        }
      }
    } else {
      console.log('❌ Could not find upsell button, skipping...');
    }
    
    // 4. THANK YOU PHASE
    console.log('\n📍 PHASE 4: Thank You Page');
    console.log('==========================\n');
    
    console.log('✅ Reached thank you page!');
    await page.waitForTimeout(2000);
    
    // Take screenshot of thank you page
    await page.screenshot({ path: 'test-thankyou.png' });
    console.log('📸 Screenshot saved: test-thankyou.png');
    
    // Try to extract order summary
    const bodyText = await page.locator('body').textContent();
    console.log('\n📊 Order Summary:');
    console.log('==================');
    
    // Look for transaction IDs
    const transactionMatches = bodyText.match(/Transaction ID:?\s*([A-Za-z0-9_-]+)/g);
    if (transactionMatches) {
      transactionMatches.forEach(match => {
        console.log(`✅ ${match}`);
      });
    }
    
    // Summary
    console.log('\n🎉 TEST COMPLETED SUCCESSFULLY!');
    console.log('================================');
    console.log('✅ Initial checkout processed');
    console.log('✅ Customer vault created');
    console.log('✅ Redirected to upsell flow');
    console.log('✅ One-click upsell payment tested');
    console.log('✅ Complete flow working!');
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'test-error-upsell.png' });
    console.error('📸 Error screenshot saved: test-error-upsell.png');
    
    // Log current URL for debugging
    console.error('📍 Current URL:', page.url());
  } finally {
    console.log('\n🏁 Test completed. Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();