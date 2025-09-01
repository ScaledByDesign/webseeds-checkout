const { chromium } = require('playwright');

/**
 * Test: Invalid Card Number (Fatal Error)
 * Based on NMI docs: Invalid card number triggers fatal error
 * Tests our enhanced error handling for invalid card scenarios
 */

(async () => {
  console.log('🚀 Running INVALID CARD NUMBER test...');
  console.log('📋 Testing: Invalid card number should trigger validation error');
  console.log('🎯 Expected: User-friendly "check your card details" message');
  console.log('');

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'log' || msg.type() === 'error') {
      console.log(`📌 PAGE LOG: ${msg.text()}`);
    }
  });

  try {
    console.log('📍 PHASE 1: Setup Invalid Card Test');
    console.log('===================================');

    // Navigate to checkout
    await page.goto('http://localhost:3255/checkout');
    await page.waitForLoadState('networkidle');

    console.log('✅ Checkout form loaded');

    // Generate test data
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const testData = {
      email: `test-invalid-${timestamp}-${randomSuffix}@example.com`,
      firstName: 'Test',
      lastName: 'Invalid',
      phone: '5555551234',
      address: '123 Test St',
      city: 'Test City',
      state: 'CA',
      zip: '90210'
    };

    console.log('📧 Using test data for invalid card test:');
    console.log(`  📧 Email: ${testData.email}`);
    console.log(`  👤 Name: ${testData.firstName} ${testData.lastName}`);

    console.log('📝 Filling customer information...');

    // Fill form fields
    await page.fill('input[name="email"]', testData.email);
    await page.fill('input[name="nameOnCard"]', `${testData.firstName} ${testData.lastName}`);
    await page.fill('input[name="phone"]', testData.phone);
    await page.fill('input[name="address"]', testData.address);
    await page.fill('input[name="city"]', testData.city);
    await page.selectOption('select[name="state"]', testData.state);
    await page.fill('input[name="zip"]', testData.zip);
    await page.selectOption('select[name="country"]', 'US');

    console.log('💳 Waiting for CollectJS to initialize...');
    
    // Wait for CollectJS to be ready
    await page.waitForFunction(() => {
      return window.CollectJS && window.CollectJS.isReady && window.CollectJS.isReady();
    }, { timeout: 30000 });

    console.log('✅ CollectJS is ready!');

    console.log('💳 Testing different invalid card scenarios...');
    
    const invalidCardTests = [
      {
        name: 'Invalid Card Number (Too Short)',
        number: '4111111111',
        expiry: '10/25',
        cvv: '123',
        expectedError: 'card number'
      },
      {
        name: 'Invalid Card Number (Wrong Format)',
        number: '1234567890123456',
        expiry: '10/25', 
        cvv: '123',
        expectedError: 'card number'
      },
      {
        name: 'Invalid Expiry Date',
        number: '4111111111111111',
        expiry: '13/25', // Invalid month
        cvv: '123',
        expectedError: 'expiration'
      },
      {
        name: 'Invalid CVV',
        number: '4111111111111111',
        expiry: '10/25',
        cvv: '12', // Too short
        expectedError: 'cvv'
      }
    ];

    for (let i = 0; i < invalidCardTests.length; i++) {
      const test = invalidCardTests[i];
      console.log('');
      console.log(`📋 Test ${i + 1}: ${test.name}`);
      console.log('─'.repeat(50));

      // Clear previous card data
      const cardNumberFrame = page.frameLocator('#card-number-field iframe');
      await cardNumberFrame.locator('input').clear();
      
      const expiryFrame = page.frameLocator('#card-expiry-field iframe');
      await expiryFrame.locator('input').clear();
      
      const cvvFrame = page.frameLocator('#card-cvv-field iframe');
      await cvvFrame.locator('input').clear();

      // Fill invalid card data
      console.log(`💳 Filling invalid data: ${test.number.substring(0, 4)}****`);
      
      await cardNumberFrame.locator('input').fill(test.number);
      console.log('  ✅ Card number filled');

      await expiryFrame.locator('input').fill(test.expiry);
      console.log(`  ✅ Expiry filled: ${test.expiry}`);

      await cvvFrame.locator('input').fill(test.cvv);
      console.log(`  ✅ CVV filled: ${test.cvv}`);

      // Wait for validation
      await page.waitForTimeout(3000);

      // Check for validation errors
      const errorElements = await page.locator('text=/invalid|error|check|please/i').all();
      const errorMessages = [];
      
      for (const element of errorElements) {
        const text = await element.textContent();
        if (text && text.trim()) {
          errorMessages.push(text.trim());
        }
      }

      // Check submit button state
      const submitButton = page.locator('button[type="submit"]');
      const isEnabled = await submitButton.isEnabled();

      console.log(`📊 Results for ${test.name}:`);
      console.log(`  🔘 Submit button enabled: ${isEnabled}`);
      
      if (errorMessages.length > 0) {
        console.log(`  ✅ Validation errors found (${errorMessages.length}):`);
        errorMessages.forEach((msg, index) => {
          console.log(`    ${index + 1}. "${msg}"`);
        });
        
        // Check if error message is user-friendly
        const hasRelevantError = errorMessages.some(msg => 
          msg.toLowerCase().includes(test.expectedError)
        );
        
        if (hasRelevantError) {
          console.log(`  ✅ Relevant error message found for ${test.expectedError}`);
        } else {
          console.log(`  ⚠️ Expected error message for ${test.expectedError} not found`);
        }
      } else {
        console.log('  ❌ No validation errors found');
      }

      // If button is enabled, try submitting to see API error handling
      if (isEnabled) {
        console.log('  🚀 Button enabled - testing API error handling...');
        await submitButton.click();
        
        // Wait for API error response
        await page.waitForTimeout(5000);
        
        // Check for API error messages
        const apiErrorElements = await page.locator('text=/error|failed|invalid/i').all();
        const apiErrorMessages = [];
        
        for (const element of apiErrorElements) {
          const text = await element.textContent();
          if (text && text.trim() && !errorMessages.includes(text.trim())) {
            apiErrorMessages.push(text.trim());
          }
        }
        
        if (apiErrorMessages.length > 0) {
          console.log('  📡 API error messages:');
          apiErrorMessages.forEach((msg, index) => {
            console.log(`    ${index + 1}. "${msg}"`);
          });
        }
      }
    }

    // Take screenshot for documentation
    await page.screenshot({ path: 'tests/screenshots/invalid-card-test.png', fullPage: true });
    console.log('📸 Screenshot saved: tests/screenshots/invalid-card-test.png');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'tests/screenshots/invalid-card-error.png', fullPage: true });
  } finally {
    console.log('');
    console.log('🏁 Invalid card test completed');
    console.log('🔍 Review the validation messages above');
    console.log('');
    console.log('Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();
