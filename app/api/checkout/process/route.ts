import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { databaseSessionManager } from '@/src/lib/database-session-manager';
import { directPaymentProcessor } from '@/src/lib/direct-payment-processor';
import { captureCheckoutEvent } from '@/src/lib/sentry';
import { createSession } from '@/src/lib/cookie-session';
import { calculateTax, getTaxRate } from '@/src/lib/constants/payment';

// Import shared validation schemas and utilities
import {
  checkoutRequestSchema,
  validateSessionData,
  validatePaymentData,
  validateOrderCompleteness,
  createUserFriendlyValidationErrors,
  type CheckoutRequest,
  type ValidationResult
} from '@/src/lib/validation';

// Structured Logging Utilities
interface LogContext {
  sessionId?: string;
  email?: string;
  transactionId?: string;
  step?: string;
  duration?: number;
  amount?: number;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context: LogContext;
  component: string;
}

class CheckoutLogger {
  private component = 'checkout-process';

  private createLogEntry(level: LogEntry['level'], message: string, context: LogContext = {}): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      component: this.component
    };
  }

  info(message: string, context: LogContext = {}) {
    const entry = this.createLogEntry('info', message, context);
    console.log(`ℹ️ [${entry.timestamp}] ${entry.message}`, entry.context);
    return entry;
  }

  warn(message: string, context: LogContext = {}) {
    const entry = this.createLogEntry('warn', message, context);
    console.warn(`⚠️ [${entry.timestamp}] ${entry.message}`, entry.context);
    return entry;
  }

  error(message: string, context: LogContext = {}) {
    const entry = this.createLogEntry('error', message, context);
    console.error(`❌ [${entry.timestamp}] ${entry.message}`, entry.context);
    return entry;
  }

  debug(message: string, context: LogContext = {}) {
    const entry = this.createLogEntry('debug', message, context);
    console.log(`🔍 [${entry.timestamp}] ${entry.message}`, entry.context);
    return entry;
  }

  // Session lifecycle tracking
  sessionCreated(sessionId: string, context: LogContext = {}) {
    return this.info('Session created', { ...context, sessionId, lifecycle: 'created' });
  }

  sessionUpdated(sessionId: string, status: string, context: LogContext = {}) {
    return this.info('Session updated', { ...context, sessionId, status, lifecycle: 'updated' });
  }

  paymentStarted(sessionId: string, amount: number, context: LogContext = {}) {
    return this.info('Payment processing started', { ...context, sessionId, amount, lifecycle: 'payment-started' });
  }

  paymentCompleted(sessionId: string, transactionId: string, amount: number, success: boolean, context: LogContext = {}) {
    const level = success ? 'info' : 'error';
    const message = success ? 'Payment completed successfully' : 'Payment failed';
    return this[level](message, {
      ...context,
      sessionId,
      transactionId,
      amount,
      success,
      lifecycle: 'payment-completed'
    });
  }

  // Performance tracking
  performanceLog(operation: string, duration: number, context: LogContext = {}) {
    return this.info(`Performance: ${operation}`, { ...context, duration, performance: true });
  }
}

const logger = new CheckoutLogger();

// Note: Validation schemas and utilities are now imported from @/src/lib/validation

interface CheckoutResponse {
  success: boolean;
  sessionId?: string;
  message: string;
  nextStep?: string;
  errors?: Record<string, string>;
}

export async function POST(request: NextRequest): Promise<NextResponse<CheckoutResponse>> {
  const startTime = Date.now();

  // Initialize structured logging
  logger.info('Checkout API started', {
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
  });

  try {
    // Parse and validate request body
    console.log('📥 Step 1: Parsing request body...');
    const body = await request.json();

    // Enhanced debug logging with payload analysis
    console.log('📋 RECEIVED PAYLOAD ANALYSIS:');
    console.log('  ✅ customerInfo:', body.customerInfo ? 'Present' : '❌ Missing');
    console.log('  ✅ paymentToken:', body.paymentToken ? `Present (${body.paymentToken.substring(0, 10)}...)` : '❌ Missing');
    console.log('  ✅ products:', body.products ? `${body.products.length} items` : '❌ Missing');
    console.log('  ✅ billingInfo:', body.billingInfo ? 'Present (separate billing)' : 'Not provided (using shipping)');
    console.log('  ✅ couponCode:', body.couponCode || 'None');

    // Full payload for debugging (can be disabled in production)
    if (process.env.NODE_ENV !== 'production') {
      console.log('📄 FULL PAYLOAD:', JSON.stringify(body, null, 2));
    }

    console.log('📥 Step 2: Validating payload schema...');
    let validatedData: CheckoutRequest;
    try {
      validatedData = checkoutRequestSchema.parse(body);
      console.log('✅ Payload validation successful');
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Use shared validation error handling
        const userFriendlyErrors = createUserFriendlyValidationErrors(error);
        const fieldErrors: Record<string, string> = {};
        
        userFriendlyErrors.forEach((err) => {
          fieldErrors[err.field] = err.userFriendlyMessage;
        });

        // Enhanced validation error logging
        console.error('❌ VALIDATION FAILED:');
        console.error('📋 User-Friendly Errors:', userFriendlyErrors.map(e => ({ field: e.field, message: e.userFriendlyMessage })));
        console.error('📄 Problem Fields:');
        Object.entries(fieldErrors).forEach(([field, message]) => {
          console.error(`  • ${field}: ${message}`);
        });

        // Show what was actually received for failed fields
        console.error('📊 Received Values for Failed Fields:');
        Object.keys(fieldErrors).forEach(field => {
          const value = field.split('.').reduce((obj, key) => obj?.[key], body);
          console.error(`  • ${field}: ${JSON.stringify(value)}`);
        });

        captureCheckoutEvent('Checkout validation failed', 'warning', {
          errors: fieldErrors,
          validationErrors: userFriendlyErrors,
          receivedFields: Object.keys(body),
          duration: Date.now() - startTime,
        });

        return NextResponse.json(
          {
            success: false,
            message: 'Invalid request data',
            errors: fieldErrors,
          },
          { status: 400 }
        );
      }

      throw error;
    }

    // Calculate total amount including tax
    console.log('📥 Step 3: Calculating order total...');
    const subtotal = validatedData.products.reduce(
      (sum, product) => sum + (product.price * product.quantity),
      0
    );

    // Tax calculation based on customer location
    const customerState = validatedData.customerInfo.state || 'CA';
    const taxRate = getTaxRate(customerState);
    const tax = calculateTax(subtotal, customerState);
    const shipping = 0.00; // Free shipping
    const totalAmount = subtotal + tax + shipping;

    console.log('💰 ORDER SUMMARY:');
    validatedData.products.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} - $${product.price} x ${product.quantity} = $${product.price * product.quantity}`);
    });
    console.log(`  📊 Subtotal: $${subtotal.toFixed(2)}`);
    console.log(`  🏛️ Tax: $${tax.toFixed(2)} (${(taxRate * 100).toFixed(2)}% for ${customerState?.toUpperCase()})`);
    console.log(`  🚚 Shipping: $${shipping.toFixed(2)}`);
    console.log(`  📊 Total Amount: $${totalAmount.toFixed(2)}`);

    // Create funnel session in database
    console.log('📥 Step 4: Creating database session...');
    const sessionData = {
      email: validatedData.customerInfo.email,
      products: validatedData.products,
      customerInfo: {
        firstName: validatedData.customerInfo.firstName,
        lastName: validatedData.customerInfo.lastName,
        phone: validatedData.customerInfo.phone,
        address: validatedData.customerInfo.address,
        city: validatedData.customerInfo.city,
        state: validatedData.customerInfo.state,
        zipCode: validatedData.customerInfo.zipCode,
        country: validatedData.customerInfo.country,
      },
      couponCode: validatedData.couponCode,
      metadata: {
        ...validatedData.metadata,
        billingInfo: validatedData.billingInfo, // Store billing info in metadata
        subtotal,
        tax,
        taxRate,
        shipping,
        totalAmount,
        taxState: customerState,
        createdAt: new Date().toISOString(),
      },
    };

    console.log('📋 SESSION DATA PREPARED:');
    console.log(`  📧 Email: ${sessionData.email}`);
    console.log(`  👤 Customer: ${sessionData.customerInfo.firstName} ${sessionData.customerInfo.lastName}`);
    console.log(`  📍 Address: ${sessionData.customerInfo.address}, ${sessionData.customerInfo.city}, ${sessionData.customerInfo.state}`);
    console.log(`  🛒 Products: ${sessionData.products.length} items`);

    const session = await databaseSessionManager.createSession(sessionData);

    // Log session creation with structured logging
    logger.sessionCreated(session.id, {
      email: sessionData.email,
      customerName: `${sessionData.customerInfo.firstName} ${sessionData.customerInfo.lastName}`,
      productCount: sessionData.products.length,
      totalAmount,
      step: 'session-created'
    });

    // Validate session data integrity
    logger.debug('Validating session data integrity', { sessionId: session.id });
    const sessionValidation = validateSessionData(session, ['id', 'email', 'customer_info']);
    if (!sessionValidation.isValid) {
      logger.error('Session validation failed', {
        sessionId: session.id,
        errors: sessionValidation.errors,
        warnings: sessionValidation.warnings
      });

      captureCheckoutEvent('Session validation failed', 'error', {
        sessionId: session.id,
        errors: sessionValidation.errors,
        warnings: sessionValidation.warnings
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Session creation validation failed',
          errors: sessionValidation.errors
        },
        { status: 500 }
      );
    }

    if (sessionValidation.warnings.length > 0) {
      logger.warn('Session validation warnings', {
        sessionId: session.id,
        warnings: sessionValidation.warnings
      });
    }

    // Update session status to processing and ensure it's committed
    console.log('📥 Step 5: Updating session status to processing...');
    const updatedSession = await databaseSessionManager.updateSession(session.id, {
      status: 'processing',
      current_step: 'processing',
      payment_token: validatedData.paymentToken,
    });

    if (!updatedSession) {
      console.error('❌ Failed to update session status');
      throw new Error('Failed to update session status');
    }
    console.log('✅ Session status updated to processing');

    // Verify session exists in database before proceeding
    console.log('📥 Step 6: Verifying session in database...');
    const verifiedSession = await databaseSessionManager.getSession(session.id);
    if (!verifiedSession) {
      console.error('❌ Session not found after creation');
      throw new Error('Session not found after creation');
    }
    console.log('✅ Session verified in database');

    // Process payment directly (no Inngest)
    console.log('📥 Step 7: Preparing payment processing...');

    // Prepare billing info - use billing if provided, otherwise use shipping
    const billingInfo = validatedData.billingInfo || {
      address: validatedData.customerInfo.address,
      city: validatedData.customerInfo.city,
      state: validatedData.customerInfo.state,
      zipCode: validatedData.customerInfo.zipCode,
      country: validatedData.customerInfo.country,
    };

    console.log('📋 BILLING INFO ANALYSIS:');
    console.log(`  🏠 Address: ${billingInfo.address}`);
    console.log(`  🏙️ City: ${billingInfo.city}`);
    console.log(`  🗺️ State: ${billingInfo.state}`);
    console.log(`  📮 ZIP: ${billingInfo.zipCode}`);
    console.log(`  🌍 Country: ${billingInfo.country}`);
    console.log(`  📋 Source: ${validatedData.billingInfo ? 'Separate billing address' : 'Using shipping address'}`);

    console.log('💳 Step 8: Starting direct payment processing...');

    const paymentData = {
      sessionId: verifiedSession.id,
      paymentToken: validatedData.paymentToken,
      amount: totalAmount,
      customerInfo: validatedData.customerInfo,
      products: validatedData.products,
      couponCode: validatedData.couponCode,
      billingInfo: billingInfo,
    };

    // Log payment processing start with structured logging
    logger.paymentStarted(verifiedSession.id, totalAmount, {
      paymentTokenPrefix: paymentData.paymentToken.substring(0, 15),
      customerName: `${paymentData.customerInfo.firstName} ${paymentData.customerInfo.lastName}`,
      productCount: paymentData.products.length,
      couponCode: paymentData.couponCode || 'None',
      step: 'payment-processing'
    });

    const paymentResult = await directPaymentProcessor.processPayment(paymentData);

    const processingTime = Date.now() - startTime;

    // Log performance
    logger.performanceLog('Total checkout processing', processingTime, {
      sessionId: verifiedSession.id,
      amount: totalAmount
    });

    // Validate payment result
    logger.debug('Validating payment result', { sessionId: verifiedSession.id });
    const paymentValidation = validatePaymentData(paymentResult);
    if (!paymentValidation.isValid) {
      logger.error('Payment validation failed', {
        sessionId: verifiedSession.id,
        errors: paymentValidation.errors,
        warnings: paymentValidation.warnings,
        paymentResult
      });

      captureCheckoutEvent('Payment validation failed', 'error', {
        sessionId: verifiedSession.id,
        errors: paymentValidation.errors,
        warnings: paymentValidation.warnings,
        paymentResult
      });
    }

    if (paymentValidation.warnings.length > 0) {
      console.warn('⚠️ Payment validation warnings:', paymentValidation.warnings);
    }

    // Enhanced result logging
    console.log('📊 PAYMENT RESULT ANALYSIS:');
    console.log(`  ✅ Success: ${paymentResult.success}`);
    console.log(`  🆔 Session ID: ${paymentResult.sessionId}`);
    console.log(`  💳 Transaction ID: ${paymentResult.transaction_id || 'None'}`);
    console.log(`  🏦 Vault ID: ${paymentResult.vaultId || 'None'}`);
    console.log(`  ❌ Error: ${paymentResult.error || 'None'}`);
    console.log(`  ➡️ Next Step: ${paymentResult.nextStep || 'Default'}`);
    console.log(`  🔍 Validation: ${paymentValidation.isValid ? 'PASSED' : 'FAILED'}`);

    // Log checkout result with enhanced data
    captureCheckoutEvent('Checkout processing completed', paymentResult.success ? 'info' : 'error', {
      sessionId: verifiedSession.id,
      email: validatedData.customerInfo.email,
      amount: totalAmount,
      productCount: validatedData.products.length,
      success: paymentResult.success,
      error: paymentResult.error,
      processingTime,
      hasVaultId: !!paymentResult.vaultId,
      hasBillingInfo: !!validatedData.billingInfo,
    });

    if (!paymentResult.success) {
      console.error('❌ PAYMENT FAILED:');
      console.error(`  📋 Error Message: ${paymentResult.error}`);
      console.error(`  🆔 Session ID: ${verifiedSession.id}`);
      console.error(`  ⏱️ Failed after: ${processingTime}ms`);

      return NextResponse.json({
        success: false,
        sessionId: verifiedSession.id,
        message: paymentResult.error || 'Payment processing failed',
        error: paymentResult.error,
      }, { status: 400 });
    }

    // Update database session with payment success details
    console.log('📥 Updating database session with payment success...');
    try {
      const sessionUpdateData = {
        status: 'completed' as const,
        current_step: 'upsell-1',
        transaction_id: paymentResult.transaction_id,
        vault_id: paymentResult.vaultId,
        metadata: {
          ...verifiedSession.metadata,
          paymentCompleted: true,
          paymentCompletedAt: new Date().toISOString(),
          subtotal,
          tax,
          taxRate,
          shipping,
          totalAmount,
          taxState: customerState,
          products: validatedData.products, // Ensure products are stored in metadata
          billingInfo: billingInfo,
        }
      };

      const completedSession = await databaseSessionManager.updateSession(verifiedSession.id, sessionUpdateData);
      console.log('✅ Database session updated with payment success');
      console.log(`  📊 Status: ${completedSession?.status}`);
      console.log(`  💳 Transaction ID: ${completedSession?.transaction_id}`);
      console.log(`  🏦 Vault ID: ${completedSession?.vault_id}`);
    } catch (error) {
      console.error('⚠️ Failed to update database session:', error);
      // Don't fail the entire request for this
    }

    // Create upsell session cookie for authenticated upsell flow
    if (paymentResult.vaultId) {
      console.log('🍪 Creating upsell session cookie...');
      try {
        await createSession({
          id: verifiedSession.id,
          vaultId: paymentResult.vaultId,
          customerId: validatedData.customerInfo.email,
          email: validatedData.customerInfo.email,
          firstName: validatedData.customerInfo.firstName,
          lastName: validatedData.customerInfo.lastName,
          transactionId: paymentResult.transaction_id,
          state: validatedData.customerInfo.state || 'CA'
        });
        console.log('✅ Upsell session cookie created successfully');
      } catch (error) {
        console.error('⚠️ Failed to create upsell session cookie:', error);
        // Don't fail the entire request for this
      }
    }

    // Initialize order cache with main order data for thank you page (with retry logic)
    const initializeOrderCache = async (retryCount = 0): Promise<boolean> => {
      const maxRetries = 3;
      const retryDelay = 1000; // 1 second

      try {
        console.log(`🎯 Initializing order cache (attempt ${retryCount + 1}/${maxRetries + 1})...`);
        const baseUrl = new URL(request.url).origin;

        const orderCachePayload = {
          action: 'add_order',
          sessionId: verifiedSession.id,
          transactionId: paymentResult.transaction_id,
          amount: totalAmount,
          productCode: validatedData.products[0]?.id || 'FITSPRESSO_6',
          customer: {
            firstName: validatedData.customerInfo.firstName,
            lastName: validatedData.customerInfo.lastName,
            email: validatedData.customerInfo.email,
            phone: validatedData.customerInfo.phone,
            address: validatedData.customerInfo.address,
            city: validatedData.customerInfo.city,
            state: validatedData.customerInfo.state,
            zipCode: validatedData.customerInfo.zipCode
          }
        };

        console.log('📦 Order cache payload:', JSON.stringify(orderCachePayload, null, 2));

        const orderCacheResponse = await fetch(`${baseUrl}/api/order/details`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderCachePayload)
        });

        if (!orderCacheResponse.ok) {
          throw new Error(`HTTP ${orderCacheResponse.status}: ${orderCacheResponse.statusText}`);
        }

        const orderCacheResult = await orderCacheResponse.json();

        if (orderCacheResult.success) {
          console.log('✅ Order cache initialized successfully');
          return true;
        } else {
          throw new Error(orderCacheResult.error || 'Unknown order cache error');
        }

      } catch (error) {
        console.error(`❌ Order cache initialization failed (attempt ${retryCount + 1}):`, error);

        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying order cache initialization in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return initializeOrderCache(retryCount + 1);
        } else {
          console.error('💥 Order cache initialization failed after all retries');
          return false;
        }
      }
    };

    const orderCacheSuccess = await initializeOrderCache();
    if (!orderCacheSuccess) {
      console.warn('⚠️ Order cache initialization failed - thank you page may have incomplete data');
      // Log this for monitoring but don't fail the transaction
      captureCheckoutEvent('Order cache initialization failed', 'warning', {
        sessionId: verifiedSession.id,
        transactionId: paymentResult.transaction_id,
        email: validatedData.customerInfo.email
      });
    }

    // Success response
    console.log('🎉 PAYMENT SUCCESS:');
    console.log(`  💳 Transaction ID: ${paymentResult.transaction_id}`);
    console.log(`  🏦 Vault ID: ${paymentResult.vaultId}`);
    console.log(`  ➡️ Next Step: ${paymentResult.nextStep || '/checkout/success'}`);
    console.log(`  ⏱️ Completed in: ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      sessionId: verifiedSession.id,
      transactionId: paymentResult.transaction_id,
      vaultId: paymentResult.vaultId,
      message: 'Payment processed successfully',
      nextStep: paymentResult.nextStep || `/checkout/success`,
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('💥 CHECKOUT PROCESSING ERROR:');
    console.error(`  ❌ Error Type: ${error instanceof Error ? error.constructor.name : 'Unknown'}`);
    console.error(`  📋 Error Message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(`  ⏱️ Failed after: ${processingTime}ms`);
    console.error(`  📍 Stack Trace:`, error instanceof Error ? error.stack : 'No stack trace');

    // Enhanced error capture
    captureCheckoutEvent('Checkout processing failed', 'error', {
      error: (error as Error).message,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      stack: (error as Error).stack,
      processingTime,
      timestamp: new Date().toISOString(),
    });

    // Return user-friendly error message
    const userMessage = error instanceof Error && error.message.includes('validation')
      ? 'Please check your information and try again.'
      : 'Failed to process checkout. Please try again.';

    return NextResponse.json(
      {
        success: false,
        message: userMessage,
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      },
      { status: 500 }
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Add rate limiting headers to the response
function addRateLimitHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-RateLimit-Limit', '10');
  response.headers.set('X-RateLimit-Remaining', '9');
  response.headers.set('X-RateLimit-Reset', (Date.now() + 60000).toString());
  return response;
}