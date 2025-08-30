const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Testing Upsell Processing with Card Update\n');
  console.log('This test validates the complete flow:');
  console.log('1. Navigate to upsell page');
  console.log('2. Trigger card update modal');
  console.log('3. Update card details');
  console.log('4. Process upsell successfully');
  console.log('5. Verify redirect to next step\n');
  console.log('=' .repeat(60) + '\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200  // Slower to observe the flow
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Track key events
  let modalOpened = false;
  let collectJSReady = false;
  let tokenGenerated = false;
  let vaultUpdateAttempted = false;
  let upsellProcessed = false;
  let redirectUrl = null;
  
  // Monitor console logs
  page.on('console', msg => {
    const text = msg.text();
    const timestamp = new Date().toISOString().split('T')[1].substring(0, 12);
    
    if (text.includes('CardUpdateModal opened')) {
      modalOpened = true;
      console.log(`✅ [${timestamp}] Modal opened successfully`);
    }
    
    if (text.includes('CollectJS ready for card update')) {
      collectJSReady = true;
      console.log(`✅ [${timestamp}] CollectJS initialized`);
    }
    
    if (text.includes('Payment token generated successfully') || text.includes('Token received for vault update')) {
      tokenGenerated = true;
      const tokenMatch = text.match(/Token: ([\w-]+)/);
      if (tokenMatch) {
        console.log(`✅ [${timestamp}] Token generated: ${tokenMatch[1]}`);
      } else {
        console.log(`✅ [${timestamp}] Token generated (no match found in text)`);
      }
    }
    
    if (text.includes('Token callback triggered')) {
      console.log(`🎯 [${timestamp}] Token callback triggered`);
    }
    
    if (text.includes('Calling handleVaultUpdate') || text.includes('handleVaultUpdate function called')) {
      console.log(`🚀 [${timestamp}] handleVaultUpdate function invoked`);
    }
    
    if (text.includes('Vault update successful')) {
      console.log(`✅ [${timestamp}] Vault updated successfully`);
    }
    
    if (text.includes('Processing upsell')) {
      console.log(`🔄 [${timestamp}] Processing upsell purchase...`);
    }
    
    if (text.includes('ERROR') || text.includes('Failed')) {
      console.log(`❌ [${timestamp}] Error: ${text}`);
    }
  });
  
  // Monitor network requests
  page.on('response', async response => {
    const url = response.url();
    const timestamp = new Date().toISOString().split('T')[1].substring(0, 12);
    
    // Track vault update
    if (url.includes('/api/vault/update-card')) {
      vaultUpdateAttempted = true;
      const status = response.status();
      const body = await response.text().catch(() => '{}');
      
      if (status === 200) {
        console.log(`✅ [${timestamp}] Vault update API: SUCCESS`);
        try {
          const data = JSON.parse(body);
          if (data.success) {
            console.log(`   └─ Vault ID: ${data.vaultId || 'N/A'}`);
          }
        } catch (e) {}
      } else {
        console.log(`❌ [${timestamp}] Vault update API: FAILED (${status})`);
        console.log(`   └─ Response: ${body}`);
      }
    }
    
    // Track upsell processing
    if (url.includes('/api/upsell/process')) {
      const status = response.status();
      const body = await response.text().catch(() => '{}');
      
      if (status === 200) {
        upsellProcessed = true;
        console.log(`✅ [${timestamp}] Upsell process API: SUCCESS`);
        try {
          const data = JSON.parse(body);
          if (data.success) {
            console.log(`   ├─ Transaction ID: ${data.transactionId || 'N/A'}`);
            console.log(`   ├─ Amount: $${data.amount || 'N/A'}`);
            console.log(`   └─ Next URL: ${data.nextUrl || 'N/A'}`);
          }
        } catch (e) {}
      } else {
        console.log(`❌ [${timestamp}] Upsell process API: FAILED (${status})`);
        console.log(`   └─ Response: ${body}`);
      }
    }
  });
  
  // Track navigation
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      const url = frame.url();
      const timestamp = new Date().toISOString().split('T')[1].substring(0, 12);
      
      if (url.includes('/upsell/2') || url.includes('/thankyou')) {
        redirectUrl = url;
        console.log(`🎯 [${timestamp}] Redirected to: ${url}`);
      }
    }
  });
  
  try {
    console.log('📍 Step 1: Navigating to upsell page...\n');
    console.log('🎯 Using FRESH session data from successful test:');
    console.log('   📋 Session ID: ws_mexqrjmd_rklbgrttj');
    console.log('   💳 Main Transaction: 11087601177');
    console.log('   🏦 Vault ID: 1883832541');
    console.log('   👤 Customer: David Smith (test-1756526894234-u1wjat@example.com)\n');

    await page.goto('http://localhost:3255/upsell/1?session=ws_mexqrjmd_rklbgrttj&transaction=11087601177');
    
    await page.waitForTimeout(2000);
    console.log('✅ Upsell page loaded\n');
    
    // Find and click upgrade button
    console.log('📍 Step 2: Looking for upgrade button...');
    const upgradeButton = page.locator('button:has-text("Yes"), button:has-text("Upgrade"), button:has-text("Add")').first();
    
    if (await upgradeButton.isVisible()) {
      console.log('✅ Upgrade button found\n');
      
      console.log('📍 Step 3: Clicking upgrade button to trigger card modal...');
      await upgradeButton.click();
      
      // Wait for modal
      await page.waitForTimeout(3000);
      
      // Check if modal opened
      const modal = page.locator('#loadModal-cardupdate');
      if (await modal.isVisible()) {
        console.log('✅ Card update modal is visible\n');
        
        console.log('📍 Step 4: Filling updated card details...');
        
        // Fill name field
        const nameField = page.locator('input[name="cc-name"]');
        if (await nameField.isVisible()) {
          await nameField.fill('John Doe Updated');
          console.log('   ✓ Name filled: John Doe Updated');
        }
        
        // Wait for CollectJS to be ready
        await page.waitForTimeout(2000);
        
        // Fill card number
        try {
          const cardFrame = page.frameLocator('#update-card-number-field iframe');
          await cardFrame.locator('input').first().fill('4111111111111111');
          console.log('   ✓ Card number filled: 4111...1111');
        } catch (e) {
          console.log('   ⚠️ Could not fill card number');
        }
        
        // Fill expiry
        try {
          const expiryFrame = page.frameLocator('#update-card-expiry-field iframe');
          await expiryFrame.locator('input').first().fill('12/30');
          console.log('   ✓ Expiry filled: 12/30');
        } catch (e) {
          console.log('   ⚠️ Could not fill expiry');
        }
        
        // Fill CVV
        try {
          const cvvFrame = page.frameLocator('#update-card-cvv-field iframe');
          await cvvFrame.locator('input').first().fill('123');
          console.log('   ✓ CVV filled: 123\n');
        } catch (e) {
          console.log('   ⚠️ Could not fill CVV');
        }
        
        // Wait for validation
        await page.waitForTimeout(2000);
        
        // Submit the form
        console.log('📍 Step 5: Submitting card update...');
        const submitButton = page.locator('button:has-text("Update & Retry Purchase")');
        
        if (await submitButton.isVisible()) {
          console.log('✅ Submit button found, clicking...\n');
          await submitButton.click();
          
          // Wait for processing - need more time for vault update + retry
          console.log('⏳ Processing payment update and upsell...');
          console.log('   - Generating token...');
          console.log('   - Updating vault...');
          console.log('   - Retrying upsell...\n');
          
          // Wait for token generation and vault update
          await page.waitForTimeout(5000);
          
          // Now wait for the retry (which has a 1 second delay after vault update)
          await page.waitForTimeout(10000);
          
          // Check current URL
          const currentUrl = page.url();
          console.log(`📍 Current URL: ${currentUrl}\n`);
          
          // Check if we've been redirected
          if (currentUrl.includes('/upsell/2')) {
            console.log('✅ SUCCESS: Redirected to Upsell 2!');
            console.log('   └─ Upsell 1 processed successfully with updated card\n');
          } else if (currentUrl.includes('/thankyou')) {
            console.log('✅ SUCCESS: Redirected to Thank You page!');
            console.log('   └─ Purchase completed successfully with updated card\n');
          } else if (currentUrl.includes('/upsell/1')) {
            // Still on same page, check for errors
            const errorElement = await page.locator('.text-red-600, [style*="dc2626"], .error').first().textContent().catch(() => null);
            if (errorElement) {
              console.log(`⚠️ Still on Upsell 1 page`);
              console.log(`   └─ Error: ${errorElement}\n`);
            } else {
              console.log('⚠️ Still on Upsell 1 page (no visible error)\n');
            }
          }
          
        } else {
          console.log('❌ Submit button not found\n');
        }
        
      } else {
        console.log('❌ Card update modal did not appear\n');
        
        // Check if we got an error or were redirected
        const currentUrl = page.url();
        if (currentUrl !== 'http://localhost:3255/upsell/1?session=ws_mexqrjmd_rklbgrttj&transaction=11087601177') {
          console.log(`📍 Redirected to: ${currentUrl}`);
        }
        
        // Check for error messages
        const errorText = await page.locator('.text-red-600, [style*="dc2626"], .error').first().textContent().catch(() => null);
        if (errorText) {
          console.log(`⚠️ Error on page: ${errorText}`);
        }
      }
      
    } else {
      console.log('❌ No upgrade button found on page\n');
    }
    
    // Final summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Modal Opened: ${modalOpened ? '✅' : '❌'}`);
    console.log(`CollectJS Ready: ${collectJSReady ? '✅' : '❌'}`);
    console.log(`Token Generated: ${tokenGenerated ? '✅' : '❌'}`);
    console.log(`Vault Update Attempted: ${vaultUpdateAttempted ? '✅' : '❌'}`);
    console.log(`Upsell Processed: ${upsellProcessed ? '✅' : '❌'}`);
    console.log(`Successful Redirect: ${redirectUrl ? '✅ ' + redirectUrl : '❌'}`);
    
    if (upsellProcessed && redirectUrl) {
      console.log('\n🎉 TEST PASSED: Upsell processed successfully with updated card!');
    } else if (vaultUpdateAttempted && !upsellProcessed) {
      console.log('\n⚠️ TEST PARTIAL: Card updated but upsell not processed');
    } else {
      console.log('\n❌ TEST FAILED: Upsell was not processed successfully');
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'tests/screenshots/upsell-card-update-final.png' });
    console.log('\n📸 Screenshot saved: tests/screenshots/upsell-card-update-final.png');
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'tests/screenshots/upsell-card-update-error.png' });
    console.error('📸 Error screenshot saved');
  } finally {
    console.log('\n🏁 Test completed. Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();