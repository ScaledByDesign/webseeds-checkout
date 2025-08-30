# Webseeds Checkout System - Technical Documentation

## 🏗️ Project Overview

A secure, high-performance e-commerce checkout system built with Next.js 15, TypeScript, and PCI-compliant payment tokenization. The system features a multi-tier architecture with centralized session management, secure payment processing via NMI/CollectJS, and comprehensive validation throughout the checkout flow.

## 📋 Technical Stack

- **Frontend**: Next.js 15 (App Router), React 18, TypeScript 5
- **Styling**: Tailwind CSS with custom design system
- **Payment Processing**: NMI Gateway with CollectJS tokenization
- **Validation**: Zod schemas with centralized validation service
- **Session Management**: Multi-tier UnifiedSessionManager
- **Testing**: Playwright E2E tests
- **Security**: PCI-compliant iframe tokenization, CSP headers

## 🔄 Complete Checkout Flow Architecture

### 1. Page Flow Sequence
```
/checkout (Main Checkout)
    ↓ [CollectJS Token Generation]
    ↓ [Form Validation]
    ↓ [Payment Processing]
/upsell/1 (First Upsell)
    ↓ [Session-based Payment]
/upsell/2 (Second Upsell)
    ↓ [Session-based Payment]
/thankyou (Order Confirmation)
```

### 2. Technical Checkout Process

#### Phase 1: Form Initialization
```typescript
// NewDesignCheckoutForm.tsx - Line 120
const collectJSService = getCollectJSService()

// Initialize CollectJS with callbacks
useEffect(() => {
  const initializeCollectJS = async () => {
    await collectJSService.initialize({
      fieldSelectors: {
        cardNumber: '#ccnumber',
        expiry: '#ccexp', 
        cvv: '#cvv'
      },
      onToken: (result) => {
        // Token received, proceed with payment
        if (result.success && result.token) {
          const paymentData = {
            ...formData,
            paymentToken: result.token
          }
          processPayment(paymentData)
        }
      },
      onValidation: (field, status, message) => {
        // Real-time field validation
        updateFieldError(field, status, message)
      },
      onReady: () => {
        console.log('✅ CollectJS service ready')
      },
      onError: (error) => {
        handlePaymentError(error)
      }
    })
  }
  
  initializeCollectJS()
}, [])
```

#### Phase 2: Form Validation
```typescript
// Use centralized validation from /src/lib/validation
import { 
  validateCheckoutForm,
  validateField,
  createUserFriendlyValidationErrors 
} from '@/lib/validation'

// Validate entire form
const validationResult = validateCheckoutForm(formData)
if (!validationResult.isValid) {
  // Display user-friendly errors
  const errors = createUserFriendlyValidationErrors(validationResult.errors)
  showErrors(errors)
  return
}

// Real-time field validation
const handleFieldChange = (fieldName: string, value: any) => {
  const result = validateField(fieldName, value)
  if (!result.isValid) {
    setFieldError(fieldName, result.errors[0])
  }
}
```

#### Phase 3: Payment Token Generation
```typescript
// Trigger CollectJS token generation
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault()
  
  // Check service readiness
  if (!collectJSService.isReady()) {
    showError('Payment system not ready. Please wait...')
    return
  }
  
  // Validate form
  const validation = validateCheckoutForm(formData)
  if (!validation.isValid) {
    showErrors(validation.fieldErrors)
    return
  }
  
  // Start token generation (handled in onToken callback)
  await collectJSService.startPaymentRequest()
}
```

#### Phase 4: Payment Processing
```typescript
// Process payment with NMI
const processPayment = async (paymentData: CheckoutData) => {
  try {
    const response = await fetch('/api/nmi/process-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...paymentData,
        paymentToken: paymentData.paymentToken, // CollectJS token
        amount: calculateTotal(paymentData.products)
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      // Store session for upsells
      await sessionManager.createSession({
        orderId: result.orderId,
        customerId: result.customerId,
        paymentMethodId: result.paymentMethodId
      })
      
      // Redirect to upsell or thank you
      router.push('/upsell/1')
    } else {
      handlePaymentError(result.error)
    }
  } catch (error) {
    handlePaymentError(error)
  }
}
```

## 💳 CollectJS Service Integration

### Service Architecture
The CollectJS service (`/src/lib/collectjs-service.ts`) is a singleton that manages all payment field tokenization:

```typescript
// Get singleton instance
const collectJSService = getCollectJSService()

// Service lifecycle:
// 1. Load CollectJS script from CDN
// 2. Wait for script to be ready
// 3. Configure with tokenization key
// 4. Wait for fieldsAvailableCallback
// 5. Service ready for token generation
```

### Key Implementation Details

1. **Async Initialization with Promise**
```typescript
private configureCollectJS(): Promise<void> {
  return new Promise((resolve, reject) => {
    window.CollectJS.configure({
      // ... configuration
      fieldsAvailableCallback: () => {
        this.isConfigured = true
        resolve()
      }
    })
    
    // Timeout fallback (3 seconds)
    setTimeout(() => {
      if (!this.isConfigured) {
        this.isConfigured = true
        resolve()
      }
    }, 3000)
  })
}
```

2. **PCI Compliance**
- Card data never touches our servers
- Handled entirely through CollectJS iframes
- Only single-use tokens are transmitted
- Fields are isolated in secure iframes

3. **Error Handling**
```typescript
// Network errors
if (!script.loaded) {
  throw new Error('Failed to load CollectJS script')
}

// Configuration errors
if (!window.CollectJS) {
  throw new Error('CollectJS not available')
}

// Token generation errors
onError: (error) => {
  console.error('Token generation failed:', error)
  // User-friendly error display
}
```

## ✅ Validation System

### Centralized Validation Library
All validation is handled through `/src/lib/validation/index.ts`:

```typescript
// Main exports
export {
  // Schemas
  customerInfoSchema,
  productSchema,
  billingInfoSchema,
  paymentTokenSchema,
  checkoutRequestSchema,
  
  // Validation functions
  validateCheckoutForm,
  validateUpsellForm,
  validateField,
  createUserFriendlyValidationErrors,
  
  // Session validation
  validateSessionData,
  validatePaymentData,
  
  // Error handling
  errorHandler,
  createError,
  mapPaymentError
}
```

### Validation Flow
1. **Schema Definition** (Zod)
```typescript
// schemas.ts
export const customerInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number required')
})
```

2. **Form Validation**
```typescript
// form-validation.ts
export function validateCheckoutForm(data: any): FormValidationResult {
  try {
    checkoutRequestSchema.parse(data)
    return { isValid: true, errors: [], fieldErrors: {} }
  } catch (error) {
    // Convert to user-friendly errors
    const errors = createUserFriendlyValidationErrors(error)
    return { isValid: false, errors, fieldErrors }
  }
}
```

3. **User-Friendly Error Messages**
```typescript
// Converts technical errors to helpful messages
createUserFriendlyValidationErrors({
  'customer info.email': 'Invalid format'
})
// Returns:
{
  field: 'email',
  userFriendlyMessage: 'Please enter a valid email address',
  suggestions: ['Make sure to include @ and a domain']
}
```

## 📁 Project Structure

```
webseeds-checkout/
├── app/                          # Next.js App Router
│   ├── api/                     # API routes
│   │   └── nmi/                # NMI payment endpoints
│   ├── checkout/               # Main checkout page
│   ├── upsell/                 # Upsell pages
│   └── thankyou/               # Order confirmation
│
├── components/                   # React components
│   ├── NewDesignCheckoutForm.tsx  # Main checkout form with CollectJS
│   ├── ModernCheckoutForm.tsx     # Alternative checkout (deprecated)
│   └── [other components]
│
├── src/
│   ├── lib/
│   │   ├── collectjs-service.ts    # CollectJS singleton service
│   │   ├── cookie-session.ts       # Session management
│   │   ├── validation/             # Centralized validation
│   │   │   ├── index.ts           # Main exports
│   │   │   ├── schemas.ts         # Zod schemas
│   │   │   ├── form-validation.ts # Form validators
│   │   │   └── session-validation.ts
│   │   └── error-handling-service.ts
│   │
│   └── services/
│       └── nmi/
│           └── NMIService.ts      # NMI gateway integration
│
├── tests/
│   └── e2e/
│       ├── test-complete-flow-fresh.js  # PRIMARY E2E TEST
│       └── README.md                     # Test documentation
│
└── docs/
    ├── COLLECTJS_INTEGRATION.md    # CollectJS documentation
    └── VALIDATION_SYSTEM.md        # Validation guide
```

## 🧪 Testing

### E2E Testing Rules
**🚨 CRITICAL: ALWAYS USE EXISTING TEST**

```bash
# Run the primary E2E test
node tests/e2e/test-complete-flow-fresh.js

# This test validates:
# ✅ CollectJS initialization
# ✅ Token generation
# ✅ Form validation
# ✅ Payment processing
# ✅ Session management
# ✅ Upsell flow
```

**Never create duplicate tests!** Always use and extend `test-complete-flow-fresh.js`

## 🔧 Development Workflow

### 1. Setting Up Development Environment
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Required environment variables:
NEXT_PUBLIC_NMI_TOKENIZATION_KEY=your_tokenization_key
NEXT_PUBLIC_NMI_COLLECT_JS_URL=https://secure.networkmerchants.com/token/Collect.js

# Start development server
npm run dev
```

### 2. Making Changes to Checkout Flow

#### Modifying Form Fields
1. Update schema in `/src/lib/validation/schemas.ts`
2. Update form component in `/components/NewDesignCheckoutForm.tsx`
3. Update validation in `/src/lib/validation/form-validation.ts`
4. Test with E2E: `node tests/e2e/test-complete-flow-fresh.js`

#### Adding New Validation Rules
```typescript
// 1. Add to schemas.ts
export const myFieldSchema = z.string().min(5)

// 2. Add to form-validation.ts
export function validateMyField(value: string) {
  return validateField('myField', value, myFieldSchema)
}

// 3. Use in component
const result = validateMyField(fieldValue)
if (!result.isValid) {
  setError(result.errors[0])
}
```

#### Modifying Payment Processing
1. **Never modify CollectJS token generation directly**
2. Update processing in `/src/services/nmi/NMIService.ts`
3. Maintain PCI compliance - no card data in logs
4. Test with sandbox credentials first

### 3. Common Development Tasks

#### Debug CollectJS Issues
```javascript
// Enable verbose logging
window.CollectJS_debug = true

// Check service status
console.log('Ready:', collectJSService.isReady())

// Monitor callbacks
onValidation: (field, status, message) => {
  console.log(`Field: ${field}, Status: ${status}, Message: ${message}`)
}
```

#### Test Validation
```typescript
// Test individual validators
import { validateEmail, validatePhone } from '@/lib/validation'

console.log(validateEmail('test@example.com'))
console.log(validatePhone('555-123-4567'))
```

## 🛡️ Security Considerations

### PCI Compliance
- ✅ Card data handled by CollectJS iframes
- ✅ Only tokens transmitted to server
- ✅ No card data in logs or database
- ✅ Secure HTTPS-only in production
- ✅ CSP headers configured

### Session Security
- Encrypted session cookies
- HTTP-only, Secure, SameSite flags
- Session rotation on critical operations
- Automatic expiration handling

### Input Validation
- All inputs validated with Zod schemas
- SQL injection prevention
- XSS protection via React
- CSRF tokens for state-changing operations

## 📊 Performance Optimization

### Current Metrics
- **LCP**: <2.5s (Target met ✅)
- **FID**: <100ms (Target met ✅)
- **CLS**: <0.1 (Target met ✅)
- **TTFB**: <800ms (Target met ✅)

### Optimization Strategies
1. **Code Splitting**: Dynamic imports for heavy components
2. **Image Optimization**: Next.js Image with lazy loading
3. **Script Loading**: CollectJS loads async with defer
4. **Validation Caching**: Reuse validation results
5. **Session Caching**: Redis-backed session store (production)

## 🚀 Deployment

### Production Build
```bash
# Build optimized production bundle
npm run build

# Run production server
npm start

# Or deploy to Vercel
vercel deploy --prod
```

### Environment Configuration
```env
# Production .env
NODE_ENV=production
NEXT_PUBLIC_NMI_TOKENIZATION_KEY=live_tokenization_key
NEXT_PUBLIC_NMI_COLLECT_JS_URL=https://secure.networkmerchants.com/token/Collect.js
NMI_SECURITY_KEY=your_security_key
SESSION_SECRET=strong_random_string
```

## 🐛 Troubleshooting

### Common Issues

#### "CollectJS service not ready"
- Ensure tokenization key is set in environment
- Check browser console for script loading errors
- Verify field selectors match HTML IDs
- Wait for service initialization to complete

#### "Token generation failed"
- Validate all card fields have valid data
- Check for validation errors in console
- Ensure using test card numbers in sandbox
- Verify CollectJS script loaded successfully

#### "Validation errors not showing"
- Import from correct path: `@/lib/validation`
- Check schema definitions in schemas.ts
- Verify error handling in component
- Use createUserFriendlyValidationErrors for display

## 📚 Additional Resources

- [CollectJS Documentation](docs/COLLECTJS_INTEGRATION.md)
- [Validation System Guide](docs/VALIDATION_SYSTEM.md)
- [NMI Gateway Docs](https://secure.networkmerchants.com/merchants/resources/integration/integration_portal.php)
- [E2E Test Guide](tests/e2e/README.md)

## 🤝 Contributing

1. **Always read existing code first** - Follow established patterns
2. **Use centralized validation** - Never create duplicate validators
3. **Test with E2E** - Use test-complete-flow-fresh.js
4. **Maintain PCI compliance** - No card data in code
5. **Document changes** - Update relevant documentation

## 📝 License

Proprietary and confidential. All rights reserved.

---

Built with security, performance, and maintainability in mind.