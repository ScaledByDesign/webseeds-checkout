/**
 * Shared Validation Library
 * 
 * Consolidated validation schemas and utilities for the webseeds checkout system.
 * Provides consistent validation across checkout, upsell, and session management.
 * 
 * @author: Claude Code Assistant
 * @created: 2025-08-29
 */

import { z } from 'zod';

// =============================================================================
// SCHEMA EXPORTS
// =============================================================================

export {
  // Schemas
  customerInfoSchema,
  productSchema,
  billingInfoSchema,
  paymentTokenSchema,
  checkoutRequestSchema,
  upsellRequestSchema,
  sessionDataSchema,
  paymentResultSchema,
  orderSummarySchema,
  
  // Types
  type CustomerInfo,
  type Product,
  type BillingInfo,
  type PaymentToken,
  type CheckoutRequest,
  type UpsellRequest,
  type SessionData,
  type PaymentResult,
  type OrderSummary,
  type ValidationResult,
  type FieldValidationResult,
  type SessionValidationResult
} from './schemas'

// =============================================================================
// FORM VALIDATION EXPORTS
// =============================================================================

export {
  // Functions
  createUserFriendlyValidationErrors,
  validateCheckoutForm,
  validateUpsellForm,
  validateField,
  debounceValidation,
  validateFormProgressive,
  
  // Types
  type ValidationError,
  type FormValidationResult
} from './form-validation'

// =============================================================================
// SESSION & PAYMENT VALIDATION EXPORTS
// =============================================================================

export {
  // Session validation
  validateSessionData,
  validateSessionSchema,
  
  // Payment validation
  validatePaymentData,
  validatePaymentResultSchema,
  
  // Order validation
  validateOrderCompleteness,
  validateOrderSchema,
  
  // Business logic validation
  validateCheckoutBusinessRules,
  validateUpsellEligibility
} from './session-validation'

// =============================================================================
// ERROR HANDLING SERVICE INTEGRATION
// =============================================================================

export {
  // Error handling service
  errorHandler,
  createError,
  createErrorResponse,
  createSuccessResponse,
  mapPaymentError,
  
  // Error types
  ErrorCategory,
  ErrorSeverity,
  RecoveryStrategy,
  ERROR_DEFINITIONS,
  
  // Types
  type StandardizedError,
  type ErrorResponse,
  type SuccessResponse
} from '../error-handling-service'

export {
  // Integration patterns and utilities
  withErrorHandling,
  validateWithErrorHandling,
  handlePaymentResult,
  validateSession,
  retryWithBackoff,
  createCustomLogger,
  migrateExistingErrorHandler,
  wrapExistingValidation
} from '../error-handling-integration'

// =============================================================================
// CONVENIENCE UTILITIES
// =============================================================================

/**
 * Quick validation utility for common use cases
 * Validates the most common data types in the checkout flow
 */
export const validate = {
  // Email validation
  email: (email: string) => {
    try {
      const result = z.string().email().parse(email)
      return { isValid: true, value: result, error: null }
    } catch (error: any) {
      return { isValid: false, value: email, error: error.errors?.[0]?.message || 'Invalid email' }
    }
  },

  // Phone validation
  phone: (phone: string) => {
    const phoneRegex = /^\+?[\d\s\-\(\)\.]{10,}$/
    return {
      isValid: phoneRegex.test(phone),
      value: phone,
      error: phoneRegex.test(phone) ? null : 'Invalid phone number format'
    }
  },

  // ZIP code validation
  zipCode: (zip: string) => {
    const zipRegex = /^\d{5}(-\d{4})?$/
    return {
      isValid: zipRegex.test(zip),
      value: zip,
      error: zipRegex.test(zip) ? null : 'Invalid ZIP code format'
    }
  },

  // Amount validation
  amount: (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    const isValid = !isNaN(num) && num > 0
    return {
      isValid,
      value: num,
      error: isValid ? null : 'Amount must be a positive number'
    }
  },

  // Required field validation
  required: (value: any, fieldName?: string) => {
    const isValid = value !== null && value !== undefined && value !== '' && 
                   (Array.isArray(value) ? value.length > 0 : true)
    return {
      isValid,
      value,
      error: isValid ? null : `${fieldName || 'Field'} is required`
    }
  }
}

// =============================================================================
// ERROR CONSTANTS
// =============================================================================

export const VALIDATION_ERRORS = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_ZIP: 'Please enter a valid ZIP code',
  INVALID_AMOUNT: 'Amount must be a positive number',
  INVALID_SESSION: 'Invalid or expired session',
  PAYMENT_FAILED: 'Payment processing failed',
  MISSING_DATA: 'Required data is missing',
  VALIDATION_FAILED: 'Validation failed'
} as const

export const SUCCESS_MESSAGES = {
  VALIDATION_PASSED: 'All validations passed',
  PAYMENT_APPROVED: 'Payment approved successfully',
  SESSION_VALID: 'Session is valid',
  ORDER_COMPLETE: 'Order completed successfully'
} as const