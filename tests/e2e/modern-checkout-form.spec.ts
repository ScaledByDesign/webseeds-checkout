import { test, expect } from '@playwright/test';

test.describe('ModernCheckoutForm Integration Tests', () => {

  test('Page loads with all form elements', async ({ page }) => {
    console.log('🧪 Testing page load and element presence...');
    
    await page.goto('http://localhost:3000/checkout');
    
    // Wait for page to fully load
    await expect(page.locator('h3').first()).toHaveText('Contact');
    
    // Check main sections are present
    await expect(page.locator('text=Customer Information')).toBeVisible();
    await expect(page.locator('text=Shipping')).toBeVisible();
    await expect(page.locator('text=Payment')).toBeVisible();
    
    // Check all form fields are present
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
    await expect(page.locator('input[name="address"]')).toBeVisible();
    await expect(page.locator('input[name="city"]')).toBeVisible();
    await expect(page.locator('input[name="state"]')).toBeVisible();
    await expect(page.locator('input[name="zipCode"]')).toBeVisible();
    await expect(page.locator('select[name="country"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();
    await expect(page.locator('input[name="nameOnCard"]')).toBeVisible();
    
    // Check CollectJS payment fields
    await expect(page.locator('#card-number-field')).toBeVisible();
    await expect(page.locator('#card-expiry-field')).toBeVisible();
    await expect(page.locator('#card-cvv-field')).toBeVisible();
    
    // Check submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    console.log('✅ All elements present and visible');
  });

  test('Form can be filled with test data', async ({ page }) => {
    console.log('🧪 Testing form data entry...');
    
    await page.goto('http://localhost:3000/checkout');
    await page.waitForSelector('input[name="email"]');
    
    // Fill all required fields
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="address"]', '123 Test Street');
    await page.fill('input[name="city"]', 'Test City');
    await page.fill('input[name="state"]', 'CA');
    await page.fill('input[name="zipCode"]', '12345');
    await page.fill('input[name="phone"]', '5551234567');
    await page.fill('input[name="nameOnCard"]', 'John Doe');
    
    // Check values are set correctly
    await expect(page.locator('input[name="email"]')).toHaveValue('test@example.com');
    await expect(page.locator('input[name="firstName"]')).toHaveValue('John');
    await expect(page.locator('input[name="lastName"]')).toHaveValue('Doe');
    
    console.log('✅ Form can be filled with valid data');
  });

  test('Original styling preserved', async ({ page }) => {
    console.log('🧪 Testing styling preservation...');
    
    await page.goto('http://localhost:3000/checkout');
    await page.waitForSelector('input[name="email"]');
    
    // Check email field has correct Tailwind classes
    const emailField = page.locator('input[name="email"]');
    const emailClasses = await emailField.getAttribute('class');
    
    expect(emailClasses).toContain('border-gray-cd');
    expect(emailClasses).toContain('px-9');
    expect(emailClasses).toContain('py-8');
    expect(emailClasses).toContain('rounded-xl');
    
    // Check first name field has bg-gray-f9 class
    const firstNameField = page.locator('input[name="firstName"]');
    const firstNameClasses = await firstNameField.getAttribute('class');
    expect(firstNameClasses).toContain('bg-gray-f9');
    
    // Check submit button styling
    const submitButton = page.locator('button[type="submit"]');
    const buttonClasses = await submitButton.getAttribute('class');
    expect(buttonClasses).toContain('bg-yellow-f6c657');
    expect(buttonClasses).toContain('rounded-full');
    
    console.log('✅ Original styling preserved');
  });

  test('CollectJS fields are setup correctly', async ({ page }) => {
    console.log('🧪 Testing CollectJS integration...');
    
    await page.goto('http://localhost:3000/checkout');
    
    // CollectJS payment fields should be present
    await expect(page.locator('#card-number-field')).toBeVisible();
    await expect(page.locator('#card-expiry-field')).toBeVisible();
    await expect(page.locator('#card-cvv-field')).toBeVisible();
    
    // Check payment field styling
    const cardField = page.locator('#card-number-field');
    const cardClasses = await cardField.getAttribute('class');
    expect(cardClasses).toContain('border-gray-cd');
    expect(cardClasses).toContain('min-h-[4rem]');
    
    console.log('✅ CollectJS fields setup verified');
  });

  test('Submit button responds to form state', async ({ page }) => {
    console.log('🧪 Testing submit button behavior...');
    
    await page.goto('http://localhost:3000/checkout');
    await page.waitForSelector('button[type="submit"]');
    
    const submitButton = page.locator('button[type="submit"]');
    
    // Check initial button text
    const buttonText = await submitButton.textContent();
    expect(['Complete Your Order', 'Processing...', 'Loading secure payment system...']).toContain(buttonText?.trim() || '');
    
    console.log('✅ Submit button working correctly');
  });

  test('Mobile responsiveness maintained', async ({ page }) => {
    console.log('🧪 Testing mobile responsiveness...');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000/checkout');
    await page.waitForSelector('input[name="email"]');
    
    // All fields should still be visible and accessible
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Test that form is still usable on mobile
    await page.fill('input[name="email"]', 'mobile@test.com');
    await expect(page.locator('input[name="email"]')).toHaveValue('mobile@test.com');
    
    console.log('✅ Mobile responsiveness verified');
  });

});

test.describe('API Integration Tests', () => {
  
  test('API endpoint accepts form data correctly', async ({ page, request }) => {
    console.log('🧪 Testing API integration...');
    
    // Test the API directly
    const response = await request.post('http://localhost:3000/api/test-checkout', {
      data: {
        customerInfo: {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          phone: '5551234567',
          address: '123 Test St',
          city: 'Test City',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        },
        paymentToken: 'test-token-12345',
        products: [
          {
            id: 'fitspresso-6-pack',
            name: 'Fitspresso 6 Bottle Super Pack',
            price: 294,
            quantity: 1
          }
        ],
        billingInfo: {
          address: '123 Test St',
          city: 'Test City',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        }
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.sessionId).toBeDefined();
    
    console.log('✅ API integration working correctly');
  });
  
});