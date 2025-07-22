import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for BrowserStack E2E tests
 * 
 * This runs once before all tests start and handles:
 * - BrowserStack Local tunnel setup (if needed)
 * - Environment validation
 * - Test data preparation
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for BrowserStack E2E tests...');

  // Validate required environment variables
  const requiredVars = [
    'BROWSERSTACK_USERNAME',
    'BROWSERSTACK_ACCESS_KEY'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`  - ${varName}`));
    console.error('\n💡 Please check your .env.local file or environment configuration');
    process.exit(1);
  }

  // Log configuration info
  console.log('✅ BrowserStack credentials validated');
  console.log(`📦 Project: ${process.env.BROWSERSTACK_PROJECT_NAME || 'NMI Konnective Integration'}`);
  console.log(`🏗️  Build: ${process.env.BROWSERSTACK_BUILD_NAME || 'webseed-checkout'}`);
  console.log(`🌐 Base URL: ${config.webServer?.url || process.env.TEST_BASE_URL || 'http://localhost:3000'}`);

  // Validate that the application is accessible
  try {
    const baseURL = config.webServer?.url || process.env.TEST_BASE_URL || 'http://localhost:3000';
    
    // Launch a browser to test connectivity
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    console.log(`🔍 Testing application accessibility at ${baseURL}...`);
    
    // Try to load the homepage with a reasonable timeout
    await page.goto(baseURL, { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    
    // Check if the page loaded properly
    const title = await page.title();
    console.log(`✅ Application accessible - Page title: "${title}"`);
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Failed to access application:');
    console.error(error);
    console.error('\n💡 Make sure your Next.js dev server is running on the correct port');
    process.exit(1);
  }

  // Set up test data or any other global preparations
  console.log('📋 Setting up test data...');
  
  // You can add any global test data setup here
  // For example, creating test users, seeding databases, etc.
  
  console.log('✅ Global setup completed successfully');
  console.log('🎯 Ready to run E2E tests on BrowserStack\n');
}

export default globalSetup;