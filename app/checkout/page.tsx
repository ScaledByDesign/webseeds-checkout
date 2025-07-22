'use client'

import Image from 'next/image'
import Link from 'next/link'
import CountdownTimer from '@/components/CountdownTimer'
import { ModernCheckoutForm } from '@/components/ModernCheckoutForm'
import { TestCheckoutForm } from '@/components/TestCheckoutForm'
import { CollectJSCheckoutForm } from '@/components/CollectJSCheckoutForm'
import { useState, useEffect, useRef } from 'react'
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

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isExpired, setIsExpired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Payment processing states
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

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
        timestamp: result.timestamp
      }))
      
      // Redirect to thank you page
      setTimeout(() => {
        window.location.href = '/thankyou'
      }, 1000)
    } else if (result.success && result.sessionId) {
      // Handle the old flow with session polling
      console.log('✅ Success! Starting payment processing...')
      sessionStorage.setItem('checkout_session', result.sessionId)
      startPaymentStatusPolling(result.sessionId)
    }
  }

  const handlePaymentError = (errorMessage: string) => {
    console.error('Payment failed:', errorMessage)
    setError(errorMessage)
  }

  const startPaymentStatusPolling = (sessionId: string) => {
    console.log('🔄 Starting payment status polling for session:', sessionId)
    
    setSessionId(sessionId)
    setProcessingStatus('processing')
    setPollCount(0)
    
    // Clear any existing polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }
    
    const pollPaymentStatus = async () => {
      try {
        console.log(`📡 Polling status for session ${sessionId} (attempt ${pollCount + 1})`)
        
        const response = await fetch(`/api/checkout/status/${sessionId}`)
        const data = await response.json()
        
        console.log('📊 Status response:', data)
        setPollCount(prev => prev + 1)
        
        if (data.status === 'succeeded') {
          console.log('✅ Payment succeeded! Redirecting to upsell...')
          setProcessingStatus('completed')
          
          // Clear polling
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          
          // Redirect to first upsell after brief delay
          setTimeout(() => {
            router.push(`/upsell/1?session=${sessionId}&transaction=${data.transactionId}`)
          }, 2000)
          
        } else if (data.status === 'failed') {
          console.log('❌ Payment failed:', data.error)
          setProcessingStatus('failed')
          setError(data.error || 'Payment failed. Please try again.')
          
          // Clear polling
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          
        } else if (pollCount >= 60) { // Stop polling after 5 minutes
          console.log('⏰ Polling timeout')
          setProcessingStatus('failed')
          setError('Payment processing timeout. Please try again.')
          
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
        }
        // Otherwise keep polling (processing state)
        
      } catch (error) {
        console.error('❌ Status polling error:', error)
        
        if (pollCount > 10) { // Give up after too many failed attempts
          setProcessingStatus('failed')
          setError('Unable to verify payment status. Please contact support.')
          
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
        }
      }
    }
    
    // Start polling immediately, then every 5 seconds
    pollPaymentStatus()
    pollIntervalRef.current = setInterval(pollPaymentStatus, 5000)
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  const handleTimerExpire = () => {
    setIsExpired(true)
    alert('Special price has expired! The regular price will now apply.')
  }

  return (
    <>
      <header className="py-6 md:py-8 border-b border-gray-cd">
        <div className="container !px-0 !md:px-10">
          <div className="flex flex-col-reverse md:flex-row justify-between items-center">
            <div className="py-4 md:py-0 flex gap-3 justify-center md:justify-start items-end w-full md:w-auto">
              <Image className="max-w-full w-110" src="/assets/images/Logo.svg" alt="Fitspresso Logo" width={110} height={40} priority />
              <div className="gap-3 hidden md:flex items-center">
                <p className="font-medium text-4xl text-gray-373737 whitespace-nowrap">Secure Checkout</p>
                <Image className="w-7" src="/assets/images/lock.svg" alt="Secure" width={28} height={28} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-2xl text-purple-976987">
                Special Price Reserved For
              </p>
              <div className="bg-purple-976987 text-white px-4 py-2 rounded-lg">
                <CountdownTimer 
                  initialSeconds={599}
                  className="text-white font-bold text-2xl" 
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <div className="grid grid-col-1 md:grid-cols-2">
          <div>
            <div className="md:pr-16 py-8 md:py-12 md:max-w-[56.3rem] md:ml-auto sm:max-w-4xl max-w-full px-6 md:px-0 mx-auto md:mr-0">
              {/* Mobile order summary */}
              <div className="md:hidden mb-8">
                <ul className="flex flex-col gap-6 pb-6 border-b-2 border-gray-cd">
                  <li className="flex justify-between items-center gap-5">
                    <div className="flex gap-4 items-center">
                      <div>
                        <Image className="w-54" src="/assets/images/6-bottles.png" alt="6 Bottle Pack" width={54} height={54} />
                      </div>
                      <div>
                        <h3 className="font-medium text-2.1rem leading-relaxed">
                          Fitspresso <br /> 6 Bottle Super Pack
                        </h3>
                        <p className="text-purple-976987 font-medium text-1.7rem">Most Popular!</p>
                      </div>
                    </div>
                    <div className="font-medium text-2.5rem text-gray-373737 uppercase">$294</div>
                  </li>
                </ul>
                <ul className="pt-6 font-medium text-2.5rem text-gray-373737 flex flex-col gap-3">
                  <li className="flex justify-between items-center">
                    <div>Shipping</div>
                    <div className="uppercase">free</div>
                  </li>
                  <li className="flex justify-between items-center">
                    <div>Total</div>
                    <div className="uppercase">
                      <small className="text-1.63rem font-normal text-gray-656565 mr-2">USD</small> $294
                    </div>
                  </li>
                </ul>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex">
                    <div className="text-red-400">
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Processing Overlay */}
              {processingStatus === 'processing' && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl p-8 max-w-md mx-4 text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Processing Your Payment</h3>
                    <p className="text-gray-600 mb-4">
                      Please wait while we securely process your order. This may take a few moments.
                    </p>
                    <div className="bg-gray-100 rounded-lg p-3">
                      <p className="text-sm text-gray-500">
                        Session: {sessionId?.slice(-8)}... • Attempt {pollCount}/60
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                      Do not close this window or refresh the page
                    </p>
                  </div>
                </div>
              )}

              {/* Success Overlay */}
              {processingStatus === 'completed' && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl p-8 max-w-md mx-4 text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h3>
                    <p className="text-gray-600 mb-4">
                      Your order has been processed successfully. Redirecting to your exclusive upsell offer...
                    </p>
                    <div className="animate-pulse">
                      <div className="h-2 bg-green-200 rounded-full">
                        <div className="h-2 bg-green-600 rounded-full" style={{ width: '75%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Checkout Form */}
              <TestCheckoutForm
                order={order}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                apiEndpoint="/api/checkout/process"
              />

              <div className="flex justify-between px-4 items-center gap-6 mt-8">
                <div>
                  <Image className="h-18" src="/assets/images/mcafee-seeklogo.svg" alt="McAfee" width={72} height={72} style={{ width: 'auto', height: 'auto' }} />
                </div>
                <div>
                  <Image className="h-24" src="/assets/images/Norton.svg" alt="Norton" width={96} height={96} style={{ width: 'auto', height: 'auto' }} />
                </div>
                <div>
                  <Image className="h-19" src="/assets/images/Truste.svg" alt="TRUSTe" width={76} height={76} style={{ width: 'auto', height: 'auto' }} />
                </div>
              </div>

              <div className="md:mt-12 md:border-b-2 border-gray-cd"></div>

              <div className="mt-8 pl-8 hidden md:block">
                <div>
                  <label className="flex items-center gap-5 cursor-pointer select-none">
                    <input type="checkbox" className="peer hidden" />
                    <span className="w-9 h-9 border-[3px] border-gray-666666 flex items-center justify-center rounded-md peer-checked:[&>img]:block">
                      <Image src="/assets/images/check-dark.svg" alt="Check" className="hidden" width={36} height={36} />
                    </span>
                    <span className="text-gray-656565 font-medium text-1.8rem">Get SMS Alerts About Your Order</span>
                  </label>
                  <p className="text-1.7rem max-w-175 text-gray-656565 leading-[1.6]">
                    Stay up to date on your purchase with order confirmation, shipping updates & special customer only discounts.
                  </p>
                </div>
                <div className="mt-6">
                  <p className="text-1.7rem text-gray-656565 font-medium">&copy; 2025 Fitspresso. All Rights Reserved</p>
                  <p className="text-gray-666666 text-1.3rem">
                    These Statements Have Not Been Evaluated By The Food And Drug Administration. This Product Is Not Intended To Diagnose, Treat,
                    Cure Or Prevent Any Disease.
                  </p>
                </div>

                <ul className="mt-6 flex gap-6">
                  <li>
                    <Link className="font-medium underline text-1.8rem text-gray-666666" href="#">
                      Refund Policy
                    </Link>
                  </li>
                  <li>
                    <Link className="font-medium underline text-1.8rem text-gray-666666" href="#">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link className="font-medium underline text-1.8rem text-gray-666666" href="#">
                      Term of Service
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Right Column - Order Summary */}
          <div className="bg-gray-f2">
            {/* Keep the existing order summary content */}
            <div className="md:pl-16 py-8 md:py-12 md:max-w-[56.3rem] md:mr-auto sm:max-w-4xl max-w-full px-6 md:px-0 mx-auto md:ml-0">
              <div>
                <div className="hidden md:block">
                  <ul className="flex flex-col gap-6 pb-6 border-b-2 border-gray-cd">
                    <li className="flex justify-between items-center gap-5">
                      <div className="flex gap-4 items-center">
                        <div>
                          <Image className="w-44" src="/assets/images/6-bottles.png" alt="6 Bottle Pack" width={44} height={44} />
                        </div>
                        <div>
                          <h3 className="font-medium text-2.13rem leading-relaxed">
                            Fitspresso <br /> 6 Bottle Super Pack
                          </h3>
                          <p className="text-purple-976987 font-medium text-1.63rem">Most Popular!</p>
                        </div>
                      </div>
                      <div className="font-medium text-2.38rem text-gray-373737 uppercase">$294</div>
                    </li>
                    <li className="flex justify-between items-center gap-5">
                      <div className="flex gap-4 items-center">
                        <div>
                          <Image className="w-44" src="/assets/images/bonus-ebooks.png" alt="Bonus eBooks" width={44} height={44} />
                        </div>
                        <div>
                          <h3 className="font-medium text-2.13rem leading-relaxed">Bonus eBooks</h3>
                          <p className="text-purple-976987 font-medium text-1.63rem">First Time Customer</p>
                        </div>
                      </div>
                      <div className="font-medium text-2.38rem text-gray-373737 uppercase">Free</div>
                    </li>
                    <li className="flex justify-between items-center gap-5">
                      <div className="flex gap-4 items-center">
                        <div>
                          <Image className="w-44" src="/assets/images/bonus-call.png" alt="Bonus Call" width={44} height={44} />
                        </div>
                        <div>
                          <Image className="w-15" src="/assets/images/shape-1.svg" alt="Shape" width={15} height={15} />
                          <h3 className="font-medium text-2.13rem leading-relaxed">Bonus Coaching Call</h3>
                          <p className="text-purple-976987 font-medium text-1.63rem">Limited Time</p>
                        </div>
                      </div>
                      <div className="font-medium text-2.38rem text-gray-373737 uppercase">Free</div>
                    </li>
                  </ul>
                  <ul className="pt-6 font-medium text-2.19rem text-gray-373737 flex flex-col gap-3">
                    <li className="flex justify-between items-center">
                      <div>Shipping</div>
                      <div className="uppercase">free</div>
                    </li>
                    <li className="flex justify-between items-center">
                      <div>Total</div>
                      <div className="uppercase">
                        <small className="text-1.63rem font-normal text-gray-656565 mr-2">USD</small> $294
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Trust Badges */}
                <ul className="hidden md:flex pt-8 items-center justify-between gap-3 text-purple-976987 font-medium md:text-1.5rem">
                  <li className="flex w-full items-center gap-3.25 border-3 border-purple-986988 bg-white rounded-full px-5 py-2">
                    <Image className="md:w-11.25 w-12" src="/assets/images/circle-check.svg" alt="Check" width={45} height={45} />
                    <span>One-Time Purchase</span>
                  </li>
                  <li className="flex w-full items-center gap-3.25 border-3 border-purple-986988 bg-white rounded-full px-5 py-2">
                    <Image className="md:w-11.25 w-12" src="/assets/images/circle-check.svg" alt="Check" width={45} height={45} />
                    <span>No Hidden Fees</span>
                  </li>
                  <li className="flex w-full items-center gap-3.25 border-3 border-purple-986988 bg-white rounded-full px-5 py-2">
                    <Image className="md:w-11.25 w-12" src="/assets/images/circle-check.svg" alt="Check" width={45} height={45} />
                    <span>Fast, Secure Payment</span>
                  </li>
                </ul>

                {/* Rest of the order summary content remains the same */}
                <div className="mt-8 flex flex-col-reverse md:flex-col">
                  <div className="mt-8 flex flex-col gap-5">
                    <h3 className="text-center font-bold text-2.7rem mb-4">
                      250,000+ Customers! <br /> Your Story Can Be Next
                    </h3>
                    {/* Testimonials and other content... */}
                    <div className="bg-white p-6 border-2 border-purple-916886 md:border-gray-cd rounded-xl">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-4 items-center">
                          <div>
                            <Image
                              className="w-31.75 h-31.75 object-cover"
                              src="/assets/images/olivia.png"
                              alt="Olivia Harris"
                              width={127}
                              height={127}
                            />
                          </div>
                          <div>
                            <h4 className="text-gray-373737 font-bold text-2rem mb-2 leading-none">Olivia Harris</h4>
                            <p className="flex items-center gap-1 font-medium text-1.69rem text-purple-976987">
                              <Image className="w-7.25" src="/assets/images/circle-check.svg" alt="Verified" width={29} height={29} />
                              Verified Customer
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex gap-2 items-center">
                            {[...Array(5)].map((_, i) => (
                              <Image key={i} className="w-7.25" src="/assets/images/star.svg" alt="Star" width={29} height={29} />
                            ))}
                          </div>
                          <span className="inline-block mt-4 px-4 py-1.5 bg-purple-986988 text-white font-bold text-1.45rem rounded-[5rem] leading-none">
                            5 Stars
                          </span>
                        </div>
                      </div>
                      <p className="mt-5 italic font-medium text-1.94rem leading-[1.3] text-gray-373737">
                        &quot;I can hardly believe it, I know longer need my glasses and I feel amazing. I&apos;m a believer.&quot;
                      </p>
                    </div>

                    <div className="bg-white p-6 border-2 border-purple-916886 md:border-gray-cd rounded-xl">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-4 items-center">
                          <div>
                            <Image
                              className="w-31.75 h-31.75 object-cover"
                              src="/assets/images/emily.png"
                              alt="Emily Parker"
                              width={127}
                              height={127}
                            />
                          </div>
                          <div>
                            <h4 className="text-gray-373737 font-bold text-2rem mb-2 leading-none">Emily Parker</h4>
                            <p className="flex items-center gap-1 font-medium text-1.69rem text-purple-976987">
                              <Image className="w-7.25" src="/assets/images/circle-check.svg" alt="Verified" width={29} height={29} />
                              Verified Customer
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex gap-2 items-center">
                            {[...Array(5)].map((_, i) => (
                              <Image key={i} className="w-7.25" src="/assets/images/star.svg" alt="Star" width={29} height={29} />
                            ))}
                          </div>
                          <span className="inline-block mt-4 px-4 py-1.5 bg-purple-986988 text-white font-bold text-1.45rem rounded-[5rem] leading-none">
                            5 Stars
                          </span>
                        </div>
                      </div>
                      <p className="mt-5 italic font-medium text-1.94rem leading-[1.3] text-gray-373737">
                        &quot;I can hardly believe it, I know longer need my glasses and I feel amazing. I&apos;m a believer.&quot;
                      </p>
                    </div>
                  </div>

                  {/* Money Back Guarantee */}
                  <div className="bg-purple-916886 md:bg-white py-8 px-8 border-2 border-purple-916886 rounded-xl mt-8">
                    <div className="flex justify-center items-center gap-6">
                      <div className="w-full text-center">
                        <Image className="w-66 mx-auto" src="/assets/images/money-back.png" alt="Money Back" width={264} height={264} />
                      </div>
                      <div className="w-full">
                        <h3 className="text-[#F6C657] md:text-purple-916885 font-bold text-3.25rem leading-[1.2]">
                          100% <br />
                          Money-Back <br /> Guarantee!
                        </h3>
                      </div>
                    </div>
                    <p className="mt-5 text-center text-1.94rem leading-[1.3] text-white md:text-gray-373737">
                      There&apos;s absolutely zero risk in trying! You will love how Fitspresso makes you feel and transforms your life! If you decide the
                      product isn&apos;t for you, just let us know, and we will refund your money, no questions asked.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

