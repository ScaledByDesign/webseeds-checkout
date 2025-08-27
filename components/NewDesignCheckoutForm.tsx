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
}

interface FormErrors {
  [key: string]: string
}

interface NewDesignCheckoutFormProps {
  order: any
  onPaymentSuccess: (result: any) => void
  onPaymentError: (error: string) => void
  apiEndpoint?: string
}

export function NewDesignCheckoutForm({ 
  order, 
  onPaymentSuccess, 
  onPaymentError, 
  apiEndpoint = '/api/checkout/process'
}: NewDesignCheckoutFormProps) {
  const [loading, setLoading] = useState(false)
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
    phone: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [collectJSLoaded, setCollectJSLoaded] = useState(false)

  // Initialize CollectJS
  useEffect(() => {
    const initializeCollectJS = () => {
      if (typeof window !== 'undefined' && window.CollectJS) {
        window.CollectJS.configure({
          variant: 'inline',
          styleSniffer: true,
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
                // Submit the form with the token
                const orderData = {
                  customer: {
                    email: formData.email,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    phone: formData.phone
                  },
                  shipping: {
                    address: formData.address,
                    apartment: formData.apartment,
                    city: formData.city,
                    state: formData.state,
                    zipCode: formData.zipCode,
                    country: formData.country
                  },
                  payment: {
                    token: response.token
                  },
                  order: order
                }

                const result = await fetch(apiEndpoint, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(orderData)
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
    <form onSubmit={handleSubmit} className="space-y-8" id="checkout-form">
      {/* Contact Information */}
      <div>
        <h3 className="mb-6 text-[#373738] font-medium sm:text-[2.7rem] text-[3.5rem]">
          Contact Information
        </h3>
        <div className="space-y-8">
          <FloatingLabelInput
            id="email"
            name="email"
            type="email"
            label="Email Address (To receive order confirmation email)"
            required
            value={formData.email}
            onChange={handleInputChange}
            autoComplete="email"
            error={errors.email}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Customer Information */}
      <div>
        <h3 className="mb-6 text-[#373738] font-medium sm:text-[2.7rem] text-[3.5rem]">
          Customer Information
        </h3>
        <div className="space-y-8">
          <div className="sm:flex justify-between gap-7 space-y-8 sm:space-y-0">
            <div className="w-full">
              <FloatingLabelInput
                id="firstName"
                name="firstName"
                label="First Name"
                required
                maxLength={50}
                value={formData.firstName}
                onChange={handleInputChange}
                autoComplete="given-name"
                error={errors.firstName}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />
            </div>
            <div className="w-full">
              <FloatingLabelInput
                id="lastName"
                name="lastName"
                label="Last Name"
                required
                maxLength={50}
                value={formData.lastName}
                onChange={handleInputChange}
                autoComplete="family-name"
                error={errors.lastName}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Shipping */}
      <div>
        <h3 className="mb-6 text-[#373738] font-medium sm:text-[2.7rem] text-[3.5rem]">
          Shipping
        </h3>
        <div className="space-y-8">
          <FloatingLabelInput
            id="address"
            name="address"
            label="Street Address"
            required
            maxLength={100}
            value={formData.address}
            onChange={handleInputChange}
            autoComplete="address-line1"
            error={errors.address}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
          
          <FloatingLabelInput
            id="apartment"
            name="apartment"
            label="Apartment, suite, etc (optional)"
            value={formData.apartment}
            onChange={handleInputChange}
            autoComplete="address-line2"
            pattern="[a-zA-Z0-9\s\-#\.]*"
          />

          <div className="sm:flex justify-between gap-7 space-y-8 sm:space-y-0">
            <div className="w-full">
              <FloatingLabelInput
                id="city"
                name="city"
                label="City"
                required
                value={formData.city}
                onChange={handleInputChange}
                autoComplete="address-level2"
                error={errors.city}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
              />
            </div>
            <div className="w-full">
              <FloatingLabelInput
                id="state"
                name="state"
                label="State"
                required
                value={formData.state}
                onChange={handleInputChange}
                autoComplete="address-level1"
                error={errors.state}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                }
              />
            </div>
            <div className="w-full">
              <FloatingLabelInput
                id="zipCode"
                name="zipCode"
                label="ZIP Code"
                required
                maxLength={10}
                value={formData.zipCode}
                onChange={handleInputChange}
                autoComplete="postal-code"
                pattern="[0-9]{5}(-[0-9]{4})?"
                inputMode="numeric"
                error={errors.zipCode}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                }
              />
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

          <FloatingLabelInput
            id="phone"
            name="phone"
            type="tel"
            label="Phone Number (For delivery confirmation texts)"
            required
            maxLength={14}
            value={formData.phone}
            onChange={handleInputChange}
            autoComplete="tel"
            pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
            inputMode="tel"
            error={errors.phone}
            rightIcon={
              <Image
                src="/assets/images/info.svg"
                alt="Info"
                width={40}
                height={40}
                className="w-10"
              />
            }
          />
        </div>
      </div>

      {/* Payment */}
      <div>
        <h3 className="mb-6 text-[#373738] font-medium sm:text-[2.7rem] text-[3.5rem]">
          Payment
        </h3>
        <div className="space-y-8">
          {/* Card Number */}
          <div className="floating-label-group relative">
            <div
              id="card-number-field"
              className="w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] min-h-[3.5rem]"
            ></div>
            <label
              htmlFor="card-number-field"
              className="floating-label bg-transparent absolute pointer-events-none left-9 top-1/2 transform -translate-y-1/2 transition-all duration-200 ease-in-out text-[1.94rem] sm:text-[1.94rem] text-[2.6rem] text-[#666666]"
            >
              Card Number
            </label>
          </div>

          <div className="sm:flex justify-between gap-7 space-y-8 sm:space-y-0">
            {/* Expiry Date */}
            <div className="w-full floating-label-group relative">
              <div
                id="card-expiry-field"
                className="w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] min-h-[3.5rem]"
              ></div>
              <label
                htmlFor="card-expiry-field"
                className="floating-label bg-transparent absolute pointer-events-none left-9 top-1/2 transform -translate-y-1/2 transition-all duration-200 ease-in-out text-[1.94rem] sm:text-[1.94rem] text-[2.6rem] text-[#666666]"
              >
                MM / YY
              </label>
            </div>

            {/* CVV */}
            <div className="w-full floating-label-group relative">
              <div
                id="card-cvv-field"
                className="w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] min-h-[3.5rem]"
              ></div>
              <label
                htmlFor="card-cvv-field"
                className="floating-label bg-transparent absolute pointer-events-none left-9 top-1/2 transform -translate-y-1/2 transition-all duration-200 ease-in-out text-[1.94rem] sm:text-[1.94rem] text-[2.6rem] text-[#666666]"
              >
                Security Code
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-8">
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#986988] hover:bg-[#876177] disabled:bg-gray-400 text-white font-bold py-7 px-8 rounded-xl text-[2rem] transition-colors duration-200"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              Processing...
            </div>
          ) : (
            'Complete Order'
          )}
        </button>
      </div>
    </form>
  )
}
