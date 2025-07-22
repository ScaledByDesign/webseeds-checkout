# Manual Testing Steps for NMI Payment Flow

## The Timing Issue
The CollectJS payment fields load inside iframes that need time to initialize. Filling them too quickly causes the tokenization to fail silently.

## Step-by-Step Testing Process

### 1. Start the Dev Server
```bash
npm run dev
```

### 2. Open Browser with DevTools
- Open Chrome/Edge/Firefox
- Press F12 to open Developer Tools
- Go to Console tab
- Navigate to: http://localhost:3000/checkout

### 3. Fill Customer Information
Fill these fields at normal speed:
- Email: test@example.com
- First Name: John
- Last Name: Doe
- Address: 123 Test St
- City: Test City
- State: CA
- ZIP: 12345
- Phone: 5551234567
- Name on Card: John Doe

### 4. CRITICAL: Wait for Payment Fields
**⚠️ IMPORTANT: Wait at least 5-10 seconds after the page loads before filling payment fields!**

Look for these indicators that fields are ready:
- The "Loading secure payment system..." message should be gone
- The payment fields should have a cursor when clicked
- Console should show: "CollectJS fields are ready"

### 5. Fill Payment Fields SLOWLY
This is the most important part:

1. **Card Number Field**
   - Click directly in the middle of the field (not on the card icons)
   - Wait 1 second
   - Type slowly: 4111111111111111
   - The field should format it as: 4111 1111 1111 1111

2. **Expiry Field**
   - Press TAB or click in the expiry field
   - Wait 1 second
   - Type slowly: 12/25 or 1225
   - The field should show: 12/25

3. **CVV Field**
   - Press TAB or click in the CVV field
   - Wait 1 second
   - Type slowly: 123

### 6. Verify Fields Are Filled
Before submitting, check:
- All three payment fields show values
- No error messages appear
- Console shows validation messages (if any)

### 7. Submit the Form
- Click "Complete Your Order"
- Watch the console for:
  - "🚀 Triggering CollectJS tokenization..."
  - "🔍 CollectJS callback triggered:"
  - "✅ Token received:" (SUCCESS!)

### 8. Expected Results

**If Successful:**
- Token will be received
- Processing overlay appears
- Page redirects to /upsell/1
- Transaction should appear in NMI dashboard

**If Failed:**
- No token received
- Error message appears
- Page stays on checkout

## Troubleshooting

### Fields Won't Accept Input
- Refresh the page
- Wait longer (10-15 seconds) before typing
- Try clicking multiple times in the field

### Tokenization Not Triggering
Open browser console and run:
```javascript
// Check if fields are valid
CollectJS.isValid('ccnumber')
CollectJS.isValid('ccexp')
CollectJS.isValid('cvv')

// Manually trigger tokenization
CollectJS.startPaymentRequest()
```

### Common Issues
1. **Typing too fast** - The iframes can't keep up
2. **Not waiting for iframe load** - Fields appear ready but aren't
3. **Clicking outside the input area** - Click in the center of fields
4. **Browser autofill** - Disable autofill for testing

## Alternative: Use the Test Script
```bash
node test-collectjs-with-delay.js
```
This script includes proper delays and will show you exactly what's happening.