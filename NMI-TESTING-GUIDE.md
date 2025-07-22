# NMI Gateway Testing Guide

## Current Status
- ✅ NMI keys configured in `.env.local`
- ✅ API endpoints updated to use real checkout process
- ✅ CollectJS loads successfully
- ❌ Form submission not completing - tokenization callback not firing

## The Issue
When you click "Complete Your Order", the form captures the data and calls `CollectJS.startPaymentRequest()`, but the callback with the payment token is never triggered. This happens when:

1. **Card fields are not completely filled** - All three fields must have valid data:
   - Card Number: Must be complete (e.g., 4111111111111111)
   - Expiry: Must be in MM/YY format (e.g., 12/25)
   - CVV: Must be 3-4 digits (e.g., 123)

2. **Card fields are filled incorrectly** - The fields use secure iframes, so:
   - Click directly inside each field (not on the icons)
   - Type the values manually
   - Tab between fields to ensure focus moves correctly

## How to Test Successfully

### Step 1: Load the checkout page
```
http://localhost:3000/checkout
```

### Step 2: Fill customer information
Fill all the regular form fields with test data.

### Step 3: Fill payment fields CAREFULLY
1. **Click inside the Card Number field** (avoid the card icons on the right)
   - Type: `4111111111111111`
   - You should see the field format as: `4111 1111 1111 1111`

2. **Tab or click to the Expiry field**
   - Type: `1225` (for 12/25)
   - The field should auto-format to: `12/25`

3. **Tab or click to the CVV field**
   - Type: `123`

### Step 4: Submit the form
Click "Complete Your Order" and watch the browser console for:
- `🚀 Triggering CollectJS tokenization...`
- `Field validation: ccnumber - valid/invalid`
- `🔍 CollectJS callback triggered:`
- `✅ Token received:` (if successful)

## What Should Happen

### Success Flow:
1. Form validates customer data
2. CollectJS tokenizes the card data
3. Token is sent to `/api/checkout/process`
4. Inngest processes payment through NMI
5. Page polls for status
6. On success, redirects to `/upsell/1`

### Current Problem:
The tokenization callback is not firing, which means either:
- The card fields don't have valid data
- The fields weren't properly focused/filled
- CollectJS validation is failing silently

## Debugging Tips

1. **Open Browser DevTools Console** before testing
2. **Watch for validation messages** as you type in fields
3. **Check for the callback message** after clicking submit
4. **Ignore the PaymentRequestAbstraction error** - it's harmless

## Alternative Testing Method

If the inline tokenization continues to fail, you can:

1. **Check if fields are validated**:
   ```javascript
   // In browser console after filling fields:
   CollectJS.isValid('ccnumber')  // Should return true
   CollectJS.isValid('ccexp')     // Should return true
   CollectJS.isValid('cvv')       // Should return true
   ```

2. **Manually trigger tokenization**:
   ```javascript
   // In browser console:
   CollectJS.startPaymentRequest()
   ```

## Next Steps

1. Try filling the card fields exactly as described above
2. Make sure to enter the expiry as MM/YY (with the slash)
3. Check browser console for validation and callback messages
4. Once a token is received, check NMI dashboard for the transaction

## Environment Variables (Confirmed)
```env
NMI_SECURITY_KEY=6ZAAf76qD8RfbX4fkB6jQ58XVde9AJa4
NEXT_PUBLIC_NMI_TOKENIZATION_KEY=vZ668s-j859wu-6THDmy-kA46Hh
NEXT_PUBLIC_NMI_CHECKOUT_KEY=checkout_public_eKbV7AXT7wvnRuF7v5e8UaM5sa5sr8xq
NEXT_PUBLIC_NMI_MERCHANT_ID=ScaledByDesignTestADMIN
```

The integration is properly configured - the issue is specifically with the card field entry and tokenization callback.