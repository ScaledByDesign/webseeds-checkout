import { z } from 'zod'

// =============================================================================
// SHARED VALIDATION SCHEMAS
// =============================================================================

/**
 * Customer information schema - used in checkout and upsell processes
 * Validates all customer data including shipping and contact information
 */
export const customerInfoSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required').max(3),
  zipCode: z.string().min(5, 'Valid zip code is required'),
  country: z.string().default('US'),
})

/**
 * Product schema - validates individual product information
 * Used in checkout forms and order processing
 */
export const productSchema = z.object({
  id: z.string().min(1, 'Product ID is required'),
  name: z.string().min(1, 'Product name is required'),
  price: z.number().positive('Price must be positive'),
  quantity: z.number().int().positive('Quantity must be positive'),
})

/**
 * Billing information schema - separate from customer info for flexibility
 * Used when billing address differs from shipping address
 */
export const billingInfoSchema = z.object({
  address: z.string().min(1, 'Billing address is required'),
  city: z.string().min(1, 'Billing city is required'),
  state: z.string().min(2, 'Billing state is required').max(3),
  zipCode: z.string().min(5, 'Valid billing zip code is required'),
  country: z.string().default('US'),
})

/**
 * Payment token schema - validates tokenized payment information
 * Used with CollectJS and other tokenization systems
 */
export const paymentTokenSchema = z.object({
  token: z.string().min(1, 'Payment token is required'),
  type: z.enum(['card', 'bank']).default('card'),
  last4: z.string().optional(),
  brand: z.string().optional(),
  exp_month: z.number().min(1).max(12).optional(),
  exp_year: z.number().min(new Date().getFullYear()).optional(),
})

/**
 * Complete checkout request schema - combines all checkout data
 * Main schema for processing checkout requests
 */
export const checkoutRequestSchema = z.object({
  customerInfo: customerInfoSchema,
  paymentToken: z.string().min(1, 'Payment token is required'),
  products: z.array(productSchema).min(1, 'At least one product is required'),
  billingInfo: billingInfoSchema.optional(),
  couponCode: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

/**
 * Upsell request schema - validates upsell purchase requests
 * Used in upsell flow with vault ID for stored payment methods
 */
export const upsellRequestSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  productCode: z.string().min(1, 'Product code is required'),
  amount: z.number().positive('Amount must be positive'),
  bottles: z.number().int().positive('Number of bottles must be positive'),
  step: z.number().int().positive('Step number is required'),
})

/**
 * Session data schema - validates funnel session information
 * Used for session creation and updates
 */
export const sessionDataSchema = z.object({
  id: z.string().uuid('Invalid session ID').optional(),
  email: z.string().email('Invalid email address'),
  status: z.enum(['created', 'processing', 'completed', 'failed']).default('created'),
  current_step: z.string().optional(),
  transaction_id: z.string().optional(),
  vault_id: z.string().optional(),
  products: z.array(productSchema),
  customerInfo: customerInfoSchema,
  metadata: z.record(z.any()).optional(),
})

/**
 * Payment result schema - validates payment processor responses
 * Used to ensure payment results contain required fields
 */
export const paymentResultSchema = z.object({
  success: z.boolean(),
  transactionId: z.string().optional(),
  authCode: z.string().optional(),
  responseCode: z.string().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  vaultId: z.string().optional(),
  sessionId: z.string().optional(),
  amount: z.number().optional(),
})

/**
 * Order summary schema - validates complete order information
 * Used for order completion and thank you page data
 */
export const orderSummarySchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  transactionId: z.string().min(1, 'Transaction ID is required'),
  amount: z.number().positive('Order amount must be positive'),
  tax: z.number().min(0).optional(),
  shipping: z.number().min(0).default(0),
  total: z.number().positive('Total amount must be positive'),
  customer: customerInfoSchema,
  products: z.array(productSchema),
  paymentMethod: z.object({
    last4: z.string().optional(),
    brand: z.string().optional(),
    type: z.enum(['card', 'bank']).default('card'),
  }).optional(),
  upsells: z.array(z.object({
    step: z.number(),
    productCode: z.string(),
    amount: z.number(),
    bottles: z.number(),
    transactionId: z.string(),
    timestamp: z.string(),
  })).default([]),
})

// =============================================================================
// TYPE EXPORTS - Inferred from schemas for type safety
// =============================================================================

export type CustomerInfo = z.infer<typeof customerInfoSchema>
export type Product = z.infer<typeof productSchema>
export type BillingInfo = z.infer<typeof billingInfoSchema>
export type PaymentToken = z.infer<typeof paymentTokenSchema>
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>
export type UpsellRequest = z.infer<typeof upsellRequestSchema>
export type SessionData = z.infer<typeof sessionDataSchema>
export type PaymentResult = z.infer<typeof paymentResultSchema>
export type OrderSummary = z.infer<typeof orderSummarySchema>

// =============================================================================
// VALIDATION RESULT INTERFACES
// =============================================================================

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface FieldValidationResult extends ValidationResult {
  field: string
  value: any
}

export interface SessionValidationResult extends ValidationResult {
  sessionData?: any
  missingFields: string[]
}