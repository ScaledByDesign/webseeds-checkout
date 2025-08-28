const { chromium } = require('playwright');

(async () => {
  console.log('🐛 Debug validation modal flow...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Listen to console messages to debug
  page.on('console', msg => {
    if (msg.text().includes('validation') || msg.text().includes('❌') || msg.text().includes('Payment') || msg.text().includes('error')) {
      console.log('🔍 PAGE LOG:', msg.text());
    }
  });
  
  try {
    await page.goto('http://localhost:3000/checkout');
    await page.waitForSelector('input[name="firstName"]', { timeout: 10000 });
    await page.waitForSelector('text=✅ Payment system ready', { timeout: 15000 });
    
    console.log('📍 Attempting form submission with empty fields...');
    
    // Try clicking submit to trigger validation
    await page.click('button:has-text("Complete Order")');
    
    // Wait a bit and check if modal appears
    await page.waitForTimeout(2000);
    
    // Check if modal is present in DOM
    const modalExists = await page.locator('text=We need to fix a few things').count() > 0;
    const modalVisible = modalExists ? await page.locator('text=We need to fix a few things').isVisible() : false;
    
    console.log(`🔍 Modal exists in DOM: ${modalExists}`);
    console.log(`🔍 Modal is visible: ${modalVisible}`);
    
    // Check validation state variables
    const pageState = await page.evaluate(() => {
      return {
        // Try to access React state (this might not work)
        modalDisplayed: document.querySelector('[class*="fixed inset-0"]') !== null,
        errorElements: document.querySelectorAll('[class*="bg-red-"]').length,
        formElements: document.querySelectorAll('input').length
      };
    });
    
    console.log('🔍 Page state:', pageState);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'validation-debug-screenshot.png', fullPage: true });
    console.log('📸 Debug screenshot: validation-debug-screenshot.png');
    
    // Try filling one field and submitting to see if partial validation works
    console.log('\n📍 Testing partial form validation...');
    await page.fill('input[name="firstName"]', 'Test');
    await page.click('button:has-text("Complete Order")');
    await page.waitForTimeout(2000);
    
    const modalAfterPartial = await page.locator('text=We need to fix a few things').isVisible();
    console.log(`🔍 Modal after partial fill: ${modalAfterPartial}`);
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
    await page.screenshot({ path: 'validation-debug-error.png' });
  } finally {
    console.log('\n🏁 Debug completed. Browser stays open for inspection...');
    await page.waitForTimeout(20000); // Keep open longer for inspection
    await browser.close();
  }
})();