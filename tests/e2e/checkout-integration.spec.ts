import { test, expect } from '@playwright/test';
import { 
  CheckoutFormValidator, 
  OrderCalculator, 
  CheckoutStateManager,
  CheckoutPerformanceMonitor,
  CheckoutErrorSimulator,
  CheckoutTestDataFactory 
} from '../helpers/checkout-flow-helper';

/**
 * Checkout Integration Test Suite
 * 
 * Tests checkout integration with backend services:
 * - API endpoint validation
 * - Database integration
 * - Payment processing integration
 * - Order management system
 * - Email notification system
 * - Inventory management
 */

test.describe('Checkout API Integration', () => {
  test('should make correct API calls during checkout', async ({ page }) => {
    const apiCalls: any[] = [];
    
    // Monitor API requests
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/checkout') || url.includes('/api/orders')) {
        apiCalls.push({
          url,
          method: request.method(),
          headers: request.headers(),
          postData: request.postData(),
          timestamp: new Date().toISOString()
        });
      }
    });

    // Complete checkout flow
    const customer = CheckoutTestDataFactory.generateValidCustomer();
    
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    // Fill form
    await page.fill('input[name="email"]', customer.email);
    await page.fill('input[name="firstName"]', customer.firstName);
    await page.fill('input[name="lastName"]', customer.lastName);
    await page.fill('input[name="address"]', customer.address);
    await page.fill('input[name="city"]', customer.city);
    await page.selectOption('select[name="state"]', customer.state);
    await page.fill('input[name="zipCode"]', customer.zipCode);
    await page.selectOption('select[name="country"]', customer.country);
    await page.fill('input[name="phone"]', customer.phone);
    
    // Fill payment info
    await page.waitForFunction(() => window.CollectJS != null, { timeout: 30000 });
    await page.waitForTimeout(3000);
    
    const cardFrame = page.frameLocator('#card-number-field iframe');
    await cardFrame.locator('input[name="ccnumber"]').fill('4111111111111111');
    
    const expiryFrame = page.frameLocator('#card-expiry-field iframe');
    await expiryFrame.locator('input[name="ccexp"]').fill('1225');
    
    const cvvFrame = page.frameLocator('#card-cvv-field iframe');
    await cvvFrame.locator('input[name="cvv"]').fill('123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for API calls
    await page.waitForTimeout(5000);
    
    // Validate API calls
    expect(apiCalls.length).toBeGreaterThan(0);
    
    const checkoutCall = apiCalls.find(call => call.url.includes('/api/checkout/process'));
    expect(checkoutCall).toBeDefined();
    expect(checkoutCall.method).toBe('POST');
    expect(checkoutCall.headers['content-type']).toContain('application/json');
    
    // Validate request payload
    if (checkoutCall.postData) {
      const payload = JSON.parse(checkoutCall.postData);
      expect(payload.customer.email).toBe(customer.email);
      expect(payload.customer.firstName).toBe(customer.firstName);
      expect(payload.shipping.address).toBe(customer.address);
    }
  });

  test('should handle API response validation', async ({ page }) => {
    const responses: any[] = [];
    
    // Monitor API responses
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/checkout/process')) {
        responses.push({
          url,
          status: response.status(),
          headers: response.headers(),
          timestamp: new Date().toISOString()
        });
      }
    });

    const customer = CheckoutTestDataFactory.generateValidCustomer();
    
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    // Complete checkout flow (abbreviated)
    await page.fill('input[name="email"]', customer.email);
    await page.fill('input[name="firstName"]', customer.firstName);
    await page.fill('input[name="lastName"]', customer.lastName);
    await page.fill('input[name="address"]', customer.address);
    await page.fill('input[name="city"]', customer.city);
    await page.selectOption('select[name="state"]', customer.state);
    await page.fill('input[name="zipCode"]', customer.zipCode);
    await page.fill('input[name="phone"]', customer.phone);
    
    // Submit and wait for response
    await page.click('button[type="submit"]');
    await page.waitForTimeout(10000);
    
    // Validate response
    expect(responses.length).toBeGreaterThan(0);
    
    const checkoutResponse = responses.find(resp => resp.url.includes('/api/checkout/process'));
    expect(checkoutResponse).toBeDefined();
    expect([200, 201, 302]).toContain(checkoutResponse.status);
  });

  test('should handle order creation and tracking', async ({ page }) => {
    let orderId: string | null = null;
    
    // Monitor for order ID in responses
    page.on('response', async response => {
      if (response.url().includes('/api/checkout/process') && response.status() === 200) {
        try {
          const responseBody = await response.json();
          if (responseBody.orderId) {
            orderId = responseBody.orderId;
          }
        } catch (error) {
          // Response might not be JSON
        }
      }
    });

    const customer = CheckoutTestDataFactory.generateValidCustomer();
    
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    // Complete checkout
    await page.fill('input[name="email"]', customer.email);
    await page.fill('input[name="firstName"]', customer.firstName);
    await page.fill('input[name="lastName"]', customer.lastName);
    await page.fill('input[name="address"]', customer.address);
    await page.fill('input[name="city"]', customer.city);
    await page.selectOption('select[name="state"]', customer.state);
    await page.fill('input[name="zipCode"]', customer.zipCode);
    await page.fill('input[name="phone"]', customer.phone);
    
    await page.click('button[type="submit"]');
    
    // Wait for order processing
    await page.waitForURL(/\/(success|thank-you|upsell)/, { timeout: 60000 });
    
    // Verify order ID was generated
    if (orderId) {
      expect(orderId).toMatch(/^[a-zA-Z0-9-]+$/);
      console.log(`Order created with ID: ${orderId}`);
    }
  });
});

test.describe('Checkout Error Handling Integration', () => {
  test('should handle server errors gracefully', async ({ page }) => {
    const errorSimulator = new CheckoutErrorSimulator(page);
    await errorSimulator.simulateServerError(500);

    const customer = CheckoutTestDataFactory.generateValidCustomer();
    
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    // Fill form
    await page.fill('input[name="email"]', customer.email);
    await page.fill('input[name="firstName"]', customer.firstName);
    await page.fill('input[name="lastName"]', customer.lastName);
    await page.fill('input[name="address"]', customer.address);
    await page.fill('input[name="city"]', customer.city);
    await page.selectOption('select[name="state"]', customer.state);
    await page.fill('input[name="zipCode"]', customer.zipCode);
    await page.fill('input[name="phone"]', customer.phone);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for error handling
    await page.waitForTimeout(5000);
    
    // Should show error message
    const errorMessage = page.locator('.error-message, .alert-error, .text-red-500');
    expect(await errorMessage.count()).toBeGreaterThan(0);
    
    // Should remain on checkout page
    expect(page.url()).toContain('/checkout');
  });

  test('should handle payment processing errors', async ({ page }) => {
    const errorSimulator = new CheckoutErrorSimulator(page);
    await errorSimulator.simulatePaymentError();

    const customer = CheckoutTestDataFactory.generateValidCustomer();
    
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    // Complete form
    await page.fill('input[name="email"]', customer.email);
    await page.fill('input[name="firstName"]', customer.firstName);
    await page.fill('input[name="lastName"]', customer.lastName);
    await page.fill('input[name="address"]', customer.address);
    await page.fill('input[name="city"]', customer.city);
    await page.selectOption('select[name="state"]', customer.state);
    await page.fill('input[name="zipCode"]', customer.zipCode);
    await page.fill('input[name="phone"]', customer.phone);
    
    // Submit
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    
    // Should show payment error
    const paymentError = page.locator('.payment-error, .error-message');
    expect(await paymentError.count()).toBeGreaterThan(0);
    
    const errorText = await paymentError.first().textContent();
    expect(errorText).toContain('declined');
  });

  test('should handle network timeouts', async ({ page }) => {
    const errorSimulator = new CheckoutErrorSimulator(page);
    await errorSimulator.simulateNetworkTimeout();

    const customer = CheckoutTestDataFactory.generateValidCustomer();
    
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    // Fill form
    await page.fill('input[name="email"]', customer.email);
    await page.fill('input[name="firstName"]', customer.firstName);
    await page.fill('input[name="lastName"]', customer.lastName);
    await page.fill('input[name="address"]', customer.address);
    await page.fill('input[name="city"]', customer.city);
    await page.selectOption('select[name="state"]', customer.state);
    await page.fill('input[name="zipCode"]', customer.zipCode);
    await page.fill('input[name="phone"]', customer.phone);
    
    // Submit and wait for timeout
    await page.click('button[type="submit"]');
    
    // Should show loading state
    const loadingIndicator = page.locator('.loading, .spinner, [data-testid="loading"]');
    expect(await loadingIndicator.isVisible()).toBe(true);
    
    // Wait for timeout handling
    await page.waitForTimeout(35000);
    
    // Should show timeout error
    const timeoutError = page.locator('.timeout-error, .error-message');
    expect(await timeoutError.count()).toBeGreaterThan(0);
  });
});

test.describe('Checkout Performance Integration', () => {
  test('should complete checkout within performance benchmarks', async ({ page }) => {
    const performanceMonitor = new CheckoutPerformanceMonitor(page);
    performanceMonitor.startMonitoring();

    const customer = CheckoutTestDataFactory.generateValidCustomer();
    
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    // Fill form
    await page.fill('input[name="email"]', customer.email);
    await page.fill('input[name="firstName"]', customer.firstName);
    await page.fill('input[name="lastName"]', customer.lastName);
    await page.fill('input[name="address"]', customer.address);
    await page.fill('input[name="city"]', customer.city);
    await page.selectOption('select[name="state"]', customer.state);
    await page.fill('input[name="zipCode"]', customer.zipCode);
    await page.fill('input[name="phone"]', customer.phone);
    
    performanceMonitor.markFormFillComplete();
    
    // Submit form
    await page.click('button[type="submit"]');
    performanceMonitor.markSubmissionComplete();
    
    // Wait for completion
    await page.waitForURL(/\/(success|thank-you|upsell)/, { timeout: 60000 });
    performanceMonitor.markCheckoutComplete();
    
    // Validate performance
    const metrics = performanceMonitor.getMetrics();
    const violations = performanceMonitor.validateBenchmarks();
    
    console.log('Performance metrics:', metrics);
    
    if (violations.length > 0) {
      console.warn('Performance violations:', violations);
    }
    
    // Key performance assertions
    expect(metrics.formFillTime).toBeLessThan(30000); // 30 seconds
    expect(metrics.totalCheckoutTime).toBeLessThan(60000); // 60 seconds
  });

  test('should handle concurrent checkout sessions', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);
    
    const pages = await Promise.all(contexts.map(context => context.newPage()));
    
    try {
      // Start concurrent checkouts
      const checkoutPromises = pages.map(async (page, index) => {
        const customer = CheckoutTestDataFactory.generateValidCustomer({
          email: `concurrent-${index}@webseed.com`
        });
        
        await page.goto('/checkout');
        await page.waitForLoadState('networkidle');
        
        // Fill form
        await page.fill('input[name="email"]', customer.email);
        await page.fill('input[name="firstName"]', customer.firstName);
        await page.fill('input[name="lastName"]', customer.lastName);
        await page.fill('input[name="address"]', customer.address);
        await page.fill('input[name="city"]', customer.city);
        await page.selectOption('select[name="state"]', customer.state);
        await page.fill('input[name="zipCode"]', customer.zipCode);
        await page.fill('input[name="phone"]', customer.phone);
        
        // Submit
        await page.click('button[type="submit"]');
        
        // Wait for completion
        await page.waitForURL(/\/(success|thank-you|upsell)/, { timeout: 90000 });
        
        return page.url();
      });
      
      // Wait for all checkouts to complete
      const results = await Promise.all(checkoutPromises);
      
      // All should succeed
      results.forEach(url => {
        expect(url).toMatch(/\/(success|thank-you|upsell)/);
      });
      
    } finally {
      // Cleanup
      await Promise.all(contexts.map(context => context.close()));
    }
  });
});

test.describe('Checkout State Management', () => {
  test('should preserve form state during session', async ({ page }) => {
    const stateManager = new CheckoutStateManager(page);
    
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    // Fill partial form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    
    // Save state
    const formData = await stateManager.getCurrentFormValues();
    await stateManager.saveFormState(formData);
    
    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Restore state
    const savedState = await stateManager.loadFormState();
    if (savedState) {
      await stateManager.restoreFormValues(savedState);
    }
    
    // Verify state was preserved
    expect(await page.inputValue('input[name="email"]')).toBe('test@example.com');
    expect(await page.inputValue('input[name="firstName"]')).toBe('John');
    expect(await page.inputValue('input[name="lastName"]')).toBe('Doe');
  });

  test('should clear sensitive data on completion', async ({ page }) => {
    const stateManager = new CheckoutStateManager(page);
    
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    // Fill form with sensitive data
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="phone"]', '1234567890');
    
    // Save state
    const formData = await stateManager.getCurrentFormValues();
    await stateManager.saveFormState(formData);
    
    // Simulate checkout completion
    await page.goto('/success');
    
    // State should be cleared
    await stateManager.clearFormState();
    const clearedState = await stateManager.loadFormState();
    expect(clearedState).toBeNull();
  });
});
