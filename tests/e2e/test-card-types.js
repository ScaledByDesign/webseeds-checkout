const { chromium } = require('playwright');

/**
 * Test: Different Card Types
 * Based on NMI docs: Test all supported card types
 * Tests card type detection and processing for various card brands
 */

(async () => {
  console.log('🚀 Running CARD TYPES test...');
  console.log('📋 Testing: Different card types from NMI documentation');
  console.log('🎯 Expected: All card types should be accepted and processed');
  console.log('');

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1500,
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
    console.log('📍 PHASE 1: Setup Card Types Test');
    console.log('==================================');

    // Card types from NMI documentation
    const cardTypes = [
      {
        name: 'Visa',
        number: '4111111111111111',
        icon: '💳',
        description: 'Most common card type'
      },
      {
        name: 'MasterCard', 
        number: '5431111111111111',
        icon: '💳',
        description: 'Second most common'
      },
      {
        name: 'American Express',
        number: '341111111111111',
        icon: '💎',
        description: '15-digit card number'
      },
      {
        name: 'Discover',
        number: '6011000991300009',
        icon: '🔍',
        description: 'Discover network'
      },
      {
        name: "Diner's Club",
        number: '30205252489926',
        icon: '🍽️',
        description: '14-digit card number'
      },
      {
        name: 'JCB',
        number: '3541963594572595',
        icon: '🏯',
        description: 'Japanese card brand'
      },
      {
        name: 'Maestro',
        number: '6799990100000000019',
        icon: '🎵',
        description: '19-digit card number'
      }
    ];

    const commonExpiry = '10/25'; // From NMI docs
    const commonCvv = '123';

    // Generate base test data
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const baseTestData = {
      firstName: 'Test',
      lastName: 'CardTypes',
      phone: '5555551234',
      address: '123 Test St',
      city: 'Test City',
      state: 'CA',
      zip: '90210'
    };

    console.log(`📧 Base test data: ${baseTestData.firstName} ${baseTestData.lastName}`);
    console.log(`📞 Phone: ${baseTestData.phone}`);
    console.log('');

    const results = [];

    for (let i = 0; i < cardTypes.length; i++) {
      const cardType = cardTypes[i];
      console.log(`📋 Test ${i + 1}/${cardTypes.length}: ${cardType.icon} ${cardType.name}`);
      console.log('─'.repeat(60));
      console.log(`📝 ${cardType.description}`);
      console.log(`💳 Card: ${cardType.number.substring(0, 4)}****${cardType.number.substring(cardType.number.length - 4)}`);

      try {
        // Navigate to fresh checkout for each test
        await page.goto('http://localhost:3255/checkout');
        await page.waitForLoadState('networkidle');

        // Generate unique email for this card type
        const testData = {
          ...baseTestData,
          email: `test-${cardType.name.toLowerCase().replace(/[^a-z]/g, '')}-${timestamp}-${randomSuffix}@example.com`
        };

        console.log(`📧 Email: ${testData.email}`);

        // Fill customer information
        await page.fill('input[name="email"]', testData.email);
        await page.fill('input[name="nameOnCard"]', `${testData.firstName} ${testData.lastName}`);
        await page.fill('input[name="phone"]', testData.phone);
        await page.fill('input[name="address"]', testData.address);
        await page.fill('input[name="city"]', testData.city);
        await page.selectOption('select[name="state"]', testData.state);
        await page.fill('input[name="zip"]', testData.zip);
        await page.selectOption('select[name="country"]', 'US');

        console.log('✅ Customer information filled');

        // Wait for CollectJS to be ready
        await page.waitForFunction(() => {
          return window.CollectJS && window.CollectJS.isReady && window.CollectJS.isReady();
        }, { timeout: 30000 });

        console.log('✅ CollectJS ready');

        // Fill payment information
        const cardNumberFrame = page.frameLocator('#card-number-field iframe');
        await cardNumberFrame.locator('input').fill(cardType.number);
        console.log('  ✅ Card number filled');

        const expiryFrame = page.frameLocator('#card-expiry-field iframe');
        await expiryFrame.locator('input').fill(commonExpiry);
        console.log(`  ✅ Expiry filled: ${commonExpiry}`);

        const cvvFrame = page.frameLocator('#card-cvv-field iframe');
        await cvvFrame.locator('input').fill(commonCvv);
        console.log(`  ✅ CVV filled: ${commonCvv}`);

        // Wait for validation
        await page.waitForTimeout(3000);

        // Check submit button state
        const submitButton = page.locator('button[type="submit"]');
        const isEnabled = await submitButton.isEnabled();
        console.log(`🔘 Submit button enabled: ${isEnabled}`);

        if (isEnabled) {
          console.log('🚀 Submitting payment...');
          await submitButton.click();

          // Wait for response (success or error)
          try {
            // Wait for either redirect or error
            await Promise.race([
              page.waitForURL('**/upsell/**', { timeout: 15000 }),
              page.waitForSelector('text=/error|failed|declined/i', { timeout: 15000 })
            ]);

            const currentUrl = page.url();
            
            if (currentUrl.includes('/upsell')) {
              console.log('✅ SUCCESS: Redirected to upsell');
              results.push({
                cardType: cardType.name,
                status: 'SUCCESS',
                message: 'Payment processed successfully'
              });
            } else {
              // Check for error messages
              const errorElements = await page.locator('text=/error|failed|declined/i').all();
              const errorMessages = [];
              
              for (const element of errorElements) {
                const text = await element.textContent();
                if (text && text.trim()) {
                  errorMessages.push(text.trim());
                }
              }

              if (errorMessages.length > 0) {
                console.log('❌ ERROR: Payment failed');
                errorMessages.forEach((msg, index) => {
                  console.log(`  ${index + 1}. "${msg}"`);
                });
                
                results.push({
                  cardType: cardType.name,
                  status: 'ERROR',
                  message: errorMessages[0]
                });
              } else {
                console.log('⏳ PENDING: Still processing...');
                results.push({
                  cardType: cardType.name,
                  status: 'PENDING',
                  message: 'No clear success or error response'
                });
              }
            }

          } catch (timeoutError) {
            console.log('⏰ TIMEOUT: No response within 15 seconds');
            results.push({
              cardType: cardType.name,
              status: 'TIMEOUT',
              message: 'No response within timeout period'
            });
          }

        } else {
          console.log('❌ VALIDATION: Submit button disabled');
          
          // Check for validation errors
          const errorElements = await page.locator('text=/invalid|error|check/i').all();
          const errorMessages = [];
          
          for (const element of errorElements) {
            const text = await element.textContent();
            if (text && text.trim()) {
              errorMessages.push(text.trim());
            }
          }

          results.push({
            cardType: cardType.name,
            status: 'VALIDATION_ERROR',
            message: errorMessages.length > 0 ? errorMessages[0] : 'Submit button disabled'
          });
        }

      } catch (error) {
        console.log(`❌ EXCEPTION: ${error.message}`);
        results.push({
          cardType: cardType.name,
          status: 'EXCEPTION',
          message: error.message
        });
      }

      console.log('');
      
      // Small delay between tests
      await page.waitForTimeout(2000);
    }

    // Display final results
    console.log('📊 CARD TYPES TEST RESULTS:');
    console.log('═'.repeat(60));
    
    const successCount = results.filter(r => r.status === 'SUCCESS').length;
    const errorCount = results.filter(r => r.status === 'ERROR').length;
    const validationErrorCount = results.filter(r => r.status === 'VALIDATION_ERROR').length;
    const otherCount = results.length - successCount - errorCount - validationErrorCount;

    console.log(`📈 Summary: ${successCount} success, ${errorCount} errors, ${validationErrorCount} validation errors, ${otherCount} other`);
    console.log('');

    results.forEach((result, index) => {
      const icon = result.status === 'SUCCESS' ? '✅' : 
                   result.status === 'ERROR' ? '❌' : 
                   result.status === 'VALIDATION_ERROR' ? '⚠️' : '❓';
      
      console.log(`${icon} ${result.cardType}: ${result.status}`);
      if (result.message) {
        console.log(`   └─ ${result.message}`);
      }
    });

    // Take screenshot for documentation
    await page.screenshot({ path: 'tests/screenshots/card-types-test.png', fullPage: true });
    console.log('📸 Screenshot saved: tests/screenshots/card-types-test.png');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'tests/screenshots/card-types-error.png', fullPage: true });
  } finally {
    console.log('');
    console.log('🏁 Card types test completed');
    console.log('🔍 Review the results above to validate card type support');
    console.log('');
    console.log('Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();
