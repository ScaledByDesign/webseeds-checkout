import { Page, expect } from '@playwright/test';
import { calculateTax, getTaxRate } from '@/src/lib/constants/payment';

/**
 * Checkout Flow Helper Utilities
 * 
 * Provides reusable utilities for comprehensive checkout flow testing:
 * - Form validation helpers
 * - Order calculation utilities
 * - State management testing
 * - Performance monitoring
 * - Error simulation
 */

export interface CustomerInfo {
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

export interface BillingInfo {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface ProductInfo {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderSummary {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  items: ProductInfo[];
}

export class CheckoutFormValidator {
  constructor(private page: Page) {}

  /**
   * Validate email field
   */
  async validateEmailField(email: string): Promise<boolean> {
    await this.page.fill('input[name="email"]', email);
    await this.page.press('input[name="email"]', 'Tab');
    
    const emailField = this.page.locator('input[name="email"]');
    const isValid = await emailField.evaluate(el => el.checkValidity());
    
    return isValid;
  }

  /**
   * Validate required fields
   */
  async validateRequiredFields(): Promise<string[]> {
    const requiredFields = [
      'email', 'firstName', 'lastName', 'address', 
      'city', 'state', 'zipCode', 'phone'
    ];
    
    const missingFields: string[] = [];
    
    for (const field of requiredFields) {
      const fieldElement = this.page.locator(`input[name="${field}"], select[name="${field}"]`);
      const value = await fieldElement.inputValue();
      
      if (!value || value.trim() === '') {
        missingFields.push(field);
      }
    }
    
    return missingFields;
  }

  /**
   * Validate ZIP code format
   */
  async validateZipCode(zipCode: string, country: string = 'US'): Promise<boolean> {
    const zipPatterns = {
      US: /^\d{5}(-\d{4})?$/,
      CA: /^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/,
      UK: /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/
    };
    
    const pattern = zipPatterns[country as keyof typeof zipPatterns] || zipPatterns.US;
    return pattern.test(zipCode);
  }

  /**
   * Validate phone number format
   */
  async validatePhoneNumber(phone: string): Promise<boolean> {
    // Basic phone validation - adjust based on requirements
    const phonePattern = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return phonePattern.test(cleanPhone);
  }

  /**
   * Check for validation errors on page
   */
  async getValidationErrors(): Promise<string[]> {
    const errorSelectors = [
      '.error-message',
      '.field-error',
      '.text-red-500',
      '.text-red-600',
      '[data-testid="error-message"]',
      '.invalid-feedback'
    ];
    
    const errors: string[] = [];
    
    for (const selector of errorSelectors) {
      const errorElements = this.page.locator(selector);
      const count = await errorElements.count();
      
      for (let i = 0; i < count; i++) {
        const errorText = await errorElements.nth(i).textContent();
        if (errorText) {
          errors.push(errorText.trim());
        }
      }
    }
    
    return errors;
  }
}

export class OrderCalculator {
  /**
   * Calculate order subtotal
   */
  static calculateSubtotal(items: ProductInfo[]): number {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  /**
   * Calculate tax amount for a given state
   */
  static calculateTax(subtotal: number, state?: string): number {
    return calculateTax(subtotal, state);
  }

  /**
   * Get tax rate for a given state
   */
  static getTaxRate(state?: string): number {
    return getTaxRate(state);
  }

  /**
   * Calculate shipping cost
   */
  static calculateShipping(subtotal: number, country: string = 'US'): number {
    const shippingRates = {
      US: subtotal >= 50 ? 0 : 9.99,
      CA: 14.99,
      UK: 19.99,
      AU: 24.99
    };
    
    return shippingRates[country as keyof typeof shippingRates] || shippingRates.US;
  }

  /**
   * Apply coupon discount
   */
  static applyCouponDiscount(subtotal: number, couponCode: string): number {
    const coupons = {
      'SAVE10': 0.10,
      'SAVE20': 0.20,
      'WELCOME15': 0.15,
      'FIRST25': 0.25
    };
    
    const discountRate = coupons[couponCode as keyof typeof coupons] || 0;
    return subtotal * discountRate;
  }

  /**
   * Calculate final order total
   */
  static calculateTotal(
    subtotal: number, 
    shipping: number, 
    tax: number, 
    discount: number
  ): number {
    return subtotal + shipping + tax - discount;
  }
}

export class CheckoutStateManager {
  constructor(private page: Page) {}

  /**
   * Save form state to localStorage
   */
  async saveFormState(formData: any): Promise<void> {
    await this.page.evaluate((data) => {
      localStorage.setItem('checkoutFormState', JSON.stringify(data));
    }, formData);
  }

  /**
   * Load form state from localStorage
   */
  async loadFormState(): Promise<any> {
    return await this.page.evaluate(() => {
      const saved = localStorage.getItem('checkoutFormState');
      return saved ? JSON.parse(saved) : null;
    });
  }

  /**
   * Clear saved form state
   */
  async clearFormState(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.removeItem('checkoutFormState');
    });
  }

  /**
   * Get current form values
   */
  async getCurrentFormValues(): Promise<any> {
    const formData = {};
    
    const fields = [
      'email', 'firstName', 'lastName', 'address', 
      'city', 'state', 'zipCode', 'country', 'phone'
    ];
    
    for (const field of fields) {
      const element = this.page.locator(`input[name="${field}"], select[name="${field}"]`);
      if (await element.isVisible()) {
        formData[field as keyof typeof formData] = await element.inputValue();
      }
    }
    
    return formData;
  }

  /**
   * Restore form values
   */
  async restoreFormValues(formData: any): Promise<void> {
    for (const [field, value] of Object.entries(formData)) {
      if (value) {
        const element = this.page.locator(`input[name="${field}"], select[name="${field}"]`);
        if (await element.isVisible()) {
          await element.fill(value as string);
        }
      }
    }
  }
}

export class CheckoutPerformanceMonitor {
  private startTime: number = 0;
  private metrics: any = {};

  constructor(private page: Page) {}

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    this.startTime = Date.now();
    this.metrics = {
      pageLoadTime: 0,
      formFillTime: 0,
      validationTime: 0,
      submissionTime: 0,
      totalCheckoutTime: 0
    };
  }

  /**
   * Mark form fill completion
   */
  markFormFillComplete(): void {
    this.metrics.formFillTime = Date.now() - this.startTime;
  }

  /**
   * Mark validation completion
   */
  markValidationComplete(): void {
    this.metrics.validationTime = Date.now() - this.startTime;
  }

  /**
   * Mark submission completion
   */
  markSubmissionComplete(): void {
    this.metrics.submissionTime = Date.now() - this.startTime;
  }

  /**
   * Mark checkout completion
   */
  markCheckoutComplete(): void {
    this.metrics.totalCheckoutTime = Date.now() - this.startTime;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): any {
    return { ...this.metrics };
  }

  /**
   * Validate performance benchmarks
   */
  validateBenchmarks(): any[] {
    const benchmarks = {
      pageLoadTime: 5000,
      formFillTime: 30000,
      validationTime: 2000,
      submissionTime: 10000,
      totalCheckoutTime: 60000
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

export class CheckoutErrorSimulator {
  constructor(private page: Page) {}

  /**
   * Simulate network timeout
   */
  async simulateNetworkTimeout(): Promise<void> {
    await this.page.route('**/api/checkout/process', route => {
      setTimeout(() => {
        route.abort('timedout');
      }, 30000);
    });
  }

  /**
   * Simulate server error
   */
  async simulateServerError(statusCode: number = 500): Promise<void> {
    await this.page.route('**/api/checkout/process', route => {
      route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Internal server error',
          errors: { server: 'An unexpected error occurred' }
        })
      });
    });
  }

  /**
   * Simulate payment processing error
   */
  async simulatePaymentError(): Promise<void> {
    await this.page.route('**/api/checkout/process', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Payment processing failed',
          errors: { payment: 'Your card was declined' }
        })
      });
    });
  }

  /**
   * Simulate slow network
   */
  async simulateSlowNetwork(delayMs: number = 5000): Promise<void> {
    await this.page.route('**/api/checkout/process', route => {
      setTimeout(() => {
        route.continue();
      }, delayMs);
    });
  }
}

export class CheckoutTestDataFactory {
  /**
   * Generate valid customer data
   */
  static generateValidCustomer(overrides: Partial<CustomerInfo> = {}): CustomerInfo {
    const timestamp = Date.now();
    return {
      email: `test-${timestamp}@webseed.com`,
      firstName: 'John',
      lastName: 'Doe',
      address: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'US',
      phone: '2125551234',
      ...overrides
    };
  }

  /**
   * Generate international customer data
   */
  static generateInternationalCustomer(country: 'CA' | 'UK' | 'AU' = 'CA'): CustomerInfo {
    const configs = {
      CA: {
        city: 'Toronto',
        state: 'ON',
        zipCode: 'M5V 3A8',
        phone: '4165551234'
      },
      UK: {
        city: 'London',
        state: 'London',
        zipCode: 'SW1A 1AA',
        phone: '02071234567'
      },
      AU: {
        city: 'Sydney',
        state: 'NSW',
        zipCode: '2000',
        phone: '0212345678'
      }
    };

    return this.generateValidCustomer({
      country,
      ...configs[country]
    });
  }

  /**
   * Generate invalid test data for validation testing
   */
  static generateInvalidData(): any {
    return {
      invalidEmail: 'not-an-email',
      emptyFirstName: '',
      emptyLastName: '',
      invalidZip: '123',
      invalidPhone: 'abc123',
      longFirstName: 'A'.repeat(100),
      longLastName: 'B'.repeat(100)
    };
  }

  /**
   * Generate test product data
   */
  static generateTestProducts(): ProductInfo[] {
    return [
      {
        id: 'fitspresso-6-pack',
        name: 'Fitspresso 6 Bottle Super Pack',
        price: 294,
        quantity: 1
      }
    ];
  }
}
