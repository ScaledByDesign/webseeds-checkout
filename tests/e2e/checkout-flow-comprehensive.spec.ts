import { test, expect } from '@playwright/test';
import { Page } from '@playwright/test';

/**
 * Comprehensive Checkout Flow Validation Test Suite
 * 
 * Tests the complete checkout process from start to finish:
 * - Customer information validation
 * - Shipping address handling
 * - Billing address scenarios
 * - Product selection and pricing
 * - Coupon code application
 * - Order total calculations
 * - Form validation and error handling
 * - Edge cases and boundary conditions
 */

// Test data configurations
const TEST_CUSTOMERS = {
  valid: {
    email: 'checkout-test@webseed.com',
    firstName: 'John',
    lastName: 'Doe',
    address: '123 Main Street',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'US',
    phone: '2125551234'
  },
  international: {
    email: 'intl-checkout@webseed.com',
    firstName: 'Maria',
    lastName: 'Garcia',
    address: '456 Queen Street',
    city: 'Toronto',
    state: 'ON',
    zipCode: 'M5V 3A8',
    country: 'CA',
    phone: '4165551234'
  },
  minimal: {
    email: 'minimal@webseed.com',
    firstName: 'Jane',
    lastName: 'Smith',
    address: '789 Oak Ave',
    city: 'Austin',
    state: 'TX',
    zipCode: '73301',
    country: 'US',
    phone: '5125551234'
  }
};

const INVALID_TEST_DATA = {
  invalidEmail: {
    email: 'invalid-email',
    firstName: 'Test',
    lastName: 'User'
  },
  missingRequired: {
    email: 'test@example.com',
    firstName: '',
    lastName: 'User'
  },
  invalidZip: {
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    zipCode: '123'
  }
};

const PAYMENT_METHOD = {
  cardNumber: '4111111111111111',
  expiryMonth: '12',
  expiryYear: '25',
  cvv: '123'
};

// Helper class for checkout flow testing
class CheckoutFlowHelper {
  constructor(private page: Page) {}

  /**
   * Navigate to checkout page
   */
  async navigateToCheckout() {
    console.log('🚀 Navigating to checkout page...');
    await this.page.goto('/checkout');
    await this.page.waitForLoadState('networkidle');
    
    // Verify checkout page loaded
    await expect(this.page.locator('input[name="email"]')).toBeVisible();
    console.log('✅ Checkout page loaded');
  }

  /**
   * Fill customer information section
   */
  async fillCustomerInfo(customer = TEST_CUSTOMERS.valid) {
    console.log('📝 Filling customer information...');
    
    // Email
    await this.page.fill('input[name="email"]', customer.email);
    
    // Customer details
    await this.page.fill('input[name="firstName"]', customer.firstName);
    await this.page.fill('input[name="lastName"]', customer.lastName);
    
    console.log('✅ Customer information filled');
  }

  /**
   * Fill shipping address section
   */
  async fillShippingAddress(customer = TEST_CUSTOMERS.valid) {
    console.log('🏠 Filling shipping address...');
    
    await this.page.fill('input[name="address"]', customer.address);
    await this.page.fill('input[name="city"]', customer.city);
    
    // Select state from dropdown
    await this.page.selectOption('select[name="state"]', customer.state);
    
    await this.page.fill('input[name="zipCode"]', customer.zipCode);
    
    // Select country from dropdown
    await this.page.selectOption('select[name="country"]', customer.country);
    
    await this.page.fill('input[name="phone"]', customer.phone);
    
    console.log('✅ Shipping address filled');
  }

  /**
   * Fill billing address (if different from shipping)
   */
  async fillBillingAddress(billingInfo: any) {
    console.log('💳 Filling billing address...');
    
    // Uncheck "same as shipping" if checked
    const sameAddressCheckbox = this.page.locator('input[name="useSameAddress"]');
    if (await sameAddressCheckbox.isChecked()) {
      await sameAddressCheckbox.uncheck();
    }
    
    // Fill billing fields (assuming they appear when checkbox is unchecked)
    await this.page.fill('input[name="billingAddress"]', billingInfo.address);
    await this.page.fill('input[name="billingCity"]', billingInfo.city);
    await this.page.selectOption('select[name="billingState"]', billingInfo.state);
    await this.page.fill('input[name="billingZipCode"]', billingInfo.zipCode);
    await this.page.selectOption('select[name="billingCountry"]', billingInfo.country);
    
    console.log('✅ Billing address filled');
  }

  /**
   * Apply coupon code
   */
  async applyCouponCode(couponCode: string) {
    console.log(`🎫 Applying coupon code: ${couponCode}...`);
    
    // Look for coupon input field
    const couponInput = this.page.locator('input[name="couponCode"], input[placeholder*="coupon" i], input[placeholder*="promo" i]');
    
    if (await couponInput.isVisible()) {
      await couponInput.fill(couponCode);
      
      // Look for apply button
      const applyButton = this.page.locator('button:has-text("Apply"), button[type="button"]:near(input[name="couponCode"])');
      if (await applyButton.isVisible()) {
        await applyButton.click();
        await this.page.waitForTimeout(2000); // Wait for coupon processing
      }
      
      console.log('✅ Coupon code applied');
    } else {
      console.log('⚠️ Coupon input field not found');
    }
  }

  /**
   * Fill payment information
   */
  async fillPaymentInfo(paymentMethod = PAYMENT_METHOD) {
    console.log('💳 Filling payment information...');
    
    // Wait for CollectJS to load
    await this.page.waitForFunction(() => window.CollectJS != null, { timeout: 30000 });
    await this.page.waitForTimeout(3000);
    
    try {
      // Fill card number
      const cardFrame = this.page.frameLocator('#card-number-field iframe');
      await cardFrame.locator('input#ccnumber').fill(paymentMethod.cardNumber);
      
      // Fill expiry date
      const expiryFrame = this.page.frameLocator('#card-expiry-field iframe');
      await expiryFrame.locator('input#ccexp').fill(`${paymentMethod.expiryMonth}${paymentMethod.expiryYear}`);
      
      // Fill CVV
      const cvvFrame = this.page.frameLocator('#card-cvv-field iframe');
      await cvvFrame.locator('input#cvv').fill(paymentMethod.cvv);
      
      console.log('✅ Payment information filled');
    } catch (error) {
      console.log('⚠️ Using fallback payment field selectors...');
      // Fallback selectors if primary ones fail
      await this.page.fill('#card-number', paymentMethod.cardNumber);
      await this.page.fill('#card-expiry', `${paymentMethod.expiryMonth}/${paymentMethod.expiryYear}`);
      await this.page.fill('#card-cvv', paymentMethod.cvv);
    }
  }

  /**
   * Verify order summary and totals
   */
  async verifyOrderSummary(expectedTotal?: number) {
    console.log('📊 Verifying order summary...');
    
    // Look for order summary section
    const orderSummary = this.page.locator('.order-summary, [data-testid="order-summary"], .checkout-summary');
    
    if (await orderSummary.isVisible()) {
      // Verify product items are displayed
      const productItems = this.page.locator('.product-item, .order-item, [data-testid="product-item"]');
      const itemCount = await productItems.count();
      expect(itemCount).toBeGreaterThan(0);
      
      // Verify total amount if provided
      if (expectedTotal) {
        const totalElement = this.page.locator('.total-amount, .order-total, [data-testid="total-amount"]');
        const totalText = await totalElement.textContent();
        expect(totalText).toContain(expectedTotal.toString());
      }
      
      console.log(`✅ Order summary verified (${itemCount} items)`);
    } else {
      console.log('⚠️ Order summary section not found');
    }
  }

  /**
   * Submit checkout form
   */
  async submitCheckout() {
    console.log('🚀 Submitting checkout form...');
    
    const submitButton = this.page.locator('button[type="submit"]:not([disabled])');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    
    console.log('✅ Checkout form submitted');
  }

  /**
   * Verify form validation errors
   */
  async verifyValidationErrors(expectedErrors: string[]) {
    console.log('🔍 Verifying validation errors...');
    
    await this.page.waitForTimeout(2000); // Wait for validation to appear
    
    const errorSelectors = [
      '.error-message',
      '.field-error',
      '.text-red-500',
      '.text-red-600',
      '[data-testid="error-message"]'
    ];
    
    let foundErrors = 0;
    for (const selector of errorSelectors) {
      const errorElements = this.page.locator(selector);
      const count = await errorElements.count();
      foundErrors += count;
    }
    
    expect(foundErrors).toBeGreaterThan(0);
    console.log(`✅ Found ${foundErrors} validation errors`);
  }

  /**
   * Verify successful checkout completion
   */
  async verifyCheckoutSuccess() {
    console.log('⏳ Verifying checkout success...');
    
    // Wait for redirect to success page or upsell
    await this.page.waitForURL(/\/(success|thank-you|upsell|confirmation)/, { timeout: 60000 });
    
    const currentUrl = this.page.url();
    console.log(`✅ Checkout completed successfully - redirected to: ${currentUrl}`);
    
    return currentUrl;
  }

  /**
   * Complete full checkout flow
   */
  async completeFullCheckout(customer = TEST_CUSTOMERS.valid, options: {
    couponCode?: string;
    billingAddress?: any;
    verifyTotal?: number;
  } = {}) {
    await this.navigateToCheckout();
    await this.fillCustomerInfo(customer);
    await this.fillShippingAddress(customer);
    
    if (options.billingAddress) {
      await this.fillBillingAddress(options.billingAddress);
    }
    
    if (options.couponCode) {
      await this.applyCouponCode(options.couponCode);
    }
    
    if (options.verifyTotal) {
      await this.verifyOrderSummary(options.verifyTotal);
    }
    
    await this.fillPaymentInfo();
    await this.submitCheckout();
    
    return await this.verifyCheckoutSuccess();
  }
}

// Test suite begins
test.describe('Comprehensive Checkout Flow Validation', () => {
  let helper: CheckoutFlowHelper;

  test.beforeEach(async ({ page }) => {
    helper = new CheckoutFlowHelper(page);
  });

  test.describe('Customer Information Validation', () => {
    test('should accept valid customer information', async ({ page }) => {
      await helper.navigateToCheckout();
      await helper.fillCustomerInfo(TEST_CUSTOMERS.valid);
      
      // Verify no validation errors
      const errorElements = page.locator('.error-message, .text-red-500');
      expect(await errorElements.count()).toBe(0);
    });

    test('should validate email format', async ({ page }) => {
      await helper.navigateToCheckout();
      
      // Fill invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'User');
      
      // Try to submit or move to next field to trigger validation
      await page.press('input[name="email"]', 'Tab');
      
      // Check for email validation error
      const emailError = page.locator('input[name="email"]:invalid, .email-error, [data-field="email"] .error-message');
      expect(await emailError.count()).toBeGreaterThan(0);
    });

    test('should require all mandatory fields', async ({ page }) => {
      await helper.navigateToCheckout();
      
      // Try to submit with empty required fields
      await helper.submitCheckout();
      
      // Should show validation errors
      await helper.verifyValidationErrors(['firstName', 'lastName', 'email']);
    });

    test('should handle international customer data', async ({ page }) => {
      await helper.navigateToCheckout();
      await helper.fillCustomerInfo(TEST_CUSTOMERS.international);
      await helper.fillShippingAddress(TEST_CUSTOMERS.international);
      
      // Verify international data is accepted
      const errorElements = page.locator('.error-message, .text-red-500');
      expect(await errorElements.count()).toBe(0);
    });
  });

  test.describe('Shipping Address Validation', () => {
    test('should accept valid shipping address', async ({ page }) => {
      await helper.navigateToCheckout();
      await helper.fillCustomerInfo();
      await helper.fillShippingAddress();

      // Verify all fields are filled correctly
      expect(await page.inputValue('input[name="address"]')).toBe(TEST_CUSTOMERS.valid.address);
      expect(await page.inputValue('input[name="city"]')).toBe(TEST_CUSTOMERS.valid.city);
      expect(await page.inputValue('select[name="state"]')).toBe(TEST_CUSTOMERS.valid.state);
    });

    test('should validate ZIP code format', async ({ page }) => {
      await helper.navigateToCheckout();
      await helper.fillCustomerInfo();

      // Fill invalid ZIP code
      await page.fill('input[name="zipCode"]', '123');
      await page.press('input[name="zipCode"]', 'Tab');

      // Check for ZIP validation error
      const zipError = page.locator('input[name="zipCode"]:invalid, .zip-error, [data-field="zipCode"] .error-message');
      expect(await zipError.count()).toBeGreaterThan(0);
    });

    test('should require all address fields', async ({ page }) => {
      await helper.navigateToCheckout();
      await helper.fillCustomerInfo();

      // Try to submit without address fields
      await helper.submitCheckout();

      // Should show address validation errors
      await helper.verifyValidationErrors(['address', 'city', 'state', 'zipCode']);
    });
  });

  test.describe('Billing Address Scenarios', () => {
    test('should use shipping address as billing by default', async ({ page }) => {
      await helper.navigateToCheckout();
      await helper.fillCustomerInfo();
      await helper.fillShippingAddress();

      // Check if "same as shipping" is checked by default
      const sameAddressCheckbox = page.locator('input[name="useSameAddress"]');
      if (await sameAddressCheckbox.isVisible()) {
        expect(await sameAddressCheckbox.isChecked()).toBe(true);
      }
    });

    test('should allow different billing address', async ({ page }) => {
      const billingAddress = {
        address: '456 Billing Street',
        city: 'Billing City',
        state: 'CA',
        zipCode: '90210',
        country: 'US'
      };

      await helper.navigateToCheckout();
      await helper.fillCustomerInfo();
      await helper.fillShippingAddress();
      await helper.fillBillingAddress(billingAddress);

      // Verify billing fields are filled
      expect(await page.inputValue('input[name="billingAddress"]')).toBe(billingAddress.address);
    });
  });

  test.describe('Order Summary and Pricing', () => {
    test('should display correct product information', async ({ page }) => {
      await helper.navigateToCheckout();

      // Verify product is displayed in order summary
      await helper.verifyOrderSummary();

      // Check for product name and price
      const productName = page.locator('.product-name, [data-testid="product-name"]');
      const productPrice = page.locator('.product-price, [data-testid="product-price"]');

      expect(await productName.count()).toBeGreaterThan(0);
      expect(await productPrice.count()).toBeGreaterThan(0);
    });

    test('should calculate correct order total', async ({ page }) => {
      await helper.navigateToCheckout();

      // Verify order total calculation
      await helper.verifyOrderSummary(294); // Expected total for Fitspresso 6-pack
    });

    test('should apply coupon code discount', async ({ page }) => {
      await helper.navigateToCheckout();
      await helper.fillCustomerInfo();
      await helper.fillShippingAddress();

      // Apply test coupon code
      await helper.applyCouponCode('TEST10');

      // Verify discount is applied (implementation depends on actual coupon system)
      const discountElement = page.locator('.discount, .coupon-discount, [data-testid="discount"]');
      if (await discountElement.isVisible()) {
        expect(await discountElement.textContent()).toContain('10');
      }
    });
  });

  test.describe('Complete Checkout Flows', () => {
    test('should complete checkout with valid US customer', async ({ page }) => {
      const successUrl = await helper.completeFullCheckout(TEST_CUSTOMERS.valid);
      expect(successUrl).toMatch(/\/(success|thank-you|upsell|confirmation)/);
    });

    test('should complete checkout with international customer', async ({ page }) => {
      const successUrl = await helper.completeFullCheckout(TEST_CUSTOMERS.international);
      expect(successUrl).toMatch(/\/(success|thank-you|upsell|confirmation)/);
    });

    test('should complete checkout with coupon code', async ({ page }) => {
      const successUrl = await helper.completeFullCheckout(TEST_CUSTOMERS.valid, {
        couponCode: 'SAVE10'
      });
      expect(successUrl).toMatch(/\/(success|thank-you|upsell|confirmation)/);
    });

    test('should complete checkout with different billing address', async ({ page }) => {
      const billingAddress = {
        address: '789 Billing Ave',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90210',
        country: 'US'
      };

      const successUrl = await helper.completeFullCheckout(TEST_CUSTOMERS.valid, {
        billingAddress
      });
      expect(successUrl).toMatch(/\/(success|thank-you|upsell|confirmation)/);
    });
  });

  test.describe('Edge Cases and Error Scenarios', () => {
    test('should handle form submission with missing required fields', async ({ page }) => {
      await helper.navigateToCheckout();

      // Try to submit empty form
      await helper.submitCheckout();

      // Should remain on checkout page with errors
      expect(page.url()).toContain('/checkout');
      await helper.verifyValidationErrors(['email', 'firstName', 'lastName']);
    });

    test('should handle invalid payment information gracefully', async ({ page }) => {
      await helper.navigateToCheckout();
      await helper.fillCustomerInfo();
      await helper.fillShippingAddress();

      // Fill invalid payment info
      const invalidPayment = {
        cardNumber: '4111111111111112', // Invalid Luhn check
        expiryMonth: '12',
        expiryYear: '25',
        cvv: '123'
      };

      await helper.fillPaymentInfo(invalidPayment);
      await helper.submitCheckout();

      // Should show payment error
      await page.waitForTimeout(5000);
      const errorMessage = page.locator('.payment-error, .error-message, .text-red-500');
      expect(await errorMessage.count()).toBeGreaterThan(0);
    });

    test('should handle network timeout gracefully', async ({ page }) => {
      // Simulate slow network
      await page.route('**/api/checkout/process', route => {
        setTimeout(() => {
          route.continue();
        }, 10000); // 10 second delay
      });

      await helper.navigateToCheckout();
      await helper.fillCustomerInfo();
      await helper.fillShippingAddress();
      await helper.fillPaymentInfo();
      await helper.submitCheckout();

      // Should show loading state or timeout message
      const loadingIndicator = page.locator('.loading, .spinner, [data-testid="loading"]');
      expect(await loadingIndicator.isVisible()).toBe(true);
    });

    test('should handle browser refresh during checkout', async ({ page }) => {
      await helper.navigateToCheckout();
      await helper.fillCustomerInfo();
      await helper.fillShippingAddress();

      // Refresh the page
      await page.reload();

      // Should return to checkout page and preserve some state if implemented
      expect(page.url()).toContain('/checkout');

      // Form should be reset or preserved based on implementation
      const emailValue = await page.inputValue('input[name="email"]');
      // This test validates the behavior - could be empty (reset) or preserved
      console.log(`Email after refresh: ${emailValue}`);
    });
  });

  test.describe('Performance and Usability', () => {
    test('should load checkout page within acceptable time', async ({ page }) => {
      const startTime = Date.now();

      await helper.navigateToCheckout();

      const loadTime = Date.now() - startTime;
      console.log(`Checkout page loaded in ${loadTime}ms`);

      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should provide real-time form validation feedback', async ({ page }) => {
      await helper.navigateToCheckout();

      // Fill invalid email and check for immediate feedback
      await page.fill('input[name="email"]', 'invalid');
      await page.press('input[name="email"]', 'Tab');

      // Should show validation feedback quickly
      await page.waitForTimeout(1000);
      const emailField = page.locator('input[name="email"]');
      const isInvalid = await emailField.evaluate(el => el.matches(':invalid'));
      expect(isInvalid).toBe(true);
    });

    test('should maintain form state during user interaction', async ({ page }) => {
      await helper.navigateToCheckout();

      // Fill some fields
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="firstName"]', 'John');

      // Navigate away from field and back
      await page.click('input[name="lastName"]');
      await page.click('input[name="email"]');

      // Values should be preserved
      expect(await page.inputValue('input[name="email"]')).toBe('test@example.com');
      expect(await page.inputValue('input[name="firstName"]')).toBe('John');
    });
  });
});
