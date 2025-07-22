import { NextRequest, NextResponse } from 'next/server'

// NMI API Configuration
const NMI_API_URL = process.env.NMI_API_URL || 'https://secure.networkmerchants.com/api/transact.php'
const NMI_SECURITY_KEY = process.env.NMI_SECURITY_KEY || ''

export async function POST(request: NextRequest) {
  console.log('💳 Payment API called')
  
  try {
    // Handle form data from CollectJS submission
    const formData = await request.formData()
    console.log('📝 Form Data Keys:', Array.from(formData.keys()))
    
    // Extract payment token (added automatically by CollectJS)
    const payment_token = formData.get('payment_token') as string
    
    // Extract form fields
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const address = formData.get('address') as string
    const city = formData.get('city') as string
    const state = formData.get('state') as string
    const zipCode = formData.get('zipCode') as string
    const country = formData.get('country') as string || 'US'
    
    console.log('📦 Received form data:', {
      payment_token: payment_token ? 'present' : 'missing',
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      country
    })
    
    // Validate required fields
    if (!payment_token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payment token is required' 
        },
        { status: 400 }
      )
    }

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Customer information is required' 
        },
        { status: 400 }
      )
    }

    if (!NMI_SECURITY_KEY) {
      console.error('❌ NMI_SECURITY_KEY is not configured')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payment gateway not configured' 
        },
        { status: 500 }
      )
    }

    // Calculate order totals
    const subtotal = 294.00 // Product price
    const tax = 26.46 // 9% tax
    const shipping = 0.00 // Free shipping
    const total = subtotal + tax + shipping // 320.46

    // Prepare NMI API request parameters
    const nmiParams = new URLSearchParams({
      // Authentication
      security_key: NMI_SECURITY_KEY,
      
      // Transaction Details
      type: 'sale',
      payment_token: payment_token,
      amount: total.toFixed(2),
      
      // Customer Information
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone || '',
      
      // Billing Address
      address1: address || '',
      city: city || '',
      state: state || '',
      zip: zipCode || '',
      country: country,
      
      // Shipping Address (same as billing for now)
      shipping_firstname: firstName,
      shipping_lastname: lastName,
      shipping_address1: address || '',
      shipping_city: city || '',
      shipping_state: state || '',
      shipping_zip: zipCode || '',
      shipping_country: country,
      
      // Level 3 Processing Data
      tax: tax.toFixed(2),
      shipping: shipping.toFixed(2),
      ponumber: `PO-${Date.now()}`, // Purchase order number
      
      // Order details
      orderid: `ORDER-${Date.now()}`,
      order_description: 'Fitspresso 6 Bottle Super Pack',
      
      // Enhanced data for Level 3
      company: 'Individual', // or company name if B2B
      
      // Merchant defined fields
      merchant_defined_field_1: 'webseed-checkout',
      merchant_defined_field_2: Date.now().toString()
    })

    // Add line items for Level 3 data
    // NMI expects line items in a specific format: item_product_code_X, item_description_X, etc.
    const lineItems = [
      {
        product_code: 'FITSPRESSO-6PK',
        description: 'Fitspresso 6 Bottle Super Pack',
        quantity: 1,
        unit_cost: subtotal,
        unit_of_measure: 'EA',
        total_amount: subtotal,
        tax_amount: tax,
        tax_rate: 0.09,
        commodity_code: '50202504', // Dietary supplements commodity code
        discount_amount: 0
      }
    ]

    // Add each line item to the request
    lineItems.forEach((item, index) => {
      const itemIndex = index + 1
      nmiParams.append(`item_product_code_${itemIndex}`, item.product_code)
      nmiParams.append(`item_description_${itemIndex}`, item.description)
      nmiParams.append(`item_quantity_${itemIndex}`, item.quantity.toString())
      nmiParams.append(`item_unit_cost_${itemIndex}`, item.unit_cost.toFixed(2))
      nmiParams.append(`item_unit_of_measure_${itemIndex}`, item.unit_of_measure)
      nmiParams.append(`item_total_amount_${itemIndex}`, item.total_amount.toFixed(2))
      nmiParams.append(`item_tax_amount_${itemIndex}`, item.tax_amount.toFixed(2))
      nmiParams.append(`item_tax_rate_${itemIndex}`, item.tax_rate.toFixed(2))
      nmiParams.append(`item_commodity_code_${itemIndex}`, item.commodity_code)
      nmiParams.append(`item_discount_amount_${itemIndex}`, item.discount_amount.toFixed(2))
    })

    console.log('🔄 Sending request to NMI API...')
    console.log('📍 API URL:', NMI_API_URL)
    console.log('🔑 Using security key:', NMI_SECURITY_KEY.substring(0, 8) + '...')
    console.log('💰 Transaction amount:', total.toFixed(2))
    console.log('📊 Level 3 Data:')
    console.log('  - Subtotal:', subtotal.toFixed(2))
    console.log('  - Tax:', tax.toFixed(2))
    console.log('  - Shipping:', shipping.toFixed(2))
    console.log('  - Line items:', lineItems.length)
    console.log('  - Order ID:', nmiParams.get('orderid'))
    console.log('  - PO Number:', nmiParams.get('ponumber'))
    
    // Make the API request to NMI
    const nmiResponse = await fetch(NMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: nmiParams.toString()
    })

    const responseText = await nmiResponse.text()
    console.log('📨 NMI Response Status:', nmiResponse.status)
    console.log('📨 NMI Response Text:', responseText)
    
    // Parse NMI response (it returns query string format)
    const responseParams = new URLSearchParams(responseText)
    const responseData: Record<string, string> = {}
    responseParams.forEach((value, key) => {
      responseData[key] = value
    })
    
    console.log('📊 Parsed NMI Response:', responseData)
    
    // Check if transaction was approved
    const isApproved = responseData.response === '1' || responseData.response_code === '100'
    
    if (isApproved && responseData.transactionid) {
      console.log('✅ Payment approved by NMI!')
      
      // Return successful response
      const response = {
        success: true,
        transactionId: responseData.transactionid,
        authCode: responseData.authcode || '',
        responseCode: responseData.response_code || '100',
        message: 'Payment processed successfully',
        amount: total,
        subtotal: subtotal,
        tax: tax,
        shipping: shipping,
        avsResponse: responseData.avsresponse || '',
        cvvResponse: responseData.cvvresponse || '',
        timestamp: Date.now()
      }
      
      console.log('🎉 Payment processed successfully:', response)
      
      return NextResponse.json(response, { status: 200 })
      
    } else {
      // Transaction was declined or failed
      console.error('❌ Payment declined by NMI')
      console.error('Response code:', responseData.response_code)
      console.error('Response text:', responseData.responsetext)
      
      return NextResponse.json(
        { 
          success: false, 
          error: responseData.responsetext || 'Payment declined',
          responseCode: responseData.response_code,
          message: responseData.responsetext || 'Transaction was not approved'
        },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('❌ Payment processing error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Payment processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'payment-processing',
    timestamp: Date.now()
  })
}