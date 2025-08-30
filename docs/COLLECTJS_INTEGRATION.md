# CollectJS Integration Documentation

## Overview
This document describes the centralized CollectJS service implementation for secure payment tokenization in the Webseeds Checkout system.

## Architecture

### Service Location
- **Main Service**: `/src/lib/collectjs-service.ts`
- **Integration**: `/components/NewDesignCheckoutForm.tsx`

### Key Components

#### 1. CollectJS Service (`collectjs-service.ts`)
A singleton service that manages all CollectJS operations:

```typescript
// Get the singleton instance
const collectJSService = getCollectJSService()

// Initialize with configuration
await collectJSService.initialize({
  fieldSelectors: {
    cardNumber: '#ccnumber',
    expiry: '#ccexp',
    cvv: '#cvv'
  },
  onToken: (result) => { /* Handle token */ },
  onValidation: (field, status, message) => { /* Handle validation */ },
  onReady: () => { /* Service ready */ },
  onError: (error) => { /* Handle errors */ }
})
```

#### 2. Service Features
- **Singleton Pattern**: Single instance manages all CollectJS operations
- **Async Initialization**: Proper loading and configuration sequence
- **Field Validation**: Real-time validation callbacks for each field
- **Token Generation**: Secure tokenization with error handling
- **Ready State Management**: Tracks when service is ready for use

## Implementation Details

### Initialization Flow

1. **Service Creation**
   ```typescript
   const collectJSService = getCollectJSService()
   ```

2. **Script Loading**
   - Checks for existing script to avoid duplicates
   - Loads CollectJS script from NMI CDN
   - Handles load errors gracefully

3. **Configuration**
   - Waits for script to load
   - Configures CollectJS with field selectors
   - Sets up callbacks for validation and tokenization
   - Waits for `fieldsAvailableCallback` to confirm ready state

4. **Ready State**
   - Service tracks both `isLoaded` (script loaded) and `isConfigured` (fields ready)
   - `isReady()` returns true only when both conditions are met
   - Timeout fallback (3 seconds) ensures service becomes ready even if callback fails

### Best Practices Implemented

1. **Promise-Based Configuration**
   ```typescript
   private configureCollectJS(): Promise<void> {
     return new Promise((resolve, reject) => {
       // Configuration with fieldsAvailableCallback
       // Resolves when fields are ready
     })
   }
   ```

2. **Proper Error Handling**
   - Network errors during script loading
   - Configuration failures
   - Token generation errors
   - Validation errors per field

3. **Security Features**
   - PCI compliance through iframe isolation
   - No direct access to card data
   - Secure token generation
   - Environment-specific tokenization keys

## Usage in Checkout Form

### Integration Example
```typescript
// In NewDesignCheckoutForm.tsx
useEffect(() => {
  const initializeCollectJS = async () => {
    try {
      await collectJSService.initialize({
        fieldSelectors: {
          cardNumber: '#ccnumber',
          expiry: '#ccexp',
          cvv: '#cvv'
        },
        onToken: (result) => {
          if (result.success && result.token) {
            // Process payment with token
            const paymentData = {
              ...formData,
              paymentToken: result.token
            }
            onPaymentSuccess(paymentData)
          }
        },
        onValidation: (field, status, message) => {
          // Update field validation state
          updateFieldError(field, status, message)
        }
      })
    } catch (error) {
      console.error('Failed to initialize CollectJS:', error)
    }
  }

  initializeCollectJS()
}, [])
```

### Form Submission
```typescript
const handleSubmit = async (e) => {
  e.preventDefault()
  
  // Check if service is ready
  if (!collectJSService.isReady()) {
    showError('Payment system not ready')
    return
  }
  
  // Validate form fields
  if (!validateForm()) {
    return
  }
  
  // Start payment request
  await collectJSService.startPaymentRequest()
  // Token generation handled in onToken callback
}
```

## Configuration

### Environment Variables
```env
# Required for CollectJS
NEXT_PUBLIC_NMI_TOKENIZATION_KEY=your_tokenization_key_here
NEXT_PUBLIC_NMI_COLLECT_JS_URL=https://secure.networkmerchants.com/token/Collect.js
```

### Field Selectors
The service expects these HTML elements with specific IDs:
- `#ccnumber` - Card number iframe container
- `#ccexp` - Expiry date iframe container  
- `#cvv` - CVV iframe container

## Testing

### E2E Test Integration
The service is validated using the existing E2E test:
```bash
node tests/e2e/test-complete-flow-fresh.js
```

### Key Test Points
1. ✅ Service initialization
2. ✅ Script loading
3. ✅ Field configuration
4. ✅ Ready state detection
5. ✅ Token generation
6. ✅ Error handling

## Troubleshooting

### Common Issues

1. **"CollectJS service not ready"**
   - Ensure service is initialized before use
   - Check browser console for initialization errors
   - Verify tokenization key is set

2. **Fields not appearing**
   - Check field selector IDs match HTML elements
   - Ensure CollectJS script loaded successfully
   - Verify tokenization key is valid

3. **Token generation fails**
   - Validate all card fields have valid data
   - Check for validation errors in console
   - Ensure test card numbers are used in sandbox

### Debug Logging
The service includes comprehensive logging:
- 🚀 Initialization steps
- ✅ Success states
- ❌ Error conditions
- 🔍 Validation events
- 💳 Token generation

## Security Considerations

1. **PCI Compliance**
   - Card data never touches our servers
   - Handled entirely through CollectJS iframes
   - Only tokens are transmitted

2. **Token Handling**
   - Tokens are single-use
   - Should be used immediately after generation
   - Never store tokens long-term

3. **Environment Isolation**
   - Use sandbox keys for development/testing
   - Production keys only in production environment
   - Never commit keys to version control

## API Reference

### Service Methods

#### `initialize(options)`
Initializes the CollectJS service with configuration.

**Parameters:**
- `fieldSelectors`: Object with card field selectors
- `onToken`: Callback for token generation
- `onValidation`: Callback for field validation
- `onReady`: Callback when service is ready
- `onError`: Callback for errors

**Returns:** `Promise<void>`

#### `isReady()`
Checks if service is ready for use.

**Returns:** `boolean`

#### `startPaymentRequest()`
Initiates payment token generation.

**Returns:** `Promise<TokenResult>`

#### `reset()`
Resets service state and clears fields.

**Returns:** `void`

## Migration Notes

### From Manual Setup
If migrating from manual CollectJS setup:

1. Remove manual script loading code
2. Remove manual CollectJS.configure calls
3. Replace with service initialization
4. Update token handling to use callbacks

### Backward Compatibility
The service maintains compatibility with existing checkout flow and NMI integration.

## Support

For issues or questions:
1. Check browser console for detailed logs
2. Review this documentation
3. Check NMI documentation for CollectJS specifics
4. Review test file: `tests/e2e/test-complete-flow-fresh.js`