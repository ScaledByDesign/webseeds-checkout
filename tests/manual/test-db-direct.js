require('dotenv').config({ path: '.env.local' });

// Test the Supabase connection directly
async function testDatabaseDirect() {
  try {
    console.log('🧪 Testing Supabase Database Connection Directly');
    console.log('=' .repeat(50));

    // Import Supabase client directly
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('🔧 Configuration:');
    console.log('  Supabase URL:', supabaseUrl);
    console.log('  Service Key:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : 'NOT SET');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('\n📝 Testing direct insert...');
    
    // Test session data
    const sessionId = `ws_test_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionData = {
      id: sessionId,
      email: 'direct-test@example.com',
      customer_info: {
        firstName: 'Direct',
        lastName: 'Test',
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
      ],
      status: 'pending',
      amount: 294,
      current_step: 'checkout',
      upsells_accepted: [],
      upsells_declined: [],
      metadata: { test: true },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(),
    };

    // Insert session
    const { data: insertedSession, error: insertError } = await supabaseAdmin
      .from('funnel_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert failed:', insertError);
      throw insertError;
    }

    console.log('✅ Session inserted successfully!');
    console.log('📊 Inserted Session:', {
      id: insertedSession.id,
      email: insertedSession.email,
      status: insertedSession.status,
      amount: insertedSession.amount
    });

    // Try to retrieve the session
    console.log('\n🔍 Testing retrieval...');
    const { data: retrievedSession, error: retrieveError } = await supabaseAdmin
      .from('funnel_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (retrieveError) {
      console.error('❌ Retrieval failed:', retrieveError);
      throw retrieveError;
    }

    console.log('✅ Session retrieved successfully!');
    console.log('📊 Retrieved Session:', {
      id: retrievedSession.id,
      email: retrievedSession.email,
      status: retrievedSession.status,
      amount: retrievedSession.amount
    });

    // Clean up
    console.log('\n🧹 Cleaning up test session...');
    const { error: deleteError } = await supabaseAdmin
      .from('funnel_sessions')
      .delete()
      .eq('id', sessionId);

    if (deleteError) {
      console.error('❌ Cleanup failed:', deleteError);
    } else {
      console.log('✅ Test session cleaned up');
    }

    console.log('\n🎉 Direct database test completed successfully!');

  } catch (error) {
    console.error('❌ Direct database test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testDatabaseDirect();
