import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Simple validation schema for testing
const testCheckoutSchema = z.object({
  customerInfo: z.object({
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string().optional(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string().optional().default('US'),
  }),
  paymentToken: z.string(),
  products: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    quantity: z.number(),
  })),
  billingInfo: z.object({
    address: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string().optional().default('US'),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('✅ Received checkout request:', JSON.stringify(body, null, 2));
    console.log('📋 Request keys:', Object.keys(body));
    if (body.customerInfo) console.log('👤 CustomerInfo keys:', Object.keys(body.customerInfo));
    
    // Validate the request
    const validatedData = testCheckoutSchema.parse(body);
    console.log('✅ Validation passed');
    
    // Generate a mock session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate total
    const total = validatedData.products.reduce((sum, product) => {
      return sum + (product.price * product.quantity);
    }, 0);
    
    console.log(`✅ Generated session ${sessionId} for $${total}`);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Payment processing initiated',
      nextStep: `/checkout/processing?session=${sessionId}`,
      debug: {
        totalAmount: total,
        customerEmail: validatedData.customerInfo.email,
        productCount: validatedData.products.length,
      }
    });
    
  } catch (error) {
    console.error('❌ Test checkout error:', error);
    
    if (error instanceof z.ZodError) {
      console.log('🔍 Validation errors:', error.errors);
      return NextResponse.json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
        details: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    }, { status: 500 });
  }
}