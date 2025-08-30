# NMI Vault Update Analysis & Fix

## Current Issue
When users click "Update & Retry" in the card update modal, the button grays out but nothing happens. The vault update request is sent but the callback chain appears to be broken.

## NMI Documentation Review

### Customer Vault Variables (from NMI docs)
According to the NMI documentation at https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#cv_variables:

1. **Updating Customer Vault**:
   - `customer_vault=update_customer` - Action to update existing vault
   - `customer_vault_id` - Required: The vault ID to update
   - `payment_token` - When using Collect.js, this updates the payment method
   - Additional fields (first_name, last_name, email) can be included

2. **Response Codes**:
   - `response=1` - Success
   - `response_code=100` - Vault operation successful
   - `responsetext` - Human-readable response message

### Collect.js Integration (from NMI docs)
From https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#methodology:

1. **Token Generation**:
   - Collect.js generates a temporary payment token
   - Token is valid for a single transaction or vault update
   - Token expires after use

2. **Vault Update Flow**:
   - Generate token via Collect.js
   - Send token with `customer_vault=update_customer`
   - Include `customer_vault_id` of existing vault

## Current Implementation Analysis

### Flow Breakdown:
1. ✅ User fills in card details in modal
2. ✅ Collect.js tokenizes the card (generates payment_token)
3. ✅ Token callback triggers `handleVaultUpdate`
4. ✅ API call to `/api/vault/update-card` is made
5. ✅ Server updates vault via NMI API
6. ✅ Server returns success response
7. ❌ Client-side `onSuccess` callback doesn't trigger properly
8. ❌ Upsell retry doesn't happen

### Code Issues Found:

1. **CardUpdateModal.tsx (Line 167)**:
   - The `onSuccess()` callback is called inside `handleVaultUpdate`
   - But `handleVaultUpdate` is defined inside the component and recreated on each render
   - This can cause stale closure issues

2. **Callback Chain Problem**:
   - The `handleVaultUpdate` function is not properly memoized
   - When the vault update succeeds, the `onSuccess` prop might be stale

## Solution Implementation

### Fix 1: Properly Handle the Success Callback
The main issue is that after a successful vault update, the `onSuccess` callback is called but the modal state and retry logic don't execute properly.

### Fix 2: Ensure Proper State Management
Need to ensure that when vault update succeeds:
1. Modal closes
2. Retry parameters are preserved
3. Retry purchase is triggered with updated vault

### Fix 3: Add Better Error Handling
Need to handle edge cases:
- Network failures
- Invalid tokens
- Expired sessions
- Duplicate transactions

## Recommended Changes:

1. **Use useCallback properly for handleVaultUpdate**
2. **Ensure onSuccess callback triggers the retry**
3. **Add loading states to prevent double-clicks**
4. **Add proper error recovery flows**

## Test Scenarios:

1. **Successful Update & Retry**:
   - Card declined on upsell
   - User updates card
   - Vault updates successfully
   - Upsell retries automatically
   - Purchase completes

2. **Failed Update**:
   - Card declined on upsell
   - User enters invalid card
   - Vault update fails
   - Error shown to user
   - User can try again

3. **Session Issues**:
   - Card declined on upsell
   - Session expired during update
   - Proper error handling
   - User redirected appropriately

## Implementation Status:
- [x] Vault update API endpoint created
- [x] Collect.js integration for tokenization
- [x] Modal UI implementation
- [ ] Fix callback chain issue
- [ ] Add proper retry mechanism
- [ ] Test all scenarios