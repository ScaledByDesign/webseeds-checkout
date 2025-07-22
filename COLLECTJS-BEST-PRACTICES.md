# CollectJS Best Practices Guide

Based on EasyPay Direct Gateway documentation and implementation experience.

## Configuration Best Practices

### 1. Essential Configuration Fields
```javascript
{
  paymentSelector: '#payment-button',  // Required for automatic form handling
  variant: 'inline',                   // Use 'inline' for embedded fields
  tokenizationKey: 'your-key-here',    // Always use environment variables
}
```

### 2. Enhanced Field Styling
Provide comprehensive CSS for all states:
- `invalidCss`: Red colors with shadow for errors
- `validCss`: Green colors with subtle shadow for success
- `placeholderCss`: Muted, italic text for placeholders
- `focusCss`: Blue highlight with shadow for active fields

### 3. Field Validation States
Track three states for each field:
- `empty`: Field has no content
- `invalid`: Field has invalid content
- `valid`: Field passes validation

### 4. Callback Implementation

#### Validation Callback
```javascript
validationCallback: function(field, status, message) {
  // Always log with timestamp
  const timestamp = new Date().toLocaleTimeString()
  console.log(`[${timestamp}] ${field}: ${status} - ${message}`)
  
  // Update UI based on validation
  updateFieldStatus(field, status)
  
  // Check overall form validity when last field validates
  if (field === 'cvv' && status) {
    checkFormValidity()
  }
}
```

#### Timeout Handling
```javascript
timeoutDuration: 15000, // 15 seconds is reasonable
timeoutCallback: function() {
  // Provide helpful error messages
  console.log('Timeout reasons:')
  console.log('• Invalid card data')
  console.log('• Network issues')
  console.log('• Browser blocking')
}
```

### 5. Token Response Handling
Always check for:
- Token presence
- Card details (type, last 4 digits)
- Error messages
- Response metadata

## Implementation Patterns

### 1. Separate Component Pattern (React)
As noted in the React demo, CollectJS can cause re-render issues:
```javascript
// Separate CollectJS fields into their own component
// to prevent re-renders from disrupting iframes
<CollectJSFields />
<OtherFormFields />
```

### 2. Initialization Timing
```javascript
// Wait for DOM before configuring
useEffect(() => {
  if (window.CollectJS) {
    configureCollectJS()
  }
}, [])

// Add delay for iframe verification
fieldsAvailableCallback: function() {
  setTimeout(verifyIframes, 500)
}
```

### 3. Error Recovery
```javascript
// Implement retry logic
let retryCount = 0
const maxRetries = 3

function handleTokenError(error) {
  if (retryCount < maxRetries) {
    retryCount++
    setTimeout(() => {
      window.CollectJS.startPaymentRequest()
    }, 1000)
  } else {
    showUserError('Please refresh and try again')
  }
}
```

## Security Considerations

### 1. Environment Variables
Never hardcode keys:
```javascript
tokenizationKey: process.env.NEXT_PUBLIC_NMI_TOKENIZATION_KEY
```

### 2. HTTPS Only
CollectJS requires HTTPS in production:
- Use HTTPS even in development when possible
- Test with production-like certificates

### 3. Content Security Policy
Add CollectJS domains to your CSP:
```
frame-src https://secure.nmi.com;
script-src https://secure.nmi.com;
```

## Common Issues and Solutions

### 1. "Snap-in" Effect
**Problem**: Fields appear suddenly after page load
**Solution**: Show loading placeholder until fields ready

### 2. Validation Not Triggering
**Problem**: Fields don't validate on blur
**Solution**: Ensure `styleSniffer` is configured correctly

### 3. Token Not Generating
**Problem**: Callback never fires
**Solution**: Check all fields are valid before submission

### 4. Re-render Issues
**Problem**: React re-renders break CollectJS
**Solution**: Isolate CollectJS in separate component

## Testing Checklist

- [ ] Test with valid card numbers
- [ ] Test with invalid card numbers
- [ ] Test field validation messages
- [ ] Test timeout scenarios
- [ ] Test network interruptions
- [ ] Test browser back/forward
- [ ] Test mobile devices
- [ ] Test autofill behavior

## Performance Tips

1. **Lazy Load**: Only load CollectJS when needed
2. **Cache Script**: Use browser caching for Collect.js
3. **Minimize Re-renders**: Isolate CollectJS components
4. **Debounce Validation**: Avoid excessive validation calls

## Level 3 Data Integration

When using CollectJS with Level 3 data:
1. Calculate tax/shipping before tokenization
2. Include price in CollectJS config
3. Send line items with token to your API
4. Process everything in single transaction

## Debugging Tools

1. **Browser Console**: Monitor all CollectJS events
2. **Network Tab**: Check token requests
3. **CollectJS Callbacks**: Log everything
4. **Custom Debug Panel**: Show real-time status

## Production Checklist

- [ ] Use production tokenization key
- [ ] Enable HTTPS
- [ ] Configure CSP headers
- [ ] Set appropriate timeouts
- [ ] Implement error tracking
- [ ] Test all card types
- [ ] Verify Level 3 data
- [ ] Monitor success rates