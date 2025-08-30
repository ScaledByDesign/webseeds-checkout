import { NextRequest, NextResponse } from 'next/server';
import { legacyDatabaseSessionManager as databaseSessionManager } from '@/src/lib/unified-session-manager';

interface RouteParams {
  params: Promise<{
    sessionId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const session = await databaseSessionManager.getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        email: session.email,
        status: session.status,
        amount: session.amount,
        currentStep: session.current_step,
        customerInfo: session.customer_info,
        products: session.products,
        vaultId: session.vault_id,
        transactionId: session.transaction_id,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        expiresAt: session.expires_at,
      },
    });

  } catch (error) {
    console.error('Failed to retrieve session:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve session' },
      { status: 500 }
    );
  }
}
