'use client'

export const dynamic = 'force-dynamic'

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
        const response = await fetch(`/api/session/order-summary?session=${sessionId}`)
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
    <div className="font-roboto bg-white">
      {/* Skip Navigation */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-[#986988] text-white px-4 py-2 rounded">
        Skip to main content
      </a>

      {/* Header */}
      <header className="py-8 md:py-15.5 border-b-3 border-[#CDCDCD]">
        <div className="container-max">
          <div className="container">
            <div className="flex-col-reverse flex md:flex-row gap-10 justify-between items-center">
              <div>
                <Image
                  className="max-w-full w-110"
                  src="/assets/images/Logo.svg"
                  alt="Fitspresso Logo"
                  width={220}
                  height={60}
                  loading="eager"
                />
              </div>
              <div>
                <p className="font-medium text-[2.95rem] text-[#666]">Order #{orderNumber}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content">
        <div className="container-max">
          <div className="container">
            <div className="pb-20">
              {/* Thank You Section */}
              <div className="flex justify-center items-center gap-9 my-20">
                <div>
                  <Image
                    className="w-24 md:w-38"
                    src="/assets/images/circle-check-big.svg"
                    alt="Success Checkmark"
                    width={152}
                    height={152}
                    loading="eager"
                  />
                </div>
                <div>
                  <h2 className="font-medium text-[#373738] text-5xl md:text-[5rem] leading-none mb-5">
                    Thank you {customer.firstName}!
                  </h2>
                  <p className="text-[#666] text-4xl md:text-[4.5rem] leading-none">
                    Your order is confirmed.
                  </p>
                </div>
              </div>

              {/* Video Section */}
              <div
                id="videoWrapper"
                className="w-full max-w-full mx-auto relative aspect-video cursor-pointer bg-[#f0f0f0]"
                onClick={() => {
                  // Video click handler - can be implemented later
                  console.log('Video clicked')
                }}
              >
                <Image
                  id="videoThumbnail"
                  src="/assets/images/thumbnail.png"
                  alt="Video thumbnail"
                  fill
                  className="object-cover rounded-lg"
                  loading="eager"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                />
              </div>

              {/* Customer & Shipping Info */}
              <div className="md:px-20 grid grid-cols-1 md:grid-cols-2 gap-20 py-30">
                <div>
                  <h3 className="font-medium text-[#373738] text-[3.7rem] leading-[1.2] mb-12">Customer</h3>
                  <p className="text-[#666] text-[2.95rem] leading-[1.4]">{customer.firstName} {customer.lastName}</p>
                  <p className="text-[#666] text-[2.95rem] leading-[1.4]">{customer.email}</p>
                  {customer.phone && (
                    <p className="text-[#666] text-[2.95rem] leading-[1.4]">{customer.phone}</p>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-[#373738] text-[3.7rem] leading-[1.2] mb-12">Shipping</h3>
                  {customer.address ? (
                    <>
                      <p className="text-[#666] text-[2.95rem] leading-[1.4]">{customer.address}</p>
                      <p className="text-[#666] text-[2.95rem] leading-[1.4]">{customer.city}, {customer.state} {customer.zipCode}</p>
                      <p className="text-[#666] text-[2.95rem] leading-[1.4]">United States</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[#666] text-[2.95rem] leading-[1.4]">Address will be provided</p>
                      <p className="text-[#666] text-[2.95rem] leading-[1.4]">United States</p>
                    </>
                  )}
                </div>
              </div>

              {/* Order Summary */}
              <div className="border-3 border-[#CDCDCD] rounded-4xl pt-20 overflow-hidden">
                <h3 className="font-medium text-[#373738] text-[3.7rem] leading-[1.2] mb-18 pl-10 md:pl-22">
                  Order Summary
                </h3>
                <ul className="flex flex-col gap-30 pb-10 md:pb-16 px-10 md:px-22 border-b-3 border-[#CDCDCD]">
                  {/* Main Product */}
                  <li className="flex justify-between items-center gap-5">
                    <div className="flex gap-8 md:gap-13 items-center">
                      <div className="max-w-40 md:max-w-44">
                        <picture>
                          <source srcSet="/assets/images/6-bottles.webp" type="image/webp" />
                          <Image
                            className="w-full max-w-40 md:max-w-44"
                            src="/assets/images/6-bottles.png"
                            alt="6 Bottle Pack"
                            width={181}
                            height={144}
                            loading="lazy"
                            style={{ aspectRatio: '181/144', objectFit: 'contain' }}
                          />
                        </picture>
                      </div>
                      <div>
                        <h3 className="font-medium text-[2.5rem] md:text-[2.13rem] leading-relaxed">
                          Fitspresso<br />6 Bottle Super Pack
                        </h3>
                        <p className="text-[#976987] font-medium text-[1.63rem]">Most Popular!</p>
                      </div>
                    </div>
                    <div className="font-medium text-[2.38rem] text-[#373737] uppercase">$294</div>
                  </li>

                  {/* Bonus eBooks */}
                  <li className="flex justify-between items-center gap-5">
                    <div className="flex gap-8 md:gap-13 items-center">
                      <div className="max-w-40 md:max-w-44">
                        <picture>
                          <source srcSet="/assets/images/bonus-ebooks.webp" type="image/webp" />
                          <Image
                            className="w-full max-w-40 md:max-w-44"
                            src="/assets/images/bonus-ebooks.png"
                            alt="Bonus eBooks"
                            width={176}
                            height={176}
                            loading="lazy"
                          />
                        </picture>
                      </div>
                      <div>
                        <h3 className="font-medium text-[2.5rem] md:text-[2.13rem] leading-relaxed">
                          Bonus eBooks
                        </h3>
                        <p className="text-[#976987] font-medium text-[1.63rem]">First Time Customer</p>
                      </div>
                    </div>
                    <div className="font-medium text-[2.38rem] text-[#373737] uppercase">Free</div>
                  </li>

                  {/* Bonus Coaching Call */}
                  <li className="flex justify-between items-center gap-5">
                    <div className="flex gap-8 md:gap-13 items-center">
                      <div className="max-w-40 md:max-w-44">
                        <picture>
                          <source srcSet="/assets/images/bonus-call.webp" type="image/webp" />
                          <Image
                            className="w-full max-w-40 md:max-w-44"
                            src="/assets/images/bonus-call.png"
                            alt="Bonus Call"
                            width={160}
                            height={142}
                            loading="lazy"
                            style={{ aspectRatio: '160/142', objectFit: 'contain' }}
                          />
                        </picture>
                      </div>
                      <div>
                        <h3 className="font-medium text-[2.5rem] md:text-[2.13rem] leading-relaxed">
                          Bonus Coaching Call
                        </h3>
                        <p className="text-[#976987] font-medium text-[1.63rem]">Limited Time</p>
                      </div>
                    </div>
                    <div className="font-medium text-[2.38rem] text-[#373737] uppercase">Free</div>
                  </li>
                </ul>

                {/* Totals */}
                <ul className="pt-16 font-medium text-[2.19rem] text-[#373737] flex flex-col gap-5 px-10 md:px-22">
                  <li className="flex justify-between items-center">
                    <div>Shipping</div>
                    <div className="uppercase">free</div>
                  </li>
                  <li className="flex justify-between items-center">
                    <div>Total</div>
                    <div className="uppercase">
                      <small className="text-[1.63rem] font-normal text-[#656565] mr-2">USD</small>
                      ${totals.total.toFixed(0)}
                    </div>
                  </li>
                </ul>
              </div>

              {/* Addons Section - only show if there are upsells */}
              {upsellProducts.length > 0 && (
                <div className="border-3 border-[#CDCDCD] mt-20 rounded-4xl pt-20 overflow-hidden">
                  <h3 className="font-medium text-[#373738] text-[3.7rem] leading-[1.2] mb-18 pl-10 md:pl-22">
                    Addons
                  </h3>
                  <ul className="flex flex-col gap-30 pb-10 md:pb-16 px-10 md:px-22 border-b-3 border-[#CDCDCD]">
                    {upsellProducts.map((product, index) => (
                      <li key={`upsell-${index}`} className="flex justify-between items-center gap-5">
                        <div className="flex gap-8 md:gap-13 items-center">
                          <div className="max-w-40 md:max-w-44">
                            <picture>
                              <source srcSet="/assets/images/6-bottles.webp" type="image/webp" />
                              <Image
                                className="w-full max-w-40 md:max-w-44"
                                src={product.image || "/assets/images/6-bottles.png"}
                                alt={product.name}
                                width={181}
                                height={144}
                                loading="lazy"
                                style={{ aspectRatio: '181/144', objectFit: 'contain' }}
                              />
                            </picture>
                          </div>
                          <div>
                            <h3 className="font-medium text-[2rem] md:text-[2.13rem] leading-relaxed">
                              {product.name}
                            </h3>
                            <p className="text-[#976987] font-medium text-[1.63rem]">{product.description}</p>
                          </div>
                        </div>
                        <div className="font-medium text-[2.38rem] text-[#373737] uppercase">
                          ${product.amount.toFixed(0)}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <ul className="md:pt-16 md:pb-13 p-10 md:px-22 font-medium text-[2.19rem] text-[#373737] bg-[#F2F2F2] flex flex-col gap-5">
                    <li className="flex justify-between items-center">
                      <div>Shipping</div>
                      <div className="uppercase">free</div>
                    </li>
                    <li className="flex justify-between items-center">
                      <div>Total</div>
                      <div className="uppercase">
                        <small className="text-[1.63rem] font-normal text-[#656565] mr-2">USD</small>
                        ${upsellProducts.reduce((sum, p) => sum + p.amount, 0).toFixed(0)}
                      </div>
                    </li>
                  </ul>
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
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}