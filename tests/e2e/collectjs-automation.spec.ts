import { test, expect, Frame } from '@playwright/test';

/**
 * Deep investigation of CollectJS iframe automation possibilities
 * Testing various methods to programmatically fill payment fields
 */

test.describe('CollectJS Automation Investigation', () => {
  test.setTimeout(60000); // 1 minute timeout
  
  test('investigate all possible automation methods', async ({ page, context }) => {
    // Enable console logging
    page.on('console', msg => console.log('PAGE:', msg.text()));
    page.on('pageerror', err => console.log('ERROR:', err));
    
    console.log('🌐 Navigating to checkout page...');
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    // Wait for CollectJS to load
    await page.waitForFunction(() => window.CollectJS != null, { timeout: 10000 });
    console.log('✅ CollectJS loaded');
    
    // Give time for iframes to initialize
    await page.waitForTimeout(3000);
    
    // Method 1: Direct frame access
    console.log('\n📝 Method 1: Direct frame access...');
    try {
      const frames = page.frames();
      console.log(`  Found ${frames.length} frames total`);
      
      for (const frame of frames) {
        const url = frame.url();
        if (url.includes('nmi') || url.includes('networkmerchants') || url.includes('secure')) {
          console.log(`  🎯 Found payment frame: ${url.substring(0, 50)}...`);
          
          try {
            // Try to find and fill input
            const input = await frame.locator('input').first();
            if (await input.count() > 0) {
              await input.fill('4111111111111111');
              console.log('    ✅ Filled card number via frame!');
            }
          } catch (e) {
            console.log(`    ❌ Cannot access frame content: ${e.message}`);
          }
        }
      }
    } catch (e) {
      console.log(`  ❌ Method 1 failed: ${e.message}`);
    }
    
    // Method 2: Frame locator approach
    console.log('\n📝 Method 2: Frame locator approach...');
    try {
      const cardFrame = page.frameLocator('#card-number-field iframe');
      const cardInput = cardFrame.locator('input');
      
      if (await cardInput.count() > 0) {
        await cardInput.fill('4111111111111111');
        console.log('  ✅ Filled via frameLocator!');
      } else {
        console.log('  ❌ No input found in frame');
      }
    } catch (e) {
      console.log(`  ❌ Method 2 failed: ${e.message}`);
    }
    
    // Method 3: Evaluate in page context
    console.log('\n📝 Method 3: Page evaluate with iframe access...');
    const evalResult = await page.evaluate(() => {
      const results = [];
      
      const containers = ['#card-number-field', '#card-expiry-field', '#card-cvv-field'];
      containers.forEach(selector => {
        const container = document.querySelector(selector);
        if (container) {
          const iframe = container.querySelector('iframe') as HTMLIFrameElement;
          if (iframe) {
            try {
              // Try different access methods
              const methods = [
                () => iframe.contentWindow?.document,
                () => iframe.contentDocument,
                () => (iframe as any).document
              ];
              
              for (const method of methods) {
                try {
                  const doc = method();
                  if (doc) {
                    const input = doc.querySelector('input') as HTMLInputElement;
                    if (input) {
                      input.value = '4111111111111111';
                      input.dispatchEvent(new Event('input', { bubbles: true }));
                      input.dispatchEvent(new Event('change', { bubbles: true }));
                      results.push(`${selector}: Success via ${method.toString().substring(0, 30)}`);
                      break;
                    }
                  }
                } catch (e) {
                  // Try next method
                }
              }
            } catch (e) {
              results.push(`${selector}: Blocked - ${e.message}`);
            }
          }
        }
      });
      
      return results;
    });
    console.log('  Results:', evalResult);
    
    // Method 4: Click and type approach
    console.log('\n📝 Method 4: Click container and type...');
    try {
      // Click on the card number field container
      const cardContainer = page.locator('#card-number-field');
      await cardContainer.click();
      await page.waitForTimeout(500);
      
      // Try typing
      await page.keyboard.type('4111111111111111', { delay: 50 });
      console.log('  ✅ Typed card number');
      
      // Tab to expiry
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);
      await page.keyboard.type('1225', { delay: 50 });
      console.log('  ✅ Typed expiry');
      
      // Tab to CVV
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);
      await page.keyboard.type('123', { delay: 50 });
      console.log('  ✅ Typed CVV');
    } catch (e) {
      console.log(`  ❌ Method 4 failed: ${e.message}`);
    }
    
    // Method 5: Check CollectJS API
    console.log('\n📝 Method 5: Investigating CollectJS API...');
    const collectJSInfo = await page.evaluate(() => {
      if (!window.CollectJS) return null;
      
      const info: any = {
        properties: [],
        methods: [],
        hiddenMethods: []
      };
      
      // Get all properties
      for (const key in window.CollectJS) {
        const type = typeof window.CollectJS[key];
        if (type === 'function') {
          info.methods.push(key);
        } else {
          info.properties.push({ key, type, value: type === 'object' ? 'object' : window.CollectJS[key] });
        }
      }
      
      // Check for specific hidden methods
      const potentialMethods = [
        'setValue', 'setFieldValue', 'fillField', 'populate', 'prefill',
        'setValues', 'updateField', 'updateValue', 'autoFill', 'fill',
        'setField', 'updateFields', 'populateField', 'injectValue'
      ];
      
      for (const method of potentialMethods) {
        if (window.CollectJS[method]) {
          info.hiddenMethods.push(method);
          
          // Try to use it
          try {
            if (method.includes('Value') || method.includes('Field')) {
              (window.CollectJS as any)[method]('ccnumber', '4111111111111111');
            } else if (method.includes('Values') || method.includes('Fields')) {
              (window.CollectJS as any)[method]({
                ccnumber: '4111111111111111',
                ccexp: '1225',
                cvv: '123'
              });
            }
          } catch (e) {
            // Method exists but threw error
          }
        }
      }
      
      return info;
    });
    
    if (collectJSInfo) {
      console.log('  CollectJS properties:', collectJSInfo.properties);
      console.log('  CollectJS methods:', collectJSInfo.methods);
      if (collectJSInfo.hiddenMethods.length > 0) {
        console.log('  🎯 Hidden methods found:', collectJSInfo.hiddenMethods);
      }
    }
    
    // Method 6: Browser context permissions
    console.log('\n📝 Method 6: Trying with relaxed permissions...');
    try {
      // Grant permissions
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      
      // Try to paste into field
      await page.locator('#card-number-field').click();
      await page.evaluate(() => navigator.clipboard.writeText('4111111111111111'));
      await page.keyboard.press('Control+V');
      console.log('  Attempted clipboard paste');
    } catch (e) {
      console.log(`  ❌ Method 6 failed: ${e.message}`);
    }
    
    // Method 7: CDP (Chrome DevTools Protocol)
    console.log('\n📝 Method 7: Using CDP for low-level access...');
    try {
      const client = await context.newCDPSession(page);
      
      // Enable necessary domains
      await client.send('DOM.enable');
      await client.send('Runtime.enable');
      
      // Get document
      const { root } = await client.send('DOM.getDocument');
      
      // Query for iframe
      const { nodeIds } = await client.send('DOM.querySelectorAll', {
        nodeId: root.nodeId,
        selector: '#card-number-field iframe'
      });
      
      if (nodeIds.length > 0) {
        console.log(`  Found ${nodeIds.length} iframe(s) via CDP`);
        
        // Try to get frame info
        const { node } = await client.send('DOM.describeNode', {
          nodeId: nodeIds[0]
        });
        
        if (node.frameId) {
          console.log(`  Frame ID: ${node.frameId}`);
          
          // Try to evaluate in frame context
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
              contextId: node.frameId
            });
            console.log(`  CDP Result: ${result.result.value}`);
          } catch (e) {
            console.log(`  CDP evaluation failed: ${e.message}`);
          }
        }
      }
    } catch (e) {
      console.log(`  ❌ Method 7 failed: ${e.message}`);
    }
    
    // Final verification
    console.log('\n🔍 Final verification: Checking field values...');
    await page.waitForTimeout(2000);
    
    const verification = await page.evaluate(() => {
      const results: any = {};
      
      // Check if any values were set
      ['#card-number-field', '#card-expiry-field', '#card-cvv-field'].forEach(selector => {
        const container = document.querySelector(selector);
        if (container) {
          const iframe = container.querySelector('iframe') as HTMLIFrameElement;
          if (iframe) {
            results[selector] = {
              hasIframe: true,
              iframeSrc: iframe.src?.substring(0, 50),
              accessible: false,
              value: null
            };
            
            try {
              const doc = iframe.contentDocument || iframe.contentWindow?.document;
              if (doc) {
                const input = doc.querySelector('input') as HTMLInputElement;
                if (input) {
                  results[selector].accessible = true;
                  results[selector].value = input.value || 'empty';
                }
              }
            } catch (e) {
              results[selector].error = e.message;
            }
          }
        }
      });
      
      return results;
    });
    
    console.log('\nVerification results:', JSON.stringify(verification, null, 2));
    
    // Check which method succeeded
    const successfulMethods = [];
    for (const [field, data] of Object.entries(verification)) {
      if ((data as any).value && (data as any).value !== 'empty') {
        successfulMethods.push(field);
      }
    }
    
    if (successfulMethods.length > 0) {
      console.log('\n✅ SUCCESS! Fields populated:', successfulMethods);
    } else {
      console.log('\n❌ No method succeeded in populating the fields programmatically.');
      console.log('This is expected due to PCI compliance security measures.');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'collectjs-automation-test.png', fullPage: true });
    console.log('📸 Screenshot saved: collectjs-automation-test.png');
    
    // Keep page open for manual inspection
    console.log('\n⏸️ Pausing for manual inspection...');
    await page.waitForTimeout(10000);
  });
});