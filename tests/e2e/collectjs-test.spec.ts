import { test, expect } from '@playwright/test';

/**
 * CollectJS Integration Test
 * Validates that CollectJS loads properly with correct tokenization
 */

test.describe('CollectJS Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
  });

  test('should load CollectJS without errors', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait for CollectJS to load
    await page.waitForFunction(() => {
      return window.CollectJS != null && typeof window.CollectJS.configure === 'function';
    }, { timeout: 30000 });

    console.log('✅ CollectJS loaded successfully');

    // Check that no tokenization key errors occurred
    const tokenizationErrors = consoleErrors.filter(error => 
      error.includes('tokenization key') || error.includes('data-tokenization-key')
    );

    if (tokenizationErrors.length > 0) {
      console.log('❌ Tokenization errors found:', tokenizationErrors);
      expect(tokenizationErrors.length).toBe(0);
    }

    console.log('✅ No tokenization key errors');
  });

  test('should have payment fields visible', async ({ page }) => {
    // Wait for CollectJS to load
    await page.waitForFunction(() => window.CollectJS != null, { timeout: 30000 });
    
    // Wait for payment fields to appear
    await page.waitForTimeout(3000);
    
    // Check for payment field containers
    await expect(page.locator('#card-number-field')).toBeVisible();
    await expect(page.locator('#card-expiry-field')).toBeVisible();
    await expect(page.locator('#card-cvv-field')).toBeVisible();
    
    console.log('✅ All payment fields are visible');
  });

  test('should be able to focus on payment fields', async ({ page }) => {
    // Wait for CollectJS to load and fields to be ready
    await page.waitForFunction(() => window.CollectJS != null, { timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Try to interact with the first field (card number)
    try {
      const cardNumberFrame = page.frameLocator('#card-number-field iframe');
      await cardNumberFrame.locator('input').click({ timeout: 10000 });
      console.log('✅ Successfully clicked card number field');
    } catch (error) {
      console.log('⚠️ Could not click card number field:', error);
      // Try alternative selector
      const cardNumberFrame = page.frameLocator('[data-tokenization="ccnumber"] iframe');
      await cardNumberFrame.locator('input').click({ timeout: 10000 });
      console.log('✅ Successfully clicked card number field (alternative selector)');
    }
  });
});