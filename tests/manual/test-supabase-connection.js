require('dotenv').config({ path: '.env.local' });

async function testSupabaseConnection() {
  try {
    console.log('🧪 Testing Supabase Connection');
    console.log('=' .repeat(40));

    // Import the database session manager
    const { databaseSessionManager } = require('./src/lib/database-session-manager.ts');

    console.log('📡 Testing database session creation...');

    // Test session data
    const testSessionData = {
      email: 'test@example.com',
      customerInfo: {
        firstName: 'John',
        lastName: 'Doe',
        phone: '555-123-4567',
        address: '123 Test Street',
        city: 'Test City',
        state: 'CA',
        zipCode: '12345',
        country: 'US'
      },
      products: [
        {
          id: 'fitspresso-6-pack',
          name: 'Fitspresso 6 Bottle Super Pack',
          price: 294,
          quantity: 1
        }
      ]
    };

    // Create a session
    console.log('🔄 Creating session...');
    const session = await databaseSessionManager.createSession(testSessionData);
    
    console.log('✅ Session created successfully!');
    console.log('📊 Session Details:', {
      id: session.id,
      email: session.email,
      status: session.status,
      amount: session.amount,
      current_step: session.current_step,
      created_at: session.created_at
    });

    // Try to retrieve the session
    console.log('\n🔍 Testing session retrieval...');
    const retrievedSession = await databaseSessionManager.getSession(session.id);
    
    if (retrievedSession) {
      console.log('✅ Session retrieved successfully!');
      console.log('📊 Retrieved Session:', {
        id: retrievedSession.id,
        email: retrievedSession.email,
        status: retrievedSession.status,
        amount: retrievedSession.amount
      });
    } else {
      console.log('❌ Session not found during retrieval');
    }

    console.log('\n🎉 Supabase connection test completed!');

  } catch (error) {
    console.error('❌ Supabase connection test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testSupabaseConnection();
