import { NextRequest, NextResponse } from 'next/server'
import { legacyCookieSessionManager } from '@/src/lib/unified-session-manager'
const { getSession, getSessionById } = legacyCookieSessionManager

// Product catalog for mapping product codes
const PRODUCT_CATALOG: Record<string, {
  name: string
  description: string
  image: string
  category: 'main' | 'upsell1' | 'upsell2'
  bottles?: number
  includeBonuses?: boolean
}> = {
  'FITSPRESSO_6': {
    name: 'Fitspresso',
    description: '6 Bottle Super Pack',
    image: '/assets/images/6-bottles.png',
    category: 'main',
    bottles: 6,
    includeBonuses: true // Main product includes free bonuses
  },
  'RC12_296': {
    name: 'RetinaClear',
    description: '12 Bottle Super Savings Bundle',
    image: '/assets/images/6-bottles.png',
    category: 'upsell1',
    bottles: 12
  },
  'RC6_144': {
    name: 'RetinaClear',
    description: '6 Bottle Ultra Discount',
    image: '/assets/images/6-bottles.png',
    category: 'upsell1',
    bottles: 6
  },
  'SA6_149': {
    name: 'Sightagen',
    description: '6 Bottle Super Savings Bundle',
    image: '/assets/images/6-bottles.png',
    category: 'upsell2',
    bottles: 6
  },
  'SA3_099': {
    name: 'Sightagen',
    description: '3 Bottle Ultra Discount',
    image: '/assets/images/6-bottles.png',
    category: 'upsell2',
    bottles: 3
  }
}

// Bonus products that come with main purchase
const BONUS_PRODUCTS = [
  {
    name: 'Bonus eBooks',
    description: 'First Time Customer',
    image: '/assets/images/bonus-ebooks.png',
    price: 0,
    type: 'bonus'
  },
  {
    name: 'Bonus Coaching Call',
    description: 'Limited Time',
    image: '/assets/images/bonus-call.png',
    price: 0,
    type: 'bonus'
  }
]

// Simple in-memory order tracking (in production, use a database)
const orderCache = new Map<string, {
  mainOrder: {
    transactionId: string
    amount: number
    productCode: string
    timestamp: number
  }
  upsells: Array<{
    transactionId: string
    amount: number
    productCode: string
    step: number
    timestamp: number
  }>
  customer: {
    firstName: string
    lastName: string
    email: string
    phone?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
  }
}>()

export async function POST(request: NextRequest) {
  console.log('🛒 Order details POST request received')
  console.log('📍 Current cache state:', {
    size: orderCache.size,
    keys: Array.from(orderCache.keys())
  })
  try {
    const body = await request.json()
    console.log('📦 Request body:', JSON.stringify(body, null, 2))
    
    if (body.action === 'add_order') {
      // Store order details when checkout completes
      const { sessionId, transactionId, amount, productCode, customer } = body
      
      console.log(`📦 Adding main order for session: ${sessionId}`)
      
      const existingOrder = orderCache.get(sessionId) || {
        mainOrder: null,
        upsells: [],
        customer: null
      }
      
      existingOrder.mainOrder = {
        transactionId,
        amount,
        productCode: productCode || 'FITSPRESSO_6',
        timestamp: Date.now()
      }
      
      existingOrder.customer = customer
      
      orderCache.set(sessionId, existingOrder)
      
      console.log('✅ Order stored successfully:', sessionId, transactionId)
      console.log('📊 Current cache size:', orderCache.size)
      console.log('📋 Stored order:', existingOrder)
      
      return NextResponse.json({ success: true, message: 'Order stored' })
      
    } else if (body.action === 'add_upsell') {
      // Store upsell details when upsell completes
      const { sessionId, transactionId, amount, productCode, step } = body
      
      const existingOrder = orderCache.get(sessionId)
      if (!existingOrder) {
        return NextResponse.json(
          { success: false, error: 'No main order found' },
          { status: 404 }
        )
      }
      
      existingOrder.upsells.push({
        transactionId,
        amount,
        productCode,
        step,
        timestamp: Date.now()
      })
      
      orderCache.set(sessionId, existingOrder)
      
      console.log('🎯 Upsell stored:', sessionId, transactionId, productCode)
      
      return NextResponse.json({ success: true, message: 'Upsell stored' })
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('❌ Order details storage error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to store order details' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  console.log('📋 Order details GET request received')
  console.log('📍 Current cache state:', {
    size: orderCache.size,
    keys: Array.from(orderCache.keys())
  })
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session')
    
    console.log('🔍 Requested session ID:', sessionId)
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID required' },
        { status: 400 }
      )
    }
    
    // Try to get session data first
    let session = await getSession()
    if (!session && sessionId) {
      session = getSessionById(sessionId)
    }
    
    // Get order data from cache
    const orderData = orderCache.get(sessionId)
    
    if (!orderData && !session) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }
    
    // Build products array with actual purchased items
    const products: any[] = []
    
    // Add main product if exists
    if (orderData?.mainOrder) {
      const mainProduct = PRODUCT_CATALOG[orderData.mainOrder.productCode] || PRODUCT_CATALOG['FITSPRESSO_6']
      products.push({
        ...mainProduct,
        transactionId: orderData.mainOrder.transactionId,
        amount: orderData.mainOrder.amount,
        productCode: orderData.mainOrder.productCode,
        type: 'main'
      })
      
      // Add bonus products if main product includes bonuses
      if (mainProduct.includeBonuses) {
        products.push(...BONUS_PRODUCTS.map(bonus => ({
          ...bonus,
          transactionId: 'BONUS',
          amount: 0,
          productCode: 'BONUS',
          type: 'bonus'
        })))
      }
    }
    
    // Add upsell products
    if (orderData?.upsells) {
      products.push(...orderData.upsells.map(upsell => ({
        ...PRODUCT_CATALOG[upsell.productCode] || { name: 'Unknown Product', description: '', image: '' },
        transactionId: upsell.transactionId,
        amount: upsell.amount,
        productCode: upsell.productCode,
        step: upsell.step,
        type: 'upsell'
      })))
    }

    // Build response with available data
    const response = {
      success: true,
      session: session ? {
        id: session.id,
        email: session.email,
        firstName: session.firstName,
        lastName: session.lastName,
        transactionId: session.transactionId,
        vaultId: session.vaultId ? 'present' : 'absent'
      } : null,
      order: orderData ? {
        mainOrder: orderData.mainOrder,
        upsells: orderData.upsells,
        customer: orderData.customer,
        products,
        totals: {
          subtotal: (orderData.mainOrder?.amount || 0) + orderData.upsells.reduce((sum, upsell) => sum + upsell.amount, 0),
          shipping: 0, // Free shipping
          tax: 0, // Will need to calculate if needed
          total: (orderData.mainOrder?.amount || 0) + orderData.upsells.reduce((sum, upsell) => sum + upsell.amount, 0)
        }
      } : null
    }
    
    console.log('📋 Order details retrieved for session:', sessionId)
    
    return NextResponse.json(response, { status: 200 })
    
  } catch (error) {
    console.error('❌ Order details retrieval error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve order details' },
      { status: 500 }
    )
  }
}