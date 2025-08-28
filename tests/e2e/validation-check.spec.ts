import { test, expect } from '@playwright/test';

test.describe('Checkout Form Validation & Apple Pay', () => {
  test('validation styling and Apple Pay button present', async ({ page }) => {
    console.log('🚀 Starting validation and Apple Pay test...');
    
    // Navigate to checkout page
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    // Check Apple Pay button is present
    const applePayButton = page.locator('button[aria-label="Pay with Apple Pay"]');
    await expect(applePayButton).toBeVisible();
    console.log('✅ Apple Pay button is visible');
    
    // Check Google Pay button is present (use first() to handle duplicates)
    const googlePayButton = page.locator('button[aria-label="Pay with Google Pay"]').first();
    await expect(googlePayButton).toBeVisible();
    console.log('✅ Google Pay button is visible');
    
    // Check PayPal button is present
    const payPalButton = page.locator('button[aria-label="Pay with PayPal"]');
    await expect(payPalButton).toBeVisible();
    console.log('✅ PayPal button is visible');
    
    // Test validation styling - focus and blur email field without filling
    const emailInput = page.locator('input[name="email"]');
    await emailInput.focus();
    await emailInput.blur();
    
    // Wait for validation to trigger
    await page.waitForTimeout(500);
    
    // Check if email field has error styling (red border)
    const emailClasses = await emailInput.getAttribute('class');
    expect(emailClasses).toContain('input-error');
    console.log('✅ Email field shows error styling (red border)');
    
    // Check if error message appears below email field
    const emailError = page.locator('input[name="email"] ~ .error-message').first();
    await expect(emailError).toBeVisible();
    const emailErrorText = await emailError.textContent();
    console.log(`✅ Email error message visible: "${emailErrorText}"`);
    
    // Check address field validation
    const addressInput = page.locator('input[name="address"]');
    await addressInput.focus();
    await addressInput.blur();
    await page.waitForTimeout(500);
    const addressClasses = await addressInput.getAttribute('class');
    expect(addressClasses).toContain('input-error');
    console.log('✅ Address field shows error styling');
    
    // Take screenshot of validation state
    await page.screenshot({ path: 'validation-state.png', fullPage: true });
    console.log('📸 Screenshot saved: validation-state.png');
    
    // Fill email to clear its error
    await emailInput.fill('test@example.com');
    await emailInput.blur();
    await page.waitForTimeout(500);
    
    // Check email error is cleared
    const emailClassesAfter = await emailInput.getAttribute('class');
    expect(emailClassesAfter).not.toContain('input-error');
    console.log('✅ Email error cleared after valid input');
    
    console.log('✨ All validation tests passed!');
  });
});