const { chromium } = require('playwright');

(async () => {
  console.log('🎉 Testing dynamic thank you page...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Track console logs
  page.on('console', msg => {
    if (msg.text().includes('📋') || msg.text().includes('✅') || msg.text().includes('❌')) {
      console.log('📌 PAGE LOG:', msg.text());
    }
  });
  
  try {
    // Use the session from our successful checkout test
    const sessionId = '1753153535518-fhqqqt';
    const url = `http://localhost:3000/thankyou?session=${sessionId}`;
    
    console.log('📍 Navigating to thank you page with session:', sessionId);
    await page.goto(url);
    
    // Wait for page to load and fetch data
    console.log('⏳ Waiting for dynamic data to load...');
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'test-thankyou-dynamic.png', fullPage: true });
    console.log('📸 Dynamic thank you page screenshot: test-thankyou-dynamic.png');
    
    // Extract customer name from page
    try {
      const customerName = await page.locator('h1:has-text("Thank you")').textContent();
      console.log('👤 Customer greeting:', customerName);
    } catch (e) {
      console.log('⚠️ Could not extract customer name');
    }
    
    // Check for order number
    try {
      const orderNumber = await page.locator('text=/Order #/').textContent();
      console.log('📋 Order number:', orderNumber);
    } catch (e) {
      console.log('⚠️ Could not extract order number');
    }
    
    // Check for customer info section
    try {
      const customerInfo = await page.locator('h3:has-text("Customer")').locator('..').textContent();
      console.log('📞 Customer info section loaded:', customerInfo.includes('Debug Test'));
    } catch (e) {
      console.log('⚠️ Could not extract customer info');
    }
    
    // Check for actual transaction ID in product listing
    try {
      const transactionText = await page.locator('text=/Transaction:/').textContent();
      console.log('💳 Transaction info displayed:', transactionText);
    } catch (e) {
      console.log('⚠️ Could not find transaction info');
    }
    
    // Check if total amount is correct
    try {
      const totalAmount = await page.locator('text=/USD \\$/').last().textContent();
      console.log('💰 Total amount:', totalAmount);
    } catch (e) {
      console.log('⚠️ Could not extract total amount');
    }
    
    console.log('\n✅ Dynamic thank you page test completed!');
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'test-thankyou-error.png' });
    console.error('📸 Error screenshot: test-thankyou-error.png');
  } finally {
    console.log('\n🏁 Test completed. Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
})();