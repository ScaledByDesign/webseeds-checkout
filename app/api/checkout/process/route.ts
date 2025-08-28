import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { databaseSessionManager } from '@/src/lib/database-session-manager';
import { directPaymentProcessor } from '@/src/lib/direct-payment-processor';
import { captureCheckoutEvent } from '@/src/lib/sentry';
import { createSession } from '@/src/lib/cookie-session';

// Validation schemas
const customerInfoSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required').max(3),
  zipCode: z.string().min(5, 'Valid zip code is required'),
  country: z.string().default('US'),
});

const productSchema = z.object({
  id: z.string().min(1, 'Product ID is required'),
  name: z.string().min(1, 'Product name is required'),
  price: z.number().positive('Price must be positive'),
  quantity: z.number().int().positive('Quantity must be positive'),
});

const billingInfoSchema = z.object({
  address: z.string().min(1, 'Billing address is required'),
  city: z.string().min(1, 'Billing city is required'),
  state: z.string().min(2, 'Billing state is required').max(3),
  zipCode: z.string().min(5, 'Valid billing zip code is required'),
  country: z.string().default('US'),
});

const checkoutRequestSchema = z.object({
  customerInfo: customerInfoSchema,
  paymentToken: z.string().min(1, 'Payment token is required'),
  products: z.array(productSchema).min(1, 'At least one product is required'),
  billingInfo: billingInfoSchema.optional(),
  couponCode: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

interface CheckoutResponse {
  success: boolean;
  sessionId?: string;
  message: string;
  nextStep?: string;
  errors?: Record<string, string>;
}

export async function POST(request: NextRequest): Promise<NextResponse<CheckoutResponse>> {
  const startTime = Date.now();
  console.log('🚀 CHECKOUT API STARTED', { timestamp: new Date().toISOString() });

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
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          fieldErrors[path] = err.message;
        });

        // Enhanced validation error logging
        console.error('❌ VALIDATION FAILED:');
        console.error('📋 Field Errors:', fieldErrors);
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

    // Calculate total amount
    console.log('📥 Step 3: Calculating order total...');
    const totalAmount = validatedData.products.reduce(
      (sum, product) => sum + (product.price * product.quantity),
      0
    );
    console.log('💰 ORDER SUMMARY:');
    validatedData.products.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} - $${product.price} x ${product.quantity} = $${product.price * product.quantity}`);
    });
    console.log(`  📊 Total Amount: $${totalAmount}`);

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
        totalAmount,
        createdAt: new Date().toISOString(),
      },
    };

    console.log('📋 SESSION DATA PREPARED:');
    console.log(`  📧 Email: ${sessionData.email}`);
    console.log(`  👤 Customer: ${sessionData.customerInfo.firstName} ${sessionData.customerInfo.lastName}`);
    console.log(`  📍 Address: ${sessionData.customerInfo.address}, ${sessionData.customerInfo.city}, ${sessionData.customerInfo.state}`);
    console.log(`  🛒 Products: ${sessionData.products.length} items`);

    const session = await databaseSessionManager.createSession(sessionData);
    console.log(`✅ Session created successfully: ${session.id}`);

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

    console.log('📤 PAYMENT PROCESSOR INPUT:');
    console.log(`  🆔 Session ID: ${paymentData.sessionId}`);
    console.log(`  🎫 Payment Token: ${paymentData.paymentToken.substring(0, 15)}...`);
    console.log(`  💰 Amount: $${paymentData.amount}`);
    console.log(`  👤 Customer: ${paymentData.customerInfo.firstName} ${paymentData.customerInfo.lastName}`);
    console.log(`  🛒 Products: ${paymentData.products.length} items`);
    console.log(`  🎟️ Coupon: ${paymentData.couponCode || 'None'}`);

    const paymentResult = await directPaymentProcessor.processPayment(paymentData);

    const processingTime = Date.now() - startTime;
    console.log(`⏱️ Total processing time: ${processingTime}ms`);

    // Enhanced result logging
    console.log('📊 PAYMENT RESULT ANALYSIS:');
    console.log(`  ✅ Success: ${paymentResult.success}`);
    console.log(`  🆔 Session ID: ${paymentResult.sessionId}`);
    console.log(`  💳 Transaction ID: ${paymentResult.transactionId || 'None'}`);
    console.log(`  🏦 Vault ID: ${paymentResult.vaultId || 'None'}`);
    console.log(`  ❌ Error: ${paymentResult.error || 'None'}`);
    console.log(`  ➡️ Next Step: ${paymentResult.nextStep || 'Default'}`);

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
          transactionId: paymentResult.transactionId,
          state: validatedData.customerInfo.state || 'CA'
        });
        console.log('✅ Upsell session cookie created successfully');
      } catch (error) {
        console.error('⚠️ Failed to create upsell session cookie:', error);
        // Don't fail the entire request for this
      }
    }

    // Success response
    console.log('🎉 PAYMENT SUCCESS:');
    console.log(`  💳 Transaction ID: ${paymentResult.transactionId}`);
    console.log(`  🏦 Vault ID: ${paymentResult.vaultId}`);
    console.log(`  ➡️ Next Step: ${paymentResult.nextStep || '/checkout/success'}`);
    console.log(`  ⏱️ Completed in: ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      sessionId: verifiedSession.id,
      transactionId: paymentResult.transactionId,
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