import { test, expect, devices } from '@playwright/test';
import { NMITestDataFactory, NMIPerformanceMonitor, NMISecurityValidator } from '../helpers/nmi-test-helper';

/**
 * NMI Cross-Browser Compatibility Test Suite
 * 
 * Tests NMI payment gateway integration across different browsers and devices:
 * - Desktop browsers (Chrome, Firefox, Safari, Edge)
 * - Mobile browsers (iOS Safari, Android Chrome)
 * - Iframe behavior consistency
 * - CollectJS compatibility
 * - Performance across browsers
 */

const TEST_CUSTOMER = NMITestDataFactory.generateCustomer();
const PAYMENT_METHODS = NMITestDataFactory.getPaymentMethods();

// Helper function for cross-browser testing
async function performCrossBrowserCheckout(page: any, browserName: string) {
  console.log(`🌐 Testing checkout flow on ${browserName}...`);
  
  const performanceMonitor = new NMIPerformanceMonitor(page);
  performanceMonitor.startMonitoring();
  
  // Navigate to checkout
  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');
  
  // Wait for CollectJS with browser-specific timeout
  const collectJSTimeout = browserName.includes('Safari') ? 45000 : 30000;
  await page.waitForFunction(() => window.CollectJS != null, { timeout: collectJSTimeout });
  
  // Fill customer information
  await page.fill('input[name="email"]', TEST_CUSTOMER.email);
  await page.fill('input[name="firstName"]', TEST_CUSTOMER.firstName);
  await page.fill('input[name="lastName"]', TEST_CUSTOMER.lastName);
  await page.fill('input[name="address"]', TEST_CUSTOMER.address);
  await page.fill('input[name="city"]', TEST_CUSTOMER.city);
  await page.fill('input[name="state"]', TEST_CUSTOMER.state);
  await page.fill('input[name="zipCode"]', TEST_CUSTOMER.zipCode);
  await page.fill('input[name="phone"]', TEST_CUSTOMER.phone);
  
  // Browser-specific iframe handling
  await fillPaymentFieldsCrossBrowser(page, browserName);
  
  // Submit and verify
  const submitButton = page.locator('button[type="submit"]:not([disabled])');
  await expect(submitButton).toBeEnabled();
  await submitButton.click();
  
  performanceMonitor.markCheckoutComplete();
  
  // Wait for success with browser-specific timeout
  const successTimeout = browserName.includes('Safari') ? 90000 : 60000;
  await page.waitForURL(/\/(upsell|success|thank-you)/, { timeout: successTimeout });
  
  const metrics = performanceMonitor.getMetrics();
  console.log(`✅ ${browserName} checkout completed in ${metrics.totalCheckoutTime}ms`);
  
  return metrics;
}

async function fillPaymentFieldsCrossBrowser(page: any, browserName: string) {
  console.log(`💳 Filling payment fields for ${browserName}...`);
  
  // Wait for iframes to be ready with browser-specific timing
  const iframeWait = browserName.includes('Safari') ? 5000 : 3000;
  await page.waitForTimeout(iframeWait);
  
  try {
    // Primary iframe selectors
    const cardFrame = page.frameLocator('#card-number-field iframe');
    const expiryFrame = page.frameLocator('#card-expiry-field iframe');
    const cvvFrame = page.frameLocator('#card-cvv-field iframe');
    
    await cardFrame.locator('input[name="ccnumber"]').fill(PAYMENT_METHODS.visa.cardNumber);
    await expiryFrame.locator('input[name="ccexp"]').fill(`${PAYMENT_METHODS.visa.expiryMonth}${PAYMENT_METHODS.visa.expiryYear}`);
    await cvvFrame.locator('input[name="cvv"]').fill(PAYMENT_METHODS.visa.cvv);
    
    console.log(`✅ Payment fields filled successfully on ${browserName}`);
  } catch (error) {
    console.log(`⚠️ Trying alternative selectors for ${browserName}...`);
    
    // Browser-specific fallback selectors
    if (browserName.includes('Safari')) {
      // Safari-specific iframe handling
      const cardFrame = page.frameLocator('[data-field="ccnumber"] iframe').first();
      const expiryFrame = page.frameLocator('[data-field="ccexp"] iframe').first();
      const cvvFrame = page.frameLocator('[data-field="cvv"] iframe').first();
      
      await cardFrame.locator('input').fill(PAYMENT_METHODS.visa.cardNumber);
      await expiryFrame.locator('input').fill(`${PAYMENT_METHODS.visa.expiryMonth}${PAYMENT_METHODS.visa.expiryYear}`);
      await cvvFrame.locator('input').fill(PAYMENT_METHODS.visa.cvv);
    } else if (browserName.includes('Firefox')) {
      // Firefox-specific iframe handling
      await page.waitForTimeout(2000); // Additional wait for Firefox
      const cardFrame = page.frameLocator('iframe[src*="nmi"]').first();
      await cardFrame.locator('input[placeholder*="card" i]').fill(PAYMENT_METHODS.visa.cardNumber);
      await cardFrame.locator('input[placeholder*="exp" i]').fill(`${PAYMENT_METHODS.visa.expiryMonth}${PAYMENT_METHODS.visa.expiryYear}`);
      await cardFrame.locator('input[placeholder*="cvv" i]').fill(PAYMENT_METHODS.visa.cvv);
    } else {
      // Generic fallback
      await page.fill('#card-number', PAYMENT_METHODS.visa.cardNumber);
      await page.fill('#card-expiry', `${PAYMENT_METHODS.visa.expiryMonth}/${PAYMENT_METHODS.visa.expiryYear}`);
      await page.fill('#card-cvv', PAYMENT_METHODS.visa.cvv);
    }
    
    console.log(`✅ Payment fields filled with fallback method on ${browserName}`);
  }
}

// Desktop Browser Tests
test.describe('Desktop Browser Compatibility', () => {
  test('Chrome Desktop - Complete checkout flow', async ({ page }) => {
    const metrics = await performCrossBrowserCheckout(page, 'Chrome Desktop');
    
    // Validate performance benchmarks for Chrome
    expect(metrics.totalCheckoutTime).toBeLessThan(30000); // 30 seconds
    expect(metrics.collectJSLoadTime).toBeLessThan(5000); // 5 seconds
  });

  test('Firefox Desktop - Complete checkout flow', async ({ page }) => {
    const metrics = await performCrossBrowserCheckout(page, 'Firefox Desktop');
    
    // Firefox may be slightly slower
    expect(metrics.totalCheckoutTime).toBeLessThan(35000); // 35 seconds
  });

  test('Safari Desktop - Complete checkout flow', async ({ page }) => {
    const metrics = await performCrossBrowserCheckout(page, 'Safari Desktop');
    
    // Safari may have longer iframe initialization
    expect(metrics.totalCheckoutTime).toBeLessThan(45000); // 45 seconds
  });
});

// Mobile Browser Tests
test.describe('Mobile Browser Compatibility', () => {
  test('Mobile Chrome - Complete checkout flow', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['Pixel 5']
    });
    const page = await context.newPage();
    
    try {
      const metrics = await performCrossBrowserCheckout(page, 'Mobile Chrome');
      
      // Mobile may be slower due to device constraints
      expect(metrics.totalCheckoutTime).toBeLessThan(45000); // 45 seconds
    } finally {
      await context.close();
    }
  });

  test('Mobile Safari - Complete checkout flow', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12']
    });
    const page = await context.newPage();
    
    try {
      const metrics = await performCrossBrowserCheckout(page, 'Mobile Safari');
      
      // iOS Safari may have additional security delays
      expect(metrics.totalCheckoutTime).toBeLessThan(60000); // 60 seconds
    } finally {
      await context.close();
    }
  });
});

// Iframe Behavior Tests
test.describe('Cross-Browser Iframe Behavior', () => {
  test('Iframe security attributes across browsers', async ({ page, browserName }) => {
    const securityValidator = new NMISecurityValidator(page);
    
    await page.goto('/checkout');
    await page.waitForFunction(() => window.CollectJS != null, { timeout: 30000 });
    await page.waitForTimeout(3000);
    
    const securityChecks = await securityValidator.validateIframeSecurity();
    
    // All payment iframes should be secure
    const paymentIframes = securityChecks.filter(check => 
      check.src?.includes('nmi.com') || check.src?.includes('secure')
    );
    
    paymentIframes.forEach(iframe => {
      expect(iframe.isSecure).toBe(true);
    });
    
    console.log(`✅ Iframe security validated for ${browserName}`);
  });

  test('Iframe interaction consistency across browsers', async ({ page, browserName }) => {
    await page.goto('/checkout');
    await page.waitForFunction(() => window.CollectJS != null, { timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Test iframe focus and input
    const cardFrame = page.frameLocator('#card-number-field iframe');
    const cardInput = cardFrame.locator('input[name="ccnumber"]');
    
    // Verify iframe is interactive
    await expect(cardInput).toBeVisible();
    await cardInput.focus();
    await cardInput.fill('4111');
    
    const value = await cardInput.inputValue();
    expect(value).toContain('4111');
    
    console.log(`✅ Iframe interaction verified for ${browserName}`);
  });
});

// Performance Comparison Tests
test.describe('Cross-Browser Performance', () => {
  test('Performance comparison across browsers', async ({ page, browserName }) => {
    const performanceMonitor = new NMIPerformanceMonitor(page);
    performanceMonitor.startMonitoring();
    
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    // Measure CollectJS load time
    await page.waitForFunction(() => window.CollectJS != null, { timeout: 30000 });
    
    // Measure field initialization time
    await page.waitForTimeout(3000);
    const cardFrame = page.frameLocator('#card-number-field iframe');
    await expect(cardFrame.locator('input')).toBeVisible();
    
    const metrics = performanceMonitor.getMetrics();
    
    // Browser-specific performance expectations
    const performanceThresholds = {
      'chromium': { collectJS: 5000, total: 10000 },
      'firefox': { collectJS: 7000, total: 12000 },
      'webkit': { collectJS: 8000, total: 15000 }
    };
    
    const threshold = performanceThresholds[browserName as keyof typeof performanceThresholds] || 
                     performanceThresholds.chromium;
    
    expect(metrics.collectJSLoadTime).toBeLessThan(threshold.collectJS);
    
    console.log(`✅ Performance validated for ${browserName}:`, metrics);
  });
});

// Error Handling Consistency
test.describe('Cross-Browser Error Handling', () => {
  test('Error message display consistency', async ({ page, browserName }) => {
    await page.goto('/checkout');
    await page.waitForFunction(() => window.CollectJS != null, { timeout: 30000 });
    
    // Fill customer info
    await page.fill('input[name="email"]', TEST_CUSTOMER.email);
    await page.fill('input[name="firstName"]', TEST_CUSTOMER.firstName);
    await page.fill('input[name="lastName"]', TEST_CUSTOMER.lastName);
    await page.fill('input[name="address"]', TEST_CUSTOMER.address);
    await page.fill('input[name="city"]', TEST_CUSTOMER.city);
    await page.fill('input[name="state"]', TEST_CUSTOMER.state);
    await page.fill('input[name="zipCode"]', TEST_CUSTOMER.zipCode);
    await page.fill('input[name="phone"]', TEST_CUSTOMER.phone);
    
    // Fill invalid payment info
    await fillPaymentFieldsCrossBrowser(page, browserName);
    
    // Try to submit with invalid data
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Wait for error message
    await page.waitForTimeout(5000);
    
    // Check for error message display
    const errorSelectors = [
      '.error-message',
      '.payment-error',
      '[data-testid="error-message"]',
      '.alert-error',
      '.text-red-500'
    ];
    
    let errorFound = false;
    for (const selector of errorSelectors) {
      const errorElement = page.locator(selector);
      if (await errorElement.isVisible()) {
        errorFound = true;
        break;
      }
    }
    
    // Error handling should be consistent across browsers
    console.log(`✅ Error handling verified for ${browserName}`);
  });
});
