import { test, expect } from '@playwright/test';

/**
 * Fully Automated Checkout Test
 * Using the successful iframe access method discovered in our investigation
 */

test.describe('Automated Checkout with CollectJS', () => {
  test('complete checkout flow with automatic payment field filling', async ({ page }) => {
    test.setTimeout(45000); // 45 seconds
    
    console.log('🚀 Starting automated checkout test...');
    
    // Navigate to checkout page
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    // Wait for CollectJS to load
    await page.waitForFunction(() => window.CollectJS != null, { timeout: 10000 });
    console.log('✅ CollectJS loaded');
    
    // Give time for iframes to initialize
    await page.waitForTimeout(3000);
    
    // Fill customer information using the auto-fill button if available
    const autoFillButton = page.locator('button:has-text("Fill Customer Data")');
    if (await autoFillButton.count() > 0) {
      console.log('📝 Using auto-fill button for customer data...');
      await autoFillButton.click();
      await page.waitForTimeout(500);
    } else {
      console.log('📝 Filling customer information manually...');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="address"]', '123 Test Street');
      await page.fill('input[name="apartment"]', 'Apt 101');
      await page.fill('input[name="city"]', 'Test City');
      await page.selectOption('select[name="state"]', 'CA');
      await page.fill('input[name="zip"]', '12345');
      await page.selectOption('select[name="country"]', 'us');
      await page.fill('input[name="phone"]', '5551234567');
      await page.fill('input[name="nameOnCard"]', 'Test User');
    }
    
    console.log('✅ Customer information filled');
    
    // Now fill payment fields using the working iframe access method
    console.log('💳 Filling payment fields automatically...');
    
    const frames = page.frames();
    let cardFilled = false;
    let expFilled = false;
    let cvvFilled = false;
    
    for (const frame of frames) {
      const url = frame.url();
      if (url.includes('secure.networkmerchants.com')) {
        try {
          // Find all inputs in the frame
          const inputs = await frame.locator('input[type="tel"], input[type="text"]:not([aria-hidden="true"])').all();
          
          for (const input of inputs) {
            const inputId = await input.getAttribute('id');
            const inputName = await input.getAttribute('name');
            const placeholder = await input.getAttribute('placeholder');
            
            // Identify and fill based on attributes
            if ((inputId === 'ccnumber' || inputName === 'ccnumber') && !cardFilled) {
              await input.fill('4111111111111111');
              console.log('  ✅ Card number filled');
              cardFilled = true;
            } else if ((inputId === 'ccexp' || inputName === 'ccexp' || 
                       placeholder?.toLowerCase().includes('mm') || 
                       placeholder?.toLowerCase().includes('exp')) && !expFilled) {
              await input.fill('1225');
              console.log('  ✅ Expiry date filled');
              expFilled = true;
            } else if ((inputId === 'cvv' || inputName === 'cvv' || 
                       placeholder?.toLowerCase().includes('cvv') ||
                       placeholder?.toLowerCase().includes('security')) && !cvvFilled) {
              await input.fill('123');
              console.log('  ✅ CVV filled');
              cvvFilled = true;
            }
          }
        } catch (e) {
          // Frame not accessible, continue
        }
      }
    }
    
    if (!cardFilled || !expFilled || !cvvFilled) {
      console.log('⚠️ Some fields could not be filled automatically');
      console.log(`  Card: ${cardFilled}, Exp: ${expFilled}, CVV: ${cvvFilled}`);
    }
    
    // Wait a moment for validation
    await page.waitForTimeout(2000);
    
    // Check if submit button is enabled
    const submitButton = page.locator('button[type="submit"]:has-text("Place"), button[type="submit"]:has-text("Complete"), button[type="submit"]:has-text("Order")').first();
    
    const isDisabled = await submitButton.isDisabled();
    console.log(`📊 Submit button state: ${isDisabled ? 'DISABLED' : 'ENABLED'}`);
    
    if (!isDisabled) {
      console.log('🚀 Submitting order...');
      
      // Submit the form
      await Promise.all([
        page.waitForNavigation({ timeout: 15000 }).catch(() => {}),
        submitButton.click()
      ]);
      
      // Wait for processing
      await page.waitForTimeout(3000);
      
      // Check the result
      const currentUrl = page.url();
      console.log(`📍 Current URL: ${currentUrl}`);
      
      if (currentUrl.includes('processing')) {
        console.log('⏳ Order is processing...');
        // Wait for redirect
        await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
      }
      
      if (currentUrl.includes('upsell') || currentUrl.includes('thank')) {
        console.log('✅ SUCCESS! Order submitted successfully');
        
        // Get session info if available
        const cookies = await page.context().cookies();
        const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('ws_'));
        if (sessionCookie) {
          console.log(`🍪 Session ID: ${sessionCookie.value}`);
        }
        
        // Verify in Inngest
        console.log('📊 Check Inngest dashboard for payment event: http://localhost:8288/runs');
        
        // Test passes!
        expect(currentUrl).toContain(/upsell|thank/);
      } else {
        // Check for errors
        const errorElement = page.locator('.error, .alert-error, [role="alert"], .text-red-500').first();
        if (await errorElement.count() > 0) {
          const errorText = await errorElement.textContent();
          console.log(`❌ Error occurred: ${errorText}`);
          throw new Error(`Checkout failed: ${errorText}`);
        }
      }
    } else {
      console.log('❌ Submit button is disabled');
      console.log('Checking what might be missing...');
      
      // Debug: Check field values
      const fieldValues = await page.evaluate(() => {
        const fields = ['email', 'address', 'city', 'zip', 'phone', 'nameOnCard'];
        const values: any = {};
        fields.forEach(name => {
          const input = document.querySelector(`input[name="${name}"]`) as HTMLInputElement;
          if (input) {
            values[name] = input.value || 'empty';
          }
        });
        return values;
      });
      
      console.log('Field values:', fieldValues);
      
      // Try to check payment field status via CollectJS
      const collectJSStatus = await page.evaluate(() => {
        if (window.CollectJS && window.CollectJS.isValid) {
          return {
            card: window.CollectJS.isValid('ccnumber'),
            exp: window.CollectJS.isValid('ccexp'),
            cvv: window.CollectJS.isValid('cvv')
          };
        }
        return null;
      });
      
      if (collectJSStatus) {
        console.log('CollectJS validation status:', collectJSStatus);
      }
      
      throw new Error('Submit button remained disabled - form may be incomplete');
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'automated-checkout-success.png', fullPage: true });
    console.log('📸 Screenshot saved: automated-checkout-success.png');
  });
  
  test('verify automated payment field filling', async ({ page }) => {
    // This test just verifies we can fill the payment fields
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    // Wait for CollectJS
    await page.waitForFunction(() => window.CollectJS != null, { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Fill payment fields
    const frames = page.frames();
    let filled = 0;
    
    for (const frame of frames) {
      if (frame.url().includes('secure.networkmerchants.com')) {
        try {
          const cardInput = await frame.locator('input#ccnumber, input#ccnumber').first();
          if (await cardInput.count() > 0) {
            await cardInput.fill('4111111111111111');
            filled++;
          }
          
          const expInput = await frame.locator('input#ccexp, input#ccexp').first();
          if (await expInput.count() > 0) {
            await expInput.fill('1225');
            filled++;
          }
          
          const cvvInput = await frame.locator('input#cvv, input#cvv').first();
          if (await cvvInput.count() > 0) {
            await cvvInput.fill('123');
            filled++;
          }
        } catch (e) {
          // Continue
        }
      }
    }
    
    expect(filled).toBeGreaterThan(0);
    console.log(`✅ Successfully filled ${filled} payment field(s)`);
  });
});