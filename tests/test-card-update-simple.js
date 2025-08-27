const { chromium } = require('playwright');

(async () => {
  console.log('🧪 Testing card update modal on current upsell page...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Track console messages
  page.on('console', msg => {
    console.log('🔍 PAGE LOG:', msg.text());
  });
  
  try {
    console.log('📍 STEP 1: Navigate directly to upsell page with existing session...');
    // Use the session ID from the previous successful test
    await page.goto('http://localhost:3000/upsell/2?session=1753161757244-jtcuey');
    
    await page.waitForTimeout(3000);
    
    console.log('📍 STEP 2: Click upsell button to test card update flow...');
    const upsellButton = await page.locator('button:has-text("Yes! Upgrade My Order!")').first();
    
    if (await upsellButton.isVisible()) {
      console.log('🎯 Clicking upsell button...');
      await upsellButton.click();
      
      // Wait for potential error or success
      await page.waitForTimeout(8000);
      
      // Take screenshot
      await page.screenshot({ path: 'test-upsell2-result.png', fullPage: true });
      console.log('📸 Screenshot taken: test-upsell2-result.png');
      
      // Check for card update modal
      const cardModalTitle = await page.locator('text=Update Payment Method').first().isVisible();
      const errorMessage = await page.locator('text=This appears to be a duplicate transaction').isVisible();
      
      if (cardModalTitle) {
        console.log('🎉 SUCCESS! Card update modal appeared!');
        console.log(`   - Modal visible: ${cardModalTitle ? '✅' : '❌'}`);
        console.log(`   - Friendly error message: ${errorMessage ? '✅' : '❌'}`);
        
        // Check if name field is present
        const nameField = await page.locator('input[name="cc-name"]').isVisible();
        console.log(`   - Name field with autocomplete: ${nameField ? '✅' : '❌'}`);
        
        // Fill name field to test validation
        if (nameField) {
          await page.fill('input[name="cc-name"]', 'John Doe');
          console.log('✏️ Filled name field: John Doe');
          
          await page.waitForTimeout(2000);
          await page.screenshot({ path: 'test-card-update-with-name.png', fullPage: true });
          console.log('📸 Screenshot with name filled: test-card-update-with-name.png');
        }
      } else {
        // Check if it redirected (success case)
        const currentUrl = page.url();
        console.log('🔍 Current URL:', currentUrl);
        
        if (currentUrl.includes('/thankyou')) {
          console.log('🎉 SUCCESS! Upsell completed and redirected to thank you page!');
        } else {
          console.log('⚠️ No card update modal, checking page state...');
        }
      }
    } else {
      console.log('❌ Upsell button not found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'test-simple-error.png', fullPage: true });
  } finally {
    console.log('\n🏁 Test completed. Browser will remain open for 15 seconds...');
    await page.waitForTimeout(15000);
    await browser.close();
  }
})();