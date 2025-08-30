import { NextRequest, NextResponse } from 'next/server'
import { legacyCookieSessionManager } from '@/src/lib/unified-session-manager'
const { getSession, getSessionById, updateSession } = legacyCookieSessionManager

// NMI API Configuration - using existing env variables
const NMI_API_URL = process.env.NMI_ENDPOINT || process.env.NEXT_PUBLIC_NMI_API_URL || 'https://secure.nmi.com/api/transact.php'
const NMI_SECURITY_KEY = process.env.NMI_SECURITY_KEY || ''

export async function POST(request: NextRequest) {
  console.log('💳 Vault card update API called')
  console.log('🌐 Request URL:', request.url)
  console.log('🍪 Request headers (cookie):', request.headers.get('cookie'))
  
  try {
    const body = await request.json()
    console.log('📦 Update card request:', {
      sessionId: body.sessionId,
      payment_token: body.payment_token ? body.payment_token.substring(0, 10) + '...' : 'missing',
      name_on_card: body.name_on_card
    })
    
    // Validate request - payment token is required, vault ID can come from session OR be provided directly
    if (!body.payment_token) {
      return NextResponse.json(
        { success: false, error: 'Payment token is required' },
        { status: 400 }
      )
    }

    // Check if vault ID and customer info are provided directly (preferred method)
    if (body.vaultId && body.customerInfo) {
      console.log('🎯 Using provided vault ID and customer info (direct method)')
      console.log('🏦 Vault ID:', body.vaultId)
      console.log('👤 Customer info:', {
        firstName: body.customerInfo.firstName,
        lastName: body.customerInfo.lastName,
        email: body.customerInfo.email
      })

      // Use provided data directly - no session validation needed
      const vaultId = body.vaultId
      const customerInfo = body.customerInfo

      // Prepare NMI vault update request with provided data
      const nmiParams = new URLSearchParams({
        // Authentication
        security_key: NMI_SECURITY_KEY,

        // Update customer vault with new payment token
        customer_vault: 'update_customer',
        customer_vault_id: vaultId,
        payment_token: body.payment_token,

        // Customer information from request
        first_name: customerInfo.firstName,
        last_name: customerInfo.lastName,
        email: customerInfo.email,

        // Merchant defined fields
        merchant_defined_field_1: 'vault-update-direct',
        merchant_defined_field_2: Date.now().toString()
      })

      console.log('🔄 Sending direct vault update request to NMI...')
      console.log('📋 NMI request parameters:', {
        customer_vault: 'update_customer',
        customer_vault_id: vaultId,
        payment_token: body.payment_token.substring(0, 10) + '...',
        first_name: customerInfo.firstName,
        last_name: customerInfo.lastName,
        email: customerInfo.email
      })

      // Make the NMI API call
      const nmiResponse = await fetch(NMI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: nmiParams.toString()
      })

      const responseText = await nmiResponse.text()
      console.log('📡 NMI vault update response:', responseText)

      // Parse NMI response
      const responseParams = new URLSearchParams(responseText)
      const response = responseParams.get('response')
      const responseText2 = responseParams.get('responsetext')
      const customerVaultId = responseParams.get('customer_vault_id')

      if (response === '1') {
        console.log('✅ Vault update successful')
        console.log('🏦 Updated vault ID:', customerVaultId)

        return NextResponse.json({
          success: true,
          message: 'Payment method updated successfully',
          vaultId: customerVaultId
        })
      } else {
        console.log('❌ Vault update failed:', responseText2)
        return NextResponse.json(
          { success: false, error: responseText2 || 'Vault update failed' },
          { status: 400 }
        )
      }
    }

    // Fallback to session-based method if vault ID not provided directly
    if (!body.sessionId) {
      return NextResponse.json(
        { success: false, error: 'Either (vaultId + customerInfo) or sessionId is required' },
        { status: 400 }
      )
    }
    
    if (!NMI_SECURITY_KEY) {
      console.error('❌ NMI_SECURITY_KEY is not configured')
      return NextResponse.json(
        { success: false, error: 'Payment gateway not configured' },
        { status: 500 }
      )
    }
    
    // Get current session to retrieve vault ID - try cookie first, then cache
    let session = await getSession()
    console.log('🍪 Cookie session:', session ? `found (${session.id})` : 'not found')
    
    // If cookie session doesn't match, try the session cache
    if (!session || session.id !== body.sessionId) {
      console.log('🔍 Trying session cache for ID:', body.sessionId)
      session = getSessionById(body.sessionId)
      console.log('💾 Cache session:', session ? `found (${session.id})` : 'not found')
    }
    
    if (!session || session.id !== body.sessionId) {
      console.log('❌ Session validation failed:', {
        requestedId: body.sessionId,
        cookieId: session?.id || 'none',
        available: 'neither cookie nor cache session matches'
      })
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      )
    }
    
    if (!session.vaultId) {
      return NextResponse.json(
        { success: false, error: 'No customer vault found' },
        { status: 400 }
      )
    }
    
    console.log('🏦 Updating vault ID:', session.vaultId)
    console.log('👤 Session details:', {
      firstName: session.firstName,
      lastName: session.lastName,
      email: session.email,
      vaultId: session.vaultId
    })
    
    // Prepare NMI vault update request
    const nmiParams = new URLSearchParams({
      // Authentication
      security_key: NMI_SECURITY_KEY,
      
      // Update customer vault with new payment token
      customer_vault: 'update_customer',
      customer_vault_id: session.vaultId,
      payment_token: body.payment_token,
      
      // Customer information (keep existing)
      first_name: session.firstName,
      last_name: session.lastName,
      email: session.email,
      
      // Merchant defined fields
      merchant_defined_field_1: 'vault-update',
      merchant_defined_field_2: Date.now().toString()
    })
    
    console.log('🔄 Sending vault update request to NMI...')
    console.log('📋 NMI request parameters:', {
      customer_vault: 'update_customer',
      customer_vault_id: session.vaultId,
      payment_token: body.payment_token.substring(0, 10) + '...',
      first_name: session.firstName,
      last_name: session.lastName,
      email: session.email
    })
    console.log('📍 API URL:', NMI_API_URL)
    console.log('🔑 Using security key:', NMI_SECURITY_KEY.substring(0, 8) + '...')
    console.log('💳 Updating vault:', session.vaultId)
    
    // Make the API request to NMI
    console.log('📡 Making HTTP request to NMI...')
    const nmiResponse = await fetch(NMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: nmiParams.toString()
    })
    
    console.log('📨 NMI HTTP Response received')
    console.log('📊 Response Status:', nmiResponse.status)
    console.log('📊 Response OK:', nmiResponse.ok)
    
    const responseText = await nmiResponse.text()
    console.log('📨 NMI Raw Response Text:', responseText)
    
    // Parse NMI response (it returns query string format)
    const responseParams = new URLSearchParams(responseText)
    const responseData: Record<string, string> = {}
    responseParams.forEach((value, key) => {
      responseData[key] = value
    })
    
    console.log('📊 Parsed NMI Response Object:', responseData)
    console.log('🔍 Key response fields:', {
      response: responseData.response,
      response_code: responseData.response_code,
      responsetext: responseData.responsetext,
      customer_vault_id: responseData.customer_vault_id,
    })
    
    // Check if vault update was successful
    const isSuccess = responseData.response === '1' || responseData.response_code === '100'
    console.log('🎯 Vault update success check:', isSuccess)
    
    if (isSuccess) {
      console.log('✅ Vault update SUCCESS! Payment method updated in NMI.')
      
      // Update session with new vault information if provided
      const updatedVaultId = responseData.customer_vault_id || session.vaultId
      
      // Update session data
      await updateSession({
        ...session,
        vaultId: updatedVaultId,
        lastVaultUpdate: Date.now()
      })
      
      console.log('🍪 Session updated with new vault info')
      
      return NextResponse.json({
        success: true,
        message: 'Payment method updated successfully',
        vaultId: updatedVaultId,
        responseCode: responseData.response_code || '100',
        timestamp: Date.now()
      }, { status: 200 })
      
    } else {
      // Vault update failed
      console.error('❌ Vault update failed')
      console.error('Response code:', responseData.response_code)
      console.error('Response text:', responseData.responsetext)
      
      return NextResponse.json({
        success: false,
        error: responseData.responsetext || 'Failed to update payment method',
        responseCode: responseData.response_code,
        message: responseData.responsetext || 'Vault update was not successful'
      }, { status: 400 })
    }
    
  } catch (error) {
    console.error('❌ Vault update error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Payment method update failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'vault-card-update',
    timestamp: Date.now()
  })
}