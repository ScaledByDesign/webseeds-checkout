'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface TestCheckoutFormProps {
  order: any
  onPaymentSuccess: (result: any) => void
  onPaymentError: (error: string, validationErrors?: Record<string, string>) => void
  apiEndpoint?: string
}

export function TestCheckoutForm({ 
  order, 
  onPaymentSuccess, 
  onPaymentError, 
  apiEndpoint 
}: TestCheckoutFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    // Billing address fields (primary)
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingZipCode: '',
    billingCountry: 'US',
    // Shipping address fields (only used when different from billing)
    shippingAddress: '',
    shippingCity: '',
    shippingState: '',
    shippingZipCode: '',
    shippingCountry: 'US',
    phone: '',
    nameOnCard: '',
    useBillingForShipping: true  // When true, use billing address for shipping
  })

  const [collectJSLoaded, setCollectJSLoaded] = useState(false)
  const [paymentToken, setPaymentToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Use ref to ensure CollectJS callback has latest form data
  const formDataRef = useRef(formData)
  formDataRef.current = formData

  // Client-side validation function
  const validateForm = (): Record<string, string> | null => {
    const errors: Record<string, string> = {}
    const currentData = formDataRef.current

    // Check required fields
    if (!currentData.firstName?.trim()) {
      errors.firstName = 'First name is required'
    }
    if (!currentData.lastName?.trim()) {
      errors.lastName = 'Last name is required'
    }
    if (!currentData.email?.trim()) {
      errors.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentData.email)) {
      errors.email = 'Please enter a valid email address'
    }
    if (!currentData.phone?.trim()) {
      errors.phone = 'Phone number is required'
    } else if (!/^\+?[\d\s\-\(\)]+$/.test(currentData.phone.replace(/\s/g, ''))) {
      errors.phone = 'Please enter a valid phone number'
    }
    if (!currentData.billingAddress?.trim()) {
      errors.billingAddress = 'Billing address is required'
    }
    if (!currentData.billingCity?.trim()) {
      errors.billingCity = 'City is required'
    }
    if (!currentData.billingState?.trim()) {
      errors.billingState = 'State is required'
    }
    if (!currentData.billingZipCode?.trim()) {
      errors.billingZipCode = 'ZIP code is required'
    } else if (!/^\d{5}(-\d{4})?$/.test(currentData.billingZipCode)) {
      errors.billingZipCode = 'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)'
    }

    return Object.keys(errors).length > 0 ? errors : null
  }

  // Handle form submission with payment token
  const handleFormSubmission = useCallback(async (token: string) => {
    try {
      // Run client-side validation first
      const validationErrors = validateForm()
      if (validationErrors) {
        console.log('❌ Client-side validation failed:', validationErrors)
        onPaymentError('Please fix the form errors below', validationErrors)
        return
      }

      setLoading(true)

      // Use the ref to get the latest form data
      const currentFormData = formDataRef.current

      console.log('🔍 Current form data at submission:', currentFormData)
      console.log('🔍 Using billing for shipping?', currentFormData.useBillingForShipping)

      // Create FormData for the API (matching the working project structure)
      const formData = new FormData()
      formData.append('payment_token', token)
      formData.append('firstName', currentFormData.firstName)
      formData.append('lastName', currentFormData.lastName)
      formData.append('email', currentFormData.email)
      formData.append('phone', currentFormData.phone || '')
      formData.append('address', currentFormData.useBillingForShipping ? currentFormData.billingAddress : currentFormData.shippingAddress)
      formData.append('city', currentFormData.useBillingForShipping ? currentFormData.billingCity : currentFormData.shippingCity)
      formData.append('state', currentFormData.useBillingForShipping ? currentFormData.billingState : currentFormData.shippingState)
      formData.append('zipCode', currentFormData.useBillingForShipping ? currentFormData.billingZipCode : currentFormData.shippingZipCode)
      formData.append('country', currentFormData.useBillingForShipping ? currentFormData.billingCountry : currentFormData.shippingCountry)

      console.log('Submitting payment to API: /api/payment/process')
      console.log('Form data being sent:', {
        payment_token: token,
        name: `${currentFormData.firstName} ${currentFormData.lastName}`,
        email: currentFormData.email,
        address: currentFormData.useBillingForShipping ? currentFormData.billingAddress : currentFormData.shippingAddress
      })

      // Submit to the payment API - use the new payment/process endpoint
      const response = await fetch('/api/payment/process', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      console.log('API Response:', result)
      console.log('Response Status:', response.status)

      if (result.success) {
        console.log('✅ Payment processed successfully!')
        onPaymentSuccess(result)
      } else {
        console.log('❌ Payment failed:', result.message || result.error)
        if (result.errors) {
          console.log('📋 Validation errors:')
          Object.entries(result.errors).forEach(([field, error]) => {
            console.log(`  - ${field}: ${error}`)
          })

          // Pass structured validation errors to parent
          onPaymentError(result.message || 'Please fix the validation errors below', result.errors)
        } else {
          onPaymentError(result.message || result.error || 'Payment processing failed.')
        }
      }

    } catch (error) {
      console.error('Payment submission error:', error)
      onPaymentError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [onPaymentError, onPaymentSuccess, order])

  // Load CollectJS
  useEffect(() => {
    const loadCollectJS = async () => {
      try {
        // Check if already loaded
        if (document.querySelector('script[src*="Collect.js"]')) {
          if (window.CollectJS) {
            setCollectJSLoaded(true)
            return
          }
        }

        // Load CollectJS script
        const script = document.createElement('script')
        script.src = process.env.NEXT_PUBLIC_COLLECT_JS_URL || 'https://secure.nmi.com/token/Collect.js'
        script.async = true
        script.setAttribute('data-tokenization-key', process.env.NEXT_PUBLIC_NMI_TOKENIZATION_KEY || 'vZ668s-j859wu-6THDmy-kA46Hh')
        
        script.onload = () => {
          console.log('CollectJS script loaded')
          // Wait a bit for full initialization
          setTimeout(() => {
            // Configure CollectJS
            if (window.CollectJS) {
              window.CollectJS.configure({
                paymentSelector: '#payment-button',
                variant: 'inline',
                tokenizationKey: process.env.NEXT_PUBLIC_NMI_TOKENIZATION_KEY || 'vZ668s-j859wu-6THDmy-kA46Hh',
                
                fields: {
                  ccnumber: {
                    selector: '#card-number-field',
                    placeholder: '•••• •••• •••• ••••'
                  },
                  ccexp: {
                    selector: '#card-expiry-field',
                    placeholder: 'MM / YY'
                  },
                  cvv: {
                    display: 'show',
                    selector: '#card-cvv-field',
                    placeholder: '•••'
                  }
                },
                fieldsAvailableCallback: () => {
                  console.log('CollectJS fields are ready')
                  setCollectJSLoaded(true)
                },
                callback: (response: any) => {
                  console.log('CollectJS callback:', response)
                  if (response.token) {
                    console.log('Payment token received:', response.token)
                    setPaymentToken(response.token)
                    handleFormSubmission(response.token)
                  } else {
                    console.error('Tokenization failed:', response)
                    onPaymentError('Payment tokenization failed. Please check your card details.')
                    setLoading(false)
                  }
                },
                timeoutCallback: () => {
                  console.error('Tokenization timeout')
                  onPaymentError('Payment processing timed out. Please try again.')
                  setLoading(false)
                }
              })
            }
          }, 1000)
        }

        script.onerror = () => {
          onPaymentError('Failed to load payment system. Please refresh and try again.')
        }

        document.body.appendChild(script)

      } catch (error) {
        onPaymentError('Failed to initialize payment system.')
        console.error('CollectJS loading error:', error)
      }
    }

    loadCollectJS()
  }, [handleFormSubmission, onPaymentError])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value
    
    console.log(`📝 Input change - ${name}: ${newValue}`)
    
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: newValue
      }
      console.log('📊 Updated form data:', updated)
      return updated
    })
  }



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    let requiredFields = ['email', 'firstName', 'lastName', 'phone', 'nameOnCard', 
                         'billingAddress', 'billingCity', 'billingState', 'billingZipCode']
    
    // Add shipping fields if not using billing for shipping
    if (!formData.useBillingForShipping) {
      requiredFields = [...requiredFields, 'shippingAddress', 'shippingCity', 'shippingState', 'shippingZipCode']
    }
    
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData])
    
    if (missingFields.length > 0) {
      // Convert missing fields to validation errors format
      const validationErrors: Record<string, string> = {}
      missingFields.forEach(field => {
        validationErrors[field] = `${field} is required`
      })
      onPaymentError('Please fill in all required fields', validationErrors)
      return
    }
    
    // Run comprehensive client-side validation
    const validationErrors = validateForm()
    if (validationErrors) {
      console.log('❌ Client-side validation failed:', validationErrors)
      onPaymentError('Please fix the form errors below', validationErrors)
      return
    }
    
    if (!collectJSLoaded) {
      onPaymentError('Payment system is still loading. Please wait a moment and try again.')
      return
    }

    setLoading(true)
    // CollectJS will handle the submission automatically and call the callback
    console.log('Form submitted - CollectJS will handle tokenization')
  }

  const inputStyle = "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-yellow-800 mb-2">🧪 TEST FORM</h3>
        <p className="text-yellow-700 text-sm">
          This is a simplified form to test if inputs work. If this works but the original doesn't, 
          the issue is in the ModernCheckoutForm component.
        </p>
        <button
          type="button"
          onClick={() => {
            // Generate unique data to avoid duplicate transactions
            const timestamp = Date.now()
            const randomNum = Math.floor(Math.random() * 1000)
            const randomZip = `900${Math.floor(Math.random() * 90) + 10}`
            
            setFormData({
              email: `test-${timestamp}@example.com`,
              firstName: 'John',
              lastName: `Test${randomNum}`,
              billingAddress: `${randomNum} Main Street`,
              billingCity: 'Los Angeles',
              billingState: 'CA',
              billingZipCode: randomZip,
              billingCountry: 'US',
              shippingAddress: `${randomNum + 1} Oak Avenue`,
              shippingCity: 'San Francisco',
              shippingState: 'CA',
              shippingZipCode: '94102',
              shippingCountry: 'US',
              phone: `555${String(timestamp).slice(-7)}`,
              nameOnCard: `John Test${randomNum}`,
              useBillingForShipping: true
            })
          }}
          className="mt-3 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-sm"
        >
          Auto-fill with Test Data
        </button>
      </div>

      <div>
        <h3 className="mb-4 text-gray-700 font-medium text-xl">Contact Information</h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              className={inputStyle}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium mb-2">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="First name"
                className={inputStyle}
              />
            </div>
            
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium mb-2">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Last name"
                className={inputStyle}
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-2">Phone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Phone number"
              className={inputStyle}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-gray-700 font-medium text-xl">Billing Address</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="billingAddress" className="block text-sm font-medium mb-2">Address</label>
            <input
              type="text"
              id="billingAddress"
              name="billingAddress"
              value={formData.billingAddress}
              onChange={handleInputChange}
              placeholder="Billing street address"
              className={inputStyle}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="billingCity" className="block text-sm font-medium mb-2">City</label>
              <input
                type="text"
                id="billingCity"
                name="billingCity"
                value={formData.billingCity}
                onChange={handleInputChange}
                placeholder="City"
                className={inputStyle}
              />
            </div>
            
            <div>
              <label htmlFor="billingState" className="block text-sm font-medium mb-2">State</label>
              <input
                type="text"
                id="billingState"
                name="billingState"
                value={formData.billingState}
                onChange={handleInputChange}
                placeholder="CA"
                maxLength={2}
                className={inputStyle}
              />
            </div>
            
            <div>
              <label htmlFor="billingZipCode" className="block text-sm font-medium mb-2">ZIP Code</label>
              <input
                type="text"
                id="billingZipCode"
                name="billingZipCode"
                value={formData.billingZipCode}
                onChange={handleInputChange}
                placeholder="12345"
                className={inputStyle}
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-gray-700 font-medium text-xl">Payment Information</h3>
        <div className="space-y-4">
          {/* CollectJS Card Number Field */}
          <div>
            <label htmlFor="card-number-field" className="block text-sm font-medium mb-2">Card Number</label>
            <div 
              id="card-number-field"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 min-h-[3rem] bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* CollectJS Expiry Field */}
            <div>
              <label htmlFor="card-expiry-field" className="block text-sm font-medium mb-2">Expiry Date</label>
              <div 
                id="card-expiry-field"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 min-h-[3rem] bg-white"
              />
            </div>
            
            {/* CollectJS CVV Field */}
            <div>
              <label htmlFor="card-cvv-field" className="block text-sm font-medium mb-2">CVV</label>
              <div 
                id="card-cvv-field"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 min-h-[3rem] bg-white"
              />
            </div>
          </div>

          {/* Name on Card */}
          <div>
            <label htmlFor="nameOnCard" className="block text-sm font-medium mb-2">Name on Card</label>
            <input
              type="text"
              id="nameOnCard"
              name="nameOnCard"
              value={formData.nameOnCard}
              onChange={handleInputChange}
              placeholder="Name as it appears on card"
              className={inputStyle}
            />
          </div>

          {/* Use Same Address Checkbox */}
          <div className="flex items-center gap-3 mt-4">
            <input
              type="checkbox"
              id="useBillingForShipping"
              name="useBillingForShipping"
              checked={formData.useBillingForShipping}
              onChange={handleInputChange}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="useBillingForShipping" className="text-sm font-medium">
              Use billing address as shipping address
            </label>
          </div>
        </div>
      </div>

      {/* Shipping Address Section - Only show when NOT using billing for shipping */}
      {!formData.useBillingForShipping && (
        <div>
          <h3 className="mb-4 text-gray-700 font-medium text-xl">Shipping Address</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="shippingAddress" className="block text-sm font-medium mb-2">Address</label>
              <input
                type="text"
                id="shippingAddress"
                name="shippingAddress"
                value={formData.shippingAddress}
                onChange={handleInputChange}
                placeholder="Shipping street address"
                className={inputStyle}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="shippingCity" className="block text-sm font-medium mb-2">City</label>
                <input
                  type="text"
                  id="shippingCity"
                  name="shippingCity"
                  value={formData.shippingCity}
                  onChange={handleInputChange}
                  placeholder="Shipping city"
                  className={inputStyle}
                />
              </div>
              
              <div>
                <label htmlFor="shippingState" className="block text-sm font-medium mb-2">State</label>
                <input
                  type="text"
                  id="shippingState"
                  name="shippingState"
                  value={formData.shippingState}
                  onChange={handleInputChange}
                  placeholder="CA"
                  maxLength={2}
                  className={inputStyle}
                />
              </div>
              
              <div>
                <label htmlFor="shippingZipCode" className="block text-sm font-medium mb-2">ZIP Code</label>
                <input
                  type="text"
                  id="shippingZipCode"
                  name="shippingZipCode"
                  value={formData.shippingZipCode}
                  onChange={handleInputChange}
                  placeholder="12345"
                  className={inputStyle}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        id="payment-button"
        type="submit"
        disabled={loading || !collectJSLoaded}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading 
          ? 'Processing Payment...' 
          : !collectJSLoaded 
            ? 'Loading Payment System...' 
            : 'Complete Order'
        }
      </button>
      
      <div className="text-center text-sm text-gray-600 mt-2">
        {!collectJSLoaded && (
          <div className="text-yellow-600">⚠️ Loading secure payment fields...</div>
        )}
        {collectJSLoaded && (
          <div className="text-green-600">✅ Payment system ready</div>
        )}
        {paymentToken && (
          <div className="text-blue-600">🔐 Payment token generated</div>
        )}
      </div>

      <div className="bg-gray-100 rounded-lg p-4">
        <h4 className="font-bold mb-2">Current Form Data:</h4>
        <pre className="text-xs overflow-auto">{JSON.stringify(formData, null, 2)}</pre>
      </div>
    </form>
  )
}

// Extend Window interface for CollectJS
declare global {
  interface Window {
    CollectJS: {
      configure: (config: any) => void
      startPaymentRequest: () => void
    }
  }
}