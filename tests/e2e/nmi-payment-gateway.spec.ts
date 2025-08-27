import { test, expect } from '@playwright/test';
import { Page } from '@playwright/test';

/**
 * Comprehensive NMI Payment Gateway Test Suite
 * 
 * This test suite validates all aspects of NMI payment gateway integration:
 * - CollectJS loading and initialization
 * - Payment field iframe interactions
 * - Tokenization process validation
 * - Error handling scenarios
 * - Security and PCI compliance
 * - API response validation
 * - Cross-browser compatibility
 */

// Test data configurations
const TEST_CUSTOMERS = {
  valid: {
    email: 'nmi-test@webseed.com',
    firstName: 'John',
    lastName: 'Doe',
    address: '123 Test Street',
    city: 'Test City',
    state: 'CA',
    zipCode: '12345',
    country: 'US',
    phone: '1234567890'
  },
  international: {
    email: 'intl-test@webseed.com',
    firstName: 'Maria',
    lastName: 'Garcia',
    address: '456 International Ave',
    city: 'Toronto',
    state: 'ON',
    zipCode: 'M5V 3A8',
    country: 'CA',
    phone: '4161234567'
  }
};

const TEST_PAYMENT_METHODS = {
  visa: {
    cardNumber: '4111111111111111',
    expiryMonth: '12',
    expiryYear: '25',
    cvv: '123',
    type: 'Visa'
  },
  mastercard: {
    cardNumber: '5555555555554444',
    expiryMonth: '12',
    expiryYear: '25',
    cvv: '123',
    type: 'Mastercard'
  },
  amex: {
    cardNumber: '378282246310005',
    expiryMonth: '12',
    expiryYear: '25',
    cvv: '1234',
    type: 'American Express'
  },
  discover: {
    cardNumber: '6011111111111117',
    expiryMonth: '12',
    expiryYear: '25',
    cvv: '123',
    type: 'Discover'
  },
  // Error scenarios
  invalid: {
    cardNumber: '4111111111111112', // Invalid Luhn check
    expiryMonth: '12',
    expiryYear: '25',
    cvv: '123',
    type: 'Invalid'
  },
  expired: {
    cardNumber: '4111111111111111',
    expiryMonth: '01',
    expiryYear: '20', // Expired
    cvv: '123',
    type: 'Expired'
  },
  declined: {
    cardNumber: '4000000000000002', // NMI test card for declined transactions
    expiryMonth: '12',
    expiryYear: '25',
    cvv: '123',
    type: 'Declined'
  }
};

// Helper class for NMI Payment Gateway testing
class NMIPaymentGatewayHelper {
  constructor(private page: Page) {}

  /**
   * Navigate to checkout page and wait for initial load
   */
  async navigateToCheckout() {
    console.log('🚀 Navigating to checkout page...');
    await this.page.goto('/checkout');
    await this.page.waitForLoadState('networkidle');
    
    // Verify checkout page loaded
    await expect(this.page.locator('input[name="email"]')).toBeVisible();
    console.log('✅ Checkout page loaded successfully');
  }

  /**
   * Wait for CollectJS to load and initialize
   */
  async waitForCollectJSInitialization() {
    console.log('⏳ Waiting for CollectJS initialization...');
    
    // Wait for CollectJS script to load
    await this.page.waitForFunction(() => window.CollectJS != null, { timeout: 30000 });
    console.log('✅ CollectJS script loaded');
    
    // Wait for fields to be available
    await this.page.waitForTimeout(3000);
    
    // Verify payment field containers exist
    await expect(this.page.locator('#card-number-field')).toBeVisible();
    await expect(this.page.locator('#card-expiry-field')).toBeVisible();
    await expect(this.page.locator('#card-cvv-field')).toBeVisible();
    
    console.log('✅ CollectJS payment fields initialized');
  }

  /**
   * Fill customer information form
   */
  async fillCustomerInfo(customer = TEST_CUSTOMERS.valid) {
    console.log('📝 Filling customer information...');
    
    await this.page.fill('input[name="email"]', customer.email);
    await this.page.fill('input[name="firstName"]', customer.firstName);
    await this.page.fill('input[name="lastName"]', customer.lastName);
    await this.page.fill('input[name="address"]', customer.address);
    await this.page.fill('input[name="city"]', customer.city);
    await this.page.fill('input[name="state"]', customer.state);
    await this.page.fill('input[name="zipCode"]', customer.zipCode);
    await this.page.fill('input[name="phone"]', customer.phone);
    
    console.log('✅ Customer information filled');
  }

  /**
   * Fill payment information in CollectJS iframes
   */
  async fillPaymentInfo(paymentMethod = TEST_PAYMENT_METHODS.visa) {
    console.log(`💳 Filling payment information (${paymentMethod.type})...`);
    
    try {
      // Fill card number
      const cardFrame = this.page.frameLocator('#card-number-field iframe');
      await cardFrame.locator('input[name="ccnumber"]').fill(paymentMethod.cardNumber);
      
      // Fill expiry date
      const expiryFrame = this.page.frameLocator('#card-expiry-field iframe');
      await expiryFrame.locator('input[name="ccexp"]').fill(`${paymentMethod.expiryMonth}${paymentMethod.expiryYear}`);
      
      // Fill CVV
      const cvvFrame = this.page.frameLocator('#card-cvv-field iframe');
      await cvvFrame.locator('input[name="cvv"]').fill(paymentMethod.cvv);
      
      console.log('✅ Payment information filled successfully');
    } catch (error) {
      console.log('⚠️ Trying alternative iframe selectors...');
      
      // Alternative iframe selectors for different implementations
      try {
        const cardFrame = this.page.frameLocator('[data-field="ccnumber"] iframe').first();
        await cardFrame.locator('input').fill(paymentMethod.cardNumber);
        
        const expiryFrame = this.page.frameLocator('[data-field="ccexp"] iframe').first();
        await expiryFrame.locator('input').fill(`${paymentMethod.expiryMonth}${paymentMethod.expiryYear}`);
        
        const cvvFrame = this.page.frameLocator('[data-field="cvv"] iframe').first();
        await cvvFrame.locator('input').fill(paymentMethod.cvv);
        
        console.log('✅ Payment information filled with alternative selectors');
      } catch (altError) {
        console.error('❌ Failed to fill payment fields with any method');
        throw altError;
      }
    }
  }

  /**
   * Submit checkout form and monitor tokenization
   */
  async submitCheckoutAndMonitorTokenization() {
    console.log('🚀 Submitting checkout form...');
    
    // Set up response monitoring
    const apiResponses: any[] = [];
    this.page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/checkout/process') || url.includes('nmi.com')) {
        apiResponses.push({
          url,
          status: response.status(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Submit the form
    const submitButton = this.page.locator('button[type="submit"]:not([disabled])');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    
    return apiResponses;
  }

  /**
   * Verify successful payment processing
   */
  async verifyPaymentSuccess() {
    console.log('⏳ Verifying payment processing...');
    
    // Wait for redirect to success page or upsell
    await this.page.waitForURL(/\/(upsell|success|thank-you)/, { timeout: 60000 });
    
    const currentUrl = this.page.url();
    console.log(`✅ Payment processed successfully - redirected to: ${currentUrl}`);
    
    return currentUrl;
  }

  /**
   * Verify payment error handling
   */
  async verifyPaymentError(expectedErrorPattern?: string) {
    console.log('🔍 Verifying payment error handling...');
    
    // Wait for error message to appear
    await this.page.waitForTimeout(5000);
    
    // Check for error messages in various locations
    const errorSelectors = [
      '.error-message',
      '.payment-error',
      '[data-testid="error-message"]',
      '.alert-error',
      '.text-red-500',
      '.text-red-600'
    ];
    
    let errorFound = false;
    let errorMessage = '';
    
    for (const selector of errorSelectors) {
      const errorElement = this.page.locator(selector);
      if (await errorElement.isVisible()) {
        errorMessage = await errorElement.textContent() || '';
        errorFound = true;
        break;
      }
    }
    
    if (expectedErrorPattern && errorFound) {
      expect(errorMessage).toMatch(new RegExp(expectedErrorPattern, 'i'));
      console.log(`✅ Expected error message found: ${errorMessage}`);
    } else if (errorFound) {
      console.log(`⚠️ Error message displayed: ${errorMessage}`);
    } else {
      console.log('❌ No error message found');
    }
    
    return { errorFound, errorMessage };
  }

  /**
   * Monitor console for CollectJS events
   */
  async monitorCollectJSEvents() {
    const events: string[] = [];
    
    this.page.on('console', msg => {
      const text = msg.text();
      if (text.includes('CollectJS') || text.includes('tokenization') || text.includes('payment')) {
        events.push(`[${msg.type()}] ${text}`);
      }
    });
    
    return events;
  }

  /**
   * Verify iframe security attributes
   */
  async verifyIframeSecurity() {
    console.log('🔒 Verifying iframe security attributes...');
    
    const iframes = await this.page.locator('iframe').all();
    const securityChecks = [];
    
    for (const iframe of iframes) {
      const src = await iframe.getAttribute('src');
      const sandbox = await iframe.getAttribute('sandbox');
      
      securityChecks.push({
        src,
        sandbox,
        isSecure: src?.startsWith('https://') || false,
        hasSandbox: sandbox !== null
      });
    }
    
    console.log('✅ Iframe security analysis completed');
    return securityChecks;
  }
}

// Test suite begins
test.describe('NMI Payment Gateway Integration', () => {
  let helper: NMIPaymentGatewayHelper;

  test.beforeEach(async ({ page }) => {
    helper = new NMIPaymentGatewayHelper(page);
    await helper.navigateToCheckout();
  });

  test.describe('CollectJS Initialization', () => {
    test('should load CollectJS script without errors', async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await helper.waitForCollectJSInitialization();

      // Verify no critical errors
      const criticalErrors = consoleErrors.filter(error =>
        error.includes('CollectJS') ||
        error.includes('tokenization') ||
        error.includes('payment')
      );

      expect(criticalErrors.length).toBe(0);
    });

    test('should initialize payment field iframes', async ({ page }) => {
      await helper.waitForCollectJSInitialization();

      // Verify all payment field iframes are present
      const cardIframe = page.frameLocator('#card-number-field iframe');
      const expiryIframe = page.frameLocator('#card-expiry-field iframe');
      const cvvIframe = page.frameLocator('#card-cvv-field iframe');

      await expect(cardIframe.locator('input')).toBeVisible();
      await expect(expiryIframe.locator('input')).toBeVisible();
      await expect(cvvIframe.locator('input')).toBeVisible();
    });

    test('should verify iframe security attributes', async ({ page }) => {
      await helper.waitForCollectJSInitialization();

      const securityChecks = await helper.verifyIframeSecurity();

      // All payment iframes should use HTTPS
      const paymentIframes = securityChecks.filter(check =>
        check.src?.includes('nmi.com') || check.src?.includes('secure')
      );

      paymentIframes.forEach(iframe => {
        expect(iframe.isSecure).toBe(true);
      });
    });
  });

  test.describe('Payment Processing - Valid Cards', () => {
    test('should process Visa payment successfully', async ({ page }) => {
      await helper.waitForCollectJSInitialization();
      await helper.fillCustomerInfo();
      await helper.fillPaymentInfo(TEST_PAYMENT_METHODS.visa);

      const apiResponses = await helper.submitCheckoutAndMonitorTokenization();
      const successUrl = await helper.verifyPaymentSuccess();

      expect(successUrl).toMatch(/\/(upsell|success|thank-you)/);
      expect(apiResponses.length).toBeGreaterThan(0);
    });

    test('should process Mastercard payment successfully', async ({ page }) => {
      await helper.waitForCollectJSInitialization();
      await helper.fillCustomerInfo();
      await helper.fillPaymentInfo(TEST_PAYMENT_METHODS.mastercard);

      const apiResponses = await helper.submitCheckoutAndMonitorTokenization();
      const successUrl = await helper.verifyPaymentSuccess();

      expect(successUrl).toMatch(/\/(upsell|success|thank-you)/);
    });

    test('should process American Express payment successfully', async ({ page }) => {
      await helper.waitForCollectJSInitialization();
      await helper.fillCustomerInfo();
      await helper.fillPaymentInfo(TEST_PAYMENT_METHODS.amex);

      const apiResponses = await helper.submitCheckoutAndMonitorTokenization();
      const successUrl = await helper.verifyPaymentSuccess();

      expect(successUrl).toMatch(/\/(upsell|success|thank-you)/);
    });

    test('should process Discover payment successfully', async ({ page }) => {
      await helper.waitForCollectJSInitialization();
      await helper.fillCustomerInfo();
      await helper.fillPaymentInfo(TEST_PAYMENT_METHODS.discover);

      const apiResponses = await helper.submitCheckoutAndMonitorTokenization();
      const successUrl = await helper.verifyPaymentSuccess();

      expect(successUrl).toMatch(/\/(upsell|success|thank-you)/);
    });
  });

  test.describe('Payment Processing - Error Scenarios', () => {
    test('should handle invalid card number gracefully', async ({ page }) => {
      await helper.waitForCollectJSInitialization();
      await helper.fillCustomerInfo();
      await helper.fillPaymentInfo(TEST_PAYMENT_METHODS.invalid);

      await helper.submitCheckoutAndMonitorTokenization();
      const errorResult = await helper.verifyPaymentError('invalid|declined|error');

      expect(errorResult.errorFound).toBe(true);
    });

    test('should handle expired card gracefully', async ({ page }) => {
      await helper.waitForCollectJSInitialization();
      await helper.fillCustomerInfo();
      await helper.fillPaymentInfo(TEST_PAYMENT_METHODS.expired);

      await helper.submitCheckoutAndMonitorTokenization();
      const errorResult = await helper.verifyPaymentError('expired|invalid');

      expect(errorResult.errorFound).toBe(true);
    });

    test('should handle declined card gracefully', async ({ page }) => {
      await helper.waitForCollectJSInitialization();
      await helper.fillCustomerInfo();
      await helper.fillPaymentInfo(TEST_PAYMENT_METHODS.declined);

      await helper.submitCheckoutAndMonitorTokenization();
      const errorResult = await helper.verifyPaymentError('declined|failed');

      expect(errorResult.errorFound).toBe(true);
    });
  });

  test.describe('Tokenization Process', () => {
    test('should generate payment token for valid card', async ({ page }) => {
      const events = await helper.monitorCollectJSEvents();

      await helper.waitForCollectJSInitialization();
      await helper.fillCustomerInfo();
      await helper.fillPaymentInfo(TEST_PAYMENT_METHODS.visa);

      await helper.submitCheckoutAndMonitorTokenization();

      // Wait for tokenization events
      await page.waitForTimeout(5000);

      const tokenEvents = events.filter(event =>
        event.includes('token') || event.includes('Token')
      );

      expect(tokenEvents.length).toBeGreaterThan(0);
    });

    test('should handle tokenization timeout', async ({ page }) => {
      await helper.waitForCollectJSInitialization();
      await helper.fillCustomerInfo();

      // Don't fill payment info to trigger timeout
      await helper.submitCheckoutAndMonitorTokenization();

      const errorResult = await helper.verifyPaymentError('timeout|incomplete');
      expect(errorResult.errorFound).toBe(true);
    });
  });

  test.describe('API Integration', () => {
    test('should make correct API calls during payment processing', async ({ page }) => {
      const apiCalls: any[] = [];

      page.on('request', request => {
        const url = request.url();
        if (url.includes('/api/checkout/process')) {
          apiCalls.push({
            url,
            method: request.method(),
            headers: request.headers(),
            timestamp: new Date().toISOString()
          });
        }
      });

      await helper.waitForCollectJSInitialization();
      await helper.fillCustomerInfo();
      await helper.fillPaymentInfo(TEST_PAYMENT_METHODS.visa);

      await helper.submitCheckoutAndMonitorTokenization();
      await helper.verifyPaymentSuccess();

      expect(apiCalls.length).toBeGreaterThan(0);
      expect(apiCalls[0].method).toBe('POST');
      expect(apiCalls[0].url).toContain('/api/checkout/process');
    });

    test('should include proper headers in API requests', async ({ page }) => {
      const apiRequests: any[] = [];

      page.on('request', request => {
        if (request.url().includes('/api/checkout/process')) {
          apiRequests.push({
            headers: request.headers(),
            postData: request.postData()
          });
        }
      });

      await helper.waitForCollectJSInitialization();
      await helper.fillCustomerInfo();
      await helper.fillPaymentInfo(TEST_PAYMENT_METHODS.visa);

      await helper.submitCheckoutAndMonitorTokenization();
      await helper.verifyPaymentSuccess();

      expect(apiRequests.length).toBeGreaterThan(0);
      expect(apiRequests[0].headers['content-type']).toContain('application/json');
    });
  });
});
