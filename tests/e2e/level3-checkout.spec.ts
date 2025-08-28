import { test, expect } from '@playwright/test';
import { Page } from '@playwright/test';

/**
 * Level 3 Checkout Function Test Suite
 * 
 * Comprehensive testing of the enhanced Level 3 data collection checkout
 * with CollectJS integration and NMI processing.
 * 
 * Tests cover:
 * - Level 3 data collection and validation
 * - CollectJS inline tokenization with styleSniffer
 * - Enhanced form validation and error handling
 * - Auto-fill functionality for development
 * - API integration with Level 3 payload structure
 * - Cross-browser compatibility
 */

// Test data for Level 3 processing
const LEVEL3_TEST_DATA = {
  customer: {
    email: 'level3test@example.com',
    phone: '555-123-4567',
    address: '123 Level 3 Street',
    apartment: 'Suite 100',
    city: 'Level3 City',
    state: 'CA',
    zip: '12345',
    country: 'us',
    nameOnCard: 'John Level3 Doe'
  },
  payment: {
    cardNumber: '4111111111111111', // Test Visa
    expiry: '12/25',
    cvv: '123'
  },
  billing: {
    address: '456 Billing Street',
    city: 'Billing City',
    state: 'NY',
    zip: '54321'
  }
};

class Level3CheckoutHelper {
  constructor(private page: Page) {}

  async navigateToLevel3Checkout() {
    console.log('🚀 Navigating to Level 3 checkout page...');
    await this.page.goto('http://localhost:3000/checkout-level3');
    
    // Wait for page to load completely
    await expect(this.page.locator('h1:has-text("Level 3 Data Collection Checkout")')).toBeVisible();
    await this.page.waitForLoadState('networkidle');
  }

  async waitForCollectJSReady() {
    console.log('⏳ Waiting for CollectJS to initialize...');
    
    // Wait for CollectJS fields to be mounted
    await expect(this.page.locator('#card-number-field')).toBeVisible();
    await expect(this.page.locator('#card-expiry-field')).toBeVisible();
    await expect(this.page.locator('#card-cvv-field')).toBeVisible();
    
    // Wait for CollectJS to be ready (check console logs)
    await this.page.waitForFunction(() => {
      return window.console.log.toString().includes('CollectJS fields ready') || 
             document.querySelector('#card-number-field iframe') !== null;
    }, { timeout: 15000 });
    
    console.log('✅ CollectJS ready for Level 3 processing');
  }

  async fillCustomerData(useAutoFill = false) {
    if (useAutoFill) {
      console.log('🤖 Using auto-fill for customer data...');
      await this.page.click('button:has-text("Auto-Fill Test Data")');
      await this.page.waitForTimeout(1000); // Wait for auto-fill to complete
      return;
    }

    console.log('📝 Manually filling customer data...');
    
    // Contact section
    await this.page.fill('input[name="email"]', LEVEL3_TEST_DATA.customer.email);
    await this.page.fill('input[name="phone"]', LEVEL3_TEST_DATA.customer.phone);
    
    // Shipping section
    await this.page.fill('input[name="address"]', LEVEL3_TEST_DATA.customer.address);
    await this.page.fill('input[name="apartment"]', LEVEL3_TEST_DATA.customer.apartment);
    await this.page.fill('input[name="city"]', LEVEL3_TEST_DATA.customer.city);
    await this.page.fill('input[name="state"]', LEVEL3_TEST_DATA.customer.state);
    await this.page.fill('input[name="zip"]', LEVEL3_TEST_DATA.customer.zip);
    await this.page.selectOption('select[name="country"]', LEVEL3_TEST_DATA.customer.country);
    
    // Name on card
    await this.page.fill('input[name="nameOnCard"]', LEVEL3_TEST_DATA.customer.nameOnCard);
  }

  async fillPaymentData() {
    console.log('💳 Filling payment data in CollectJS fields...');
    
    // Fill card number in CollectJS iframe
    const cardNumberFrame = this.page.frameLocator('#card-number-field iframe');
    await cardNumberFrame.locator('input').fill(LEVEL3_TEST_DATA.payment.cardNumber);
    
    // Fill expiry in CollectJS iframe
    const expiryFrame = this.page.frameLocator('#card-expiry-field iframe');
    await expiryFrame.locator('input').fill(LEVEL3_TEST_DATA.payment.expiry);
    
    // Fill CVV in CollectJS iframe
    const cvvFrame = this.page.frameLocator('#card-cvv-field iframe');
    await cvvFrame.locator('input').fill(LEVEL3_TEST_DATA.payment.cvv);
  }

  async enableSeparateBilling() {
    console.log('🏠 Enabling separate billing address...');
    
    // Uncheck the "use same address" checkbox
    const checkbox = this.page.locator('input[id="sameAddress"]');
    if (await checkbox.isChecked()) {
      await this.page.click('label[for="sameAddress"]');
    }
    
    // Wait for billing fields to appear
    await expect(this.page.locator('#billing-section')).toBeVisible();
    
    // Fill billing address
    await this.page.fill('input[name="billingAddress"]', LEVEL3_TEST_DATA.billing.address);
    await this.page.fill('input[name="billingCity"]', LEVEL3_TEST_DATA.billing.city);
    await this.page.fill('input[name="billingState"]', LEVEL3_TEST_DATA.billing.state);
    await this.page.fill('input[name="billingZip"]', LEVEL3_TEST_DATA.billing.zip);
  }

  async interceptLevel3APICall() {
    console.log('🕵️ Setting up API interception for Level 3 data...');
    
    return await this.page.waitForRequest(request => {
      return request.url().includes('/api/nmi-direct') && request.method() === 'POST';
    });
  }

  async verifyLevel3PayloadStructure(request: any) {
    console.log('🔍 Verifying Level 3 payload structure...');
    
    const payload = request.postDataJSON();
    
    // Verify customer info structure
    expect(payload.customerInfo).toBeDefined();
    expect(payload.customerInfo.email).toBe(LEVEL3_TEST_DATA.customer.email);
    expect(payload.customerInfo.firstName).toBe('John');
    expect(payload.customerInfo.lastName).toBe('Level3 Doe');
    expect(payload.customerInfo.phone).toBe(LEVEL3_TEST_DATA.customer.phone);
    expect(payload.customerInfo.address).toBe(LEVEL3_TEST_DATA.customer.address);
    expect(payload.customerInfo.city).toBe(LEVEL3_TEST_DATA.customer.city);
    expect(payload.customerInfo.state).toBe(LEVEL3_TEST_DATA.customer.state);
    expect(payload.customerInfo.zipCode).toBe(LEVEL3_TEST_DATA.customer.zip);
    expect(payload.customerInfo.country).toBe(LEVEL3_TEST_DATA.customer.country);
    
    // Verify payment token
    expect(payload.paymentToken).toBeDefined();
    expect(typeof payload.paymentToken).toBe('string');
    
    // Verify products array
    expect(payload.products).toBeDefined();
    expect(Array.isArray(payload.products)).toBe(true);
    expect(payload.products.length).toBeGreaterThan(0);
    
    // Verify product structure
    const product = payload.products[0];
    expect(product.id).toBeDefined();
    expect(product.name).toBeDefined();
    expect(product.price).toBeDefined();
    expect(product.quantity).toBeDefined();
    
    console.log('✅ Level 3 payload structure verified');
    return payload;
  }
}

test.describe('Level 3 Checkout Function Tests', () => {
  let helper: Level3CheckoutHelper;

  test.beforeEach(async ({ page }) => {
    helper = new Level3CheckoutHelper(page);
  });

  test('Page loads with Level 3 enhancements', async ({ page }) => {
    console.log('🧪 Testing Level 3 page load...');
    
    await helper.navigateToLevel3Checkout();
    
    // Verify Level 3 specific elements
    await expect(page.locator('h1:has-text("Level 3 Data Collection Checkout")')).toBeVisible();
    await expect(page.locator('text=Enhanced Level 3 Processing')).toBeVisible();
    await expect(page.locator('text=Lower interchange fees')).toBeVisible();
    
    // Verify auto-fill button
    await expect(page.locator('button:has-text("Auto-Fill Test Data")')).toBeVisible();
    
    // Verify comparison link
    await expect(page.locator('a:has-text("View Original Checkout")')).toBeVisible();
    
    console.log('✅ Level 3 page loaded successfully');
  });

  test('Auto-fill functionality works correctly', async ({ page }) => {
    console.log('🧪 Testing auto-fill functionality...');
    
    await helper.navigateToLevel3Checkout();
    await helper.waitForCollectJSReady();
    
    // Click auto-fill button
    await page.click('button:has-text("Auto-Fill Test Data")');
    
    // Verify fields are filled
    await expect(page.locator('input[name="email"]')).toHaveValue('test@example.com');
    await expect(page.locator('input[name="phone"]')).toHaveValue('555-123-4567');
    await expect(page.locator('input[name="address"]')).toHaveValue('123 Test Street');
    await expect(page.locator('input[name="city"]')).toHaveValue('Test City');
    await expect(page.locator('input[name="state"]')).toHaveValue('CA');
    await expect(page.locator('input[name="zip"]')).toHaveValue('12345');
    await expect(page.locator('input[name="nameOnCard"]')).toHaveValue('John Doe');
    
    console.log('✅ Auto-fill working correctly');
  });

  test('CollectJS fields mount with correct styling', async ({ page }) => {
    console.log('🧪 Testing CollectJS integration...');
    
    await helper.navigateToLevel3Checkout();
    await helper.waitForCollectJSReady();
    
    // Verify CollectJS containers have correct styling
    const cardNumberField = page.locator('#card-number-field');
    const cardClasses = await cardNumberField.getAttribute('class');
    
    expect(cardClasses).toContain('border-2');
    expect(cardClasses).toContain('border-[#CDCDCD]');
    expect(cardClasses).toContain('rounded-xl');
    expect(cardClasses).toContain('bg-[#F9F9F9]');
    
    // Verify iframes are present
    await expect(page.locator('#card-number-field iframe')).toBeVisible();
    await expect(page.locator('#card-expiry-field iframe')).toBeVisible();
    await expect(page.locator('#card-cvv-field iframe')).toBeVisible();
    
    console.log('✅ CollectJS styling and mounting verified');
  });

  test('Form validation works before CollectJS submission', async ({ page }) => {
    console.log('🧪 Testing form validation...');
    
    await helper.navigateToLevel3Checkout();
    await helper.waitForCollectJSReady();
    
    // Try to submit empty form
    await page.click('button:has-text("Complete Order")');
    
    // Should see validation errors (form validation happens before CollectJS)
    await expect(page.locator('text=/required|Please fill/')).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Form validation working correctly');
  });

  test('Separate billing address functionality', async ({ page }) => {
    console.log('🧪 Testing separate billing address...');
    
    await helper.navigateToLevel3Checkout();
    await helper.waitForCollectJSReady();
    
    // Fill customer data first
    await helper.fillCustomerData(true); // Use auto-fill
    
    // Enable separate billing
    await helper.enableSeparateBilling();
    
    // Verify billing section is visible
    await expect(page.locator('#billing-section')).toBeVisible();
    await expect(page.locator('h4:has-text("Billing Address")')).toBeVisible();
    
    // Verify billing fields are present
    await expect(page.locator('input[name="billingAddress"]')).toBeVisible();
    await expect(page.locator('input[name="billingCity"]')).toBeVisible();
    await expect(page.locator('input[name="billingState"]')).toBeVisible();
    await expect(page.locator('input[name="billingZip"]')).toBeVisible();
    
    console.log('✅ Separate billing address working correctly');
  });

  test('Complete Level 3 checkout flow with API interception', async ({ page }) => {
    console.log('🧪 Testing complete Level 3 checkout flow...');
    
    await helper.navigateToLevel3Checkout();
    await helper.waitForCollectJSReady();
    
    // Set up API interception
    const apiRequestPromise = helper.interceptLevel3APICall();
    
    // Fill all form data
    await helper.fillCustomerData(true); // Use auto-fill
    await helper.fillPaymentData();
    
    // Submit form
    await page.click('button:has-text("Complete Order")');
    
    // Wait for API call and verify Level 3 payload
    const apiRequest = await apiRequestPromise;
    const payload = await helper.verifyLevel3PayloadStructure(apiRequest);
    
    console.log('📊 Level 3 payload sent:', {
      customerFields: Object.keys(payload.customerInfo).length,
      productCount: payload.products.length,
      hasPaymentToken: !!payload.paymentToken,
      hasBillingInfo: !!payload.billingInfo
    });
    
    console.log('✅ Complete Level 3 flow tested successfully');
  });

  test('Level 3 checkout with separate billing', async ({ page }) => {
    console.log('🧪 Testing Level 3 with separate billing...');
    
    await helper.navigateToLevel3Checkout();
    await helper.waitForCollectJSReady();
    
    // Set up API interception
    const apiRequestPromise = helper.interceptLevel3APICall();
    
    // Fill customer data and enable separate billing
    await helper.fillCustomerData(true);
    await helper.enableSeparateBilling();
    await helper.fillPaymentData();
    
    // Submit form
    await page.click('button:has-text("Complete Order")');
    
    // Verify Level 3 payload includes separate billing
    const apiRequest = await apiRequestPromise;
    const payload = await helper.verifyLevel3PayloadStructure(apiRequest);
    
    // Verify billing info is included
    expect(payload.billingInfo).toBeDefined();
    expect(payload.billingInfo.address).toBe(LEVEL3_TEST_DATA.billing.address);
    expect(payload.billingInfo.city).toBe(LEVEL3_TEST_DATA.billing.city);
    expect(payload.billingInfo.state).toBe(LEVEL3_TEST_DATA.billing.state);
    expect(payload.billingInfo.zipCode).toBe(LEVEL3_TEST_DATA.billing.zip);
    
    console.log('✅ Level 3 with separate billing verified');
  });

  test('Console logs show Level 3 processing steps', async ({ page }) => {
    console.log('🧪 Testing Level 3 console logging...');
    
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });
    
    await helper.navigateToLevel3Checkout();
    await helper.waitForCollectJSReady();
    
    // Fill and submit form
    await helper.fillCustomerData(true);
    await helper.fillPaymentData();
    
    // Check for Level 3 specific console logs
    const level3Logs = consoleLogs.filter(log => 
      log.includes('Level 3') || 
      log.includes('CollectJS') ||
      log.includes('tokenization')
    );
    
    expect(level3Logs.length).toBeGreaterThan(0);
    console.log('📝 Level 3 console logs found:', level3Logs.length);
    
    console.log('✅ Level 3 logging verified');
  });

  test('Mobile responsiveness maintained', async ({ page }) => {
    console.log('🧪 Testing mobile responsiveness...');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await helper.navigateToLevel3Checkout();
    await helper.waitForCollectJSReady();
    
    // Verify all elements are still accessible on mobile
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('#card-number-field')).toBeVisible();
    await expect(page.locator('button:has-text("Complete Order")')).toBeVisible();
    
    // Test auto-fill on mobile
    await page.click('button:has-text("Auto-Fill Test Data")');
    await expect(page.locator('input[name="email"]')).toHaveValue('test@example.com');
    
    console.log('✅ Mobile responsiveness verified');
  });
});

test.describe('Level 3 Error Handling', () => {
  let helper: Level3CheckoutHelper;

  test.beforeEach(async ({ page }) => {
    helper = new Level3CheckoutHelper(page);
  });

  test('Handles CollectJS loading failure gracefully', async ({ page }) => {
    console.log('🧪 Testing CollectJS failure handling...');
    
    // Block CollectJS script loading
    await page.route('**/Collect.js', route => route.abort());
    
    await helper.navigateToLevel3Checkout();
    
    // Should show error message about payment system
    await expect(page.locator('text=/Payment system|Failed to load/')).toBeVisible({ timeout: 10000 });
    
    console.log('✅ CollectJS failure handled gracefully');
  });

  test('Validates CollectJS fields before submission', async ({ page }) => {
    console.log('🧪 Testing CollectJS field validation...');
    
    await helper.navigateToLevel3Checkout();
    await helper.waitForCollectJSReady();
    
    // Fill customer data but leave payment fields empty
    await helper.fillCustomerData(true);
    
    // Try to submit
    await page.click('button:has-text("Complete Order")');
    
    // Should see validation error about payment fields
    await expect(page.locator('text=/complete all payment fields|payment fields correctly/')).toBeVisible({ timeout: 5000 });
    
    console.log('✅ CollectJS field validation working');
  });
});
