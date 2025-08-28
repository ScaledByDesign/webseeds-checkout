'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { NewDesignCheckoutForm } from '@/components/NewDesignCheckoutForm'
import { useRouter } from 'next/navigation'

export default function CheckoutLevel3Page() {
  const router = useRouter()
  const [autoFillTrigger, setAutoFillTrigger] = useState(0)

  // Sample order data
  const order = {
    items: [
      {
        id: 'fitspresso-6-pack',
        name: 'Fitspresso 6 Bottle Super Pack',
        price: 294,
        quantity: 1
      }
    ],
    total: 294,
    shipping: 0,
    tax: 0
  }

  const handlePaymentSuccess = (result: any) => {
    console.log('✅ Level 3 Payment successful:', result)
    
    // Store success data
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('checkoutSuccess', JSON.stringify(result))
    }
    
    // Redirect to success page
    router.push('/success')
  }

  const handlePaymentError = (errorMessage: string) => {
    console.error('❌ Level 3 Payment failed:', errorMessage)
    alert(`Payment Error: ${errorMessage}`)
  }

  const handleAutoFill = () => {
    setAutoFillTrigger(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="pb-4 bg-white">
        <div className="container-max">
          <div className="container !px-0 !md:px-10">
            <div className="flex items-center justify-between py-5.5">
              <Link href="/" className="flex items-center">
                <Image
                  src="/assets/images/logo.svg"
                  alt="Fitspresso"
                  width={200}
                  height={41.55}
                  className="w-110 h-auto"
                  priority
                />
              </Link>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-[#6d6d6d] font-medium text-[1.94rem]">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Level 3 Secure Checkout
                </div>
                <div
                  className="py-5.5 px-6 md:bg-[#986988] font-bold text-[#bf4e6f] md:text-white text-[4.5rem] leading-none rounded-2xl countdown-timer"
                  role="timer"
                >
                  15:00
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Level 3 Data Collection Checkout
            </h1>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-green-800 mb-1">Enhanced Level 3 Processing</h3>
                  <p className="text-green-700 text-sm">
                    This checkout form collects comprehensive customer and product data for Level 3 processing, 
                    which can result in lower interchange fees and better transaction reporting.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Comparison Links */}
            <div className="flex gap-4 mb-6">
              <Link 
                href="/checkout" 
                className="text-blue-600 hover:text-blue-800 underline"
              >
                View Original Checkout
              </Link>
              <button
                onClick={handleAutoFill}
                className="text-purple-600 hover:text-purple-800 underline"
              >
                Auto-Fill Test Data
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Left Column - Checkout Form */}
            <div className="lg:order-1">
              <NewDesignCheckoutForm
                order={order}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                autoFillTrigger={autoFillTrigger}
              />
            </div>

            {/* Right Column - Order Summary + Level 3 Info */}
            <div className="lg:order-2 space-y-6">
              {/* Order Summary */}
              <div className="bg-gray-50 p-6 rounded-xl">
                <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
                <div className="space-y-4">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-gray-700">{item.name} x {item.quantity}</span>
                      <span className="font-medium">${item.price}</span>
                    </div>
                  ))}
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span>${order.total}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Level 3 Benefits */}
              <div className="bg-blue-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Level 3 Processing Benefits</h3>
                <ul className="space-y-2 text-blue-800 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Lower interchange fees for B2B transactions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Enhanced transaction reporting and analytics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Detailed customer and product data collection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Improved fraud detection and prevention</span>
                  </li>
                </ul>
              </div>

              {/* Technical Details */}
              <div className="bg-gray-100 p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Technical Implementation</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-500 mt-1">•</span>
                    <span>CollectJS inline tokenization with styleSniffer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-500 mt-1">•</span>
                    <span>Level 3 data payload to /api/nmi-direct</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-500 mt-1">•</span>
                    <span>Customer, product, and billing data collection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-500 mt-1">•</span>
                    <span>Enhanced error handling and validation</span>
                  </li>
                </ul>
              </div>

              {/* Console Logs to Watch */}
              <div className="bg-yellow-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-yellow-900 mb-3">Console Logs to Watch</h3>
                <div className="text-yellow-800 text-sm space-y-1 font-mono">
                  <div>✅ Configuring CollectJS with Level 3...</div>
                  <div>✅ CollectJS fields ready for Level 3...</div>
                  <div>🚀 Starting Level 3 tokenization...</div>
                  <div>✅ Token received for Level 3 processing</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
