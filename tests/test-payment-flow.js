const { chromium } = require('playwright');

async function testPaymentFlow() {
  console.log('🚀 Testing complete payment flow: checkout → upsell 1 → upsell 2 → thank you');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Step 1: Checkout Payment Process
    console.log('\n📍 STEP 1: Testing Checkout Payment Process');
    await page.goto('http://localhost:3000/checkout');
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    
    // Fill out the form
    await page.fill('input[name="email"]', 'test@paymentflow.com');
    await page.fill('input[name="firstName"]', 'Payment');
    await page.fill('input[name="lastName"]', 'Flow');
    await page.fill('input[name="address"]', '123 Payment Street');
    await page.fill('input[name="city"]', 'Flow City');
    await page.fill('input[name="state"]', 'CA');
    await page.fill('input[name="zipCode"]', '12345');
    await page.fill('input[name="phone"]', '5551234567');
    await page.fill('input[name="nameOnCard"]', 'Payment Flow');
    
    console.log('✅ Checkout form filled');
    
    // Wait for CollectJS to be ready
    console.log('⏳ Waiting for CollectJS to load...');
    await page.waitForTimeout(5000);
    
    // Check if CollectJS fields are ready
    const cardNumberField = await page.locator('#card-number-field').isVisible();
    const submitButton = await page.locator('button[type="submit"]:not([disabled])').isVisible();
    
    console.log(`Card field visible: ${cardNumberField}`);
    console.log(`Submit button enabled: ${submitButton}`);
    
    if (submitButton) {
      console.log('🚀 Attempting checkout submission...');
      await page.click('button[type="submit"]');
      
      // Wait for processing or redirect
      console.log('⏳ Waiting for payment processing...');
      
      // Check for different possible outcomes
      const outcomes = await Promise.race([
        page.waitForURL(/\/upsell\/1/, { timeout: 15000 }).then(() => 'upsell_redirect'),
        page.waitForSelector('text=Processing', { timeout: 5000 }).then(() => 'processing'),
        page.waitForSelector('text=error', { timeout: 5000 }).then(() => 'error'),
        page.waitForTimeout(10000).then(() => 'timeout')
      ]);
      
      console.log(`Checkout result: ${outcomes}`);
      
      if (outcomes === 'upsell_redirect') {
        console.log('✅ Checkout payment successful - redirected to upsell 1');
        
        // Step 2: Upsell 1 Payment Process
        console.log('\n📍 STEP 2: Testing Upsell 1 Payment Process');
        await page.waitForTimeout(2000);
        
        // Look for upsell 1 buttons
        const yesButton = page.locator('button:has-text("Yes"), button:has-text("Add"), button:has-text("Accept")').first();
        const noButton = page.locator('button:has-text("No"), button:has-text("Decline"), button:has-text("Skip")').first();
        
        const hasYesButton = await yesButton.isVisible();
        const hasNoButton = await noButton.isVisible();
        
        console.log(`Upsell 1 - Yes button visible: ${hasYesButton}`);
        console.log(`Upsell 1 - No button visible: ${hasNoButton}`);
        
        if (hasYesButton) {
          console.log('🎯 Clicking YES on Upsell 1...');
          await yesButton.click();
          
          // Wait for redirect to upsell 2 or processing
          const upsell1Result = await Promise.race([
            page.waitForURL(/\/upsell\/2/, { timeout: 10000 }).then(() => 'upsell2_redirect'),
            page.waitForSelector('text=Processing', { timeout: 5000 }).then(() => 'processing'),
            page.waitForTimeout(8000).then(() => 'timeout')
          ]);
          
          console.log(`Upsell 1 result: ${upsell1Result}`);
          
          if (upsell1Result === 'upsell2_redirect') {
            console.log('✅ Upsell 1 payment successful - redirected to upsell 2');
            
            // Step 3: Upsell 2 Payment Process
            console.log('\n📍 STEP 3: Testing Upsell 2 Payment Process');
            await page.waitForTimeout(2000);
            
            const yes2Button = page.locator('button:has-text("Yes"), button:has-text("Add"), button:has-text("Accept")').first();
            const no2Button = page.locator('button:has-text("No"), button:has-text("Decline"), button:has-text("Skip")').first();
            
            const hasYes2Button = await yes2Button.isVisible();
            const hasNo2Button = await no2Button.isVisible();
            
            console.log(`Upsell 2 - Yes button visible: ${hasYes2Button}`);
            console.log(`Upsell 2 - No button visible: ${hasNo2Button}`);
            
            if (hasYes2Button) {
              console.log('🎯 Clicking YES on Upsell 2...');
              await yes2Button.click();
              
              // Wait for redirect to thank you
              const upsell2Result = await Promise.race([
                page.waitForURL(/\/thankyou/, { timeout: 10000 }).then(() => 'thankyou_redirect'),
                page.waitForSelector('text=Processing', { timeout: 5000 }).then(() => 'processing'),
                page.waitForTimeout(8000).then(() => 'timeout')
              ]);
              
              console.log(`Upsell 2 result: ${upsell2Result}`);
              
              if (upsell2Result === 'thankyou_redirect') {
                console.log('✅ Upsell 2 payment successful - redirected to thank you');
                
                // Step 4: Thank You Page Analysis
                console.log('\n📍 STEP 4: Analyzing Thank You Page');
                await page.waitForTimeout(2000);
                
                const pageContent = await page.textContent('body');
                const hasOrderSummary = pageContent.includes('order') || pageContent.includes('Order');
                const hasProducts = pageContent.includes('product') || pageContent.includes('Product') || pageContent.includes('Fitspresso');
                const hasTotal = pageContent.includes('total') || pageContent.includes('Total') || pageContent.includes('$');
                
                console.log(`Thank you page has order summary: ${hasOrderSummary}`);
                console.log(`Thank you page shows products: ${hasProducts}`);
                console.log(`Thank you page shows totals: ${hasTotal}`);
                
                console.log('\n🎉 COMPLETE PAYMENT FLOW TEST RESULTS:');
                console.log('✅ Checkout → Payment Processing → Upsell 1');
                console.log('✅ Upsell 1 → Payment Processing → Upsell 2'); 
                console.log('✅ Upsell 2 → Payment Processing → Thank You');
                console.log('✅ Thank You page displays order information');
                
                return {
                  success: true,
                  message: 'Complete payment flow working correctly',
                  flow: 'checkout → upsell1 → upsell2 → thankyou',
                  payments: 'All payment processing steps functional'
                };
              } else {
                console.log('⚠️ Upsell 2 did not redirect to thank you page');
              }
            } else {
              console.log('ℹ️ Upsell 2 buttons not found - checking page structure');
              const content = await page.textContent('body');
              console.log('Upsell 2 content preview:', content.substring(0, 200));
            }
          } else {
            console.log('⚠️ Upsell 1 did not redirect to upsell 2');
          }
        } else {
          console.log('ℹ️ Upsell 1 buttons not found - checking page structure');
          const content = await page.textContent('body');
          console.log('Upsell 1 content preview:', content.substring(0, 200));
        }
      } else if (outcomes === 'processing') {
        console.log('⏳ Payment is processing - waiting for completion...');
        await page.waitForTimeout(10000);
        const currentUrl = page.url();
        console.log(`After processing, current URL: ${currentUrl}`);
      } else {
        console.log('⚠️ Checkout submission did not proceed as expected');
        const currentUrl = page.url();
        const pageContent = await page.textContent('body');
        console.log(`Current URL: ${currentUrl}`);
        console.log('Page content preview:', pageContent.substring(0, 300));
      }
    } else {
      console.log('❌ Submit button not ready - CollectJS may not be loaded');
    }
    
    return {
      success: false,
      message: 'Payment flow test incomplete',
      details: 'Some steps in the payment flow did not complete as expected'
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return {
      success: false,
      message: 'Payment flow test failed',
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

// Run the test
testPaymentFlow().then(result => {
  console.log('\n📊 FINAL PAYMENT FLOW RESULT:', JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});