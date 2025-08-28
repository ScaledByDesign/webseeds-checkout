const { chromium } = require('playwright');

(async () => {
  console.log('🐞 Debugging upsell 1 button click...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Track console logs
  page.on('console', msg => {
    console.log('📌 CONSOLE:', msg.text());
  });
  
  // Track network requests
  page.on('request', request => {
    if (request.url().includes('/api/upsell/process')) {
      console.log('📡 API REQUEST:', request.method(), request.url());
      console.log('📦 REQUEST BODY:', request.postData());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/upsell/process')) {
      console.log('📨 API RESPONSE:', response.status(), response.url());
      response.text().then(text => {
        try {
          const json = JSON.parse(text);
          console.log('📊 RESPONSE DATA:', JSON.stringify(json, null, 2));
        } catch {
          console.log('📊 RESPONSE TEXT:', text);
        }
      });
    }
  });
  
  try {
    // Navigate to upsell 1 with session (updated format without SESSION- prefix)
    const sessionId = '1753152878175-bumucx'; // Use session from previous test
    const transactionId = '10942922964';
    
    console.log('📍 Navigating to upsell 1 page...');
    await page.goto(`http://localhost:3000/upsell/1?session=${sessionId}&transaction=${transactionId}`);
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Find and click the button
    console.log('🔍 Looking for upsell button...');
    const buttonSelector = 'button:has-text("Yes! Upgrade My Order!")';
    
    try {
      await page.waitForSelector(buttonSelector, { timeout: 5000 });
      console.log('✅ Button found');
      
      // Click the button
      console.log('👆 Clicking upsell button...');
      await page.click(buttonSelector);
      
      // Wait to see what happens
      console.log('⏳ Waiting for response...');
      await page.waitForTimeout(10000);
      
      // Check current URL
      const currentUrl = page.url();
      console.log('📍 Current URL after click:', currentUrl);
      
      // Check for loading state
      const isLoading = await page.locator('text=Processing').isVisible();
      console.log('🔄 Is loading?', isLoading);
      
    } catch (error) {
      console.error('❌ Button interaction error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    
    // Take screenshot of current state
    await page.screenshot({ path: 'test-upsell-debug.png' });
    console.log('📸 Debug screenshot saved: test-upsell-debug.png');
  } finally {
    console.log('\n🏁 Debug completed. Browser stays open for inspection...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
})();