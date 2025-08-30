import { NextRequest, NextResponse } from 'next/server'
import { getSession, getSessionById } from '@/src/lib/cookie-session'
import { funnelSessionManager } from '@/src/lib/funnel-session'
import { databaseSessionManager } from '@/src/lib/database-session-manager'
import { calculateTax, getTaxRate } from '@/src/lib/constants/payment'
import { z } from 'zod'

// NMI API Configuration - using existing env variables
const NMI_API_URL = process.env.NMI_ENDPOINT || process.env.NEXT_PUBLIC_NMI_API_URL || 'https://secure.nmi.com/api/transact.php'
const NMI_SECURITY_KEY = process.env.NMI_SECURITY_KEY || ''

// Upsell request validation schema
const upsellRequestSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  productCode: z.string().min(1, 'Product code is required'),
  amount: z.number().positive('Amount must be positive'),
  bottles: z.number().int().positive('Bottles must be a positive integer'),
  step: z.number().int().positive('Step must be a positive integer')
})

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
    const body = await request.json()
    console.log('📦 Upsell request:', body)
    
    // Validate request using shared schema
    let validatedData: UpsellRequest
    try {
      validatedData = upsellRequestSchema.parse(body)
      console.log('✅ Upsell request validation successful')
    } catch (error) {
      console.error('❌ Upsell request validation failed:', error)
      return NextResponse.json(
        { success: false, error: 'Invalid upsell request data' },
        { status: 400 }
      )
    }
    
    // PRIORITY 1: Get session from database session manager (primary source)
    let session = null
    try {
      console.log('🎯 Trying DATABASE SESSION MANAGER (primary source)...')
      session = await databaseSessionManager.getSession(validatedData.sessionId)
      console.log('📋 Database session result:', session ? 'Found' : 'Not found')
      if (session) {
        console.log('✅ Using DATABASE SESSION for upsell processing')
        console.log('📊 Database session details:', {
          id: session.id,
          email: session.email,
          vaultId: session.vaultId ? 'Present' : 'Missing',
          status: session.status,
          currentStep: session.currentStep
        })
      }
    } catch (error) {
      console.warn('⚠️ Database session lookup failed:', error)
    }

    // PRIORITY 2: Fallback to cookie session
    if (!session) {
      console.log('🍪 Trying COOKIE SESSION (fallback)...')
      session = await getSession()
      console.log('🍪 Cookie session result:', session ? 'Found' : 'Not found')
    }

    // PRIORITY 3: Fallback to session cache using sessionId
    if (!session && validatedData.sessionId) {
      console.log('💾 Trying SESSION CACHE (fallback)...')
      session = getSessionById(validatedData.sessionId)
      console.log('💾 Cache lookup result:', session ? 'Found session' : 'No session found')
    }
    
    console.log('🎯 Final session details:', session ? {
      id: session.id,
      email: session.email,
      vaultId: (session.vaultId || session.vault_id) ? 'Present' : 'Missing',
      status: session.status || 'N/A',
      currentStep: session.currentStep || session.current_step || 'N/A',
      createdAt: session.createdAt ? new Date(session.createdAt).toISOString() : 'N/A',
      expiresAt: session.expiresAt ? new Date(session.expiresAt).toISOString() : 'N/A',
      isExpired: session.expiresAt ? Date.now() > session.expiresAt : false,
      source: session.status ? 'database' : 'cookie/cache'
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
    if (session.id !== validatedData.sessionId) {
      console.log('❌ Session ID mismatch:', session.id, 'vs', validatedData.sessionId)
      return NextResponse.json(
        { success: false, error: 'Session ID mismatch' },
        { status: 401 }
      )
    }

    // Validate upsell eligibility
    console.log('🔍 Validating upsell eligibility...')
    const eligibilityErrors: string[] = []
    const eligibilityWarnings: string[] = []

    // Check if session has required fields for upsell (handle both database and cookie session formats)
    const vaultId = session.vaultId || session.vault_id
    if (!vaultId) {
      eligibilityErrors.push('No vault ID found - cannot process upsell')
    }

    if (!session.email) {
      eligibilityErrors.push('No email found in session')
    }

    // Check if amount is reasonable
    if (validatedData.amount > 1000) {
      eligibilityWarnings.push('High upsell amount detected')
    }

    if (eligibilityErrors.length > 0) {
      console.error('❌ Upsell eligibility validation failed:', eligibilityErrors)
      return NextResponse.json(
        { success: false, error: eligibilityErrors.join(', ') },
        { status: 400 }
      )
    }

    if (eligibilityWarnings.length > 0) {
      console.warn('⚠️ Upsell eligibility warnings:', eligibilityWarnings)
    }
    
    console.log('📋 Session found:', {
      email: session.email,
      vaultId: vaultId,
      originalTransaction: session.transactionId || session.transaction_id
    })

    // Validate vault ID (already checked above, but double-check)
    if (!vaultId) {
      return NextResponse.json(
        { success: false, error: 'No payment method on file' },
        { status: 400 }
      )
    }
    
    // Get the customer's state from the session
    const state = session.state || 'CA'
    
    // Tax calculation - same logic as checkout
    const taxRate = getTaxRate(state)
    const subtotal = validatedData.amount
    const tax = calculateTax(subtotal, state)
    const shipping = 0.00 // Free shipping
    const total = subtotal + tax + shipping
    
    console.log('💰 Upsell amount calculation:')
    console.log('  - Product:', validatedData.productCode)
    console.log('  - Subtotal:', subtotal.toFixed(2))
    console.log('  - Tax:', tax.toFixed(2), `(${(taxRate * 100).toFixed(2)}% for ${state})`)
    console.log('  - Total:', total.toFixed(2))
    
    // Prepare NMI vault payment request
    const nmiParams = new URLSearchParams({
      // Authentication
      security_key: NMI_SECURITY_KEY,
      
      // Transaction type - using customer vault
      type: 'sale',
      customer_vault_id: vaultId,
      
      // Amount with tax
      amount: total.toFixed(2),
      
      // Level 3 data
      tax: tax.toFixed(2),
      shipping: shipping.toFixed(2),
      
      // Order details - add random component to prevent duplicates
      orderid: `UPSELL${validatedData.step}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      order_description: `${validatedData.productCode} - ${validatedData.bottles} bottles`,
      ponumber: `UPO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      
      // Customer info (from session)
      first_name: session.firstName,
      last_name: session.lastName,
      email: session.email,
      
      // Merchant fields
      merchant_defined_field_1: 'webseed-upsell',
      merchant_defined_field_2: `step-${validatedData.step}`,
      merchant_defined_field_3: validatedData.productCode,
      merchant_defined_field_4: session.transactionId // Original transaction
    })
    
    // Add line item data for Level 3
    const itemDescription = validatedData.productCode.includes('RC') ? 'RetinaClear' : 'Sightagen'
    nmiParams.append('item_product_code_1', validatedData.productCode)
    nmiParams.append('item_description_1', `${itemDescription} - ${validatedData.bottles} Bottle Pack`)
    nmiParams.append('item_quantity_1', '1')
    nmiParams.append('item_unit_cost_1', subtotal.toFixed(2))
    nmiParams.append('item_unit_of_measure_1', 'EA')
    nmiParams.append('item_total_amount_1', subtotal.toFixed(2))
    nmiParams.append('item_tax_amount_1', tax.toFixed(2))
    nmiParams.append('item_tax_rate_1', taxRate.toFixed(2))
    nmiParams.append('item_commodity_code_1', '50202504') // Dietary supplements
    nmiParams.append('item_discount_amount_1', '0.00')
    
    console.log('🔄 Processing vault payment...')
    console.log('💳 Vault ID:', vaultId)
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
      
      // Store upsell details for thank you page (DATABASE SESSION FIRST - PRIMARY)
      try {
        console.log('🎯 Storing upsell details in multiple systems...')

        // PRIORITY 1: Store in database session (primary source)
        try {
          console.log('📥 Storing upsell in DATABASE SESSION (primary)...')

          // Get current database session
          const currentDbSession = await databaseSessionManager.getSession(session.id)
          if (currentDbSession) {
            // Prepare upsell data
            const upsellData = {
              step: validatedData.step,
              productCode: validatedData.productCode,
              amount: total,
              bottles: validatedData.bottles,
              transactionId: responseData.transactionid,
              timestamp: new Date().toISOString()
            }

            // Get existing upsells from metadata or initialize empty array
            let existingUpsells = []
            if (currentDbSession.metadata?.upsells) {
              existingUpsells = Array.isArray(currentDbSession.metadata.upsells)
                ? currentDbSession.metadata.upsells
                : JSON.parse(currentDbSession.metadata.upsells)
            }

            // Add new upsell
            existingUpsells.push(upsellData)

            // Update database session with upsell data
            const sessionUpdateData = {
              metadata: {
                ...currentDbSession.metadata,
                upsells: existingUpsells,
                lastUpsellStep: validatedData.step,
                lastUpsellTransactionId: responseData.transactionid,
                lastUpsellAmount: total
              }
            }

            const updatedSession = await databaseSessionManager.updateSession(session.id, sessionUpdateData)
            console.log('✅ Upsell stored in database session successfully')
            console.log(`  📊 Total upsells: ${existingUpsells.length}`)
            console.log(`  💰 Upsell amount: $${total}`)
            console.log(`  🆔 Transaction ID: ${responseData.transactionid}`)
          } else {
            console.warn('⚠️ Database session not found for upsell storage')
          }
        } catch (dbError) {
          console.error('❌ Failed to store upsell in database session:', dbError)
          // Continue with fallback methods
        }

        // PRIORITY 2: Store in funnel session manager (fallback)
        funnelSessionManager.addUpsellDetails(session.id, {
          step: validatedData.step,
          productCode: validatedData.productCode,
          amount: total,
          bottles: validatedData.bottles,
          transactionId: responseData.transactionid
        })
        console.log('✅ Upsell details stored in funnel session (fallback)')

        // PRIORITY 3: Store in order details API (backward compatibility)
        const baseUrl = new URL(request.url).origin
        const response = await fetch(`${baseUrl}/api/order/details`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add_upsell',
            sessionId: session.id,
            transactionId: responseData.transactionid,
            amount: total,
            productCode: validatedData.productCode,
            step: validatedData.step
          })
        })
        const result = await response.json()
        console.log('✅ Upsell details stored in order cache:', result.success ? 'Success' : result.error)

      } catch (error) {
        console.error('❌ Failed to store upsell details:', error)
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
        productCode: validatedData.productCode,
        step: validatedData.step,
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