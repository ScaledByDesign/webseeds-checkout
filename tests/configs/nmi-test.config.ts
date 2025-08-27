import { defineConfig, devices } from '@playwright/test';

/**
 * NMI Payment Gateway Test Configuration
 * 
 * Specialized configuration for comprehensive NMI payment gateway testing:
 * - Extended timeouts for payment processing
 * - Cross-browser testing matrix
 * - Performance monitoring
 * - Security validation
 * - Error scenario testing
 */

export default defineConfig({
  testDir: '../e2e',
  testMatch: ['**/nmi-*.spec.ts'],
  
  // Test execution settings
  fullyParallel: false, // Sequential execution for payment tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 1, // More retries for payment tests
  workers: process.env.CI ? 1 : 2, // Limited workers for payment processing
  
  // Extended timeouts for payment processing
  timeout: 120000, // 2 minutes per test
  expect: {
    timeout: 30000 // 30 seconds for assertions
  },
  
  // Comprehensive reporting
  reporter: [
    ['html', { 
      outputFolder: 'test-results/nmi-reports',
      open: 'never'
    }],
    ['json', { 
      outputFile: 'test-results/nmi-results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/nmi-results.xml' 
    }],
    ['line'],
    ['./custom-nmi-reporter.ts'] // Custom reporter for payment metrics
  ],
  
  use: {
    // Base configuration
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    
    // Enhanced tracing for payment flows
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Extended navigation timeout for payment processing
    navigationTimeout: 60000,
    actionTimeout: 30000,
    
    // Additional context for payment testing
    extraHTTPHeaders: {
      'X-Test-Type': 'NMI-Payment-Gateway'
    },
    
    // Ignore HTTPS errors in test environment
    ignoreHTTPSErrors: true,
    
    // Viewport for consistent testing
    viewport: { width: 1280, height: 720 }
  },

  projects: [
    // Desktop Browsers - Primary Testing
    {
      name: 'nmi-chrome-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        // Chrome-specific settings for payment testing
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--allow-running-insecure-content'
          ]
        }
      },
      testMatch: ['**/nmi-payment-gateway.spec.ts', '**/nmi-cross-browser.spec.ts']
    },
    
    {
      name: 'nmi-firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox-specific settings
        launchOptions: {
          firefoxUserPrefs: {
            'security.tls.insecure_fallback_hosts': 'localhost',
            'network.stricttransportsecurity.preloadlist': false
          }
        }
      },
      testMatch: ['**/nmi-cross-browser.spec.ts']
    },
    
    {
      name: 'nmi-safari-desktop',
      use: { 
        ...devices['Desktop Safari'],
        // Safari-specific extended timeouts
        navigationTimeout: 90000,
        actionTimeout: 45000
      },
      testMatch: ['**/nmi-cross-browser.spec.ts']
    },
    
    {
      name: 'nmi-edge-desktop',
      use: { 
        ...devices['Desktop Edge'],
        channel: 'msedge'
      },
      testMatch: ['**/nmi-cross-browser.spec.ts']
    },

    // Mobile Browsers - Cross-Platform Testing
    {
      name: 'nmi-mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        // Mobile-specific extended timeouts
        navigationTimeout: 90000,
        actionTimeout: 45000
      },
      testMatch: ['**/nmi-cross-browser.spec.ts']
    },
    
    {
      name: 'nmi-mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        // iOS Safari extended timeouts
        navigationTimeout: 120000,
        actionTimeout: 60000
      },
      testMatch: ['**/nmi-cross-browser.spec.ts']
    },

    // Tablet Testing
    {
      name: 'nmi-tablet-chrome',
      use: { 
        ...devices['iPad Pro'],
        // Tablet-specific settings
        viewport: { width: 1024, height: 768 }
      },
      testMatch: ['**/nmi-cross-browser.spec.ts']
    },

    // Performance Testing Project
    {
      name: 'nmi-performance',
      use: {
        ...devices['Desktop Chrome'],
        // Performance testing specific settings
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--enable-performance-manager-debug-logging'
          ]
        }
      },
      testMatch: ['**/nmi-performance.spec.ts']
    },

    // Security Testing Project
    {
      name: 'nmi-security',
      use: {
        ...devices['Desktop Chrome'],
        // Security testing specific settings
        extraHTTPHeaders: {
          'X-Security-Test': 'true'
        }
      },
      testMatch: ['**/nmi-security.spec.ts']
    },

    // Error Scenario Testing
    {
      name: 'nmi-error-scenarios',
      use: {
        ...devices['Desktop Chrome'],
        // Error testing specific settings
        extraHTTPHeaders: {
          'X-Error-Test': 'true'
        }
      },
      testMatch: ['**/nmi-error-scenarios.spec.ts']
    }
  ],

  // Global setup and teardown for NMI testing
  globalSetup: require.resolve('../helpers/nmi-global-setup.ts'),
  globalTeardown: require.resolve('../helpers/nmi-global-teardown.ts'),

  // Web server configuration for testing
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // Extended timeout for dev server startup
    env: {
      // Test-specific environment variables
      NODE_ENV: 'test',
      NMI_MODE: 'sandbox',
      NEXT_PUBLIC_NMI_TOKENIZATION_KEY: process.env.NEXT_PUBLIC_NMI_TOKENIZATION_KEY,
      NMI_SECURITY_KEY: process.env.NMI_SECURITY_KEY
    }
  }
});

// Environment-specific configurations
export const nmiTestEnvironments = {
  local: {
    baseURL: 'http://localhost:3000',
    nmiMode: 'sandbox',
    timeout: 60000
  },
  staging: {
    baseURL: process.env.STAGING_URL || 'https://staging.webseed.com',
    nmiMode: 'sandbox',
    timeout: 90000
  },
  production: {
    baseURL: process.env.PRODUCTION_URL || 'https://webseed.com',
    nmiMode: 'production',
    timeout: 120000,
    // Additional security for production testing
    extraHTTPHeaders: {
      'X-Production-Test': 'true'
    }
  }
};

// Test data configurations
export const nmiTestConfig = {
  // Payment processing timeouts
  timeouts: {
    collectJSLoad: 30000,
    tokenization: 15000,
    paymentProcessing: 60000,
    pageNavigation: 30000
  },
  
  // Retry configurations
  retries: {
    paymentProcessing: 3,
    networkRequests: 2,
    iframeInteractions: 2
  },
  
  // Performance benchmarks
  benchmarks: {
    pageLoadTime: 5000,
    collectJSLoadTime: 5000,
    tokenizationTime: 10000,
    totalCheckoutTime: 30000
  },
  
  // Error simulation settings
  errorSimulation: {
    networkTimeoutDuration: 30000,
    serverErrorCodes: [500, 502, 503, 504],
    paymentDeclineReasons: ['insufficient_funds', 'card_declined', 'expired_card']
  },
  
  // Security validation settings
  security: {
    enforceHTTPS: true,
    validateIframeSandbox: true,
    checkSensitiveDataExposure: true,
    validateCSPHeaders: true
  }
};

// Custom test annotations for NMI testing
export const nmiTestAnnotations = {
  paymentProcessing: { type: 'tag', description: 'Payment processing test' },
  crossBrowser: { type: 'tag', description: 'Cross-browser compatibility test' },
  performance: { type: 'tag', description: 'Performance validation test' },
  security: { type: 'tag', description: 'Security compliance test' },
  errorHandling: { type: 'tag', description: 'Error scenario test' },
  integration: { type: 'tag', description: 'API integration test' }
};
