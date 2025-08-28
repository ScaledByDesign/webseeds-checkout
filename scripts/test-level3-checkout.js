#!/usr/bin/env node

/**
 * Level 3 Checkout Test Runner
 * 
 * Specialized test runner for Level 3 data collection checkout functionality.
 * Provides comprehensive testing with detailed reporting and debugging options.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  configFile: 'tests/configs/level3-test.config.ts',
  testFile: 'tests/e2e/level3-checkout.spec.ts',
  outputDir: 'test-results/level3',
  reportDir: 'playwright-report/level3'
};

// Command line arguments
const args = process.argv.slice(2);
const options = {
  browser: args.includes('--browser') ? args[args.indexOf('--browser') + 1] : 'chromium',
  headed: args.includes('--headed'),
  debug: args.includes('--debug'),
  trace: args.includes('--trace'),
  video: args.includes('--video'),
  workers: args.includes('--workers') ? args[args.indexOf('--workers') + 1] : '1',
  retries: args.includes('--retries') ? args[args.indexOf('--retries') + 1] : '0',
  timeout: args.includes('--timeout') ? args[args.indexOf('--timeout') + 1] : '60000',
  grep: args.includes('--grep') ? args[args.indexOf('--grep') + 1] : null,
  help: args.includes('--help') || args.includes('-h')
};

function showHelp() {
  console.log(`
🧪 Level 3 Checkout Test Runner

Usage: node scripts/test-level3-checkout.js [options]

Options:
  --browser <name>     Browser to test (chromium, firefox, webkit, all) [default: chromium]
  --headed            Run tests in headed mode (visible browser)
  --debug             Enable debug mode with extra logging
  --trace             Enable trace collection for debugging
  --video             Record videos of test runs
  --workers <num>     Number of parallel workers [default: 1]
  --retries <num>     Number of retries on failure [default: 0]
  --timeout <ms>      Test timeout in milliseconds [default: 60000]
  --grep <pattern>    Run only tests matching pattern
  --help, -h          Show this help message

Examples:
  # Run all Level 3 tests in chromium
  node scripts/test-level3-checkout.js

  # Run tests in headed mode for debugging
  node scripts/test-level3-checkout.js --headed --debug

  # Run specific test pattern
  node scripts/test-level3-checkout.js --grep "auto-fill"

  # Run tests with video recording
  node scripts/test-level3-checkout.js --video --trace

  # Run tests in all browsers
  node scripts/test-level3-checkout.js --browser all

Features Tested:
  ✅ Level 3 data collection and validation
  ✅ CollectJS inline tokenization with styleSniffer  
  ✅ Enhanced form validation and error handling
  ✅ Auto-fill functionality for development
  ✅ Separate billing address functionality
  ✅ Mobile responsiveness
  ✅ API integration with Level 3 payload structure
  ✅ Cross-browser compatibility
  ✅ Error handling and recovery
  ✅ Console logging verification
`);
}

function createOutputDirectories() {
  const dirs = [TEST_CONFIG.outputDir, TEST_CONFIG.reportDir];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
}

function buildPlaywrightCommand() {
  const cmd = 'npx';
  const args = ['playwright', 'test'];
  
  // Configuration file
  args.push('--config', TEST_CONFIG.configFile);
  
  // Test file
  args.push(TEST_CONFIG.testFile);
  
  // Browser selection
  if (options.browser !== 'all') {
    args.push('--project', options.browser);
  }
  
  // Headed mode
  if (options.headed) {
    args.push('--headed');
  }
  
  // Debug mode
  if (options.debug) {
    args.push('--debug');
  }
  
  // Trace collection
  if (options.trace) {
    args.push('--trace', 'on');
  }
  
  // Video recording
  if (options.video) {
    args.push('--video', 'on');
  }
  
  // Workers
  args.push('--workers', options.workers);
  
  // Retries
  args.push('--retries', options.retries);
  
  // Timeout
  args.push('--timeout', options.timeout);
  
  // Grep pattern
  if (options.grep) {
    args.push('--grep', options.grep);
  }
  
  // Reporter
  args.push('--reporter', 'list,html,json');
  
  return { cmd, args };
}

function runTests() {
  console.log('🚀 Starting Level 3 Checkout Tests...');
  console.log('📋 Configuration:', {
    browser: options.browser,
    headed: options.headed,
    debug: options.debug,
    workers: options.workers,
    timeout: options.timeout
  });
  
  createOutputDirectories();
  
  const { cmd, args } = buildPlaywrightCommand();
  
  console.log('🔧 Running command:', cmd, args.join(' '));
  console.log('');
  
  const testProcess = spawn(cmd, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYWRIGHT_HTML_REPORT: TEST_CONFIG.reportDir,
      PLAYWRIGHT_JSON_OUTPUT_NAME: path.join(TEST_CONFIG.outputDir, 'results.json')
    }
  });
  
  testProcess.on('close', (code) => {
    console.log('');
    console.log('🏁 Level 3 tests completed with exit code:', code);
    
    if (code === 0) {
      console.log('✅ All Level 3 tests passed!');
      console.log('📊 View detailed report:', path.join(TEST_CONFIG.reportDir, 'index.html'));
    } else {
      console.log('❌ Some Level 3 tests failed');
      console.log('🔍 Check the report for details:', path.join(TEST_CONFIG.reportDir, 'index.html'));
    }
    
    // Show next steps
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Review test results in the HTML report');
    console.log('2. Check screenshots for any visual issues');
    console.log('3. Verify Level 3 data in NMI dashboard');
    console.log('4. Test the checkout flow manually if needed');
    
    process.exit(code);
  });
  
  testProcess.on('error', (error) => {
    console.error('❌ Failed to start Level 3 tests:', error);
    process.exit(1);
  });
}

function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...');
  
  // Check if test files exist
  const requiredFiles = [
    TEST_CONFIG.configFile,
    TEST_CONFIG.testFile,
    'tests/helpers/level3-global-setup.ts',
    'tests/helpers/level3-global-teardown.ts'
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing required files:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    process.exit(1);
  }
  
  // Check if Level 3 checkout page exists
  const level3Page = 'app/checkout-level3/page.tsx';
  if (!fs.existsSync(level3Page)) {
    console.error('❌ Level 3 checkout page not found:', level3Page);
    console.error('   Run the Level 3 implementation first');
    process.exit(1);
  }
  
  console.log('✅ Prerequisites check passed');
}

// Main execution
if (options.help) {
  showHelp();
  process.exit(0);
}

console.log('🧪 Level 3 Checkout Test Runner');
console.log('================================');

checkPrerequisites();
runTests();
