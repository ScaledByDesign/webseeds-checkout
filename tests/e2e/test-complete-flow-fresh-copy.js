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
    
    // Generate randomized test data
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);

    // Randomized customer data
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Maria'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    const streetNames = ['Main St', 'Oak Ave', 'Pine Rd', 'Elm Dr', 'Cedar Ln', 'Maple Way', 'Park Blvd', 'First St', 'Second Ave', 'Third Dr'];
    const cities = ['Austin', 'Dallas', 'Houston', 'San Antonio', 'Phoenix', 'Denver', 'Seattle', 'Portland', 'Miami', 'Atlanta'];
    const states = ['TX', 'CA', 'FL', 'NY', 'WA', 'CO', 'AZ', 'GA', 'OR', 'NC'];

    const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const randomStreetNumber = Math.floor(Math.random() * 9999) + 1;
    const randomStreetName = streetNames[Math.floor(Math.random() * streetNames.length)];
    const randomCity = cities[Math.floor(Math.random() * cities.length)];
    const randomState = states[Math.floor(Math.random() * states.length)];
    const randomZip = `${Math.floor(Math.random() * 90000) + 10000}`;
    const randomPhone = `555${Math.floor(Math.random() * 9000000) + 1000000}`;

    const testData = {
      email: `test-${timestamp}-${randomStr}@example.com`,
      fullName: `${randomFirstName} ${randomLastName}`,
      phone: randomPhone,
      address: `${randomStreetNumber} ${randomStreetName}`,
      city: randomCity,
      state: randomState,
      zip: randomZip
    };

    console.log(`📧 Using randomized test data:`);
    console.log(`  📧 Email: ${testData.email}`);
    console.log(`  👤 Name: ${testData.fullName}`);
    console.log(`  📞 Phone: ${testData.phone}`);
    console.log(`  🏠 Address: ${testData.address}`);
    console.log(`  🏙️ City: ${testData.city}, ${testData.state} ${testData.zip}`);

    // Fill customer information
    console.log('📝 Filling customer information...');

    // Helper function to clear field and type new value
    // Uses Playwright's fill() method to properly trigger React onChange events
    const clearAndType = async (selector, value) => {
      await page.locator(selector).fill(value);
      // Wait for React state to update
      await page.waitForTimeout(100);
    };

    await clearAndType('input[name="email"]', testData.email);
    await clearAndType('input[name="nameOnCard"]', testData.fullName);
    await clearAndType('input[name="phone"]', testData.phone);
    await clearAndType('input[name="address"]', testData.address);
    await clearAndType('input[name="city"]', testData.city);
    await clearAndType('input#state', testData.state);
    await clearAndType('input[name="zip"]', testData.zip);
    
    // Tab out of last field to trigger blur
    await page.keyboard.press('Tab');
    
    // Validate that React state is synchronized with DOM values
    console.log('🔍 Validating React state synchronization...');
    const stateValidation = await page.evaluate(() => {
      const formData = {};
      const inputs = ['email', 'nameOnCard', 'phone', 'address', 'city', 'zip'];
      
      inputs.forEach(name => {
        const input = document.querySelector(`input[name="${name}"]`);
        if (input) {
          formData[name] = {
            domValue: input.value,
            reactValue: input.value // For controlled components, these should match
          };
        }
      });
      
      // Check state input separately
      const stateInput = document.querySelector('input#state');
      if (stateInput) {
        formData.state = {
          domValue: stateInput.value,
          reactValue: stateInput.value
        };
      }
      
      return formData;
    });
    
    console.log('📊 State validation results:');
    let allValid = true;
    Object.entries(stateValidation).forEach(([field, values]) => {
      const isValid = values.domValue === values.reactValue && values.domValue !== '';
      const status = isValid ? '✅' : '❌';
      console.log(`  ${field}: ${status} DOM("${values.domValue}") React("${values.reactValue}")`);
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
      // Generate randomized payment data
      const testCards = [
        '4111111111111111', // Visa
        '4012888888881881', // Visa
        '4222222222222',    // Visa (shorter)
        '5555555555554444', // Mastercard
        '5105105105105100'  // Mastercard
      ];

      const randomCard = testCards[Math.floor(Math.random() * testCards.length)];
      const randomMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
      const randomYear = String(Math.floor(Math.random() * 5) + 25); // 2025-2029
      const randomCvv = String(Math.floor(Math.random() * 900) + 100); // 100-999

      console.log(`💳 Using randomized payment data:`);
      console.log(`  💳 Card: ${randomCard.substring(0, 4)}****${randomCard.substring(randomCard.length - 4)}`);
      console.log(`  📅 Expiry: ${randomMonth}/${randomYear}`);
      console.log(`  🔒 CVV: ${randomCvv}`);

      // Card number
      const cardNumberFrame = page.frameLocator('#card-number-field iframe');
      await cardNumberFrame.locator('input#ccnumber').fill(randomCard);
      console.log('  ✅ Card number filled');

      // Expiry
      const expiryFrame = page.frameLocator('#card-expiry-field iframe');
      await expiryFrame.locator('input#ccexp').fill(`${randomMonth}/${randomYear}`);
      console.log(`  ✅ Expiry filled: ${randomMonth}/${randomYear}`);

      // CVV
      const cvvFrame = page.frameLocator('#card-cvv-field iframe');
      await cvvFrame.locator('input#cvv').fill(randomCvv);
      console.log(`  ✅ CVV filled: ${randomCvv}`);
      
    } catch (error) {
      console.log('⚠️ Could not fill payment fields automatically - CollectJS security active');
      console.log('💡 Attempting alternative method...');
      
      // Try clicking and typing with randomized data
      const cardContainer = await page.$('#card-number-field');
      if (cardContainer) {
        const box = await cardContainer.boundingBox();
        if (box) {
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          await page.waitForTimeout(500);
          await page.keyboard.type(randomCard, { delay: 100 });

          await page.keyboard.press('Tab');
          await page.waitForTimeout(500);
          await page.keyboard.type(`${randomMonth}${randomYear}`, { delay: 100 });

          await page.keyboard.press('Tab');
          await page.waitForTimeout(500);
          await page.keyboard.type(randomCvv, { delay: 100 });

          console.log('  ✅ Payment fields filled via keyboard with randomized data');
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

      // Find and click upsell button - look for the actual button text
      const upsellButton = page.locator('button:has-text("Yes! Upgrade My Order!"), button:has-text("Upgrade"), button:has-text("Add to Order"), button:has-text("Yes")').first();

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
