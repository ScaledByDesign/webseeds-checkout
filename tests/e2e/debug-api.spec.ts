import { test, expect } from '@playwright/test';

/**
 * Debug API Test
 * Captures actual network requests to understand validation errors
 */

test.describe('Debug API Requests', () => {
  test('should capture and analyze checkout API request', async ({ page }) => {
    console.log('🔍 Starting API debugging test...');
    
    // Capture network requests
    const requests: Array<{url: string, method: string, postData: string}> = [];
    
    page.on('request', (request) => {
      if (request.url().includes('/api/test-checkout')) {
        console.log('📤 API Request captured:', {
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        });
        
        requests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData() || ''
        });
      }
    });
    
    page.on('response', async (response) => {
      if (response.url().includes('/api/test-checkout')) {
        console.log('📥 API Response captured:', {
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
        
        try {
          const responseBody = await response.text();
          console.log('📄 Response Body:', responseBody);
        } catch (error) {
          console.log('❌ Could not read response body:', error);
        }
      }
    });
    
    // Navigate to checkout
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    // Fill the form
    await page.fill('input[name="email"]', 'debug@test.com');
    await page.fill('input[name="firstName"]', 'Debug');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="address"]', '123 Debug St');
    await page.fill('input[name="city"]', 'Debug City');
    await page.fill('input[name="state"]', 'CA');
    await page.fill('input[name="zipCode"]', '12345');
    await page.fill('input[name="phone"]', '5551234567');
    await page.fill('input[name="nameOnCard"]', 'Debug Test');
    
    // Wait for CollectJS
    await page.waitForFunction(() => window.CollectJS != null, { timeout: 30000 });
    await page.waitForTimeout(3000);
    
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
    
    // Submit form and wait for request
    console.log('🚀 Submitting form...');
    await page.click('button[type="submit"]:not([disabled])');
    
    // Wait for the API request to be made
    await page.waitForTimeout(5000);
    
    // Analyze the captured requests
    console.log('📊 Analysis:');
    console.log(`Captured ${requests.length} requests`);
    
    if (requests.length > 0) {
      const request = requests[0];
      console.log('Request details:', request);
      
      if (request.postData) {
        try {
          const parsedData = JSON.parse(request.postData);
          console.log('Parsed request data:', JSON.stringify(parsedData, null, 2));
          
          // Check for missing fields
          if (!parsedData.paymentToken) {
            console.log('❌ ISSUE: paymentToken is missing or empty!');
          }
          if (!parsedData.customerInfo) {
            console.log('❌ ISSUE: customerInfo is missing!');
          }
          if (!parsedData.products) {
            console.log('❌ ISSUE: products array is missing!');
          }
        } catch (error) {
          console.log('❌ Could not parse request data:', error);
        }
      }
    } else {
      console.log('❌ No requests captured - form submission may have failed');
    }
    
    // This test always passes - it's just for debugging
    expect(true).toBe(true);
  });
});