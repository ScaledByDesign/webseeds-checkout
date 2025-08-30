import { NextRequest, NextResponse } from 'next/server'
import { getSession, getSessionById } from '@/src/lib/cookie-session'
import { funnelSessionManager } from '@/src/lib/funnel-session'
import { databaseSessionManager } from '@/src/lib/database-session-manager'

// Data validation utilities for order summary
interface OrderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  completeness: number; // 0-100 percentage
}

function validateOrderData(orderData: any): OrderValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let completenessScore = 0;
  const maxScore = 100;

  if (!orderData) {
    return {
      isValid: false,
      errors: ['Order data is null or undefined'],
      warnings: [],
      completeness: 0
    };
  }

  // Check products (40 points)
  if (orderData.products && Array.isArray(orderData.products) && orderData.products.length > 0) {
    completenessScore += 40;

    // Validate each product
    orderData.products.forEach((product: any, index: number) => {
      if (!product.name) warnings.push(`Product ${index + 1} missing name`);
      if (!product.price || product.price <= 0) warnings.push(`Product ${index + 1} invalid price`);
      if (!product.productCode) warnings.push(`Product ${index + 1} missing product code`);
    });
  } else {
    errors.push('Missing or empty products array');
  }

  // Check customer information (30 points)
  if (orderData.customer) {
    let customerScore = 0;
    const requiredFields = ['firstName', 'lastName', 'email', 'address', 'city', 'state', 'zipCode'];

    requiredFields.forEach(field => {
      if (orderData.customer[field]) {
        customerScore += 30 / requiredFields.length;
      } else {
        warnings.push(`Missing customer field: ${field}`);
      }
    });

    completenessScore += customerScore;
  } else {
    errors.push('Missing customer information');
  }

  // Check totals (20 points)
  if (orderData.totals) {
    if (orderData.totals.total && orderData.totals.total > 0) {
      completenessScore += 15;
    } else {
      warnings.push('Invalid or missing total amount');
    }

    if (orderData.totals.subtotal !== undefined) {
      completenessScore += 5;
    }
  } else {
    warnings.push('Missing totals information');
  }

  // Check session information (10 points)
  if (orderData.session && orderData.session.id) {
    completenessScore += 10;
  } else {
    warnings.push('Missing session information');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    completeness: Math.round(completenessScore)
  };
}

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

    // Also check database session manager for checkout orders
    let databaseSession = null
    try {
      databaseSession = await databaseSessionManager.getSession(sessionId)
      console.log('📋 Database session found:', databaseSession ? 'Yes' : 'No')
      if (databaseSession) {
        console.log('📊 Database session structure:')
        console.log(`  🆔 ID: ${databaseSession.id}`)
        console.log(`  📊 Status: ${databaseSession.status}`)
        console.log(`  💳 Transaction ID: ${databaseSession.transaction_id}`)
        console.log(`  🏦 Vault ID: ${databaseSession.vault_id}`)
        console.log(`  📦 Products field: ${databaseSession.products ? 'Present' : 'Missing'}`)
        console.log(`  📋 Metadata: ${databaseSession.metadata ? 'Present' : 'Missing'}`)
        if (databaseSession.metadata) {
          console.log(`  📦 Metadata products: ${databaseSession.metadata.products ? 'Present' : 'Missing'}`)
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch database session:', error)
    }

    if (!funnelSession && !cookieSession && !databaseSession) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }
    
    // Build products array from all sources (DATABASE SESSION FIRST - PRIMARY SOURCE)
    const products: any[] = []
    let totalAmount = 0
    let productsSource = 'none'

    // PRIORITY 1: Database session (primary source for checkout orders)
    if (databaseSession) {
      console.log('🎯 Using DATABASE SESSION as primary source')
      productsSource = 'database'

      let dbProducts = null

      // Try to get products from multiple possible locations
      try {
        // First, try metadata.products (new format)
        if (databaseSession.metadata?.products) {
          console.log('📦 Found products in metadata.products')
          dbProducts = Array.isArray(databaseSession.metadata.products)
            ? databaseSession.metadata.products
            : JSON.parse(databaseSession.metadata.products)
        }
        // Fallback to direct products field (old format)
        else if (databaseSession.products) {
          console.log('📦 Found products in direct products field')
          dbProducts = typeof databaseSession.products === 'string'
            ? JSON.parse(databaseSession.products)
            : databaseSession.products
        }

        if (dbProducts && Array.isArray(dbProducts)) {
          console.log(`📦 Processing ${dbProducts.length} products from database session`)

          dbProducts.forEach((product: any, index: number) => {
            console.log(`📦 Processing product ${index + 1}:`, product)

            // Map product IDs to catalog codes
            let productCode = product.id
            if (product.id === 'fitspresso-6-pack') {
              productCode = 'FITSPRESSO_6'
            }

            const catalogInfo = PRODUCT_CATALOG[productCode] || PRODUCT_CATALOG['FITSPRESSO_6']
            const productAmount = product.price * product.quantity

            const processedProduct = {
              ...catalogInfo,
              ...product,
              transactionId: databaseSession.transaction_id || 'pending',
              amount: productAmount,
              productCode: productCode,
              type: 'main'
            }

            products.push(processedProduct)
            totalAmount += productAmount

            console.log(`✅ Added product: ${product.name} ($${productAmount})`)

            // Add bonuses if applicable
            if (catalogInfo.includeBonuses) {
              const bonusProducts = BONUS_PRODUCTS.map(bonus => ({
                ...bonus,
                transactionId: 'BONUS',
                amount: 0,
                productCode: 'BONUS'
              }))
              products.push(...bonusProducts)
              console.log(`🎁 Added ${bonusProducts.length} bonus products`)
            }
          })
        } else {
          console.warn('⚠️ No valid products array found in database session')
        }
      } catch (error) {
        console.error('❌ Failed to parse database session products:', error)
        console.error('📊 Database session products data:', databaseSession.products)
        console.error('📊 Database session metadata:', databaseSession.metadata)
      }
    }

    // PRIORITY 2: Funnel session (fallback for legacy orders)
    if (products.length === 0 && funnelSession?.products) {
      console.log('🎯 Using FUNNEL SESSION as fallback source')
      productsSource = 'funnel'
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

    // Database session products are now handled as PRIORITY 1 above

    // PRIORITY 1: Add upsells from database session (primary source)
    if (databaseSession?.metadata?.upsells) {
      console.log('🎯 Using DATABASE SESSION for upsells (primary)')
      try {
        const dbUpsells = Array.isArray(databaseSession.metadata.upsells)
          ? databaseSession.metadata.upsells
          : JSON.parse(databaseSession.metadata.upsells)

        console.log(`📦 Found ${dbUpsells.length} upsells in database session`)

        dbUpsells.forEach((upsell: any, index: number) => {
          console.log(`📦 Processing upsell ${index + 1}:`, upsell)

          const catalogInfo = PRODUCT_CATALOG[upsell.productCode]
          if (catalogInfo) {
            const processedUpsell = {
              ...catalogInfo,
              transactionId: upsell.transactionId,
              amount: upsell.amount,
              productCode: upsell.productCode,
              step: upsell.step,
              type: 'upsell'
            }

            products.push(processedUpsell)
            totalAmount += upsell.amount

            console.log(`✅ Added upsell: ${catalogInfo.name} ($${upsell.amount})`)
          } else {
            console.warn(`⚠️ No catalog info found for upsell product: ${upsell.productCode}`)
          }
        })
      } catch (error) {
        console.error('❌ Failed to parse database session upsells:', error)
      }
    }

    // PRIORITY 2: Add upsells from funnel session (fallback - only if no database upsells)
    const hasDbUpsells = databaseSession?.metadata?.upsells &&
      (Array.isArray(databaseSession.metadata.upsells) ? databaseSession.metadata.upsells.length > 0 : true)

    if (!hasDbUpsells && funnelSession?.upsells && funnelSession.upsells.length > 0) {
      console.log('🎯 Using FUNNEL SESSION for upsells (fallback)')
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
          console.log(`✅ Added funnel upsell: ${catalogInfo.name} ($${upsell.amount})`)
        }
      })
    }

    // Also check order details cache for upsells (fallback)
    if (!funnelSession?.upsells || funnelSession.upsells.length === 0) {
      try {
        console.log('🔍 Checking order details cache for upsells...')
        const baseUrl = new URL(request.url).origin
        const orderResponse = await fetch(`${baseUrl}/api/order/details?session=${sessionId}`)
        const orderData = await orderResponse.json()

        if (orderData.success && orderData.order?.upsells) {
          console.log(`📦 Found ${orderData.order.upsells.length} upsells in order cache`)
          orderData.order.upsells.forEach((upsell: any) => {
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
      } catch (error) {
        console.warn('⚠️ Failed to fetch order details cache:', error)
      }
    }
    
    // Build response - PRIORITIZE DATABASE SESSION for session data
    const response = {
      success: true,
      session: (() => {
        // PRIORITY 1: Database session (primary source)
        if (databaseSession) {
          console.log('🎯 Using DATABASE SESSION for response session data')
          console.log('📊 Database session fields:', {
            id: databaseSession.id,
            email: databaseSession.email,
            transaction_id: databaseSession.transaction_id,
            vault_id: databaseSession.vault_id,
            status: databaseSession.status,
            current_step: databaseSession.current_step
          })

          return {
            id: databaseSession.id,
            email: databaseSession.email,
            firstName: databaseSession.customer_info?.firstName || databaseSession.first_name,
            lastName: databaseSession.customer_info?.lastName || databaseSession.last_name,
            transactionId: databaseSession.transaction_id,
            vaultId: databaseSession.vault_id,
            status: databaseSession.status,
            currentStep: databaseSession.current_step
          }
        }

        // PRIORITY 2: Cookie session (fallback)
        if (cookieSession) {
          console.log('🎯 Using COOKIE SESSION for response session data (fallback)')
          return {
            id: cookieSession.id,
            email: cookieSession.email,
            firstName: cookieSession.firstName,
            lastName: cookieSession.lastName,
            transactionId: cookieSession.transactionId,
            vaultId: cookieSession.vaultId
          }
        }

        // No session data available
        console.log('⚠️ No session data available for response')
        return null
      })(),
      order: {
        products,
        customer: await (async () => {
          console.log(`🎯 Customer info source priority: DATABASE SESSION FIRST`)

          // PRIORITY 1: Database session (primary source)
          if (databaseSession) {
            console.log('🎯 Using DATABASE SESSION for customer info');
            try {
              const customerInfo = typeof databaseSession.customer_info === 'string'
                ? JSON.parse(databaseSession.customer_info)
                : databaseSession.customer_info

              return {
                firstName: customerInfo?.firstName || databaseSession.first_name || cookieSession?.firstName || 'Valued',
                lastName: customerInfo?.lastName || databaseSession.last_name || cookieSession?.lastName || 'Customer',
                email: databaseSession.email || cookieSession?.email || 'customer@example.com',
                phone: customerInfo?.phone || databaseSession.phone,
                address: customerInfo?.address || databaseSession.address,
                city: customerInfo?.city || databaseSession.city,
                state: customerInfo?.state || databaseSession.state,
                zipCode: customerInfo?.zipCode || databaseSession.zip_code
              }
            } catch (error) {
              console.warn('⚠️ Failed to parse database customer info:', error)
            }
          }

          // PRIORITY 2: Funnel session (fallback)
          if (funnelSession?.customerInfo) {
            console.log('🎯 Using FUNNEL SESSION for customer info (fallback)')
            return funnelSession.customerInfo
          }

          // PRIORITY 3: Order cache (fallback)
          try {
            const baseUrl = new URL(request.url).origin
            const orderResponse = await fetch(`${baseUrl}/api/order/details?session=${sessionId}`)
            const orderData = await orderResponse.json()

            if (orderData.success && orderData.order?.customer) {
              console.log('📋 Using customer info from order cache')
              return orderData.order.customer
            }
          } catch (error) {
            console.warn('⚠️ Failed to fetch customer from order cache:', error)
          }

          // Final fallback to cookie session
          return {
            firstName: cookieSession?.firstName || 'Valued',
            lastName: cookieSession?.lastName || 'Customer',
            email: cookieSession?.email || 'customer@example.com',
            phone: funnelSession?.customerInfo?.phone,
            address: funnelSession?.customerInfo?.address,
            city: funnelSession?.customerInfo?.city,
            state: funnelSession?.customerInfo?.state,
            zipCode: funnelSession?.customerInfo?.zipCode
          }
        })(),
        totals: {
          subtotal: totalAmount,
          shipping: 0,
          tax: 0,
          total: totalAmount
        }
      }
    }
    
    // Validate order data completeness before returning
    console.log('🔍 Validating order data completeness...');
    const orderValidation = validateOrderData(response.order);

    console.log('📋 Order summary retrieved:', {
      sessionId,
      productCount: products.length,
      totalAmount,
      productsSource,
      databaseSessionAvailable: !!databaseSession,
      funnelSessionAvailable: !!funnelSession,
      cookieSessionAvailable: !!cookieSession,
      validationStatus: orderValidation.isValid ? 'VALID' : 'INVALID',
      completeness: `${orderValidation.completeness}%`,
      errors: orderValidation.errors.length,
      warnings: orderValidation.warnings.length
    })

    if (!orderValidation.isValid) {
      console.error('❌ Order validation failed:', orderValidation.errors);
    }

    if (orderValidation.warnings.length > 0) {
      console.warn('⚠️ Order validation warnings:', orderValidation.warnings);
    }

    // Add validation metadata to response
    const enhancedResponse = {
      ...response,
      validation: {
        isValid: orderValidation.isValid,
        completeness: orderValidation.completeness,
        errors: orderValidation.errors,
        warnings: orderValidation.warnings
      }
    };

    return NextResponse.json(enhancedResponse, { status: 200 })
    
  } catch (error) {
    console.error('❌ Order summary retrieval error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve order summary' },
      { status: 500 }
    )
  }
}