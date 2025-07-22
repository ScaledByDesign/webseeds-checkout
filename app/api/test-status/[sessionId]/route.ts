import { NextRequest, NextResponse } from 'next/server';

interface StatusResponse {
  status: 'processing' | 'succeeded' | 'failed' | 'expired';
  transactionId?: string;
  error?: string;
  orderDetails?: {
    orderId: string;
    orderNumber: string;
    amount: number;
    customerName: string;
  };
}

// In-memory storage for demo (in real app this would be a database)
const sessions = new Map<string, any>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse<StatusResponse>> {
  try {
    const { sessionId } = await params;
    console.log(`🔍 Checking status for session: ${sessionId}`);
    
    if (!sessionId || !sessionId.startsWith('session_')) {
      return NextResponse.json({
        status: 'failed',
        error: 'Invalid session ID',
      });
    }
    
    // Get or create session state
    let sessionState = sessions.get(sessionId);
    
    if (!sessionState) {
      // Initialize new session as processing
      sessionState = {
        status: 'processing',
        createdAt: Date.now(),
        pollCount: 0,
      };
      sessions.set(sessionId, sessionState);
    }
    
    // Increment poll count
    sessionState.pollCount++;
    
    // Simulate processing time - succeed after 3 polls (about 15 seconds)
    if (sessionState.pollCount >= 3) {
      sessionState.status = 'succeeded';
      sessionState.transactionId = `txn_${sessionId.split('_')[1]}`;
      sessionState.orderDetails = {
        orderId: `order_${sessionState.transactionId}`,
        orderNumber: `#WS${sessionState.transactionId.slice(-6)}`,
        amount: 294, // Fitspresso main product price
        customerName: 'Test Customer',
      };
    }
    
    console.log(`📊 Session ${sessionId} status: ${sessionState.status} (poll #${sessionState.pollCount})`);
    
    const response: StatusResponse = {
      status: sessionState.status,
    };
    
    if (sessionState.transactionId) {
      response.transactionId = sessionState.transactionId;
    }
    
    if (sessionState.orderDetails) {
      response.orderDetails = sessionState.orderDetails;
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Status check error:', error);
    return NextResponse.json({
      status: 'failed',
      error: 'Internal server error',
    });
  }
}