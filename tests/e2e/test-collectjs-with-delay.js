const { chromium } = require('playwright');

async function testCollectJSWithDelay() {
  console.log('🔍 Testing CollectJS with proper iframe loading delays');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 // Slow down actions by 100ms
  });
  const page = await browser.newPage();
  
  // Capture console messages
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('PaymentRequestAbstraction')) {
      console.log(`❌ Console Error:`, msg.text());
    } else if (msg.text().includes('CollectJS') || msg.text().includes('Token') || msg.text().includes('validation')) {
      console.log(`[${msg.type()}]`, msg.text());
    }
  });
  
  try {
    console.log('📍 Navigating to checkout page...');
    await page.goto('http://localhost:3000/checkout');
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    
    console.log('\n📝 Filling customer information...');
    await page.fill('input[name="email"]', 'test@collectjs.com');
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="address"]', '123 Test Street');
    await page.fill('input[name="city"]', 'Test City');
    await page.fill('input[name="state"]', 'CA');
    await page.fill('input[name="zipCode"]', '12345');
    await page.fill('input[name="phone"]', '5551234567');
    await page.fill('input[name="nameOnCard"]', 'John Test');
    
    console.log('\n⏳ Waiting for CollectJS to fully initialize...');
    
    // Wait for the "Loading secure payment system..." message to disappear
    await page.waitForFunction(() => {
      const loadingMsgs = Array.from(document.querySelectorAll('p'));
      const loadingMsg = loadingMsgs.find(p => p.textContent.includes('Loading secure payment system'));
      return !loadingMsg || loadingMsg.style.display === 'none';
    }, { timeout: 30000 });
    
    // Wait for CollectJS fields to be ready
    await page.waitForFunction(() => {
      return window.CollectJS && typeof window.CollectJS.startPaymentRequest === 'function';
    }, { timeout: 30000 });
    
    console.log('✅ CollectJS is loaded');
    
    // Wait for iframes to be present and loaded
    console.log('\n🖼️ Waiting for payment field iframes...');
    
    // Wait for all three iframes
    await page.waitForSelector('#card-number-field iframe', { timeout: 30000 });
    await page.waitForSelector('#card-expiry-field iframe', { timeout: 30000 });
    await page.waitForSelector('#card-cvv-field iframe', { timeout: 30000 });
    
    console.log('✅ All iframes are present');
    
    // Additional delay to ensure iframes are fully loaded
    console.log('\n⏰ Waiting 5 seconds for iframes to fully initialize...');
    await page.waitForTimeout(5000);
    
    // Get iframe details
    const iframeInfo = await page.evaluate(() => {
      const getIframeInfo = (selector) => {
        const container = document.querySelector(selector);
        const iframe = container ? container.querySelector('iframe') : null;
        if (!iframe) return null;
        
        return {
          src: iframe.src,
          loaded: iframe.contentDocument !== null || iframe.contentWindow !== null,
          dimensions: {
            width: iframe.offsetWidth,
            height: iframe.offsetHeight
          }
        };
      };
      
      return {
        cardNumber: getIframeInfo('#card-number-field'),
        expiry: getIframeInfo('#card-expiry-field'),
        cvv: getIframeInfo('#card-cvv-field')
      };
    });
    
    console.log('\n📊 Iframe Status:');
    console.log('Card Number:', iframeInfo.cardNumber);
    console.log('Expiry:', iframeInfo.expiry);
    console.log('CVV:', iframeInfo.cvv);
    
    // Try to interact with the iframes
    console.log('\n💳 Attempting to fill payment fields...');
    
    // Method 1: Click and type in the container divs
    console.log('Method 1: Clicking containers and typing...');
    
    // Card number
    const cardContainer = await page.$('#card-number-field');
    if (cardContainer) {
      await cardContainer.click();
      await page.waitForTimeout(500);
      await page.keyboard.type('4111111111111111', { delay: 100 });
    }
    
    // Expiry
    const expiryContainer = await page.$('#card-expiry-field');
    if (expiryContainer) {
      await expiryContainer.click();
      await page.waitForTimeout(500);
      await page.keyboard.type('1225', { delay: 100 });
    }
    
    // CVV
    const cvvContainer = await page.$('#card-cvv-field');
    if (cvvContainer) {
      await cvvContainer.click();
      await page.waitForTimeout(500);
      await page.keyboard.type('123', { delay: 100 });
    }
    
    console.log('\n⏳ Waiting 3 seconds for field validation...');
    await page.waitForTimeout(3000);
    
    // Check if we can validate the fields
    const validationCheck = await page.evaluate(() => {
      if (!window.CollectJS) return { error: 'CollectJS not available' };
      
      try {
        return {
          hasIsValid: typeof window.CollectJS.isValid === 'function',
          ccnumberValid: typeof window.CollectJS.isValid === 'function' ? window.CollectJS.isValid('ccnumber') : 'N/A',
          ccexpValid: typeof window.CollectJS.isValid === 'function' ? window.CollectJS.isValid('ccexp') : 'N/A',
          cvvValid: typeof window.CollectJS.isValid === 'function' ? window.CollectJS.isValid('cvv') : 'N/A'
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    console.log('\n✅ Validation Status:', validationCheck);
    
    // Submit the form
    console.log('\n🚀 Clicking submit button...');
    await page.click('button[type="submit"]');
    
    console.log('\n⏳ Waiting for tokenization (monitoring for 15 seconds)...');
    
    // Monitor for any network activity or console logs
    const startTime = Date.now();
    while (Date.now() - startTime < 15000) {
      await page.waitForTimeout(1000);
      
      // Check if we're redirected or if there's an error message
      const currentUrl = page.url();
      if (currentUrl.includes('/upsell')) {
        console.log('✅ SUCCESS! Redirected to upsell page:', currentUrl);
        break;
      }
      
      const errorElement = await page.$('.text-red-800');
      if (errorElement) {
        const errorText = await errorElement.textContent();
        console.log('❌ Error displayed:', errorText);
      }
    }
    
    // Try manual tokenization as a fallback
    console.log('\n🔧 Attempting manual tokenization...');
    const manualTokenization = await page.evaluate(() => {
      if (!window.CollectJS) return { error: 'CollectJS not available' };
      
      try {
        console.log('Calling CollectJS.startPaymentRequest()...');
        window.CollectJS.startPaymentRequest();
        return { success: true, message: 'Manual tokenization triggered' };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    console.log('Manual tokenization result:', manualTokenization);
    
    // Wait a bit more to see if anything happens
    await page.waitForTimeout(5000);
    
    // Final status check
    const finalUrl = page.url();
    console.log('\n📊 Final Status:');
    console.log('Current URL:', finalUrl);
    console.log('Success:', finalUrl.includes('/upsell') ? 'Yes - redirected to upsell!' : 'No - still on checkout');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    console.log('\n🏁 Test complete. Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// Add helper function to wait for iframe content
async function waitForIframeContent(page, selector) {
  await page.waitForFunction((sel) => {
    const container = document.querySelector(sel);
    if (!container) return false;
    const iframe = container.querySelector('iframe');
    if (!iframe) return false;
    
    try {
      // Check if iframe has loaded content
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      return doc && doc.body && doc.body.innerHTML.length > 0;
    } catch (e) {
      // Cross-origin, but iframe exists
      return true;
    }
  }, selector, { timeout: 30000 });
}

console.log('🚀 Starting CollectJS test with proper delays...');
console.log('This test will:');
console.log('1. Fill customer information');
console.log('2. Wait for CollectJS to fully load');
console.log('3. Wait for iframes to be ready');
console.log('4. Attempt to fill payment fields');
console.log('5. Submit the form');
console.log('6. Monitor for tokenization response\n');

testCollectJSWithDelay();