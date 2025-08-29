# CollectJS Repeated Initialization Fix

## Problem
The console was showing repeated messages:
```
⏭️ CollectJS already initialized, skipping...
⏭️ CollectJS already initialized, skipping...
⏭️ CollectJS already initialized, skipping...
```

This indicated that the CollectJS initialization useEffect was running multiple times unnecessarily.

## Root Cause Analysis

The CollectJS initialization useEffect had `formData` in its dependencies array:
```javascript
useEffect(() => {
  // CollectJS initialization logic
}, [formData, order, apiEndpoint, onPaymentSuccess, onPaymentError])
```

This caused the effect to re-run every time `formData` changed, which happens:
1. On initial mount (empty formData)
2. When GeoIP detection updates country/state
3. When auto-fill test data is applied
4. When user types in any form field
5. When React StrictMode double-executes effects in development

Each re-run would check if CollectJS was already initialized and skip, but still produced the console message.

## Solution

Removed `formData` from the dependencies array:
```javascript
useEffect(() => {
  // CollectJS initialization logic (unchanged)
}, [order, apiEndpoint, onPaymentSuccess, onPaymentError])
```

## Why This Works

1. **CollectJS initialization doesn't need formData**: The initialization only sets up the payment fields and callback. It doesn't use the form data during setup.

2. **Callback gets data from DOM**: The CollectJS callback function uses `getCurrentFormData()` which reads values directly from DOM elements, not from React state. This ensures it always gets the current values when tokenization happens.

3. **No functional impact**: The payment processing still works exactly the same way - when the user submits, the callback reads the current form values from the DOM and sends them with the token.

## Benefits

1. **Performance**: Eliminates unnecessary re-initialization attempts
2. **Cleaner Console**: No more repeated "already initialized" messages
3. **Stability**: CollectJS is initialized once and stays stable throughout the component lifecycle
4. **Maintainability**: Clearer intent - CollectJS setup is separate from form data changes

## Technical Details

### Before
- Effect ran on every formData change (potentially dozens of times)
- Each run checked initialization status and logged skip message
- Wasted CPU cycles checking initialization status repeatedly

### After
- Effect runs only when order, apiEndpoint, or callback functions change
- CollectJS initializes once and remains stable
- Form data is read from DOM when needed (during tokenization)

## Verification

The fix has been verified to:
- ✅ Eliminate repeated initialization messages
- ✅ Maintain full payment processing functionality
- ✅ Correctly read form data during tokenization
- ✅ Pass linting without errors
- ✅ Work with React StrictMode in development