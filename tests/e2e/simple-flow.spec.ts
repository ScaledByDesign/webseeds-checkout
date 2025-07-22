import { test, expect } from '@playwright/test';

/**
 * Simple Flow Test
 * Test just the checkout → processing → first upsell flow
 * This verifies the inline processing works and redirects properly
 */

test('Simple Flow: Checkout to First Upsell', async ({ page }) => {
  console.log('🚀 Starting simple checkout flow test...');
  
  // Navigate to checkout
  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');
  
  // Fill out the form
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="firstName"]', 'Test');
  await page.fill('input[name="lastName"]', 'User');
  await page.fill('input[name="address"]', '123 Test St');
  await page.fill('input[name="city"]', 'Test City');
  await page.fill('input[name="state"]', 'CA');
  await page.fill('input[name="zipCode"]', '12345');
  await page.fill('input[name="phone"]', '5551234567');
  await page.fill('input[name="nameOnCard"]', 'Test User');
  
  console.log('✅ Form filled out');
  
  // Wait for CollectJS to load
  await page.waitForFunction(() => window.CollectJS != null, { timeout: 30000 });
  await page.waitForTimeout(3000);
  
  console.log('✅ CollectJS loaded');
  
  // Fill payment fields
  try {
    const cardFrame = page.frameLocator('#card-number-field iframe');
    await cardFrame.locator('input[name="ccnumber"]').fill('4111111111111111');
    
    const expiryFrame = page.frameLocator('#card-expiry-field iframe');
    await expiryFrame.locator('input[name="ccexp"]').fill('1225');
    
    const cvvFrame = page.frameLocator('#card-cvv-field iframe');
    await cvvFrame.locator('input[name="cvv"]').fill('123');
    
    console.log('✅ Payment fields filled');
  } catch (error) {
    console.log('❌ Error filling payment fields:', error);
  }
  
  // Submit form
  await page.click('button[type="submit"]:not([disabled])');
  
  console.log('🚀 Form submitted');
  
  // Wait for processing state (button should change to "Processing Payment...")
  await page.waitForSelector('button:has-text("Processing")', { timeout: 10000 });
  console.log('✅ Processing state detected');
  
  // Wait for redirect to upsell (after payment completes)
  await page.waitForURL(/\/upsell\/1/, { timeout: 60000 });
  
  console.log('✅ Successfully redirected to first upsell');
  
  // Verify we're on the upsell page
  expect(page.url()).toMatch(/\/upsell\/1/);
  
  console.log('🎉 Simple flow test completed successfully!');
});