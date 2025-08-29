# Validation Order Fix

## Problem
The validation order was jumping around the form instead of following the visual top-to-bottom flow:
- Old order: Email → Name on Card (payment section!) → Address (back to shipping) → City → State → Zip → Phone
- This caused confusion as error messages appeared in a non-intuitive order

## Solution
Fixed validation to follow the exact visual order of the form from top to bottom:

### Correct Validation Order (Top to Bottom):

#### 1. CONTACT SECTION
- Email

#### 2. SHIPPING SECTION  
- Street Address
- (Apartment - optional, no validation)
- City
- State
- ZIP Code
- Country (handled separately with default value)
- Phone Number

#### 3. PAYMENT SECTION
- Card Number (handled by CollectJS)
- Expiry Date (handled by CollectJS)
- Security Code (handled by CollectJS)
- Name on Card

#### 4. BILLING ADDRESS (only if different from shipping)
- Billing Address
- Billing City
- Billing State
- Billing ZIP

## Changes Made

1. **Updated `handleSubmit` validation order** - Now validates fields in the exact order they appear visually
2. **Updated `validateForm` function** - Added clear section comments and proper ordering
3. **Maintained error field mapping** - Field names in error messages remain user-friendly

## Benefits

1. **Better UX**: When validation fails, the first error field that gets focus is the topmost invalid field
2. **Logical Flow**: Error messages appear in the order users expect (top to bottom)
3. **Clear Code**: Added section comments make the validation logic easier to understand
4. **Consistency**: Both validation functions now follow the same order

## Testing

When submitting the form with multiple empty fields, validation should now:
1. Check fields from top to bottom
2. Focus on the first (topmost) invalid field
3. Display error messages in logical order
4. Guide users through the form in a natural flow