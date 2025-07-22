const fetch = require('node-fetch');

(async () => {
  console.log('🧪 Creating test order with complete product data...\n');
  
  try {
    const sessionId = `${Date.now()}-complete${Math.random().toString(36).substring(2, 6)}`;
    const baseUrl = 'http://localhost:3000';
    
    console.log('🆔 Test Session ID:', sessionId);
    
    // Create main order
    console.log('📦 Creating main order (Fitspresso)...');
    const mainOrder = await fetch(`${baseUrl}/api/order/details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_order',
        sessionId: sessionId,
        transactionId: `TXN${Date.now()}001`,
        amount: 315.39,
        productCode: 'FITSPRESSO_6',
        customer: {
          firstName: 'Complete',
          lastName: 'Order',
          email: `complete-${Date.now()}@example.com`,
          phone: '5551234567',
          address: '456 Complete Ave',
          city: 'Order City',
          state: 'CA',
          zipCode: '90210'
        }
      })
    }).then(r => r.json());
    
    console.log('✅ Main order:', mainOrder.success ? 'Created' : mainOrder.error);
    
    // Add upsell 1 (RetinaClear 12 bottles)
    console.log('🎯 Adding upsell 1 (RetinaClear 12-bottle)...');
    const upsell1 = await fetch(`${baseUrl}/api/order/details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_upsell',
        sessionId: sessionId,
        transactionId: `TXN${Date.now()}002`,
        amount: 296.00,
        productCode: 'RC12_296',
        step: 1
      })
    }).then(r => r.json());
    
    console.log('✅ Upsell 1:', upsell1.success ? 'Added' : upsell1.error);
    
    // Add upsell 2 (Sightagen 6 bottles)  
    console.log('🎯 Adding upsell 2 (Sightagen 6-bottle)...');
    const upsell2 = await fetch(`${baseUrl}/api/order/details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_upsell',
        sessionId: sessionId,
        transactionId: `TXN${Date.now()}003`,
        amount: 149.00,
        productCode: 'SA6_149',
        step: 2
      })
    }).then(r => r.json());
    
    console.log('✅ Upsell 2:', upsell2.success ? 'Added' : upsell2.error);
    
    // Verify complete order data
    console.log('\n📊 Verifying complete order data...');
    const orderData = await fetch(`${baseUrl}/api/order/details?session=${sessionId}`)
      .then(r => r.json());
    
    if (orderData.success) {
      console.log('\n🎉 COMPLETE ORDER CREATED SUCCESSFULLY!');
      console.log('==========================================');
      console.log(`📋 Session ID: ${sessionId}`);
      console.log(`👤 Customer: ${orderData.order.customer.firstName} ${orderData.order.customer.lastName}`);
      console.log(`📧 Email: ${orderData.order.customer.email}`);
      console.log(`🏠 Address: ${orderData.order.customer.address}, ${orderData.order.customer.city}, ${orderData.order.customer.state}`);
      
      console.log(`\n🛍️ PRODUCTS (${orderData.order.products.length} total):`);
      orderData.order.products.forEach((product, i) => {
        console.log(`   ${i + 1}. ${product.name} (${product.type.toUpperCase()})`);
        console.log(`      • ${product.description}`);
        console.log(`      • Amount: $${product.amount.toFixed(2)}`);
        console.log(`      • Transaction: ${product.transactionId}`);
        if (product.bottles) console.log(`      • Bottles: ${product.bottles}`);
      });
      
      console.log(`\n💰 TOTALS:`);
      console.log(`   • Main Order: $${orderData.order.mainOrder.amount.toFixed(2)}`);
      console.log(`   • Upsells: $${orderData.order.upsells.reduce((sum, u) => sum + u.amount, 0).toFixed(2)}`);
      console.log(`   • Grand Total: $${orderData.order.totals.total.toFixed(2)}`);
      
      console.log(`\n🌐 TEST THANK YOU PAGE:`);
      console.log(`   ${baseUrl}/thankyou?session=${sessionId}`);
      
    } else {
      console.log('❌ Order verification failed:', orderData.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();