import { z } from 'zod'

// =============================================================================
// COLLECTJS-SPECIFIC VALIDATION
// =============================================================================

/**
 * CollectJS field validation states
 */
export type CollectJSFieldStatus = 'valid' | 'invalid' | 'blank'
export type CollectJSFieldName = 'ccnumber' | 'ccexp' | 'cvv'

/**
 * Enhanced error messages for CollectJS fields
 */
export function getCollectJSErrorMessage(
  field: CollectJSFieldName,
  status: CollectJSFieldStatus | boolean,
  message: string
): string {
  // Handle both boolean and string status values
  if (status === 'valid' || status === true) return ''
  
  switch (field) {
    case 'ccnumber':
      if (status === 'blank' || status === false) return ''  // Don't show error for empty during typing
      if (message.includes('invalid')) return 'Please enter a valid card number'
      if (message.includes('luhn')) return 'Card number is invalid. Please check and try again'
      if (message.includes('length')) return 'Card number must be between 13-19 digits'
      return 'Please enter a valid card number'

    case 'ccexp':
      if (status === 'blank' || status === false) return ''  // Don't show error for empty during typing
      if (message.includes('past') || message.includes('expired')) {
        return 'Card has expired. Please use a different card'
      }
      if (message.includes('invalid')) return 'Please enter a valid expiration date using MM/YY format (e.g., 12/25)'
      if (message.includes('format')) return 'Please use MM/YY format only (e.g., 12/25, not 12/2025)'
      if (message.includes('length') || message.includes('long')) return 'Expiration date should be MM/YY format (5 characters max)'
      return 'Please enter a valid expiration date in MM/YY format'

    case 'cvv':
      if (status === 'blank' || status === false) return ''  // Don't show error for empty during typing
      if (message.includes('invalid')) {
        return 'Please enter the 3 or 4-digit security code from your card'
      }
      if (message.includes('length')) return 'Security code must be 3 or 4 digits'
      return 'Please enter a valid security code'
      
    default:
      return message
  }
}

/**
 * Map CollectJS field names to form field names
 */
export const COLLECTJS_FIELD_MAP: Record<CollectJSFieldName, string> = {
  'ccnumber': 'cardNumber',
  'ccexp': 'expiry',
  'cvv': 'cvv'
}

/**
 * Validate CollectJS field state for form submission
 */
export interface CollectJSFieldState {
  isValid: boolean
  isTouched: boolean
  error: string
}

export interface CollectJSValidationState {
  ccnumber: boolean
  ccexp: boolean
  cvv: boolean
}

/**
 * Check if all CollectJS fields are valid for submission
 */
export function validateCollectJSFields(
  fieldState: CollectJSValidationState,
  touched: boolean
): Record<string, string> {
  const errors: Record<string, string> = {}
  
  if (!touched) {
    // User hasn't interacted with card fields
    errors.cardNumber = 'Please enter your card number'
    errors.expiry = 'Please enter the expiration date (MM/YY)'
    errors.cvv = 'Please enter the 3 or 4 digit security code'
    return errors
  }
  
  // Check individual fields
  if (!fieldState.ccnumber) {
    errors.cardNumber = 'Please check your card number'
  }
  if (!fieldState.ccexp) {
    errors.expiry = 'Please check the expiration date'
  }
  if (!fieldState.cvv) {
    errors.cvv = 'Please check the security code'
  }
  
  return errors
}

/**
 * Enhanced validation callback for CollectJS integration
 */
export function createCollectJSValidationHandler(
  setErrors: (updater: (prev: Record<string, string>) => Record<string, string>) => void,
  setFieldState: (updater: (prev: CollectJSValidationState) => CollectJSValidationState) => void,
  setFieldsValid: (valid: boolean) => void,
  setCardFieldsTouched: (touched: boolean) => void,
  cardFieldsTouched: boolean
) {
  return (field: string, status: string | boolean, message: string) => {
    console.log(`🔍 CollectJS validation: ${field} -> ${status} -> "${message}"`)
    
    // Track field interaction
    if (!cardFieldsTouched) {
      setCardFieldsTouched(true)
    }
    
    // Get form field name
    const formField = COLLECTJS_FIELD_MAP[field as CollectJSFieldName] || field
    
    // Update error state
    const errorMessage = getCollectJSErrorMessage(
      field as CollectJSFieldName, 
      status as CollectJSFieldStatus, 
      message
    )
    
    setErrors(prev => ({
      ...prev,
      [formField]: errorMessage
    }))
    
    // Update field validation state
    setFieldState(prev => {
      // Handle both boolean and string status values from CollectJS
      const isValid = status === 'valid' || status === true

      const newState = {
        ...prev,
        [field]: isValid
      }

      // Check if all fields are valid
      const allValid = newState.ccnumber && newState.ccexp && newState.cvv
      setFieldsValid(allValid)

      console.log(`📊 Field validation update - ${field}: ${isValid} (status: ${status}), All valid: ${allValid}`)

      return newState
    })
  }
}

/**
 * Validation state management utilities
 */
export const CollectJSValidationUtils = {
  /**
   * Initialize empty validation state
   */
  createInitialState(): CollectJSValidationState {
    return {
      ccnumber: false,
      ccexp: false,
      cvv: false
    }
  },

  /**
   * Check if any field has been validated as valid
   */
  hasValidFields(state: CollectJSValidationState): boolean {
    return state.ccnumber || state.ccexp || state.cvv
  },

  /**
   * Check if all fields are valid
   */
  allFieldsValid(state: CollectJSValidationState): boolean {
    return state.ccnumber && state.ccexp && state.cvv
  },

  /**
   * Get validation summary for debugging
   */
  getValidationSummary(state: CollectJSValidationState): string {
    return `Card: ${state.ccnumber ? '✅' : '❌'}, Expiry: ${state.ccexp ? '✅' : '❌'}, CVV: ${state.cvv ? '✅' : '❌'}`
  }
}
