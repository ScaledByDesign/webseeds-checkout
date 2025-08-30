/**
 * Error Handling Integration Example
 * 
 * Shows how to migrate existing API routes to use the unified error handling service.
 * This example demonstrates before/after patterns for consistent error management.
 * 
 * @author: Claude Code Assistant
 * @created: 2025-08-29
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  withErrorHandling,
  validateWithErrorHandling,
  createErrorResponse,
  createSuccessResponse,
  mapPaymentError,
  ErrorCategory,
  ErrorSeverity,
  type StandardizedError
} from '../lib/error-handling-service';

// =============================================================================
// BEFORE: Inconsistent Error Handling
// =============================================================================

/**
 * OLD WAY: Inconsistent error responses and handling
 */
export async function oldCheckoutRoute(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Inconsistent validation errors
    if (!body.customerInfo) {
      return NextResponse.json(
        { error: 'Customer info required' }, // Different format
        { status: 400 }
      );
    }
    
    if (!body.customerInfo.email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' }, // Different format
        { status: 400 }
      );
    }
    
    // Email validation without user-friendly messages
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.customerInfo.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' }, // Not user-friendly
        { status: 400 }
      );
    }
    
    // Payment processing with inconsistent error handling
    try {
      const paymentResult = await processPayment(body);
      
      if (!paymentResult.success) {
        // Raw NMI error messages (not user-friendly)
        return NextResponse.json(
          { error: paymentResult.rawError || 'Payment failed' },
          { status: 400 }
        );
      }
      
      // Inconsistent success response
      return NextResponse.json({
        success: true,
        transactionId: paymentResult.transactionId
      });
      
    } catch (paymentError) {
      console.error('Payment error:', paymentError);
      
      // Generic error message
      return NextResponse.json(
        { error: 'Payment processing failed' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Checkout error:', error);
    
    // Generic error with no context or recovery suggestions
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// AFTER: Unified Error Handling
// =============================================================================

/**
 * NEW WAY: Consistent, user-friendly error handling with recovery strategies
 */
export const newCheckoutRoute = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  
  // Consistent validation with user-friendly errors
  const validation = validateWithErrorHandling(
    z.object({
      customerInfo: z.object({
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
        email: z.string().email('Please enter a valid email address'),
        phone: z.string().min(10, 'Phone number must be at least 10 digits'),
        address: z.string().min(1, 'Address is required'),
        city: z.string().min(1, 'City is required'),
        state: z.string().min(2, 'State is required'),
        zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format')
      }),
      paymentToken: z.string().min(1, 'Payment information is required'),
      products: z.array(z.object({
        id: z.string(),
        name: z.string(),
        price: z.number().positive(),
        quantity: z.number().int().positive()
      })).min(1, 'At least one product is required')
    }),
    body,
    { 
      step: 'checkout_validation',
      sessionId: body.sessionId,
      userAgent: request.headers.get('user-agent')
    }
  );

  if (!validation.isValid) {
    return validation.error;
  }

  // Process payment with consistent error mapping
  try {
    const paymentResult = await processPayment(validation.data);
    
    // Handle payment errors consistently
    if (!paymentResult.success) {
      const paymentError = mapPaymentError(paymentResult.nmiResponse, {
        sessionId: body.sessionId,
        amount: calculateTotal(validation.data.products),
        step: 'payment_processing'
      });
      
      return createErrorResponse(paymentError, {
        sessionId: body.sessionId,
        transactionId: paymentResult.transactionId
      });
    }
    
    // Consistent success response
    return {
      transactionId: paymentResult.transactionId,
      vaultId: paymentResult.vaultId,
      amount: paymentResult.amount,
      message: 'Payment processed successfully'
    };
    
  } catch (paymentError) {
    // Payment errors are automatically handled by withErrorHandling wrapper
    throw paymentError;
  }
});

// =============================================================================
// MIGRATION EXAMPLE: Gradual Transition
// =============================================================================

/**
 * MIGRATION APPROACH: Gradually introduce error handling service
 */
export async function migrationExampleRoute(request: NextRequest) {
  const USE_NEW_ERROR_HANDLING = process.env.USE_NEW_ERROR_HANDLING === 'true';
  
  try {
    const body = await request.json();
    
    // Use new validation if enabled, fall back to old
    if (USE_NEW_ERROR_HANDLING) {
      const validation = validateWithErrorHandling(
        z.object({
          email: z.string().email(),
          amount: z.number().positive()
        }),
        body,
        { migration: true }
      );
      
      if (!validation.isValid) {
        return NextResponse.json(validation.error, { status: 400 });
      }
      
      // Process with validated data
      const result = await processWithNewHandler(validation.data);
      return NextResponse.json(createSuccessResponse(result));
      
    } else {
      // Old validation logic
      if (!body.email || !body.amount) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }
      
      const result = await processWithOldHandler(body);
      return NextResponse.json({ success: true, data: result });
    }
    
  } catch (error) {
    if (USE_NEW_ERROR_HANDLING) {
      const standardizedError = createErrorResponse(error, {
        migration: true,
        url: request.url
      });
      return NextResponse.json(standardizedError, { status: 500 });
    } else {
      console.error('Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
}

// =============================================================================
// SPECIFIC USE CASE EXAMPLES
// =============================================================================

/**
 * Example: Form validation with field-specific errors
 */
export async function formValidationExample(formData: any) {
  const customerSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Please enter a valid email address'),
    phone: z.string().regex(
      /^\+?[\d\s\-\(\)\.]{10,}$/, 
      'Please enter a valid phone number'
    ),
    address: z.string().min(5, 'Please enter a complete address'),
    city: z.string().min(1, 'City is required'),
    state: z.string().length(2, 'Please select your state'),
    zipCode: z.string().regex(
      /^\d{5}(-\d{4})?$/, 
      'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)'
    )
  });

  const validation = validateWithErrorHandling(customerSchema, formData);
  
  if (!validation.isValid) {
    // Returns structured field errors for frontend form handling
    return {
      isValid: false,
      errors: validation.error.errors, // Field-specific error messages
      suggestions: validation.error.error.suggestions
    };
  }

  return {
    isValid: true,
    data: validation.data
  };
}

/**
 * Example: Payment error handling with recovery strategies
 */
export async function paymentErrorExample(nmiResponse: any, context: any) {
  // Maps NMI responses to user-friendly errors with recovery strategies
  const paymentError = mapPaymentError(nmiResponse, context);
  
  // Different handling based on error type
  switch (paymentError.code) {
    case 'PAYMENT_DECLINED':
      return {
        userMessage: 'Your payment was declined',
        suggestions: [
          'Check that your card has sufficient funds',
          'Try using a different payment method',
          'Contact your bank if the issue persists'
        ],
        recoveryOptions: [
          { action: 'retry', label: 'Try Again' },
          { action: 'change_payment', label: 'Use Different Card' },
          { action: 'contact_support', label: 'Get Help' }
        ],
        retryable: true
      };
      
    case 'PAYMENT_EXPIRED_CARD':
      return {
        userMessage: 'Your card has expired',
        suggestions: [
          'Please use a card that hasn\'t expired',
          'Check the expiration date on your card'
        ],
        recoveryOptions: [
          { action: 'change_payment', label: 'Use Different Card' }
        ],
        retryable: true
      };
      
    case 'PAYMENT_INSUFFICIENT_FUNDS':
      return {
        userMessage: 'Your card has insufficient funds',
        suggestions: [
          'Check your account balance',
          'Use a different payment method',
          'Add funds to your account'
        ],
        recoveryOptions: [
          { action: 'change_payment', label: 'Use Different Card' },
          { action: 'contact_bank', label: 'Contact Bank' }
        ],
        retryable: true
      };
      
    default:
      return {
        userMessage: 'We encountered an issue processing your payment',
        suggestions: [
          'Please try again in a moment',
          'If the issue persists, contact support'
        ],
        recoveryOptions: [
          { action: 'retry', label: 'Try Again' },
          { action: 'contact_support', label: 'Get Help' }
        ],
        retryable: true
      };
  }
}

/**
 * Example: Session error handling
 */
export async function sessionErrorExample(sessionId: string) {
  // Mock session retrieval
  const session = await getSession(sessionId).catch(() => null);
  
  if (!session) {
    const sessionError = createErrorResponse(
      'Session not found',
      { sessionId, category: ErrorCategory.SESSION },
      undefined
    );
    
    return {
      error: sessionError,
      recoveryActions: [
        'Start a new checkout process',
        'Clear browser cookies and try again',
        'Contact support if you continue having issues'
      ]
    };
  }
  
  // Check session expiration
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    const expiredError = createErrorResponse(
      'Session has expired',
      { 
        sessionId, 
        category: ErrorCategory.SESSION,
        severity: ErrorSeverity.WARNING 
      }
    );
    
    return {
      error: expiredError,
      recoveryActions: [
        'Refresh the page to start a new session',
        'Your cart contents may be preserved'
      ]
    };
  }
  
  return { session, valid: true };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function processPayment(data: any) {
  // Mock payment processing
  return {
    success: false,
    nmiResponse: {
      response: '2', // Declined
      response_code: '200',
      responsetext: 'DECLINED'
    }
  };
}

async function getSession(sessionId: string) {
  // Mock session retrieval
  return null;
}

function calculateTotal(products: any[]) {
  return products.reduce((sum, product) => sum + (product.price * product.quantity), 0);
}

async function processWithNewHandler(data: any) {
  return { processed: true, data };
}

async function processWithOldHandler(data: any) {
  return { processed: true, data };
}