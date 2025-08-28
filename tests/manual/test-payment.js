const { Inngest } = require('inngest');

const inngest = new Inngest({ 
  id: 'webseed-checkout',
  eventKey: 'test'
});

async function testPayment() {
  try {
    // Generate a realistic session ID with timestamp
    const timestamp = Date.now().toString(36);
    const sessionId = `ws_live_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🚀 Sending LIVE payment event with session: ${sessionId}`);

    const result = await inngest.send({
      name: 'webseed/payment.attempted',
      data: {
        sessionId: sessionId,
        amount: 294,
        customerInfo: {
          email: 'live.customer@example.com',
          firstName: 'Sarah',
          lastName: 'Johnson',
          phone: '555-987-6543',
          address: '456 Live Test Avenue',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          country: 'US'
        },
        paymentToken: `live_token_${timestamp}`,
        products: [
          {
            id: 'fitspresso-6-pack',
            name: 'Fitspresso 6 Bottle Super Pack',
            price: 294,
            quantity: 1
          }
        ],
        metadata: {
          source: 'live_test',
          timestamp: new Date().toISOString(),
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          ip: '192.168.1.100'
        }
      }
    });

    console.log('✅ Live payment event sent successfully!');
    console.log('📊 Event Details:', {
      eventId: result.ids[0],
      sessionId: sessionId,
      amount: '$294',
      customer: 'Sarah Johnson'
    });
    console.log('🔍 Monitor this payment in Inngest: http://localhost:8288/runs');

  } catch (error) {
    console.error('❌ Failed to send live payment event:', error);
  }
}

testPayment();
