import { test, expect } from '@playwright/test';
import { Page } from '@playwright/test';

/**
 * Complete NMI Funnel E2E Test
 * 
 * Tests the complete funnel flow in the nmi-checkout project:
 * 1. Initial checkout with NMI Customer Vault creation
 * 2. Upsell 1 with one-click vault payment
 * 3. Upsell 2 with one-click vault payment  
 * 4. Final success page with complete order summary
 * 
 * This test covers all combinations: Yes+Yes, Yes+No, No+No, No+Yes
 */

// Test customer data for NMI
const TEST_CUSTOMER = {
  email: 'test@example.com',
  address: '123 Test Street',
  apartment: '',
  city: 'Test City', 
  state: 'CA',
  zip: '12345',
  country: 'us',
  phone: '1234567890',
  nameOnCard: 'John Doe'
};

// NMI Test payment data (Sandbox)
const TEST_PAYMENT = {
  cardNumber: '4111111111111111', // Test Visa
  expiryMonth: '12',
  expiryYear: '25',
  cvv: '123'
};

// Expected product prices
const EXPECTED_PRICES = {
  main: 297.00,
  upsell1: 197.00,
  upsell2: 147.00
};

// Helper class for NMI funnel testing
class NMIFunnelFlow {
  constructor(private page: Page) {}

  async navigateToFunnel() {
    console.log('🚀 Navigating to NMI funnel...');
    await this.page.goto('/funnel/checkout');
    await this.page.waitForLoadState('networkidle');
  }

  async fillCheckoutForm() {
    console.log('📝 Filling NMI checkout form...');
    
    // Fill customer information
    await this.page.fill('input[name="email"]', TEST_CUSTOMER.email);
    await this.page.fill('input[name="firstName"]', TEST_CUSTOMER.firstName);
    await this.page.fill('input[name="lastName"]', TEST_CUSTOMER.lastName);
    await this.page.fill('input[name="address"]', TEST_CUSTOMER.address);
    await this.page.fill('input[name="city"]', TEST_CUSTOMER.city);
    await this.page.fill('input[name="state"]', TEST_CUSTOMER.state);
    await this.page.fill('input[name="zipCode"]', TEST_CUSTOMER.zipCode);
    await this.page.fill('input[name="phone"]', TEST_CUSTOMER.phone);

    // Verify main product pricing
    await expect(this.page.locator(`text=\\$${EXPECTED_PRICES.main.toFixed(2)}`)).toBeVisible();
  }

  async fillNMIPaymentFields() {
    console.log('💳 Filling NMI payment fields...');
    
    // Wait for NMI CollectJS to load
    await this.page.waitForFunction(() => window.CollectJS != null, { timeout: 30000 });
    await this.page.waitForTimeout(3000); // Allow fields to initialize
    
    try {
      // Fill NMI CollectJS payment fields
      const cardFrame = this.page.frameLocator('[data-tokenization-key] iframe, #ccnumber iframe').first();
      await cardFrame.locator('input').fill(TEST_PAYMENT.cardNumber);
      
      const expiryFrame = this.page.frameLocator('[data-field="ccexp"] iframe, #ccexp iframe').first();
      await expiryFrame.locator('input').fill(`${TEST_PAYMENT.expiryMonth}${TEST_PAYMENT.expiryYear}`);
      
      const cvvFrame = this.page.frameLocator('[data-field="cvv"] iframe, #cvv iframe').first();
      await cvvFrame.locator('input').fill(TEST_PAYMENT.cvv);
      
      console.log('✅ NMI payment fields filled successfully');
    } catch (error) {
      console.log('⚠️ Trying alternative NMI field selectors:', error);
      
      // Alternative selectors for different NMI implementations
      try {
        await this.page.fill('#card-number', TEST_PAYMENT.cardNumber);
        await this.page.fill('#card-expiry', `${TEST_PAYMENT.expiryMonth}/${TEST_PAYMENT.expiryYear}`);
        await this.page.fill('#card-cvv', TEST_PAYMENT.cvv);
      } catch (altError) {
        console.log('❌ Could not fill payment fields with any method');
        throw altError;
      }
    }
  }

  async submitCheckout() {
    console.log('🚀 Submitting NMI checkout...');
    
    // Find and click the checkout submit button
    const submitButton = this.page.locator('button[type="submit"], button:has-text("Complete Order"), button:has-text("Place Order")').first();
    await submitButton.click();
    
    // Wait for processing and redirect to upsell-1
    console.log('⏳ Waiting for Customer Vault creation and redirect...');
    await this.page.waitForURL(/\/funnel\/upsell-1/, { timeout: 60000 });
    
    console.log('✅ Successfully redirected to Upsell 1');
  }

  async handleUpsell1(accept: boolean) {
    console.log(`${accept ? '✅' : '❌'} ${accept ? 'Accepting' : 'Declining'} Upsell 1...`);
    
    // Verify we're on upsell-1 page
    await expect(this.page).toHaveURL(/\/funnel\/upsell-1/);
    
    // Verify upsell 1 pricing
    await expect(this.page.locator(`text=\\$${EXPECTED_PRICES.upsell1.toFixed(2)}`)).toBeVisible();
    
    if (accept) {
      // Click "Yes" or "Add to Order" button
      const acceptButton = this.page.locator('button:has-text("Yes"), button:has-text("Add"), button:has-text("Accept")').first();
      await acceptButton.click();
      
      // Wait for processing toast/message
      await expect(this.page.locator('text=success, text=added')).toBeVisible({ timeout: 10000 });
    } else {
      // Click "No" or "Skip" button  
      const declineButton = this.page.locator('button:has-text("No"), button:has-text("Skip"), button:has-text("Decline")').first();
      await declineButton.click();
    }
    
    // Wait for redirect to upsell-2
    await this.page.waitForURL(/\/funnel\/upsell-2/, { timeout: 30000 });
    console.log('✅ Successfully redirected to Upsell 2');
  }

  async handleUpsell2(accept: boolean) {
    console.log(`${accept ? '✅' : '❌'} ${accept ? 'Accepting' : 'Declining'} Upsell 2...`);
    
    // Verify we're on upsell-2 page
    await expect(this.page).toHaveURL(/\/funnel\/upsell-2/);
    
    // Verify upsell 2 pricing
    await expect(this.page.locator(`text=\\$${EXPECTED_PRICES.upsell2.toFixed(2)}`)).toBeVisible();
    
    if (accept) {
      // Click "Yes" or "Add to Order" button
      const acceptButton = this.page.locator('button:has-text("Yes"), button:has-text("Add"), button:has-text("Accept")').first();
      await acceptButton.click();
      
      // Wait for processing toast/message  
      await expect(this.page.locator('text=success, text=added')).toBeVisible({ timeout: 10000 });
    } else {
      // Click "No" or "Skip" button
      const declineButton = this.page.locator('button:has-text("No"), button:has-text("Skip"), button:has-text("Decline")').first();
      await declineButton.click();
    }
    
    // Wait for redirect to success page
    await this.page.waitForURL(/\/funnel\/success/, { timeout: 30000 });
    console.log('✅ Successfully redirected to Success page');
  }

  async validateSuccessPage(expectedProducts: Array<{name: string, price: number}>) {
    console.log('🎉 Validating success page...');
    
    // Verify we're on success page
    await expect(this.page).toHaveURL(/\/funnel\/success/);
    
    // Check for order complete message
    await expect(this.page.locator('text=Order Complete, text=Thank you, text=Success')).toBeVisible();
    
    // Validate customer information display
    await expect(this.page.locator(`text=${TEST_CUSTOMER.firstName}`)).toBeVisible();
    await expect(this.page.locator(`text=${TEST_CUSTOMER.email}`)).toBeVisible();
    
    // Calculate and validate total
    const expectedTotal = expectedProducts.reduce((sum, product) => sum + product.price, 0);
    await expect(this.page.locator(`text=\\$${expectedTotal.toFixed(2)}`)).toBeVisible();
    
    // Validate individual products in order summary
    for (const product of expectedProducts) {
      await expect(this.page.locator(`text=${product.name}`)).toBeVisible();
      await expect(this.page.locator(`text=\\$${product.price.toFixed(2)}`)).toBeVisible();
    }
    
    // Verify payment status
    await expect(this.page.locator('text=Paid, text=Complete, text=✅')).toBeVisible();
    
    console.log(`✅ Success page validated: ${expectedProducts.length} products, total: $${expectedTotal.toFixed(2)}`);
  }
}

// Main test suite for NMI funnel
test.describe('Complete NMI Funnel Flow - All Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    console.log('🚀 Starting NMI funnel test...');
    
    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`❌ Browser error: ${msg.text()}`);
      }
    });
  });

  test('Scenario 1: Yes + Yes (Accept both upsells)', async ({ page }) => {
    const flow = new NMIFunnelFlow(page);
    
    // Complete initial checkout with NMI Customer Vault
    await flow.navigateToFunnel();
    await flow.fillCheckoutForm();
    await flow.fillNMIPaymentFields();
    await flow.submitCheckout();
    
    // Accept both upsells using stored payment method
    await flow.handleUpsell1(true);  // Accept Priority Support
    await flow.handleUpsell2(true);  // Accept Automation Toolkit
    
    // Validate final order contains all products
    await flow.validateSuccessPage([
      { name: 'Premium Dashboard License', price: EXPECTED_PRICES.main },
      { name: 'Priority Support', price: EXPECTED_PRICES.upsell1 },
      { name: 'Automation Toolkit', price: EXPECTED_PRICES.upsell2 }
    ]);
  });

  test('Scenario 2: Yes + No (Accept first, decline second)', async ({ page }) => {
    const flow = new NMIFunnelFlow(page);
    
    await flow.navigateToFunnel();
    await flow.fillCheckoutForm();
    await flow.fillNMIPaymentFields();
    await flow.submitCheckout();
    
    await flow.handleUpsell1(true);   // Accept Priority Support
    await flow.handleUpsell2(false);  // Decline Automation Toolkit
    
    // Validate order contains main product + upsell 1 only
    await flow.validateSuccessPage([
      { name: 'Premium Dashboard License', price: EXPECTED_PRICES.main },
      { name: 'Priority Support', price: EXPECTED_PRICES.upsell1 }
    ]);
  });

  test('Scenario 3: No + No (Decline both upsells)', async ({ page }) => {
    const flow = new NMIFunnelFlow(page);
    
    await flow.navigateToFunnel();
    await flow.fillCheckoutForm();
    await flow.fillNMIPaymentFields();
    await flow.submitCheckout();
    
    await flow.handleUpsell1(false);  // Decline Priority Support
    await flow.handleUpsell2(false);  // Decline Automation Toolkit
    
    // Validate order contains main product only
    await flow.validateSuccessPage([
      { name: 'Premium Dashboard License', price: EXPECTED_PRICES.main }
    ]);
  });

  test('Scenario 4: No + Yes (Decline first, accept second)', async ({ page }) => {
    const flow = new NMIFunnelFlow(page);
    
    await flow.navigateToFunnel();
    await flow.fillCheckoutForm();
    await flow.fillNMIPaymentFields();
    await flow.submitCheckout();
    
    await flow.handleUpsell1(false);  // Decline Priority Support
    await flow.handleUpsell2(true);   // Accept Automation Toolkit
    
    // Validate order contains main product + upsell 2 only
    await flow.validateSuccessPage([
      { name: 'Premium Dashboard License', price: EXPECTED_PRICES.main },
      { name: 'Automation Toolkit', price: EXPECTED_PRICES.upsell2 }
    ]);
  });
});

test.describe('NMI Funnel Error Scenarios', () => {
  test('Should handle payment decline gracefully', async ({ page }) => {
    const flow = new NMIFunnelFlow(page);
    
    await flow.navigateToFunnel();
    await flow.fillCheckoutForm();
    
    // Use declined test card number for NMI
    await this.page.waitForFunction(() => window.CollectJS != null, { timeout: 30000 });
    
    try {
      const cardFrame = page.frameLocator('[data-tokenization-key] iframe').first();
      await cardFrame.locator('input').fill('4000000000000002'); // Declined card
      
      const expiryFrame = page.frameLocator('[data-field="ccexp"] iframe').first();
      await expiryFrame.locator('input').fill('1225');
      
      const cvvFrame = page.frameLocator('[data-field="cvv"] iframe').first();
      await cvvFrame.locator('input').fill('123');
    } catch (error) {
      console.log('Using fallback payment fields for decline test');
    }
    
    // Submit and expect decline handling
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    // Should show error message and stay on checkout page
    await expect(page.locator('text=declined, text=failed, text=error')).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/funnel\/checkout/);
  });

  test('Should require valid session for upsells', async ({ page }) => {
    // Try to access upsell page directly without checkout
    await page.goto('/funnel/upsell-1');
    
    // Should redirect back to checkout
    await page.waitForURL(/\/funnel\/checkout/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/funnel\/checkout/);
  });
});

test.describe('NMI Funnel Performance', () => {
  test('Complete funnel should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    const flow = new NMIFunnelFlow(page);
    
    await flow.navigateToFunnel();
    
    const checkoutTime = Date.now() - startTime;
    console.log(`⏱️  NMI Funnel loaded in ${checkoutTime}ms`);
    
    // Should load within 5 seconds
    expect(checkoutTime).toBeLessThan(5000);
    
    // Verify all essential elements are visible
    await expect(page.locator('text=Premium Dashboard License')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});