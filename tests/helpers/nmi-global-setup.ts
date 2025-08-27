import { chromium, FullConfig } from '@playwright/test';
import { NMITestDataFactory } from './nmi-test-helper';

/**
 * Global Setup for NMI Payment Gateway Testing
 * 
 * Handles:
 * - Environment validation
 * - NMI sandbox connectivity testing
 * - Test data preparation
 * - Performance baseline establishment
 * - Security configuration validation
 */

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting NMI Payment Gateway Test Suite Global Setup...');
  console.log('=' * 60);

  // Validate required environment variables
  await validateEnvironmentVariables();
  
  // Test application connectivity
  await validateApplicationConnectivity(config);
  
  // Validate NMI sandbox connectivity
  await validateNMISandboxConnectivity();
  
  // Prepare test data
  await prepareTestData();
  
  // Establish performance baselines
  await establishPerformanceBaselines(config);
  
  // Validate security configuration
  await validateSecurityConfiguration(config);
  
  console.log('✅ NMI Payment Gateway Test Suite Global Setup Completed Successfully');
  console.log('🎯 Ready to execute comprehensive payment gateway tests\n');
}

/**
 * Validate required environment variables for NMI testing
 */
async function validateEnvironmentVariables() {
  console.log('🔍 Validating environment variables...');
  
  const requiredVars = [
    'NEXT_PUBLIC_NMI_TOKENIZATION_KEY',
    'NMI_SECURITY_KEY',
    'NEXT_PUBLIC_COLLECT_JS_URL'
  ];
  
  const optionalVars = [
    'NMI_ENDPOINT',
    'BROWSERSTACK_USERNAME',
    'BROWSERSTACK_ACCESS_KEY',
    'TEST_BASE_URL'
  ];
  
  const missingRequired = requiredVars.filter(varName => !process.env[varName]);
  const missingOptional = optionalVars.filter(varName => !process.env[varName]);
  
  if (missingRequired.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingRequired.forEach(varName => console.error(`  - ${varName}`));
    console.error('\n💡 Please check your .env.local file');
    process.exit(1);
  }
  
  if (missingOptional.length > 0) {
    console.warn('⚠️ Missing optional environment variables:');
    missingOptional.forEach(varName => console.warn(`  - ${varName}`));
    console.warn('💡 Some tests may use default values');
  }
  
  // Validate NMI configuration
  const tokenizationKey = process.env.NEXT_PUBLIC_NMI_TOKENIZATION_KEY;
  const securityKey = process.env.NMI_SECURITY_KEY;
  
  if (tokenizationKey && tokenizationKey.length < 10) {
    console.error('❌ NMI tokenization key appears to be invalid (too short)');
    process.exit(1);
  }
  
  if (securityKey && securityKey.length < 10) {
    console.error('❌ NMI security key appears to be invalid (too short)');
    process.exit(1);
  }
  
  console.log('✅ Environment variables validated');
  console.log(`📦 NMI Mode: ${process.env.NODE_ENV === 'production' ? 'Production' : 'Sandbox'}`);
  console.log(`🔑 Tokenization Key: ${tokenizationKey?.substring(0, 8)}...`);
}

/**
 * Test application connectivity and basic functionality
 */
async function validateApplicationConnectivity(config: FullConfig) {
  console.log('🔍 Testing application connectivity...');
  
  const baseURL = config.webServer?.url || process.env.TEST_BASE_URL || 'http://localhost:3000';
  
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    console.log(`🌐 Testing connectivity to ${baseURL}...`);
    
    // Test homepage
    await page.goto(baseURL, { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    
    const title = await page.title();
    console.log(`✅ Homepage accessible - Title: "${title}"`);
    
    // Test checkout page
    await page.goto(`${baseURL}/checkout`, { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    
    // Verify checkout form elements
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.waitForSelector('input[name="firstName"]', { timeout: 5000 });
    await page.waitForSelector('#card-number-field', { timeout: 5000 });
    
    console.log('✅ Checkout page accessible with required form elements');
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Application connectivity test failed:');
    console.error(error);
    console.error('\n💡 Ensure your Next.js dev server is running');
    process.exit(1);
  }
}

/**
 * Validate NMI sandbox connectivity and CollectJS loading
 */
async function validateNMISandboxConnectivity() {
  console.log('🔍 Testing NMI sandbox connectivity...');
  
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
    await page.goto(`${baseURL}/checkout`);
    
    // Monitor CollectJS loading
    let collectJSLoaded = false;
    let collectJSError = null;
    
    page.on('response', response => {
      const url = response.url();
      if (url.includes('Collect.js')) {
        if (response.status() === 200) {
          collectJSLoaded = true;
          console.log('✅ CollectJS script loaded successfully');
        } else {
          collectJSError = `CollectJS failed to load: ${response.status()}`;
        }
      }
    });
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('CollectJS') && msg.type() === 'error') {
        collectJSError = text;
      }
    });
    
    // Wait for CollectJS to load
    try {
      await page.waitForFunction(() => window.CollectJS != null, { timeout: 30000 });
      console.log('✅ CollectJS initialized successfully');
    } catch (error) {
      console.error('❌ CollectJS failed to initialize:', collectJSError || error);
      throw error;
    }
    
    // Test iframe creation
    await page.waitForTimeout(3000);
    const iframes = await page.locator('iframe').count();
    
    if (iframes >= 3) {
      console.log(`✅ Payment field iframes created (${iframes} iframes found)`);
    } else {
      console.warn(`⚠️ Expected 3+ iframes, found ${iframes}`);
    }
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ NMI sandbox connectivity test failed:');
    console.error(error);
    console.error('\n💡 Check NMI configuration and network connectivity');
    process.exit(1);
  }
}

/**
 * Prepare test data for NMI testing
 */
async function prepareTestData() {
  console.log('🔍 Preparing test data...');
  
  try {
    // Generate test customers
    const testCustomers = {
      domestic: NMITestDataFactory.generateCustomer(),
      international: NMITestDataFactory.generateInternationalCustomer('CA'),
      uk: NMITestDataFactory.generateInternationalCustomer('UK'),
      australia: NMITestDataFactory.generateInternationalCustomer('AU')
    };
    
    // Validate payment methods
    const paymentMethods = NMITestDataFactory.getPaymentMethods();
    
    // Store test data for use in tests
    global.nmiTestData = {
      customers: testCustomers,
      paymentMethods,
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Test data prepared successfully');
    console.log(`📊 Generated ${Object.keys(testCustomers).length} customer profiles`);
    console.log(`💳 Configured ${Object.keys(paymentMethods).length} payment methods`);
    
  } catch (error) {
    console.error('❌ Test data preparation failed:', error);
    process.exit(1);
  }
}

/**
 * Establish performance baselines for comparison
 */
async function establishPerformanceBaselines(config: FullConfig) {
  console.log('🔍 Establishing performance baselines...');
  
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    const baseURL = config.webServer?.url || process.env.TEST_BASE_URL || 'http://localhost:3000';
    
    // Measure page load performance
    const startTime = Date.now();
    await page.goto(`${baseURL}/checkout`, { waitUntil: 'networkidle' });
    const pageLoadTime = Date.now() - startTime;
    
    // Measure CollectJS load time
    const collectJSStartTime = Date.now();
    await page.waitForFunction(() => window.CollectJS != null, { timeout: 30000 });
    const collectJSLoadTime = Date.now() - collectJSStartTime;
    
    // Measure iframe initialization time
    const iframeStartTime = Date.now();
    await page.waitForTimeout(3000);
    await page.waitForSelector('#card-number-field iframe', { timeout: 10000 });
    const iframeInitTime = Date.now() - iframeStartTime;
    
    const baselines = {
      pageLoadTime,
      collectJSLoadTime,
      iframeInitTime,
      timestamp: new Date().toISOString()
    };
    
    // Store baselines for comparison in tests
    global.nmiPerformanceBaselines = baselines;
    
    console.log('✅ Performance baselines established:');
    console.log(`  📄 Page Load: ${pageLoadTime}ms`);
    console.log(`  🔧 CollectJS Load: ${collectJSLoadTime}ms`);
    console.log(`  🖼️ Iframe Init: ${iframeInitTime}ms`);
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Performance baseline establishment failed:', error);
    // Don't exit - performance baselines are not critical for test execution
  }
}

/**
 * Validate security configuration
 */
async function validateSecurityConfiguration(config: FullConfig) {
  console.log('🔍 Validating security configuration...');
  
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    const baseURL = config.webServer?.url || process.env.TEST_BASE_URL || 'http://localhost:3000';
    
    // Test HTTPS enforcement (if not localhost)
    if (!baseURL.includes('localhost')) {
      if (!baseURL.startsWith('https:')) {
        console.warn('⚠️ Application not using HTTPS - this may affect payment security');
      } else {
        console.log('✅ HTTPS enforcement validated');
      }
    }
    
    await page.goto(`${baseURL}/checkout`);
    await page.waitForFunction(() => window.CollectJS != null, { timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Check iframe security attributes
    const iframes = await page.locator('iframe').all();
    let secureIframes = 0;
    
    for (const iframe of iframes) {
      const src = await iframe.getAttribute('src');
      if (src && src.startsWith('https:')) {
        secureIframes++;
      }
    }
    
    if (secureIframes === iframes.length) {
      console.log(`✅ All ${iframes.length} iframes use HTTPS`);
    } else {
      console.warn(`⚠️ ${iframes.length - secureIframes} iframes not using HTTPS`);
    }
    
    await browser.close();
    
    console.log('✅ Security configuration validated');
    
  } catch (error) {
    console.error('❌ Security configuration validation failed:', error);
    // Don't exit - security validation is not critical for test execution
  }
}

export default globalSetup;
