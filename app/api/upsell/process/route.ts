import { NextRequest, NextResponse } from 'next/server'
import { getSession, getSessionById } from '@/src/lib/cookie-session'
import { funnelSessionManager } from '@/src/lib/funnel-session'

// NMI API Configuration
const NMI_API_URL = process.env.NMI_API_URL || 'https://secure.networkmerchants.com/api/transact.php'
const NMI_SECURITY_KEY = process.env.NMI_SECURITY_KEY || ''

interface UpsellRequest {
  sessionId: string
  productCode: string
  amount: number
  bottles: number
  step: number
}

export async function POST(request: NextRequest) {
  console.log('🎯 Upsell API called')
  console.log('🌐 Request URL:', request.url)
  console.log('🍪 Request headers (cookie):', request.headers.get('cookie'))
  console.log('📋 All request headers:', Object.fromEntries(request.headers.entries()))
  
  try {
    const body: UpsellRequest = await request.json()
    console.log('📦 Upsell request:', body)
    
    // Validate request
    if (!body.sessionId) {
      console.error('❌ No session ID provided in request')
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      )
    }
    
    // Get session from cookie first
    let session = await getSession()
    console.log('🍪 Session from cookie:', session ? 'Found' : 'Not found')
    
    // If cookie session fails, try fallback cache using sessionId
    if (!session && body.sessionId) {
      console.log('💾 Trying fallback: session cache lookup for ID:', body.sessionId)
      session = getSessionById(body.sessionId)
      console.log('💾 Cache lookup result:', session ? 'Found session' : 'No session found')
    }
    
    console.log('🍪 Final session details:', session ? {
      id: session.id,
      email: session.email,
      vaultId: session.vaultId ? 'Present' : 'Missing',
      createdAt: new Date(session.createdAt).toISOString(),
      expiresAt: new Date(session.expiresAt).toISOString(),
      isExpired: Date.now() > session.expiresAt,
      source: session === await getSession() ? 'cookie' : 'cache'
    } : 'No session')
    
    if (!session) {
      console.error('❌ No session found in cookie OR cache')
      console.error('🍪 Debug: Request headers:', {
        cookie: request.headers.get('cookie'),
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer')
      })
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      )
    }
    
    // Verify session ID matches
    if (session.id !== body.sessionId) {
      console.log('❌ Session ID mismatch:', session.id, 'vs', body.sessionId)
      return NextResponse.json(
        { success: false, error: 'Session ID mismatch' },
        { status: 401 }
      )
    }
    
    console.log('📋 Session found:', {
      email: session.email,
      vaultId: session.vaultId,
      originalTransaction: session.transactionId
    })
    
    // Validate vault ID
    if (!session.vaultId) {
      return NextResponse.json(
        { success: false, error: 'No payment method on file' },
        { status: 400 }
      )
    }
    
    // Get the customer's state from the session
    const state = session.state || 'CA'
    
    // Tax calculation - same logic as checkout
    const TAX_RATES: Record<string, number> = {
      'CA': 0.0725,  // California: 7.25%
      'TX': 0.0625,  // Texas: 6.25%
      'NY': 0.08,    // New York: 8%
      'FL': 0.06,    // Florida: 6%
      'WA': 0.065,   // Washington: 6.5%
      'DEFAULT': 0.0 // No tax for other states
    }
    
    const taxRate = TAX_RATES[state?.toUpperCase()] || TAX_RATES.DEFAULT
    const subtotal = body.amount
    const tax = parseFloat((subtotal * taxRate).toFixed(2))
    const shipping = 0.00 // Free shipping
    const total = subtotal + tax + shipping
    
    console.log('💰 Upsell amount calculation:')
    console.log('  - Product:', body.productCode)
    console.log('  - Subtotal:', subtotal.toFixed(2))
    console.log('  - Tax:', tax.toFixed(2), `(${(taxRate * 100).toFixed(2)}% for ${state})`)
    console.log('  - Total:', total.toFixed(2))
    
    // Prepare NMI vault payment request
    const nmiParams = new URLSearchParams({
      // Authentication
      security_key: NMI_SECURITY_KEY,
      
      // Transaction type - using customer vault
      type: 'sale',
      customer_vault_id: session.vaultId,
      
      // Amount with tax
      amount: total.toFixed(2),
      
      // Level 3 data
      tax: tax.toFixed(2),
      shipping: shipping.toFixed(2),
      
      // Order details - add random component to prevent duplicates
      orderid: `UPSELL${body.step}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      order_description: `${body.productCode} - ${body.bottles} bottles`,
      ponumber: `UPO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      
      // Customer info (from session)
      first_name: session.firstName,
      last_name: session.lastName,
      email: session.email,
      
      // Merchant fields
      merchant_defined_field_1: 'webseed-upsell',
      merchant_defined_field_2: `step-${body.step}`,
      merchant_defined_field_3: body.productCode,
      merchant_defined_field_4: session.transactionId // Original transaction
    })
    
    // Add line item data for Level 3
    const itemDescription = body.productCode.includes('RC') ? 'RetinaClear' : 'Sightagen'
    nmiParams.append('item_product_code_1', body.productCode)
    nmiParams.append('item_description_1', `${itemDescription} - ${body.bottles} Bottle Pack`)
    nmiParams.append('item_quantity_1', '1')
    nmiParams.append('item_unit_cost_1', subtotal.toFixed(2))
    nmiParams.append('item_unit_of_measure_1', 'EA')
    nmiParams.append('item_total_amount_1', subtotal.toFixed(2))
    nmiParams.append('item_tax_amount_1', tax.toFixed(2))
    nmiParams.append('item_tax_rate_1', taxRate.toFixed(2))
    nmiParams.append('item_commodity_code_1', '50202504') // Dietary supplements
    nmiParams.append('item_discount_amount_1', '0.00')
    
    console.log('🔄 Processing vault payment...')
    console.log('💳 Vault ID:', session.vaultId)
    console.log('💰 Total Amount (with tax):', total.toFixed(2))
    
    // Make the API request to NMI
    const nmiResponse = await fetch(NMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: nmiParams.toString()
    })
    
    const responseText = await nmiResponse.text()
    console.log('📨 NMI Response:', responseText)
    
    // Parse NMI response
    const responseParams = new URLSearchParams(responseText)
    const responseData: Record<string, string> = {}
    responseParams.forEach((value, key) => {
      responseData[key] = value
    })
    
    console.log('📊 Parsed NMI Response:', responseData)
    
    // Check if transaction was approved
    const isApproved = responseData.response === '1' || responseData.response_code === '100'
    
    if (isApproved && responseData.transactionid) {
      console.log('✅ Upsell payment approved!')
      
      // Store upsell details for thank you page
      try {
        // Store in funnel session manager
        funnelSessionManager.addUpsellDetails(session.id, {
          step: body.step,
          productCode: body.productCode,
          amount: total,
          bottles: body.bottles,
          transactionId: responseData.transactionid
        })
        console.log('🎯 Upsell details stored in funnel session')
        
        // Also store in order details API for backward compatibility
        const baseUrl = new URL(request.url).origin
        const response = await fetch(`${baseUrl}/api/order/details`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add_upsell',
            sessionId: session.id,
            transactionId: responseData.transactionid,
            amount: total,
            productCode: body.productCode,
            step: body.step
          })
        })
        const result = await response.json()
        console.log('🎯 Upsell details stored in order cache:', result.success ? 'Success' : result.error)
      } catch (error) {
        console.error('⚠️ Failed to store upsell details:', error)
        // Don't fail the whole transaction for this
      }
      
      // Return successful response
      const response = {
        success: true,
        transactionId: responseData.transactionid,
        authCode: responseData.authcode || '',
        responseCode: responseData.response_code || '100',
        message: 'Upsell processed successfully',
        amount: total,
        subtotal: subtotal,
        tax: tax,
        shipping: shipping,
        productCode: body.productCode,
        step: body.step,
        timestamp: Date.now()
      }
      
      console.log('🎉 Upsell processed successfully:', response)
      
      return NextResponse.json(response, { status: 200 })
      
    } else {
      // Transaction was declined or failed
      console.error('❌ Upsell payment declined')
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
    console.error('❌ Upsell processing error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Upsell processing failed',
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
    service: 'upsell-processing',
    timestamp: Date.now()
  })
}