import { test, expect } from '@playwright/test';

/**
 * Simple E2E tests that don't require payment processing
 * These tests verify basic UI functionality and page navigation
 */

test.describe('Basic Checkout UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
  });

  test('should load checkout page successfully', async ({ page }) => {
    // Verify page loads
    await expect(page).toHaveTitle(/checkout/i);
    
    // Check for key elements
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should display form fields correctly', async ({ page }) => {
    // Check all required form fields are present
    const requiredFields = [
      'email', 'firstName', 'lastName', 'address', 
      'city', 'state', 'zipCode', 'phone', 'nameOnCard'
    ];
    
    for (const field of requiredFields) {
      await expect(page.locator(`input[name="${field}"], select[name="${field}"]`)).toBeVisible();
    }
  });

  test('should allow filling form fields', async ({ page }) => {
    // Fill out form fields
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="address"]', '123 Test St');
    await page.fill('input[name="city"]', 'Test City');
    await page.fill('input[name="state"]', 'CA');
    await page.fill('input[name="zipCode"]', '12345');
    await page.fill('input[name="phone"]', '1234567890');
    await page.fill('input[name="nameOnCard"]', 'John Doe');
    
    // Verify values are filled
    await expect(page.locator('input[name="email"]')).toHaveValue('test@example.com');
    await expect(page.locator('input[name="firstName"]')).toHaveValue('John');
    await expect(page.locator('input[name="lastName"]')).toHaveValue('Doe');
  });

  test('should show submit button is disabled initially', async ({ page }) => {
    // Button should be disabled when CollectJS hasn't loaded or form is invalid
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    
    // The button should have disabled attribute or disabled class
    const isDisabled = await submitButton.isDisabled();
    expect(isDisabled).toBeTruthy();
  });

  test('should have responsive design elements', async ({ page }) => {
    // Check for responsive design indicators
    const form = page.locator('form');
    await expect(form).toBeVisible();
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Form should still be visible and usable
    await expect(form).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });
});

test.describe('Navigation Tests', () => {
  test('should redirect from home to checkout', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to checkout
    await page.waitForURL(/\/checkout/);
    await expect(page).toHaveURL(/\/checkout/);
  });

  test('should have proper page title and meta', async ({ page }) => {
    await page.goto('/checkout');
    
    // Check page has proper title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    
    // Check for viewport meta tag (responsive)
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /width=device-width/);
  });
});

test.describe('Visual Elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
  });

  test('should display branding elements', async ({ page }) => {
    // Check for logo
    const logo = page.locator('img[alt*="Logo"], img[alt*="logo"]').first();
    await expect(logo).toBeVisible();
    
    // Check for security badges
    const securityElement = page.locator('img[alt*="Secure"], img[alt="Secure"]').first();
    await expect(securityElement).toBeVisible();
  });

  test('should show product information', async ({ page }) => {
    // Should show product details or pricing
    const productInfo = page.locator('text=/Fitspresso|product|bottle|pack/i').first();
    await expect(productInfo).toBeVisible();
  });

  test('should have proper styling', async ({ page }) => {
    // Check that CSS is loaded properly
    const body = page.locator('body');
    const backgroundColor = await body.evaluate((el) => getComputedStyle(el).backgroundColor);
    
    // Should not be default white (indicates CSS is loaded)
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
  });

  test('should have proper form labels', async ({ page }) => {
    // Check that form fields have associated labels or placeholders
    const emailInput = page.locator('input[name="email"]');
    const hasLabel = await emailInput.evaluate((el) => {
      return el.labels?.length > 0 || el.placeholder?.length > 0 || el.getAttribute('aria-label');
    });
    expect(hasLabel).toBeTruthy();
  });

  test('should have proper heading structure', async ({ page }) => {
    // Check for proper heading tags
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);
  });

  test('should have keyboard navigation support', async ({ page }) => {
    // Check that form fields are focusable
    const emailInput = page.locator('input[name="email"]');
    await emailInput.focus();
    
    // Verify it's focused
    const isFocused = await emailInput.evaluate((el) => el === document.activeElement);
    expect(isFocused).toBeTruthy();
  });
});