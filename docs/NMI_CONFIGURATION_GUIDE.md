# NMI Payment Gateway Configuration Guide

## Overview
This guide covers the configuration requirements for the NMI payment gateway integration in the Webseeds Checkout system.

## Environment Variables Required

### Essential NMI Configuration

```bash
# NMI Gateway Security Key (REQUIRED)
# Obtain from: NMI Gateway Settings > Security Keys
NMI_SECURITY_KEY=your_nmi_security_key_here

# NMI API Endpoint
# Production: https://secure.networkmerchants.com/api/transact.php
# Sandbox: https://secure.nmi.com/api/transact.php
NMI_ENDPOINT=https://secure.nmi.com/api/transact.php

# CollectJS Tokenization Key (REQUIRED)
# Obtain from: NMI Gateway > Collect.js > Tokenization Key
NEXT_PUBLIC_NMI_TOKENIZATION_KEY=your_tokenization_key_here

# CollectJS Library URL
NEXT_PUBLIC_NMI_COLLECT_JS_URL=https://secure.networkmerchants.com/token/Collect.js

# NMI Public Key (Optional - for enhanced security)
NEXT_PUBLIC_NMI_PUBLIC_KEY=your_public_key_here
```

## Getting Your NMI Credentials

### 1. NMI Security Key
1. Log into your NMI Gateway account
2. Navigate to **Settings** > **Security Keys**
3. Create a new security key or use existing
4. Copy the key to `NMI_SECURITY_KEY` in `.env.local`

### 2. CollectJS Tokenization Key
1. In NMI Gateway, go to **Settings** > **Collect.js**
2. Generate or copy your tokenization key
3. Add to `NEXT_PUBLIC_NMI_TOKENIZATION_KEY` in `.env.local`

### 3. Optional: Webhook Configuration
For real-time payment notifications:
1. Go to **Settings** > **Webhooks**
2. Add webhook URL: `https://yourdomain.com/api/webhooks/nmi`
3. Generate webhook secret
4. Add to `NMI_WEBHOOK_SECRET` in `.env.local`

## Testing Configuration

### Verify Environment Variables
```bash
# Check if all required variables are set
npm run check:env

# Test NMI connection
npm run test:nmi-connection
```

### Test Payment Flow
1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to checkout page:
   ```
   http://localhost:3255/checkout
   ```

3. Use test card numbers:
   - **Visa**: 4111111111111111
   - **Mastercard**: 5431111111111111
   - **Amex**: 341111111111111
   - **CVV**: Any 3 or 4 digits
   - **Expiry**: Any future date

## Common Configuration Issues

### Issue: "Payment gateway not configured"
**Solution**: Ensure `NMI_SECURITY_KEY` is set in `.env.local`

### Issue: "Invalid payment token"
**Causes**:
1. Mismatched tokenization key between client and server
2. Using sandbox key in production or vice versa
3. Token expired (tokens are single-use)

**Solution**: 
- Verify `NEXT_PUBLIC_NMI_TOKENIZATION_KEY` matches your NMI account
- Ensure consistent environment (sandbox vs production)
- Generate fresh token for each transaction

### Issue: "Authentication failed"
**Solution**: Verify `NMI_SECURITY_KEY` is correct and has proper permissions

### Issue: "Gateway unavailable"
**Solution**: 
- Check `NMI_ENDPOINT` URL is correct
- Verify network connectivity
- Check NMI service status

## Level 3 Processing Configuration

For enhanced data and lower processing rates:

```javascript
// Required Level 3 fields (automatically handled by the system):
- tax: Tax amount
- shipping: Shipping amount
- ponumber: Purchase order number
- item_product_code_X: Product SKU
- item_description_X: Product description
- item_quantity_X: Quantity
- item_unit_cost_X: Unit price
- item_total_amount_X: Line total
- item_tax_amount_X: Tax per line
- item_commodity_code_X: Product category code
```

## Security Best Practices

1. **Never commit credentials**: Keep `.env.local` in `.gitignore`
2. **Use environment-specific keys**: Separate keys for dev/staging/production
3. **Rotate keys regularly**: Update security keys every 90 days
4. **Monitor transactions**: Set up webhooks for real-time monitoring
5. **Enable fraud tools**: Configure AVS and CVV verification in NMI

## Error Handling

The system uses `ErrorHandlingService` to provide detailed error information:

- **PAYMENT_TIMEOUT**: Transaction took too long
- **PAYMENT_AUTH_ERROR**: Invalid credentials or permissions
- **PAYMENT_GATEWAY_ERROR**: NMI service issue
- **PAYMENT_CONFIG_ERROR**: Missing configuration
- **PAYMENT_VALIDATION_ERROR**: Invalid payment data

## Support Resources

- **NMI Documentation**: https://secure.nmi.com/merchants/resources/integration/
- **CollectJS Guide**: https://secure.nmi.com/merchants/resources/integration/integration_portal.php#collect_js
- **Support Email**: support@nmi.com
- **Phone**: 1-800-617-4850

## Troubleshooting Checklist

- [ ] All required environment variables are set
- [ ] Using correct endpoint URL (sandbox vs production)
- [ ] Security key has proper permissions
- [ ] Tokenization key matches between client and server
- [ ] Network connectivity to NMI servers
- [ ] Valid test card numbers for sandbox testing
- [ ] Error logs checked for specific error codes
- [ ] Browser console checked for CollectJS errors