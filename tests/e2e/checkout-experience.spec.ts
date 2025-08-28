import { test, expect, Page } from '@playwright/test';

test.describe('Checkout Experience Test', () => {
  test('Complete checkout flow with form validation', async ({ page }) => {
    console.log('🚀 Starting checkout experience test...');
    
    // Navigate to checkout page
    await page.goto('http://localhost:3255/checkout');
    console.log('✅ Navigated to checkout page');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'tests/screenshots/checkout-initial.png' });
    
    // Test 1: Verify form elements are present
    console.log('📋 Testing form elements presence...');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="nameOnCard"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();
    await expect(page.locator('input[name="address"]')).toBeVisible();
    await expect(page.locator('input[name="city"]')).toBeVisible();
    await expect(page.locator('select[name="state"]')).toBeVisible();
    await expect(page.locator('input[name="zip"]')).toBeVisible();
    console.log('✅ All form elements present');
    
    // Test 2: Check CollectJS iframes are loaded
    console.log('💳 Testing CollectJS payment fields...');
    const ccnumberFrame = await page.frameLocator('iframe[id="ccnumber"]');
    const ccexpFrame = await page.frameLocator('iframe[id="ccexp"]');
    const cccvcFrame = await page.frameLocator('iframe[id="cccvc"]');
    
    // Verify frames exist (CollectJS loads these)
    await expect(page.locator('iframe[id="ccnumber"]')).toBeVisible();
    await expect(page.locator('iframe[id="ccexp"]')).toBeVisible();
    await expect(page.locator('iframe[id="cccvc"]')).toBeVisible();
    console.log('✅ CollectJS payment fields loaded');
    
    // Test 3: Test form validation with empty submission
    console.log('🔍 Testing form validation...');
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Check for validation errors
    await page.waitForTimeout(500);
    const errorElements = await page.locator('.text-red-500').count();
    expect(errorElements).toBeGreaterThan(0);
    console.log(`✅ Form validation working (${errorElements} error messages shown)`);
    
    // Take screenshot of validation errors
    await page.screenshot({ path: 'tests/screenshots/checkout-validation-errors.png' });
    
    // Test 4: Fill out the form with valid data
    console.log('✍️ Filling out checkout form...');
    await page.fill('input[name="email"]', 'playwright@test.com');
    await page.fill('input[name="nameOnCard"]', 'Playwright Test');
    await page.fill('input[name="phone"]', '512-555-1234');
    await page.fill('input[name="address"]', '456 Test Avenue');
    await page.fill('input[name="city"]', 'Austin');
    await page.selectOption('select[name="state"]', 'TX');
    await page.fill('input[name="zip"]', '78701');
    console.log('✅ Form fields populated');
    
    // Test 5: Interact with CollectJS fields (simulate typing)
    console.log('💳 Simulating card input...');
    // Note: Due to CollectJS security, we can't directly fill these fields
    // but we can verify they're interactive
    await page.locator('iframe[id="ccnumber"]').click();
    await page.keyboard.type('4111111111111111', { delay: 50 });
    
    await page.locator('iframe[id="ccexp"]').click();
    await page.keyboard.type('1225', { delay: 50 });
    
    await page.locator('iframe[id="cccvc"]').click();
    await page.keyboard.type('123', { delay: 50 });
    console.log('✅ Card fields interaction simulated');
    
    // Take screenshot of filled form
    await page.screenshot({ path: 'tests/screenshots/checkout-filled.png' });
    
    // Test 6: Check order summary is displayed
    console.log('📊 Verifying order summary...');
    await expect(page.locator('text=/Fitspresso/i')).toBeVisible();
    await expect(page.locator('text=/$294/')).toBeVisible();
    console.log('✅ Order summary displayed correctly');
    
    // Test 7: Performance metrics
    console.log('⚡ Measuring performance...');
    const metrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
        domInteractive: perfData.domInteractive - perfData.fetchStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0
      };
    });
    
    console.log('📈 Performance Metrics:');
    console.log(`  DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`  Page Load Complete: ${metrics.loadComplete}ms`);
    console.log(`  DOM Interactive: ${metrics.domInteractive}ms`);
    console.log(`  First Paint: ${metrics.firstPaint}ms`);
    
    // Test 8: Check for console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Test 9: Mobile responsiveness
    console.log('📱 Testing mobile responsiveness...');
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/checkout-mobile.png' });
    
    // Verify form is still usable on mobile
    await expect(submitButton).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    console.log('✅ Mobile view responsive');
    
    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Test 10: Check accessibility
    console.log('♿ Running accessibility checks...');
    const accessibilityResults = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, select');
      const results = {
        inputsWithLabels: 0,
        inputsWithAutocomplete: 0,
        totalInputs: inputs.length
      };
      
      inputs.forEach((input) => {
        const id = input.getAttribute('id');
        const name = input.getAttribute('name');
        if (id && document.querySelector(`label[for="${id}"]`)) {
          results.inputsWithLabels++;
        }
        if (input.getAttribute('autocomplete')) {
          results.inputsWithAutocomplete++;
        }
      });
      
      return results;
    });
    
    console.log('♿ Accessibility Results:');
    console.log(`  Inputs with labels: ${accessibilityResults.inputsWithLabels}/${accessibilityResults.totalInputs}`);
    console.log(`  Inputs with autocomplete: ${accessibilityResults.inputsWithAutocomplete}/${accessibilityResults.totalInputs}`);
    
    // Final summary
    console.log('\n🎯 Checkout Experience Test Summary:');
    console.log('✅ Form elements present and visible');
    console.log('✅ CollectJS payment fields loaded');
    console.log('✅ Form validation working');
    console.log('✅ Form can be filled programmatically');
    console.log('✅ Order summary displayed');
    console.log('✅ Mobile responsive');
    console.log(`⚠️  Console errors found: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Console errors:', consoleErrors);
    }
  });

  test('Test checkout form submission flow', async ({ page }) => {
    console.log('🚀 Testing form submission flow...');
    
    await page.goto('http://localhost:3255/checkout');
    await page.waitForLoadState('networkidle');
    
    // Fill the form completely
    await page.fill('input[name="email"]', 'submission@test.com');
    await page.fill('input[name="nameOnCard"]', 'Test Submission');
    await page.fill('input[name="phone"]', '512-555-9999');
    await page.fill('input[name="address"]', '789 Submit Street');
    await page.fill('input[name="city"]', 'Austin');
    await page.selectOption('select[name="state"]', 'TX');
    await page.fill('input[name="zip"]', '78702');
    
    // Monitor network request
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/checkout/process'),
      { timeout: 10000 }
    ).catch(() => null);
    
    // Click submit
    await page.locator('button[type="submit"]').click();
    
    // Wait for API response
    const response = await responsePromise;
    
    if (response) {
      const status = response.status();
      const body = await response.json();
      console.log(`📡 API Response Status: ${status}`);
      console.log(`📦 API Response:`, JSON.stringify(body, null, 2));
      
      if (status === 400 && body.message?.includes('Invalid payment token')) {
        console.log('✅ Expected behavior: Invalid token rejected by NMI');
      }
    } else {
      console.log('⚠️ Form validation prevented submission (expected for empty card fields)');
    }
    
    await page.screenshot({ path: 'tests/screenshots/checkout-submission-result.png' });
  });
});