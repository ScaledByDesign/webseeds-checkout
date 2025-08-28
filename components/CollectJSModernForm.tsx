'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'

interface FormData {
  email: string
  firstName: string
  lastName: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  phone: string
  nameOnCard: string
  useSameAddress: boolean
}

interface FormErrors {
  [key: string]: string
}

interface CollectJSModernFormProps {
  order: any
  onPaymentSuccess: (result: any) => void
  onPaymentError: (error: string) => void
  autoFillTrigger?: number
  apiEndpoint?: string
}

export function CollectJSModernForm({
  order,
  onPaymentSuccess,
  onPaymentError,
  autoFillTrigger = 0,
  apiEndpoint = '/api/checkout/process'
}: CollectJSModernFormProps) {
  const [loading, setLoading] = useState(false)
  const [collectJSLoaded, setCollectJSLoaded] = useState(false)
  const [paymentToken, setPaymentToken] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const formRef = useRef<HTMLFormElement>(null)
  const submissionDataRef = useRef<FormData | null>(null)
  const scriptLoadedRef = useRef(false)

  const [formData, setFormData] = useState<FormData>({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    phone: '',
    nameOnCard: '',
    useSameAddress: true,
  })

  // Auto-fill with test data when autoFillTrigger changes
  useEffect(() => {
    if (autoFillTrigger > 0) {
      setFormData({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Test Street',
        city: 'Test City',
        state: 'CA',
        zipCode: '12345',
        country: 'US',
        phone: '5551234567',
        nameOnCard: 'John Doe',
        useSameAddress: true,
      })
    }
  }, [autoFillTrigger])

  // Load CollectJS with improved error handling
  useEffect(() => {
    const loadCollectJS = async () => {
      try {
        // Check if already loaded
        if (scriptLoadedRef.current || document.querySelector('script[src*="Collect.js"]')) {
          console.log('CollectJS script already loaded')
          if (window.CollectJS) {
            configureCollectJS()
          }
          return
        }

        // Create a global callback to configure CollectJS
        window.__collectJSCallback = () => {
          configureCollectJS()
        }

        // Load CollectJS script
        const script = document.createElement('script')
        script.src = process.env.NEXT_PUBLIC_COLLECT_JS_URL || 'https://secure.nmi.com/token/Collect.js'
        script.async = true
        script.setAttribute('data-tokenization-key', process.env.NEXT_PUBLIC_NMI_TOKENIZATION_KEY || 'vZ668s-j859wu-6THDmy-kA46Hh')
        // Add callback attribute
        script.setAttribute('data-callback', '__collectJSCallback')
        
        script.onload = () => {
          scriptLoadedRef.current = true
          console.log('CollectJS script loaded')
          // If CollectJS is already available, configure it
          if (window.CollectJS && !window.__collectJSConfigured) {
            configureCollectJS()
          }
        }

        script.onerror = () => {
          onPaymentError('Failed to load payment system. Please refresh and try again.')
        }

        document.body.appendChild(script)

        return () => {
          if (document.body.contains(script)) {
            document.body.removeChild(script)
          }
        }
      } catch (error) {
        onPaymentError('Failed to initialize payment system.')
        console.error('CollectJS loading error:', error)
      }
    }

    const configureCollectJS = () => {
      if (window.__collectJSConfigured) {
        console.log('CollectJS already configured')
        return
      }

      try {
        console.log('Configuring CollectJS...')
        window.CollectJS.configure({
          variant: 'inline',
          styleSniffer: true,
          tokenizationKey: process.env.NEXT_PUBLIC_NMI_TOKENIZATION_KEY || 'vZ668s-j859wu-6THDmy-kA46Hh',
          // Explicitly disable payment request features
          invalidCss: {
            color: 'red'
          },
          focusCss: {
            color: '#373737'
          },
          placeholderCss: {
            color: '#cccccc'
          },
          validCss: {
            color: '#373737'
          },
          customCss: {
            'font-family': 'inherit',
            'font-size': 'inherit'
          },
          fields: {
            ccnumber: {
              selector: '#card-number-field',
              title: 'Card Number',
              placeholder: '•••• •••• •••• ••••'
            },
            ccexp: {
              selector: '#card-expiry-field',
              title: 'Expiration Date',
              placeholder: 'MM/YY'
            },
            cvv: {
              selector: '#card-cvv-field',
              title: 'CVV',
              placeholder: '•••'
            }
          },
          fieldsAvailableCallback: () => {
            setCollectJSLoaded(true)
            console.log('CollectJS fields are ready')
          },
          callback: (response: any) => {
            if (response.token) {
              setPaymentToken(response.token)
              // Use the captured submission data
              handleFormSubmission(response.token, submissionDataRef.current || formData)
            } else {
              onPaymentError('Payment tokenization failed. Please check your card details.')
              setLoading(false)
            }
          }
        })
        window.__collectJSConfigured = true
      } catch (error) {
        console.error('CollectJS configuration error:', error)
        // Ignore PaymentRequestAbstraction errors
        if (!error.message?.includes('PaymentRequestAbstraction')) {
          onPaymentError('Failed to configure payment system.')
        }
      }
    }

    loadCollectJS()
  }, [formData, handleFormSubmission, onPaymentError])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))

    // Clear field error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = (): boolean => {
    const errors: FormErrors = {}
    
    // Required field validation
    if (!formData.email) errors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Valid email is required'
    
    if (!formData.firstName) errors.firstName = 'First name is required'
    if (!formData.lastName) errors.lastName = 'Last name is required'
    if (!formData.address) errors.address = 'Address is required'
    if (!formData.city) errors.city = 'City is required'
    if (!formData.state) errors.state = 'State is required'
    if (!formData.zipCode) errors.zipCode = 'ZIP code is required'
    if (!formData.phone) errors.phone = 'Phone number is required'
    if (!formData.nameOnCard) errors.nameOnCard = 'Name on card is required'

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleFormSubmission = useCallback(async (token: string, submissionData?: FormData) => {
    try {
      // Use passed data if available, otherwise fall back to current formData
      const dataToSubmit = submissionData || formData
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerInfo: {
            email: dataToSubmit.email,
            firstName: dataToSubmit.firstName,
            lastName: dataToSubmit.lastName,
            phone: dataToSubmit.phone,
            address: dataToSubmit.address,
            city: dataToSubmit.city,
            state: dataToSubmit.state,
            zipCode: dataToSubmit.zipCode,
            country: dataToSubmit.country,
          },
          paymentToken: token,
          products: order.items || [
            {
              id: 'fitspresso-6-pack',
              name: 'Fitspresso 6 Bottle Super Pack',
              price: 294,
              quantity: 1,
            }
          ],
          billingInfo: dataToSubmit.useSameAddress ? {
            address: dataToSubmit.address,
            city: dataToSubmit.city,
            state: dataToSubmit.state,
            zipCode: dataToSubmit.zipCode,
            country: dataToSubmit.country,
          } : undefined,
        }),
      })

      const result = await response.json()
      console.log('🔍 API Response:', result)

      if (result.success) {
        console.log('✅ Success! Payment processed')
        onPaymentSuccess(result)
      } else {
        console.log('❌ API returned error:', result)
        onPaymentError(result.error || 'Payment processing failed. Please try again.')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      onPaymentError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [apiEndpoint, formData, onPaymentError, onPaymentSuccess])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (loading) return

    setLoading(true)

    // Validate form
    if (!validateForm()) {
      setLoading(false)
      return
    }

    if (!collectJSLoaded) {
      onPaymentError('Payment system is still loading. Please wait a moment and try again.')
      setLoading(false)
      return
    }

    // Capture form data at submission time to prevent state issues
    submissionDataRef.current = { ...formData }
    console.log('💾 Captured form data for submission:', submissionDataRef.current)

    // Trigger CollectJS tokenization
    try {
      if (window.CollectJS) {
        window.CollectJS.startPaymentRequest()
      } else {
        throw new Error('Payment system not ready')
      }
    } catch (error) {
      onPaymentError('Failed to process payment. Please refresh and try again.')
      setLoading(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <h3 className="mb-6 text-gray-373738 font-medium text-2.7rem">Contact</h3>
      <div>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          className={`w-full border-3 ${formErrors.email ? 'border-red-300' : 'border-gray-cd'} px-9 py-8 focus:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none`}
          placeholder="Email Address (To receive order confirmation email)"
          required
        />
        {formErrors.email && <p className="mt-2 text-red-500 text-sm">{formErrors.email}</p>}
      </div>

      <div className="mt-10">
        <h3 className="mb-6 text-gray-373738 font-medium text-2.7rem">Customer Information</h3>
        <div className="space-y-4">
          <div className="sm:flex justify-between gap-3 sm:space-y-0 space-y-4">
            <div className="w-full">
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={`w-full border-3 ${formErrors.firstName ? 'border-red-300' : 'border-gray-cd'} px-9 py-8 focus:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none bg-gray-f9`}
                placeholder="First Name"
                required
              />
              {formErrors.firstName && <p className="mt-1 text-red-500 text-sm">{formErrors.firstName}</p>}
            </div>
            <div className="w-full">
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={`w-full border-3 ${formErrors.lastName ? 'border-red-300' : 'border-gray-cd'} px-9 py-8 focus:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none bg-gray-f9`}
                placeholder="Last Name"
                required
              />
              {formErrors.lastName && <p className="mt-1 text-red-500 text-sm">{formErrors.lastName}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h3 className="mb-6 text-gray-373738 font-medium text-2.7rem">Shipping</h3>
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className={`w-full border-3 ${formErrors.address ? 'border-red-300' : 'border-gray-cd'} pl-9 pr-17 py-8 focus:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none bg-gray-f9`}
              placeholder="Street Address"
              required
            />
            {formErrors.address && <p className="mt-1 text-red-500 text-sm">{formErrors.address}</p>}
          </div>
          <div className="sm:flex justify-between gap-3 sm:space-y-0 space-y-4">
            <div className="w-full">
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className={`w-full border-3 ${formErrors.city ? 'border-red-300' : 'border-gray-cd'} px-9 py-8 focus:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none bg-gray-f9`}
                placeholder="City"
                required
              />
              {formErrors.city && <p className="mt-1 text-red-500 text-sm">{formErrors.city}</p>}
            </div>
            <div className="w-full">
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className={`w-full border-3 ${formErrors.state ? 'border-red-300' : 'border-gray-cd'} px-9 py-8 focus:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none bg-gray-f9`}
                placeholder="State"
                required
              />
              {formErrors.state && <p className="mt-1 text-red-500 text-sm">{formErrors.state}</p>}
            </div>
            <div className="w-full">
              <input
                type="text"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleInputChange}
                className={`w-full border-3 ${formErrors.zipCode ? 'border-red-300' : 'border-gray-cd'} px-9 py-8 focus:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none bg-gray-f9`}
                placeholder="Zip Code"
                required
              />
              {formErrors.zipCode && <p className="mt-1 text-red-500 text-sm">{formErrors.zipCode}</p>}
            </div>
          </div>
          <div>
            <select
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              className="w-full border-3 border-gray-cd pl-9 pr-17 py-8 focus:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none bg-gray-f9"
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
            </select>
          </div>
          <div className="relative">
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className={`w-full border-3 ${formErrors.phone ? 'border-red-300' : 'border-gray-cd'} pl-9 pr-17 py-8 focus:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none bg-gray-f9`}
              placeholder="Phone Number (For delivery confirmation texts)"
              required
            />
            {formErrors.phone && <p className="mt-1 text-red-500 text-sm">{formErrors.phone}</p>}
            <span className="absolute w-10 top-1/2 right-9 -translate-y-1/2">
              <Image src="/assets/images/info.svg" alt="Info" width={40} height={40} style={{ width: 'auto', height: 'auto' }} />
            </span>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h3 className="mb-5 text-gray-373738 font-medium text-2.7rem">Payment</h3>
        <p className="flex gap-3 mb-4 items-center font-medium text-2.25rem">
          All transactions are secure and encrypted{' '}
          <Image className="w-8" src="/assets/images/lock.svg" alt="Secure" width={32} height={32} />
        </p>
        <div className="space-y-4">
          {/* CollectJS Secure Fields */}
          <div className="relative">
            <div 
              id="card-number-field"
              className="w-full border-3 border-gray-cd pl-9 pr-17 py-8 focus-within:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none bg-gray-f9 min-h-[4rem]"
            />
            <div className="absolute top-1/2 right-9 -translate-y-1/2 flex gap-2">
              <Image className="h-13" src="/assets/images/visa.svg" alt="Visa" width={52} height={52} style={{ width: 'auto', height: 'auto' }} />
              <Image className="h-13" src="/assets/images/mastercard.svg" alt="Mastercard" width={52} height={52} style={{ width: 'auto', height: 'auto' }} />
              <Image className="h-13" src="/assets/images/american-express.svg" alt="American Express" width={52} height={52} style={{ width: 'auto', height: 'auto' }} />
            </div>
          </div>
          <div className="sm:flex justify-between gap-3 sm:space-y-0 space-y-4">
            <div className="w-full">
              <div 
                id="card-expiry-field"
                className="w-full border-3 border-gray-cd px-9 py-8 focus-within:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none bg-gray-f9 min-h-[4rem]"
              />
            </div>
            <div className="relative w-full">
              <div 
                id="card-cvv-field"
                className="w-full border-3 border-gray-cd pl-9 pr-17 py-8 focus-within:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none bg-gray-f9 min-h-[4rem]"
              />
              <span className="absolute w-10 top-1/2 right-9 -translate-y-1/2">
                <Image src="/assets/images/info.svg" alt="Info" width={40} height={40} style={{ width: 'auto', height: 'auto' }} />
              </span>
            </div>
          </div>
          <div>
            <input
              type="text"
              name="nameOnCard"
              value={formData.nameOnCard}
              onChange={handleInputChange}
              className={`w-full border-3 ${formErrors.nameOnCard ? 'border-red-300' : 'border-gray-cd'} px-9 py-8 focus:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none bg-gray-f9`}
              placeholder="Name On Card"
              required
            />
            {formErrors.nameOnCard && <p className="mt-1 text-red-500 text-sm">{formErrors.nameOnCard}</p>}
          </div>

          <div>
            <label className="flex items-center gap-4 cursor-pointer select-none">
              <input 
                type="checkbox" 
                name="useSameAddress"
                checked={formData.useSameAddress}
                onChange={handleInputChange}
                className="hidden peer" 
              />
              <span className="w-9 h-9 border-[3px] border-gray-666666 flex items-center justify-center peer-checked:bg-gray-666666 rounded-md">
                <Image src="/assets/images/check.svg" alt="Check" width={36} height={36} style={{ width: 'auto', height: 'auto' }} />
              </span>
              <span className="text-gray-373738 font-medium text-1.63rem">Use shipping address as payment address</span>
            </label>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <button
          type="submit"
          disabled={loading || !collectJSLoaded}
          className="block py-5 w-full rounded-full bg-yellow-f6c657 text-center font-bold text-3.7rem text-gray-373737 leading-none hover:bg-yellow-f4bd3f transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Complete Your Order'}
        </button>
        
        {!collectJSLoaded && (
          <p className="mt-2 text-center text-sm text-gray-500">Loading secure payment system...</p>
        )}
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
    __collectJSCallback?: () => void
    __collectJSConfigured?: boolean
  }
}