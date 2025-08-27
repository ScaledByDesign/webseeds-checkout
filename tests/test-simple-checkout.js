const { chromium } = require('playwright');

async function testSimpleCheckout() {
  console.log('🧪 Testing simplified checkout page with CollectJS\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 50
  });
  
  const page = await browser.newPage();
  
  // Capture console messages from the page
  page.on('console', msg => {
    const text = msg.text();
    // Only log relevant messages
    if (text.includes('[') || text.includes('CollectJS') || text.includes('Token')) {
      console.log(`[Browser] ${text}`);
    }
  });
  
  try {
    console.log('📍 Navigating to test checkout page...');
    await page.goto('http://localhost:3000/test-checkout');
    
    // Wait for the ready message in the debug logs
    console.log('\n⏳ Waiting for CollectJS to be ready...');
    await page.waitForFunction(() => {
      const logs = document.querySelector('.text-green-400');
      return logs && logs.textContent.includes('All iframes present - CollectJS is READY for input!');
    }, { timeout: 30000 });
    
    console.log('✅ CollectJS is ready!\n');
    
    // Get current status
    const status = await page.textContent('.bg-blue-50');
    console.log('📊 Current status:', status);
    
    // Test the validation button first
    console.log('\n🧪 Testing validation (before entering data)...');
    await page.click('button:has-text("Test Validation")');
    await page.waitForTimeout(1000);
    
    // Now fill the payment fields
    console.log('\n💳 Filling payment fields with delays...');
    
    // Card number
    console.log('  - Clicking card number field...');
    await page.click('#card-number');
    await page.waitForTimeout(1000);
    console.log('  - Typing card number...');
    await page.keyboard.type('4111111111111111', { delay: 100 });
    
    // Expiry
    console.log('  - Clicking expiry field...');
    await page.click('#card-expiry');
    await page.waitForTimeout(1000);
    console.log('  - Typing expiry...');
    await page.keyboard.type('1225', { delay: 100 });
    
    // CVV
    console.log('  - Clicking CVV field...');
    await page.click('#card-cvv');
    await page.waitForTimeout(1000);
    console.log('  - Typing CVV...');
    await page.keyboard.type('123', { delay: 100 });
    
    console.log('\n⏳ Waiting for fields to settle...');
    await page.waitForTimeout(3000);
    
    // Test validation again
    console.log('\n🧪 Testing validation (after entering data)...');
    await page.click('button:has-text("Test Validation")');
    await page.waitForTimeout(2000);
    
    // Check iframes
    console.log('\n🔍 Checking iframes...');
    await page.click('button:has-text("Check iFrames")');
    await page.waitForTimeout(1000);
    
    // Submit the form
    console.log('\n🚀 Submitting payment form...');
    await page.click('button:has-text("Submit Payment")');
    
    // Wait for token response
    console.log('\n⏳ Waiting for tokenization response...');
    const tokenReceived = await page.waitForFunction(() => {
      const logs = document.querySelector('.text-green-400');
      return logs && (logs.textContent.includes('TOKEN CALLBACK TRIGGERED') || logs.textContent.includes('Token received'));
    }, { timeout: 30000 }).catch(() => false);
    
    if (tokenReceived) {
      console.log('✅ Token received successfully!');
    } else {
      console.log('❌ Token not received within timeout');
      
      // Try manual tokenization
      console.log('\n🔧 Attempting manual tokenization...');
      await page.click('button:has-text("Manual Tokenize")');
      await page.waitForTimeout(5000);
    }
    
    // Get final logs
    console.log('\n📋 Final debug logs:');
    const debugLogs = await page.$$eval('.text-green-400 div', divs => 
      divs.slice(-10).map(div => div.textContent)
    );
    debugLogs.forEach(log => console.log(`  ${log}`));
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-error.png' });
    console.log('📸 Screenshot saved as test-error.png');
    
  } finally {
    console.log('\n🏁 Test complete. Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

console.log('='.repeat(60));
console.log('CollectJS Simple Test - Debug Version');
console.log('='.repeat(60));
console.log('\nThis test will:');
console.log('1. Load the simplified test checkout page');
console.log('2. Wait for CollectJS to be fully ready');
console.log('3. Test validation before and after entering data');
console.log('4. Fill payment fields with proper delays');
console.log('5. Submit the form and wait for tokenization');
console.log('6. Try manual tokenization if needed\n');

testSimpleCheckout();