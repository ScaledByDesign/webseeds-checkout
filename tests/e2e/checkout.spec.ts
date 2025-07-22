import { test, expect } from '@playwright/test';
import { Page } from '@playwright/test';

/**
 * E2E Test Suite for NMI-Konnective Checkout Integration
 * 
 * Tests the complete checkout funnel flow:
 * checkout → processing → upsell 1 → upsell 2 → thank you
 */

// Test data constants
const TEST_CUSTOMER = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '1234567890',
  address: '123 Test Street',
  city: 'Test City',
  state: 'CA',
  zipCode: '12345',
  country: 'US',
  nameOnCard: 'John Doe'
};

const TEST_PAYMENT = {
  cardNumber: '4111111111111111', // Test Visa card
  expiryMonth: '12',
  expiryYear: '2025',
  cvv: '123'
};

// Helper functions
class CheckoutPageHelper {
  constructor(private page: Page) {}

  async fillCustomerInformation() {
    await this.page.fill('input[name="firstName"]', TEST_CUSTOMER.firstName);
    await this.page.fill('input[name="lastName"]', TEST_CUSTOMER.lastName);
    await this.page.fill('input[name="email"]', TEST_CUSTOMER.email);
    await this.page.fill('input[name="phone"]', TEST_CUSTOMER.phone);
    await this.page.fill('input[name="address"]', TEST_CUSTOMER.address);
    await this.page.fill('input[name="city"]', TEST_CUSTOMER.city);
    await this.page.selectOption('select[name="state"]', TEST_CUSTOMER.state);
    await this.page.fill('input[name="zipCode"]', TEST_CUSTOMER.zipCode);
    await this.page.fill('input[name="nameOnCard"]', TEST_CUSTOMER.nameOnCard);
  }

  async fillPaymentInformation() {
    // Wait for CollectJS to load
    await this.page.waitForFunction(() => window.CollectJS != null, { timeout: 10000 });
    
    // Fill in payment details in CollectJS iframes
    const cardNumberFrame = this.page.frameLocator('[data-tokenization="ccnumber"] iframe');
    await cardNumberFrame.locator('input').fill(TEST_PAYMENT.cardNumber);
    
    const expiryFrame = this.page.frameLocator('[data-tokenization="ccexp"] iframe');
    await expiryFrame.locator('input').fill(`${TEST_PAYMENT.expiryMonth}${TEST_PAYMENT.expiryYear}`);
    
    const cvvFrame = this.page.frameLocator('[data-tokenization="cvv"] iframe');
    await cvvFrame.locator('input').fill(TEST_PAYMENT.cvv);
  }

  async submitCheckout() {
    await this.page.click('button[type="submit"]');
  }

  async waitForProcessingComplete() {
    // Wait for redirect to upsell page (or thank you if no upsells)
    await this.page.waitForURL(/\/(upsell\/1|thankyou)/, { timeout: 60000 });
  }
}

class UpsellPageHelper {
  constructor(private page: Page) {}

  async acceptUpsell() {
    // Look for "Yes, Add to Order" or similar button
    await this.page.click('button:has-text("Yes"), button:has-text("Add to Order"), button:has-text("Accept")');
  }

  async declineUpsell() {
    // Look for "No Thanks" or similar button  
    await this.page.click('button:has-text("No Thanks"), button:has-text("Skip"), button:has-text("Decline")');
  }

  async waitForNextStep() {
    // Wait for navigation to next step
    await this.page.waitForURL(/\/(upsell\/2|thankyou)/, { timeout: 30000 });
  }
}

test.describe('Checkout Flow - Complete Funnel', () => {
  test.beforeEach(async ({ page }) => {
    // Start at the checkout page
    await page.goto('/checkout');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the checkout page
    await expect(page).toHaveTitle(/checkout/i);
  });

  test('should complete full checkout with both upsells accepted', async ({ page }) => {
    const checkoutHelper = new CheckoutPageHelper(page);
    const upsellHelper = new UpsellPageHelper(page);

    // Step 1: Fill out checkout form
    await test.step('Fill customer information', async () => {
      await checkoutHelper.fillCustomerInformation();
    });

    await test.step('Fill payment information', async () => {
      await checkoutHelper.fillPaymentInformation();
    });

    // Step 2: Submit checkout
    await test.step('Submit checkout', async () => {
      await checkoutHelper.submitCheckout();
      
      // Should be redirected to processing page
      await expect(page).toHaveURL(/\/checkout\/processing/);
      
      // Wait for payment processing to complete
      await checkoutHelper.waitForProcessingComplete();
    });

    // Step 3: Handle first upsell
    await test.step('Accept first upsell', async () => {
      await expect(page).toHaveURL(/\/upsell\/1/);
      
      // Verify upsell content is visible
      await expect(page.locator('h1, h2')).toContainText(/upsell|special|offer/i);
      
      await upsellHelper.acceptUpsell();
      await upsellHelper.waitForNextStep();
    });

    // Step 4: Handle second upsell
    await test.step('Accept second upsell', async () => {
      await expect(page).toHaveURL(/\/upsell\/2/);
      
      // Verify second upsell content
      await expect(page.locator('h1, h2')).toContainText(/upsell|special|offer|final/i);
      
      await upsellHelper.acceptUpsell();
    });

    // Step 5: Verify thank you page
    await test.step('Verify completion', async () => {
      await page.waitForURL(/\/thankyou/, { timeout: 30000 });
      
      // Verify thank you page content
      await expect(page.locator('h1, h2')).toContainText(/thank|success|complete/i);
      
      // Verify order details are shown
      await expect(page.locator('body')).toContainText(/order|confirmation/i);
    });
  });

  test('should complete checkout with first upsell declined', async ({ page }) => {
    const checkoutHelper = new CheckoutPageHelper(page);
    const upsellHelper = new UpsellPageHelper(page);

    // Complete checkout
    await checkoutHelper.fillCustomerInformation();
    await checkoutHelper.fillPaymentInformation();
    await checkoutHelper.submitCheckout();
    
    await expect(page).toHaveURL(/\/checkout\/processing/);
    await checkoutHelper.waitForProcessingComplete();

    // Decline first upsell
    await test.step('Decline first upsell', async () => {
      await expect(page).toHaveURL(/\/upsell\/1/);
      await upsellHelper.declineUpsell();
      await upsellHelper.waitForNextStep();
    });

    // Should go to second upsell
    await test.step('Accept second upsell', async () => {
      await expect(page).toHaveURL(/\/upsell\/2/);
      await upsellHelper.acceptUpsell();
    });

    // Verify completion
    await page.waitForURL(/\/thankyou/, { timeout: 30000 });
    await expect(page.locator('h1, h2')).toContainText(/thank|success|complete/i);
  });

  test('should complete checkout with both upsells declined', async ({ page }) => {
    const checkoutHelper = new CheckoutPageHelper(page);
    const upsellHelper = new UpsellPageHelper(page);

    // Complete checkout
    await checkoutHelper.fillCustomerInformation();
    await checkoutHelper.fillPaymentInformation();
    await checkoutHelper.submitCheckout();
    
    await expect(page).toHaveURL(/\/checkout\/processing/);
    await checkoutHelper.waitForProcessingComplete();

    // Decline first upsell
    await expect(page).toHaveURL(/\/upsell\/1/);
    await upsellHelper.declineUpsell();
    await upsellHelper.waitForNextStep();

    // Decline second upsell
    await expect(page).toHaveURL(/\/upsell\/2/);
    await upsellHelper.declineUpsell();

    // Should go directly to thank you
    await page.waitForURL(/\/thankyou/, { timeout: 30000 });
    await expect(page.locator('h1, h2')).toContainText(/thank|success|complete/i);
  });
});

test.describe('Checkout Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
  });

  test('should show validation errors for empty required fields', async ({ page }) => {
    // Wait for CollectJS to load so the submit button is enabled
    await page.waitForFunction(() => window.CollectJS != null, { timeout: 15000 });
    
    // Fill just one field, then submit to trigger validation for missing fields
    await page.fill('input[name="email"]', 'test@example.com');
    
    // Try to submit form with missing required fields
    await page.click('button[type="submit"]:not([disabled])');
    
    // Check for validation messages (should appear as form errors)
    const validationErrors = page.locator('.text-red-500, [class*="error"], [class*="text-red"]');
    await expect(validationErrors.first()).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    // Wait for CollectJS to load
    await page.waitForFunction(() => window.CollectJS != null, { timeout: 15000 });
    
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]:not([disabled])');
    
    // Look for email validation error
    const emailError = page.locator('.text-red-500, [class*="error"]').filter({ hasText: /email/i });
    await expect(emailError.first()).toBeVisible();
  });

  test('should validate phone number format', async ({ page }) => {
    // Wait for CollectJS to load
    await page.waitForFunction(() => window.CollectJS != null, { timeout: 15000 });
    
    await page.fill('input[name="phone"]', '123');
    await page.fill('input[name="email"]', 'test@example.com'); // Add valid email to prevent other errors
    await page.click('button[type="submit"]:not([disabled])');
    
    // Look for phone validation error
    const phoneError = page.locator('.text-red-500, [class*="error"]').filter({ hasText: /phone/i });
    await expect(phoneError.first()).toBeVisible();
  });
});

test.describe('Payment Processing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
  });

  test('should handle payment failure gracefully', async ({ page }) => {
    const checkoutHelper = new CheckoutPageHelper(page);
    
    // Fill form with test data that will cause payment failure
    await checkoutHelper.fillCustomerInformation();
    
    // Use a card number that will be declined (test card)
    await page.waitForFunction(() => window.CollectJS != null);
    
    const cardNumberFrame = page.frameLocator('[data-tokenization="ccnumber"] iframe');
    await cardNumberFrame.locator('input').fill('4000000000000002'); // Test declined card
    
    const expiryFrame = page.frameLocator('[data-tokenization="ccexp"] iframe');
    await expiryFrame.locator('input').fill('1225');
    
    const cvvFrame = page.frameLocator('[data-tokenization="cvv"] iframe');
    await cvvFrame.locator('input').fill('123');
    
    // Submit and expect failure handling
    await checkoutHelper.submitCheckout();
    
    // Should stay on checkout page or go to processing then back to checkout with error
    await page.waitForTimeout(10000); // Wait for processing
    
    // Check if we're back on checkout with error or stayed with error
    const currentUrl = page.url();
    const hasError = currentUrl.includes('error=') || 
                    await page.locator('.error, [role="alert"], .text-red-500').isVisible();
    
    expect(hasError).toBeTruthy();
  });
});

test.describe('Mobile Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
  });

  test('should display correctly on mobile devices', async ({ page }) => {
    // Check that form is visible and usable
    const form = page.locator('form');
    await expect(form).toBeVisible();
    
    // Check that input fields are properly sized
    const firstNameInput = page.locator('input[name="firstName"]');
    await expect(firstNameInput).toBeVisible();
    
    // Verify form is responsive
    const formBounds = await form.boundingBox();
    expect(formBounds!.width).toBeLessThan(400); // Should fit in mobile viewport
  });

  test('should handle mobile scrolling during checkout', async ({ page }) => {
    const checkoutHelper = new CheckoutPageHelper(page);
    
    // Fill form (this will require scrolling on mobile)
    await checkoutHelper.fillCustomerInformation();
    
    // Scroll to payment section
    await page.locator('input[name="zip"]').scrollIntoViewIfNeeded();
    
    // Verify we can interact with payment fields
    await page.waitForFunction(() => window.CollectJS != null);
    
    const cardNumberFrame = page.frameLocator('[data-tokenization="ccnumber"] iframe');
    await expect(cardNumberFrame.locator('input')).toBeVisible();
  });
});

test.describe('Performance and Loading', () => {
  test('should load checkout page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should load CollectJS within acceptable time', async ({ page }) => {
    await page.goto('/checkout');
    
    const startTime = Date.now();
    
    // Wait for CollectJS to load
    await page.waitForFunction(() => window.CollectJS != null, { timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    
    // CollectJS should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });
});

test.describe('Security and Privacy', () => {
  test('should load with HTTPS in production', async ({ page }) => {
    // Skip this test in local development
    test.skip(process.env.NODE_ENV !== 'production', 'Only run in production environment');
    
    await page.goto('/checkout');
    
    // Verify HTTPS
    expect(page.url()).toMatch(/^https:/);
  });

  test('should have proper security headers', async ({ page }) => {
    const response = await page.goto('/checkout');
    const headers = response!.headers();
    
    // Check for security headers
    expect(headers['x-frame-options'] || headers['x-content-type-options']).toBeTruthy();
  });

  test('should not expose sensitive information in client', async ({ page }) => {
    await page.goto('/checkout');
    
    // Check that sensitive config is not exposed
    const pageContent = await page.content();
    
    // Should not contain actual API keys or secrets
    expect(pageContent).not.toContain(process.env.NMI_SECURITY_KEY || 'security_key');
    expect(pageContent).not.toContain('secret');
    expect(pageContent).not.toContain('password');
  });
});