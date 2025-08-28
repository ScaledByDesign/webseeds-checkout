import { chromium, FullConfig } from '@playwright/test';

/**
 * Global Setup for Level 3 Checkout Tests
 * 
 * Prepares the test environment for Level 3 data collection testing:
 * - Verifies CollectJS availability
 * - Checks NMI API endpoint accessibility
 * - Validates environment variables
 * - Sets up test data and mock responses
 */

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up Level 3 checkout test environment...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // 1. Verify the Level 3 checkout page is accessible
    console.log('📋 Checking Level 3 checkout page accessibility...');
    await page.goto('http://localhost:3000/checkout-level3');
    
    const pageTitle = await page.locator('h1').first().textContent();
    if (!pageTitle?.includes('Level 3')) {
      throw new Error('Level 3 checkout page not accessible');
    }
    console.log('✅ Level 3 checkout page accessible');
    
    // 2. Verify CollectJS can load
    console.log('🔧 Checking CollectJS availability...');
    await page.waitForSelector('#card-number-field', { timeout: 15000 });
    
    // Wait for CollectJS script to load
    await page.waitForFunction(() => {
      return typeof window.CollectJS !== 'undefined' || 
             document.querySelector('#card-number-field iframe') !== null;
    }, { timeout: 20000 });
    console.log('✅ CollectJS loading verified');
    
    // 3. Check environment variables
    console.log('🔑 Validating environment configuration...');
    const envVars = {
      NEXT_PUBLIC_NMI_TOKENIZATION_KEY: process.env.NEXT_PUBLIC_NMI_TOKENIZATION_KEY,
      NEXT_PUBLIC_COLLECT_JS_URL: process.env.NEXT_PUBLIC_COLLECT_JS_URL,
      NMI_SECURITY_KEY: process.env.NMI_SECURITY_KEY
    };
    
    const missingVars = Object.entries(envVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);
    
    if (missingVars.length > 0) {
      console.warn('⚠️ Missing environment variables:', missingVars);
      console.warn('Some tests may fail without proper NMI configuration');
    } else {
      console.log('✅ Environment variables configured');
    }
    
    // 4. Test API endpoint accessibility
    console.log('🌐 Testing API endpoint accessibility...');
    try {
      const response = await page.request.post('http://localhost:3000/api/nmi-direct', {
        data: {
          customerInfo: {
            email: 'test@setup.com',
            firstName: 'Setup',
            lastName: 'Test',
            phone: '5551234567',
            address: '123 Setup St',
            city: 'Setup City',
            state: 'CA',
            zipCode: '12345',
            country: 'US'
          },
          paymentToken: 'setup-test-token',
          products: [{
            id: 'setup-test',
            name: 'Setup Test Product',
            price: 1.00,
            quantity: 1
          }]
        }
      });
      
      if (response.status() === 200 || response.status() === 400) {
        console.log('✅ API endpoint accessible');
      } else {
        console.warn('⚠️ API endpoint returned unexpected status:', response.status());
      }
    } catch (error) {
      console.warn('⚠️ API endpoint test failed:', error.message);
    }
    
    // 5. Set up test data storage
    console.log('💾 Setting up test data storage...');
    await page.evaluate(() => {
      // Clear any existing test data
      sessionStorage.clear();
      localStorage.clear();
      
      // Set up test flags
      sessionStorage.setItem('level3TestMode', 'true');
      sessionStorage.setItem('testStartTime', Date.now().toString());
    });
    console.log('✅ Test data storage prepared');
    
    // 6. Verify auto-fill functionality
    console.log('🤖 Testing auto-fill functionality...');
    const autoFillButton = page.locator('button:has-text("Auto-Fill Test Data")');
    if (await autoFillButton.isVisible()) {
      await autoFillButton.click();
      
      // Verify auto-fill worked
      const emailValue = await page.locator('input[name="email"]').inputValue();
      if (emailValue === 'test@example.com') {
        console.log('✅ Auto-fill functionality working');
      } else {
        console.warn('⚠️ Auto-fill may not be working correctly');
      }
    } else {
      console.warn('⚠️ Auto-fill button not found');
    }
    
    console.log('🎉 Level 3 test environment setup complete!');
    
  } catch (error) {
    console.error('❌ Level 3 setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
