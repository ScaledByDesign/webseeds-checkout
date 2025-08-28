require('dotenv').config({ path: '.env.local' });

async function testDatabaseConnection() {
  try {
    console.log('🧪 Testing Database Connection');
    console.log('=' .repeat(40));

    // Test environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('🔧 Environment Variables:');
    console.log('  SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NOT SET');
    console.log('  SERVICE_KEY:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : 'NOT SET');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Test direct Supabase connection
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('\n📊 Testing table access...');
    
    // Test 1: Count existing sessions
    const { data: countData, error: countError } = await supabaseAdmin
      .from('funnel_sessions')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Count query failed:', countError);
      throw countError;
    }

    console.log('✅ Table accessible. Current session count:', countData?.length || 0);

    // Test 2: Insert a test session
    console.log('\n📝 Testing session insert...');
    
    const testSessionId = `test_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
    const testSession = {
      id: testSessionId,
      email: 'test@example.com',
      customer_info: { firstName: 'Test', lastName: 'User' },
      products: [{ id: 'test', name: 'Test Product', price: 100, quantity: 1 }],
      status: 'pending',
      amount: 100,
      current_step: 'checkout',
      upsells_accepted: [],
      upsells_declined: [],
      metadata: { test: true },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(),
    };

    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('funnel_sessions')
      .insert(testSession)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert failed:', insertError);
      throw insertError;
    }

    console.log('✅ Session inserted successfully:', insertData.id);

    // Test 3: Retrieve the session
    console.log('\n🔍 Testing session retrieval...');
    
    const { data: retrieveData, error: retrieveError } = await supabaseAdmin
      .from('funnel_sessions')
      .select('*')
      .eq('id', testSessionId)
      .single();

    if (retrieveError) {
      console.error('❌ Retrieval failed:', retrieveError);
      throw retrieveError;
    }

    console.log('✅ Session retrieved successfully:', retrieveData.id);

    // Test 4: Update the session
    console.log('\n🔄 Testing session update...');
    
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('funnel_sessions')
      .update({ 
        status: 'processing',
        current_step: 'payment',
        updated_at: new Date().toISOString()
      })
      .eq('id', testSessionId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Update failed:', updateError);
      throw updateError;
    }

    console.log('✅ Session updated successfully:', updateData.status);

    // Test 5: Clean up
    console.log('\n🧹 Cleaning up test session...');
    
    const { error: deleteError } = await supabaseAdmin
      .from('funnel_sessions')
      .delete()
      .eq('id', testSessionId);

    if (deleteError) {
      console.error('❌ Cleanup failed:', deleteError);
    } else {
      console.log('✅ Test session cleaned up');
    }

    console.log('\n🎉 Database connection test PASSED!');
    console.log('✅ All database operations working correctly');

  } catch (error) {
    console.error('\n❌ Database connection test FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testDatabaseConnection();
