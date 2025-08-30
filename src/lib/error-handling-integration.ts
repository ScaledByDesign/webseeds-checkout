/**
 * Error Handling Integration Examples
 * 
 * Demonstrates how to integrate the unified error handling service
 * with existing API routes, validation systems, and payment processing.
 * 
 * @author: Claude Code Assistant
 * @created: 2025-08-29
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  errorHandler,
  createErrorResponse,
  createSuccessResponse,
  mapPaymentError,
  ErrorCategory,
  ErrorSeverity,
  RecoveryStrategy,
  type StandardizedError,
  type ErrorResponse,
  type SuccessResponse
} from './error-handling-service';
import { createUserFriendlyValidationErrors } from './validation';

// =============================================================================
// API ROUTE INTEGRATION PATTERNS
// =============================================================================

/**
 * Enhanced API route wrapper with unified error handling
 */
export function withErrorHandling<T = any>(
  handler: (request: Request) => Promise<T | ErrorResponse>
) {
  return async (request: Request): Promise<NextResponse> => {
    const startTime = Date.now();
    let sessionId: string | undefined;
    let requestId: string | undefined;

    try {
      // Generate request ID for tracking
      requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Extract session ID from request if available
      try {
        const body = await request.clone().json();
        sessionId = body.sessionId;
      } catch {
        // Session ID not in body, could be in headers or cookies
      }

      const result = await handler(request);
      
      // If result is an error response, return it
      if (typeof result === 'object' && result !== null && 'success' in result && !result.success) {
        return NextResponse.json(result, { status: getStatusFromError(result as ErrorResponse) });
      }

      // Create success response
      const successResponse = createSuccessResponse(result, undefined, {
        sessionId,
        requestId
      });

      return NextResponse.json(successResponse);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Create standardized error with context
      const standardizedError = errorHandler.createError(error, {
        requestId,
        sessionId,
        processingTime,
        url: request.url,
        method: request.method
      });

      const errorResponse = createErrorResponse(standardizedError, {
        sessionId,
        requestId
      });

      return NextResponse.json(errorResponse, { 
        status: getStatusFromError(errorResponse) 
      });
    }
  };
}

/**
 * Validation integration with error handling service
 */
export function validateWithErrorHandling<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: Record<string, any>
): { isValid: true; data: T } | { isValid: false; error: ErrorResponse } {
  try {
    const validatedData = schema.parse(data);
    return { isValid: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const standardizedError = errorHandler.createError(error, context);
      const fieldErrors = errorHandler.createFieldValidationErrors(error);
      
      const errorResponse = createErrorResponse(standardizedError, context, fieldErrors);
      return { isValid: false, error: errorResponse };
    }

    const standardizedError = errorHandler.createError(error, context);
    const errorResponse = createErrorResponse(standardizedError, context);
    return { isValid: false, error: errorResponse };
  }
}

/**
 * Payment processing integration
 */
export function handlePaymentResult(
  nmiResponse: any,
  context: Record<string, any> = {}
): { success: true; data: any } | { success: false; error: ErrorResponse } {
  const isApproved = nmiResponse.response === '1' || nmiResponse.response_code === '100';
  
  if (isApproved) {
    return {
      success: true,
      data: {
        transactionId: nmiResponse.transactionid,
        authCode: nmiResponse.authcode,
        vaultId: nmiResponse.customer_vault_id,
        amount: context.amount,
        approved: true
      }
    };
  }

  // Map payment error
  const paymentError = mapPaymentError(nmiResponse, context);
  const errorResponse = createErrorResponse(paymentError, {
    sessionId: context.sessionId,
    transactionId: context.transactionId
  });

  return { success: false, error: errorResponse };
}

/**
 * Session validation integration
 */
export function validateSession(
  session: any,
  requiredFields: string[] = []
): { isValid: true; session: any } | { isValid: false; error: ErrorResponse } {
  if (!session) {
    const error = errorHandler.createError('Session not found', {
      category: ErrorCategory.SESSION,
      severity: ErrorSeverity.ERROR
    });
    
    return {
      isValid: false,
      error: createErrorResponse(error)
    };
  }

  // Check required fields
  const missingFields: string[] = [];
  requiredFields.forEach(field => {
    if (!session[field]) {
      missingFields.push(field);
    }
  });

  if (missingFields.length > 0) {
    const error = errorHandler.createError(`Missing required session fields: ${missingFields.join(', ')}`, {
      category: ErrorCategory.SESSION,
      severity: ErrorSeverity.ERROR,
      missingFields
    });

    return {
      isValid: false,
      error: createErrorResponse(error)
    };
  }

  return { isValid: true, session };
}

// =============================================================================
// SPECIFIC INTEGRATION EXAMPLES
// =============================================================================

/**
 * Example: Checkout API integration
 */
export const checkoutAPIExample = withErrorHandling(async (request: Request) => {
  try {
    const body = await request.json();
    
    // Validate request data
    const validation = validateWithErrorHandling(
      z.object({
        customerInfo: z.object({
          firstName: z.string().min(1),
          lastName: z.string().min(1),
          email: z.string().email(),
          phone: z.string().min(10)
        }),
        paymentToken: z.string().min(1),
        amount: z.number().positive()
      }),
      body,
      { step: 'checkout_validation' }
    );

    if (!validation.isValid) {
      throw new Error('Validation failed');
    }

    // Process payment (example)
    const mockNMIResponse = {
      response: '1',
      response_code: '100',
      transactionid: 'txn_123456',
      authcode: 'AUTH123',
      responsetext: 'SUCCESS'
    };

    const paymentResult = handlePaymentResult(mockNMIResponse, {
      sessionId: body.sessionId,
      amount: validation.data.amount
    });

    if (!paymentResult.success) {
      throw new Error('Payment failed');
    }

    return {
      transactionId: paymentResult.data.transactionId,
      amount: validation.data.amount,
      message: 'Payment processed successfully'
    };

  } catch (error) {
    // This will be caught by withErrorHandling wrapper
    throw error;
  }
});

/**
 * Example: Upsell API integration
 */
export const upsellAPIExample = withErrorHandling(async (request: Request) => {
  try {
    const body = await request.json();
    
    // Validate upsell request
    const validation = validateWithErrorHandling(
      z.object({
        sessionId: z.string().min(1),
        productCode: z.string().min(1),
        amount: z.number().positive(),
        step: z.number().int().positive()
      }),
      body,
      { step: 'upsell_validation' }
    );

    if (!validation.isValid) {
      throw new Error('Upsell validation failed');
    }

    // Validate session (mock session data)
    const mockSession = {
      id: validation.data.sessionId,
      vaultId: 'vault_123',
      email: 'test@example.com'
    };

    const sessionValidation = validateSession(mockSession, ['id', 'vaultId']);
    if (!sessionValidation.isValid) {
      throw new Error('Session validation failed');
    }

    // Process upsell payment
    const mockUpsellResponse = {
      response: '1',
      response_code: '100',
      transactionid: 'upsell_123456',
      authcode: 'UPSELL123'
    };

    const upsellResult = handlePaymentResult(mockUpsellResponse, {
      sessionId: validation.data.sessionId,
      amount: validation.data.amount,
      step: validation.data.step
    });

    if (!upsellResult.success) {
      throw new Error('Upsell payment failed');
    }

    return {
      success: true,
      transactionId: upsellResult.data.transactionId,
      amount: validation.data.amount,
      productCode: validation.data.productCode,
      step: validation.data.step
    };

  } catch (error) {
    throw error;
  }
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Determines appropriate HTTP status code from error response
 */
function getStatusFromError(errorResponse: ErrorResponse): number {
  const { category, severity } = errorResponse.error;
  
  // Map categories to status codes
  switch (category) {
    case ErrorCategory.VALIDATION:
      return 400; // Bad Request
    
    case ErrorCategory.SESSION:
      return 401; // Unauthorized
    
    case ErrorCategory.PAYMENT:
      return 402; // Payment Required (or 400 for client errors)
      
    case ErrorCategory.NETWORK:
      return 503; // Service Unavailable
      
    case ErrorCategory.SYSTEM:
      return severity === ErrorSeverity.CRITICAL ? 503 : 500; // Service Unavailable or Internal Server Error
      
    case ErrorCategory.SECURITY:
      return 403; // Forbidden
      
    case ErrorCategory.BUSINESS:
      return 422; // Unprocessable Entity
      
    default:
      return 500; // Internal Server Error
  }
}

/**
 * Creates a custom logger for error tracking
 */
export function createCustomLogger(
  logToSentry: (error: StandardizedError) => void,
  logToAnalytics: (error: StandardizedError) => void
) {
  return (error: StandardizedError) => {
    // Log critical errors to Sentry
    if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.ERROR) {
      try {
        logToSentry(error);
      } catch (err) {
        console.error('Failed to log to Sentry:', err);
      }
    }

    // Log user errors to analytics
    if (error.category === ErrorCategory.USER || error.category === ErrorCategory.VALIDATION) {
      try {
        logToAnalytics(error);
      } catch (err) {
        console.error('Failed to log to analytics:', err);
      }
    }
  };
}

/**
 * Retry helper with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Check if error is retryable
      const standardizedError = errorHandler.createError(error);
      if (!errorHandler.isRetryableError(standardizedError)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// =============================================================================
// MIGRATION HELPERS
// =============================================================================

/**
 * Helper to gradually migrate existing error handling
 */
export function migrateExistingErrorHandler(
  existingHandler: (error: any) => any,
  useNewHandler: boolean = false
) {
  return (error: any, context?: Record<string, any>) => {
    if (useNewHandler) {
      return errorHandler.createErrorResponse(error, context);
    } else {
      // Use existing handler but log with new system
      const standardizedError = errorHandler.createError(error, context);
      errorHandler.logError(standardizedError);
      return existingHandler(error);
    }
  };
}

/**
 * Compatibility wrapper for existing validation functions
 */
export function wrapExistingValidation<T>(
  existingValidationFn: (data: T) => { isValid: boolean; errors?: any }
) {
  return (data: T, context?: Record<string, any>) => {
    const result = existingValidationFn(data);
    
    if (!result.isValid && result.errors) {
      // Convert existing errors to standardized format
      const standardizedError = errorHandler.createError(result.errors, {
        ...context,
        category: ErrorCategory.VALIDATION
      });
      
      return {
        isValid: false,
        error: createErrorResponse(standardizedError, context)
      };
    }
    
    return {
      isValid: true,
      data: data
    };
  };
}