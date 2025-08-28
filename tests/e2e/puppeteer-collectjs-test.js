const puppeteer = require('puppeteer');

/**
 * Deep investigation of CollectJS iframe automation using Puppeteer
 * This tests various methods to automate payment field filling
 */

async function testCollectJSAutomation() {
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    args: [
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials'
    ]
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));
  
  console.log('🌐 Navigating to checkout page...');
  await page.goto('http://localhost:3255/checkout', { waitUntil: 'networkidle2' });
  
  // Wait for CollectJS to load
  await page.waitForFunction(() => window.CollectJS, { timeout: 10000 });
  console.log('✅ CollectJS loaded');
  
  // Wait for fields to be ready
  await page.waitForTimeout(3000);
  
  // Method 1: Try to access iframe directly
  console.log('\n📝 Method 1: Direct iframe access...');
  try {
    // Get all frames on the page
    const frames = page.frames();
    console.log(`Found ${frames.length} frames`);
    
    for (const frame of frames) {
      const url = frame.url();
      console.log(`Frame URL: ${url}`);
      
      if (url.includes('nmi.com') || url.includes('networkmerchants')) {
        console.log('  🎯 Found NMI iframe!');
        
        try {
          // Try to find input in the frame
          const input = await frame.$('input');
          if (input) {
            console.log('    ✅ Found input element in iframe');
            
            // Try to type in it
            await input.type('4111111111111111', { delay: 50 });
            console.log('    ✅ Typed card number!');
          } else {
            console.log('    ❌ No input found in iframe');
          }
        } catch (e) {
          console.log(`    ❌ Error accessing iframe content: ${e.message}`);
        }
      }
    }
  } catch (e) {
    console.log(`  ❌ Method 1 failed: ${e.message}`);
  }
  
  // Method 2: Try using page.evaluateHandle
  console.log('\n📝 Method 2: Using evaluateHandle...');
  try {
    const result = await page.evaluateHandle(() => {
      const container = document.querySelector('#card-number-field');
      if (container) {
        const iframe = container.querySelector('iframe');
        if (iframe) {
          try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            const input = doc.querySelector('input');
            if (input) {
              input.value = '4111111111111111';
              input.dispatchEvent(new Event('input'));
              return 'Success: Set value via evaluateHandle';
            }
            return 'Error: No input found';
          } catch (e) {
            return `Error: ${e.message}`;
          }
        }
        return 'Error: No iframe found';
      }
      return 'Error: No container found';
    });
    console.log(`  Result: ${await result.jsonValue()}`);
  } catch (e) {
    console.log(`  ❌ Method 2 failed: ${e.message}`);
  }
  
  // Method 3: Try using CDP (Chrome DevTools Protocol)
  console.log('\n📝 Method 3: Using Chrome DevTools Protocol...');
  try {
    const client = await page.target().createCDPSession();
    
    // Get all frames
    const { frameTree } = await client.send('Page.getFrameTree');
    console.log('  Frame tree:', JSON.stringify(frameTree, null, 2));
    
    // Try to execute JavaScript in each frame
    for (const frame of frameTree.childFrames || []) {
      if (frame.frame.url.includes('nmi') || frame.frame.url.includes('networkmerchants')) {
        console.log(`  Found NMI frame: ${frame.frame.url}`);
        
        try {
          const result = await client.send('Runtime.evaluate', {
            expression: `
              const input = document.querySelector('input');
              if (input) {
                input.value = '4111111111111111';
                input.dispatchEvent(new Event('input'));
                'Success';
              } else {
                'No input found';
              }
            `,
            contextId: frame.frame.id
          });
          console.log(`    Result: ${result.result.value}`);
        } catch (e) {
          console.log(`    Error: ${e.message}`);
        }
      }
    }
  } catch (e) {
    console.log(`  ❌ Method 3 failed: ${e.message}`);
  }
  
  // Method 4: Try clicking and keyboard events
  console.log('\n📝 Method 4: Simulating user interaction...');
  try {
    // Click on the card number field container
    await page.click('#card-number-field');
    await page.waitForTimeout(500);
    
    // Try typing directly
    await page.keyboard.type('4111111111111111', { delay: 100 });
    console.log('  ✅ Typed card number via keyboard');
    
    // Tab to next field
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    
    // Type expiry
    await page.keyboard.type('1225', { delay: 100 });
    console.log('  ✅ Typed expiry date via keyboard');
    
    // Tab to CVV
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    
    // Type CVV
    await page.keyboard.type('123', { delay: 100 });
    console.log('  ✅ Typed CVV via keyboard');
  } catch (e) {
    console.log(`  ❌ Method 4 failed: ${e.message}`);
  }
  
  // Method 5: Check if CollectJS has hidden methods
  console.log('\n📝 Method 5: Checking CollectJS for hidden methods...');
  try {
    const collectJSMethods = await page.evaluate(() => {
      if (window.CollectJS) {
        const methods = [];
        
        // Get all properties
        for (const key in window.CollectJS) {
          if (typeof window.CollectJS[key] === 'function') {
            methods.push(key);
          }
        }
        
        // Check prototype
        const proto = Object.getPrototypeOf(window.CollectJS);
        if (proto) {
          for (const key in proto) {
            if (typeof proto[key] === 'function') {
              methods.push(`proto.${key}`);
            }
          }
        }
        
        // Check for specific hidden methods
        const hiddenMethods = ['setValue', 'setFieldValue', 'fillField', 'populate', 
                              'prefill', 'setValues', 'updateField', 'autoFill'];
        
        for (const method of hiddenMethods) {
          if (window.CollectJS[method]) {
            methods.push(`HIDDEN: ${method}`);
            
            // Try to call it
            try {
              if (method === 'setValue' || method === 'setFieldValue') {
                window.CollectJS[method]('ccnumber', '4111111111111111');
              } else if (method === 'setValues') {
                window.CollectJS[method]({
                  ccnumber: '4111111111111111',
                  ccexp: '12/25',
                  cvv: '123'
                });
              } else {
                window.CollectJS[method]('4111111111111111');
              }
              return `Success: Called ${method}`;
            } catch (e) {
              // Method exists but failed
            }
          }
        }
        
        return methods;
      }
      return null;
    });
    
    if (collectJSMethods) {
      console.log('  CollectJS methods found:', collectJSMethods);
    } else {
      console.log('  ❌ CollectJS not found');
    }
  } catch (e) {
    console.log(`  ❌ Method 5 failed: ${e.message}`);
  }
  
  // Final check: See if any method worked
  console.log('\n🔍 Final check: Checking if any value was set...');
  await page.waitForTimeout(2000);
  
  const values = await page.evaluate(() => {
    const results = {};
    
    // Check each iframe
    ['#card-number-field', '#card-expiry-field', '#card-cvv-field'].forEach(selector => {
      const container = document.querySelector(selector);
      if (container) {
        const iframe = container.querySelector('iframe');
        if (iframe) {
          try {
            const input = iframe.contentDocument.querySelector('input');
            if (input && input.value) {
              results[selector] = input.value;
            }
          } catch (e) {
            results[selector] = 'inaccessible';
          }
        }
      }
    });
    
    return results;
  });
  
  console.log('Field values:', values);
  
  // Keep browser open for manual inspection
  console.log('\n✅ Test complete. Browser will remain open for inspection.');
  console.log('Press Ctrl+C to close.');
  
  // Wait indefinitely
  await new Promise(() => {});
}

// Run the test
testCollectJSAutomation().catch(console.error);