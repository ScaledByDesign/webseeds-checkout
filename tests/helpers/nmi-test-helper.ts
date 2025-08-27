import { Page, expect } from '@playwright/test';

/**
 * NMI Test Helper Utilities
 * 
 * Provides reusable utilities for NMI payment gateway testing including:
 * - Test data generation
 * - Payment method validation
 * - Error simulation
 * - Performance monitoring
 * - Security validation
 */

export interface Customer {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

export interface PaymentMethod {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  type: string;
}

export interface NMITestResult {
  success: boolean;
  duration: number;
  tokenGenerated: boolean;
  apiCalls: any[];
  errors: string[];
  redirectUrl?: string;
}

export class NMITestDataFactory {
  /**
   * Generate random customer data for testing
   */
  static generateCustomer(overrides: Partial<Customer> = {}): Customer {
    const timestamp = Date.now();
    return {
      email: `test-${timestamp}@webseed.com`,
      firstName: 'Test',
      lastName: 'Customer',
      address: '123 Test Street',
      city: 'Test City',
      state: 'CA',
      zipCode: '12345',
      country: 'US',
      phone: '1234567890',
      ...overrides
    };
  }

  /**
   * Get test payment methods for different scenarios
   */
  static getPaymentMethods() {
    return {
      visa: {
        cardNumber: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '25',
        cvv: '123',
        type: 'Visa'
      },
      mastercard: {
        cardNumber: '5555555555554444',
        expiryMonth: '12',
        expiryYear: '25',
        cvv: '123',
        type: 'Mastercard'
      },
      amex: {
        cardNumber: '378282246310005',
        expiryMonth: '12',
        expiryYear: '25',
        cvv: '1234',
        type: 'American Express'
      },
      discover: {
        cardNumber: '6011111111111117',
        expiryMonth: '12',
        expiryYear: '25',
        cvv: '123',
        type: 'Discover'
      },
      // Error scenarios
      invalid: {
        cardNumber: '4111111111111112', // Invalid Luhn check
        expiryMonth: '12',
        expiryYear: '25',
        cvv: '123',
        type: 'Invalid'
      },
      expired: {
        cardNumber: '4111111111111111',
        expiryMonth: '01',
        expiryYear: '20', // Expired
        cvv: '123',
        type: 'Expired'
      },
      declined: {
        cardNumber: '4000000000000002', // NMI test card for declined transactions
        expiryMonth: '12',
        expiryYear: '25',
        cvv: '123',
        type: 'Declined'
      },
      insufficientFunds: {
        cardNumber: '4000000000000119', // Insufficient funds
        expiryMonth: '12',
        expiryYear: '25',
        cvv: '123',
        type: 'Insufficient Funds'
      }
    };
  }

  /**
   * Generate international customer data
   */
  static generateInternationalCustomer(country: 'CA' | 'UK' | 'AU' = 'CA'): Customer {
    const configs = {
      CA: {
        state: 'ON',
        zipCode: 'M5V 3A8',
        phone: '4161234567'
      },
      UK: {
        state: 'London',
        zipCode: 'SW1A 1AA',
        phone: '02071234567'
      },
      AU: {
        state: 'NSW',
        zipCode: '2000',
        phone: '0212345678'
      }
    };

    return this.generateCustomer({
      country,
      ...configs[country]
    });
  }
}

export class NMIPerformanceMonitor {
  private startTime: number = 0;
  private metrics: any = {};

  constructor(private page: Page) {}

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    this.startTime = Date.now();
    this.metrics = {
      pageLoadTime: 0,
      collectJSLoadTime: 0,
      tokenizationTime: 0,
      apiResponseTime: 0,
      totalCheckoutTime: 0
    };

    // Monitor network requests
    this.page.on('response', response => {
      const url = response.url();
      const responseTime = Date.now() - this.startTime;

      if (url.includes('Collect.js')) {
        this.metrics.collectJSLoadTime = responseTime;
      } else if (url.includes('/api/checkout/process')) {
        this.metrics.apiResponseTime = responseTime;
      }
    });
  }

  /**
   * Mark tokenization completion
   */
  markTokenizationComplete() {
    this.metrics.tokenizationTime = Date.now() - this.startTime;
  }

  /**
   * Mark checkout completion
   */
  markCheckoutComplete() {
    this.metrics.totalCheckoutTime = Date.now() - this.startTime;
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Validate performance benchmarks
   */
  validateBenchmarks() {
    const benchmarks = {
      collectJSLoadTime: 5000, // 5 seconds
      tokenizationTime: 10000, // 10 seconds
      apiResponseTime: 3000, // 3 seconds
      totalCheckoutTime: 30000 // 30 seconds
    };

    const violations = [];
    for (const [metric, benchmark] of Object.entries(benchmarks)) {
      if (this.metrics[metric] > benchmark) {
        violations.push({
          metric,
          actual: this.metrics[metric],
          benchmark,
          violation: this.metrics[metric] - benchmark
        });
      }
    }

    return violations;
  }
}

export class NMISecurityValidator {
  constructor(private page: Page) {}

  /**
   * Validate HTTPS enforcement
   */
  async validateHTTPSEnforcement() {
    const url = this.page.url();
    expect(url).toMatch(/^https:/);

    // Check for mixed content warnings
    const consoleMessages: string[] = [];
    this.page.on('console', msg => {
      if (msg.text().includes('mixed content') || msg.text().includes('insecure')) {
        consoleMessages.push(msg.text());
      }
    });

    return {
      isHTTPS: url.startsWith('https:'),
      mixedContentWarnings: consoleMessages
    };
  }

  /**
   * Validate iframe security attributes
   */
  async validateIframeSecurity() {
    const iframes = await this.page.locator('iframe').all();
    const securityChecks = [];

    for (const iframe of iframes) {
      const src = await iframe.getAttribute('src');
      const sandbox = await iframe.getAttribute('sandbox');
      const allowAttribute = await iframe.getAttribute('allow');

      securityChecks.push({
        src,
        sandbox,
        allow: allowAttribute,
        isSecure: src?.startsWith('https://') || false,
        hasSandbox: sandbox !== null,
        hasAllowAttribute: allowAttribute !== null
      });
    }

    return securityChecks;
  }

  /**
   * Check for sensitive data exposure in console/network
   */
  async monitorSensitiveDataExposure() {
    const exposureWarnings: string[] = [];

    // Monitor console for sensitive data
    this.page.on('console', msg => {
      const text = msg.text();
      if (this.containsSensitiveData(text)) {
        exposureWarnings.push(`Console: ${text}`);
      }
    });

    // Monitor network requests for sensitive data
    this.page.on('request', request => {
      const url = request.url();
      const postData = request.postData();
      
      if (postData && this.containsSensitiveData(postData)) {
        exposureWarnings.push(`Network: ${url}`);
      }
    });

    return exposureWarnings;
  }

  /**
   * Check if text contains sensitive payment data
   */
  private containsSensitiveData(text: string): boolean {
    const sensitivePatterns = [
      /\b4[0-9]{12}(?:[0-9]{3})?\b/, // Visa
      /\b5[1-5][0-9]{14}\b/, // Mastercard
      /\b3[47][0-9]{13}\b/, // American Express
      /\b6(?:011|5[0-9]{2})[0-9]{12}\b/, // Discover
      /\b[0-9]{3,4}\b.*cvv/i, // CVV
      /\b[0-9]{2}\/[0-9]{2}\b/ // Expiry date
    ];

    return sensitivePatterns.some(pattern => pattern.test(text));
  }
}

export class NMIErrorSimulator {
  constructor(private page: Page) {}

  /**
   * Simulate network timeout
   */
  async simulateNetworkTimeout() {
    await this.page.route('**/api/checkout/process', route => {
      // Delay response to simulate timeout
      setTimeout(() => {
        route.abort('timedout');
      }, 30000);
    });
  }

  /**
   * Simulate API server error
   */
  async simulateServerError(statusCode: number = 500) {
    await this.page.route('**/api/checkout/process', route => {
      route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error',
          code: 'SERVER_ERROR'
        })
      });
    });
  }

  /**
   * Simulate CollectJS loading failure
   */
  async simulateCollectJSFailure() {
    await this.page.route('**/Collect.js', route => {
      route.abort('failed');
    });
  }

  /**
   * Simulate payment gateway timeout
   */
  async simulatePaymentGatewayTimeout() {
    await this.page.route('**/transact.php', route => {
      setTimeout(() => {
        route.abort('timedout');
      }, 15000);
    });
  }
}

export class NMITestReporter {
  private results: NMITestResult[] = [];

  /**
   * Add test result
   */
  addResult(result: NMITestResult) {
    this.results.push(result);
  }

  /**
   * Generate test summary
   */
  generateSummary() {
    const total = this.results.length;
    const successful = this.results.filter(r => r.success).length;
    const failed = total - successful;
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / total;

    return {
      total,
      successful,
      failed,
      successRate: (successful / total) * 100,
      averageDuration: avgDuration,
      results: this.results
    };
  }

  /**
   * Export results to JSON
   */
  exportResults() {
    return JSON.stringify(this.generateSummary(), null, 2);
  }
}
