const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🚀 Testing Thank You Page with All Products');
    
    // Create a test session ID
    const sessionId = `test-${Date.now()}`;
    
    // Mock the order summary API response
    await page.route('**/api/session/order-summary*', async route => {
      console.log('🎯 Intercepting order summary request');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          session: {
            id: sessionId,
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            transactionId: 'TXN123456',
            vaultId: 'VAULT123'
          },
          order: {
            products: [
              // Main product
              {
                name: 'Fitspresso',
                description: '6 Bottle Super Pack',
                image: '/assets/images/6-bottles.png',
                transactionId: 'TXN123456',
                amount: 294,
                productCode: 'FITSPRESSO_6',
                type: 'main',
                bottles: 6
              },
              // Bonus products
              {
                name: 'Bonus eBooks',
                description: 'First Time Customer',
                image: '/assets/images/bonus-ebooks.png',
                transactionId: 'BONUS',
                amount: 0,
                productCode: 'BONUS',
                type: 'bonus'
              },
              {
                name: 'Bonus Coaching Call',
                description: 'Limited Time',
                image: '/assets/images/bonus-call.png',
                transactionId: 'BONUS',
                amount: 0,
                productCode: 'BONUS',
                type: 'bonus'
              },
              // Upsell 1
              {
                name: 'RetinaClear',
                description: '12 Bottle Super Savings Bundle',
                image: '/assets/images/6-bottles.png',
                transactionId: 'TXN123457',
                amount: 296,
                productCode: 'RC12_296',
                step: 1,
                type: 'upsell',
                bottles: 12
              },
              // Upsell 2
              {
                name: 'Sightagen',
                description: '6 Bottle Super Savings Bundle',
                image: '/assets/images/6-bottles.png',
                transactionId: 'TXN123458',
                amount: 149,
                productCode: 'SA6_149',
                step: 2,
                type: 'upsell',
                bottles: 6
              }
            ],
            customer: {
              firstName: 'John',
              lastName: 'Doe',
              email: 'test@example.com',
              phone: '555-1234',
              address: '123 Test St',
              city: 'Test City',
              state: 'CA',
              zipCode: '90210'
            },
            totals: {
              subtotal: 739,
              shipping: 0,
              tax: 0,
              total: 739
            }
          }
        })
      });
    });
    
    // Navigate to thank you page
    await page.goto(`http://localhost:3000/thankyou?session=${sessionId}`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: 'test-thank-you-all-products.png', fullPage: true });
    console.log('📸 Screenshot saved: test-thank-you-all-products.png');
    
    // Verify all products are displayed
    const productElements = await page.$$('[class*="flex items-center gap-4 pb-4 border-b"]');
    console.log(`✅ Found ${productElements.length} products displayed`);
    
    // Check for specific products
    const mainProduct = await page.textContent('text=Fitspresso');
    console.log('🎁 Main product:', mainProduct ? 'Found' : 'Not found');
    
    const bonusProducts = await page.$$('text=/Bonus/');
    console.log(`🎁 Bonus products: Found ${bonusProducts.length}`);
    
    const upsell1 = await page.textContent('text=RetinaClear');
    console.log('💰 Upsell 1:', upsell1 ? 'Found' : 'Not found');
    
    const upsell2 = await page.textContent('text=Sightagen');
    console.log('💰 Upsell 2:', upsell2 ? 'Found' : 'Not found');
    
    // Check totals
    const totalElement = await page.textContent('text=USD $739.00');
    console.log('💵 Total amount:', totalElement ? 'Correct' : 'Incorrect');
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
})();