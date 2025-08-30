/**
 * Unified Error Handling Service
 * 
 * Provides consistent error management across the webseeds checkout application.
 * Standardizes error types, responses, logging, and recovery strategies.
 * 
 * @author: Claude Code Assistant
 * @created: 2025-08-29
 * @task: 9cf7dd6e-41bf-4795-9beb-9d81fddb0456
 */

import { z } from 'zod';

// =============================================================================
// ERROR TYPES AND INTERFACES
// =============================================================================

/**
 * Error categories for consistent classification
 */
export enum ErrorCategory {
  USER = 'user',           // User input errors (validation, missing fields)
  SYSTEM = 'system',       // System/server errors (database, network)
  PAYMENT = 'payment',     // Payment processing errors (declined, timeout)
  VALIDATION = 'validation', // Data validation errors
  SESSION = 'session',     // Session management errors
  NETWORK = 'network',     // Network/timeout errors
  SECURITY = 'security',   // Security-related errors
  BUSINESS = 'business'    // Business logic errors
}

/**
 * Error severity levels for prioritization and handling
 */
export enum ErrorSeverity {
  INFO = 'info',           // Informational, no action needed
  WARNING = 'warning',     // Potential issue, may need attention
  ERROR = 'error',         // Error that affects functionality
  CRITICAL = 'critical'    // Critical error requiring immediate action
}

/**
 * Error recovery strategies
 */
export enum RecoveryStrategy {
  RETRY = 'retry',                    // Allow user to retry the operation
  REDIRECT = 'redirect',              // Redirect to different page
  FALLBACK = 'fallback',              // Use fallback method
  CONTACT_SUPPORT = 'contact_support', // Direct user to contact support
  REFRESH = 'refresh',                // Refresh page/session
  UPDATE_PAYMENT = 'update_payment',  // Update payment method
  NONE = 'none'                       // No recovery action available
}

/**
 * Standardized error interface
 */
export interface StandardizedError {
  id: string;                    // Unique error identifier
  category: ErrorCategory;       // Error category
  severity: ErrorSeverity;       // Error severity level
  code: string;                  // Machine-readable error code
  message: string;               // Technical error message
  userMessage: string;           // User-friendly message
  context: Record<string, any>;  // Error context data
  timestamp: string;             // ISO timestamp
  recoveryStrategy: RecoveryStrategy; // Suggested recovery action
  suggestions: string[];         // User-friendly suggestions
  retryable: boolean;            // Whether error is retryable
  field?: string;                // Related field (for validation errors)
}

/**
 * API error response interface
 */
export interface ErrorResponse {
  success: false;
  error: {
    id: string;
    code: string;
    message: string;
    userMessage: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    recoveryStrategy: RecoveryStrategy;
    suggestions: string[];
    retryable: boolean;
    timestamp: string;
    context?: Record<string, any>;
  };
  errors?: Record<string, string>; // Field-specific errors
  metadata?: {
    sessionId?: string;
    transactionId?: string;
    requestId?: string;
  };
}

/**
 * Success response interface for consistency
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  metadata?: {
    sessionId?: string;
    transactionId?: string;
    requestId?: string;
  };
}

// =============================================================================
// ERROR DEFINITIONS AND MAPPINGS
// =============================================================================

/**
 * Predefined error definitions for common scenarios
 */
export const ERROR_DEFINITIONS = {
  // Validation Errors
  VALIDATION_REQUIRED_FIELD: {
    code: 'VALIDATION_REQUIRED_FIELD',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.ERROR,
    message: 'Required field is missing',
    userMessage: 'Please fill in all required fields',
    recoveryStrategy: RecoveryStrategy.RETRY,
    suggestions: ['Complete all required fields and try again'],
    retryable: true
  },
  
  VALIDATION_INVALID_EMAIL: {
    code: 'VALIDATION_INVALID_EMAIL',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.ERROR,
    message: 'Invalid email format',
    userMessage: 'Please enter a valid email address',
    recoveryStrategy: RecoveryStrategy.RETRY,
    suggestions: ['Check your email format (e.g., example@domain.com)'],
    retryable: true
  },

  VALIDATION_INVALID_PHONE: {
    code: 'VALIDATION_INVALID_PHONE',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.ERROR,
    message: 'Invalid phone number format',
    userMessage: 'Please enter a valid phone number',
    recoveryStrategy: RecoveryStrategy.RETRY,
    suggestions: ['Include area code (e.g., 555-123-4567)'],
    retryable: true
  },

  VALIDATION_INVALID_ZIP: {
    code: 'VALIDATION_INVALID_ZIP',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.ERROR,
    message: 'Invalid ZIP code format',
    userMessage: 'Please enter a valid ZIP code',
    recoveryStrategy: RecoveryStrategy.RETRY,
    suggestions: ['Use 5-digit format (e.g., 90210) or ZIP+4 (e.g., 90210-1234)'],
    retryable: true
  },

  // Payment Errors
  PAYMENT_DECLINED: {
    code: 'PAYMENT_DECLINED',
    category: ErrorCategory.PAYMENT,
    severity: ErrorSeverity.ERROR,
    message: 'Payment was declined',
    userMessage: 'Your payment was declined',
    recoveryStrategy: RecoveryStrategy.UPDATE_PAYMENT,
    suggestions: [
      'Check that your card has sufficient funds',
      'Try using a different payment method',
      'Contact your bank if the issue persists'
    ],
    retryable: true
  },

  PAYMENT_INSUFFICIENT_FUNDS: {
    code: 'PAYMENT_INSUFFICIENT_FUNDS',
    category: ErrorCategory.PAYMENT,
    severity: ErrorSeverity.ERROR,
    message: 'Insufficient funds',
    userMessage: 'Your card has insufficient funds',
    recoveryStrategy: RecoveryStrategy.UPDATE_PAYMENT,
    suggestions: [
      'Check your account balance',
      'Use a different payment method',
      'Add funds to your account'
    ],
    retryable: true
  },

  PAYMENT_EXPIRED_CARD: {
    code: 'PAYMENT_EXPIRED_CARD',
    category: ErrorCategory.PAYMENT,
    severity: ErrorSeverity.ERROR,
    message: 'Card has expired',
    userMessage: 'Your card has expired',
    recoveryStrategy: RecoveryStrategy.UPDATE_PAYMENT,
    suggestions: [
      'Check your card expiration date',
      'Use a different card that hasn\'t expired'
    ],
    retryable: true
  },

  PAYMENT_INVALID_CARD: {
    code: 'PAYMENT_INVALID_CARD',
    category: ErrorCategory.PAYMENT,
    severity: ErrorSeverity.ERROR,
    message: 'Invalid card information',
    userMessage: 'There\'s an issue with your card information',
    recoveryStrategy: RecoveryStrategy.UPDATE_PAYMENT,
    suggestions: [
      'Check your card number is correct',
      'Verify the expiration date and CVV',
      'Try using a different card'
    ],
    retryable: true
  },

  PAYMENT_PROCESSING_ERROR: {
    code: 'PAYMENT_PROCESSING_ERROR',
    category: ErrorCategory.PAYMENT,
    severity: ErrorSeverity.ERROR,
    message: 'Payment processing failed',
    userMessage: 'We encountered an issue processing your payment',
    recoveryStrategy: RecoveryStrategy.RETRY,
    suggestions: [
      'Please try again in a moment',
      'If the issue persists, try a different payment method'
    ],
    retryable: true
  },

  // Session Errors
  SESSION_EXPIRED: {
    code: 'SESSION_EXPIRED',
    category: ErrorCategory.SESSION,
    severity: ErrorSeverity.WARNING,
    message: 'Session has expired',
    userMessage: 'Your session has expired',
    recoveryStrategy: RecoveryStrategy.REFRESH,
    suggestions: ['Please refresh the page and start over'],
    retryable: false
  },

  SESSION_INVALID: {
    code: 'SESSION_INVALID',
    category: ErrorCategory.SESSION,
    severity: ErrorSeverity.ERROR,
    message: 'Invalid session',
    userMessage: 'Your session is invalid',
    recoveryStrategy: RecoveryStrategy.REFRESH,
    suggestions: ['Please refresh the page and try again'],
    retryable: false
  },

  SESSION_NOT_FOUND: {
    code: 'SESSION_NOT_FOUND',
    category: ErrorCategory.SESSION,
    severity: ErrorSeverity.ERROR,
    message: 'Session not found',
    userMessage: 'We couldn\'t find your session',
    recoveryStrategy: RecoveryStrategy.REFRESH,
    suggestions: ['Please start a new checkout process'],
    retryable: false
  },

  // Network Errors
  NETWORK_TIMEOUT: {
    code: 'NETWORK_TIMEOUT',
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.ERROR,
    message: 'Request timed out',
    userMessage: 'The request took too long to complete',
    recoveryStrategy: RecoveryStrategy.RETRY,
    suggestions: [
      'Check your internet connection',
      'Try again in a moment'
    ],
    retryable: true
  },

  NETWORK_CONNECTION_ERROR: {
    code: 'NETWORK_CONNECTION_ERROR',
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.ERROR,
    message: 'Network connection error',
    userMessage: 'Unable to connect to our servers',
    recoveryStrategy: RecoveryStrategy.RETRY,
    suggestions: [
      'Check your internet connection',
      'Try refreshing the page'
    ],
    retryable: true
  },

  // System Errors
  SYSTEM_DATABASE_ERROR: {
    code: 'SYSTEM_DATABASE_ERROR',
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.CRITICAL,
    message: 'Database operation failed',
    userMessage: 'We\'re experiencing technical difficulties',
    recoveryStrategy: RecoveryStrategy.CONTACT_SUPPORT,
    suggestions: [
      'Please try again later',
      'Contact support if the issue persists'
    ],
    retryable: false
  },

  SYSTEM_SERVICE_UNAVAILABLE: {
    code: 'SYSTEM_SERVICE_UNAVAILABLE',
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.CRITICAL,
    message: 'Service temporarily unavailable',
    userMessage: 'Our service is temporarily unavailable',
    recoveryStrategy: RecoveryStrategy.RETRY,
    suggestions: [
      'Please try again in a few minutes',
      'Contact support if the issue persists'
    ],
    retryable: true
  }
} as const;

// =============================================================================
// ERROR HANDLING SERVICE CLASS
// =============================================================================

export class ErrorHandlingService {
  private static instance: ErrorHandlingService;
  private errorCount: Map<string, number> = new Map();
  private loggers: Array<(error: StandardizedError) => void> = [];

  private constructor() {}

  public static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  /**
   * Creates a standardized error from various input types
   */
  public createError(
    input: string | Error | z.ZodError | any,
    context: Record<string, any> = {}
  ): StandardizedError {
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();

    // Handle Zod validation errors
    if (input instanceof z.ZodError) {
      const firstError = input.errors[0];
      const field = firstError.path.join('.');
      
      return {
        id: errorId,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.ERROR,
        code: 'VALIDATION_ERROR',
        message: `Validation failed: ${firstError.message}`,
        userMessage: this.getUserFriendlyValidationMessage(field, firstError.message),
        context: { ...context, zodErrors: input.errors },
        timestamp,
        recoveryStrategy: RecoveryStrategy.RETRY,
        suggestions: this.getValidationSuggestions(field),
        retryable: true,
        field
      };
    }

    // Handle JavaScript Error objects
    if (input instanceof Error) {
      const errorDefinition = this.matchErrorToDefinition(input.message);
      
      return {
        id: errorId,
        category: errorDefinition?.category || ErrorCategory.SYSTEM,
        severity: errorDefinition?.severity || ErrorSeverity.ERROR,
        code: errorDefinition?.code || 'UNKNOWN_ERROR',
        message: input.message,
        userMessage: errorDefinition?.userMessage || 'An unexpected error occurred',
        context: { ...context, stack: input.stack },
        timestamp,
        recoveryStrategy: errorDefinition?.recoveryStrategy || RecoveryStrategy.CONTACT_SUPPORT,
        suggestions: [...(errorDefinition?.suggestions || ['Please try again or contact support'])],
        retryable: errorDefinition?.retryable ?? false
      };
    }

    // Handle string errors
    if (typeof input === 'string') {
      const errorDefinition = this.matchErrorToDefinition(input);
      
      return {
        id: errorId,
        category: errorDefinition?.category || ErrorCategory.SYSTEM,
        severity: errorDefinition?.severity || ErrorSeverity.ERROR,
        code: errorDefinition?.code || 'STRING_ERROR',
        message: input,
        userMessage: errorDefinition?.userMessage || input,
        context,
        timestamp,
        recoveryStrategy: errorDefinition?.recoveryStrategy || RecoveryStrategy.RETRY,
        suggestions: [...(errorDefinition?.suggestions || ['Please try again'])],
        retryable: errorDefinition?.retryable ?? true
      };
    }

    // Handle objects with error properties
    if (typeof input === 'object' && input !== null) {
      const message = input.error || input.message || 'Unknown error';
      const code = input.code || input.errorCode || 'OBJECT_ERROR';
      
      return {
        id: errorId,
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.ERROR,
        code,
        message,
        userMessage: input.userMessage || message,
        context: { ...context, originalError: input },
        timestamp,
        recoveryStrategy: RecoveryStrategy.RETRY,
        suggestions: ['Please try again'],
        retryable: true
      };
    }

    // Fallback for unknown error types
    return {
      id: errorId,
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.ERROR,
      code: 'UNKNOWN_ERROR',
      message: 'Unknown error occurred',
      userMessage: 'An unexpected error occurred',
      context: { ...context, originalInput: input },
      timestamp,
      recoveryStrategy: RecoveryStrategy.CONTACT_SUPPORT,
      suggestions: ['Please try again or contact support'],
      retryable: false
    };
  }

  /**
   * Creates a standardized API error response
   */
  public createErrorResponse(
    error: StandardizedError | string | Error,
    metadata?: {
      sessionId?: string;
      transactionId?: string;
      requestId?: string;
    },
    fieldErrors?: Record<string, string>
  ): ErrorResponse {
    const standardizedError = typeof error === 'string' || error instanceof Error
      ? this.createError(error)
      : error;

    this.logError(standardizedError);

    return {
      success: false,
      error: {
        id: standardizedError.id,
        code: standardizedError.code,
        message: standardizedError.message,
        userMessage: standardizedError.userMessage,
        category: standardizedError.category,
        severity: standardizedError.severity,
        recoveryStrategy: standardizedError.recoveryStrategy,
        suggestions: standardizedError.suggestions,
        retryable: standardizedError.retryable,
        timestamp: standardizedError.timestamp,
        context: standardizedError.context
      },
      errors: fieldErrors,
      metadata
    };
  }

  /**
   * Creates a standardized success response
   */
  public createSuccessResponse<T>(
    data: T,
    message?: string,
    metadata?: {
      sessionId?: string;
      transactionId?: string;
      requestId?: string;
    }
  ): SuccessResponse<T> {
    return {
      success: true,
      data,
      message,
      metadata
    };
  }

  /**
   * Determines if an error is retryable based on category and code
   */
  public isRetryableError(error: StandardizedError): boolean {
    if (!error.retryable) return false;

    // Check retry count to prevent infinite retries
    const retryCount = this.errorCount.get(error.code) || 0;
    return retryCount < 3;
  }

  /**
   * Increments error count for retry tracking
   */
  public incrementErrorCount(errorCode: string): void {
    const currentCount = this.errorCount.get(errorCode) || 0;
    this.errorCount.set(errorCode, currentCount + 1);
  }

  /**
   * Resets error count for a specific error code
   */
  public resetErrorCount(errorCode: string): void {
    this.errorCount.delete(errorCode);
  }

  /**
   * Adds a custom logger for error handling
   */
  public addLogger(logger: (error: StandardizedError) => void): void {
    this.loggers.push(logger);
  }

  /**
   * Logs error using all registered loggers
   */
  public logError(error: StandardizedError): void {
    // Default console logging
    const logLevel = this.getLogLevel(error.severity);
    console[logLevel](`[${error.category.toUpperCase()}] ${error.code}: ${error.message}`, {
      id: error.id,
      context: error.context,
      timestamp: error.timestamp
    });

    // Custom loggers
    this.loggers.forEach(logger => {
      try {
        logger(error);
      } catch (err) {
        console.error('Error in custom logger:', err);
      }
    });
  }

  /**
   * Maps payment processor errors to standardized errors
   */
  public mapPaymentError(
    nmiResponse: any,
    context: Record<string, any> = {}
  ): StandardizedError {
    const responseText = nmiResponse.responsetext?.toLowerCase() || '';
    const responseCode = nmiResponse.response_code || nmiResponse.response;

    // Map specific NMI response codes and messages
    if (responseText.includes('declined') || responseCode === '2') {
      return this.createError(ERROR_DEFINITIONS.PAYMENT_DECLINED.message, {
        ...context,
        nmiResponse,
        code: ERROR_DEFINITIONS.PAYMENT_DECLINED.code
      });
    }

    if (responseText.includes('insufficient') || responseText.includes('nsf')) {
      return this.createError(ERROR_DEFINITIONS.PAYMENT_INSUFFICIENT_FUNDS.message, {
        ...context,
        nmiResponse,
        code: ERROR_DEFINITIONS.PAYMENT_INSUFFICIENT_FUNDS.code
      });
    }

    if (responseText.includes('expired') || responseText.includes('exp')) {
      return this.createError(ERROR_DEFINITIONS.PAYMENT_EXPIRED_CARD.message, {
        ...context,
        nmiResponse,
        code: ERROR_DEFINITIONS.PAYMENT_EXPIRED_CARD.code
      });
    }

    if (responseText.includes('invalid') || responseText.includes('format')) {
      return this.createError(ERROR_DEFINITIONS.PAYMENT_INVALID_CARD.message, {
        ...context,
        nmiResponse,
        code: ERROR_DEFINITIONS.PAYMENT_INVALID_CARD.code
      });
    }

    // Generic payment error
    return this.createError(ERROR_DEFINITIONS.PAYMENT_PROCESSING_ERROR.message, {
      ...context,
      nmiResponse,
      code: ERROR_DEFINITIONS.PAYMENT_PROCESSING_ERROR.code
    });
  }

  /**
   * Creates field validation errors from Zod errors
   */
  public createFieldValidationErrors(zodError: z.ZodError): Record<string, string> {
    const fieldErrors: Record<string, string> = {};

    zodError.errors.forEach(error => {
      const field = error.path.join('.');
      fieldErrors[field] = this.getUserFriendlyValidationMessage(field, error.message);
    });

    return fieldErrors;
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getLogLevel(severity: ErrorSeverity): 'log' | 'warn' | 'error' {
    switch (severity) {
      case ErrorSeverity.INFO:
        return 'log';
      case ErrorSeverity.WARNING:
        return 'warn';
      case ErrorSeverity.ERROR:
      case ErrorSeverity.CRITICAL:
        return 'error';
      default:
        return 'error';
    }
  }

  private matchErrorToDefinition(errorMessage: string) {
    const lowerMessage = errorMessage.toLowerCase();
    
    // Payment errors
    if (lowerMessage.includes('declined')) {
      return ERROR_DEFINITIONS.PAYMENT_DECLINED;
    }
    if (lowerMessage.includes('insufficient')) {
      return ERROR_DEFINITIONS.PAYMENT_INSUFFICIENT_FUNDS;
    }
    if (lowerMessage.includes('expired')) {
      return ERROR_DEFINITIONS.PAYMENT_EXPIRED_CARD;
    }
    if (lowerMessage.includes('invalid card') || lowerMessage.includes('card number')) {
      return ERROR_DEFINITIONS.PAYMENT_INVALID_CARD;
    }
    
    // Session errors
    if (lowerMessage.includes('session') && lowerMessage.includes('expired')) {
      return ERROR_DEFINITIONS.SESSION_EXPIRED;
    }
    if (lowerMessage.includes('session') && lowerMessage.includes('invalid')) {
      return ERROR_DEFINITIONS.SESSION_INVALID;
    }
    if (lowerMessage.includes('session not found')) {
      return ERROR_DEFINITIONS.SESSION_NOT_FOUND;
    }
    
    // Network errors
    if (lowerMessage.includes('timeout')) {
      return ERROR_DEFINITIONS.NETWORK_TIMEOUT;
    }
    if (lowerMessage.includes('connection') || lowerMessage.includes('network')) {
      return ERROR_DEFINITIONS.NETWORK_CONNECTION_ERROR;
    }
    
    // System errors
    if (lowerMessage.includes('database')) {
      return ERROR_DEFINITIONS.SYSTEM_DATABASE_ERROR;
    }
    if (lowerMessage.includes('service unavailable')) {
      return ERROR_DEFINITIONS.SYSTEM_SERVICE_UNAVAILABLE;
    }

    return null;
  }

  private getUserFriendlyValidationMessage(field: string, message: string): string {
    const lowerField = field.toLowerCase();
    
    if (lowerField.includes('email')) {
      return 'Please enter a valid email address';
    }
    if (lowerField.includes('phone')) {
      return 'Please enter a valid phone number';
    }
    if (lowerField.includes('zip') || lowerField.includes('postal')) {
      return 'Please enter a valid ZIP code';
    }
    if (lowerField.includes('firstname') || lowerField.includes('first_name')) {
      return 'First name is required';
    }
    if (lowerField.includes('lastname') || lowerField.includes('last_name')) {
      return 'Last name is required';
    }
    if (lowerField.includes('address')) {
      return 'Address is required';
    }
    if (lowerField.includes('city')) {
      return 'City is required';
    }
    if (lowerField.includes('state')) {
      return 'Please select your state';
    }
    if (lowerField.includes('payment') || lowerField.includes('token')) {
      return 'Payment information is incomplete';
    }

    // Clean up field name for generic message
    const cleanField = field
      .replace(/\./g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .trim();
    
    return `Please check your ${cleanField}`;
  }

  private getValidationSuggestions(field: string): string[] {
    const lowerField = field.toLowerCase();
    
    if (lowerField.includes('email')) {
      return ['Make sure to include @ and a valid domain (e.g., example.com)'];
    }
    if (lowerField.includes('phone')) {
      return ['Include area code (e.g., 555-123-4567)'];
    }
    if (lowerField.includes('zip') || lowerField.includes('postal')) {
      return ['Use 5-digit format (e.g., 90210) or ZIP+4 (e.g., 90210-1234)'];
    }
    if (lowerField.includes('payment') || lowerField.includes('token')) {
      return ['Fill in all credit card fields', 'Try refreshing if card fields aren\'t working'];
    }

    return ['Please verify this information and try again'];
  }
}

// =============================================================================
// SINGLETON INSTANCE AND UTILITIES
// =============================================================================

export const errorHandler = ErrorHandlingService.getInstance();

/**
 * Convenience function to create standardized errors
 */
export function createError(
  input: string | Error | z.ZodError | any,
  context?: Record<string, any>
): StandardizedError {
  return errorHandler.createError(input, context);
}

/**
 * Convenience function to create error responses
 */
export function createErrorResponse(
  error: StandardizedError | string | Error,
  metadata?: {
    sessionId?: string;
    transactionId?: string;
    requestId?: string;
  },
  fieldErrors?: Record<string, string>
): ErrorResponse {
  return errorHandler.createErrorResponse(error, metadata, fieldErrors);
}

/**
 * Convenience function to create success responses
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  metadata?: {
    sessionId?: string;
    transactionId?: string;
    requestId?: string;
  }
): SuccessResponse<T> {
  return errorHandler.createSuccessResponse(data, message, metadata);
}

/**
 * Convenience function to map payment errors
 */
export function mapPaymentError(
  nmiResponse: any,
  context?: Record<string, any>
): StandardizedError {
  return errorHandler.mapPaymentError(nmiResponse, context);
}

// =============================================================================
// TYPE EXPORTS (removed - types are already exported above)
// =============================================================================