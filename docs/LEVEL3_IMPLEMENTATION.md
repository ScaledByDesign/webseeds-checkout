# Level 3 Data Collection Implementation

## Overview

This document outlines the complete implementation of Level 3 data collection using CollectJS with inline styling and NMI Gateway integration. The implementation maintains the current design styling while enabling enhanced transaction data for reduced processing fees.

## Architecture

### Frontend (CollectJS Integration)

**File**: `components/NewDesignCheckoutForm.tsx`

#### Key Features:
- **Inline Variant**: Uses `variant: 'inline'` for seamless styling integration
- **Style Sniffer**: Enabled `styleSniffer: true` to inherit existing CSS styles
- **Dynamic Script Loading**: Loads CollectJS script with proper tokenization key
- **Level 3 Data Structure**: Organizes form data into Level 3 compatible format

#### CollectJS Configuration:
```javascript
window.CollectJS.configure({
  variant: 'inline',
  styleSniffer: true,
  tokenizationKey: process.env.NEXT_PUBLIC_NMI_TOKENIZATION_KEY,
  fields: {
    ccnumber: { selector: '#card-number-field' },
    ccexp: { selector: '#card-expiry-field' },
    cvv: { selector: '#card-cvv-field' }
  }
})
```

#### Level 3 Data Payload:
```javascript
{
  customerInfo: {
    email, firstName, lastName, phone,
    address, city, state, zipCode, country
  },
  paymentToken: "token-from-collectjs",
  products: [
    { id, name, price, quantity }
  ],
  billingInfo: { /* optional separate billing */ }
}
```

### Backend (NMI Gateway Integration)

**File**: `app/api/nmi-direct/route.ts`

#### Key Features:
- **Zod Validation**: Strict schema validation for Level 3 data
- **Comprehensive Level 3 Fields**: Full line-item detail mapping
- **Tax Calculation**: Automatic tax and shipping calculation
- **Response Handling**: Detailed success/failure responses

#### Level 3 Fields Mapped:
- **Customer Data**: Name, email, phone, addresses
- **Line Items**: Product code, description, quantity, unit cost, tax
- **Summary Data**: Subtotal, tax, shipping, total
- **Additional Fields**: Commodity codes, tax rates, discount amounts

#### NMI Parameters:
```javascript
// Level 2 Summary Data
tax: taxAmount.toFixed(2),
shipping: shippingAmount.toFixed(2),
subtotal: subtotal.toFixed(2),

// Level 3 Line Item Data (per product)
item_product_code_${lineNumber}: product.id,
item_description_${lineNumber}: product.name,
item_commodity_code_${lineNumber}: '44121700',
item_unit_cost_${lineNumber}: product.price.toFixed(2),
item_quantity_${lineNumber}: product.quantity.toString(),
item_total_amount_${lineNumber}: lineTotal.toFixed(2),
item_tax_amount_${lineNumber}: itemTax.toFixed(2)
```

## Environment Configuration

**File**: `.env.example`

Required environment variables:
```bash
# CollectJS Configuration
NEXT_PUBLIC_COLLECT_JS_URL=https://secure.nmi.com/token/Collect.js
NEXT_PUBLIC_NMI_TOKENIZATION_KEY=your_nmi_tokenization_key

# NMI Gateway Configuration
NMI_SECURITY_KEY=your_nmi_security_key
NMI_API_URL=https://secure.nmi.com/api/transact.php
```

## Styling Preservation

### Method: StyleSniffer + Inline Variant

The implementation preserves existing design styling through:

1. **StyleSniffer**: Automatically detects and applies existing CSS styles
2. **Inline Variant**: Renders payment fields directly in DOM containers
3. **Container Targeting**: Uses existing field containers (`#card-number-field`, etc.)
4. **Responsive Handling**: Maintains responsive behavior with resize events

### Field Containers:
```html
<div id="card-number-field" class="existing-field-styles">
  <!-- CollectJS iframe injected here -->
</div>
<div id="card-expiry-field" class="existing-field-styles">
  <!-- CollectJS iframe injected here -->
</div>
<div id="card-cvv-field" class="existing-field-styles">
  <!-- CollectJS iframe injected here -->
</div>
```

## Testing

**File**: `scripts/test-level3-implementation.js`

### Test Coverage:
- CollectJS script loading verification
- Payment field mounting confirmation
- Level 3 data structure validation
- Styling inheritance testing
- API endpoint configuration verification

### Run Tests:
```bash
node scripts/test-level3-implementation.js
```

## Benefits

### Level 3 Data Advantages:
1. **Reduced Processing Fees**: Lower interchange rates for B2B transactions
2. **Enhanced Fraud Protection**: More transaction detail for risk assessment
3. **Better Reporting**: Detailed line-item transaction data
4. **Compliance**: Meets card brand requirements for commercial cards

### Implementation Benefits:
1. **Design Preservation**: Maintains exact visual styling
2. **Security**: Tokenized payment data, no PCI scope increase
3. **Flexibility**: Easy to modify product data and tax calculations
4. **Monitoring**: Comprehensive logging and error handling

## Deployment Checklist

### Pre-Deployment:
- [ ] Set production NMI credentials in environment variables
- [ ] Verify CollectJS tokenization key is correct
- [ ] Test with real NMI sandbox account
- [ ] Validate Level 3 data in NMI reporting dashboard

### Post-Deployment:
- [ ] Monitor transaction success rates
- [ ] Verify Level 3 data appears in NMI reports
- [ ] Check for reduced interchange fees
- [ ] Test responsive behavior across devices

## Troubleshooting

### Common Issues:

1. **CollectJS Not Loading**
   - Check `NEXT_PUBLIC_COLLECT_JS_URL` environment variable
   - Verify tokenization key is correct
   - Check browser console for script errors

2. **Payment Fields Not Mounting**
   - Ensure field containers exist in DOM
   - Check CollectJS configuration callback
   - Verify styleSniffer is enabled

3. **Level 3 Data Not Appearing**
   - Check NMI gateway Level 3 feature is enabled
   - Verify all required fields are populated
   - Review NMI transaction details in dashboard

4. **Styling Issues**
   - Confirm styleSniffer is enabled
   - Check for CSS conflicts with iframe content
   - Test responsive behavior on resize

## Support

For implementation support:
- Review NMI CollectJS documentation
- Check NMI gateway Level 3 requirements
- Test with NMI sandbox environment
- Monitor browser console for errors
