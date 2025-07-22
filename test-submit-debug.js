const { chromium } = require('playwright');

async function debugSubmit() {
  console.log('🔍 Debugging checkout form submission');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Capture ALL console messages
  page.on('console', msg => {
    console.log(`[${msg.type()}]`, msg.text());
  });
  
  try {
    await page.goto('http://localhost:3000/checkout');
    await page.waitForSelector('input[name="email"]');
    
    console.log('\n📝 Filling form...');
    await page.fill('input[name="email"]', 'debug@test.com');
    await page.fill('input[name="firstName"]', 'Debug');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="address"]', '123 Debug St');
    await page.fill('input[name="city"]', 'Test City');
    await page.fill('input[name="state"]', 'CA');
    await page.fill('input[name="zipCode"]', '12345');
    await page.fill('input[name="phone"]', '5551234567');
    await page.fill('input[name="nameOnCard"]', 'Debug Test');
    
    console.log('\n⏳ Waiting for CollectJS...');
    await page.waitForTimeout(5000);
    
    console.log('\n💳 Please manually enter test card data:');
    console.log('Card: 4111111111111111');
    console.log('Expiry: 12/25');
    console.log('CVV: 123');
    console.log('\nWaiting 20 seconds...');
    
    await page.waitForTimeout(20000);
    
    console.log('\n🚀 Clicking submit button...');
    await page.click('button[type="submit"]');
    
    console.log('\n⏳ Monitoring for 30 seconds...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugSubmit();