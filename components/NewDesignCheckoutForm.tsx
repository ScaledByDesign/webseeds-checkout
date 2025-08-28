'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { FloatingLabelInput, FloatingLabelSelect } from './FloatingLabelInput'

// CollectJS type declaration
declare global {
  interface Window {
    CollectJS: {
      configure: (config: any) => void
      startPaymentRequest: () => void
      isValid?: (field: string) => boolean
    }
  }
}

interface FormData {
  email: string
  address: string
  apartment: string
  city: string
  state: string
  zip: string
  country: string
  phone: string
  nameOnCard: string
  useSameAddress: boolean
  billingAddress?: string
  billingCity?: string
  billingState?: string
  billingZip?: string
}

interface FormErrors {
  [key: string]: string
}

interface NewDesignCheckoutFormProps {
  order: any
  onPaymentSuccess: (result: any) => void
  onPaymentError: (error: string) => void
  apiEndpoint?: string
  autoFillTrigger?: number
}

export function NewDesignCheckoutForm({
  order,
  onPaymentSuccess,
  onPaymentError,
  apiEndpoint = '/api/checkout/process',
  autoFillTrigger = 0
}: NewDesignCheckoutFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    email: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    zip: '',
    country: 'us',
    phone: '',
    nameOnCard: '',
    useSameAddress: true
  })
  const [errors, setErrors] = useState<FormErrors>({})
  // Load CollectJS script if not already present
  useEffect(() => {
    if (typeof window === 'undefined') return

    const existing = document.querySelector('script[src*="Collect.js"]') as HTMLScriptElement | null
    if (existing) return

    const script = document.createElement('script')
    script.src = process.env.NEXT_PUBLIC_COLLECT_JS_URL || 'https://secure.nmi.com/token/Collect.js'
    script.async = true
    const tk = process.env.NEXT_PUBLIC_NMI_TOKENIZATION_KEY
    if (tk) script.setAttribute('data-tokenization-key', tk)

    script.onload = () => {
      console.log('✅ CollectJS script loaded')
    }
    script.onerror = () => {
      console.error('❌ Failed to load CollectJS script')
      onPaymentError('Failed to load payment system. Please refresh the page.')
    }

    document.body.appendChild(script)

    return () => {
      script.onload = null
      script.onerror = null
    }
  }, [onPaymentError])
  const [collectJSLoaded, setCollectJSLoaded] = useState(false)

  // Auto-fill with test data when autoFillTrigger changes
  useEffect(() => {
    if (autoFillTrigger > 0) {
      setFormData({
        email: 'test@example.com',
        address: '123 Test Street',
        apartment: 'Apt 4B',
        city: 'Test City',
        state: 'CA',
        zip: '12345',
        country: 'US',
        phone: '555-123-4567',
        nameOnCard: 'John Doe',
        useSameAddress: true
      })
    }
  }, [autoFillTrigger])

  // Initialize CollectJS
  useEffect(() => {
    const initializeCollectJS = () => {
      if (typeof window !== 'undefined' && window.CollectJS) {
        window.CollectJS.configure({
          variant: 'inline',
          styleSniffer: true,
          tokenizationKey: process.env.NEXT_PUBLIC_NMI_TOKENIZATION_KEY || undefined,
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
          callback: async (response: any) => {
            if (response.token) {
              // Handle successful tokenization
              console.log('Payment token received:', response.token)

              try {
                // Submit the form with the token (match /api/checkout/process schema)
                const body = {
                  customerInfo: {
                    email: formData.email,
                    // Using nameOnCard as full name for now; ideally split into first/last
                    firstName: formData.nameOnCard.split(' ')[0] || formData.nameOnCard,
                    lastName: formData.nameOnCard.split(' ').slice(1).join(' ') || 'Customer',
                    phone: formData.phone,
                    address: formData.address,
                    city: formData.city,
                    state: formData.state,
                    zipCode: formData.zip,
                    country: (formData.country || 'US').toUpperCase(),
                  },
                  paymentToken: response.token,
                  products: (order?.items || []).map((it: any) => ({
                    id: it.id,
                    name: it.name,
                    price: it.price,
                    quantity: it.quantity ?? 1,
                  })),
                  billingInfo: formData.useSameAddress ? undefined : {
                    address: formData.billingAddress || formData.address,
                    city: formData.billingCity || formData.city,
                    state: formData.billingState || formData.state,
                    zipCode: formData.billingZip || formData.zip,
                    country: (formData.country || 'US').toUpperCase(),
                  },
                }

                const result = await fetch(apiEndpoint, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(body)
                })

                const data = await result.json()

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
              // Handle tokenization error
              console.error('Tokenization failed:', response)
              onPaymentError('Payment processing failed. Please check your card details.')
              setLoading(false)
            }
          },
          fieldsAvailableCallback: () => {
            setCollectJSLoaded(true)
            console.log('CollectJS fields are ready')
          },
          validationCallback: (field: string, status: boolean, message: string) => {
            console.log(`Field ${field} validation:`, status, message)
          }
        })
      }
    }

    // Check if CollectJS is already loaded
    if (typeof window !== 'undefined' && window.CollectJS) {
      initializeCollectJS()
    } else {
      // Wait for CollectJS to load
      const checkCollectJS = setInterval(() => {
        if (typeof window !== 'undefined' && window.CollectJS) {
          clearInterval(checkCollectJS)
          initializeCollectJS()
        }
      }, 100)

      // Cleanup interval after 30 seconds
      setTimeout(() => {
        clearInterval(checkCollectJS)
        if (!collectJSLoaded) {
          console.error('CollectJS failed to load within 30 seconds')
          onPaymentError('Payment system failed to load. Please refresh the page.')
        }
      }, 30000)

      return () => clearInterval(checkCollectJS)
    }
  }, [collectJSLoaded, onPaymentError])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Real-time apartment validation (matching design)
    if (name === 'apartment' && value) {
      const specialCharsRegex = /^[a-zA-Z0-9\s\-#\.]*$/
      if (!specialCharsRegex.test(value)) {
        setErrors(prev => ({
          ...prev,
          apartment: 'Apartment, Suite cannot contain any special characters'
        }))
      } else {
        setErrors(prev => ({
          ...prev,
          apartment: ''
        }))
      }
    } else {
      // Clear error when user starts typing
      if (errors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }))
      }
    }
  }

  // onBlur validation handlers - exact design behavior
  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value) {
      if (!validateEmail(value)) {
        setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }))
      } else {
        setErrors(prev => ({ ...prev, email: '' }))
      }
    } else {
      setErrors(prev => ({ ...prev, email: 'Email is required' }))
    }
  }

  const handleAddressBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setErrors(prev => ({ ...prev, address: 'Street address is required' }))
    } else if (value.length < 5) {
      setErrors(prev => ({ ...prev, address: 'Please enter a valid street address' }))
    } else {
      setErrors(prev => ({ ...prev, address: '' }))
    }
  }

  const handleCityBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setErrors(prev => ({ ...prev, city: 'City is required' }))
    } else if (value.length < 2) {
      setErrors(prev => ({ ...prev, city: 'Please enter a valid city name' }))
    } else {
      setErrors(prev => ({ ...prev, city: '' }))
    }
  }

  const handleStateBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setErrors(prev => ({ ...prev, state: 'State is required' }))
    } else if (value.length < 2) {
      setErrors(prev => ({ ...prev, state: 'Please enter a valid state' }))
    } else {
      setErrors(prev => ({ ...prev, state: '' }))
    }
  }

  const handleZipBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value) {
      if (!validateZip(value)) {
        setErrors(prev => ({ ...prev, zip: 'Please enter a valid ZIP code' }))
      } else {
        setErrors(prev => ({ ...prev, zip: '' }))
      }
    } else {
      setErrors(prev => ({ ...prev, zip: 'ZIP code is required' }))
    }
  }

  const handlePhoneBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value) {
      if (!validatePhone(value)) {
        setErrors(prev => ({ ...prev, phone: 'Please enter a valid 10-digit phone number' }))
      } else {
        setErrors(prev => ({ ...prev, phone: '' }))
      }
    } else {
      setErrors(prev => ({ ...prev, phone: 'Phone number is required' }))
    }
  }

  // Billing address onBlur handlers
  const handleBillingAddressBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setErrors(prev => ({ ...prev, billingAddress: 'Billing address is required' }))
    } else if (value.length < 5) {
      setErrors(prev => ({ ...prev, billingAddress: 'Please enter a valid billing address' }))
    } else {
      setErrors(prev => ({ ...prev, billingAddress: '' }))
    }
  }

  const handleBillingCityBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setErrors(prev => ({ ...prev, billingCity: 'Billing city is required' }))
    } else if (value.length < 2) {
      setErrors(prev => ({ ...prev, billingCity: 'Please enter a valid billing city' }))
    } else {
      setErrors(prev => ({ ...prev, billingCity: '' }))
    }
  }

  const handleBillingStateBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setErrors(prev => ({ ...prev, billingState: 'Billing state is required' }))
    } else if (value.length < 2) {
      setErrors(prev => ({ ...prev, billingState: 'Please enter a valid billing state' }))
    } else {
      setErrors(prev => ({ ...prev, billingState: '' }))
    }
  }

  const handleBillingZipBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value) {
      if (!validateZip(value)) {
        setErrors(prev => ({ ...prev, billingZip: 'Please enter a valid billing ZIP code' }))
      } else {
        setErrors(prev => ({ ...prev, billingZip: '' }))
      }
    } else {
      setErrors(prev => ({ ...prev, billingZip: 'Billing ZIP code is required' }))
    }
  }

  // Validation functions matching design exactly
  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '')
    return cleaned.length === 10
  }

  const validateZip = (zip: string): boolean => {
    const cleaned = zip.replace(/\D/g, '')
    // Real ZIP validation: 5 digits or 5+4 format
    if (cleaned.length === 5) {
      const zipNum = parseInt(cleaned)
      return zipNum >= 10001 && zipNum <= 99999 // Valid US ZIP range
    }
    if (cleaned.length === 9) {
      const zipNum = parseInt(cleaned.substring(0, 5))
      return zipNum >= 10001 && zipNum <= 99999 // Valid US ZIP range
    }
    return false
  }

  const validateCVV = (cvv: string): boolean => {
    const cleaned = cvv.replace(/\D/g, '')
    // Real CVV validation: 3 digits for Visa/MC, 4 digits for Amex
    return cleaned.length === 3 || cleaned.length === 4
  }

  const validateExpiryDate = (expiry: string): boolean => {
    // Format: MM/YY
    const regex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/
    if (!regex.test(expiry)) return false

    const [month, year] = expiry.split('/').map(num => parseInt(num))
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear() % 100 // Get last 2 digits
    const currentMonth = currentDate.getMonth() + 1

    // Check if year is in the future or current year with future month
    if (year > currentYear) return true
    if (year === currentYear && month >= currentMonth) return true

    return false // Expired date
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Email validation - exact design rules
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Address validation - exact design rules
    if (!formData.address.trim()) {
      newErrors.address = 'Street address is required'
    } else if (formData.address.trim().length < 5) {
      newErrors.address = 'Please enter a valid street address'
    }

    // City validation - exact design rules
    if (!formData.city.trim()) {
      newErrors.city = 'City is required'
    } else if (formData.city.trim().length < 2) {
      newErrors.city = 'Please enter a valid city name'
    }

    // State validation - exact design rules
    if (!formData.state.trim()) {
      newErrors.state = 'State is required'
    } else if (formData.state.trim().length < 2) {
      newErrors.state = 'Please enter a valid state'
    }

    // ZIP validation - exact design rules
    if (!formData.zip) {
      newErrors.zip = 'ZIP code is required'
    } else if (!validateZip(formData.zip)) {
      newErrors.zip = 'Please enter a valid ZIP code'
    }

    // Phone validation - exact design rules
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required'
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number'
    }

    // Name on Card validation
    if (!formData.nameOnCard.trim()) {
      newErrors.nameOnCard = 'Name on card is required'
    } else if (formData.nameOnCard.trim().length < 2) {
      newErrors.nameOnCard = 'Please enter a valid name'
    }

    // Payment field validation (since we're using regular inputs now)
    const cardNumberElement = document.getElementById('cardNumber') as HTMLInputElement
    const expiryElement = document.getElementById('expiry') as HTMLInputElement
    const cvvElement = document.getElementById('cvv') as HTMLInputElement

    if (cardNumberElement && !cardNumberElement.value.trim()) {
      newErrors.cardNumber = 'Card number is required'
    } else if (cardNumberElement && !/^[0-9\s]{13,19}$/.test(cardNumberElement.value.replace(/\s/g, ''))) {
      newErrors.cardNumber = 'Please enter a valid card number'
    }

    if (expiryElement && !expiryElement.value.trim()) {
      newErrors.expiry = 'Expiration date is required'
    } else if (expiryElement && !validateExpiryDate(expiryElement.value)) {
      newErrors.expiry = 'Please enter a valid future expiration date (MM/YY)'
    }

    if (cvvElement && !cvvElement.value.trim()) {
      newErrors.cvv = 'Security code is required'
    } else if (cvvElement && !validateCVV(cvvElement.value)) {
      newErrors.cvv = 'Please enter a valid 3 or 4 digit security code'
    }

    // Country validation
    if (!formData.country) newErrors.country = 'Country is required'

    // Billing address validation (only if not using same address)
    if (!formData.useSameAddress) {
      if (!formData.billingAddress?.trim()) {
        newErrors.billingAddress = 'Billing address is required'
      } else if (formData.billingAddress.trim().length < 5) {
        newErrors.billingAddress = 'Please enter a valid billing address'
      }

      if (!formData.billingCity?.trim()) {
        newErrors.billingCity = 'Billing city is required'
      } else if (formData.billingCity.trim().length < 2) {
        newErrors.billingCity = 'Please enter a valid billing city'
      }

      if (!formData.billingState?.trim()) {
        newErrors.billingState = 'Billing state is required'
      } else if (formData.billingState.trim().length < 2) {
        newErrors.billingState = 'Please enter a valid billing state'
      }

      if (!formData.billingZip?.trim()) {
        newErrors.billingZip = 'Billing ZIP code is required'
      } else if (!validateZip(formData.billingZip)) {
        newErrors.billingZip = 'Please enter a valid billing ZIP code'
      }
    }

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
    <form onSubmit={handleSubmit} className="space-y-8" id="checkout-form">
      {/* Contact Information */}
      <div>
        <h3 className="mb-6 text-[#373738] font-medium sm:text-[2.7rem] text-[3.5rem]">
          Contact
        </h3>
        <div className="space-y-8">
          <div className="floating-label-group">
            <input
              type="email"
              id="email"
              name="email"
              className={`w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.email ? 'input-error' : ''}`}
              placeholder=" "
              required
              autoComplete="email"
              aria-required="true"
              inputMode="email"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={handleEmailBlur}
            />
            <label htmlFor="email" className="floating-label bg-transparent sm:hidden block">
              Email{' '}
              <span className="text-[1.6rem] text-[#a2a2a2]">(To receive order confirmation email)</span>
            </label>
            <label htmlFor="email" className="floating-label bg-transparent hidden sm:block">
              Email{' '}
              <span className="text-[1.6rem] text-[#a2a2a2]">(To receive order confirmation email)</span>
            </label>
            {errors.email && (
              <div
                id="email-error"
                className="text-2xl mt-2 error-message"
                style={{ color: '#dc2626' }}
              >
                {errors.email}
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Shipping */}
      <div>
        <h3 className="mb-6 text-[#373738] font-medium sm:text-[2.7rem] text-[3.5rem]">
          Shipping
        </h3>
        <div className="space-y-8">
          <div className="floating-label-group">
            <input
              type="text"
              id="address"
              name="address"
              className={`w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.address ? 'input-error' : ''}`}
              placeholder=" "
              required
              autoComplete="street-address"
              aria-required="true"
              value={formData.address}
              onChange={handleInputChange}
              onBlur={handleAddressBlur}
            />
            <label htmlFor="address" className="floating-label bg-transparent">
              Street Address
            </label>
            {errors.address && (
              <div
                id="address-error"
                className="text-2xl mt-2 error-message"
                style={{ color: '#dc2626' }}
              >
                {errors.address}
              </div>
            )}
          </div>

          <div className="floating-label-group">
            <input
              type="text"
              id="apartment"
              name="apartment"
              className={`w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.apartment ? 'input-error' : ''}`}
              placeholder=" "
              pattern="[a-zA-Z0-9\s\-#\.]*"
              autoComplete="address-line2"
              value={formData.apartment}
              onChange={handleInputChange}
            />
            <label htmlFor="apartment" className="floating-label bg-transparent">
              Apartment, suite, etc{' '}
              <span className="text-[1.6rem] text-[#a2a2a2]">(optional)</span>
            </label>
            {errors.apartment && (
              <div
                id="apartment-error"
                className="text-2xl mt-2 error-message"
                style={{ color: '#dc2626' }}
              >
                {errors.apartment}
              </div>
            )}
          </div>

          <div className="sm:flex justify-between gap-7 space-y-8 sm:space-y-0">
            <div className="w-full">
              <div className="floating-label-group">
                <input
                  type="text"
                  id="city"
                  name="city"
                  className={`w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.city ? 'input-error' : ''}`}
                  placeholder=" "
                  required
                  autoComplete="address-level2"
                  aria-required="true"
                  value={formData.city}
                  onChange={handleInputChange}
                  onBlur={handleCityBlur}
                />
                <label htmlFor="city" className="floating-label bg-transparent">
                  City
                </label>
                {errors.city && (
                  <div
                    id="city-error"
                    className="text-2xl mt-2 error-message"
                    style={{ color: '#dc2626' }}
                  >
                    {errors.city}
                  </div>
                )}
              </div>
            </div>
            <div className="w-full">
              <div className="floating-label-group">
                <input
                  type="text"
                  id="state"
                  name="state"
                  className={`w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.state ? 'input-error' : ''}`}
                  placeholder=" "
                  required
                  autoComplete="address-level1"
                  aria-required="true"
                  value={formData.state}
                  onChange={handleInputChange}
                  onBlur={handleStateBlur}
                />
                <label htmlFor="state" className="floating-label bg-transparent">
                  State
                </label>
                {errors.state && (
                  <div
                    id="state-error"
                    className="text-2xl mt-2 error-message"
                    style={{ color: '#dc2626' }}
                  >
                    {errors.state}
                  </div>
                )}
              </div>
            </div>
            <div className="w-full">
              <div className="floating-label-group">
                <input
                  type="text"
                  id="zip"
                  name="zip"
                  className={`w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.zip ? 'input-error' : ''}`}
                  placeholder=" "
                  pattern="[0-9]{5}(-[0-9]{4})?"
                  maxLength={10}
                  required
                  autoComplete="postal-code"
                  aria-required="true"
                  inputMode="numeric"
                  value={formData.zip}
                  onChange={handleInputChange}
                  onBlur={handleZipBlur}
                />
                <label htmlFor="zip" className="floating-label bg-transparent">
                  Zip Code
                </label>
                {errors.zip && (
                  <div
                    id="zip-error"
                    className="text-2xl mt-2 error-message"
                    style={{ color: '#dc2626' }}
                  >
                    {errors.zip}
                  </div>
                )}
              </div>
            </div>
          </div>

          <FloatingLabelSelect
            id="country"
            name="country"
            label="Country"
            required
            value={formData.country}
            onChange={handleInputChange}
            autoComplete="country"
            error={errors.country}
          >
            <option value="" disabled></option>
            <option value="us">United States</option>
            <option value="ca">Canada</option>
            <option value="uk">United Kingdom</option>
            <option value="au">Australia</option>
            <option value="nz">New Zealand</option>
          </FloatingLabelSelect>

          <div className="floating-label-group">
            <input
              type="tel"
              id="phone"
              name="phone"
              className={`w-full border-2 border-[#CDCDCD] pl-9 pr-17 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.phone ? 'input-error' : ''}`}
              placeholder=" "
              pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
              maxLength={14}
              required
              autoComplete="tel"
              aria-required="true"
              inputMode="tel"
              value={formData.phone}
              onChange={handleInputChange}
              onBlur={handlePhoneBlur}
            />
            <label htmlFor="phone" className="floating-label bg-transparent sm:hidden block">
              Phone Number{' '}
              <span className="text-[1.6rem] text-[#a2a2a2]">(For delivery confirmation texts)</span>
            </label>
            <label htmlFor="phone" className="floating-label bg-transparent hidden sm:block">
              Phone Number {' '}
              <span className="text-[1.6rem] text-[#a2a2a2]">(For delivery confirmation texts)</span>
            </label>
            <span className="absolute w-10 top-1/2 right-9 -translate-y-1/2">
              <Image
                src="/assets/images/info.svg"
                alt="Info"
                width={40}
                height={40}
              />
            </span>
            {errors.phone && (
              <div
                id="phone-error"
                className="text-2xl mt-2 error-message"
                style={{ color: '#dc2626' }}
              >
                {errors.phone}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment - Exact 1:1 Copy from Design */}
      <div className="mt-7.5 relative">
        <h3 className="mt:40 sm:mt:0 mb-4 text-[#373738] font-medium sm:text-[2.7rem] text-[3.5rem]">
          Payment
        </h3>
        <p className="flex gap-2 mb-10 items-center font-medium text-[1.94rem] text-[#6d6d6d] hidden md:block">
          All transactions are secure and encrypted
          <img
            className="w-6 inline-block -mt-3"
            src="/assets/images/lock.svg"
            alt="Secure"
            width="16"
            height="16"
            loading="lazy"
          />
        </p>
        <p className="absolute right-0 transform top-5 flex gap-2 items-center font-medium text-[1.94rem] text-[#6d6d6d7] sm:hidden md:hidden lg:hidden xl:hidden block">
          <img
            className="w-6 inline-block"
            src="/assets/images/lock.svg"
            alt="Secure"
            width="16"
            height="16"
            loading="lazy"
          />
          Secure & Encrypted
        </p>
        <div className="space-y-8">
          <div className="floating-label-group relative">
            {/* CollectJS mount point for card number */}
            <div id="card-number-field" className={`w-full border-2 border-[#CDCDCD] pl-9 pr-40 py-7 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.cardNumber ? 'input-error' : ''}`}></div>
            <label htmlFor="card-number-field" className="floating-label bg-transparent">
              Card Number
            </label>
            {errors.cardNumber && (
              <div className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }}>
                {errors.cardNumber}
              </div>
            )}
            <div className="absolute top-1/2 right-4 -translate-y-1/2 flex gap-2">
              <img
                className="h-14"
                src="/assets/images/visa.svg"
                alt="Visa"
                width="52"
                height="52"
                loading="lazy"
              />
              <img
                className="h-14"
                src="/assets/images/mastercard.svg"
                alt="Mastercard"
                width="52"
                height="52"
                loading="lazy"
              />
              <img
                className="h-14"
                src="/assets/images/american-express.svg"
                alt="American Express"
                width="52"
                height="52"
                loading="lazy"
              />
            </div>
          </div>
          <div className="sm:flex justify-between gap-7 space-y-8 sm:space-y-0">
            <div className="floating-label-group w-full lg:mb-0">
              {/* CollectJS mount point for expiry */}
              <div id="card-expiry-field" className={`w-full border-2 border-[#CDCDCD] px-9 py-7 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.expiry ? 'input-error' : ''}`}></div>
              <label htmlFor="card-expiry-field" className="floating-label bg-transparent">
                Expiration Date{' '}
                <span className="text-[1.6rem] text-[#a2a2a2]">(MM/YY)</span>
              </label>
              {errors.expiry && (
                <div className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }}>
                  {errors.expiry}
                </div>
              )}
            </div>
            <div className="floating-label-group relative w-full lg:mb-0">
              {/* CollectJS mount point for CVV */}
              <div id="card-cvv-field" className={`w-full border-2 border-[#CDCDCD] pl-9 pr-17 py-7 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.cvv ? 'input-error' : ''}`}></div>
              <label htmlFor="card-cvv-field" className="floating-label bg-transparent">
                Security Code
              </label>
              {errors.cvv && (
                <div className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }}>
                  {errors.cvv}
                </div>
              )}
              <span className="absolute w-10 top-1/2 right-9 -translate-y-1/2">
                <img
                  src="/assets/images/info.svg"
                  alt="Info"
                  width="40"
                  height="40"
                  loading="lazy"
                />
              </span>
            </div>
          </div>
          <div className="floating-label-group">
            <input
              type="text"
              id="nameOnCard"
              name="nameOnCard"
              className={`w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.nameOnCard ? 'input-error' : ''}`}
              value={formData.nameOnCard}
              onChange={handleInputChange}
              placeholder=" "
              required
              autoComplete="cc-name"
              aria-required="true"
            />
            <label htmlFor="nameOnCard" className="floating-label bg-transparent">
              Name On Card
            </label>
            {errors.nameOnCard && (
              <div className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }}>
                {errors.nameOnCard}
              </div>
            )}
          </div>

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
                  loading="lazy"
                />
              </span>
              <span className="text-[#373738] font-medium text-[2.5rem]">
                Use shipping address as payment
                <span className="sm:block hidden">address</span>
              </span>
            </label>
          </div>

          {/* Billing Address Section - Conditional based on checkbox */}
          {!formData.useSameAddress && (
            <div id="billing-section" className="mt-8 pt-8 border-t-3 border-[#CDCDCD]">
              <h4 className="mb-8 text-[#373738] font-medium text-[2.25rem]">
                Billing Address
              </h4>
            <div className="space-y-8">
              <div className="floating-label-group">
                <input
                  type="text"
                  id="billing-address"
                  name="billingAddress"
                  className={`w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.billingAddress ? 'input-error' : ''}`}
                  placeholder=" "
                  value={formData.billingAddress || ''}
                  onChange={handleInputChange}
                  onBlur={handleBillingAddressBlur}
                />
                <label htmlFor="billing-address" className="floating-label bg-transparent">
                  Street Address
                </label>
                {errors.billingAddress && (
                  <div className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }}>
                    {errors.billingAddress}
                  </div>
                )}
              </div>
              <div className="sm:flex justify-between gap-4 space-y-8 sm:space-y-0">
                <div className="floating-label-group w-full">
                  <input
                    type="text"
                    id="billing-city"
                    name="billingCity"
                    className={`w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.billingCity ? 'input-error' : ''}`}
                    placeholder=" "
                    value={formData.billingCity || ''}
                    onChange={handleInputChange}
                    onBlur={handleBillingCityBlur}
                  />
                  <label htmlFor="billing-city" className="floating-label bg-transparent">
                    City
                  </label>
                  {errors.billingCity && (
                    <div className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }}>
                      {errors.billingCity}
                    </div>
                  )}
                </div>
                <div className="floating-label-group w-full">
                  <input
                    type="text"
                    id="billing-state"
                    name="billingState"
                    className={`w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.billingState ? 'input-error' : ''}`}
                    placeholder=" "
                    value={formData.billingState || ''}
                    onChange={handleInputChange}
                    onBlur={handleBillingStateBlur}
                  />
                  <label htmlFor="billing-state" className="floating-label bg-transparent">
                    State
                  </label>
                  {errors.billingState && (
                    <div className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }}>
                      {errors.billingState}
                    </div>
                  )}
                </div>
                <div className="floating-label-group w-full">
                  <input
                    type="text"
                    id="billing-zip"
                    name="billingZip"
                    className={`w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.billingZip ? 'input-error' : ''}`}
                    placeholder=" "
                    pattern="[0-9]{5}"
                    value={formData.billingZip || ''}
                    onChange={handleInputChange}
                    onBlur={handleBillingZipBlur}
                  />
                  <label htmlFor="billing-zip" className="floating-label bg-transparent">
                    Zip Code
                  </label>
                  {errors.billingZip && (
                    <div className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }}>
                      {errors.billingZip}
                    </div>
                  )}
                </div>
              </div>
              <div className="floating-label-group">
                <select
                  id="billing-country"
                  className="w-full border-2 border-[#CDCDCD] px-9 py-6 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9]"
                >
                  <option value="" disabled selected></option>
                  <option value="us">United States</option>
                  <option value="ca">Canada</option>
                  <option value="uk">United Kingdom</option>
                  <option value="au">Australia</option>
                  <option value="nz">New Zealand</option>
                </select>
                <label htmlFor="billing-country" className="floating-label bg-transparent">
                  Country
                </label>
              </div>
            </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="mt-25">
        <button
          type="submit"
          disabled={loading}
          className="py-12 w-full rounded-full bg-[#F6C657] text-center font-bold text-[3.7rem] text-[#373737] leading-none"
          aria-label="Place Your Order - Total $294"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-[#373737] border-t-transparent rounded-full"></div>
              Processing...
            </div>
          ) : (
            'Place Your Order'
          )}
        </button>
      </div>
    </form>
  )
}
