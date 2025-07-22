'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

interface PaymentStatus {
  status: 'processing' | 'succeeded' | 'failed' | 'expired'
  transactionId?: string
  error?: string
  orderDetails?: {
    orderId: string
    orderNumber: string
    amount: number
    customerName: string
  }
}

export default function ProcessingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams?.get('session')
  
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ status: 'processing' })
  const [loading, setLoading] = useState(true)
  const [pollCount, setPollCount] = useState(0)
  const [timeElapsed, setTimeElapsed] = useState(0)

  // Timer for elapsed time display
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Status polling effect
  useEffect(() => {
    if (!sessionId) {
      router.push('/checkout')
      return
    }

    let pollInterval: NodeJS.Timeout

    const pollPaymentStatus = async () => {
      try {
        const response = await fetch(`/api/test-status/${sessionId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch payment status')
        }

        const data = await response.json()
        setPaymentStatus(data)
        setLoading(false)
        setPollCount(prev => prev + 1)

        // Handle different status outcomes
        if (data.status === 'succeeded') {
          // Clear polling interval
          if (pollInterval) clearInterval(pollInterval)
          
          // Redirect to first upsell page after brief delay
          setTimeout(() => {
            router.push(`/upsell/1?session=${sessionId}&transaction=${data.transactionId}`)
          }, 2000)
        } else if (data.status === 'failed') {
          // Clear polling interval
          if (pollInterval) clearInterval(pollInterval)
          
          // Redirect back to checkout with error after brief delay
          setTimeout(() => {
            router.push(`/checkout?error=${encodeURIComponent(data.error || 'Payment failed')}`)
          }, 3000)
        } else if (data.status === 'expired' || pollCount > 60) {
          // Stop polling after 5 minutes (60 polls at 5-second intervals)
          if (pollInterval) clearInterval(pollInterval)
          
          setTimeout(() => {
            router.push('/checkout?error=Payment session expired. Please try again.')
          }, 2000)
        }

      } catch (error) {
        console.error('Error polling payment status:', error)
        
        // If we've tried many times and still failing, give up
        if (pollCount > 20) {
          if (pollInterval) clearInterval(pollInterval)
          setPaymentStatus({ 
            status: 'failed', 
            error: 'Unable to verify payment status. Please contact support.' 
          })
          setLoading(false)
        }
      }
    }

    // Poll immediately, then every 5 seconds
    pollPaymentStatus()
    pollInterval = setInterval(pollPaymentStatus, 5000)

    // Cleanup interval on unmount
    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [sessionId, router, pollCount])

  const getStatusMessage = () => {
    switch (paymentStatus.status) {
      case 'processing':
        return {
          title: 'Processing Your Payment...',
          message: 'Please wait while we securely process your order. This usually takes just a few moments.',
          icon: '/assets/images/spinner.svg',
          showSpinner: true
        }
      case 'succeeded':
        return {
          title: 'Payment Successful!',
          message: 'Your order has been processed successfully. Redirecting you to your order confirmation...',
          icon: '/assets/images/circle-check.svg',
          showSpinner: false
        }
      case 'failed':
        return {
          title: 'Payment Failed',
          message: paymentStatus.error || 'There was an issue processing your payment. You will be redirected back to checkout.',
          icon: '/assets/images/error.svg',
          showSpinner: false
        }
      case 'expired':
        return {
          title: 'Session Expired',
          message: 'Your payment session has expired. You will be redirected back to checkout to try again.',
          icon: '/assets/images/error.svg',
          showSpinner: false
        }
      default:
        return {
          title: 'Processing Your Payment...',
          message: 'Please wait while we securely process your order.',
          icon: '/assets/images/spinner.svg',
          showSpinner: true
        }
    }
  }

  const statusInfo = getStatusMessage()
  const minutes = Math.floor(timeElapsed / 60)
  const seconds = timeElapsed % 60

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Image 
            className="mx-auto mb-6" 
            src="/assets/images/Logo.svg" 
            alt="Fitspresso Logo" 
            width={120} 
            height={44} 
            priority 
          />
          <div className="flex items-center justify-center gap-2 text-purple-976987">
            <Image 
              className="w-6" 
              src="/assets/images/lock.svg" 
              alt="Secure" 
              width={24} 
              height={24} 
            />
            <span className="font-medium text-lg">Secure Checkout</span>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
          {/* Status Icon */}
          <div className="mb-6">
            {statusInfo.showSpinner ? (
              <div className="w-16 h-16 mx-auto">
                <div className="animate-spin w-16 h-16 border-4 border-purple-976987 border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <div className="w-16 h-16 mx-auto">
                <Image 
                  src={statusInfo.icon} 
                  alt="Status" 
                  width={64} 
                  height={64}
                  className={`w-full h-full ${
                    paymentStatus.status === 'succeeded' ? 'text-green-600' : 
                    paymentStatus.status === 'failed' || paymentStatus.status === 'expired' ? 'text-red-600' : 
                    'text-purple-976987'
                  }`}
                />
              </div>
            )}
          </div>

          {/* Status Title */}
          <h1 className={`text-2xl font-bold mb-4 ${
            paymentStatus.status === 'succeeded' ? 'text-green-600' : 
            paymentStatus.status === 'failed' || paymentStatus.status === 'expired' ? 'text-red-600' : 
            'text-gray-900'
          }`}>
            {statusInfo.title}
          </h1>

          {/* Status Message */}
          <p className="text-gray-600 mb-6 leading-relaxed">
            {statusInfo.message}
          </p>

          {/* Progress Indicators */}
          {paymentStatus.status === 'processing' && (
            <div className="space-y-4">
              {/* Time Elapsed */}
              <div className="text-sm text-gray-500">
                Time elapsed: {minutes}:{seconds.toString().padStart(2, '0')}
              </div>

              {/* Processing Steps */}
              <div className="space-y-2 text-left max-w-sm mx-auto">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Payment information verified</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Processing payment</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 ${loading ? 'bg-yellow-400 animate-pulse' : 'bg-gray-300'} rounded-full`}></div>
                  <span className="text-sm text-gray-600">Finalizing order</span>
                </div>
              </div>

              {/* Reassurance Message */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-center space-x-2">
                  <Image 
                    className="w-5" 
                    src="/assets/images/info.svg" 
                    alt="Info" 
                    width={20} 
                    height={20} 
                  />
                  <span className="text-sm text-blue-800 font-medium">
                    Please don't close this page or refresh your browser
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Order Details (if available) */}
          {paymentStatus.orderDetails && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-800 mb-2">Order Details</h3>
              <div className="text-sm text-green-700 space-y-1">
                <div>Order #{paymentStatus.orderDetails.orderNumber}</div>
                <div>Amount: ${paymentStatus.orderDetails.amount}</div>
                <div>Customer: {paymentStatus.orderDetails.customerName}</div>
              </div>
            </div>
          )}

          {/* Debug Info (development only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-3 bg-gray-100 rounded text-xs text-gray-600 text-left">
              <div>Session ID: {sessionId}</div>
              <div>Status: {paymentStatus.status}</div>
              <div>Poll Count: {pollCount}</div>
              <div>Transaction: {paymentStatus.transactionId || 'Pending'}</div>
            </div>
          )}
        </div>

        {/* Security Badges */}
        <div className="flex justify-center items-center gap-6 mt-8 opacity-60">
          <Image 
            className="h-8" 
            src="/assets/images/mcafee-seeklogo.svg" 
            alt="McAfee" 
            width={32} 
            height={32} 
          />
          <Image 
            className="h-10" 
            src="/assets/images/Norton.svg" 
            alt="Norton" 
            width={40} 
            height={40} 
          />
          <Image 
            className="h-8" 
            src="/assets/images/Truste.svg" 
            alt="TRUSTe" 
            width={32} 
            height={32} 
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            &copy; 2025 Fitspresso. All Rights Reserved
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Secure 256-bit SSL encryption
          </p>
        </div>
      </div>
    </div>
  )
}