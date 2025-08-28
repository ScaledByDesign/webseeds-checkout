'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

// CollectJS type declaration
declare global {
  interface Window {
    CollectJS: {
      configure: (config: any) => void
      startPaymentRequest: () => void
    }
  }
}

interface FormData {
  email: string
  firstName: string
  lastName: string
  address: string
  apartment: string
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

interface DesignMatchingCheckoutFormProps {
  order: any
  onPaymentSuccess: (result: any) => void
  onPaymentError: (error: string) => void
  apiEndpoint?: string
}

export function DesignMatchingCheckoutForm({ 
  order, 
  onPaymentSuccess, 
  onPaymentError, 
  apiEndpoint = '/api/checkout/process'
}: DesignMatchingCheckoutFormProps) {
  const [loading, setLoading] = useState(false)
  const [collectJSLoaded, setCollectJSLoaded] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'us',
    phone: '',
    nameOnCard: '',
    useSameAddress: true
  })
  const [errors, setErrors] = useState<FormErrors>({})

  // Initialize CollectJS
  useEffect(() => {
    let scriptElement: HTMLScriptElement | null = null

    const loadCollectJS = () => {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="Collect.js"]')
      if (existingScript) {
        configureCollectJS()
        return
      }

      // Create and load script
      scriptElement = document.createElement('script')
      scriptElement.src = process.env.NEXT_PUBLIC_NMI_COLLECT_JS_URL || 'https://secure.nmi.com/token/Collect.js'
      scriptElement.async = true
      scriptElement.setAttribute('data-tokenization-key', process.env.NEXT_PUBLIC_NMI_TOKENIZATION_KEY || 'vZ668s-j859wu-6THDmy-kA46Hh')

      scriptElement.onload = configureCollectJS
      scriptElement.onerror = () => {
        console.error('Failed to load CollectJS')
        onPaymentError('Failed to load payment system. Please refresh the page.')
      }

      document.body.appendChild(scriptElement)
    }

    const configureCollectJS = () => {
      if (typeof window !== 'undefined' && window.CollectJS) {
        window.CollectJS.configure({
          variant: 'inline',
          styleSniffer: true,
          tokenizationKey: process.env.NEXT_PUBLIC_NMI_TOKENIZATION_KEY || 'vZ668s-j859wu-6THDmy-kA46Hh',
          fields: {
            ccnumber: {
              selector: '#card-number-field',
              title: 'Card Number',
              placeholder: '0000 0000 0000 0000'
            },
            ccexp: {
              selector: '#card-expiry-field',
              title: 'Expiry Date',
              placeholder: 'MM / YY'
            },
            cvv: {
              selector: '#card-cvv-field',
              title: 'Security Code',
              placeholder: '000'
            }
          },
          // Using styleSniffer instead of customCss - CollectJS will inherit container styles
          fieldsAvailableCallback: () => {
            setCollectJSLoaded(true)
            console.log('✅ CollectJS fields ready with styleSniffer approach')
          },
          callback: async (response: any) => {
            if (response.token) {
              try {
                console.log('✅ Payment token received:', response.token)

                // Submit the form with the token using the correct NMI checkout format
                const checkoutData = {
                  customerInfo: {
                    email: formData.email,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    phone: formData.phone
                  },
                  paymentToken: response.token,
                  products: [
                    {
                      id: 'fitspresso-6-pack',
                      name: 'Fitspresso 6 Bottle Super Pack',
                      price: 294,
                      quantity: 1
                    }
                  ],
                  billingInfo: {
                    address: formData.address,
                    city: formData.city,
                    state: formData.state,
                    zipCode: formData.zipCode,
                    country: formData.country.toUpperCase()
                  }
                }

                console.log('📤 Submitting checkout data:', checkoutData)

                const result = await fetch('/api/checkout/process', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(checkoutData)
                })

                const data = await result.json()
                console.log('📥 Checkout response:', data)

                if (data.success) {
                  onPaymentSuccess(data)
                } else {
                  onPaymentError(data.message || 'Payment processing failed.')
                }
              } catch (error) {
                console.error('Order submission error:', error)
                onPaymentError('Failed to process your order. Please try again.')
              } finally {
                setLoading(false)
              }
            } else {
              console.error('Tokenization failed:', response)
              onPaymentError('Payment processing failed. Please check your card details.')
              setLoading(false)
            }
          },
          validationCallback: (field: string, status: boolean, message: string) => {
            console.log(`Field ${field} validation:`, status, message)
          }
        })
      }
    }

    // Check if CollectJS is already loaded
    if (typeof window !== 'undefined' && window.CollectJS) {
      configureCollectJS()
    } else {
      loadCollectJS()
    }

    // Cleanup function
    return () => {
      if (scriptElement && scriptElement.parentNode) {
        scriptElement.parentNode.removeChild(scriptElement)
      }
    }
  }, [onPaymentError, formData, order, onPaymentSuccess])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.email) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid'
    
    if (!formData.firstName) newErrors.firstName = 'First name is required'
    if (!formData.lastName) newErrors.lastName = 'Last name is required'
    if (!formData.address) newErrors.address = 'Address is required'
    if (!formData.city) newErrors.city = 'City is required'
    if (!formData.state) newErrors.state = 'State is required'
    if (!formData.zipCode) newErrors.zipCode = 'ZIP code is required'
    if (!formData.country) newErrors.country = 'Country is required'
    if (!formData.phone) newErrors.phone = 'Phone number is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    if (!collectJSLoaded) {
      onPaymentError('Payment system is still loading. Please wait a moment and try again.')
      return
    }

    setLoading(true)

    try {
      // Trigger CollectJS tokenization
      if (window.CollectJS) {
        window.CollectJS.startPaymentRequest()
      } else {
        throw new Error('CollectJS not available')
      }
    } catch (error) {
      console.error('Payment submission error:', error)
      onPaymentError('Payment processing failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} id="checkout-form">
      {/* Contact Section */}
      <h3 className="mt:8 mb:4 sm:mt-16 sm:mb-8 text-[#373738] font-medium sm:text-[2.7rem] text-[3.5rem]">
        Contact
      </h3>
      <div className="floating-label-group">
        <input
          type="email"
          id="email"
          name="email"
          className="w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9]"
          placeholder=" "
          required
          autoComplete="email"
          aria-required="true"
          inputMode="email"
          value={formData.email}
          onChange={handleInputChange}
        />
        <label
          htmlFor="email"
          className="floating-label bg-transparent sm:hidden block">
          Email
          <span className="text-[1.6rem] text-[#a2a2a2]">
            (To receive order confirmation email)
          </span>
        </label>
        <label
          htmlFor="email"
          className="floating-label bg-transparent hidden sm:block">
          Email Address
        </label>
        {errors.email && (
          <div
            id="email-error"
            className="text-2xl mt-2 error-message"
            style={{ color: '#dc2626' }}>
            {errors.email}
          </div>
        )}
      </div>

      {/* Shipping Section */}
      <div className="mt-16">
        <h3 className="mt:8 mb:4 sm:mt-16 sm:mb-8 text-[#373738] font-medium sm:text-[2.7rem] text-[3.5rem]">
          Shipping
        </h3>
        <div className="space-y-8">
          {/* First Name & Last Name */}
          <div className="sm:flex justify-between gap-7 space-y-8 sm:space-y-0">
            <div className="w-full floating-label-group">
              <input
                type="text"
                id="firstName"
                name="firstName"
                className="w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9]"
                placeholder=" "
                required
                autoComplete="given-name"
                value={formData.firstName}
                onChange={handleInputChange}
              />
              <label htmlFor="firstName" className="floating-label bg-transparent">
                First Name
              </label>
              {errors.firstName && (
                <div className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }}>
                  {errors.firstName}
                </div>
              )}
            </div>
            <div className="w-full floating-label-group">
              <input
                type="text"
                id="lastName"
                name="lastName"
                className="w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9]"
                placeholder=" "
                required
                autoComplete="family-name"
                value={formData.lastName}
                onChange={handleInputChange}
              />
              <label htmlFor="lastName" className="floating-label bg-transparent">
                Last Name
              </label>
              {errors.lastName && (
                <div className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }}>
                  {errors.lastName}
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="floating-label-group">
            <input
              type="text"
              id="address"
              name="address"
              className="w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9]"
              placeholder=" "
              required
              autoComplete="address-line1"
              value={formData.address}
              onChange={handleInputChange}
            />
            <label htmlFor="address" className="floating-label bg-transparent">
              Street Address
            </label>
            {errors.address && (
              <div className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }}>
                {errors.address}
              </div>
            )}
          </div>

          {/* Apartment */}
          <div className="floating-label-group">
            <input
              type="text"
              id="apartment"
              name="apartment"
              className="w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9]"
              placeholder=" "
              autoComplete="address-line2"
              value={formData.apartment}
              onChange={handleInputChange}
            />
            <label htmlFor="apartment" className="floating-label bg-transparent">
              Apartment, suite, etc (optional)
            </label>
          </div>

          {/* City, State, ZIP */}
          <div className="sm:flex justify-between gap-7 space-y-8 sm:space-y-0">
            <div className="w-full floating-label-group">
              <input
                type="text"
                id="city"
                name="city"
                className="w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9]"
                placeholder=" "
                required
                autoComplete="address-level2"
                value={formData.city}
                onChange={handleInputChange}
              />
              <label htmlFor="city" className="floating-label bg-transparent">
                City
              </label>
              {errors.city && (
                <div className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }}>
                  {errors.city}
                </div>
              )}
            </div>
            <div className="w-full floating-label-group">
              <input
                type="text"
                id="state"
                name="state"
                className="w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9]"
                placeholder=" "
                required
                autoComplete="address-level1"
                value={formData.state}
                onChange={handleInputChange}
              />
              <label htmlFor="state" className="floating-label bg-transparent">
                State
              </label>
              {errors.state && (
                <div className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }}>
                  {errors.state}
                </div>
              )}
            </div>
            <div className="w-full floating-label-group">
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                className="w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9]"
                placeholder=" "
                required
                autoComplete="postal-code"
                pattern="[0-9]{5}(-[0-9]{4})?"
                inputMode="numeric"
                value={formData.zipCode}
                onChange={handleInputChange}
              />
              <label htmlFor="zipCode" className="floating-label bg-transparent">
                ZIP Code
              </label>
              {errors.zipCode && (
                <div className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }}>
                  {errors.zipCode}
                </div>
              )}
            </div>
          </div>

          {/* Country */}
          <div className="floating-label-group relative">
            <select
              id="country"
              name="country"
              className="w-full border-2 border-[#CDCDCD] pl-9 pr-16 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] appearance-none"
              required
              autoComplete="country"
              value={formData.country}
              onChange={handleInputChange}
            >
              <option value="" disabled></option>
              <option value="us">United States</option>
              <option value="ca">Canada</option>
              <option value="uk">United Kingdom</option>
              <option value="au">Australia</option>
              <option value="nz">New Zealand</option>
            </select>
            <label htmlFor="country" className="floating-label bg-transparent">
              Country
            </label>
            {/* Custom chevron */}
            <div className="absolute top-1/2 right-6 -translate-y-1/2 pointer-events-none">
              <svg className="w-6 h-6 text-[#666666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {errors.country && (
              <div className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }}>
                {errors.country}
              </div>
            )}
          </div>

          {/* Phone */}
          <div className="floating-label-group">
            <input
              type="tel"
              id="phone"
              name="phone"
              className="w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9]"
              placeholder=" "
              required
              autoComplete="tel"
              inputMode="tel"
              value={formData.phone}
              onChange={handleInputChange}
            />
            <label htmlFor="phone" className="floating-label bg-transparent">
              Phone Number
            </label>
            {errors.phone && (
              <div className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }}>
                {errors.phone}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Section */}
      <div className="mt-7.5 relative">
        <h3 className="mt:40 sm:mt:0 mb-4 text-[#373738] font-medium sm:text-[2.7rem] text-[3.5rem]">
          Payment
        </h3>
        <p className="text-[1.6rem] sm:text-[1.2rem] text-[#666666] mb-8 flex items-center gap-2">
          All transactions are secure and encrypted
          <img src="/assets/images/secure.svg" alt="Secure" className="h-5 w-5" />
        </p>
        <div className="space-y-8">
          {/* Card Number */}
          <div className="floating-label-group always-float relative">
            <div
              id="card-number-field"
              className="collectjs-field collectjs-card-number"
            ></div>
            <label htmlFor="card-number-field" className="floating-label bg-transparent">Card Number</label>
            {/* Card brand icons matching design */}
            <div className="absolute top-1/2 right-4 -translate-y-1/2 flex gap-2">
              <img
                className="h-14"
                src="/assets/images/visa.svg"
                alt="Visa"
                width="52"
                height="52"
              />
              <img
                className="h-14"
                src="/assets/images/mastercard.svg"
                alt="Mastercard"
                width="52"
                height="52"
              />
              <img
                className="h-14"
                src="/assets/images/american-express.svg"
                alt="American Express"
                width="52"
                height="52"
              />
            </div>
          </div>

          <div className="sm:flex justify-between gap-7 space-y-8 sm:space-y-0">
            {/* Expiry Date */}
            <div className="w-full floating-label-group always-float lg:mb-0">
              <div
                id="card-expiry-field"
                className="collectjs-field collectjs-expiry"
              ></div>
              <label htmlFor="card-expiry-field" className="floating-label bg-transparent">
                Expiration Date <span className="text-[1.6rem] text-[#a2a2a2]">(MM/YY)</span>
              </label>
            </div>

            {/* CVV */}
            <div className="w-full floating-label-group always-float relative lg:mb-0">
              <div
                id="card-cvv-field"
                className="collectjs-field collectjs-cvv"
              ></div>
              <label htmlFor="card-cvv-field" className="floating-label bg-transparent">Security Code</label>
              <span className="absolute w-10 top-1/2 right-9 -translate-y-1/2">
                <img src="/assets/images/info.svg" alt="Info" width="40" height="40" />
              </span>
            </div>
          </div>

          {/* Name on Card */}
          <div className="floating-label-group">
            <input
              type="text"
              id="nameOnCard"
              name="nameOnCard"
              className="w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9]"
              placeholder=" "
              required
              autoComplete="cc-name"
              value={formData.nameOnCard || ''}
              onChange={handleInputChange}
            />
            <label htmlFor="nameOnCard" className="floating-label bg-transparent">
              Name On Card
            </label>
          </div>

          {/* Same Address Checkbox */}
          <div>
            <label className="flex items-center gap-4 cursor-pointer select-none">
              <input
                type="checkbox"
                className="hidden peer"
                id="sameAddress"
                checked={formData.useSameAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, useSameAddress: e.target.checked }))}
              />
              <span className="w-9 h-9 border-[3px] border-[#666666] flex items-center justify-center peer-checked:bg-[#666666] rounded-xl">
                <img
                  src="/assets/images/check.svg"
                  alt="Checkmark"
                  width="16"
                  height="16"
                />
              </span>
              <span className="text-[#373738] font-medium text-[2.5rem]">
                Use shipping address as payment
                <span className="sm:block hidden">address</span>
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="mt-25">
        <button
          type="submit"
          disabled={loading || !collectJSLoaded}
          className="py-12 w-full rounded-full bg-[#F6C657] text-center font-bold text-[3.7rem] text-[#373737] leading-none hover:bg-[#f4bd3f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          aria-label="Place Your Order - Total $294"
        >
          {loading ? 'Processing...' : 'Place Your Order'}
        </button>

        {!collectJSLoaded && (
          <p className="mt-2 text-center text-sm text-gray-500">Loading secure payment system...</p>
        )}
      </div>
    </form>
  )
}
