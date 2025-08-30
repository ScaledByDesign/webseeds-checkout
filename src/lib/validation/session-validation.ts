import { z } from 'zod'
import {
  sessionDataSchema,
  paymentResultSchema,
  orderSummarySchema,
  type ValidationResult,
  type SessionValidationResult,
  type PaymentResult,
  type SessionData
} from './schemas'

// =============================================================================
// SESSION VALIDATION UTILITIES
// =============================================================================

/**
 * Validates session data completeness and integrity
 * @param session - Session data to validate
 * @param requiredFields - Additional required fields beyond defaults
 * @returns Session validation result with detailed feedback
 */
export function validateSessionData(
  session: any,
  requiredFields: string[] = []
): SessionValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const missingFields: string[] = []

  if (!session) {
    return {
      isValid: false,
      errors: ['Session is null or undefined'],
      warnings: [],
      missingFields: ['session']
    }
  }

  // Check required fields
  const defaultRequiredFields = ['id', 'email']
  const fieldsToCheck = requiredFields.length > 0 ? requiredFields : defaultRequiredFields

  fieldsToCheck.forEach(field => {
    if (!session[field]) {
      missingFields.push(field)
      errors.push(`Missing required field: ${field}`)
    }
  })

  // Validate email format if present
  if (session.email && !z.string().email().safeParse(session.email).success) {
    errors.push('Invalid email format in session')
  }

  // Validate products data
  if (session.products) {
    try {
      const products = Array.isArray(session.products) 
        ? session.products 
        : JSON.parse(session.products)
      
      if (!Array.isArray(products) || products.length === 0) {
        warnings.push('Products array is empty')
      }
    } catch (error) {
      errors.push('Invalid products data format')
    }
  } else {
    warnings.push('No products data in session')
  }

  // Validate customer info if present
  if (session.customer_info || session.customerInfo) {
    const customerInfo = session.customer_info || session.customerInfo
    try {
      if (typeof customerInfo === 'string') {
        JSON.parse(customerInfo)
      }
    } catch (error) {
      errors.push('Invalid customer info format')
    }
  }

  // Check session status validity
  if (session.status) {
    const validStatuses = ['created', 'processing', 'completed', 'failed']
    if (!validStatuses.includes(session.status)) {
      warnings.push(`Unknown session status: ${session.status}`)
    }
  }

  // Check session expiration if timestamps are present
  if (session.created_at || session.expires_at) {
    try {
      const now = new Date()
      
      if (session.expires_at) {
        const expiresAt = new Date(session.expires_at)
        if (expiresAt < now) {
          warnings.push('Session has expired')
        }
      }
      
      if (session.created_at) {
        const createdAt = new Date(session.created_at)
        const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
        
        if (hoursSinceCreation > 24) {
          warnings.push('Session is more than 24 hours old')
        }
      }
    } catch (error) {
      warnings.push('Invalid session timestamp format')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sessionData: session,
    missingFields
  }
}

/**
 * Validates session data using Zod schema
 * @param sessionData - Session data to validate
 * @returns Validation result with parsed data
 */
export function validateSessionSchema(sessionData: any): {
  isValid: boolean
  data?: SessionData
  errors: string[]
} {
  try {
    const validatedData = sessionDataSchema.parse(sessionData)
    return {
      isValid: true,
      data: validatedData,
      errors: []
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      }
    }
    
    return {
      isValid: false,
      errors: ['Session validation failed']
    }
  }
}

// =============================================================================
// PAYMENT VALIDATION UTILITIES
// =============================================================================

/**
 * Validates payment result data from payment processors
 * @param paymentResult - Payment result to validate
 * @returns Payment validation result with detailed feedback
 */
export function validatePaymentData(paymentResult: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!paymentResult) {
    return {
      isValid: false,
      errors: ['Payment result is null or undefined'],
      warnings: []
    }
  }

  // Check required payment fields
  if (!paymentResult.transactionId && !paymentResult.success === false) {
    errors.push('Missing transaction ID in payment result')
  }

  // Check payment approval status
  if (!paymentResult.success && !paymentResult.approved) {
    // Only error if we expected success but didn't get it
    if (paymentResult.success !== false) {
      errors.push('Payment success status is unclear')
    }
  }

  // Check for vault ID (important for upsells)
  if (!paymentResult.vaultId && paymentResult.success) {
    warnings.push('No vault ID in payment result - upsells may not work')
  }

  // Validate response codes if present
  if (paymentResult.responseCode) {
    const code = paymentResult.responseCode.toString()
    if (code !== '100' && code !== '1' && paymentResult.success) {
      warnings.push(`Unexpected response code for successful payment: ${code}`)
    }
  }

  // Check for error information in failed payments
  if (!paymentResult.success && !paymentResult.error && !paymentResult.message) {
    warnings.push('Failed payment lacks error information')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates payment result using Zod schema
 * @param paymentResult - Payment result to validate
 * @returns Validation result with parsed data
 */
export function validatePaymentResultSchema(paymentResult: any): {
  isValid: boolean
  data?: PaymentResult
  errors: string[]
} {
  try {
    const validatedData = paymentResultSchema.parse(paymentResult)
    return {
      isValid: true,
      data: validatedData,
      errors: []
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      }
    }
    
    return {
      isValid: false,
      errors: ['Payment result validation failed']
    }
  }
}

// =============================================================================
// ORDER VALIDATION UTILITIES
// =============================================================================

/**
 * Validates order completeness for thank you page and fulfillment
 * @param orderData - Complete order data to validate
 * @returns Validation result with completeness check
 */
export function validateOrderCompleteness(orderData: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!orderData) {
    return {
      isValid: false,
      errors: ['Order data is null or undefined'],
      warnings: []
    }
  }

  // Check customer information
  if (!orderData.customer) {
    errors.push('Missing customer information')
  } else {
    const requiredCustomerFields = ['firstName', 'lastName', 'email', 'address', 'city', 'state', 'zipCode']
    requiredCustomerFields.forEach(field => {
      if (!orderData.customer[field]) {
        warnings.push(`Missing customer field: ${field}`)
      }
    })
  }

  // Check products
  if (!orderData.products || !Array.isArray(orderData.products) || orderData.products.length === 0) {
    errors.push('Missing or empty products array')
  }

  // Check transaction information
  if (!orderData.transactionId) {
    errors.push('Missing transaction ID')
  }

  // Check amounts
  if (!orderData.amount || orderData.amount <= 0) {
    errors.push('Invalid or missing order amount')
  }

  if (orderData.total !== undefined && orderData.total <= 0) {
    errors.push('Invalid total amount')
  }

  // Validate amount calculations if components are present
  if (orderData.amount && orderData.tax !== undefined && orderData.shipping !== undefined) {
    const calculatedTotal = orderData.amount + (orderData.tax || 0) + (orderData.shipping || 0)
    if (orderData.total && Math.abs(calculatedTotal - orderData.total) > 0.01) {
      warnings.push('Order total doesn\'t match sum of amount + tax + shipping')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates complete order data using schema
 * @param orderData - Order data to validate
 * @returns Validation result with parsed data
 */
export function validateOrderSchema(orderData: any): {
  isValid: boolean
  data?: any
  errors: string[]
} {
  try {
    const validatedData = orderSummarySchema.parse(orderData)
    return {
      isValid: true,
      data: validatedData,
      errors: []
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      }
    }
    
    return {
      isValid: false,
      errors: ['Order validation failed']
    }
  }
}

// =============================================================================
// BUSINESS LOGIC VALIDATION
// =============================================================================

/**
 * Validates business rules for checkout process
 * @param sessionData - Session data to validate
 * @param paymentData - Payment data to validate
 * @returns Business validation result
 */
export function validateCheckoutBusinessRules(sessionData: any, paymentData: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check session-payment consistency
  if (sessionData?.id && paymentData?.sessionId && sessionData.id !== paymentData.sessionId) {
    errors.push('Session ID mismatch between session and payment data')
  }

  // Check amount consistency
  if (sessionData?.metadata?.totalAmount && paymentData?.amount) {
    if (Math.abs(sessionData.metadata.totalAmount - paymentData.amount) > 0.01) {
      errors.push('Payment amount doesn\'t match session total')
    }
  }

  // Check customer email consistency
  if (sessionData?.email && sessionData?.customer_info?.email) {
    if (sessionData.email !== sessionData.customer_info.email) {
      warnings.push('Session email differs from customer info email')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates upsell eligibility
 * @param sessionData - Original session data
 * @param upsellRequest - Upsell request data
 * @returns Validation result for upsell eligibility
 */
export function validateUpsellEligibility(sessionData: any, upsellRequest: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if session exists and is valid
  if (!sessionData) {
    errors.push('No session data for upsell validation')
    return { isValid: false, errors, warnings }
  }

  // Check if main transaction was successful
  if (!sessionData.transaction_id) {
    errors.push('No main transaction ID - upsell not allowed')
  }

  // Check if vault ID exists for stored payment
  if (!sessionData.vault_id) {
    errors.push('No stored payment method - upsell not allowed')
  }

  // Check session ID consistency
  if (sessionData.id !== upsellRequest.sessionId) {
    errors.push('Session ID mismatch for upsell request')
  }

  // Check if customer info is complete for billing
  if (sessionData.customer_info) {
    const customerInfo = typeof sessionData.customer_info === 'string'
      ? JSON.parse(sessionData.customer_info)
      : sessionData.customer_info

    if (!customerInfo.firstName || !customerInfo.lastName) {
      warnings.push('Incomplete customer name for upsell billing')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}