import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { databaseSessionManager } from '@/src/lib/database-session-manager';
import { directPaymentProcessor } from '@/src/lib/direct-payment-processor';
import { captureCheckoutEvent } from '@/src/lib/sentry';

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
  try {
    // Parse and validate request body
    const body = await request.json();
    
    let validatedData: CheckoutRequest;
    try {
      validatedData = checkoutRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          fieldErrors[path] = err.message;
        });

        captureCheckoutEvent('Checkout validation failed', 'warning', {
          errors: fieldErrors,
          body,
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
    const totalAmount = validatedData.products.reduce(
      (sum, product) => sum + (product.price * product.quantity),
      0
    );

    // Create funnel session in database
    const session = await databaseSessionManager.createSession({
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
      },
    });

    // Update session status to processing and ensure it's committed
    const updatedSession = await databaseSessionManager.updateSession(session.id, {
      status: 'processing',
      current_step: 'processing',
      payment_token: validatedData.paymentToken,
    });

    if (!updatedSession) {
      throw new Error('Failed to update session status');
    }

    // Verify session exists in database before proceeding
    const verifiedSession = await databaseSessionManager.getSession(session.id);
    if (!verifiedSession) {
      throw new Error('Session not found after creation');
    }

    // Process payment directly (no Inngest)
    console.log('💳 Processing payment directly...');
    const paymentResult = await directPaymentProcessor.processPayment({
      sessionId: verifiedSession.id,
      paymentToken: validatedData.paymentToken,
      amount: totalAmount,
      customerInfo: validatedData.customerInfo,
      products: validatedData.products,
      couponCode: validatedData.couponCode,
    });

    // Log checkout result
    captureCheckoutEvent('Checkout processing completed', paymentResult.success ? 'info' : 'error', {
      sessionId: verifiedSession.id,
      email: validatedData.customerInfo.email,
      amount: totalAmount,
      productCount: validatedData.products.length,
      success: paymentResult.success,
      error: paymentResult.error,
    });

    if (!paymentResult.success) {
      return NextResponse.json({
        success: false,
        sessionId: verifiedSession.id,
        message: paymentResult.error || 'Payment processing failed',
        error: paymentResult.error,
      }, { status: 400 });
    }

    // Return success with next step
    return NextResponse.json({
      success: true,
      sessionId: verifiedSession.id,
      transactionId: paymentResult.transactionId,
      message: 'Payment processed successfully',
      nextStep: paymentResult.nextStep || `/checkout/success`,
    });

  } catch (error) {
    console.error('Checkout processing error:', error);

    captureCheckoutEvent('Checkout processing failed', 'error', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to initiate checkout. Please try again.',
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