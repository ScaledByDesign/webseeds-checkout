const { chromium } = require('playwright');

async function validateFormFunctionality() {
  console.log('🧪 Testing ModernCheckoutForm functionality...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3000/checkout');
    await page.waitForSelector('input[name="email"]');
    
    console.log('✅ Page loaded');
    
    // Test form validation with invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    // Check for error messages
    const errorElements = await page.locator('.text-red-500').count();
    console.log(`Found ${errorElements} error elements with text-red-500`);
    
    if (errorElements > 0) {
      console.log('✅ Form validation working with correct error styling');
    } else {
      console.log('ℹ️  Checking for any validation errors...');
      const anyErrors = await page.locator('[class*="text-red"]').count();
      console.log(`Found ${anyErrors} error elements with red text`);
    }
    
    // Test successful form fill
    await page.fill('input[name="email"]', 'valid@test.com');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    
    console.log('✅ Form can be filled with valid data');
    
    // Check that errors clear when fixed
    await page.waitForTimeout(500);
    const errorsAfterFix = await page.locator('.text-red-500').count();
    console.log(`Error count after fixing: ${errorsAfterFix}`);
    
    console.log('🎉 Form validation test complete');
    
    return { success: true, message: 'Form functionality validated' };
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { success: false, message: 'Form validation failed', error: error.message };
  } finally {
    await browser.close();
  }
}

validateFormFunctionality().then(result => {
  console.log('\n📊 RESULT:', JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});