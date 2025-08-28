const { chromium } = require('playwright');

async function testIframeInteraction() {
  console.log('🔍 Testing CollectJS iframe interaction\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true // Open DevTools automatically
  });
  
  const page = await browser.newPage();
  
  // Log all console messages
  page.on('console', msg => {
    if (!msg.text().includes('Web Vitals')) {
      console.log(`[Browser] ${msg.text()}`);
    }
  });
  
  try {
    console.log('📍 Navigating to checkout page...');
    await page.goto('http://localhost:3255/checkout');
    
    // Wait for checkout form to load
    console.log('\n⏳ Waiting for checkout form...');
    await page.waitForSelector('form#checkout-form', { timeout: 10000 });
    
    // Fill customer info first
    console.log('📝 Filling customer information...');
    await page.fill('input[name="email"]', 'iframe-test@example.com');
    await page.fill('input[name="nameOnCard"]', 'Iframe Test');
    await page.fill('input[name="phone"]', '5125551234');
    await page.fill('input[name="address"]', '123 Test St');
    await page.fill('input[name="city"]', 'Austin');
    await page.fill('input#state', 'TX');
    await page.fill('input[name="zip"]', '78701');
    
    // Wait for CollectJS to initialize
    console.log('\n⏳ Waiting for CollectJS to initialize...');
    await page.waitForTimeout(5000);
    
    console.log('✅ CollectJS is ready!\n');
    
    // Additional wait to ensure iframes are truly interactive
    console.log('⏰ Waiting 5 seconds for iframes to be fully interactive...');
    await page.waitForTimeout(5000);
    
    // Try different methods to interact with iframes
    console.log('\n💳 Method 1: Focus and type in iframe containers...');
    
    // Card number - try multiple approaches
    console.log('  - Attempting card number field...');
    const cardContainer = await page.$('iframe#ccnumber');
    if (cardContainer) {
      // Try clicking in different positions
      const box = await cardContainer.boundingBox();
      if (box) {
        // Click in center
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(500);
        
        // Try typing
        await page.keyboard.type('4111111111111111', { delay: 150 });
        await page.waitForTimeout(1000);
      }
    }
    
    // Tab to next field
    console.log('  - Tabbing to expiry field...');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.keyboard.type('1225', { delay: 150 });
    await page.waitForTimeout(1000);
    
    // Tab to CVV
    console.log('  - Tabbing to CVV field...');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.keyboard.type('123', { delay: 150 });
    await page.waitForTimeout(1000);
    
    // Check validation
    console.log('\n🧪 Checking field validation...');
    await page.click('button:has-text("Test Validation")');
    await page.waitForTimeout(2000);
    
    // Get debug logs to see validation status
    const logs = await page.$$eval('.text-green-400 div', divs => 
      divs.slice(-5).map(div => div.textContent)
    );
    console.log('\nRecent logs:');
    logs.forEach(log => console.log(`  ${log}`));
    
    // If fields are still empty, try manual approach
    console.log('\n💡 MANUAL STEPS REQUIRED:');
    console.log('1. Click directly inside each iframe field');
    console.log('2. Type the test data:');
    console.log('   - Card: 4111111111111111');
    console.log('   - Expiry: 12/25');
    console.log('   - CVV: 123');
    console.log('3. Click "Test Validation" to verify fields are filled');
    console.log('4. Click "Submit Payment" to trigger tokenization');
    console.log('\nWaiting 30 seconds for manual input...\n');
    
    await page.waitForTimeout(30000);
    
    // Check if token was received
    const tokenReceived = await page.evaluate(() => {
      const logs = document.querySelector('.text-green-400');
      return logs && logs.textContent.includes('Token received');
    });
    
    if (tokenReceived) {
      console.log('✅ SUCCESS! Token was received!');
    } else {
      console.log('❌ No token received');
      console.log('\n🔧 Trying manual tokenization...');
      await page.click('button:has-text("Manual Tokenize")');
      await page.waitForTimeout(5000);
    }
    
    // Get final logs
    const finalLogs = await page.$$eval('.text-green-400 div', divs => 
      divs.slice(-10).map(div => div.textContent)
    );
    console.log('\n📋 Final debug logs:');
    finalLogs.forEach(log => console.log(`  ${log}`));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    console.log('\n🏁 Test complete. Check browser DevTools for more details.');
    console.log('Browser will remain open. Close manually when done.');
    
    // Keep browser open for manual inspection
    await new Promise(() => {});
  }
}

console.log('='.repeat(60));
console.log('CollectJS Iframe Interaction Test');
console.log('='.repeat(60));
console.log('\nThis test will:');
console.log('1. Open browser with DevTools');
console.log('2. Try automated iframe interaction');
console.log('3. Provide manual testing instructions');
console.log('4. Keep browser open for inspection\n');

testIframeInteraction();