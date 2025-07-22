import { NextRequest, NextResponse } from 'next/server'
import { getSession, getSessionById } from '@/src/lib/cookie-session'
import { funnelSessionManager } from '@/src/lib/funnel-session'

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
    includeBonuses: true
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
    type: 'bonus'
  },
  {
    name: 'Bonus Coaching Call',
    description: 'Limited Time',
    image: '/assets/images/bonus-call.png',
    type: 'bonus'
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session')
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID required' },
        { status: 400 }
      )
    }
    
    // Get session data from cookie
    let cookieSession = await getSession()
    if (!cookieSession && sessionId) {
      cookieSession = getSessionById(sessionId)
    }
    
    // Get funnel session data
    const funnelSession = funnelSessionManager.getSession(sessionId)
    
    if (!funnelSession && !cookieSession) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }
    
    // Build products array from all sources
    const products: any[] = []
    let totalAmount = 0
    
    // Add main products from funnel session
    if (funnelSession?.products) {
      funnelSession.products.forEach(product => {
        // Map product IDs to catalog codes
        let productCode = product.id
        if (product.id === 'fitspresso-6-pack') {
          productCode = 'FITSPRESSO_6'
        }
        
        const catalogInfo = PRODUCT_CATALOG[productCode] || PRODUCT_CATALOG['FITSPRESSO_6']
        products.push({
          ...catalogInfo,
          ...product,
          transactionId: funnelSession.transactionId || 'pending',
          amount: product.price * product.quantity,
          productCode: productCode,
          type: 'main'
        })
        totalAmount += product.price * product.quantity
        
        // Add bonuses if applicable
        if (catalogInfo.includeBonuses) {
          products.push(...BONUS_PRODUCTS.map(bonus => ({
            ...bonus,
            transactionId: 'BONUS',
            amount: 0,
            productCode: 'BONUS'
          })))
        }
      })
    }
    
    // Add upsells from funnel session
    if (funnelSession?.upsells && funnelSession.upsells.length > 0) {
      funnelSession.upsells.forEach(upsell => {
        const catalogInfo = PRODUCT_CATALOG[upsell.productCode]
        if (catalogInfo) {
          products.push({
            ...catalogInfo,
            transactionId: upsell.transactionId,
            amount: upsell.amount,
            productCode: upsell.productCode,
            step: upsell.step,
            type: 'upsell'
          })
          totalAmount += upsell.amount
        }
      })
    }
    
    // Build response
    const response = {
      success: true,
      session: cookieSession ? {
        id: cookieSession.id,
        email: cookieSession.email,
        firstName: cookieSession.firstName,
        lastName: cookieSession.lastName,
        transactionId: cookieSession.transactionId,
        vaultId: cookieSession.vaultId
      } : null,
      order: {
        products,
        customer: funnelSession?.customerInfo || {
          firstName: cookieSession?.firstName || 'Valued',
          lastName: cookieSession?.lastName || 'Customer',
          email: cookieSession?.email || 'customer@example.com',
          phone: funnelSession?.customerInfo?.phone,
          address: funnelSession?.customerInfo?.address,
          city: funnelSession?.customerInfo?.city,
          state: funnelSession?.customerInfo?.state,
          zipCode: funnelSession?.customerInfo?.zipCode
        },
        totals: {
          subtotal: totalAmount,
          shipping: 0,
          tax: 0,
          total: totalAmount
        }
      }
    }
    
    console.log('📋 Order summary retrieved:', {
      sessionId,
      productCount: products.length,
      totalAmount
    })
    
    return NextResponse.json(response, { status: 200 })
    
  } catch (error) {
    console.error('❌ Order summary retrieval error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve order summary' },
      { status: 500 }
    )
  }
}