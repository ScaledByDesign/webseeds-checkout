# Card Update Optimal Setup Guide

## Overview
This document outlines the optimal setup for handling card updates when transactions fail, based on NMI/EasyPay Direct Gateway documentation.

## NMI Integration Requirements

### 1. Customer Vault Operations
Based on https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#cv_variables

#### Creating a Vault
```
customer_vault=add_customer
payment_token=[token_from_collectjs]
first_name=[customer_first]
last_name=[customer_last]
email=[customer_email]
```

#### Updating a Vault
```
customer_vault=update_customer
customer_vault_id=[existing_vault_id]
payment_token=[new_token_from_collectjs]
```

### 2. Collect.js Token Generation
Based on https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#methodology

- Tokens are single-use and expire after processing
- Token must be generated fresh for each update
- Token contains encrypted card data

### 3. Direct Post API (Node.js)
Based on https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#dp_node

```javascript
const https = require('https');
const querystring = require('querystring');

const postData = querystring.stringify({
  'security_key': 'your_security_key',
  'customer_vault': 'update_customer',
  'customer_vault_id': 'vault_id',
  'payment_token': 'token_from_collectjs'
});

const options = {
  hostname: 'secure.nmi.com',
  port: 443,
  path: '/api/transact.php',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};
```

## Optimal Implementation Flow

### 1. Initial Transaction Failure
When an upsell or checkout transaction fails:

```javascript
// Transaction fails with card error
if (response.responseCode === '200' || response.responseCode === '201') {
  // Card declined - show update modal
  showCardUpdateModal({
    errorMessage: response.responsetext,
    retryInfo: {
      productCode: currentProduct,
      amount: currentAmount,
      sessionId: session.id
    }
  });
}
```

### 2. Card Update Modal
The modal should:
- Display user-friendly error message
- Initialize Collect.js for secure token generation
- Capture new card details
- Handle token generation and vault update

```javascript
// Initialize Collect.js
CollectJS.configure({
  paymentType: 'cc',
  fields: {
    ccnumber: { selector: '#card-number-field' },
    ccexp: { selector: '#card-expiry-field' },
    cvv: { selector: '#card-cvv-field' }
  },
  callback: (response) => {
    if (response.token) {
      updateVault(response.token);
    }
  }
});
```

### 3. Vault Update Process
Server-side vault update:

```javascript
async function updateVault(sessionId, paymentToken) {
  // Get session and vault ID
  const session = await getSession(sessionId);
  
  // Update vault via NMI
  const params = new URLSearchParams({
    security_key: process.env.NMI_SECURITY_KEY,
    customer_vault: 'update_customer',
    customer_vault_id: session.vaultId,
    payment_token: paymentToken
  });
  
  const response = await fetch('https://secure.nmi.com/api/transact.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  
  const result = parseNMIResponse(await response.text());
  
  if (result.response === '1') {
    // Success - trigger retry
    return { success: true, vaultId: result.customer_vault_id };
  } else {
    // Failed - show error
    return { success: false, error: result.responsetext };
  }
}
```

### 4. Retry Mechanism
After successful vault update:

```javascript
// In CardUpdateModal component
const handleVaultUpdateSuccess = useCallback(() => {
  // Close modal
  setShowModal(false);
  
  // Trigger retry with small delay for state propagation
  setTimeout(() => {
    retryOriginalPurchase();
  }, 500);
}, [retryOriginalPurchase]);

// In parent component (upsell page)
const retryOriginalPurchase = () => {
  // Use stored retry information
  handleUpsellPurchase(
    retryInfo.productCode,
    retryInfo.amount,
    retryInfo.bottles
  );
};
```

## Key Implementation Points

### 1. State Management
- Store retry information when transaction fails
- Preserve session context across modal open/close
- Use proper React hooks (useCallback) to avoid stale closures

### 2. Error Handling
- Map technical errors to user-friendly messages
- Handle network failures gracefully
- Provide clear feedback during processing

### 3. Security
- Never log full tokens or card numbers
- Use HTTPS for all API calls
- Validate session before vault operations

### 4. User Experience
- Show loading states during processing
- Disable buttons to prevent double-clicks
- Auto-retry after successful update
- Provide alternative options (new checkout)

## Testing Checklist

### Manual Testing
- [ ] Card decline triggers update modal
- [ ] Modal displays friendly error message
- [ ] Collect.js fields load properly
- [ ] Form validation works correctly
- [ ] Token generation succeeds
- [ ] Vault update completes
- [ ] Modal closes after success
- [ ] Original purchase retries automatically
- [ ] Retry uses updated payment method

### Edge Cases
- [ ] Session expiration during update
- [ ] Network failure during vault update
- [ ] Invalid card details entered
- [ ] Double-click prevention works
- [ ] Modal can be cancelled and reopened

### Integration Testing
- [ ] Test with real NMI sandbox
- [ ] Verify vault is actually updated
- [ ] Confirm retry uses new payment method
- [ ] Check session persistence

## Common Issues and Solutions

### Issue 1: Callback Not Firing
**Problem**: `onSuccess` callback doesn't trigger after vault update
**Solution**: Use `useCallback` with proper dependencies and ensure no stale closures

### Issue 2: Modal Doesn't Close
**Problem**: Modal stays open after successful update
**Solution**: Set loading state to false before calling onSuccess

### Issue 3: Retry Doesn't Happen
**Problem**: Original purchase doesn't retry after update
**Solution**: Add small delay and ensure retry info is preserved

### Issue 4: Session Lost
**Problem**: Session not found during vault update
**Solution**: Use both cookie and cache lookup for session

## Monitoring and Logging

### Key Events to Log
1. Transaction failure with error code
2. Modal open with error message
3. Collect.js initialization
4. Token generation attempt
5. Vault update request/response
6. Retry purchase attempt
7. Final success/failure

### Metrics to Track
- Card update modal open rate
- Vault update success rate
- Retry purchase success rate
- Time from failure to successful retry
- User abandonment rate

## Conclusion
Following this setup ensures a smooth card update experience that:
- Handles failures gracefully
- Updates payment methods securely
- Automatically retries failed transactions
- Provides clear user feedback
- Maintains session consistency