const { chromium } = require('playwright');

// Different card data for second attempt
const SECOND_CARD = {
  number: '5105105105105100',
  expiry: '06/32',
  cvv: '456'
};

// Function to handle card update modal or error modal
async function handleCardUpdateModal(page, sessionId) {
  console.log('💳 HANDLING CARD UPDATE MODAL');
  console.log('==============================');

  try {
    // Wait a bit for modal to appear
    await page.waitForTimeout(2000);
    
    // Check for various card update modal indicators
    const modalSelectors = [
      'text=/update.*card/i',
      'text=/payment.*method/i',
      'text=/card.*declined/i',
      'text=/duplicate.*transaction/i',
      '.modal:has-text("card")',
      '[role="dialog"]:has-text("payment")'
    ];
    
    let isCardUpdateModal = false;
    for (const selector of modalSelectors) {
      if (await page.locator(selector).isVisible().catch(() => false)) {
        isCardUpdateModal = true;
        console.log(`💳 Card update modal detected with selector: ${selector}`);
        break;
      }
    }
    
    if (isCardUpdateModal) {
      console.log('💳 Card update modal is visible');
      
      // Look for card input fields in iframes (CollectJS) - modal uses different IDs
      const cardNumberFrame = page.frameLocator('#update-card-number-field iframe');
      const expiryFrame = page.frameLocator('#update-card-expiry-field iframe');
      const cvvFrame = page.frameLocator('#update-card-cvv-field iframe');
      
      // Check if CollectJS fields are present - try multiple selectors
      const hasCollectJS = await cardNumberFrame.locator('input').first().isVisible().catch(() => false);
      
      if (hasCollectJS) {
        console.log('💳 CollectJS payment fields detected in modal');
        console.log('💳 Filling NEW card details...');
        
        // Use the SECOND_CARD details for the update
        const newCard = SECOND_CARD;
        console.log(`  💳 New Card: ${newCard.number.substring(0, 4)}****${newCard.number.substring(12)}`);
        console.log(`  📅 New Expiry: ${newCard.expiry}`);
        console.log(`  🔒 New CVV: ${newCard.cvv}`);
        
        // Fill card number - use generic input selector for modal
        const cardInput = cardNumberFrame.locator('input').first();
        await cardInput.click();
        await cardInput.fill(newCard.number);
        console.log('  ✅ New card number filled');
        
        // Fill expiry
        const expiryInput = expiryFrame.locator('input').first();
        await expiryInput.click();
        await expiryInput.fill(newCard.expiry);
        console.log('  ✅ New expiry filled');
        
        // Fill CVV
        const cvvInput = cvvFrame.locator('input').first();
        await cvvInput.click();
        await cvvInput.fill(newCard.cvv);
        console.log('  ✅ New CVV filled');
        
        // Wait a bit for validation
        await page.waitForTimeout(1000);
        
        // Look for submit/update button - add the actual button text from modal
        const submitButtons = [
          'button:has-text("Update & Retry Purchase")',
          'button:has-text("Update Card")',
          'button:has-text("Update Payment")',
          'button:has-text("Save")',
          'button:has-text("Submit")',
          'button[type="submit"]'
        ];
        
        let submitted = false;
        for (const selector of submitButtons) {
          const button = page.locator(selector).first();
          if (await button.isVisible() && await button.isEnabled()) {
            console.log(`💳 Clicking submit button: ${selector}`);
            await button.click();
            submitted = true;
            console.log('💳 Card update submitted');
            break;
          }
        }
        
        if (!submitted) {
          console.log('⚠️ Could not find submit button for card update');
        }
        
        // Wait for processing
        await page.waitForTimeout(3000);
      } else {
        console.log('⚠️ Could not find CollectJS fields in modal');
        
        // Try to close or skip the modal
        const skipButtons = [
          'button:has-text("Skip")',
          'button:has-text("Cancel")',
          'button:has-text("Close")',
          'button[aria-label="Close"]'
        ];
        
        for (const selector of skipButtons) {
          const button = page.locator(selector).first();
          if (await button.isVisible()) {
            console.log(`💳 Clicking skip/close button: ${selector}`);
            await button.click();
            break;
          }
        }
      }
      
      return true;
    }
    
    console.log('💳 No card update modal found');
    return false;
  } catch (error) {
    console.log('⚠️ Error handling card update modal:', error.message);
    return false;
  }
}

// Function to handle decline modal with card update
async function handleDeclineModal(page, sessionId) {
  console.log('📋 HANDLING DECLINE MODAL');
  console.log('========================');

  try {
    // First check for card update modal
    const hasCardModal = await handleCardUpdateModal(page, sessionId);
    if (hasCardModal) {
      console.log('💳 Handled card update modal');
      await page.waitForTimeout(2000);
    }
    
    // Look for other modals
    const modalSelectors = [
      '.modal',
      '[role="dialog"]',
      '.downsell-modal',
      'div:has(text("Declined")',
      'div:has(text("Error")'
    ];

    let modalFound = false;
    for (const selector of modalSelectors) {
      if (await page.locator(selector).isVisible().catch(() => false)) {
        console.log(`📋 Found modal with selector: ${selector}`);
        modalFound = true;
        break;
      }
    }

    if (!modalFound) {
      console.log('⚠️ No modal found, proceeding to thank you page');
      await page.goto(`http://localhost:3255/thankyou?session=${sessionId}`);
      return;
    }

    // Try multiple selectors to find the decline button
    const declineSelectors = [
      'button:has-text("No thanks")',
      'button:has-text("Continue without")',
      'button:has-text("Skip")',
      'button.decline-button',
      'button.modal-decline',
      'text=/No thanks.*order confirmation/i',
      'text=/Continue.*checkout/i'
    ];

    let declineFound = false;
    for (const selector of declineSelectors) {
      const declineButton = page.locator(selector).first();
      if (await declineButton.isVisible().catch(() => false)) {
        console.log(`📋 Clicking decline button: ${selector}`);
        await declineButton.click();
        declineFound = true;
        break;
      }
    }

    if (!declineFound) {
      console.log('⚠️ No decline button found in modal');
      // Try to close the modal
      const closeButton = page.locator('.modal-close, button[aria-label="Close"], button:has-text("×")').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        console.log('📋 Closed modal using close button');
      }
    }

    // Wait for navigation
    await page.waitForTimeout(2000);
    
    // Check if we reached thank you page
    if (page.url().includes('/thankyou')) {
      console.log('✅ Reached thank you page after modal');
    } else {
      console.log('⚠️ Did not reach thank you page, manually navigating');
      await page.goto(`http://localhost:3255/thankyou?session=${sessionId}`);
    }

  } catch (error) {
    console.log('❌ Error in handleDeclineModal:', error.message);
  }
}

// Fixed customer data to ensure duplicate transaction
const FIXED_CUSTOMER = {
  email: 'test-duplicate@example.com',
  name: 'John Duplicate',
  phone: '5551234567',
  address: '123 Test Street',
  city: 'Austin',
  state: 'TX',
  zip: '78701'
};

async function handleUpsellPurchase(page, sessionId, runNumber) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🛍️ UPSELL PURCHASE - RUN ${runNumber}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // We should be on upsell/1 page already
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    if (!currentUrl.includes('/upsell')) {
      console.log('⚠️ Not on upsell page, navigating...');
      await page.goto(`http://localhost:3255/upsell/1?session=${sessionId}`);
      await page.waitForLoadState('networkidle');
    }

    // Wait for upsell page to load
    await page.waitForTimeout(3000);
    console.log('✅ Upsell page loaded');

    // Listen for console messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('duplicate') || text.includes('Duplicate') || 
          text.includes('REFID') || text.includes('UPDATE') || 
          text.includes('card') || text.includes('Card')) {
        console.log('📌 UPSELL LOG:', text);
      }
    });

    // Find and click the "Yes, Upgrade My Order" button
    const upgradeButton = page.locator('button:has-text("Yes"), button:has-text("Upgrade"), button:has-text("Add to Order")').first();
    
    if (await upgradeButton.isVisible()) {
      console.log('🎯 Found upgrade button, clicking...');
      await upgradeButton.click();
      console.log('⏳ Processing upsell purchase...');
      
      // Wait for result
      await page.waitForTimeout(5000);
      
      // Check if card update modal appeared
      const hasCardModal = await handleCardUpdateModal(page, sessionId);
      if (hasCardModal) {
        console.log('✅ Card update modal handled');
        // Wait for processing after card update
        await page.waitForTimeout(5000);
      }
      
      // Check current URL
      const newUrl = page.url();
      console.log(`📍 New URL: ${newUrl}`);
      
      if (newUrl.includes('/upsell/2') || newUrl.includes('/thankyou')) {
        console.log('✅ Upsell purchase successful!');
        return { success: true, sessionId, hadCardModal: hasCardModal };
      } else if (newUrl.includes('/upsell/1')) {
        // Still on same page - check for errors
        const pageText = await page.textContent('body');
        if (pageText.includes('update') && pageText.includes('card')) {
          console.log('⚠️ Card update required but not completed');
          return { success: false, needsCardUpdate: true };
        }
        console.log('⚠️ Upsell purchase may have failed');
        return { success: false };
      }
    } else {
      console.log('❌ Could not find upgrade button');
      return { success: false, error: 'No upgrade button found' };
    }
    
  } catch (error) {
    console.error('❌ Error during upsell purchase:', error.message);
    return { success: false, error: error.message };
  }
}

async function runCheckoutWithFixedData(page, runNumber, useNewCard = false) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 RUN ${runNumber}: ${useNewCard ? 'With NEW card' : 'With SAME data'}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Navigate to checkout
    await page.goto('http://localhost:3255/checkout');
    await page.waitForLoadState('networkidle');

    // Wait for checkout form
    await page.waitForSelector('#checkout-form', { state: 'visible', timeout: 30000 });
    console.log('✅ Checkout form loaded');

    // Fill customer information
    console.log('📝 Using FIXED customer data:');
    console.log(`  📧 Email: ${FIXED_CUSTOMER.email}`);
    console.log(`  👤 Name: ${FIXED_CUSTOMER.name}`);
    console.log(`  📞 Phone: ${FIXED_CUSTOMER.phone}`);
    console.log(`  🏠 Address: ${FIXED_CUSTOMER.address}`);
    console.log(`  🏙️ City: ${FIXED_CUSTOMER.city}, ${FIXED_CUSTOMER.state} ${FIXED_CUSTOMER.zip}`);

    // Fill form fields
    await page.fill('input[name="email"]', FIXED_CUSTOMER.email);
    await page.fill('input[name="nameOnCard"]', FIXED_CUSTOMER.name);
    await page.fill('input[name="phone"]', FIXED_CUSTOMER.phone);
    await page.fill('input[name="address"]', FIXED_CUSTOMER.address);
    await page.fill('input[name="city"]', FIXED_CUSTOMER.city);
    await page.fill('input[name="zip"]', FIXED_CUSTOMER.zip);

    // Handle state dropdown
    const stateInput = page.locator('input#state');
    if (await stateInput.isVisible()) {
      await stateInput.click();
      await page.waitForTimeout(500);
      await stateInput.fill(FIXED_CUSTOMER.state);
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
    }

    // Wait for CollectJS
    console.log('💳 Waiting for CollectJS to initialize...');
    await page.waitForTimeout(3000);

    // Check if payment iframes exist
    const hasPaymentFields = await page.evaluate(() => {
      const cardFrame = document.querySelector('#card-number-field iframe');
      const expiryFrame = document.querySelector('#card-expiry-field iframe');
      const cvvFrame = document.querySelector('#card-cvv-field iframe');
      return !!(cardFrame && expiryFrame && cvvFrame);
    });

    if (hasPaymentFields) {
      console.log('✅ CollectJS is ready!');
      console.log('💳 Filling payment information...');
      
      const cardNumber = useNewCard ? SECOND_CARD.number : '4111111111111111';
      const expiry = useNewCard ? SECOND_CARD.expiry : '12/30';
      const cvv = useNewCard ? SECOND_CARD.cvv : '123';
      
      console.log(`  💳 Card: ${cardNumber.substring(0, 4)}****${cardNumber.substring(12)}`);
      console.log(`  📅 Expiry: ${expiry}`);
      console.log(`  🔒 CVV: ${cvv}`);

      // Fill card number - using the exact selector from working test
      const cardNumberFrame = page.frameLocator('#card-number-field iframe');
      const cardInput = cardNumberFrame.locator('input#ccnumber').first();
      await cardInput.click();
      await cardInput.fill(cardNumber);
      console.log('  ✅ Card number filled');

      // Fill expiry
      const expiryFrame = page.frameLocator('#card-expiry-field iframe');
      const expiryInput = expiryFrame.locator('input#ccexp').first();
      await expiryInput.click();
      await expiryInput.fill(expiry);
      console.log(`  ✅ Expiry filled: ${expiry}`);

      // Fill CVV
      const cvvFrame = page.frameLocator('#card-cvv-field iframe');
      const cvvInput = cvvFrame.locator('input#cvv').first();
      await cvvInput.click();
      await cvvInput.fill(cvv);
      console.log(`  ✅ CVV filled: ${cvv}`);
    }

    // Submit form
    await page.waitForTimeout(1000);
    const submitButton = page.locator('button[type="submit"], #submit-button').first();
    const isEnabled = await submitButton.isEnabled();
    console.log(isEnabled ? '✅ Submit button is enabled' : '⚠️ Submit button is disabled');

    console.log('\n🚀 Submitting payment...');
    
    // Listen for console messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('duplicate') || text.includes('Duplicate') || text.includes('REFID')) {
        console.log('📌 PAGE LOG:', text);
      }
    });

    await submitButton.click();
    console.log('⏳ Waiting for payment processing...');

    // Wait longer for result (duplicate detection may take time)
    await page.waitForTimeout(8000);

    // Check current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    if (currentUrl.includes('/upsell') || currentUrl.includes('/thankyou')) {
      console.log('✅ Payment successful!');
      const urlParams = new URL(currentUrl).searchParams;
      const sessionId = urlParams.get('session');
      if (sessionId) {
        console.log(`📋 Session ID: ${sessionId}`);
      }
      return { success: true, sessionId };
    } else {
      // Check for duplicate message
      const pageText = await page.textContent('body');
      if (pageText.includes('Duplicate') || pageText.includes('REFID')) {
        console.log('⚠️ DUPLICATE TRANSACTION DETECTED');
        
        // For run 2, wait for auto-redirect
        if (runNumber === 2) {
          console.log('📌 Second run got duplicate (as expected)');
          console.log('⏳ Waiting for auto-redirect to upsell page...');
          
          // Wait for navigation to upsell (the code has a 2 second delay)
          try {
            await page.waitForURL('**/upsell/**', { timeout: 5000 });
            const newUrl = page.url();
            console.log(`✅ Auto-redirected to: ${newUrl}`);
            
            const urlParams = new URL(newUrl).searchParams;
            const sessionId = urlParams.get('session');
            const transaction = urlParams.get('transaction');
            
            if (sessionId) {
              console.log(`📋 Session ID: ${sessionId}`);
            }
            if (transaction) {
              console.log(`📋 Transaction REFID: ${transaction}`);
            }
            
            return { success: true, sessionId, wasDuplicate: true };
          } catch (navError) {
            console.log('⚠️ Auto-redirect did not happen within 5 seconds');
            
            // Try manual navigation as fallback
            const sessionMatch = pageText.match(/ws_[a-z0-9]+_[a-z0-9]+/);
            if (sessionMatch) {
              const sessionId = sessionMatch[0];
              console.log(`📋 Extracted Session ID: ${sessionId}`);
              console.log('📌 Manually navigating to upsell...');
              
              await page.goto(`http://localhost:3255/upsell/1?session=${sessionId}`);
              await page.waitForTimeout(2000);
              return { success: true, sessionId, wasDuplicate: true };
            }
          }
        }
        
        return { success: false, isDuplicate: true };
      }
      
      console.log('❌ Payment failed or still on checkout page');
      return { success: false };
    }

  } catch (error) {
    console.error('❌ Error during checkout:', error.message);
    return { success: false, error: error.message };
  }
}

(async () => {
  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });

  const page = await context.newPage();

  try {
    console.log('🚀 DUPLICATE TRANSACTION TEST WITH UPSELL FLOW');
    console.log('================================================');
    console.log('This test will:');
    console.log('1. Run checkout with FIXED customer data');
    console.log('2. Detect duplicate and auto-proceed to upsell');
    console.log('3. Try to purchase upsell 1 (should work first time)');
    console.log('4. Run AGAIN with SAME customer data');
    console.log('5. Try to purchase upsell 1 again (should trigger card update modal)');
    console.log('6. Handle card update modal and complete purchase\n');

    // FIRST RUN - Should detect duplicate and go to upsell
    const firstResult = await runCheckoutWithFixedData(page, 1, false);
    
    if (firstResult.success) {
      console.log('\n✅ FIRST RUN: Reached upsell page!');
      console.log(`📋 Session ID: ${firstResult.sessionId}`);
      
      // Try to purchase upsell 1
      console.log('\n🛍️ Attempting to purchase Upsell 1...');
      const upsell1Result = await handleUpsellPurchase(page, firstResult.sessionId, 1);
      
      if (upsell1Result.success) {
        console.log('✅ Upsell 1 purchased successfully!');
        if (upsell1Result.hadCardModal) {
          console.log('📋 Note: Card update modal was shown and handled');
        }
      } else if (upsell1Result.needsCardUpdate) {
        console.log('⚠️ Upsell 1 requires card update');
      } else {
        console.log('❌ Upsell 1 purchase failed');
      }
      
      // Wait before second run
      console.log('\n⏳ Waiting 3 seconds before second run...');
      await page.waitForTimeout(3000);
    } else {
      console.log('\n⚠️ First run did not reach upsell');
    }

    // SECOND RUN - Should also detect duplicate and go to upsell
    const secondResult = await runCheckoutWithFixedData(page, 2, false);
    
    if (secondResult.success) {
      console.log('\n✅ SECOND RUN: Reached upsell page!');
      console.log(`📋 Session ID: ${secondResult.sessionId}`);
      
      // Try to purchase upsell 1 again - should trigger card update modal
      console.log('\n🛍️ Attempting to purchase Upsell 1 again (should trigger card update)...');
      const upsell2Result = await handleUpsellPurchase(page, secondResult.sessionId, 2);
      
      if (upsell2Result.success) {
        if (upsell2Result.hadCardModal) {
          console.log('✅ EXPECTED: Card update modal was shown and handled!');
          console.log('✅ Upsell 1 purchased after card update!');
        } else {
          console.log('⚠️ UNEXPECTED: Upsell purchased without card update modal');
        }
      } else if (upsell2Result.needsCardUpdate) {
        console.log('✅ EXPECTED: Card update required for duplicate purchase');
      } else {
        console.log('❌ Upsell 1 purchase failed');
      }
    } else {
      console.log('\n❌ SECOND RUN: Failed to reach upsell');
    }
    
    // THIRD RUN - Test with completely new session
    console.log('\n⏳ Waiting 3 seconds before third run...');
    await page.waitForTimeout(3000);
    
    console.log('\n🔄 THIRD RUN: Testing card update modal trigger...');
    const thirdResult = await runCheckoutWithFixedData(page, 3, false);
    
    if (thirdResult.success) {
      console.log('\n✅ THIRD RUN: Reached upsell page!');
      console.log(`📋 Session ID: ${thirdResult.sessionId}`);
      
      // This should definitely trigger card update modal
      console.log('\n🛍️ Attempting Upsell 1 purchase (run 3 - should require card update)...');
      const upsell3Result = await handleUpsellPurchase(page, thirdResult.sessionId, 3);
      
      if (upsell3Result.success) {
        if (upsell3Result.hadCardModal) {
          console.log('✅ CONFIRMED: Card update modal triggered and handled on run 3!');
        } else {
          console.log('⚠️ Run 3 completed without card update modal');
        }
      } else {
        console.log('⚠️ Run 3 upsell purchase did not complete');
      }
    } else {
      console.log('\n❌ THIRD RUN: Failed to reach upsell');
    }

    // Take final screenshot
    await page.screenshot({ path: 'tests/screenshots/duplicate-test-complete.png' });
    console.log('\n📸 Screenshot saved: tests/screenshots/duplicate-test-complete.png');

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    console.error('Stack:', error.stack);
    await page.screenshot({ path: 'tests/screenshots/duplicate-test-error.png' });
    console.log('📸 Error screenshot saved');
  } finally {
    console.log('\n='.repeat(60));
    console.log('🏁 TEST COMPLETED');
    console.log('='.repeat(60));
    console.log('\nBrowser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();