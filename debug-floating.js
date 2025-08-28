const { chromium } = require('playwright');

(async () => {
  console.log('🐛 Debugging floating label issue...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Listen to console logs from the page
  page.on('console', msg => {
    if (msg.text().includes('🎯')) {
      console.log('PAGE:', msg.text());
    }
  });
  
  try {
    await page.goto('http://localhost:3255/checkout');
    await page.waitForSelector('form#checkout-form', { timeout: 10000 });
    console.log('✅ Checkout form loaded\n');
    
    const emailField = page.locator('input[name="email"]');
    
    console.log('🔍 Step 1: Click on empty email field...');
    await emailField.click();
    await page.waitForTimeout(2000);
    
    console.log('🔍 Step 2: Click away without typing...');
    await page.locator('input[name="phone"]').click();
    await page.waitForTimeout(2000);
    
    console.log('🔍 Step 3: Click on empty email field again...');
    await emailField.click();
    await page.waitForTimeout(3000);
    
    console.log('🔍 Step 4: Check if label is floating...');
    
    // Check the class on the floating-label-group
    const labelGroup = page.locator('.floating-label-group').first();
    const classes = await labelGroup.getAttribute('class');
    console.log('Label group classes:', classes);
    
    // Check if always-float class is present
    const hasAlwaysFloat = classes.includes('always-float');
    console.log('Has always-float class:', hasAlwaysFloat);
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  } finally {
    await browser.close();
  }
})();
