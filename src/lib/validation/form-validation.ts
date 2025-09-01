import { z } from 'zod'
import {
  customerInfoSchema,
  productSchema,
  billingInfoSchema,
  checkoutRequestSchema,
  upsellRequestSchema,
  type ValidationResult,
  type FieldValidationResult
} from './schemas'
import { validateCollectJSFields, type CollectJSValidationState } from './collectjs-validation'

// =============================================================================
// VALIDATION ERROR TYPES
// =============================================================================

export interface ValidationError {
  field: string
  message: string
  userFriendlyMessage: string
  suggestions: string[]
}

export interface FormValidationResult {
  isValid: boolean
  errors: ValidationError[]
  fieldErrors: Record<string, string>
}

// =============================================================================
// USER-FRIENDLY ERROR MAPPING
// =============================================================================

/**
 * Maps technical validation errors to user-friendly messages with suggestions
 * @param errors - Zod validation errors or generic error messages
 * @returns Array of user-friendly validation errors
 */
export function createUserFriendlyValidationErrors(
  errors: Record<string, string> | string | z.ZodError
): ValidationError[] {
  // Handle string errors (generic messages)
  if (typeof errors === 'string') {
    return mapGenericErrorToValidationError(errors)
  }

  // Handle Zod errors
  if (errors instanceof z.ZodError) {
    return errors.errors.map(err => {
      const field = err.path.join('.')
      return mapFieldToValidationError(field, err.message)
    })
  }

  // Handle structured field errors
  const validationErrors: ValidationError[] = []
  Object.entries(errors).forEach(([field, message]) => {
    validationErrors.push(mapFieldToValidationError(field, message))
  })

  return validationErrors
}

/**
 * Maps generic error messages to validation errors
 */
function mapGenericErrorToValidationError(errorMessage: string): ValidationError[] {
  const lowerError = errorMessage.toLowerCase()

  if (lowerError.includes('card number') || lowerError.includes('ccnumber')) {
    return [{
      field: 'card',
      message: errorMessage,
      userFriendlyMessage: 'There\'s an issue with your card number',
      suggestions: [
        'Please check that your card number is entered correctly',
        'Make sure you\'ve entered all 16 digits',
        'Try using a different card if the problem persists'
      ]
    }]
  }

  if (lowerError.includes('expir') || lowerError.includes('ccexp')) {
    return [{
      field: 'expiry',
      message: errorMessage,
      userFriendlyMessage: 'Your card expiration date has an issue',
      suggestions: [
        'Please check the expiration date on your card',
        'Make sure to enter it in MM/YY format',
        'Ensure your card hasn\'t expired'
      ]
    }]
  }

  if (lowerError.includes('cvv') || lowerError.includes('security')) {
    return [{
      field: 'cvv',
      message: errorMessage,
      userFriendlyMessage: 'There\'s an issue with your security code',
      suggestions: [
        'Please check the 3-digit CVV code on the back of your card',
        'For American Express, use the 4-digit code on the front'
      ]
    }]
  }

  if (lowerError.includes('declined') || lowerError.includes('insufficient')) {
    return [{
      field: 'payment',
      message: errorMessage,
      userFriendlyMessage: 'Your payment was declined',
      suggestions: [
        'Please check that your card has sufficient funds',
        'Try using a different payment method',
        'Contact your bank if the issue persists'
      ]
    }]
  }

  // Generic error
  return [{
    field: 'general',
    message: errorMessage,
    userFriendlyMessage: 'We encountered an issue processing your payment',
    suggestions: [
      'Please check all your information and try again',
      'Make sure your card has sufficient funds',
      'Contact your bank if the issue persists'
    ]
  }]
}

/**
 * Maps field-specific errors to validation errors with suggestions
 */
function mapFieldToValidationError(field: string, message: string): ValidationError {
  // Clean up field name (remove prefixes)
  const cleanedField = field.toLowerCase()
    .replace('customer info.', '')
    .replace('customerinfo.', '')
    .replace('customer.', '')

  switch (cleanedField) {
    case 'firstname':
    case 'first_name':
    case 'first name':
      return {
        field,
        message,
        userFriendlyMessage: 'Please enter your first name',
        suggestions: ['First name is required for shipping and billing']
      }

    case 'lastname':
    case 'last_name':
    case 'last name':
      return {
        field,
        message,
        userFriendlyMessage: 'Please enter your last name',
        suggestions: ['Last name is required for shipping and billing']
      }

    case 'email':
    case 'email address':
      return {
        field,
        message,
        userFriendlyMessage: 'Please enter a valid email address',
        suggestions: [
          'We need your email to send order confirmations',
          'Make sure to include @ and a valid domain (e.g., example.com)'
        ]
      }

    case 'phone':
    case 'phone number':
    case 'phonenumber':
      return {
        field,
        message,
        userFriendlyMessage: 'Please enter a valid phone number',
        suggestions: [
          'Phone number is required for delivery updates',
          'Include area code (e.g., 555-123-4567)'
        ]
      }

    case 'billingaddress':
    case 'billing address':
    case 'address':
    case 'street address':
      return {
        field,
        message,
        userFriendlyMessage: 'Please enter your address',
        suggestions: [
          'We need your address for billing and shipping',
          'Enter your complete street address including apartment/suite numbers'
        ]
      }

    case 'billingcity':
    case 'billing city':
    case 'city':
      return {
        field,
        message,
        userFriendlyMessage: 'Please enter your city',
        suggestions: ['City is required for billing and shipping']
      }

    case 'billingstate':
    case 'billing state':
    case 'state':
      return {
        field,
        message,
        userFriendlyMessage: 'Please select your state',
        suggestions: ['State is required for tax calculation and shipping']
      }

    case 'billingzipcode':
    case 'billing zip code':
    case 'billing zip':
    case 'zipcode':
    case 'zip code':
    case 'zip':
    case 'postal code':
    case 'postalcode':
      return {
        field,
        message,
        userFriendlyMessage: 'Please enter a valid ZIP code',
        suggestions: [
          'ZIP code is required for billing verification',
          'Use 5-digit format (e.g., 90210) or ZIP+4 (e.g., 90210-1234)'
        ]
      }

    case 'payment_token':
    case 'paymenttoken':
      return {
        field,
        message,
        userFriendlyMessage: 'Payment information is incomplete',
        suggestions: [
          'Please fill in all credit card fields',
          'Make sure card number, expiration, and CVV are entered',
          'Try refreshing the page if card fields aren\'t working'
        ]
      }

    case 'card':
    case 'ccnumber':
      return {
        field,
        message,
        userFriendlyMessage: 'There\'s an issue with your card number',
        suggestions: [
          'Please check that your card number is entered correctly',
          'Make sure you\'ve entered all 16 digits',
          'Remove any spaces or dashes'
        ]
      }

    default:
      // Clean up field names for generic errors
      let cleanFieldName = field
      if (field.includes('customer info.')) {
        cleanFieldName = field.replace('customer info.', '')
      }
      cleanFieldName = cleanFieldName.replace(/\./g, ' ')
      cleanFieldName = cleanFieldName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')

      return {
        field,
        message,
        userFriendlyMessage: `Please check your ${cleanFieldName}`,
        suggestions: ['Please verify this information and try again']
      }
  }
}

// =============================================================================
// COLLECTJS INTEGRATION
// =============================================================================

/**
 * Enhanced checkout form validation with CollectJS support
 * Combines standard form validation with CollectJS field validation
 */
export function validateCheckoutFormWithCollectJS(
  data: any,
  collectJSState?: {
    loaded: boolean
    fieldState: CollectJSValidationState
    touched: boolean
  }
): FormValidationResult {
  // Standard form validation
  const standardValidation = validateCheckoutForm(data)

  // Add CollectJS validation if available
  if (collectJSState?.loaded) {
    const collectJSErrors = validateCollectJSFields(
      collectJSState.fieldState,
      collectJSState.touched
    )

    // Merge errors
    const allErrors = {
      ...standardValidation.fieldErrors,
      ...collectJSErrors
    }

    // Convert field errors to ValidationError objects
    const validationErrors: ValidationError[] = Object.entries(allErrors).map(([field, message]) => ({
      field,
      message,
      userFriendlyMessage: message,
      suggestions: []
    }))

    return {
      isValid: Object.keys(allErrors).length === 0,
      errors: validationErrors,
      fieldErrors: allErrors
    }
  }

  return standardValidation
}

// =============================================================================
// FORM VALIDATION UTILITIES
// =============================================================================

/**
 * Validates checkout form data using shared schemas
 * @param data - Form data to validate
 * @returns Validation result with user-friendly errors
 */
export function validateCheckoutForm(data: any): FormValidationResult {
  try {
    checkoutRequestSchema.parse(data)
    return {
      isValid: true,
      errors: [],
      fieldErrors: {}
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors = createUserFriendlyValidationErrors(error)
      const fieldErrors: Record<string, string> = {}
      
      validationErrors.forEach(err => {
        fieldErrors[err.field] = err.userFriendlyMessage
      })

      return {
        isValid: false,
        errors: validationErrors,
        fieldErrors
      }
    }

    return {
      isValid: false,
      errors: [{
        field: 'general',
        message: 'Validation failed',
        userFriendlyMessage: 'Please check your information and try again',
        suggestions: ['Verify all required fields are filled correctly']
      }],
      fieldErrors: {}
    }
  }
}

/**
 * Validates upsell form data
 * @param data - Upsell data to validate
 * @returns Validation result with user-friendly errors
 */
export function validateUpsellForm(data: any): FormValidationResult {
  try {
    upsellRequestSchema.parse(data)
    return {
      isValid: true,
      errors: [],
      fieldErrors: {}
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors = createUserFriendlyValidationErrors(error)
      const fieldErrors: Record<string, string> = {}
      
      validationErrors.forEach(err => {
        fieldErrors[err.field] = err.userFriendlyMessage
      })

      return {
        isValid: false,
        errors: validationErrors,
        fieldErrors
      }
    }

    return {
      isValid: false,
      errors: [],
      fieldErrors: {}
    }
  }
}

/**
 * Validates individual form fields
 * @param fieldName - Name of the field to validate
 * @param value - Field value
 * @param schema - Schema to validate against (optional, uses appropriate schema based on field name)
 * @returns Field validation result
 */
export function validateField(fieldName: string, value: any, schema?: z.ZodSchema): FieldValidationResult {
  let fieldSchema: z.ZodSchema

  if (schema) {
    fieldSchema = schema
  } else {
    // Auto-select schema based on field name
    fieldSchema = getFieldSchema(fieldName)
  }

  try {
    fieldSchema.parse(value)
    return {
      field: fieldName,
      value,
      isValid: true,
      errors: [],
      warnings: []
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        field: fieldName,
        value,
        isValid: false,
        errors: error.errors.map(err => err.message),
        warnings: []
      }
    }

    return {
      field: fieldName,
      value,
      isValid: false,
      errors: ['Validation failed'],
      warnings: []
    }
  }
}

/**
 * Gets appropriate schema for a field name
 */
function getFieldSchema(fieldName: string): z.ZodSchema {
  const lowerField = fieldName.toLowerCase()

  if (lowerField.includes('email')) {
    return z.string().email()
  }
  
  if (lowerField.includes('phone')) {
    return z.string().min(10)
  }
  
  if (lowerField.includes('zip') || lowerField.includes('postal')) {
    return z.string().min(5)
  }
  
  if (lowerField.includes('state')) {
    return z.string().min(2).max(3)
  }

  if (lowerField.includes('amount') || lowerField.includes('price')) {
    return z.number().positive()
  }

  // Default to non-empty string
  return z.string().min(1)
}

// =============================================================================
// REAL-TIME VALIDATION HELPERS
// =============================================================================

/**
 * Debounced validation for real-time form validation
 * @param validateFn - Validation function to call
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced validation function
 */
export function debounceValidation<T extends (...args: any[]) => any>(
  validateFn: T,
  delay: number = 300
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: NodeJS.Timeout

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise((resolve) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        resolve(validateFn(...args))
      }, delay)
    })
  }
}

/**
 * Validates form data progressively as user types
 * @param formData - Current form data
 * @param touchedFields - Fields that have been interacted with
 * @returns Progressive validation results
 */
export function validateFormProgressive(
  formData: any,
  touchedFields: Set<string>
): FormValidationResult {
  const errors: ValidationError[] = []
  const fieldErrors: Record<string, string> = {}

  // Only validate touched fields to avoid overwhelming user
  touchedFields.forEach(fieldName => {
    const fieldValue = formData[fieldName]
    const fieldResult = validateField(fieldName, fieldValue)
    
    if (!fieldResult.isValid && fieldResult.errors.length > 0) {
      const validationError = mapFieldToValidationError(fieldName, fieldResult.errors[0])
      errors.push(validationError)
      fieldErrors[fieldName] = validationError.userFriendlyMessage
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    fieldErrors
  }
}