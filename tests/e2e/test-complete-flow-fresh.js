const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Running COMPLETE FRESH checkout + upsell flow test...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Track console logs - especially CollectJS events
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('CollectJS') || text.includes('✅') || text.includes('❌') || 
        text.includes('🎯') || text.includes('🔐') || text.includes('🎟️') ||
        text.includes('iframe') || text.includes('ready') || text.includes('vault')) {
      console.log('📌 PAGE LOG:', text);
    }
  });
  
  // Track network requests for checkout and upsell APIs
  page.on('request', request => {
    if (request.url().includes('/api/checkout/process') || request.url().includes('/api/upsell/process')) {
      console.log('📡 API REQUEST:', request.method(), request.url());
      if (request.postData()) {
        console.log('📦 REQUEST BODY:', request.postData().substring(0, 200) + '...');
      }
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/checkout/process') || response.url().includes('/api/upsell/process')) {
      console.log('📨 API RESPONSE:', response.status(), response.url());
      response.text().then(text => {
        try {
          const json = JSON.parse(text);
          console.log('📊 RESPONSE:', JSON.stringify(json, null, 2).substring(0, 500));
        } catch {
          console.log('📊 RESPONSE TEXT:', text.substring(0, 200));
        }
      });
    }
  });
  
  try {
    // 1. FRESH CHECKOUT PHASE
    console.log('📍 PHASE 1: Fresh Checkout');
    console.log('===========================\n');
    
    await page.goto('http://localhost:3255/checkout');
    
    // Wait for form to be ready
    await page.waitForSelector('form#checkout-form', { timeout: 10000 });
    console.log('✅ Checkout form loaded');
    
    // Generate unique test data
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const testEmail = `test-${timestamp}-${randomStr}@example.com`;
    const randomZip = `900${Math.floor(Math.random() * 90) + 10}`;
    
    console.log(`📧 Using email: ${testEmail}`);
    
    // Fill customer information
    console.log('📝 Filling customer information...');
    
    // Helper function to clear field and type new value
    // Fixed to properly trigger React onChange events using React's event system
    const clearAndType = async (selector, value) => {
      // Use Playwright's fill which should work with React
      await page.locator(selector).fill(value);
      
      // Force trigger React events by simulating user typing
      await page.evaluate(({ selector, value }) => {
        const element = document.querySelector(selector);
        if (element) {
          // Clear the field first
          element.focus();
          element.select();
          
          // Set the value using the native setter to bypass React
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(element, value);
          
          // Create a proper React-compatible input event
          const event = new Event('input', { bubbles: true, cancelable: true });
          // Important: React reads the target.value from the event
          Object.defineProperty(event, 'target', {
            value: element,
            writable: false
          });
          
          // Dispatch the input event - React 16+ uses this
          element.dispatchEvent(event);
          
          // Also trigger change for older React versions
          const changeEvent = new Event('change', { bubbles: true });
          Object.defineProperty(changeEvent, 'target', {
            value: element,
            writable: false
          });
          element.dispatchEvent(changeEvent);
          
          // Blur to trigger validation
          element.blur();
          
          // Log what we did
          console.log(`Test filled field ${element.name || element.id}: "${value}"`);
        }
      }, { selector, value });
      
      // Give React time to update state
      await page.waitForTimeout(150);
    };
    
    await clearAndType('input[name="email"]', testEmail);
    await clearAndType('input[name="nameOnCard"]', 'Test Customer');
    await clearAndType('input[name="phone"]', '5551234567');
    await clearAndType('input[name="address"]', '123 Test Street');
    await clearAndType('input[name="city"]', 'Test City');
    await clearAndType('input#state', 'CA');
    await clearAndType('input[name="zip"]', randomZip);
    
    // Tab out of last field to trigger blur
    await page.keyboard.press('Tab');
    
    // Test billing address checkbox functionality
    console.log('📋 Testing billing address checkbox...');
    
    // First, check if checkbox is checked by default (should be)
    const isInitiallyChecked = await page.locator('input[type="checkbox"][id*="same"]').isChecked();
    console.log(`  Initial state: ${isInitiallyChecked ? '✅ Checked (use shipping for billing)' : '❌ Unchecked'}`);
    
    // Uncheck the checkbox to require billing address
    console.log('  🔲 Unchecking "Same as shipping" checkbox...');
    await page.locator('input[type="checkbox"][id*="same"]').click();
    await page.waitForTimeout(200);
    
    // Check if billing fields are now visible/required
    const billingFieldsVisible = await page.locator('input[name="billingAddress"]').isVisible().catch(() => false);
    console.log(`  Billing fields: ${billingFieldsVisible ? '✅ Visible and required' : '⚠️ Not visible (may be hidden by default)'}`);
    
    // Try to submit without filling billing (should fail validation)
    const submitBtn = page.locator('button:has-text("Complete Order"), button:has-text("Place Your Order")').first();
    const isDisabledWithoutBilling = await submitBtn.isDisabled();
    console.log(`  Submit button (without billing): ${isDisabledWithoutBilling ? '🔒 Disabled (validation working)' : '🔓 Enabled'}`);
    
    // If billing fields are visible, fill them
    if (billingFieldsVisible) {
      console.log('  📝 Filling billing address fields...');
      await page.locator('input[name="billingAddress"]').fill('456 Billing Ave');
      await page.locator('input[name="billingCity"]').fill('Billing City');
      await page.locator('input[name="billingState"]').fill('NY');
      await page.locator('input[name="billingZip"]').fill('10001');
      await page.waitForTimeout(100);
      console.log('  ✅ Billing fields filled');
    }
    
    // Check the checkbox again to use shipping address
    console.log('  ☑️ Re-checking "Same as shipping" checkbox...');
    await page.locator('input[type="checkbox"][id*="same"]').click();
    await page.waitForTimeout(200);
    
    // Verify billing fields are hidden/cleared
    const billingFieldsHidden = !(await page.locator('input[name="billingAddress"]').isVisible().catch(() => true));
    console.log(`  Billing fields after re-check: ${billingFieldsHidden ? '✅ Hidden (using shipping)' : '⚠️ Still visible'}`);
    
    // Ensure checkbox is checked for final submission
    const isFinallyChecked = await page.locator('input[type="checkbox"][id*="same"]').isChecked();
    console.log(`  Final checkbox state: ${isFinallyChecked ? '✅ Checked (will use shipping for billing)' : '❌ Unchecked'}`);
    
    // Validate that React state is synchronized with DOM values
    console.log('🔍 Validating React state synchronization...');
    const stateValidation = await page.evaluate(() => {
      const formData = {};
      const inputs = ['email', 'nameOnCard', 'phone', 'address', 'city', 'zip'];
      
      inputs.forEach(name => {
        const input = document.querySelector(`input[name="${name}"]`);
        if (input) {
          // Get the React component instance to check actual state
          const reactInstance = input._valueTracker?.getValue?.() || input.value;
          formData[name] = {
            domValue: input.value,
            reactValue: reactInstance,
            hasValue: input.value && input.value.length > 0
          };
        }
      });
      
      // Check state input separately
      const stateInput = document.querySelector('input#state');
      if (stateInput) {
        const reactInstance = stateInput._valueTracker?.getValue?.() || stateInput.value;
        formData.state = {
          domValue: stateInput.value,
          reactValue: reactInstance,
          hasValue: stateInput.value && stateInput.value.length > 0
        };
      }
      
      // Also try to access React component state directly if available
      // This helps us understand if the component state is actually updated
      const checkoutForm = document.querySelector('form#checkout-form');
      if (checkoutForm && window.React && window.React.version) {
        console.log('React version detected:', window.React.version);
      }
      
      return formData;
    });
    
    console.log('📊 State validation results:');
    let allValid = true;
    Object.entries(stateValidation).forEach(([field, values]) => {
      const isValid = values.domValue === values.reactValue && values.domValue !== '';
      console.log(`  ${field}: ${isValid ? '✅' : '❌'} DOM(${values.domValue}) React(${values.reactValue})`);
      if (!isValid) allValid = false;
    });
    
    if (allValid) {
      console.log('✅ All form fields properly synchronized');
    } else {
      console.log('⚠️ Some form fields may not be synchronized');
    }
    
    // Wait for CollectJS to be ready
    console.log('💳 Waiting for CollectJS to initialize...');
    
    // Listen for the custom CollectJS ready event
    const collectJSReady = page.evaluate(() => {
      return new Promise((resolve) => {
        // Check if already ready
        const checkReady = () => {
          const cardField = document.querySelector('#card-number-field iframe');
          const expiryField = document.querySelector('#card-expiry-field iframe');
          const cvvField = document.querySelector('#card-cvv-field iframe');
          
          if (cardField && expiryField && cvvField) {
            console.log('✅ All payment field iframes detected');
            resolve(true);
            return true;
          }
          return false;
        };
        
        // Check immediately
        if (checkReady()) return;
        
        // Listen for custom event
        window.addEventListener('collectjs:ready', () => {
          console.log('✅ CollectJS ready event received');
          resolve(true);
        });
        
        // Also check periodically
        let checks = 0;
        const interval = setInterval(() => {
          checks++;
          if (checkReady() || checks > 20) {
            clearInterval(interval);
            if (checks > 20) {
              console.log('⚠️ CollectJS timeout - proceeding anyway');
              resolve(false);
            }
          }
        }, 500);
      });
    });
    
    const isReady = await Promise.race([
      collectJSReady,
      page.waitForTimeout(10000).then(() => false)
    ]);
    
    if (isReady) {
      console.log('✅ CollectJS is ready!');
    } else {
      console.log('⚠️ CollectJS may not be fully ready - proceeding with caution');
    }
    
    // Additional wait for iframes to be interactive
    await page.waitForTimeout(2000);
    
    // Fill payment information
    console.log('💳 Filling payment information...');
    
    try {
      // Card number
      const cardNumberFrame = page.frameLocator('#card-number-field iframe');
      await cardNumberFrame.locator('input#ccnumber').fill('4111111111111111');
      console.log('  ✅ Card number filled');
      
      // Generate random expiry (01-12 / 25-29)
      const randomMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
      const randomYear = String(Math.floor(Math.random() * 5) + 25);
      const expiryFrame = page.frameLocator('#card-expiry-field iframe');
      await expiryFrame.locator('input#ccexp').fill(`${randomMonth}/${randomYear}`);
      console.log(`  ✅ Expiry filled: ${randomMonth}/${randomYear}`);
      
      // Generate random CVV (100-999)
      const randomCvv = String(Math.floor(Math.random() * 900) + 100);
      const cvvFrame = page.frameLocator('#card-cvv-field iframe');
      await cvvFrame.locator('input#cvv').fill(randomCvv);
      console.log(`  ✅ CVV filled: ${randomCvv}`);
      
    } catch (error) {
      console.log('⚠️ Could not fill payment fields automatically - CollectJS security active');
      console.log('💡 Attempting alternative method...');
      
      // Try clicking and typing
      const cardContainer = await page.$('#card-number-field');
      if (cardContainer) {
        const box = await cardContainer.boundingBox();
        if (box) {
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          await page.waitForTimeout(500);
          await page.keyboard.type('4111111111111111', { delay: 100 });
          
          await page.keyboard.press('Tab');
          await page.waitForTimeout(500);
          await page.keyboard.type('1225', { delay: 100 });
          
          await page.keyboard.press('Tab');
          await page.waitForTimeout(500);
          await page.keyboard.type('123', { delay: 100 });
          
          console.log('  ✅ Payment fields filled via keyboard');
        }
      }
    }
    
    // Check if submit button is enabled
    const submitButton = page.locator('button:has-text("Complete Order"), button:has-text("Place Your Order")').first();
    const isDisabled = await submitButton.isDisabled();
    
    if (isDisabled) {
      console.log('⚠️ Submit button is still disabled - checking for validation errors');
      const errorCount = await page.locator('.text-red-500').count();
      if (errorCount > 0) {
        console.log(`  ❌ Found ${errorCount} validation errors`);
      }
    } else {
      console.log('✅ Submit button is enabled');
    }
    
    // Submit checkout
    console.log('\n🚀 Submitting payment...');
    
    // Log form data before submission with enhanced React state checking
    const formData = await page.evaluate(() => {
      const data = {};
      ['email', 'nameOnCard', 'phone', 'address', 'city', 'zip'].forEach(name => {
        const input = document.querySelector(`input[name="${name}"]`);
        if (input) {
          data[name] = {
            value: input.value,
            hasValue: input.value !== '',
            isControlled: input.hasAttribute('value') // React controlled component indicator
          };
        }
      });
      const stateInput = document.querySelector('input#state');
      if (stateInput) {
        data.state = {
          value: stateInput.value,
          hasValue: stateInput.value !== '',
          isControlled: stateInput.hasAttribute('value')
        };
      }
      return data;
    });
    console.log('📝 Enhanced form data before submit:');
    Object.entries(formData).forEach(([field, info]) => {
      const status = info.hasValue ? '✅' : '❌';
      console.log(`  ${field}: ${status} "${info.value}" (controlled: ${info.isControlled})`);
    });
    
    await submitButton.click();
    
    // Wait for processing
    console.log('⏳ Waiting for payment processing...');
    
    // Wait for redirect to upsell or error
    const checkoutResult = await Promise.race([
      page.waitForURL('**/upsell/1**', { timeout: 45000 }).then(() => 'upsell'),
      page.waitForURL('**/thankyou**', { timeout: 45000 }).then(() => 'thankyou'),
      page.waitForSelector('text=/error|failed|declined/i', { timeout: 45000 }).then(() => 'error')
    ]);
    
    if (checkoutResult === 'upsell') {
      console.log('✅ Checkout successful! Redirected to upsell 1');
      
      // Extract session info from URL
      const url = new URL(page.url());
      const sessionId = url.searchParams.get('session');
      const transactionId = url.searchParams.get('transaction');
      console.log(`📋 Session ID: ${sessionId}`);
      console.log(`📋 Transaction ID: ${transactionId}`);
      
      // 2. UPSELL 1 PHASE
      console.log('\n📍 PHASE 2: Upsell 1');
      console.log('====================\n');
      
      // Wait for page to stabilize
      await page.waitForTimeout(3000);
      
      // Look for upsell content
      const pageContent = await page.textContent('body');
      const hasRetinaClear = pageContent.includes('RetinaClear');
      const hasSightagen = pageContent.includes('Sightagen');
      console.log(`Product detected: ${hasRetinaClear ? 'RetinaClear' : hasSightagen ? 'Sightagen' : 'Unknown'}`);
      
      // Find and click upsell button
      const upsellButton = page.locator('button:has-text("Yes"), button:has-text("Upgrade"), button:has-text("Add to Order")').first();
      
      if (await upsellButton.isVisible()) {
        console.log('👆 Clicking upsell button...');
        await upsellButton.click();
        
        // Wait for processing
        console.log('⏳ Processing upsell 1...');
        
        const upsellResult = await Promise.race([
          page.waitForURL('**/upsell/2**', { timeout: 20000 }).then(() => 'upsell2'),
          page.waitForURL('**/thankyou**', { timeout: 20000 }).then(() => 'thankyou'),
          page.waitForSelector('text=/error|failed/i', { timeout: 20000 }).then(() => 'error')
        ]);
        
        if (upsellResult === 'upsell2') {
          console.log('✅ Upsell 1 accepted! Redirected to upsell 2');
          
          // 3. UPSELL 2 PHASE
          console.log('\n📍 PHASE 3: Upsell 2');
          console.log('====================\n');
          
          await page.waitForTimeout(3000);
          
          // Decline upsell 2 to reach thank you page
          const declineButton = page.locator('text=/No thanks|Skip|Continue/i').first();
          
          if (await declineButton.isVisible()) {
            console.log('🚫 Declining upsell 2...');
            await declineButton.click();
            
            await page.waitForURL('**/thankyou**', { timeout: 15000 });
            console.log('✅ Reached thank you page!');
          }
          
        } else if (upsellResult === 'thankyou') {
          console.log('✅ Upsell 1 accepted! Went directly to thank you page');
        } else {
          console.log('❌ Upsell 1 failed');
          const errorMsg = await page.locator('text=/error|failed/i').first().textContent();
          console.log('Error message:', errorMsg);
        }
        
      } else {
        console.log('⚠️ No upsell button found - looking for decline option');
        const declineButton = page.locator('text=/No thanks|Skip/i').first();
        
        if (await declineButton.isVisible()) {
          await declineButton.click();
          console.log('🚫 Declined upsell 1');
        }
      }
      
      // 4. THANK YOU PAGE PHASE
      if (page.url().includes('/thankyou')) {
        console.log('\n📍 PHASE 4: Thank You Page');
        console.log('=========================\n');
        
        await page.waitForTimeout(2000);
        
        // Check for order details
        const pageContent = await page.textContent('body');
        const hasOrderNumber = pageContent.includes('Order #') || pageContent.includes('Transaction');
        const hasThankYou = pageContent.includes('Thank you') || pageContent.includes('Congratulations');
        
        console.log(`Order confirmation: ${hasOrderNumber ? '✅' : '❌'}`);
        console.log(`Thank you message: ${hasThankYou ? '✅' : '❌'}`);
        
        // Take final screenshot
        await page.screenshot({ path: 'tests/screenshots/complete-flow-success.png' });
        console.log('📸 Screenshot saved: tests/screenshots/complete-flow-success.png');
        
        console.log('\n🎉 COMPLETE FLOW TEST SUCCESSFUL!');
        console.log('===================================');
        console.log('✅ Checkout completed');
        console.log('✅ Upsell flow processed');
        console.log('✅ Thank you page reached');
      }
      
    } else if (checkoutResult === 'thankyou') {
      console.log('✅ Checkout successful! Went directly to thank you page');
      
    } else {
      console.log('❌ Checkout failed');
      
      // Get error details
      try {
        const errorElement = await page.locator('text=/error|failed|declined/i').first();
        const errorText = await errorElement.textContent();
        console.log('Error message:', errorText);
      } catch {
        console.log('Could not extract error message');
      }
      
      // Take error screenshot
      await page.screenshot({ path: 'tests/screenshots/checkout-error.png' });
      console.log('📸 Error screenshot: tests/screenshots/checkout-error.png');
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    console.error('Stack:', error.stack);
    await page.screenshot({ path: 'tests/screenshots/test-error.png' });
    console.error('📸 Error screenshot: tests/screenshots/test-error.png');
    console.error('📍 Current URL:', page.url());
  } finally {
    console.log('\n🏁 Test completed. Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();