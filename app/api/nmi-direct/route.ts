// @sentry/no-wrap
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// NMI Gateway configuration
const NMI_API_URL = process.env.NEXT_PUBLIC_NMI_API_URL || 'https://secure.nmi.com/api/transact.php';
const NMI_SECURITY_KEY = process.env.NMI_SECURITY_KEY || '6ZAAf76qD8RfbX4fkB6jQ58XVde9AJa4';

// Request validation schema
const nmiDirectSchema = z.object({
  customerInfo: z.object({
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string().optional(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string().optional().default('US'),
  }),
  paymentToken: z.string(),
  products: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    quantity: z.number(),
  })),
  billingInfo: z.object({
    address: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string().optional().default('US'),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🎯 NMI Direct - Received request');

    // Validate the request
    const validatedData = nmiDirectSchema.parse(body);
    console.log('✅ Validation passed');
    
    // Calculate total amount
    const amount = validatedData.products.reduce((sum, product) => {
      return sum + (product.price * product.quantity);
    }, 0);
    
    console.log(`💰 Processing payment for $${amount.toFixed(2)}`);
    
    // Use billing info if provided, otherwise use customer info
    const billingAddress = validatedData.billingInfo || {
      address: validatedData.customerInfo.address,
      city: validatedData.customerInfo.city,
      state: validatedData.customerInfo.state,
      zipCode: validatedData.customerInfo.zipCode,
      country: validatedData.customerInfo.country || 'US',
    };
    
    // Calculate tax and shipping (you can make these dynamic based on your business logic)
    const subtotal = amount;
    const taxRate = 0.0875; // 8.75% tax rate (example)
    const taxAmount = parseFloat((subtotal * taxRate).toFixed(2));
    const shippingAmount = 0.00; // Free shipping
    const totalAmount = subtotal + taxAmount + shippingAmount;
    
    // Generate unique order ID
    const orderId = `WS-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // Build NMI request parameters with Level 3 data
    const nmiParams = new URLSearchParams({
      // Authentication
      security_key: NMI_SECURITY_KEY,
      
      // Transaction details
      type: 'sale',
      payment_token: validatedData.paymentToken,
      amount: totalAmount.toFixed(2),
      
      // Customer information
      first_name: validatedData.customerInfo.firstName,
      last_name: validatedData.customerInfo.lastName,
      email: validatedData.customerInfo.email,
      phone: validatedData.customerInfo.phone || '',
      company: 'Individual', // Add company field if B2B
      
      // Billing address
      address1: billingAddress.address,
      city: billingAddress.city,
      state: billingAddress.state,
      zip: billingAddress.zipCode,
      country: billingAddress.country,
      
      // Shipping address (using customer info)
      shipping_firstname: validatedData.customerInfo.firstName,
      shipping_lastname: validatedData.customerInfo.lastName,
      shipping_address1: validatedData.customerInfo.address,
      shipping_city: validatedData.customerInfo.city,
      shipping_state: validatedData.customerInfo.state,
      shipping_zip: validatedData.customerInfo.zipCode,
      shipping_country: validatedData.customerInfo.country || 'US',
      
      // Order details
      order_description: validatedData.products.map(p => `${p.name} (x${p.quantity})`).join(', '),
      orderid: orderId,
      po_number: orderId, // Purchase order number
      
      // Level 2 Data (Summary level)
      tax: taxAmount.toFixed(2),
      shipping: shippingAmount.toFixed(2),
      
      // Level 3 Data (Line item details)
      customer_receipt: 'true',
      
      // Additional options
      currency: 'USD',
      ipaddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
    });
    
    // Add Level 3 line items
    validatedData.products.forEach((product, index) => {
      const lineNumber = index + 1;
      const lineTotal = product.price * product.quantity;
      const itemTax = parseFloat((lineTotal * taxRate).toFixed(2));
      
      // Product line item details
      nmiParams.append(`item_product_code_${lineNumber}`, product.id);
      nmiParams.append(`item_description_${lineNumber}`, product.name);
      nmiParams.append(`item_commodity_code_${lineNumber}`, '44121700'); // Health/Beauty products code
      nmiParams.append(`item_unit_cost_${lineNumber}`, product.price.toFixed(2));
      nmiParams.append(`item_quantity_${lineNumber}`, product.quantity.toString());
      nmiParams.append(`item_unit_of_measure_${lineNumber}`, 'EA'); // Each
      nmiParams.append(`item_total_amount_${lineNumber}`, lineTotal.toFixed(2));
      nmiParams.append(`item_tax_amount_${lineNumber}`, itemTax.toFixed(2));
      nmiParams.append(`item_tax_rate_${lineNumber}`, (taxRate * 100).toFixed(2));
      nmiParams.append(`item_discount_amount_${lineNumber}`, '0.00');
      nmiParams.append(`item_tax_type_${lineNumber}`, 'SALE');
      nmiParams.append(`item_alternate_tax_id_${lineNumber}`, '');
    });
    
    // Add summary totals
    nmiParams.append('discount', '0.00');
    nmiParams.append('subtotal', subtotal.toFixed(2));
    nmiParams.append('surcharge', '0.00');
    nmiParams.append('duty_amount', '0.00');
    
    console.log('🚀 Sending request to NMI Gateway with Level 3 data...');
    console.log('Token:', validatedData.paymentToken);
    console.log('Order ID:', orderId);
    console.log('Subtotal:', subtotal.toFixed(2));
    console.log('Tax:', taxAmount.toFixed(2));
    console.log('Shipping:', shippingAmount.toFixed(2));
    console.log('Total Amount:', totalAmount.toFixed(2));
    console.log('Line Items:', validatedData.products.length);
    
    // Send request to NMI
    const nmiResponse = await fetch(NMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: nmiParams.toString(),
    });
    
    const responseText = await nmiResponse.text();
    console.log('📦 NMI Raw Response:', responseText);
    
    // Parse NMI response
    const responseData = new URLSearchParams(responseText);
    const response = Object.fromEntries(responseData.entries());
    
    const responseCode = response.response_code;
    const responseMessage = response.responsetext;
    const transactionId = response.transactionid;
    const authCode = response.authcode;
    const avsResponse = response.avsresponse;
    const cvvResponse = response.cvvresponse;
    const responseOrderId = response.orderid;
    
    console.log('📊 Parsed Response:', {
      responseCode,
      responseMessage,
      transactionId,
      authCode,
      approved: responseCode === '100'
    });
    
    if (responseCode === '100') {
      // Success!
      console.log('✅ Payment APPROVED! Transaction ID:', transactionId);
      
      return NextResponse.json({
        success: true,
        message: 'Payment processed successfully',
        transactionId,
        authCode,
        avsResponse,
        cvvResponse,
        orderId: responseOrderId,
        amount: totalAmount.toFixed(2),
        breakdown: {
          subtotal: subtotal.toFixed(2),
          tax: taxAmount.toFixed(2),
          shipping: shippingAmount.toFixed(2),
          total: totalAmount.toFixed(2),
        },
        level3Data: {
          itemCount: validatedData.products.length,
          items: validatedData.products.map(p => ({
            id: p.id,
            name: p.name,
            quantity: p.quantity,
            unitPrice: p.price.toFixed(2),
            total: (p.price * p.quantity).toFixed(2),
          })),
        },
        details: {
          responseCode,
          responseText: responseMessage,
          timestamp: new Date().toISOString(),
        }
      });
    } else {
      // Payment declined or error
      console.log('❌ Payment DECLINED/FAILED:', responseMessage);
      
      return NextResponse.json({
        success: false,
        message: responseMessage || 'Payment failed',
        responseCode,
        transactionId,
        details: {
          raw: responseText,
          parsed: response,
          amount: totalAmount.toFixed(2),
          orderId: responseOrderId,
        }
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ NMI Direct processing error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors,
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Payment processing failed',
      error: (error as Error).message,
    }, { status: 500 });
  }
}