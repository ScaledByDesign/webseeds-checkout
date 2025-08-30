const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Testing Upsell Customer Name Fix\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Track console logs to see customer name handling
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Customer Name:') || 
        text.includes('customerInfo') || 
        text.includes('undefined undefined') ||
        text.includes('Session found:')) {
      console.log('📌 SERVER LOG:', text);
    }
  });
  
  try {
    // 1. Complete checkout first
    console.log('📍 Step 1: Checkout');
    await page.goto('http://localhost:3255/checkout');
    await page.waitForSelector('form#checkout-form', { timeout: 10000 });
    
    // Fill form with test data
    const testData = {
      email: `test-${Date.now()}@example.com`,
      nameOnCard: 'John Smith',
      phone: '5555551234',
      address: '123 Test St',
      city: 'Austin',
      state: 'TX',
      zip: '78701'
    };
    
    await page.fill('input[name="email"]', testData.email);
    await page.fill('input[name="nameOnCard"]', testData.nameOnCard);
    await page.fill('input[name="phone"]', testData.phone);
    await page.fill('input[name="address"]', testData.address);
    await page.fill('input[name="city"]', testData.city);
    await page.fill('input#state', testData.state);
    await page.fill('input[name="zip"]', testData.zip);
    
    // Wait for CollectJS
    await page.waitForTimeout(3000);
    
    // Fill payment fields
    try {
      const cardFrame = page.frameLocator('#card-number-field iframe');
      await cardFrame.locator('input#ccnumber').fill('4111111111111111');
      
      const expiryFrame = page.frameLocator('#card-expiry-field iframe');
      await expiryFrame.locator('input#ccexp').fill('12/28');
      
      const cvvFrame = page.frameLocator('#card-cvv-field iframe');
      await cvvFrame.locator('input#cvv').fill('123');
    } catch (e) {
      console.log('⚠️ Could not fill payment fields automatically');
    }
    
    // Submit checkout
    console.log('🚀 Submitting checkout...');
    const submitButton = page.locator('button:has-text("Complete Order"), button:has-text("Place Your Order")').first();
    await submitButton.click();
    
    // Wait for redirect to upsell
    await page.waitForURL('**/upsell/**', { timeout: 15000 });
    console.log('✅ Checkout successful, now on upsell page');
    
    // Get session ID from URL
    const url = new URL(page.url());
    const sessionId = url.searchParams.get('session');
    console.log(`📋 Session ID: ${sessionId}`);
    
    // 2. Process upsell to check customer name
    console.log('\n📍 Step 2: Processing Upsell (checking customer name)');
    await page.waitForTimeout(2000);
    
    // Accept upsell to trigger the API call
    const upsellButton = page.locator('button:has-text("Yes! Upgrade My Order!"), button:has-text("Upgrade")').first();
    if (await upsellButton.isVisible()) {
      console.log('👆 Clicking upsell button to check customer name in logs...');
      await upsellButton.click();
      
      // Wait for processing
      await page.waitForTimeout(5000);
      
      console.log('✅ Upsell processed - check server logs for customer name');
    }
    
    // Navigate to thank you page
    if (!page.url().includes('/thankyou')) {
      await page.goto(`http://localhost:3255/thankyou?session=${sessionId}`);
    }
    
    console.log('\n🎉 Test completed - Check the console output above for customer name handling');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    console.log('\n🏁 Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();