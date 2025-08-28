'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { FloatingLabelInput, FloatingLabelSelect } from './FloatingLabelInput'

// CollectJS and Google Places type declaration
declare global {
  interface Window {
    CollectJS: {
      configure: (config: any) => void
      startPaymentRequest: () => void
      isValid?: (field: string) => boolean
    }
    google?: {
      maps: {
        places: {
          Autocomplete: any
          AutocompleteService: any
        }
      }
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
  const [collectJSLoaded, setCollectJSLoaded] = useState(false)
  const [fieldsValid, setFieldsValid] = useState(false)
  const collectJSInitializedRef = useRef(false)
  
  // Load CollectJS script if not already present
  useEffect(() => {
    if (typeof window === 'undefined') return

    const existing = document.querySelector('script[src*="Collect.js"]') as HTMLScriptElement | null
    if (existing) return

    const script = document.createElement('script')
    script.src = 'https://secure.nmi.com/token/Collect.js'
    script.async = true
    const tk = process.env.NEXT_PUBLIC_NMI_TOKENIZATION_KEY
    if (tk) script.setAttribute('data-tokenization-key', tk)

    script.onload = () => {
      console.log('✅ CollectJS script loaded')
      // Override console.error temporarily to suppress PaymentRequestAbstraction error
      const originalError = console.error
      console.error = (...args: any[]) => {
        // Filter out PaymentRequestAbstraction errors
        if (args[0] && typeof args[0] === 'string' && args[0].includes('PaymentRequestAbstraction')) {
          return // Silently ignore
        }
        originalError.apply(console, args)
      }
      
      // Restore original console.error after a short delay
      setTimeout(() => {
        console.error = originalError
      }, 1000)
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

  // Google Places Autocomplete placeholder - matching design
  // The design includes Google Places but only loads if API key is configured
  // Since we're using GeoIP for auto-filling country/state, Google Places is optional
  // To enable: Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local
  useEffect(() => {
    // Placeholder for Google Places - not needed since GeoIP handles location detection
    // The design only loads Google Maps if a valid API key exists (not "YOUR_GOOGLE_API_KEY")
    // We're focusing on GeoIP which works without any API key
  }, [])

  // GeoIP detection to auto-fill country and state - matching design
  useEffect(() => {
    const detectLocationAndFill = async () => {
      // Check localStorage cache first
      const cachedGeoData = localStorage.getItem('geoip_data')
      const cacheExpiry = localStorage.getItem('geoip_expiry')
      
      if (cachedGeoData && cacheExpiry && new Date().getTime() < parseInt(cacheExpiry)) {
        const data = JSON.parse(cachedGeoData)
        fillGeoData(data)
        return
      }

      try {
        // Using ipapi.co free tier for GeoIP detection - matching design
        const response = await fetch('https://ipapi.co/json/')
        const data = await response.json()
        
        // Cache for 24 hours
        localStorage.setItem('geoip_data', JSON.stringify(data))
        localStorage.setItem('geoip_expiry', String(new Date().getTime() + 86400000))
        
        fillGeoData(data)
      } catch (error) {
        console.log('GeoIP detection failed:', error)
      }
    }

    const fillGeoData = (data: any) => {
      if (data.country_code) {
        // Map country codes to our select values
        const countryMap: {[key: string]: string} = {
          'US': 'us',
          'CA': 'ca',
          'GB': 'uk',
          'AU': 'au',
          'NZ': 'nz'
        }
        
        const mappedCountry = countryMap[data.country_code] || 'us'
        
        // Only update if fields are empty - apply to both shipping and billing
        setFormData(prev => ({
          ...prev,
          country: prev.country || mappedCountry,
          state: prev.state || data.region_code || '',
          city: prev.city || data.city || '',
          zip: prev.zip || data.postal || '',
          // Also fill billing address fields if they're empty
          billingCity: prev.billingCity || data.city || '',
          billingState: prev.billingState || data.region_code || '',
          billingZip: prev.billingZip || data.postal || ''
        }))
        
        console.log('✅ GeoIP detection successful:', {
          country: data.country_name,
          state: data.region,
          city: data.city,
          zip: data.postal
        })
      }
    }

    // Run GeoIP detection on mount
    detectLocationAndFill()
  }, [])

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

      // CollectJS fields are ready for user input  
      // Auto-fill disabled to prevent validation errors with test data
      console.log('ℹ️ CollectJS fields ready for user input')
    }
  }, [autoFillTrigger])

  // Add passive event listeners to improve performance
  useEffect(() => {
    const handlePassiveEvents = () => {
      // Let passive events pass through without preventDefault
    }
    
    // Add passive listeners for common scroll-blocking events
    document.addEventListener('touchstart', handlePassiveEvents, { passive: true })
    document.addEventListener('touchmove', handlePassiveEvents, { passive: true })
    document.addEventListener('wheel', handlePassiveEvents, { passive: true })
    document.addEventListener('mousewheel', handlePassiveEvents, { passive: true })
    
    return () => {
      document.removeEventListener('touchstart', handlePassiveEvents)
      document.removeEventListener('touchmove', handlePassiveEvents) 
      document.removeEventListener('wheel', handlePassiveEvents)
      document.removeEventListener('mousewheel', handlePassiveEvents)
    }
  }, [])

  // Initialize CollectJS - only once even with React StrictMode
  useEffect(() => {
    // Use ref to prevent multiple initializations even in StrictMode
    if (collectJSInitializedRef.current) {
      console.log('⏭️ CollectJS already initialized, skipping...')
      return
    }
    
    const initializeCollectJS = () => {
      if (typeof window !== 'undefined' && window.CollectJS && !collectJSInitializedRef.current) {
        console.log('🔧 Initializing CollectJS (once)...')
        collectJSInitializedRef.current = true // Mark as initialized immediately using ref
        
        // Check if we're in development mode
        const isDev = process.env.NODE_ENV === 'development';
        
        if (isDev) {
          console.log('🔧 Development mode: CollectJS initialized');
        }
        
        window.CollectJS.configure({
          variant: 'inline',
          styleSniffer: true, // This will automatically copy styles from the container div
          tokenizationKey: process.env.NEXT_PUBLIC_NMI_TOKENIZATION_KEY || undefined,
          // Minimal custom CSS to enhance the styleSniffer behavior
          customCss: {
            'font-family': 'inherit', // Ensure font family matches
            'line-height': 'inherit',  // Match line height
            'letter-spacing': 'inherit' // Match letter spacing
          },
          // Enhanced validation styling
          invalidCss: {
            'border-color': '#dc2626 !important', // Red border for invalid fields
            'color': '#dc2626'
          },
          validCss: {
            'border-color': '#059669 !important', // Green border for valid fields
            'color': '#059669'
          },
          focusCss: {
            'border-color': '#3b82f6 !important', // Blue border on focus
            'outline': 'none'
          },
          fields: {
            ccnumber: {
              selector: '#card-number-field',
              title: 'Card Number',
              placeholder: ' ', // Empty placeholder to work with floating labels
            },
            ccexp: {
              selector: '#card-expiry-field',
              title: 'Expiry Date',
              placeholder: ' ', // Empty placeholder to work with floating labels
            },
            cvv: {
              selector: '#card-cvv-field',
              title: 'Security Code',
              placeholder: ' ', // Empty placeholder to work with floating labels
            }
          },
          callback: async (response: any) => {
            console.log('🎯 CollectJS callback triggered:', response)

            if (response.token) {
              // Handle successful tokenization
              console.log('✅ Payment token received:', response.token)

              try {
                // Fix: Read form data directly from DOM to avoid React state closure issues
                console.log('🔍 Reading form data directly from DOM...')

                const getCurrentFormData = () => {
                  const email = (document.querySelector('input[name="email"]') as HTMLInputElement)?.value || ''
                  const nameOnCard = (document.querySelector('input[name="nameOnCard"]') as HTMLInputElement)?.value || ''
                  const phone = (document.querySelector('input[name="phone"]') as HTMLInputElement)?.value || ''
                  const address = (document.querySelector('input[name="address"]') as HTMLInputElement)?.value || ''
                  const city = (document.querySelector('input[name="city"]') as HTMLInputElement)?.value || ''
                  const state = (document.querySelector('input#state') as HTMLInputElement)?.value || ''
                  const zip = (document.querySelector('input[name="zip"]') as HTMLInputElement)?.value || ''
                  const country = (document.querySelector('input[name="country"]') as HTMLInputElement)?.value || 'US'
                  const useSameAddress = (document.querySelector('input[name="useSameAddress"]') as HTMLInputElement)?.checked ?? true

                  return { email, nameOnCard, phone, address, city, state, zip, country, useSameAddress }
                }

                const currentFormData = getCurrentFormData()
                console.log('📋 Current form data from DOM:', currentFormData)

                // Normalize form data before submission
                const normalizedEmail = currentFormData.email.trim().toLowerCase()
                const normalizedName = currentFormData.nameOnCard.trim()
                const normalizedPhone = currentFormData.phone.replace(/\D/g, '') // Remove all non-digits
                const normalizedZip = currentFormData.zip.replace(/\D/g, '') // Remove all non-digits
                
                // Submit the form with the token (match /api/checkout/process schema)
                const body = {
                  customerInfo: {
                    email: normalizedEmail,
                    // Better name parsing with fallback
                    firstName: normalizedName.split(' ')[0] || 'Customer',
                    lastName: normalizedName.split(' ').slice(1).join(' ') || normalizedName.split(' ')[0] || 'Customer',
                    phone: normalizedPhone,
                    address: currentFormData.address.trim(),
                    city: currentFormData.city.trim(),
                    state: currentFormData.state.trim().toUpperCase(), // Normalize state to uppercase
                    zipCode: normalizedZip,
                    country: currentFormData.country.trim().toUpperCase(),
                  },
                  paymentToken: response.token,
                  products: (order?.items || []).map((it: any) => ({
                    id: it.id,
                    name: it.name,
                    price: it.price,
                    quantity: it.quantity ?? 1,
                  })),
                  billingInfo: currentFormData.useSameAddress ? undefined : {
                    address: currentFormData.address.trim(), // Use same address for now
                    city: currentFormData.city.trim(),
                    state: currentFormData.state.trim().toUpperCase(),
                    zipCode: normalizedZip,
                    country: currentFormData.country.trim().toUpperCase(),
                  },
                }

                // Enhanced debug logging
                console.log('📤 FINAL API PAYLOAD:')
                console.log('  � Email:', body.customerInfo.email)
                console.log('  👤 Name:', body.customerInfo.firstName, body.customerInfo.lastName)
                console.log('  📞 Phone:', body.customerInfo.phone)
                console.log('  🏠 Address:', body.customerInfo.address)
                console.log('  🏙️ City:', body.customerInfo.city)
                console.log('  🗺️ State:', body.customerInfo.state)
                console.log('  📮 ZIP:', body.customerInfo.zipCode)
                console.log('  🌍 Country:', body.customerInfo.country)
                console.log('  🎫 Token:', body.paymentToken.substring(0, 20) + '...')
                console.log('📋 Current form data from DOM:', currentFormData)
                console.log('🛒 Order items:', order?.items)

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
                  // Pass sessionId to error handler for duplicate transaction handling
                  console.log('📋 API error response:', data)
                  if (typeof onPaymentError === 'function') {
                    // Check if onPaymentError accepts sessionId parameter
                    if (onPaymentError.length > 1) {
                      onPaymentError(data.message || 'Payment processing failed.', data.errors, data.sessionId)
                    } else {
                      onPaymentError(data.message || 'Payment processing failed.')
                    }
                  } else {
                    onPaymentError(data.message || 'Payment processing failed.')
                  }
                }
              } catch (error) {
                console.error('Order submission error:', error)
                onPaymentError('Failed to process your order. Please try again.')
              } finally {
                setLoading(false)
              }
            } else {
              // Handle tokenization error
              console.error('❌ CollectJS tokenization failed:', response)
              console.error('📋 Response details:', JSON.stringify(response, null, 2))

              // Provide specific error messages based on response
              let errorMessage = 'Payment processing failed. Please check your card details.'
              if (response.error) {
                console.error('🔍 Specific error:', response.error)
                errorMessage = `Payment error: ${response.error}`
              }

              onPaymentError(errorMessage)
              setLoading(false)
            }
          },
          fieldsAvailableCallback: () => {
            console.log('✅ CollectJS fields are now available and ready for input')
            setCollectJSLoaded(true)
            
            // Additional validation to ensure fields are truly ready
            setTimeout(() => {
              const checkFields = () => {
                const cardField = document.querySelector('#card-number-field iframe')
                const expiryField = document.querySelector('#card-expiry-field iframe')
                const cvvField = document.querySelector('#card-cvv-field iframe')
                
                if (cardField && expiryField && cvvField) {
                  console.log('✅ All payment field iframes confirmed ready')
                  console.log('📝 You can now safely enter payment information')
                  console.log('  - Card Number iframe:', cardField ? 'present' : 'missing')
                  console.log('  - Expiry iframe:', expiryField ? 'present' : 'missing')  
                  console.log('  - CVV iframe:', cvvField ? 'present' : 'missing')
                  
                  // Check available CollectJS functions
                  if (window.CollectJS) {
                    const functions = Object.keys(window.CollectJS).filter(key => typeof (window.CollectJS as any)[key] === 'function')
                    console.log(`📌 Available CollectJS functions: ${functions.join(', ')}`)
                    
                    // Important: Check initial field validity
                    // CollectJS fields may be considered "valid" when empty initially
                    // This is important for enabling the submit button
                    if (window.CollectJS.isValid) {
                      setTimeout(() => {
                        const ccnumberValid = window.CollectJS.isValid?.('ccnumber') ?? false
                        const ccexpValid = window.CollectJS.isValid?.('ccexp') ?? false
                        const cvvValid = window.CollectJS.isValid?.('cvv') ?? false
                        
                        console.log('🎯 Initial field validity check:', {
                          ccnumber: ccnumberValid,
                          ccexp: ccexpValid,
                          cvv: cvvValid
                        })
                        
                        // Enable submission if fields are initially valid (may be empty but acceptable)
                        // The validationCallback will update this when user starts typing
                        const initiallyValid = ccnumberValid && ccexpValid && cvvValid
                        if (initiallyValid) {
                          console.log('✅ Fields initially valid, enabling submit button')
                          setFieldsValid(true)
                        } else {
                          console.log('⚠️ Fields not initially valid, submit button will remain disabled until valid')
                        }
                      }, 100) // Small delay to ensure CollectJS is fully initialized
                    }
                  }
                  
                  // Dispatch custom event for testing
                  window.dispatchEvent(new CustomEvent('collectjs:ready', { 
                    detail: { 
                      cardField: !!cardField, 
                      expiryField: !!expiryField, 
                      cvvField: !!cvvField 
                    } 
                  }))
                } else {
                  console.log('⚠️ Payment iframes not yet detected, checking again...')
                  console.log('  - Card Number iframe:', cardField ? 'present' : 'missing')
                  console.log('  - Expiry iframe:', expiryField ? 'present' : 'missing')
                  console.log('  - CVV iframe:', cvvField ? 'present' : 'missing')
                }
              }
              checkFields()
            }, 500)
          },
          validationCallback: (field: string, status: boolean, message: string) => {
            // Only log validation issues, not empty field states
            if (!status && message !== 'Field is empty') {
              console.log(`Field ${field} validation error:`, message)
            }

            // Check if all fields are valid for enhanced UX
            if (window.CollectJS && window.CollectJS.isValid) {
              const ccnumberValid = window.CollectJS.isValid('ccnumber')
              const ccexpValid = window.CollectJS.isValid('ccexp')
              const cvvValid = window.CollectJS.isValid('cvv')
              setFieldsValid(ccnumberValid && ccexpValid && cvvValid)
            }
          },
          timeoutCallback: () => {
            console.error('CollectJS timeout')
            onPaymentError('Payment system timeout. Please refresh and try again.')
            setLoading(false)
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

      // Cleanup interval after 60 seconds
      setTimeout(() => {
        clearInterval(checkCollectJS)
        if (!collectJSLoaded) {
          console.error('CollectJS failed to load within 60 seconds')
          onPaymentError('Payment system failed to load. Please refresh the page.')
        }
      }, 60000)

      return () => clearInterval(checkCollectJS)
    }
  }, [formData, order, apiEndpoint, onPaymentSuccess, onPaymentError])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    console.log(`📝 handleInputChange called: ${name} = "${value}"`)
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

  // onBlur validation handlers - standard behavior
  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setErrors(prev => ({ ...prev, email: 'Email is required' }))
    } else if (!validateEmail(value)) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email' }))
    } else {
      setErrors(prev => ({ ...prev, email: '' }))
    }
  }

  const handleAddressBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setErrors(prev => ({ ...prev, address: 'Address is required' }))
    } else {
      setErrors(prev => ({ ...prev, address: '' }))
    }
  }

  const handleCityBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setErrors(prev => ({ ...prev, city: 'City is required' }))
    } else {
      setErrors(prev => ({ ...prev, city: '' }))
    }
  }

  const handleStateBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setErrors(prev => ({ ...prev, state: 'State is required' }))
    } else {
      setErrors(prev => ({ ...prev, state: '' }))
    }
  }

  const handleZipBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setErrors(prev => ({ ...prev, zip: 'ZIP code is required' }))
    } else if (!validateZip(value)) {
      setErrors(prev => ({ ...prev, zip: 'Invalid ZIP code' }))
    } else {
      setErrors(prev => ({ ...prev, zip: '' }))
    }
  }

  const handlePhoneBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setErrors(prev => ({ ...prev, phone: 'Phone is required' }))
    } else if (!validatePhone(value)) {
      setErrors(prev => ({ ...prev, phone: 'Please enter a valid 10-digit phone number' }))
    } else {
      setErrors(prev => ({ ...prev, phone: '' }))
    }
  }

  // Billing address onBlur handlers - standard
  const handleBillingAddressBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setErrors(prev => ({ ...prev, billingAddress: 'Billing address is required' }))
    } else {
      setErrors(prev => ({ ...prev, billingAddress: '' }))
    }
  }

  const handleBillingCityBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setErrors(prev => ({ ...prev, billingCity: 'Billing city is required' }))
    } else {
      setErrors(prev => ({ ...prev, billingCity: '' }))
    }
  }

  const handleBillingStateBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setErrors(prev => ({ ...prev, billingState: 'Billing state is required' }))
    } else {
      setErrors(prev => ({ ...prev, billingState: '' }))
    }
  }

  const handleBillingZipBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setErrors(prev => ({ ...prev, billingZip: 'Billing ZIP is required' }))
    } else if (!validateZip(value)) {
      setErrors(prev => ({ ...prev, billingZip: 'Invalid ZIP code' }))
    } else {
      setErrors(prev => ({ ...prev, billingZip: '' }))
    }
  }

  // Standard validation functions - less strict
  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const validatePhone = (phone: string): boolean => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '')

    // US phone numbers: 10 digits or 11 digits starting with 1
    // Accepts formats like: 512 917 9292, 512-917-9292, (512)917-9292, +1 512 917 9292
    if (cleaned.length === 10) {
      return true // Standard 10-digit US number
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return true // 11-digit number with country code 1
    }
    return false
  }

  const validateZip = (zip: string): boolean => {
    const cleaned = zip.replace(/\D/g, '')
    // Standard ZIP validation: 5 digits or 9 digits (ZIP+4)
    return cleaned.length === 5 || cleaned.length === 9
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

    // Email validation - standard
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    // Address validation - standard
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required'
    }

    // City validation - standard
    if (!formData.city.trim()) {
      newErrors.city = 'City is required'
    }

    // State validation - standard
    if (!formData.state.trim()) {
      newErrors.state = 'State is required'
    }

    // ZIP validation - standard
    if (!formData.zip.trim()) {
      newErrors.zip = 'ZIP code is required'
    } else if (!validateZip(formData.zip)) {
      newErrors.zip = 'Invalid ZIP code'
    }

    // Phone validation - standard
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required'
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number'
    }

    // Name on Card validation - standard
    if (!formData.nameOnCard.trim()) {
      newErrors.nameOnCard = 'Name on card is required'
    }

    // CollectJS field validation - check if CollectJS validates the fields
    // CollectJS handles its own validation internally, but we can check if it's been initialized
    if (collectJSLoaded && window.CollectJS && window.CollectJS.isValid) {
      // Check card number
      if (!window.CollectJS.isValid('ccnumber')) {
        newErrors.cardNumber = 'Please enter a valid card number'
      }
      // Check expiry
      if (!window.CollectJS.isValid('ccexp')) {
        newErrors.expiry = 'Please enter a valid expiration date'
      }
      // Check CVV
      if (!window.CollectJS.isValid('cvv')) {
        newErrors.cvv = 'Please enter a valid security code'
      }
    } else if (!collectJSLoaded) {
      // If CollectJS isn't loaded yet, prevent submission
      newErrors.payment = 'Payment system is loading, please wait...'
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

    // Get form data from DOM as fallback if React state is not updated
    // This helps with testing and ensures form submission works even if state isn't synced
    const getDOMValues = () => {
      return {
        email: (document.querySelector('input[name="email"]') as HTMLInputElement)?.value || formData.email,
        nameOnCard: (document.querySelector('input[name="nameOnCard"]') as HTMLInputElement)?.value || formData.nameOnCard,
        phone: (document.querySelector('input[name="phone"]') as HTMLInputElement)?.value || formData.phone,
        address: (document.querySelector('input[name="address"]') as HTMLInputElement)?.value || formData.address,
        city: (document.querySelector('input[name="city"]') as HTMLInputElement)?.value || formData.city,
        state: (document.querySelector('input#state') as HTMLInputElement)?.value || formData.state,
        zip: (document.querySelector('input[name="zip"]') as HTMLInputElement)?.value || formData.zip,
      }
    }

    const currentValues = getDOMValues()
    console.log('🔍 Form values at submission:', currentValues)

    // Validate using DOM values as fallback
    const newErrors: FormErrors = {}
    
    if (!currentValues.email.trim()) {
      newErrors.email = 'Email is required'
    }
    if (!currentValues.nameOnCard.trim()) {
      newErrors.nameOnCard = 'Name on card is required'
    }
    if (!currentValues.address.trim()) {
      newErrors.address = 'Address is required'
    }
    if (!currentValues.city.trim()) {
      newErrors.city = 'City is required'
    }
    if (!currentValues.state.trim()) {
      newErrors.state = 'State is required'
    }
    if (!currentValues.zip.trim()) {
      newErrors.zip = 'ZIP code is required'
    }
    if (!currentValues.phone.trim()) {
      newErrors.phone = 'Phone is required'
    }
    
    const isValid = Object.keys(newErrors).length === 0
    
    if (!isValid) {
      
      const errorCount = Object.keys(newErrors).length
      if (errorCount > 0) {
        // Show user-friendly error message
        const missingFields = Object.keys(newErrors).map(field => {
          switch(field) {
            case 'email': return 'Email'
            case 'nameOnCard': return 'Name on Card'
            case 'address': return 'Billing Address'
            case 'phone': return 'Phone Number'
            case 'city': return 'City'
            case 'state': return 'State'
            case 'zip': return 'ZIP Code'
            default: return field
          }
        })
        
        onPaymentError(`Please fill in the following required fields: ${missingFields.join(', ')}`)
        
        // Scroll to the first error field
        const firstErrorField = Object.keys(newErrors)[0]
        const element = document.getElementById(firstErrorField)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.focus()
        }
      }
      return
    }

    if (!collectJSLoaded) {
      onPaymentError('Payment system is still loading. Please wait a moment and try again.')
      return
    }

    // CollectJS will validate the payment fields when startPaymentRequest is called
    // No need to pre-check fieldsValid here as CollectJS handles validation internally

    setLoading(true)
    console.log('🚀 Starting payment submission process...')
    console.log('📋 Form data at submission:', formData)

    try {
      // Trigger CollectJS tokenization
      if (window.CollectJS) {
        console.log('🎯 Calling CollectJS.startPaymentRequest()...')

        // Check if CollectJS fields are valid before starting
        if (window.CollectJS.isValid) {
          const ccnumberValid = window.CollectJS.isValid('ccnumber')
          const ccexpValid = window.CollectJS.isValid('ccexp')
          const cvvValid = window.CollectJS.isValid('cvv')

          console.log('🔍 CollectJS field validation status:')
          console.log(`  💳 Card Number: ${ccnumberValid ? '✅' : '❌'}`)
          console.log(`  📅 Expiry: ${ccexpValid ? '✅' : '❌'}`)
          console.log(`  🔒 CVV: ${cvvValid ? '✅' : '❌'}`)

          if (!ccnumberValid || !ccexpValid || !cvvValid) {
            console.warn('⚠️ Some payment fields are invalid, but proceeding with tokenization...')
          }
        }

        window.CollectJS.startPaymentRequest()
        console.log('✅ CollectJS.startPaymentRequest() called successfully')

        // Set a timeout to detect if callback never fires
        setTimeout(() => {
          if (loading) {
            console.error('⏰ CollectJS callback timeout - no response after 30 seconds')
            onPaymentError('Payment processing is taking too long. Please try again.')
            setLoading(false)
          }
        }, 30000) // 30 second timeout
      } else {
        throw new Error('CollectJS not available')
      }
    } catch (error) {
      console.error('❌ Payment submission error:', error)
      onPaymentError('Payment processing failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form 
      onSubmit={handleSubmit} 
      className="space-y-8" 
      id="checkout-form"
      autoComplete="on"
      name="checkout-form"
      noValidate
    >
      {/* Express Checkout Section - Exact from Design */}
      <div>
        <h3 className="text-center font-bold text-[2.07rem] text-[#969696]">
          Express Checkout
        </h3>
        <div className="flex justify-between gap-4 mt-6 flex-wrap md:flex-nowrap">
          <button
            className="cursor-pointer w-full md:w-1/3"
            aria-label="Pay with PayPal"
            type="button"
            onClick={() => console.log('PayPal checkout not yet implemented')}
          >
            <img
              className="w-full hidden md:inline-block"
              src="/assets/images/PayPal.svg"
              alt="PayPal"
              width="100"
              height="40"
              loading="lazy"
            />
            <img
              className="w-full inline-block md:hidden"
              src="/assets/images/paypal-big.svg"
              alt="PayPal"
              width="200"
              height="60"
              loading="eager"
              fetchPriority="high"
            />
          </button>
          <div className="flex justify-between gap-4 items-center w-full md:w-2/3">
            <button
              className="cursor-pointer w-1/2 md:w-full"
              aria-label="Pay with Apple Pay"
              type="button"
              onClick={() => console.log('Apple Pay checkout not yet implemented')}
            >
              <img
                className="w-full"
                src="/assets/images/applypay.svg"
                alt="Apple Pay"
                width="100"
                height="40"
                loading="lazy"
              />
            </button>
            <button
              className="cursor-pointer w-1/2 md:w-full"
              aria-label="Pay with Google Pay"
              type="button"
              onClick={() => console.log('Google Pay checkout not yet implemented')}
            >
              <img
                className="w-full"
                src="/assets/images/googlepay.svg"
                alt="Google Pay"
                width="100"
                height="40"
                loading="lazy"
              />
            </button>
          </div>
        </div>
        <div className="mt-10 mb-21.5 border-b-3 border-[#CDCDCD] relative">
          <span className="absolute inline-block bg-white w-31 left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 text-center text-[#A6A6A6] text-[2.13rem] font-medium">
            OR
          </span>
        </div>
      </div>

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
              title="Enter a 10-digit US phone number (any format)"
              maxLength={20}
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
            <div
              id="card-number-field"
              data-autocomplete="cc-number"
              className={`collectjs-field collectjs-card-number ${errors.cardNumber ? 'input-error' : ''}`}
            >
            </div>
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
              <div 
                id="card-expiry-field" 
                data-autocomplete="cc-exp"
                className={`w-full border-2 border-[#CDCDCD] px-9 py-7 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.expiry ? 'input-error' : ''}`}
              ></div>
              <label htmlFor="card-expiry-field" className="floating-label bg-transparent">
                Expiration Date{' '}(MM/YYYY)
              </label>
              {errors.expiry && (
                <div className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }}>
                  {errors.expiry}
                </div>
              )}
            </div>
            <div className="floating-label-group relative w-full lg:mb-0">
              {/* CollectJS mount point for CVV */}
              <div 
                id="card-cvv-field" 
                data-autocomplete="cc-csc"
                className={`w-full border-2 border-[#CDCDCD] pl-9 pr-17 py-7 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.cvv ? 'input-error' : ''}`}
              ></div>
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
                className="w-9 h-9 accent-[#666666] cursor-pointer"
                style={{ transform: 'scale(1.5)' }}
                id="sameAddress"
                checked={formData.useSameAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, useSameAddress: e.target.checked }))}
              />
              <span className="text-[#373738] font-medium text-[2.5rem]">
                Use shipping address as payment
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
                  defaultValue=""
                >
                  <option value="" disabled></option>
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
          disabled={loading || !collectJSLoaded}
          className="py-12 w-full rounded-full bg-[#F6C657] text-center font-bold text-[3.7rem] text-[#373737] leading-none disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Enhanced user feedback */}
        {!collectJSLoaded && (
          <p className="mt-4 text-center text-[1.8rem] text-gray-500">
            Loading secure payment system...
          </p>
        )}

        {collectJSLoaded && !loading && (
          <p className="mt-4 text-center text-[1.8rem] text-green-600">
            ✓ Secure payment system ready
          </p>
        )}
      </div>

      {/* Trust Badges - McAfee, Norton, TRUSTe */}
      <div className="flex justify-between items-center mt-11 w-full px-7.5 gap-10">
        <div className="w-1/3 flex justify-center">
          <img
            className="h-32 object-contain"
            src="/assets/images/mcafee-seeklogo.svg"
            alt="McAfee Secure"
            loading="lazy"
          />
        </div>
        <div className="w-1/3 flex justify-center">
          <img
            className="h-30 object-contain"
            src="/assets/images/Norton.svg"
            alt="Norton Secured"
            loading="lazy"
          />
        </div>
        <div className="w-1/3 flex justify-center">
          <img
            className="h-32 object-contain"
            src="/assets/images/Truste.svg"
            alt="TRUSTe Verified"
            loading="lazy"
          />
        </div>
      </div>
    </form>
  )
}
