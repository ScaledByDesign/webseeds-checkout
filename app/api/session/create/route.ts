import { NextRequest, NextResponse } from 'next/server';
import { databaseSessionManager } from '@/src/lib/database-session-manager';

interface CreateSessionRequest {
  email: string;
  customerInfo?: {
    firstName: string;
    lastName: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  products: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  couponCode?: string;
  metadata?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSessionRequest = await request.json();

    // Validate required fields
    if (!body.email || !body.products || body.products.length === 0) {
      return NextResponse.json(
        { error: 'Email and products are required' },
        { status: 400 }
      );
    }

    // Create the session in database
    const session = await databaseSessionManager.createSession({
      email: body.email,
      customerInfo: body.customerInfo,
      products: body.products,
      couponCode: body.couponCode,
      metadata: body.metadata,
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      status: session.status,
      amount: session.amount,
      currentStep: session.current_step,
      expiresAt: session.expires_at,
    });

  } catch (error) {
    console.error('Failed to create session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
