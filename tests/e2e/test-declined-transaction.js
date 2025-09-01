const { chromium } = require('playwright');

/**
 * Test: Declined Transaction (Amount < $1.00)
 * Based on NMI docs: Amount less than 1.00 triggers declined transaction
 * Tests our enhanced error handling for card declined scenarios
 */

(async () => {
  console.log('🚀 Running DECLINED TRANSACTION test...');
  console.log('📋 Testing: Amount < $1.00 should trigger card declined');
  console.log('🎯 Expected: User-friendly "Your card was declined" message');
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
    console.log('📍 PHASE 1: Setup Declined Transaction Test');
    console.log('==========================================');

    // Navigate to checkout with a small amount to trigger decline
    await page.goto('http://localhost:3255/checkout?amount=0.50'); // Amount < $1.00 = declined
    await page.waitForLoadState('networkidle');

    console.log('✅ Checkout form loaded with declined amount ($0.50)');

    // Generate test data
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const testData = {
      email: `test-declined-${timestamp}-${randomSuffix}@example.com`,
      firstName: 'Test',
      lastName: 'Declined',
      phone: '5555551234',
      address: '123 Test St',
      city: 'Test City',
      state: 'CA',
      zip: '90210'
    };

    console.log('📧 Using test data for declined transaction:');
    console.log(`  📧 Email: ${testData.email}`);
    console.log(`  👤 Name: ${testData.firstName} ${testData.lastName}`);
    console.log(`  💰 Amount: $0.50 (should be declined)`);

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

    console.log('💳 Filling payment information (valid card for decline test)...');
    
    // Use valid Visa test card (decline will be triggered by amount, not card)
    const cardData = {
      number: '4111111111111111', // Valid Visa test card
      expiry: '10/25',            // Valid expiry from NMI docs
      cvv: '123'                  // Valid CVV
    };

    console.log(`💳 Using test card: ${cardData.number.substring(0, 4)}****${cardData.number.substring(12)}`);

    // Fill CollectJS fields
    const cardNumberFrame = page.frameLocator('#card-number-field iframe');
    await cardNumberFrame.locator('input').fill(cardData.number);
    console.log('  ✅ Card number filled');

    const expiryFrame = page.frameLocator('#card-expiry-field iframe');
    await expiryFrame.locator('input').fill(cardData.expiry);
    console.log(`  ✅ Expiry filled: ${cardData.expiry}`);

    const cvvFrame = page.frameLocator('#card-cvv-field iframe');
    await cvvFrame.locator('input').fill(cardData.cvv);
    console.log(`  ✅ CVV filled: ${cardData.cvv}`);

    // Wait for validation
    await page.waitForTimeout(2000);

    // Check if submit button is enabled
    const submitButton = page.locator('button[type="submit"]');
    const isEnabled = await submitButton.isEnabled();
    console.log(`✅ Submit button enabled: ${isEnabled}`);

    if (!isEnabled) {
      console.log('❌ Submit button is disabled - checking validation state...');
      // Add debug info if needed
      await page.waitForTimeout(2000);
    }

    console.log('🚀 Submitting payment (expecting decline)...');
    await submitButton.click();

    console.log('⏳ Waiting for decline response...');
    
    // Wait for either success redirect or error message
    try {
      // Wait for error message to appear (should happen for declined transaction)
      await page.waitForSelector('text=/declined|error|failed/i', { timeout: 15000 });
      
      // Capture the error message
      const errorElements = await page.locator('text=/declined|error|failed/i').all();
      const errorMessages = [];
      
      for (const element of errorElements) {
        const text = await element.textContent();
        if (text && text.trim()) {
          errorMessages.push(text.trim());
        }
      }

      console.log('');
      console.log('📊 DECLINE TEST RESULTS:');
      console.log('========================');
      
      if (errorMessages.length > 0) {
        console.log('✅ Decline detected! Error messages found:');
        errorMessages.forEach((msg, index) => {
          console.log(`  ${index + 1}. "${msg}"`);
        });
        
        // Check if we have user-friendly error messages
        const hasUserFriendlyMessage = errorMessages.some(msg => 
          msg.toLowerCase().includes('declined') || 
          msg.toLowerCase().includes('try a different payment method') ||
          msg.toLowerCase().includes('card was declined')
        );
        
        if (hasUserFriendlyMessage) {
          console.log('✅ User-friendly error message detected!');
        } else {
          console.log('⚠️ Error messages could be more user-friendly');
        }
      } else {
        console.log('❌ No error messages found - this is unexpected for declined transaction');
      }

    } catch (waitError) {
      // Check if we accidentally got redirected (shouldn't happen for decline)
      const currentUrl = page.url();
      if (currentUrl.includes('/upsell') || currentUrl.includes('/thankyou')) {
        console.log('❌ UNEXPECTED: Transaction was approved instead of declined!');
        console.log(`   Current URL: ${currentUrl}`);
        console.log('   This suggests the decline trigger (amount < $1.00) may not be working');
      } else {
        console.log('⏳ Still waiting for response...');
        await page.waitForTimeout(5000);
      }
    }

    // Take screenshot for documentation
    await page.screenshot({ path: 'tests/screenshots/declined-transaction-test.png', fullPage: true });
    console.log('📸 Screenshot saved: tests/screenshots/declined-transaction-test.png');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'tests/screenshots/declined-transaction-error.png', fullPage: true });
  } finally {
    console.log('');
    console.log('🏁 Declined transaction test completed');
    console.log('🔍 Review the error messages above to validate user-friendly messaging');
    console.log('');
    console.log('Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();
