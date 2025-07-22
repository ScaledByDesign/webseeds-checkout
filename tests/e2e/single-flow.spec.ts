import { test, expect } from '@playwright/test';
import { Page } from '@playwright/test';

/**
 * Single Complete E2E Flow Test
 * Tests one complete checkout flow to validate everything works
 */

// Test data
const TEST_CUSTOMER = {
  email: 'john.doe@test.com',
  firstName: 'John',
  lastName: 'Doe',
  address: '123 Test Street',
  city: 'Test City',
  state: 'CA',
  zipCode: '12345',
  phone: '5551234567',
  nameOnCard: 'John Doe'
};

const TEST_PAYMENT = {
  cardNumber: '4111111111111111', // Test Visa
  expiry: '1225',
  cvv: '123'
};

class SingleFlowHelper {
  constructor(private page: Page) {}

  async fillFormAndSubmit() {
    console.log('📝 Filling checkout form...');
    
    // Fill customer info
    await this.page.fill('input[name="email"]', TEST_CUSTOMER.email);
    await this.page.fill('input[name="firstName"]', TEST_CUSTOMER.firstName);
    await this.page.fill('input[name="lastName"]', TEST_CUSTOMER.lastName);
    await this.page.fill('input[name="address"]', TEST_CUSTOMER.address);
    await this.page.fill('input[name="city"]', TEST_CUSTOMER.city);
    await this.page.fill('input[name="state"]', TEST_CUSTOMER.state);
    await this.page.fill('input[name="zipCode"]', TEST_CUSTOMER.zipCode);
    await this.page.fill('input[name="phone"]', TEST_CUSTOMER.phone);
    await this.page.fill('input[name="nameOnCard"]', TEST_CUSTOMER.nameOnCard);
    
    console.log('⏳ Waiting for CollectJS to load...');
    
    // Wait for CollectJS with longer timeout
    await this.page.waitForFunction(() => {
      return window.CollectJS != null && typeof window.CollectJS.configure === 'function';
    }, { timeout: 30000 });
    
    console.log('✅ CollectJS loaded, filling payment info...');
    
    // Wait a bit for fields to be ready
    await this.page.waitForTimeout(2000);
    
    // Fill payment info in iframes - use specific input selectors
    try {
      const cardFrame = this.page.frameLocator('#card-number-field iframe');
      await cardFrame.locator('input[name="ccnumber"]').fill(TEST_PAYMENT.cardNumber, { timeout: 10000 });
      
      const expiryFrame = this.page.frameLocator('#card-expiry-field iframe');
      await expiryFrame.locator('input[name="ccexp"]').fill(TEST_PAYMENT.expiry, { timeout: 10000 });
      
      const cvvFrame = this.page.frameLocator('#card-cvv-field iframe');
      await cvvFrame.locator('input[name="cvv"]').fill(TEST_PAYMENT.cvv, { timeout: 10000 });
      
      console.log('💳 Payment info filled');
    } catch (error) {
      console.log('⚠️ Payment iframe error, trying alternative approach:', error);
      // Try with ID selectors
      const cardFrame = this.page.frameLocator('#card-number-field iframe');
      await cardFrame.locator('#ccnumber').fill(TEST_PAYMENT.cardNumber);
      
      const expiryFrame = this.page.frameLocator('#card-expiry-field iframe');
      await expiryFrame.locator('#ccexp').fill(TEST_PAYMENT.expiry);
      
      const cvvFrame = this.page.frameLocator('#card-cvv-field iframe');
      await cvvFrame.locator('#cvv').fill(TEST_PAYMENT.cvv);
    }
    
    console.log('🚀 Submitting form...');
    
    // Submit form
    await this.page.click('button[type="submit"]:not([disabled])');
    
    console.log('⏳ Waiting for redirect to processing...');
    
    // Wait for processing page
    await this.page.waitForURL(/\/checkout\/processing/, { timeout: 15000 });
    
    console.log('✅ On processing page, waiting for completion...');
  }

  async waitForProcessingAndValidate() {
    // Wait for processing to complete (up to 2 minutes)
    await this.page.waitForURL(/\/(upsell\/1|thankyou)/, { timeout: 120000 });
    
    const currentUrl = this.page.url();
    console.log(`✅ Processing complete, current URL: ${currentUrl}`);
    
    return currentUrl.includes('/upsell/1');
  }

  async handleUpsell1(accept: boolean) {
    console.log(`${accept ? '✅' : '❌'} ${accept ? 'Accepting' : 'Declining'} upsell 1...`);
    
    // Verify we're on upsell page
    await expect(this.page).toHaveURL(/\/upsell\/1/);
    
    if (accept) {
      // Look for accept button with various text patterns
      const acceptButton = this.page.locator('button').filter({ 
        hasText: /yes|add.*order|accept|get.*now|upgrade/i 
      }).first();
      await acceptButton.click();
    } else {
      // Look for decline button
      const declineButton = this.page.locator('button').filter({ 
        hasText: /no.*thanks|skip|decline|maybe.*later/i 
      }).first();
      await declineButton.click();
    }
    
    // Wait for next page
    await this.page.waitForURL(/\/(upsell\/2|thankyou)/, { timeout: 30000 });
    
    return this.page.url().includes('/upsell/2');
  }

  async handleUpsell2(accept: boolean) {
    console.log(`${accept ? '✅' : '❌'} ${accept ? 'Accepting' : 'Declining'} upsell 2...`);
    
    await expect(this.page).toHaveURL(/\/upsell\/2/);
    
    if (accept) {
      const acceptButton = this.page.locator('button').filter({ 
        hasText: /yes|add.*order|accept|get.*now|upgrade/i 
      }).first();
      await acceptButton.click();
    } else {
      const declineButton = this.page.locator('button').filter({ 
        hasText: /no.*thanks|skip|decline|maybe.*later/i 
      }).first();
      await declineButton.click();
    }
    
    await this.page.waitForURL(/\/thankyou/, { timeout: 30000 });
  }

  async validateThankYouPage() {
    console.log('🎉 Validating thank you page...');
    
    // Verify URL
    await expect(this.page).toHaveURL(/\/thankyou/);
    
    // Check for success elements
    await expect(this.page.locator('h1, h2, h3').filter({ 
      hasText: /thank|success|complete|confirmed|order.*placed/i 
    })).toBeVisible();
    
    // Check for customer info
    await expect(this.page.locator(`text=${TEST_CUSTOMER.firstName}`)).toBeVisible();
    await expect(this.page.locator(`text=${TEST_CUSTOMER.email}`)).toBeVisible();
    
    // Check for order details
    await expect(this.page.locator('text=/order.*number|confirmation.*number/i')).toBeVisible();
    await expect(this.page.locator('text=/\$\d+/').first()).toBeVisible();
    
    console.log('✅ Thank you page validated!');
  }
}

test.describe('Single Complete E2E Flow', () => {
  test.setTimeout(300000); // 5 minute timeout for complete flow
  
  test.beforeEach(async ({ page }) => {
    console.log('🚀 Starting single flow test...');
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
  });

  test('Complete flow: Checkout → Accept Upsell 1 → Decline Upsell 2 → Thank You', async ({ page }) => {
    const helper = new SingleFlowHelper(page);
    
    // Step 1: Complete checkout
    await helper.fillFormAndSubmit();
    
    // Step 2: Wait for processing
    const hasUpsell1 = await helper.waitForProcessingAndValidate();
    
    if (hasUpsell1) {
      // Step 3: Accept first upsell
      const hasUpsell2 = await helper.handleUpsell1(true);
      
      if (hasUpsell2) {
        // Step 4: Decline second upsell
        await helper.handleUpsell2(false);
      }
    }
    
    // Step 5: Validate thank you page
    await helper.validateThankYouPage();
  });

  test('Complete flow: Checkout → Decline Both Upsells → Thank You', async ({ page }) => {
    const helper = new SingleFlowHelper(page);
    
    // Complete checkout
    await helper.fillFormAndSubmit();
    
    // Wait for processing
    const hasUpsell1 = await helper.waitForProcessingAndValidate();
    
    if (hasUpsell1) {
      // Decline first upsell
      const hasUpsell2 = await helper.handleUpsell1(false);
      
      if (hasUpsell2) {
        // Decline second upsell
        await helper.handleUpsell2(false);
      }
    }
    
    // Validate thank you
    await helper.validateThankYouPage();
  });
});