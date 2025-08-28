const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Debugging form data state issue...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Track console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('📤') || text.includes('📋') || text.includes('Form data')) {
      console.log('📌 PAGE LOG:', text);
    }
  });
  
  // Track API requests
  page.on('request', request => {
    if (request.url().includes('/api/checkout/process')) {
      console.log('📡 API REQUEST BODY:');
      try {
        const body = JSON.parse(request.postData() || '{}');
        console.log('📦 customerInfo:', JSON.stringify(body.customerInfo, null, 2));
      } catch (e) {
        console.log('📦 Raw body:', request.postData()?.substring(0, 500));
      }
    }
  });
  
  try {
    await page.goto('http://localhost:3255/checkout');
    await page.waitForSelector('form#checkout-form', { timeout: 10000 });
    console.log('✅ Checkout form loaded');
    
    // Fill form data
    console.log('📝 Filling form data...');
    await page.locator('input[name="email"]').fill('debug@test.com');
    await page.locator('input[name="nameOnCard"]').fill('Debug User');
    await page.locator('input[name="phone"]').fill('5551234567');
    await page.locator('input[name="address"]').fill('123 Debug Street');
    await page.locator('input[name="city"]').fill('Debug City');
    await page.locator('input#state').fill('CA');
    await page.locator('input[name="zip"]').fill('90210');
    
    // Wait for React state to update
    await page.waitForTimeout(1000);
    
    // Check form data state in React
    console.log('\n🔍 Checking React form state...');
    const reactState = await page.evaluate(() => {
      // Try to access React component state
      const form = document.querySelector('form#checkout-form');
      if (form && form._reactInternalFiber) {
        // This is a hack to access React state - may not work in all versions
        return 'React state access not available';
      }
      
      // Check DOM values
      const domValues = {};
      ['email', 'nameOnCard', 'phone', 'address', 'city', 'zip'].forEach(name => {
        const input = document.querySelector(`input[name="${name}"]`);
        if (input) {
          domValues[name] = input.value;
        }
      });
      const stateInput = document.querySelector('input#state');
      if (stateInput) {
        domValues.state = stateInput.value;
      }
      
      return domValues;
    });
    
    console.log('📊 DOM Values:', reactState);
    
    // Wait for CollectJS and fill payment info
    console.log('\n💳 Waiting for CollectJS...');
    await page.waitForTimeout(3000);
    
    try {
      const cardNumberFrame = page.frameLocator('#card-number-field iframe');
      await cardNumberFrame.locator('input#ccnumber').fill('4111111111111111');
      
      const expiryFrame = page.frameLocator('#card-expiry-field iframe');
      await expiryFrame.locator('input#ccexp').fill('12/25');
      
      const cvvFrame = page.frameLocator('#card-cvv-field iframe');
      await cvvFrame.locator('input#cvv').fill('123');
      
      console.log('✅ Payment fields filled');
    } catch (error) {
      console.log('⚠️ Could not fill payment fields:', error.message);
    }
    
    // Check form state again before submission
    console.log('\n🔍 Final form state check...');
    const finalState = await page.evaluate(() => {
      const values = {};
      ['email', 'nameOnCard', 'phone', 'address', 'city', 'zip'].forEach(name => {
        const input = document.querySelector(`input[name="${name}"]`);
        if (input) {
          values[name] = {
            value: input.value,
            hasAttribute: input.hasAttribute('value'),
            getAttribute: input.getAttribute('value')
          };
        }
      });
      const stateInput = document.querySelector('input#state');
      if (stateInput) {
        values.state = {
          value: stateInput.value,
          hasAttribute: stateInput.hasAttribute('value'),
          getAttribute: stateInput.getAttribute('value')
        };
      }
      return values;
    });
    
    console.log('📊 Final State Analysis:');
    Object.entries(finalState).forEach(([field, info]) => {
      console.log(`  ${field}: "${info.value}" (attr: ${info.getAttribute})`);
    });
    
    // Try to submit
    console.log('\n🚀 Attempting submission...');
    const submitButton = page.locator('button:has-text("Complete Order"), button:has-text("Place Your Order")').first();
    
    if (await submitButton.isDisabled()) {
      console.log('❌ Submit button is disabled');
      const errors = await page.locator('.text-red-500, .error-message').allTextContents();
      console.log('Validation errors:', errors);
    } else {
      console.log('✅ Submit button is enabled - clicking...');
      await submitButton.click();
      
      // Wait a bit to see the API request
      await page.waitForTimeout(5000);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
    await page.screenshot({ path: 'debug-error.png' });
  } finally {
    console.log('\n🏁 Debug completed. Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
})();
