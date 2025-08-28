const { Inngest } = require('inngest');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const PORT = process.env.PORT || 3255;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${PORT}`;

const inngest = new Inngest({
  id: 'webseed-checkout',
  eventKey: 'test'
});

// Simple session creation function that mimics the FunnelSessionManager
function createSessionDirectly(sessionId, sessionData) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 hours

  const session = {
    id: sessionId,
    email: sessionData.email,
    customerInfo: sessionData.customerInfo,
    products: sessionData.products,
    status: 'processing', // Set to processing so payment processor can continue
    amount: sessionData.products.reduce((sum, product) => sum + (product.price * product.quantity), 0),
    currentStep: 'checkout',
    upsellsAccepted: [],
    upsellsDeclined: [],
    createdAt: now,
    updatedAt: now,
    expiresAt,
    metadata: sessionData.metadata,
  };

  return session;
}

async function createSessionAndTest() {
  try {
    // Generate a new session ID for this test
    const timestamp = Date.now().toString(36);
    const sessionId = `ws_manual_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🏗️  Creating session in database: ${sessionId}`);

    const sessionData = {
      email: 'live.customer@example.com',
      customerInfo: {
        firstName: 'Sarah',
        lastName: 'Johnson',
        phone: '555-987-6543',
        address: '456 Live Test Avenue',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        country: 'US'
      },
      products: [
        {
          id: 'fitspresso-6-pack',
          name: 'Fitspresso 6 Bottle Super Pack',
          price: 294,
          quantity: 1
        }
      ],
      metadata: {
        source: 'manual_test',
        timestamp: new Date().toISOString(),
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        ip: '192.168.1.100'
      }
    };

    // Create session via API
    console.log(`📡 Creating session via API at ${APP_URL}...`);
    const createResponse = await fetch(`${APP_URL}/api/session/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionData)
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create session: ${createResponse.status} ${createResponse.statusText}`);
    }

    const createdSession = await createResponse.json();
    console.log('✅ Session created successfully:', {
      sessionId: createdSession.sessionId || sessionId,
      status: createdSession.status,
      amount: createdSession.amount
    });

    // Wait a moment for the session to be stored
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify session exists
    console.log('🔍 Verifying session exists...');
    const verifyResponse = await fetch(`${APP_URL}/api/session/${createdSession.sessionId}`);

    if (verifyResponse.ok) {
      const sessionInfo = await verifyResponse.json();
      console.log('✅ Session verified in database:', {
        id: sessionInfo.session.id,
        status: sessionInfo.session.status,
        currentStep: sessionInfo.session.currentStep
      });
    } else {
      console.log('⚠️  Session verification failed, but continuing...');
    }

    // Now send the payment event with the existing session ID
    console.log(`🚀 Sending payment event for existing session: ${createdSession.sessionId}`);

    const result = await inngest.send({
      name: 'webseed/payment.attempted',
      data: {
        sessionId: createdSession.sessionId,
        amount: 294,
        customerInfo: sessionData.customerInfo,
        paymentToken: `live_token_${Date.now().toString(36)}`,
        products: sessionData.products,
        metadata: sessionData.metadata
      }
    });
    
    console.log('✅ Payment event sent successfully!');
    console.log('📊 Event Details:', {
      eventId: result.ids[0],
      sessionId: createdSession.sessionId,
      amount: '$294',
      customer: 'Sarah Johnson'
    });
    console.log(`🔍 Monitor this payment in Inngest: http://localhost:8288/runs`);
    console.log(`🌐 App running at: ${APP_URL}`);
    
  } catch (error) {
    console.error('❌ Failed to create session and test payment:', error);
  }
}

createSessionAndTest();
