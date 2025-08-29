# Infinite Loop Fix - CardUpdateModal & NewDesignCheckoutForm

## Problem
An infinite loop was occurring between:
- `CardUpdateModal` cleanup: "🧹 Cleaning up CollectJS..."
- `NewDesignCheckoutForm` initialization: "⏭️ CollectJS already initialized, skipping..."

The cleanup from CardUpdateModal was interfering with the global CollectJS instance, causing the main form to think it needed to reinitialize, which then triggered more cleanup, creating an infinite loop.

## Root Cause
1. **Aggressive Cleanup**: CardUpdateModal was completely resetting the global CollectJS instance
2. **Shared Resource**: Both components share the same global `window.CollectJS` object
3. **Race Condition**: Cleanup and initialization were fighting over the same resource

## Solution

### 1. Less Aggressive Cleanup
Changed CardUpdateModal cleanup to:
- Only clear fields, not reset the entire CollectJS instance
- Don't remove the CollectJS script (it can be shared)
- Only clean up modal-specific state

### 2. Separated Cleanup Effects
- Split the loading and cleanup into separate `useEffect` hooks
- Added proper timing with `setTimeout` to prevent race conditions
- Only cleanup when modal actually closes AND CollectJS was initialized

### 3. Added Delays
- Added 100ms delay before cleanup to prevent race conditions
- Clear timers properly on component unmount

## Changes Made

### Before (Problematic):
```javascript
// Aggressive cleanup that reset everything
if (window.CollectJS) {
  console.log('🧹 Cleaning up CollectJS...');
  window.CollectJS.clearFields();
}
// Removed script entirely
const existingScript = document.getElementById('collectjs-update-script');
if (existingScript) {
  existingScript.remove();
}
```

### After (Fixed):
```javascript
// Gentle cleanup that only clears fields
if (window.CollectJS && window.CollectJS.clearFields) {
  console.log('🧹 Cleaning up CardUpdateModal CollectJS fields...');
  try {
    window.CollectJS.clearFields();
  } catch (e) {
    console.log('⚠️ Could not clear fields:', e);
  }
}
// Don't remove script - it can be shared
```

## Benefits
1. **No More Loops**: Components can coexist without fighting over CollectJS
2. **Shared Resource**: Both components can use the same CollectJS instance
3. **Cleaner Logs**: No more console spam from initialization loops
4. **Better Performance**: Prevents unnecessary re-initialization

## Testing
The fix ensures:
- CardUpdateModal can open/close without affecting the main form
- Main checkout form's CollectJS remains stable
- No infinite loop messages in console
- Both forms can process payments independently