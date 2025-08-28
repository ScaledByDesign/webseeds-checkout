require('dotenv').config({ path: '.env.local' });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3255';

async function testDatabaseSession() {
  try {
    console.log('🧪 Testing Database Session Manager Integration');
    console.log('=' .repeat(50));

    // Test data for checkout
    const checkoutData = {
      customerInfo: {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '555-123-4567',
        address: '123 Test Street',
        city: 'Test City',
        state: 'CA',
        zipCode: '12345',
        country: 'US'
      },
      paymentToken: `test_token_${Date.now()}`,
      products: [
        {
          id: 'fitspresso-6-pack',
          name: 'Fitspresso 6 Bottle Super Pack',
          price: 294,
          quantity: 1
        }
      ]
    };

    console.log('📦 Testing checkout process with database session...');
    
    // Test the checkout process (which creates a database session)
    const checkoutResponse = await fetch(`${APP_URL}/api/checkout/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutData)
    });

    console.log(`📡 Checkout API Response: ${checkoutResponse.status} ${checkoutResponse.statusText}`);

    if (!checkoutResponse.ok) {
      const errorText = await checkoutResponse.text();
      console.error('❌ Checkout failed:', errorText);
      return;
    }

    const checkoutResult = await checkoutResponse.json();
    console.log('✅ Checkout successful!');
    console.log('📊 Checkout Result:', {
      success: checkoutResult.success,
      sessionId: checkoutResult.sessionId,
      message: checkoutResult.message,
      nextStep: checkoutResult.nextStep
    });

    if (checkoutResult.sessionId) {
      // Test session retrieval
      console.log('\n🔍 Testing session retrieval...');
      
      const sessionResponse = await fetch(`${APP_URL}/api/checkout/status/${checkoutResult.sessionId}`);
      console.log(`📡 Session API Response: ${sessionResponse.status} ${sessionResponse.statusText}`);

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        console.log('✅ Session retrieved successfully!');
        console.log('📊 Session Data:', {
          success: sessionData.success,
          status: sessionData.status,
          sessionId: sessionData.sessionId,
          currentStep: sessionData.currentStep,
          estimatedWaitTime: sessionData.estimatedWaitTime
        });
      } else {
        const errorText = await sessionResponse.text();
        console.error('❌ Session retrieval failed:', errorText);
      }
    }

    console.log('\n🎉 Database session test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testDatabaseSession();
