import { defineConfig, devices } from '@playwright/test';

/**
 * BrowserStack Configuration for E2E Testing
 * 
 * This configuration enables cross-browser testing on BrowserStack's cloud infrastructure.
 * Tests will run on real devices and browsers to ensure compatibility.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // BrowserStack specific settings
    connectOptions: {
      wsEndpoint: `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify({
        'browserstack.username': process.env.BROWSERSTACK_USERNAME,
        'browserstack.accessKey': process.env.BROWSERSTACK_ACCESS_KEY,
        'project': process.env.BROWSERSTACK_PROJECT_NAME || 'NMI Konnective Integration',
        'build': process.env.BROWSERSTACK_BUILD_NAME || 'webseed-checkout',
        'name': 'Checkout Flow E2E Tests'
      }))}`
    }
  },

  projects: [
    // Desktop Chrome
    {
      name: 'chrome-desktop',
      use: {
        ...devices['Desktop Chrome'],
        connectOptions: {
          wsEndpoint: `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify({
            'browserstack.username': process.env.BROWSERSTACK_USERNAME,
            'browserstack.accessKey': process.env.BROWSERSTACK_ACCESS_KEY,
            'browser': 'chrome',
            'browser_version': 'latest',
            'os': 'windows',
            'os_version': '11',
            'project': process.env.BROWSERSTACK_PROJECT_NAME || 'NMI Konnective Integration',
            'build': process.env.BROWSERSTACK_BUILD_NAME || 'webseed-checkout',
            'name': 'Chrome Desktop - Checkout Tests',
            'browserstack.local': 'true',
            'browserstack.localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER || 'webseed-local'
          }))}`
        }
      }
    },

    // Desktop Firefox
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        connectOptions: {
          wsEndpoint: `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify({
            'browserstack.username': process.env.BROWSERSTACK_USERNAME,
            'browserstack.accessKey': process.env.BROWSERSTACK_ACCESS_KEY,
            'browser': 'firefox',
            'browser_version': 'latest',
            'os': 'windows',
            'os_version': '11',
            'project': process.env.BROWSERSTACK_PROJECT_NAME || 'NMI Konnective Integration',
            'build': process.env.BROWSERSTACK_BUILD_NAME || 'webseed-checkout',
            'name': 'Firefox Desktop - Checkout Tests',
            'browserstack.local': 'true',
            'browserstack.localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER || 'webseed-local'
          }))}`
        }
      }
    },

    // Desktop Safari
    {
      name: 'safari-desktop',
      use: {
        ...devices['Desktop Safari'],
        connectOptions: {
          wsEndpoint: `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify({
            'browserstack.username': process.env.BROWSERSTACK_USERNAME,
            'browserstack.accessKey': process.env.BROWSERSTACK_ACCESS_KEY,
            'browser': 'safari',
            'browser_version': 'latest',
            'os': 'osx',
            'os_version': 'Big Sur',
            'project': process.env.BROWSERSTACK_PROJECT_NAME || 'NMI Konnective Integration',
            'build': process.env.BROWSERSTACK_BUILD_NAME || 'webseed-checkout',
            'name': 'Safari Desktop - Checkout Tests',
            'browserstack.local': 'true',
            'browserstack.localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER || 'webseed-local'
          }))}`
        }
      }
    },

    // Mobile Chrome (Android)
    {
      name: 'chrome-mobile-android',
      use: {
        ...devices['Pixel 5'],
        connectOptions: {
          wsEndpoint: `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify({
            'browserstack.username': process.env.BROWSERSTACK_USERNAME,
            'browserstack.accessKey': process.env.BROWSERSTACK_ACCESS_KEY,
            'browser': 'chrome',
            'device': 'Samsung Galaxy S21',
            'os_version': '11.0',
            'project': process.env.BROWSERSTACK_PROJECT_NAME || 'NMI Konnective Integration',
            'build': process.env.BROWSERSTACK_BUILD_NAME || 'webseed-checkout',
            'name': 'Chrome Mobile Android - Checkout Tests',
            'browserstack.local': 'true',
            'browserstack.localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER || 'webseed-local',
            'real_mobile': 'true'
          }))}`
        }
      }
    },

    // Mobile Safari (iOS)
    {
      name: 'safari-mobile-ios',
      use: {
        ...devices['iPhone 12'],
        connectOptions: {
          wsEndpoint: `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify({
            'browserstack.username': process.env.BROWSERSTACK_USERNAME,
            'browserstack.accessKey': process.env.BROWSERSTACK_ACCESS_KEY,
            'browser': 'safari',
            'device': 'iPhone 13',
            'os_version': '15',
            'project': process.env.BROWSERSTACK_PROJECT_NAME || 'NMI Konnective Integration',
            'build': process.env.BROWSERSTACK_BUILD_NAME || 'webseed-checkout',
            'name': 'Safari Mobile iOS - Checkout Tests',
            'browserstack.local': 'true',
            'browserstack.localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER || 'webseed-local',
            'real_mobile': 'true'
          }))}`
        }
      }
    }
  ],

  // Global test timeout
  timeout: 60000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 10000
  },

  // Web server configuration for local development
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  },

  // Output directory for test results
  outputDir: 'test-results/',
  
  // Global setup and teardown
  globalSetup: require.resolve('./global-setup.ts'),
  globalTeardown: require.resolve('./global-teardown.ts')
});

/**
 * Environment Variables Required:
 * 
 * BROWSERSTACK_USERNAME - Your BrowserStack username
 * BROWSERSTACK_ACCESS_KEY - Your BrowserStack access key
 * BROWSERSTACK_PROJECT_NAME - Project name in BrowserStack (optional)
 * BROWSERSTACK_BUILD_NAME - Build name for this test run (optional)
 * BROWSERSTACK_LOCAL_IDENTIFIER - Local tunnel identifier (optional)
 * TEST_BASE_URL - Base URL for testing (defaults to http://localhost:3000)
 * 
 * Usage:
 * 
 * # Run all tests on BrowserStack
 * npx playwright test --config=tests/e2e/browserstack.conf.ts
 * 
 * # Run specific browser
 * npx playwright test --config=tests/e2e/browserstack.conf.ts --project=chrome-desktop
 * 
 * # Run mobile tests only
 * npx playwright test --config=tests/e2e/browserstack.conf.ts --project=*mobile*
 * 
 * # Run with headed mode (for debugging)
 * npx playwright test --config=tests/e2e/browserstack.conf.ts --headed
 */