import { NextRequest, NextResponse } from 'next/server';
import { legacyDatabaseSessionManager as databaseSessionManager } from '@/src/lib/unified-session-manager';
import { captureCheckoutEvent } from '@/src/lib/sentry';

interface StatusResponse {
  success: boolean;
  status: 'processing' | 'completed' | 'failed' | 'not_found';
  sessionId: string;
  transactionId?: string;
  vaultId?: string;
  currentStep?: string;
  nextStep?: string;
  error?: string;
  estimatedWaitTime?: number; // in seconds
  metadata?: {
    processingStartedAt?: string;
    lastUpdatedAt?: string;
    retryCount?: number;
  };
}

interface RouteParams {
  params: {
    sessionId: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<StatusResponse>> {
  try {
    const { sessionId } = params;

    // Validate session ID format
    if (!sessionId || !sessionId.startsWith('ws_')) {
      return NextResponse.json(
        {
          success: false,
          status: 'not_found',
          sessionId,
          error: 'Invalid session ID format',
        },
        { status: 400 }
      );
    }

    // Get session from database
    const session = await databaseSessionManager.getSession(sessionId);

    if (!session) {
      captureCheckoutEvent('Session not found for status check', 'warning', {
        sessionId,
      });

      return NextResponse.json(
        {
          success: false,
          status: 'not_found',
          sessionId,
          error: 'Session not found or expired',
        },
        { status: 404 }
      );
    }

    // Calculate processing time for estimated wait
    const processingTime = Date.now() - new Date(session.updated_at).getTime();
    const estimatedWaitTime = Math.max(0, 30 - Math.floor(processingTime / 1000)); // 30 seconds max wait

    // Determine next step based on current status and step
    let nextStep: string | undefined;

    if (session.status === 'completed') {
      if (session.current_step === 'checkout' || session.current_step === 'processing') {
        nextStep = '/checkout/upsell';
      } else if (session.current_step === 'upsell-1') {
        nextStep = '/checkout/upsell-2';
      } else if (session.current_step === 'upsell-2') {
        nextStep = '/checkout/success';
      } else {
        nextStep = '/checkout/success';
      }
    } else if (session.status === 'failed') {
      nextStep = '/checkout?retry=true';
    }

    const response: StatusResponse = {
      success: true,
      status: session.status as StatusResponse['status'],
      sessionId: session.id,
      transactionId: session.transaction_id,
      vaultId: session.vault_id,
      currentStep: session.current_step,
      nextStep,
      estimatedWaitTime: session.status === 'processing' ? estimatedWaitTime : undefined,
      metadata: {
        processingStartedAt: session.created_at,
        lastUpdatedAt: session.updated_at,
      },
    };

    // Add error message if status is failed
    if (session.status === 'failed') {
      response.error = 'Payment processing failed. Please try again.';
    }

    // Log status check
    if (session.status === 'processing' && processingTime > 60000) { // More than 1 minute
      captureCheckoutEvent('Long processing time detected', 'warning', {
        sessionId,
        processingTimeMs: processingTime,
        currentStep: session.current_step,
      });
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Status check error:', error);

    captureCheckoutEvent('Status check failed', 'error', {
      sessionId: params.sessionId,
      error: (error as Error).message,
    });

    return NextResponse.json(
      {
        success: false,
        status: 'not_found',
        sessionId: params.sessionId,
        error: 'Failed to check status. Please try again.',
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Additional endpoint for detailed session info (for debugging)
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const { sessionId } = params;
    const session = await databaseSessionManager.getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Return full session data for debugging
    return NextResponse.json({
      session,
      stats: { message: 'Database session manager - no stats available' },
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get session details' },
      { status: 500 }
    );
  }
}