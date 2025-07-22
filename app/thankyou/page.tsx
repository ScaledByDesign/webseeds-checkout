'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'

interface Product {
  name: string
  description: string
  image: string
  category?: 'main' | 'upsell1' | 'upsell2'
  bottles?: number
  transactionId: string
  amount: number
  productCode: string
  step?: number
  type: 'main' | 'upsell' | 'bonus'
}

interface OrderData {
  session?: {
    id: string
    email: string
    firstName: string
    lastName: string
    transactionId: string
    vaultId: string
  }
  order?: {
    products: Product[]
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
    totals: {
      subtotal: number
      shipping: number
      tax: number
      total: number
    }
  }
}

export default function ThankYouPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams?.get('session')
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrderData = async () => {
      if (!sessionId) {
        setError('No session ID provided')
        setLoading(false)
        return
      }

      try {
        console.log('📋 Fetching order details for session:', sessionId)
        const response = await fetch(`/api/order/details?session=${sessionId}`)
        const data = await response.json()

        if (data.success) {
          setOrderData(data)
          console.log('✅ Order data loaded:', data)
        } else {
          console.warn('⚠️ No order data found, using session fallback')
          setError('Order details not found')
        }
      } catch (err) {
        console.error('❌ Failed to fetch order data:', err)
        setError('Failed to load order details')
      } finally {
        setLoading(false)
      }
    }

    fetchOrderData()
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your order details...</p>
        </div>
      </div>
    )
  }

  // Fallback data if no order data is available
  const customer = orderData?.order?.customer || orderData?.session || {
    firstName: 'Valued',
    lastName: 'Customer',
    email: 'customer@example.com'
  }

  // Group products by type for display
  const allProducts = orderData?.order?.products || []
  const mainProducts = allProducts.filter(p => p.type === 'main')
  const bonusProducts = allProducts.filter(p => p.type === 'bonus')
  const upsellProducts = allProducts.filter(p => p.type === 'upsell')
  const totals = orderData?.order?.totals || { subtotal: 294, shipping: 0, tax: 0, total: 294 }

  // Generate order number from session ID or timestamp
  const orderNumber = sessionId ? 
    `ORD-${sessionId.split('-')[0]?.slice(-6) || '123456'}` : 
    `ORD-${Date.now().toString().slice(-6)}`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white py-6 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <Image src="/assets/images/Logo.svg" alt="Fitspresso Logo" width={140} height={40} style={{ width: 'auto', height: 'auto' }} priority />
          <p className="text-gray-600 font-medium">Order #{orderNumber}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Thank You Section */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-green-500 rounded-full p-2">
              <Image src="/assets/images/circle-check.svg" alt="Success" width={24} height={24} className="filter brightness-0 invert" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">
                Thank you {customer.firstName}!
              </h1>
              <p className="text-gray-600">Your order is confirmed.</p>
              {sessionId && (
                <p className="text-sm text-gray-500 mt-1">Session: {sessionId}</p>
              )}
            </div>
          </div>

          {/* Video Section */}
          <div className="relative mb-8">
            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <Image
                src="/assets/images/thumbnail.webp"
                alt="Video thumbnail"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                className="object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <button className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-lg transform hover:scale-105 transition-transform">
                  <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
              </div>
              <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded text-sm font-medium">
                Click To Play ↗
              </div>
            </div>
            <div className="bg-red-600 text-white text-center py-3 text-lg font-bold">
              AN IMPORTANT MESSAGE
            </div>
            <div className="bg-gray-600 text-white text-center py-2 text-base">
              From Kristi Before You Start Taking Fitspresso
            </div>
          </div>
        </div>

        {/* Customer & Shipping Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Customer & Billing Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer Information</h3>
            <div className="space-y-2 text-gray-600">
              <div className="flex justify-between">
                <span className="font-medium text-gray-800">Name:</span>
                <span>{customer.firstName} {customer.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-800">Email:</span>
                <span>{customer.email}</span>
              </div>
              {customer.phone && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-800">Phone:</span>
                  <span>{customer.phone}</span>
                </div>
              )}
              
              {/* Billing Address within Customer Info */}
              {customer.address && (
                <>
                  <div className="border-t pt-3 mt-4">
                    <h4 className="font-medium text-gray-800 mb-2">Billing Address</h4>
                    <div className="space-y-1 text-sm">
                      <p>{customer.address}</p>
                      <p>{customer.city}, {customer.state} {customer.zipCode}</p>
                      <p>United States</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Shipping Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Shipping Information</h3>
            <div className="space-y-2 text-gray-600">
              <div className="flex justify-between">
                <span className="font-medium text-gray-800">Method:</span>
                <span>Standard Shipping</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-800">Cost:</span>
                <span className="text-green-600 font-semibold">FREE</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-800">Estimated Delivery:</span>
                <span>5-7 Business Days</span>
              </div>
              
              {/* Shipping Address */}
              <div className="border-t pt-3 mt-4">
                <h4 className="font-medium text-gray-800 mb-2">Shipping Address</h4>
                <div className="space-y-1 text-sm">
                  {customer.address ? (
                    <>
                      <p>{customer.firstName} {customer.lastName}</p>
                      <p>{customer.address}</p>
                      <p>{customer.city}, {customer.state} {customer.zipCode}</p>
                      <p>United States</p>
                    </>
                  ) : (
                    <p className="text-gray-500">Same as billing address</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Order Summary</h3>
          
          <div className="space-y-4">
            {/* All Products - Dynamic based on actual purchases */}
            {allProducts.length > 0 ? (
              allProducts.map((product, index) => (
                <div key={`product-${index}`} className="flex items-center gap-4 pb-4 border-b border-gray-100">
                  <Image src={product.image} alt={product.name} width={60} height={60} style={{ width: 'auto', height: 'auto' }} className="rounded" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{product.name}</h4>
                    <p className="text-sm text-gray-600">{product.description}</p>
                    <div className="flex gap-2 text-xs text-gray-500">
                      {product.bottles && <span>{product.bottles} Bottles</span>}
                      {product.transactionId !== 'BONUS' && <span>• Transaction: {product.transactionId}</span>}
                      {product.type === 'main' && <span>• Most Popular!</span>}
                      {product.type === 'upsell' && <span>• Upsell #{product.step}</span>}
                      {product.type === 'bonus' && <span>• First Time Customer</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    {product.amount > 0 ? (
                      <p className="font-semibold">${product.amount.toFixed(2)}</p>
                    ) : (
                      <p className="text-green-600 font-semibold">FREE</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              // Fallback if no products found
              <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                <Image src="/assets/images/6-bottles.png" alt="Fitspresso" width={60} height={60} style={{ width: 'auto', height: 'auto' }} className="rounded" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800">Fitspresso</h4>
                  <p className="text-sm text-gray-600">6 Bottle Super Pack</p>
                  <p className="text-xs text-gray-500">Most Popular</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">$294.00</p>
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="border-t pt-4">
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Shipping</span>
                <span className="text-green-600 font-semibold">FREE</span>
              </div>
              <div className="flex justify-between py-2 text-lg font-bold">
                <span>Total</span>
                <span>USD ${totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary by Category - only show if there are upsells */}
        {upsellProducts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Order Breakdown</h3>
            
            <div className="space-y-4 text-sm">
              {/* Main Order Total */}
              {mainProducts.length > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Main Order ({mainProducts[0].name})</span>
                  <span className="font-semibold">${mainProducts.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</span>
                </div>
              )}
              
              {/* Upsells Total */}
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Additional Products ({upsellProducts.length} items)</span>
                <span className="font-semibold">${upsellProducts.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</span>
              </div>
              
              {/* Bonuses */}
              {bonusProducts.length > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Free Bonuses ({bonusProducts.length} items)</span>
                  <span className="text-green-600 font-semibold">FREE</span>
                </div>
              )}
              
              <div className="border-t pt-4">
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">All Shipping</span>
                  <span className="text-green-600 font-semibold">FREE</span>
                </div>
                <div className="flex justify-between py-2 text-lg font-bold">
                  <span>Grand Total</span>
                  <span>USD ${totals.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info (only show in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 bg-gray-100 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Debug Info</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Session ID:</strong> {sessionId || 'None'}</p>
              <p><strong>Order Data Available:</strong> {orderData ? 'Yes' : 'No'}</p>
              <p><strong>Products Found:</strong> {orderData?.order?.products?.length || 0}</p>
              <p><strong>Error:</strong> {error || 'None'}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}