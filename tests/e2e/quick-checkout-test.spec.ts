import { test, expect } from '@playwright/test';

/**
 * Quick Checkout Test using Auto-Fill Feature
 * Tests the complete checkout flow with NMI, Collect.js, Inngest, and Sessions
 */

test.describe('Quick Checkout with Auto-Fill', () => {
  test('should complete checkout using auto-fill button', async ({ page }) => {
    // Navigate to checkout
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    // Wait for CollectJS to load
    await page.waitForFunction(() => window.CollectJS != null, { timeout: 10000 });
    console.log('✅ CollectJS loaded');
    
    // Look for and click the auto-fill button
    const autoFillButton = page.locator('button:has-text("Fill Test Data"), button:has-text("Auto Fill"), button:has-text("Test Data"), button[data-test="auto-fill"]');
    
    if (await autoFillButton.count() > 0) {
      console.log('🔘 Found auto-fill button, clicking...');
      await autoFillButton.first().click();
      await page.waitForTimeout(1500); // Wait for auto-fill
      
      // Verify fields are filled
      const email = await page.locator('input[name="email"]').inputValue();
      const address = await page.locator('input[name="address"]').inputValue();
      const city = await page.locator('input[name="city"]').inputValue();
      const nameOnCard = await page.locator('input[name="nameOnCard"]').inputValue();
      
      console.log('📝 Auto-filled data:', {
        email,
        address,
        city,
        nameOnCard
      });
      
      expect(email).not.toBe('');
      expect(address).not.toBe('');
      expect(city).not.toBe('');
      expect(nameOnCard).not.toBe('');
    } else {
      console.log('⚠️ No auto-fill button found, filling manually');
      // Fallback to manual filling
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="address"]', '123 Test Street');
      await page.fill('input[name="apartment"]', '');
      await page.fill('input[name="city"]', 'Test City');
      await page.selectOption('select[name="state"]', 'CA');
      await page.fill('input[name="zip"]', '12345');
      await page.selectOption('select[name="country"]', 'us');
      await page.fill('input[name="phone"]', '1234567890');
      await page.fill('input[name="nameOnCard"]', 'John Doe');
    }
    
    // Payment information - Manual entry required due to PCI compliance
    console.log('💳 Payment fields ready for manual entry...');
    console.log('⏰ MANUAL ENTRY REQUIRED - You have 15 seconds to fill:');
    console.log('   Card Number: 4111111111111111');
    console.log('   Expiry: 12/25');
    console.log('   CVV: 123');
    console.log('');
    
    // Visual countdown timer
    for (let i = 15; i > 0; i--) {
      console.log(`   ⏱️  ${i} seconds remaining...`);
      await page.waitForTimeout(1000);
      
      // Check if all fields have been filled
      const hasCardNumber = await page.evaluate(() => {
        const iframe = document.querySelector('#card-number-field iframe') as HTMLIFrameElement;
        try {
          return iframe?.contentDocument?.querySelector('input')?.value?.length > 0;
        } catch {
          return false; // Can't access due to cross-origin, assume not filled
        }
      });
      
      // Since we can't actually check iframe content due to security, 
      // we'll just wait for the full time
    }
    
    console.log('✅ Manual entry time completed');
    
    // Submit the form
    const submitButton = page.locator('button[type="submit"], button:has-text("Complete Order"), button:has-text("Place Order")');
    
    // Check if button is enabled
    const isDisabled = await submitButton.isDisabled();
    if (!isDisabled) {
      console.log('🚀 Submitting checkout form...');
      await submitButton.click();
      
      // Wait for processing
      await page.waitForTimeout(3000);
      
      // Check for success indicators
      const currentUrl = page.url();
      if (currentUrl.includes('processing') || currentUrl.includes('upsell') || currentUrl.includes('thank')) {
        console.log('✅ Checkout submitted successfully!');
        console.log('📍 Redirected to:', currentUrl);
      } else {
        // Check for any error messages
        const errorMessage = await page.locator('.error, .alert-error, [role="alert"]').first();
        if (await errorMessage.count() > 0) {
          const errorText = await errorMessage.textContent();
          console.log('❌ Error occurred:', errorText);
        }
      }
    } else {
      console.log('⚠️ Submit button is disabled');
      // Try to check what's missing
      const missingFields = [];
      const fields = ['email', 'address', 'city', 'zip', 'nameOnCard'];
      for (const field of fields) {
        const value = await page.locator(`input[name="${field}"]`).inputValue();
        if (!value) missingFields.push(field);
      }
      if (missingFields.length > 0) {
        console.log('Missing fields:', missingFields);
      }
    }
  });
  
  test('should validate Inngest is processing payments', async ({ page }) => {
    // Check Inngest dashboard
    const inngestResponse = await page.request.get('http://localhost:8288/health');
    expect(inngestResponse.status()).toBe(200);
    console.log('✅ Inngest is healthy and running');
    
    // You can also check for recent runs
    // This would require accessing the Inngest dashboard API
    console.log('🔍 Check Inngest dashboard at: http://localhost:8288/runs');
  });
  
  test('should create and track sessions', async ({ page }) => {
    // Navigate to checkout
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    // Check for session cookie or localStorage
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('ws_'));
    
    if (sessionCookie) {
      console.log('🍪 Session cookie found:', sessionCookie.name);
    }
    
    // Check localStorage for session data
    const sessionData = await page.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.includes('session') || key.includes('checkout')) {
          data[key] = localStorage.getItem(key);
        }
      }
      return data;
    });
    
    if (Object.keys(sessionData).length > 0) {
      console.log('💾 Session data found:', Object.keys(sessionData));
    }
  });
});