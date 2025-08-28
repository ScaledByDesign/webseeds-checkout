import { test, expect } from '@playwright/test';
import { Page } from '@playwright/test';

/**
 * Complete E2E Flow Tests
 * Tests the entire checkout funnel with real payment processing:
 * checkout → processing → upsell 1 → upsell 2 → thank you
 * 
 * Tests all combinations:
 * 1. Yes + Yes (accept both upsells)
 * 2. Yes + No (accept first, decline second)
 * 3. No + No (decline both)
 * 4. No + Yes (decline first, accept second)
 */

// Test customer data
const TEST_CUSTOMER = {
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  address: '123 Test Street',
  city: 'Test City', 
  state: 'CA',
  zipCode: '12345',
  phone: '1234567890',
  nameOnCard: 'John Doe'
};

// Test payment data (using NMI test card)
const TEST_PAYMENT = {
  cardNumber: '4111111111111111', // Test Visa
  expiryMonth: '12',
  expiryYear: '2025',
  cvv: '123'
};

// Helper class for complete checkout flow
class CompleteCheckoutFlow {
  constructor(private page: Page) {}

  async fillCheckoutForm() {
    console.log('🔄 Filling checkout form...');
    
    // Fill customer information
    await this.page.fill('input[name="email"]', TEST_CUSTOMER.email);
    await this.page.fill('input[name="firstName"]', TEST_CUSTOMER.firstName);
    await this.page.fill('input[name="lastName"]', TEST_CUSTOMER.lastName);
    await this.page.fill('input[name="address"]', TEST_CUSTOMER.address);
    await this.page.fill('input[name="city"]', TEST_CUSTOMER.city);
    await this.page.fill('input[name="state"]', TEST_CUSTOMER.state);
    await this.page.fill('input[name="zipCode"]', TEST_CUSTOMER.zipCode);
    await this.page.fill('input[name="phone"]', TEST_CUSTOMER.phone);
    await this.page.fill('input[name="nameOnCard"]', TEST_CUSTOMER.nameOnCard);
  }

  async fillPaymentInformation() {
    console.log('💳 Filling payment information...');
    
    // Wait for CollectJS to load and fields to be ready
    await this.page.waitForFunction(() => window.CollectJS != null, { timeout: 15000 });
    await this.page.waitForTimeout(3000); // Wait for fields to initialize
    console.log('✅ CollectJS loaded');
    
    // Fill payment details in CollectJS iframes
    const cardNumberFrame = this.page.frameLocator('#card-number-field iframe');
    await cardNumberFrame.locator('input#ccnumber').fill(TEST_PAYMENT.cardNumber);
    
    const expiryFrame = this.page.frameLocator('#card-expiry-field iframe');
    await expiryFrame.locator('input#ccexp').fill(`${TEST_PAYMENT.expiryMonth}${TEST_PAYMENT.expiryYear}`);
    
    const cvvFrame = this.page.frameLocator('#card-cvv-field iframe');
    await cvvFrame.locator('input#cvv').fill(TEST_PAYMENT.cvv);
  }

  async submitCheckout() {
    console.log('🚀 Submitting checkout...');
    
    // Submit the form
    await this.page.click('button[type="submit"]:not([disabled])');
    
    // Wait for processing overlay to appear (inline processing)
    await this.page.waitForSelector('text=Processing Your Payment', { timeout: 10000 });
    console.log('✅ Processing overlay appeared');
  }

  async waitForPaymentProcessing() {
    console.log('⏳ Waiting for payment processing to complete...');
    
    // Wait for success overlay to appear
    await this.page.waitForSelector('text=Payment Successful!', { timeout: 60000 });
    console.log('✅ Payment successful overlay appeared');
    
    // Wait for redirect to upsell after processing completes
    await this.page.waitForURL(/\/(upsell\/1|thankyou)/, { timeout: 30000 });
    
    const currentUrl = this.page.url();
    console.log(`✅ Payment processed, redirected to: ${currentUrl}`);
    
    return currentUrl;
  }

  async handleUpsell1(accept: boolean) {
    console.log(`${accept ? '✅' : '❌'} ${accept ? 'Accepting' : 'Declining'} first upsell...`);
    
    // Verify we're on upsell 1 page
    await expect(this.page).toHaveURL(/\/upsell\/1/);
    
    if (accept) {
      // Look for accept buttons
      const acceptButton = this.page.locator('button').filter({ hasText: /yes|add.*order|accept|get.*now/i }).first();
      await acceptButton.click();
    } else {
      // Look for decline buttons  
      const declineButton = this.page.locator('button').filter({ hasText: /no.*thanks|skip|decline|maybe.*later/i }).first();
      await declineButton.click();
    }
    
    // Wait for next step
    await this.page.waitForURL(/\/(upsell\/2|thankyou)/, { timeout: 30000 });
  }

  async handleUpsell2(accept: boolean) {
    console.log(`${accept ? '✅' : '❌'} ${accept ? 'Accepting' : 'Declining'} second upsell...`);
    
    // Verify we're on upsell 2 page
    await expect(this.page).toHaveURL(/\/upsell\/2/);
    
    if (accept) {
      const acceptButton = this.page.locator('button').filter({ hasText: /yes|add.*order|accept|get.*now/i }).first();
      await acceptButton.click();
    } else {
      const declineButton = this.page.locator('button').filter({ hasText: /no.*thanks|skip|decline|maybe.*later/i }).first();
      await declineButton.click();
    }
    
    // Should go to thank you page
    await this.page.waitForURL(/\/thankyou/, { timeout: 30000 });
  }

  async validateThankYouPage(expectedOrders: Array<{name: string, price: number}>) {
    console.log('🎉 Validating thank you page...');
    
    // Verify we're on thank you page
    await expect(this.page).toHaveURL(/\/thankyou/);
    
    // Check for success message
    await expect(this.page.locator('h1, h2, h3').filter({ hasText: /thank|success|complete|confirmed/i })).toBeVisible();
    
    // Validate customer information
    await expect(this.page.locator('text=' + TEST_CUSTOMER.firstName)).toBeVisible();
    await expect(this.page.locator('text=' + TEST_CUSTOMER.email)).toBeVisible();
    
    // Validate order details
    let totalExpected = 0;
    for (const order of expectedOrders) {
      await expect(this.page.locator(`text=/${order.name}/i`)).toBeVisible();
      await expect(this.page.locator(`text=/\$${order.price}/`)).toBeVisible();
      totalExpected += order.price;
    }
    
    // Validate total amount
    await expect(this.page.locator(`text=/total.*\$${totalExpected}|\$${totalExpected}.*total/i`)).toBeVisible();
    
    console.log(`✅ Validated ${expectedOrders.length} orders, total: $${totalExpected}`);
  }
}

// Main test suite
test.describe('Complete Checkout Flow - All Upsell Combinations', () => {
  test.beforeEach(async ({ page }) => {
    console.log('🚀 Starting checkout flow test...');
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
  });

  test('Flow 1: Yes + Yes (Accept both upsells)', async ({ page }) => {
    const flow = new CompleteCheckoutFlow(page);
    
    // Complete initial checkout
    await flow.fillCheckoutForm();
    await flow.fillPaymentInformation();
    await flow.submitCheckout();
    await flow.waitForPaymentProcessing();
    
    // Handle upsells
    await flow.handleUpsell1(true);  // Accept first upsell
    await flow.handleUpsell2(true);  // Accept second upsell
    
    // Validate final order
    await flow.validateThankYouPage([
      { name: 'Fitspresso 6 Bottle', price: 294 },
      { name: 'upsell', price: 97 },  // First upsell
      { name: 'upsell', price: 67 }   // Second upsell
    ]);
  });

  test('Flow 2: Yes + No (Accept first, decline second)', async ({ page }) => {
    const flow = new CompleteCheckoutFlow(page);
    
    // Complete initial checkout
    await flow.fillCheckoutForm();
    await flow.fillPaymentInformation();
    await flow.submitCheckout();
    await flow.waitForPaymentProcessing();
    
    // Handle upsells
    await flow.handleUpsell1(true);   // Accept first upsell
    await flow.handleUpsell2(false);  // Decline second upsell
    
    // Validate final order
    await flow.validateThankYouPage([
      { name: 'Fitspresso 6 Bottle', price: 294 },
      { name: 'upsell', price: 97 }   // Only first upsell
    ]);
  });

  test('Flow 3: No + No (Decline both upsells)', async ({ page }) => {
    const flow = new CompleteCheckoutFlow(page);
    
    // Complete initial checkout
    await flow.fillCheckoutForm();
    await flow.fillPaymentInformation();
    await flow.submitCheckout();
    await flow.waitForPaymentProcessing();
    
    // Handle upsells
    await flow.handleUpsell1(false);  // Decline first upsell
    await flow.handleUpsell2(false);  // Decline second upsell
    
    // Validate final order
    await flow.validateThankYouPage([
      { name: 'Fitspresso 6 Bottle', price: 294 }  // Only main product
    ]);
  });

  test('Flow 4: No + Yes (Decline first, accept second)', async ({ page }) => {
    const flow = new CompleteCheckoutFlow(page);
    
    // Complete initial checkout
    await flow.fillCheckoutForm();
    await flow.fillPaymentInformation();
    await flow.submitCheckout();
    await flow.waitForPaymentProcessing();
    
    // Handle upsells
    await flow.handleUpsell1(false);  // Decline first upsell
    await flow.handleUpsell2(true);   // Accept second upsell
    
    // Validate final order
    await flow.validateThankYouPage([
      { name: 'Fitspresso 6 Bottle', price: 294 },
      { name: 'upsell', price: 67 }   // Only second upsell
    ]);
  });
});

test.describe('Error Handling in Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
  });

  test('Should handle payment failure gracefully', async ({ page }) => {
    const flow = new CompleteCheckoutFlow(page);
    
    // Fill form with declined card
    await flow.fillCheckoutForm();
    
    // Wait for CollectJS
    await page.waitForFunction(() => window.CollectJS != null, { timeout: 15000 });
    
    // Use declined test card
    const cardNumberFrame = page.frameLocator('[data-tokenization="ccnumber"] iframe');
    await cardNumberFrame.locator('input').fill('4000000000000002'); // Declined card
    
    const expiryFrame = page.frameLocator('[data-tokenization="ccexp"] iframe');
    await expiryFrame.locator('input').fill('1225');
    
    const cvvFrame = page.frameLocator('[data-tokenization="cvv"] iframe');
    await cvvFrame.locator('input').fill('123');
    
    // Submit and expect failure handling
    await page.click('button[type="submit"]:not([disabled])');
    
    // Should either stay on processing with error or return to checkout
    await page.waitForTimeout(15000);
    
    const currentUrl = page.url();
    const hasError = currentUrl.includes('error=') || 
                    await page.locator('.text-red-500, [role="alert"], .error').isVisible();
    
    expect(hasError).toBeTruthy();
  });

  test('Should handle session timeout', async ({ page }) => {
    // Navigate directly to processing with invalid session
    await page.goto('/checkout/processing?session=invalid-session-id');
    
    // Should redirect back to checkout
    await page.waitForURL(/\/checkout/, { timeout: 30000 });
  });
});

test.describe('Performance Validation', () => {
  test('Complete flow should complete within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    const flow = new CompleteCheckoutFlow(page);
    
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    // Complete checkout (but don't do upsells to keep test faster)
    await flow.fillCheckoutForm();
    await flow.fillPaymentInformation();
    await flow.submitCheckout();
    
    const checkoutTime = Date.now() - startTime;
    console.log(`⏱️  Checkout completed in ${checkoutTime}ms`);
    
    // Should complete within 30 seconds
    expect(checkoutTime).toBeLessThan(30000);
  });
});