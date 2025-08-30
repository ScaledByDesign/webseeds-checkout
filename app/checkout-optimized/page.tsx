'use client'

export const dynamic = 'force-dynamic'

import Image from 'next/image'
import Link from 'next/link'

import { NewDesignCheckoutForm } from '@/components/NewDesignCheckoutForm-optimized'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// Order data for the form
const order = {
  items: [
    {
      id: 'fitspresso-6-pack',
      name: 'Fitspresso 6 Bottle Super Pack',
      price: 294,
      quantity: 1,
    }
  ]
}

interface ValidationError {
  field: string
  message: string
  userFriendlyMessage: string
  suggestions: string[]
}

export default function CheckoutOptimizedPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isExpired, setIsExpired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [autoFillTrigger, setAutoFillTrigger] = useState(0)
  const [systemBannerMessage, setSystemBannerMessage] = useState<string | null>(null)

  // Card update modal state
  const [cardUpdateErrorMessage, setCardUpdateErrorMessage] = useState('')

  // Payment processing states
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Timer state - matching design implementation
  const [timerMinutes, setTimerMinutes] = useState(9)
  const [timerSeconds, setTimerSeconds] = useState(59)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Handle error messages from URL parameters
  useEffect(() => {
    const errorParam = searchParams?.get('error')
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
      // Clear the error param from URL without refreshing
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      window.history.replaceState({}, '', url.pathname)
    }
  }, [searchParams])

  const startPaymentStatusPolling = useCallback((sessionId: string) => {
    console.log('🔄 Starting payment status polling for session:', sessionId)
    setPollCount(0)
    
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    // Start polling
    pollIntervalRef.current = setInterval(async () => {
      setPollCount(prev => prev + 1)
      
      try {
        const response = await fetch(`/api/checkout/status/${sessionId}`)
        const data = await response.json()
        
        console.log(`📊 Poll #${pollCount + 1} status:`, data.status)
        
        if (data.status === 'completed') {
          console.log('✅ Payment processing completed!')
          setProcessingStatus('completed')
          
          // Clear the interval
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          
          // Redirect to success page or next step
          if (data.vaultId) {
            // Has vault ID, go to upsell
            router.push(`/upsell/1?session=${sessionId}&transaction=${data.transactionId}`)
          } else {
            // No vault ID, go to thank you
            router.push(`/thankyou?session=${sessionId}&transaction=${data.transactionId}`)
          }
        } else if (data.status === 'failed') {
          console.log('❌ Payment failed')
          setProcessingStatus('failed')
          
          // Clear the interval
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          
          // Show error
          setError(data.error || 'Payment processing failed')
        } else if (pollCount >= 30) {
          // Stop after 30 attempts (30 seconds)
          console.log('⏱️ Polling timeout')
          
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          
          setProcessingStatus('failed')
          setError('Payment processing timeout. Please try again.')
        }
      } catch (err) {
        console.error('❌ Polling error:', err)
      }
    }, 1000) // Poll every second
  }, [router, pollCount])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // Timer countdown - matching design implementation
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimerSeconds((prevSeconds) => {
        if (prevSeconds === 0) {
          setTimerMinutes((prevMinutes) => {
            if (prevMinutes === 0) {
              setIsExpired(true)
              if (timerRef.current) {
                clearInterval(timerRef.current)
              }
              return 0
            }
            return prevMinutes - 1
          })
          return 59
        }
        return prevSeconds - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const handlePaymentSuccess = (result: any) => {
    console.log('🎉 Payment successful!', result)

    if (result.success && result.transactionId) {
      console.log('✅ Payment completed successfully!')

      // Store transaction details for success page
      sessionStorage.setItem('transaction_result', JSON.stringify({
        transactionId: result.transactionId,
        authCode: result.authCode,
        responseCode: result.responseCode,
        amount: result.amount,
        timestamp: result.timestamp,
        vaultId: result.vaultId,
        sessionId: result.sessionId
      }))

      // Check if we have a session for upsells
      if (result.sessionId && result.vaultId) {
        console.log('🎯 Redirecting to upsell with session:', result.sessionId)
        // Store session for upsell flow
        sessionStorage.setItem('checkout_session', result.sessionId)
        sessionStorage.setItem('main_transaction', result.transactionId)

        // Redirect to first upsell page
        setTimeout(() => {
          router.push(`/upsell/1?session=${result.sessionId}&transaction=${result.transactionId}`)
        }, 1500)
      } else {
        // No upsell flow, go directly to thank you
        console.log('🎯 No vault ID, skipping upsells, going to thank you')
        setTimeout(() => {
          router.push(`/thankyou?session=${result.sessionId || 'direct'}&transaction=${result.transactionId}`)
        }, 1500)
      }
    } else if (result.status === 'processing') {
      // Payment is being processed asynchronously
      console.log('⏳ Payment processing started, polling for status...')
      setProcessingStatus('processing')
      setSessionId(result.sessionId)
      
      // Start polling for payment status
      startPaymentStatusPolling(result.sessionId)
      
      // Redirect to processing page
      router.push(`/checkout/processing?session=${result.sessionId}`)
    } else {
      // Handle other success scenarios
      console.log('✅ Operation successful but no transaction ID')
      router.push('/thankyou')
    }
  }

  const handlePaymentError = (errorMsg: string, errors?: Record<string, string>, duplicateSessionId?: string) => {
    console.error('❌ Payment error:', errorMsg, errors)
    
    // Stop any polling if running
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    
    setProcessingStatus('failed')
    
    // Check if this is a duplicate transaction error
    if (duplicateSessionId || errorMsg.toLowerCase().includes('duplicate')) {
      console.log('🔄 Duplicate transaction detected, redirecting to upsell')
      // Redirect to upsell with the duplicate session ID
      router.push(`/upsell/1?session=${duplicateSessionId || 'duplicate'}&duplicate=true`)
      return
    }
    
    // Check for declined transaction (card update needed)
    if (errorMsg.includes('declined') || errorMsg.includes('Card declined')) {
      setCardUpdateErrorMessage(errorMsg)
      setShowValidationModal(true)
      return
    }
    
    setError(errorMsg)
    
    // Handle validation errors
    if (errors && Object.keys(errors).length > 0) {
      const validationErrorList: ValidationError[] = Object.entries(errors).map(([field, message]) => ({
        field,
        message,
        userFriendlyMessage: getUserFriendlyMessage(field, message),
        suggestions: getSuggestions(field, message)
      }))
      setValidationErrors(validationErrorList)
      setShowValidationModal(true)
    }
  }

  const getUserFriendlyMessage = (field: string, message: string): string => {
    // Map technical field names to user-friendly messages
    const messageMap: Record<string, string> = {
      'email': 'Please check your email address',
      'phone': 'Please check your phone number',
      'address': 'Please verify your address',
      'card': 'Please check your card details',
      'cvv': 'Please check your security code',
      'exp': 'Please check your expiration date'
    }
    return messageMap[field] || message
  }

  const getSuggestions = (field: string, message: string): string[] => {
    // Provide helpful suggestions based on the field
    const suggestionsMap: Record<string, string[]> = {
      'email': ['Make sure your email includes @ symbol', 'Check for typos in the domain'],
      'phone': ['Use 10-digit format', 'Remove special characters except dashes'],
      'card': ['Check card number for typos', 'Ensure card is not expired'],
      'cvv': ['3 digits on back of card', '4 digits on front for Amex'],
      'exp': ['Use MM/YY format', 'Check if card is expired']
    }
    return suggestionsMap[field] || []
  }

  const handleAutoFillClick = () => {
    console.log('Auto-fill button clicked')
    setAutoFillTrigger(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Countdown Timer Banner - Matching design implementation */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white py-3 px-4 text-center sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-center space-x-2">
          <span className="text-lg font-bold">⏰ HURRY! Your Order is Reserved for:</span>
          <div className="inline-flex items-center space-x-1 bg-white/20 px-3 py-1 rounded-md">
            <span className="font-mono text-2xl font-bold">
              {String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}
            </span>
          </div>
          {isExpired && (
            <span className="ml-2 text-yellow-300 animate-pulse">Time's Up!</span>
          )}
        </div>
      </div>

      {/* System Banner for important messages */}
      {systemBannerMessage && (
        <div className="bg-blue-600 text-white py-2 px-4 text-center">
          <p>{systemBannerMessage}</p>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
            <button
              onClick={() => setError(null)}
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
            >
              <span className="text-red-500">×</span>
            </button>
          </div>
        )}

        {/* Processing Status */}
        {processingStatus === 'processing' && (
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-3"></div>
              <span>Processing your payment... Please wait.</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Checkout Form */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-900">
              Complete Your Order (Optimized Version)
            </h1>
            
            {/* Test Mode Banner */}
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                🧪 This is the optimized checkout using the shared CollectJS service
              </p>
            </div>

            <NewDesignCheckoutForm
              order={order}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
              autoFillTrigger={autoFillTrigger}
            />
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:sticky lg:top-24 h-fit">
            {/* Auto-fill button for testing */}
            <button
              onClick={handleAutoFillClick}
              className="mb-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              🎯 Auto-fill Test Data
            </button>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900">Order Summary</h2>
              
              {/* Product items */}
              <div className="space-y-4 mb-6">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                    </div>
                    <p className="font-semibold text-gray-900">${item.price}</p>
                  </div>
                ))}
              </div>

              {/* Price breakdown */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <p className="text-gray-600">Subtotal</p>
                  <p className="font-medium text-gray-900">$294.00</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-gray-600">Shipping</p>
                  <p className="font-medium text-green-600">FREE</p>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <p className="text-gray-900">Total</p>
                  <p className="text-gray-900">$294.00</p>
                </div>
              </div>

              {/* Security badges */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-center space-x-4">
                  <Image
                    src="/checkout/secure-checkout.png"
                    alt="Secure Checkout"
                    width={100}
                    height={40}
                    className="h-10 w-auto"
                  />
                  <Image
                    src="/checkout/ssl-encrypted.png"
                    alt="SSL Encrypted"
                    width={100}
                    height={40}
                    className="h-10 w-auto"
                  />
                </div>
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Why Choose Us?</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">60-Day Money Back Guarantee</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">FDA Registered Facility</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">GMP Certified Manufacturing</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">Made in the USA</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Error Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4 text-red-600">
              {cardUpdateErrorMessage ? 'Payment Declined' : 'Please Check Your Information'}
            </h3>
            
            {cardUpdateErrorMessage ? (
              <div className="space-y-3">
                <p className="text-gray-700">{cardUpdateErrorMessage}</p>
                <p className="text-sm text-gray-600">
                  Please update your payment information and try again.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {validationErrors.map((error, index) => (
                  <div key={index} className="border-l-4 border-red-500 pl-4">
                    <p className="font-semibold text-gray-900">{error.userFriendlyMessage}</p>
                    {error.suggestions.length > 0 && (
                      <ul className="mt-1 text-sm text-gray-600">
                        {error.suggestions.map((suggestion, idx) => (
                          <li key={idx}>• {suggestion}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <button
              onClick={() => {
                setShowValidationModal(false)
                setCardUpdateErrorMessage('')
              }}
              className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Got it, I'll fix it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}