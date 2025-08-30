const { chromium } = require('playwright');

// Test to specifically validate the card update modal in upsell pages
async function testCardUpdateModal() {
  console.log('🧪 TESTING CARD UPDATE MODAL IN UPSELL FLOW');
  console.log('==========================================\n');

  const browser = await chromium.launch({
    headless: false, // Run in headed mode to see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });

  const page = await context.newPage();

  try {
    // Navigate directly to upsell/1 with a FRESH session from successful test
    // Using the session from our most recent successful test
    const testSessionId = 'ws_mexqrjmd_rklbgrttj'; // Fresh session from successful test
    const transactionId = '11087601177'; // Fresh transaction ID
    console.log('📍 Navigating directly to upsell/1 with FRESH session...');
    console.log('🎯 Using FRESH session data:');
    console.log('   📋 Session ID: ws_mexqrjmd_rklbgrttj');
    console.log('   💳 Main Transaction: 11087601177');
    console.log('   🏦 Vault ID: 1883832541');
    console.log('   👤 Customer: David Smith (test-1756526894234-u1wjat@example.com)\n');
    console.log(`  Session: ${testSessionId}`);
    console.log(`  Transaction: ${transactionId}`);
    await page.goto(`http://localhost:3255/upsell/1?session=${testSessionId}&transaction=${transactionId}`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    console.log('✅ Upsell page loaded');

    // Listen for console messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('CardUpdateModal') || text.includes('CollectJS') || 
          text.includes('card') || text.includes('DEBUG')) {
        console.log('📌 PAGE LOG:', text);
      }
    });

    // Find and click the upgrade button to trigger the purchase attempt
    console.log('🎯 Looking for upgrade button...');
    const upgradeButton = page.locator('button').filter({ hasText: /Yes.*Upgrade|Upgrade.*Order/i }).first();
    
    if (await upgradeButton.isVisible()) {
      console.log('✅ Found upgrade button');
      console.log('🖱️ Clicking upgrade button to trigger purchase...');
      await upgradeButton.click();
      
      // Wait for the card update modal to appear
      console.log('⏳ Waiting for card update modal to appear...');
      await page.waitForTimeout(5000);
      
      // Check for card update modal
      console.log('🔍 Checking for card update modal...');
      
      // Look for modal indicators
      const modalSelectors = [
        'text=/update.*payment.*method/i',
        'text=/update.*card/i',
        '#update-card-number-field',
        '#loadModal-cardupdate',
        '.exit-pop'
      ];
      
      let modalFound = false;
      for (const selector of modalSelectors) {
        if (await page.locator(selector).isVisible().catch(() => false)) {
          console.log(`✅ Card update modal detected with selector: ${selector}`);
          modalFound = true;
          break;
        }
      }
      
      if (modalFound) {
        console.log('📋 Card Update Modal is visible');
        
        // Check for CollectJS fields in the modal
        console.log('🔍 Checking for CollectJS fields...');
        
        // Check if the divs for CollectJS exist
        const cardNumberDiv = await page.locator('#update-card-number-field').isVisible();
        const expiryDiv = await page.locator('#update-card-expiry-field').isVisible();
        const cvvDiv = await page.locator('#update-card-cvv-field').isVisible();
        
        console.log('📦 Field containers:');
        console.log(`  - Card Number div: ${cardNumberDiv ? '✅ Present' : '❌ Missing'}`);
        console.log(`  - Expiry div: ${expiryDiv ? '✅ Present' : '❌ Missing'}`);
        console.log(`  - CVV div: ${cvvDiv ? '✅ Present' : '❌ Missing'}`);
        
        // Check for iframes inside the divs (CollectJS creates these)
        const cardNumberIframe = await page.locator('#update-card-number-field iframe').count();
        const expiryIframe = await page.locator('#update-card-expiry-field iframe').count();
        const cvvIframe = await page.locator('#update-card-cvv-field iframe').count();
        
        console.log('🔒 CollectJS iframes:');
        console.log(`  - Card Number iframe: ${cardNumberIframe > 0 ? '✅ Present' : '❌ Missing'}`);
        console.log(`  - Expiry iframe: ${expiryIframe > 0 ? '✅ Present' : '❌ Missing'}`);
        console.log(`  - CVV iframe: ${cvvIframe > 0 ? '✅ Present' : '❌ Missing'}`);
        
        // Check for name field (not in iframe)
        const nameField = await page.locator('input[name="cc-name"]').isVisible();
        console.log(`  - Name field: ${nameField ? '✅ Present' : '❌ Missing'}`);
        
        if (cardNumberIframe > 0 && expiryIframe > 0 && cvvIframe > 0) {
          console.log('\n✅ CollectJS is properly initialized in the modal!');
          
          // Try to fill the fields
          console.log('\n💳 Attempting to fill card fields...');
          
          // Fill name field first (not in iframe)
          if (nameField) {
            await page.fill('input[name="cc-name"]', 'Test User Updated');
            console.log('  ✅ Name field filled: Test User Updated');
          }
          
          // Fill card fields in iframes
          try {
            const cardFrame = page.frameLocator('#update-card-number-field iframe');
            await cardFrame.locator('input#ccnumber').fill('5105105105105100');
            console.log('  ✅ Card number filled: 5105****5100');
            
            const expiryFrame = page.frameLocator('#update-card-expiry-field iframe');
            await expiryFrame.locator('input#ccexp').fill('06/32');
            console.log('  ✅ Expiry filled: 06/32');
            
            const cvvFrame = page.frameLocator('#update-card-cvv-field iframe');
            await cvvFrame.locator('input#cvv').fill('456');
            console.log('  ✅ CVV filled: 456');
            
            // Wait a moment for validation
            await page.waitForTimeout(2000);
            
            // Take a screenshot to see the validation state
            await page.screenshot({ path: 'tests/screenshots/card-update-modal-filled.png' });
            console.log('\n📸 Screenshot after filling fields: tests/screenshots/card-update-modal-filled.png');
            
            // Check for any visible error messages
            const errorMessages = await page.locator('p[style*="color: #dc2626"]').allTextContents();
            if (errorMessages.length > 0) {
              console.log('\n⚠️ Validation errors visible:');
              errorMessages.forEach(msg => {
                if (msg.trim()) console.log(`  - ${msg}`);
              });
            }
            
            // Look for submit button
            const submitButton = page.locator('button[type="submit"], button:has-text("Update Card")').first();
            if (await submitButton.isVisible()) {
              console.log('\n🎯 Submit button found');
              const isEnabled = await submitButton.isEnabled();
              console.log(`  Button state: ${isEnabled ? '✅ Enabled' : '❌ Disabled'}`);
              
              if (isEnabled) {
                console.log('\n🚀 CLICKING UPDATE CARD BUTTON...');
                
                // Listen for network requests to track the API call
                const responsePromise = page.waitForResponse(
                  response => response.url().includes('/api/vault/update-card'),
                  { timeout: 10000 }
                ).catch(() => null);
                
                await submitButton.click();
                console.log('  ✅ Button clicked');
                
                // Wait for the API response
                console.log('\n⏳ Waiting for vault update response...');
                const response = await responsePromise;
                
                if (response) {
                  const status = response.status();
                  console.log(`\n📡 API Response Status: ${status}`);
                  
                  try {
                    const responseBody = await response.json();
                    console.log('📦 API Response Body:');
                    console.log(JSON.stringify(responseBody, null, 2));
                    
                    if (responseBody.success) {
                      console.log('\n✅ CARD UPDATE SUCCESSFUL!');
                      console.log('  Vault has been updated with new payment method');
                    } else {
                      console.log('\n❌ Card update failed:');
                      console.log(`  Error: ${responseBody.error || 'Unknown error'}`);
                    }
                  } catch (e) {
                    console.log('⚠️ Could not parse response body');
                  }
                } else {
                  console.log('⚠️ No API response received (timeout or no session)');
                  
                  // Check if modal closed (success) or shows error
                  await page.waitForTimeout(3000);
                  const modalStillVisible = await page.locator('#loadModal-cardupdate').isVisible().catch(() => false);
                  
                  if (!modalStillVisible) {
                    console.log('✅ Modal closed - update may have succeeded');
                  } else {
                    // Check for error messages
                    const errorText = await page.locator('.exit-pop').textContent();
                    if (errorText.includes('error') || errorText.includes('failed')) {
                      console.log('❌ Error message displayed in modal');
                    }
                  }
                }
                
                // Take a screenshot after submission
                await page.screenshot({ path: 'tests/screenshots/card-update-after-submit.png' });
                console.log('\n📸 Post-submission screenshot saved');
                
              } else {
                console.log('⚠️ Submit button is disabled - form validation may have failed');
              }
            } else {
              console.log('❌ Submit button not found');
            }
          } catch (error) {
            console.log('⚠️ Error during field filling or submission:', error.message);
          }
        } else {
          console.log('\n⚠️ CollectJS fields are not properly initialized');
          console.log('This might be due to:');
          console.log('  1. CollectJS script not loaded');
          console.log('  2. Invalid tokenization key');
          console.log('  3. Modal initialization error');
        }
        
        // Take a screenshot of the modal
        await page.screenshot({ path: 'tests/screenshots/card-update-modal.png' });
        console.log('\n📸 Screenshot saved: tests/screenshots/card-update-modal.png');
        
      } else {
        console.log('❌ Card update modal not found');
        console.log('This could be because:');
        console.log('  1. The session is not recognized as duplicate');
        console.log('  2. The modal trigger logic is not working');
        console.log('  3. The upsell purchase went through without issues');
      }
      
    } else {
      console.log('❌ Could not find upgrade button on upsell page');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ path: 'tests/screenshots/card-update-modal-error.png' });
    console.log('📸 Error screenshot saved');
  } finally {
    console.log('\n========================================');
    console.log('🏁 TEST COMPLETED');
    console.log('========================================');
    console.log('\nBrowser will close in 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// Run the test
testCardUpdateModal().catch(console.error);