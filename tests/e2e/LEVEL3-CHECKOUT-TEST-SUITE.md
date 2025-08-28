# Level 3 Checkout Test Suite

## Overview

Comprehensive test suite for the Level 3 data collection checkout implementation with CollectJS integration. This suite validates all aspects of the enhanced checkout flow, from basic functionality to advanced Level 3 processing.

## Test Architecture

### 🏗️ **Test Structure**

```
tests/
├── e2e/
│   └── level3-checkout.spec.ts          # Main test suite
├── configs/
│   └── level3-test.config.ts            # Specialized configuration
├── helpers/
│   ├── level3-global-setup.ts           # Environment setup
│   └── level3-global-teardown.ts        # Cleanup and reporting
└── LEVEL3-CHECKOUT-TEST-SUITE.md        # This documentation
```

### 🎯 **Test Coverage**

#### **Core Functionality Tests**
- ✅ **Page Load & Initialization**
  - Level 3 page loads with all enhancements
  - CollectJS fields mount correctly with styling
  - Auto-fill button and comparison links present

- ✅ **Form Data Collection**
  - Customer information (email, phone, address)
  - Shipping address with validation
  - Payment data via CollectJS iframes
  - Name on card and billing preferences

- ✅ **Level 3 Data Validation**
  - Complete customer data structure
  - Product information array
  - Billing address handling (same/separate)
  - Payment token from CollectJS

#### **CollectJS Integration Tests**
- ✅ **Field Mounting**
  - Card number, expiry, CVV fields mount in correct containers
  - Styling inheritance via styleSniffer
  - Iframe accessibility and interaction

- ✅ **Tokenization Process**
  - Secure token generation
  - Field validation before submission
  - Error handling for invalid cards

#### **Enhanced Features Tests**
- ✅ **Auto-Fill Functionality**
  - Button triggers form population
  - All fields filled with test data
  - Works across different browsers

- ✅ **Separate Billing Address**
  - Checkbox toggles billing section
  - Additional fields appear/disappear
  - Billing data included in Level 3 payload

- ✅ **Form Validation**
  - Required field validation
  - CollectJS field validation
  - Error message display

#### **API Integration Tests**
- ✅ **Level 3 Payload Structure**
  - Customer info completeness
  - Product array structure
  - Payment token inclusion
  - Billing info conditional inclusion

- ✅ **Request Interception**
  - API calls to `/api/nmi-direct`
  - Payload validation
  - Response handling

#### **Cross-Browser & Responsive Tests**
- ✅ **Browser Compatibility**
  - Chrome, Firefox, Safari, Edge
  - Mobile Chrome and Safari
  - Consistent behavior across platforms

- ✅ **Mobile Responsiveness**
  - Form usability on mobile devices
  - Auto-fill works on mobile
  - CollectJS fields responsive

#### **Error Handling Tests**
- ✅ **CollectJS Failures**
  - Script loading failures
  - Network timeouts
  - Invalid card handling

- ✅ **Form Validation Errors**
  - Missing required fields
  - Invalid data formats
  - User-friendly error messages

## Test Data

### 🧪 **Test Customer Data**
```javascript
const LEVEL3_TEST_DATA = {
  customer: {
    email: 'level3test@example.com',
    phone: '555-123-4567',
    address: '123 Level 3 Street',
    apartment: 'Suite 100',
    city: 'Level3 City',
    state: 'CA',
    zip: '12345',
    country: 'us',
    nameOnCard: 'John Level3 Doe'
  },
  payment: {
    cardNumber: '4111111111111111', // Test Visa
    expiry: '12/25',
    cvv: '123'
  },
  billing: {
    address: '456 Billing Street',
    city: 'Billing City',
    state: 'NY',
    zip: '54321'
  }
}
```

### 🎯 **Expected Level 3 Payload**
```javascript
{
  customerInfo: {
    email: "level3test@example.com",
    firstName: "John",
    lastName: "Level3 Doe",
    phone: "555-123-4567",
    address: "123 Level 3 Street",
    city: "Level3 City",
    state: "CA",
    zipCode: "12345",
    country: "us"
  },
  paymentToken: "secure-collectjs-token",
  products: [{
    id: "fitspresso-6-pack",
    name: "Fitspresso 6 Bottle Super Pack",
    price: 294,
    quantity: 1
  }],
  billingInfo: {
    // Conditional based on checkbox
    address: "456 Billing Street",
    city: "Billing City", 
    state: "NY",
    zipCode: "54321",
    country: "US"
  }
}
```

## Running Tests

### 🚀 **Quick Start**

```bash
# Run all Level 3 tests
node scripts/test-level3-checkout.js

# Run with visual debugging
node scripts/test-level3-checkout.js --headed --debug

# Run specific test pattern
node scripts/test-level3-checkout.js --grep "auto-fill"

# Run with video recording
node scripts/test-level3-checkout.js --video --trace
```

### 🔧 **Advanced Options**

```bash
# Test all browsers
node scripts/test-level3-checkout.js --browser all

# Run with custom timeout
node scripts/test-level3-checkout.js --timeout 90000

# Run with retries
node scripts/test-level3-checkout.js --retries 2

# Parallel execution
node scripts/test-level3-checkout.js --workers 3
```

### 📊 **Using Playwright Directly**

```bash
# Run with custom config
npx playwright test --config tests/configs/level3-test.config.ts

# Run specific test file
npx playwright test tests/e2e/level3-checkout.spec.ts

# Generate report
npx playwright show-report playwright-report/level3
```

## Test Scenarios

### 📋 **Scenario 1: Complete Level 3 Flow**
1. Navigate to Level 3 checkout page
2. Use auto-fill to populate customer data
3. Fill CollectJS payment fields
4. Submit form and intercept API call
5. Validate Level 3 payload structure
6. Verify all required data present

### 📋 **Scenario 2: Separate Billing Address**
1. Fill customer data with auto-fill
2. Uncheck "use same address" checkbox
3. Fill separate billing address
4. Submit and verify billing data in payload
5. Confirm billing info structure

### 📋 **Scenario 3: Error Handling**
1. Test form validation with empty fields
2. Test CollectJS validation with invalid cards
3. Test CollectJS loading failures
4. Verify error messages display correctly

### 📋 **Scenario 4: Mobile Responsiveness**
1. Set mobile viewport
2. Test all functionality on mobile
3. Verify auto-fill works on mobile
4. Confirm CollectJS fields responsive

## Expected Results

### ✅ **Success Criteria**

#### **Functional Requirements**
- All form fields collect data correctly
- CollectJS fields mount and function properly
- Level 3 payload contains all required data
- Auto-fill populates all fields accurately
- Separate billing address works correctly

#### **Technical Requirements**
- CollectJS tokenization succeeds
- API calls include proper Level 3 structure
- Error handling prevents form submission issues
- Mobile responsiveness maintained
- Cross-browser compatibility verified

#### **Performance Requirements**
- Page loads within 3 seconds
- CollectJS initializes within 10 seconds
- Form submission processes within 30 seconds
- No memory leaks or console errors

### 📊 **Test Metrics**

#### **Coverage Metrics**
- **Form Fields**: 100% of fields tested
- **CollectJS Integration**: All 3 payment fields
- **Level 3 Data**: All customer, product, billing data
- **Error Scenarios**: 5+ error conditions tested
- **Browser Coverage**: 6+ browser/device combinations

#### **Quality Metrics**
- **Pass Rate**: Target 95%+ across all browsers
- **Performance**: Page load < 3s, CollectJS ready < 10s
- **Reliability**: Tests pass consistently across runs
- **Maintainability**: Clear test structure and documentation

## Troubleshooting

### 🔧 **Common Issues**

#### **CollectJS Loading Failures**
```bash
# Check environment variables
echo $NEXT_PUBLIC_NMI_TOKENIZATION_KEY
echo $NEXT_PUBLIC_COLLECT_JS_URL

# Verify network connectivity
curl -I https://secure.nmi.com/token/Collect.js
```

#### **Test Timeouts**
```bash
# Increase timeout for slow environments
node scripts/test-level3-checkout.js --timeout 120000

# Run with debug mode
node scripts/test-level3-checkout.js --headed --debug
```

#### **API Endpoint Issues**
```bash
# Test API endpoint directly
curl -X POST http://localhost:3000/api/nmi-direct \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### 📝 **Debug Information**

#### **Console Logs to Monitor**
- `✅ Configuring CollectJS with Level 3 data collection...`
- `✅ CollectJS fields ready for Level 3 data collection`
- `🚀 Starting Level 3 tokenization...`
- `Payment token received: token-12345`
- `Sending Level 3 data to NMI: {...}`

#### **Network Requests to Check**
- CollectJS script loading from NMI
- API POST to `/api/nmi-direct`
- Level 3 payload structure in request body

## Maintenance

### 🔄 **Regular Updates**

#### **Monthly Tasks**
- Update test data with current dates
- Verify CollectJS script URLs
- Check NMI API endpoint status
- Review and update browser versions

#### **Quarterly Tasks**
- Performance benchmark comparison
- Security review of test data
- Update test scenarios based on new features
- Cross-browser compatibility matrix update

### 📈 **Continuous Improvement**

#### **Metrics to Track**
- Test execution time trends
- Pass rate across different environments
- CollectJS loading performance
- API response time patterns

#### **Enhancement Opportunities**
- Add visual regression testing
- Implement accessibility testing
- Add performance monitoring
- Expand error scenario coverage

---

## Support

For issues with the Level 3 checkout test suite:

1. **Check Prerequisites**: Ensure all required files exist
2. **Review Logs**: Check console output for specific errors
3. **Verify Environment**: Confirm NMI configuration
4. **Run Debug Mode**: Use `--headed --debug` for investigation
5. **Check Reports**: Review HTML reports for detailed results

**Test Suite Version**: 1.0.0  
**Last Updated**: 2024-01-XX  
**Compatibility**: Playwright 1.40+, Node.js 18+
