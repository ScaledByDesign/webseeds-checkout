require('dotenv').config({ path: '.env.local' });

async function testSessionManager() {
  try {
    console.log('🧪 Testing Database Session Manager');
    console.log('=' .repeat(40));

    // Import the session manager using require (for Node.js compatibility)
    // We'll test the same logic but with direct imports
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Replicate the session manager's createSession logic
    console.log('📝 Testing session creation logic...');
    
    const sessionData = {
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

    // Generate session ID (same logic as session manager)
    const sessionId = `ws_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('🆔 Generated session ID:', sessionId);

    // Calculate amount
    const amount = sessionData.products.reduce((sum, product) => sum + (product.price * product.quantity), 0);
    console.log('💰 Calculated amount:', amount);

    // Create session data (same structure as session manager)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 hours
    
    const dbSessionData = {
      id: sessionId,
      email: sessionData.email,
      customer_info: sessionData.customerInfo || {},
      products: sessionData.products,
      status: 'pending',
      amount,
      current_step: 'checkout',
      upsells_accepted: [],
      upsells_declined: [],
      coupon_code: null,
      metadata: {},
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    console.log('📊 Session data prepared:', {
      id: dbSessionData.id,
      email: dbSessionData.email,
      amount: dbSessionData.amount,
      status: dbSessionData.status
    });

    // Insert session (same as session manager)
    console.log('🔄 Inserting session into database...');
    
    const { data: session, error } = await supabaseAdmin
      .from('funnel_sessions')
      .insert(dbSessionData)
      .select()
      .single();

    if (error) {
      console.error('❌ Session creation failed:', error);
      throw error;
    }

    console.log('✅ Session created successfully:', session.id);

    // Test retrieval
    console.log('🔍 Testing session retrieval...');
    
    const { data: retrievedSession, error: retrieveError } = await supabaseAdmin
      .from('funnel_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (retrieveError) {
      console.error('❌ Session retrieval failed:', retrieveError);
      throw retrieveError;
    }

    console.log('✅ Session retrieved successfully:', retrievedSession.id);

    // Test update
    console.log('🔄 Testing session update...');
    
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('funnel_sessions')
      .update({
        status: 'processing',
        current_step: 'payment',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Session update failed:', updateError);
      throw updateError;
    }

    console.log('✅ Session updated successfully:', updatedSession.status);

    // Clean up
    console.log('🧹 Cleaning up test session...');
    await supabaseAdmin.from('funnel_sessions').delete().eq('id', sessionId);

    console.log('\n🎉 Session Manager logic test PASSED!');
    console.log('✅ The session manager logic works correctly');
    console.log('❓ Issue must be in how it\'s being called from the checkout process');

  } catch (error) {
    console.error('\n❌ Session Manager test FAILED:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testSessionManager();
