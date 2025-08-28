const { chromium } = require('playwright');

async function debugCollectJS() {
  console.log('🔍 Deep debugging CollectJS integration');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Capture ALL console messages
  page.on('console', msg => {
    console.log(`[${msg.type()}]`, msg.text());
  });
  
  // Monitor network requests to NMI
  page.on('request', request => {
    if (request.url().includes('nmi.com')) {
      console.log('🌐 NMI Request:', request.method(), request.url());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('nmi.com')) {
      console.log(`📡 NMI Response: ${response.status()} ${response.url()}`);
    }
  });
  
  try {
    await page.goto('http://localhost:3000/checkout');
    await page.waitForSelector('input[name="email"]');
    
    console.log('\n📝 Filling form...');
    await page.fill('input[name="email"]', 'collectjs@debug.com');
    await page.fill('input[name="firstName"]', 'CollectJS');
    await page.fill('input[name="lastName"]', 'Debug');
    await page.fill('input[name="address"]', '123 Debug St');
    await page.fill('input[name="city"]', 'Test City');
    await page.fill('input[name="state"]', 'CA');
    await page.fill('input[name="zipCode"]', '12345');
    await page.fill('input[name="phone"]', '5551234567');
    await page.fill('input[name="nameOnCard"]', 'CollectJS Debug');
    
    console.log('\n⏳ Waiting for CollectJS to load...');
    await page.waitForTimeout(7000);
    
    // Check if CollectJS is available
    const collectJSStatus = await page.evaluate(() => {
      if (typeof window.CollectJS === 'undefined') {
        return { loaded: false };
      }
      
      return {
        loaded: true,
        hasStartPaymentRequest: typeof window.CollectJS.startPaymentRequest === 'function',
        hasTokenize: typeof window.CollectJS.tokenize === 'function',
        hasSubmit: typeof window.CollectJS.submit === 'function',
      };
    });
    
    console.log('\n📊 CollectJS Status:', collectJSStatus);
    
    // Check for iframes
    const iframeCount = await page.evaluate(() => {
      const cardIframe = document.querySelector('#card-number-field iframe');
      const expiryIframe = document.querySelector('#card-expiry-field iframe');
      const cvvIframe = document.querySelector('#card-cvv-field iframe');
      
      return {
        card: cardIframe ? 'present' : 'missing',
        expiry: expiryIframe ? 'present' : 'missing',
        cvv: cvvIframe ? 'present' : 'missing',
        cardSrc: cardIframe ? cardIframe.src : null,
        expirySrc: expiryIframe ? expiryIframe.src : null,
        cvvSrc: cvvIframe ? cvvIframe.src : null
      };
    });
    
    console.log('\n🖼️ CollectJS iFrames:', iframeCount);
    
    console.log('\n💳 Please manually enter test card data:');
    console.log('1. Click in Card Number field and type: 4111111111111111');
    console.log('2. Click in Expiry field and type: 12/25 or 1225');
    console.log('3. Click in CVV field and type: 123');
    console.log('\nWaiting 20 seconds for manual entry...');
    
    await page.waitForTimeout(20000);
    
    // Check validation status if possible
    const validationStatus = await page.evaluate(() => {
      if (window.CollectJS && typeof window.CollectJS.isValid === 'function') {
        return {
          ccnumber: window.CollectJS.isValid('ccnumber'),
          ccexp: window.CollectJS.isValid('ccexp'),
          cvv: window.CollectJS.isValid('cvv')
        };
      }
      return { message: 'isValid function not available' };
    });
    
    console.log('\n✅ Field Validation Status:', validationStatus);
    
    console.log('\n🚀 Clicking submit button...');
    await page.click('button[type="submit"]');
    
    console.log('\n⏳ Monitoring for tokenization response for 15 seconds...');
    
    // Also try manual tokenization after 5 seconds
    setTimeout(async () => {
      console.log('\n🔧 Attempting manual tokenization...');
      const manualResult = await page.evaluate(() => {
        if (window.CollectJS) {
          try {
            window.CollectJS.startPaymentRequest();
            return 'Manual tokenization triggered';
          } catch (e) {
            return `Error: ${e.message}`;
          }
        }
        return 'CollectJS not available';
      });
      console.log('Manual tokenization result:', manualResult);
    }, 5000);
    
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    console.log('\n📊 Test complete. Check console output for tokenization callbacks.');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

debugCollectJS();