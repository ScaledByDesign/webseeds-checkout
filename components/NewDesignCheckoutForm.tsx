'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Image from 'next/image'
import { FloatingLabelSelect } from './FloatingLabelInput'
import { validateCheckoutForm, type FormValidationResult } from '@/src/lib/validation/form-validation'
import { getCollectJSService } from '@/src/lib/collectjs-service'
import {
  createCollectJSValidationHandler,
  validateCollectJSFields,
  CollectJSValidationUtils,
  type CollectJSValidationState
} from '@/src/lib/validation'

// Google Places type declaration
declare global {
  interface Window {
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
  billingCountry?: string
}

interface FormErrors {
  [key: string]: string
}

interface NewDesignCheckoutFormProps {
  order: any
  onPaymentSuccess: (result: any) => void
  onPaymentError: (error: string, errors?: Record<string, string>, sessionId?: string) => void
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
  const [collectJSInitializing, setCollectJSInitializing] = useState(true)
  const [fieldsValid, setFieldsValid] = useState(false)
  const [cardFieldsTouched, setCardFieldsTouched] = useState(false)
  
  // Enhanced CollectJS validation state using new validation system
  const [fieldValidationState, setFieldValidationState] = useState<CollectJSValidationState>(
    CollectJSValidationUtils.createInitialState()
  )
  

  // Removed floating states - using pure CSS approach like the design
  const collectJSInitializedRef = useRef(false)
  const addressInputRef = useRef<HTMLInputElement>(null)
  
  // Store callbacks in refs to prevent reinitialization while keeping current values
  const onPaymentSuccessRef = useRef(onPaymentSuccess)
  const onPaymentErrorRef = useRef(onPaymentError)
  const apiEndpointRef = useRef(apiEndpoint)
  const orderRef = useRef(order)
  
  // Update refs when props change
  useEffect(() => {
    onPaymentSuccessRef.current = onPaymentSuccess
    onPaymentErrorRef.current = onPaymentError
    apiEndpointRef.current = apiEndpoint
    orderRef.current = order
  }, [onPaymentSuccess, onPaymentError, apiEndpoint, order])
  
  // Initialize CollectJS service
  const collectJSService = getCollectJSService()
  
  // Initialize CollectJS service with proper configuration and callbacks
  useEffect(() => {
    if (typeof window === 'undefined') return

    const initializeCollectJS = async () => {
      try {
        console.log('🚀 Initializing CollectJS service...')

        await collectJSService.initialize({
          fieldSelectors: {
            cardNumber: '#card-number-field',
            expiry: '#card-expiry-field',
            cvv: '#card-cvv-field'
          },
          onToken: async (result) => {
            console.log('🎯 Token generated:', result)
            if (result.success && result.token) {
              try {
                // Process payment with the token via API call
                console.log('💳 Processing payment with token via API...')

                // Structure data to match API schema (like original form)
                console.log('🔍 Debug - formData:', formData)
                console.log('🔍 Debug - orderRef.current:', orderRef.current)

                const normalizedEmail = formData.email.trim().toLowerCase()
                const normalizedName = formData.nameOnCard.trim()
                const normalizedPhone = formData.phone.replace(/\D/g, '') // Remove all non-digits
                const normalizedZip = formData.zip.replace(/\D/g, '') // Remove all non-digits

                const apiPayload = {
                  customerInfo: {
                    email: normalizedEmail,
                    firstName: normalizedName.split(' ')[0] || 'Customer',
                    lastName: normalizedName.split(' ').slice(1).join(' ') || normalizedName.split(' ')[0] || 'Customer',
                    phone: normalizedPhone,
                    address: formData.address.trim(),
                    city: formData.city.trim(),
                    state: formData.state.trim().toUpperCase(),
                    zipCode: normalizedZip,
                    country: formData.country.trim().toUpperCase(),
                  },
                  paymentToken: result.token,
                  products: (orderRef.current?.items || []).map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity ?? 1,
                  })),
                  billingInfo: formData.useSameAddress ? undefined : {
                    address: formData.billingAddress?.trim() || formData.address.trim(),
                    city: formData.billingCity?.trim() || formData.city.trim(),
                    state: (formData.billingState?.trim() || formData.state.trim()).toUpperCase(),
                    zipCode: formData.billingZip?.replace(/\D/g, '') || normalizedZip,
                    country: (formData.billingCountry || formData.country).trim().toUpperCase(),
                  },
                }

                console.log('📤 STRUCTURED API PAYLOAD:', apiPayload)
                console.log('🌐 Making API call to:', apiEndpointRef.current)

                // Make API call to process payment
                const response = await fetch(apiEndpointRef.current, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(apiPayload)
                })

                console.log('📡 API Response status:', response.status, response.statusText)

                if (!response.ok) {
                  throw new Error(`API call failed: ${response.status} ${response.statusText}`)
                }

                const apiResult = await response.json()
                console.log('📋 API Response data:', apiResult)

                if (apiResult.success) {
                  console.log('✅ Payment processed successfully via API')
                  onPaymentSuccessRef.current(apiResult)
                } else {
                  console.error('❌ API payment processing failed:', apiResult)
                  onPaymentErrorRef.current(apiResult.message || 'Payment processing failed.', apiResult.errors, apiResult.sessionId)
                }
              } catch (error) {
                console.error('❌ Payment API call failed:', error)
                onPaymentErrorRef.current('Failed to process payment. Please try again.')
              }
            } else {
              console.error('❌ Token generation failed:', result.error)
              onPaymentErrorRef.current(result.error || 'Payment token generation failed')
            }
            setLoading(false)
          },
          onValidation: createCollectJSValidationHandler(
            setErrors,
            setFieldValidationState,
            setFieldsValid,
            setCardFieldsTouched,
            cardFieldsTouched
          ),
          onReady: () => {
            console.log('✅ CollectJS service ready for tokenization')
            setCollectJSLoaded(true)
            setCollectJSInitializing(false)
          },
          onError: (error) => {
            console.error('❌ CollectJS error:', error)
            onPaymentErrorRef.current(error)
          }
        })

        console.log('✅ CollectJS service initialized successfully')

        // Add debugging function to window for testing
        if (typeof window !== 'undefined') {
          (window as any).debugCollectJS = () => {
            console.log('🔍 CollectJS Debug Info:');
            console.log('  Service ready:', collectJSService.isReady());
            console.log('  Local state - cardFieldsTouched:', cardFieldsTouched);
            console.log('  Local state - fieldsValid:', fieldsValid);
            console.log('  Local state - fieldValidationState:', fieldValidationState);
            console.log('  Local state - errors:', errors);
            console.log('  window.CollectJS:', !!window.CollectJS);
            console.log('  CollectJS iframes:', {
              cardNumber: !!document.querySelector('#card-number-field iframe'),
              expiry: !!document.querySelector('#card-expiry-field iframe'),
              cvv: !!document.querySelector('#card-cvv-field iframe')
            });
          };

          console.log('🛠️ Debug function available: window.debugCollectJS()');
        }
      } catch (error) {
        console.error('❌ Failed to initialize CollectJS service:', error)
        onPaymentErrorRef.current('Failed to initialize payment system. Please refresh the page.')
      }
    }

    // Initialize after a short delay to ensure DOM is ready
    const timer = setTimeout(() => {
      initializeCollectJS()
    }, 500)

    return () => {
      clearTimeout(timer)
    }
  }, []) // Empty dependencies - initialization happens once

  useEffect(() => {
   
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
          billingCity: prev.billingCity || data.city || '',
          billingState: prev.billingState || data.region_code || '',
        }))
        
        console.log('✅ GeoIP detection successful:', {
          country: data.country_name,
          state: data.region,
          city: data.city,
          zip: 'Not auto-filled (user must enter)'
        })
      }
    }

    // Run GeoIP detection on mount
    detectLocationAndFill()
  }, [])

  // Note: Card validation and formatting is handled by CollectJS
  // No need for client-side card detection since CollectJS uses secure iframes

  // Memoized form validation to prevent infinite loops
  const isFormValid = useMemo(() => {
    try {
      // Required form fields validation
      const requiredFieldsValid =
        formData.email?.trim() !== '' &&
        formData.nameOnCard?.trim() !== '' &&
        formData.phone?.trim() !== '' &&
        formData.address?.trim() !== '' &&
        formData.city?.trim() !== '' &&
        formData.state?.trim() !== '' &&
        formData.zip?.trim() !== '' &&
        formData.country?.trim() !== ''

      // Email format validation
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email?.trim() || '')

      // CollectJS fields validation - strict checking
      const collectJSFieldsValid =
        collectJSLoaded &&
        collectJSService.isReady() &&
        fieldValidationState.ccnumber === true &&
        fieldValidationState.ccexp === true &&
        fieldValidationState.cvv === true &&
        // Additional safety check - ensure all fields are actually validated
        typeof fieldValidationState.ccnumber === 'boolean' &&
        typeof fieldValidationState.ccexp === 'boolean' &&
        typeof fieldValidationState.cvv === 'boolean'
        // Note: Removed cardFieldsTouched requirement for better UX with auto-fill

      // Billing address validation - simplified logic
      let billingFieldsValid = true

      // Only validate billing fields if separate billing is enabled
      if (!formData.useSameAddress) {
        billingFieldsValid =
          (formData.billingAddress?.trim() || '') !== '' &&
          (formData.billingCity?.trim() || '') !== '' &&
          (formData.billingState?.trim() || '') !== '' &&
          (formData.billingZip?.trim() || '') !== '' &&
          (formData.billingCountry?.trim() || formData.country?.trim()) !== ''
      }

      // Filter out irrelevant errors for validation
      const relevantErrors = { ...errors }

      // Remove billing errors if using same address
      if (formData.useSameAddress) {
        delete relevantErrors.billingAddress
        delete relevantErrors.billingCity
        delete relevantErrors.billingState
        delete relevantErrors.billingZip
        delete relevantErrors.billingCountry
      }

      // Remove CollectJS field errors if fields are valid
      if (fieldValidationState.ccnumber === true) {
        delete relevantErrors.cardNumber
      }
      if (fieldValidationState.ccexp === true) {
        delete relevantErrors.expiry
      }
      if (fieldValidationState.cvv === true) {
        delete relevantErrors.cvv
      }

      // No validation errors
      const noErrors = Object.keys(relevantErrors).length === 0

      const isValid = requiredFieldsValid && emailValid && collectJSFieldsValid && billingFieldsValid && noErrors

      // Debug logging (only when validation state changes)
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Form Validation Debug:', {
          requiredFieldsValid,
          emailValid,
          collectJSFieldsValid,
          billingFieldsValid,
          useSameAddress: formData.useSameAddress,
          noErrors,
          errorCount: Object.keys(errors).length,
          isValid,
          // Detailed CollectJS breakdown
          collectJSLoaded,
          collectJSReady: collectJSService.isReady(),
          cardFieldStates: {
            ccnumber: fieldValidationState.ccnumber,
            ccexp: fieldValidationState.ccexp,
            cvv: fieldValidationState.cvv
          },
          cvvSpecificDebug: {
            cvvState: fieldValidationState.cvv,
            cvvType: typeof fieldValidationState.cvv,
            cvvStrictCheck: fieldValidationState.cvv === true,
            cvvTruthy: !!fieldValidationState.cvv
          },
          cardFieldsTouched,
          allErrors: Object.keys(errors).length > 0 ? errors : 'none',
          relevantErrors: Object.keys(relevantErrors).length > 0 ? relevantErrors : 'none'
        })

        // Additional focused debug for button state
        if (requiredFieldsValid && emailValid && collectJSFieldsValid && billingFieldsValid && !noErrors) {
          console.error('🚨 BUTTON DISABLED DUE TO ERRORS:', errors)
        }
        if (requiredFieldsValid && emailValid && collectJSFieldsValid && billingFieldsValid && noErrors) {
          console.log('✅ ALL VALIDATION PASSED - BUTTON SHOULD BE ENABLED!')
        }
      }

      return isValid
    } catch (error) {
      console.warn('Form validation error:', error)
      return false
    }
  }, [
    formData.email,
    formData.nameOnCard,
    formData.phone,
    formData.address,
    formData.city,
    formData.state,
    formData.zip,
    formData.country,
    formData.useSameAddress,
    formData.billingAddress,
    formData.billingCity,
    formData.billingState,
    formData.billingZip,
    formData.billingCountry,
    collectJSLoaded,
    fieldValidationState.ccnumber,
    fieldValidationState.ccexp,
    fieldValidationState.cvv,
    errors
  ])

  // Generate random realistic test data
  const generateRandomTestData = () => {
    // Arrays of realistic data
    const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen']
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin']
    const streetNames = ['Main', 'Oak', 'Maple', 'Cedar', 'Elm', 'Pine', 'Washington', 'Lake', 'Hill', 'Park', 'View', 'Forest', 'River', 'Spring', 'Church', 'Market', 'Center', 'School', 'Union', 'High']
    const streetTypes = ['Street', 'Avenue', 'Boulevard', 'Drive', 'Road', 'Lane', 'Way', 'Court', 'Place', 'Circle']
    const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington']
    const states = ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI', 'NJ', 'VA', 'WA', 'AZ', 'MA', 'TN', 'IN', 'MO', 'MD', 'WI']
    const emailDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'icloud.com', 'mail.com', 'protonmail.com', 'fastmail.com', 'zoho.com']
    const apartmentPrefixes = ['Apt', 'Suite', 'Unit', '#']
    
    // Helper functions
    const randomItem = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]
    const randomNumber = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
    
    // Generate random data
    const firstName = randomItem(firstNames)
    const lastName = randomItem(lastNames)
    const fullName = `${firstName} ${lastName}`
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNumber(1, 999)}@${randomItem(emailDomains)}`
    const streetNumber = randomNumber(100, 9999)
    const streetName = randomItem(streetNames)
    const streetType = randomItem(streetTypes)
    const address = `${streetNumber} ${streetName} ${streetType}`
    
    // Randomly include apartment
    const hasApartment = Math.random() > 0.5
    const apartment = hasApartment ? `${randomItem(apartmentPrefixes)} ${randomNumber(1, 999)}` : ''
    
    const city = randomItem(cities)
    const state = randomItem(states)
    const zip = randomNumber(10000, 99999).toString()
    
    // Generate phone with area code
    const areaCode = randomNumber(200, 999)
    const phonePrefix = randomNumber(200, 999)
    const phoneSuffix = randomNumber(1000, 9999)
    const phone = `${areaCode}-${phonePrefix}-${phoneSuffix}`

    // Determine if using same address (70% chance of using same address)
    const useSameAddress = Math.random() > 0.3

    // Generate billing address data if not using same address
    let billingData = {}
    if (!useSameAddress) {
      // Generate different billing address
      const billingStreetNumber = randomNumber(100, 9999)
      const billingStreetName = streetNames[Math.floor(Math.random() * streetNames.length)]
      const billingStreetType = streetTypes[Math.floor(Math.random() * streetTypes.length)]
      const billingAddress = `${billingStreetNumber} ${billingStreetName} ${billingStreetType}`

      const billingCity = cities[Math.floor(Math.random() * cities.length)]
      const billingState = states[Math.floor(Math.random() * states.length)]
      const billingZip = `${randomNumber(10000, 99999)}`

      billingData = {
        billingAddress,
        billingCity,
        billingState,
        billingZip
      }
    }

    return {
      email,
      address,
      apartment,
      city,
      state,
      zip,
      country: 'US',
      phone,
      nameOnCard: fullName,
      useSameAddress,
      ...billingData
    }
  }
  
  // Auto-fill with test data when autoFillTrigger changes
  useEffect(() => {
    if (autoFillTrigger > 0) {
      const randomData = generateRandomTestData()
      setFormData(randomData)

      // Log the generated test data
      console.log('🎲 Auto-filled with random test data:', randomData)
      console.log('ℹ️ CollectJS fields ready for user input')
    }
  }, [autoFillTrigger])



  // Initialize Google Places Autocomplete
  useEffect(() => {
    const initializeGooglePlaces = () => {
      if (window.google && window.google.maps && window.google.maps.places && addressInputRef.current) {
        const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
          types: ['address'],
          componentRestrictions: { country: ['us', 'ca', 'gb', 'au'] }, // Support major countries
          fields: ['address_components', 'formatted_address']
        })

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          if (place.address_components) {
            let streetNumber = ''
            let streetName = ''
            let city = ''
            let state = ''
            let postalCode = ''
            let country = ''

            place.address_components.forEach((component: any) => {
              const types = component.types
              if (types.includes('street_number')) {
                streetNumber = component.long_name
              }
              if (types.includes('route')) {
                streetName = component.long_name
              }
              if (types.includes('locality')) {
                city = component.long_name
              }
              if (types.includes('administrative_area_level_1')) {
                state = component.short_name
              }
              if (types.includes('postal_code')) {
                postalCode = component.long_name
              }
              if (types.includes('country')) {
                country = component.short_name
              }
            })

            const fullAddress = `${streetNumber} ${streetName}`.trim()

            setFormData(prev => ({
              ...prev,
              address: fullAddress || place.formatted_address || '',
              city: city || prev.city,
              state: state || prev.state,
              zip: postalCode || prev.zip,
              country: country || prev.country
            }))

            // Floating labels handled by CSS - no state management needed

            console.log('✅ Google Places autocomplete filled:', {
              address: fullAddress,
              city,
              state,
              zip: postalCode,
              country
            })
          }
        })
      }
    }

    // Try to initialize immediately if Google is already loaded
    if (window.google) {
      initializeGooglePlaces()
    } else {
      // Wait for Google Maps to load
      const checkGoogle = setInterval(() => {
        if (window.google) {
          initializeGooglePlaces()
          clearInterval(checkGoogle)
        }
      }, 100)

      // Clean up interval after 10 seconds
      setTimeout(() => clearInterval(checkGoogle), 10000)
    }
  }, [])

  // Handle input focus to ensure floating label consistency
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Add a class to the parent to force label floating on focus
    const parent = e.target.closest('.floating-label-group')
    if (parent) {
      parent.classList.add('input-focused')
    }
  }

  // Handle input blur to manage floating label state  
  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const parent = e.target.closest('.floating-label-group')
    if (parent) {
      parent.classList.remove('input-focused')
      // Only keep label floating if input has value
      if (e.target.value.trim()) {
        parent.classList.add('has-value')
      } else {
        parent.classList.remove('has-value')
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    console.log(`📝 handleInputChange called: ${name} = "${value}"`)
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Manage has-value class for floating labels
    const parent = e.target.closest('.floating-label-group')
    if (parent) {
      if (value.trim()) {
        parent.classList.add('has-value')
      } else {
        parent.classList.remove('has-value')
      }
    }

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

  // Specialized handler for phone input - only allow numbers and common separators
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    // Allow only digits, spaces, hyphens, parentheses, and plus sign
    const filteredValue = value.replace(/[^\d\s\-\(\)\+]/g, '')
    console.log(`📞 handlePhoneChange: ${name} = "${filteredValue}" (filtered from "${value}")`)

    setFormData(prev => ({
      ...prev,
      [name]: filteredValue
    }))

    // Manage has-value class for floating labels
    const parent = e.target.closest('.floating-label-group')
    if (parent) {
      if (filteredValue.trim()) {
        parent.classList.add('has-value')
      } else {
        parent.classList.remove('has-value')
      }
    }

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  // Specialized handler for ZIP input - filter based on country
  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    let filteredValue = value

    // Filter based on country
    if (formData.country === 'us') {
      // US ZIP: only digits and hyphen
      filteredValue = value.replace(/[^\d\-]/g, '')
      // Limit to 5+4 format (12345-1234)
      if (filteredValue.length > 10) {
        filteredValue = filteredValue.substring(0, 10)
      }
    } else {
      // International: allow alphanumeric, spaces, and hyphens
      filteredValue = value.replace(/[^A-Za-z0-9\s\-]/g, '')
      // Limit to reasonable length
      if (filteredValue.length > 10) {
        filteredValue = filteredValue.substring(0, 10)
      }
    }

    console.log(`📮 handleZipChange: ${name} = "${filteredValue}" (filtered from "${value}", country: ${formData.country})`)

    setFormData(prev => ({
      ...prev,
      [name]: filteredValue
    }))

    // Manage has-value class for floating labels
    const parent = e.target.closest('.floating-label-group')
    if (parent) {
      if (filteredValue.trim()) {
        parent.classList.add('has-value')
      } else {
        parent.classList.remove('has-value')
      }
    }

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
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
        country: (document.querySelector('select[name="country"]') as HTMLSelectElement)?.value || formData.country,
      }
    }

    const currentValues = getDOMValues()
    console.log('🔍 Form values at submission:', currentValues)

    // Validate using DOM values as fallback - ORDER: Top to Bottom as displayed
    const newErrors: FormErrors = {}
    
    // 1. Contact section - Email validation
    if (!currentValues.email.trim()) {
      newErrors.email = 'Email is required'
    } else {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(currentValues.email.trim())) {
        newErrors.email = 'Please enter a valid email address'
      }
    }

    // 2. Shipping section (in order of appearance)
    if (!currentValues.address.trim()) {
      newErrors.address = 'Address is required'
    }
    // Note: Apartment is optional, no validation needed
    if (!currentValues.city.trim()) {
      newErrors.city = 'City is required'
    }
    if (!currentValues.state.trim()) {
      newErrors.state = 'State is required'
    }

    // ZIP code validation - international vs US
    if (!currentValues.zip.trim()) {
      newErrors.zip = 'ZIP code is required'
    } else {
      const zipValue = currentValues.zip.trim()
      if (currentValues.country === 'us') {
        // US ZIP code: 5 digits or 5+4 format (12345 or 12345-1234)
        const usZipRegex = /^\d{5}(-\d{4})?$/
        if (!usZipRegex.test(zipValue)) {
          newErrors.zip = 'Please enter a valid US ZIP code (e.g., 12345 or 12345-1234)'
        }
      } else {
        // International postal codes: allow alphanumeric and common separators
        const intlZipRegex = /^[A-Za-z0-9\s\-]{3,10}$/
        if (!intlZipRegex.test(zipValue)) {
          newErrors.zip = 'Please enter a valid postal code'
        }
      }
    }

    // Phone number validation - numbers only
    if (!currentValues.phone.trim()) {
      newErrors.phone = 'Phone is required'
    } else {
      // Remove all non-digit characters for validation
      const phoneDigits = currentValues.phone.replace(/\D/g, '')
      if (phoneDigits.length < 10) {
        newErrors.phone = 'Please enter a valid phone number (at least 10 digits)'
      } else if (phoneDigits.length > 15) {
        newErrors.phone = 'Phone number is too long (maximum 15 digits)'
      }
    }
    
    // 3. Payment section (last)
    if (!currentValues.nameOnCard.trim()) {
      newErrors.nameOnCard = 'Name on card is required'
    }

    // 4. Billing address validation (if separate billing is used)
    if (!formData.useSameAddress) {
      // Get billing values from DOM
      const billingAddress = (document.querySelector('input[name="billingAddress"]') as HTMLInputElement)?.value || formData.billingAddress || ''
      const billingCity = (document.querySelector('input[name="billingCity"]') as HTMLInputElement)?.value || formData.billingCity || ''
      const billingState = (document.querySelector('input[name="billingState"]') as HTMLInputElement)?.value || formData.billingState || ''
      const billingZip = (document.querySelector('input[name="billingZip"]') as HTMLInputElement)?.value || formData.billingZip || ''
      const billingCountry = (document.querySelector('select[name="billingCountry"]') as HTMLSelectElement)?.value || formData.billingCountry || formData.country

      if (!billingAddress.trim()) {
        newErrors.billingAddress = 'Billing address is required'
      }
      if (!billingCity.trim()) {
        newErrors.billingCity = 'Billing city is required'
      }
      if (!billingState.trim()) {
        newErrors.billingState = 'Billing state is required'
      }
      if (!billingZip.trim()) {
        newErrors.billingZip = 'Billing ZIP code is required'
      } else {
        // Apply same ZIP validation logic as shipping, but use billing country
        if (billingCountry === 'us') {
          const usZipRegex = /^\d{5}(-\d{4})?$/
          if (!usZipRegex.test(billingZip.trim())) {
            newErrors.billingZip = 'Please enter a valid US ZIP code (e.g., 12345 or 12345-1234)'
          }
        } else {
          const intlZipRegex = /^[A-Za-z0-9\s\-]{3,10}$/
          if (!intlZipRegex.test(billingZip.trim())) {
            newErrors.billingZip = 'Please enter a valid postal code'
          }
        }
      }
      if (!billingCountry.trim()) {
        newErrors.billingCountry = 'Billing country is required'
      }
    }

    // 5. CollectJS Card Validation - CRITICAL for payment processing
    if (collectJSLoaded && collectJSService.isReady()) {
      // Use the new simplified validation system
      const collectJSErrors = validateCollectJSFields(fieldValidationState, cardFieldsTouched)

      // Merge CollectJS validation errors
      Object.assign(newErrors, collectJSErrors)

      console.log('🔧 CollectJS Debug Info:')
      console.log('  - Service isReady:', collectJSService.isReady())
      console.log('  - cardFieldsTouched:', cardFieldsTouched)
      console.log('  - fieldsValid:', fieldsValid)
      console.log('  - fieldValidationState:', fieldValidationState)
      console.log('  - collectJSErrors:', collectJSErrors)
    } else if (!collectJSLoaded) {
      newErrors.payment = 'Payment system is still loading. Please wait...'
    }
    
    const isValid = Object.keys(newErrors).length === 0
    
    if (!isValid) {
      // Set all errors to state for inline display
      setErrors(newErrors)
      
      const errorCount = Object.keys(newErrors).length
      if (errorCount > 0) {
        // Log validation issues for debugging
        console.log('Form validation failed with errors:', newErrors)
        
        // Scroll to the first error field
        const firstErrorField = Object.keys(newErrors)[0]
        
        // Special handling for payment fields
        if (firstErrorField === 'cardNumber' || firstErrorField === 'expiry' || firstErrorField === 'cvv') {
          // For CollectJS fields, find the iframe container
          const paymentSection = document.querySelector('.collectjs-field')
          if (paymentSection) {
            paymentSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        } else {
          // For regular form fields
          const element = document.getElementById(firstErrorField)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            element.focus()
          }
        }
      }
      return
    }

    setLoading(true)
    console.log('🚀 Starting payment submission process...')
    console.log('📋 Form data at submission:', formData)

    try {
      // Use centralized CollectJS service for payment
      console.log('🔍 Checking CollectJS service readiness...')
      console.log('  - Service exists:', !!collectJSService)
      console.log('  - isReady:', collectJSService.isReady())
      
      if (collectJSService.isReady()) {
        console.log('🎯 Using CollectJS service for tokenization...')

        // Check if CollectJS fields are valid before starting
        console.log('🔍 CollectJS field validation status:')
        console.log(`  📝 Card fields touched: ${cardFieldsTouched ? '✅' : '❌'}`)
        console.log(`  ✔️ Fields valid: ${fieldsValid ? '✅' : '❌'}`)
        console.log(`  📊 Field validation state:`, fieldValidationState)

        // Use local validation state as primary source of truth
        // Check if user has entered card information
        if (!cardFieldsTouched) {
          console.warn('⚠️ No card information entered')
          // Set inline errors for empty fields
          setErrors(prev => ({
            ...prev,
            cardNumber: 'Card number is required',
            expiry: 'Expiration date is required',
            cvv: 'Security code is required'
          }))
          
          // Focus first error field (card number iframe)
          const cardNumberFrame = document.querySelector('.collectjs-card-number') as HTMLIFrameElement
          if (cardNumberFrame) {
            cardNumberFrame.focus()
            // Scroll to the payment section
            cardNumberFrame.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
          
          setLoading(false)
          return
        }
        
        // Check if entered card information is valid
        if (!fieldsValid) {
          console.warn('⚠️ Card information is invalid')
          console.log('🔍 Field validation state:', fieldValidationState)

          // Set inline errors for invalid fields based on local validation state
          setErrors(prev => ({
            ...prev,
            cardNumber: !fieldValidationState.ccnumber ? (prev.cardNumber || 'Please check your card number') : prev.cardNumber,
            expiry: !fieldValidationState.ccexp ? (prev.expiry || 'Please check the expiration date') : prev.expiry,
            cvv: !fieldValidationState.cvv ? (prev.cvv || 'Please check the security code') : prev.cvv
          }))
          
          // Focus first error field
          const firstErrorField = document.querySelector('.input-error') as HTMLElement
          if (firstErrorField) {
            firstErrorField.focus()
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
          
          setLoading(false)
          return
        }

        // Use CollectJS service to start payment request with custom callback
        await collectJSService.startPaymentRequest(async (result) => {
          console.log('🎯 Token generated via custom callback:', result)
          if (result.success && result.token) {
            try {
              // Process payment with the token via API call
              console.log('💳 Processing payment with token via API...')

              // Structure data to match API schema (like original form)
              console.log('🔍 Debug - formData:', formData)
              console.log('🔍 Debug - orderRef.current:', orderRef.current)

              const normalizedEmail = formData.email.trim().toLowerCase()
              const normalizedName = formData.nameOnCard.trim()
              const normalizedPhone = formData.phone.replace(/\D/g, '') // Remove all non-digits
              const normalizedZip = formData.zip.replace(/\D/g, '') // Remove all non-digits

              const apiPayload = {
                customerInfo: {
                  email: normalizedEmail,
                  firstName: normalizedName.split(' ')[0] || 'Customer',
                  lastName: normalizedName.split(' ').slice(1).join(' ') || normalizedName.split(' ')[0] || 'Customer',
                  phone: normalizedPhone,
                  address: formData.address.trim(),
                  city: formData.city.trim(),
                  state: formData.state.trim().toUpperCase(),
                  zipCode: normalizedZip,
                  country: formData.country.trim().toUpperCase(),
                },
                paymentToken: result.token,
                products: (orderRef.current?.items || []).map((item: any) => ({
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity ?? 1,
                })),
                billingInfo: formData.useSameAddress ? undefined : {
                  address: formData.billingAddress?.trim() || formData.address.trim(),
                  city: formData.billingCity?.trim() || formData.city.trim(),
                  state: (formData.billingState?.trim() || formData.state.trim()).toUpperCase(),
                  zipCode: formData.billingZip?.replace(/\D/g, '') || normalizedZip,
                  country: (formData.billingCountry || formData.country).trim().toUpperCase(),
                },
              }

              console.log('📤 STRUCTURED API PAYLOAD:', apiPayload)
              console.log('🌐 Making API call to:', apiEndpointRef.current)

              // Make API call to process payment
              const response = await fetch(apiEndpointRef.current, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(apiPayload)
              })

              console.log('📡 API Response status:', response.status, response.statusText)

              if (!response.ok) {
                let errorMessage = 'Payment processing failed. Please try again.'

                try {
                  const errorData = await response.json()
                  console.error('❌ Payment API call failed:', errorData)

                  // Handle duplicate orders as successful (redirect to upsell)
                  if (errorData.message?.toLowerCase().includes('duplicate') ||
                      errorData.error?.toLowerCase().includes('duplicate') ||
                      errorData.message?.includes('already processed')) {
                    console.log('✅ Duplicate order detected - treating as successful')
                    const duplicateResult = {
                      success: true,
                      message: 'Order already processed',
                      transactionId: 'duplicate-' + Date.now(), // Fake transaction ID to trigger direct redirect
                      vaultId: 'duplicate-vault', // Fake vault ID to trigger direct redirect
                      orderId: errorData.orderId || 'duplicate',
                      isDuplicate: true
                      // Note: No sessionId to avoid triggering payment status polling
                    }
                    onPaymentSuccessRef.current(duplicateResult)
                    return // Exit early, don't throw error
                  }

                  // Provide user-friendly error messages based on API response
                  if (response.status === 400) {
                    if (errorData.message?.includes('card')) {
                      errorMessage = 'There was an issue with your card information. Please check your card details and try again.'
                    } else if (errorData.message?.includes('address')) {
                      errorMessage = 'Please verify your billing address information and try again.'
                    } else if (errorData.message?.includes('zip') || errorData.message?.includes('postal')) {
                      errorMessage = 'Please check your ZIP/postal code and try again.'
                    } else if (errorData.message?.includes('cvv') || errorData.message?.includes('security')) {
                      errorMessage = 'Please check your card security code (CVV) and try again.'
                    } else if (errorData.message?.includes('expir')) {
                      errorMessage = 'Please check your card expiration date and try again.'
                    } else {
                      errorMessage = errorData.message || 'Please check your payment information and try again.'
                    }
                  } else if (response.status === 402) {
                    errorMessage = 'Your card was declined. Please try a different payment method.'
                  } else if (response.status === 429) {
                    errorMessage = 'Too many attempts. Please wait a moment and try again.'
                  } else if (response.status >= 500) {
                    errorMessage = 'Our payment system is temporarily unavailable. Please try again in a few minutes.'
                  }
                } catch (parseError) {
                  // If we can't parse the error response, check for duplicate in text response
                  const errorText = await response.text()
                  console.error('❌ Could not parse error response:', parseError)

                  // Check for duplicate order in text response
                  if (errorText.includes('duplicate') || errorText.includes('already processed')) {
                    console.log('✅ Duplicate order detected in text response - treating as successful')
                    const duplicateResult = {
                      success: true,
                      message: 'Order already processed',
                      orderId: 'duplicate',
                      isDuplicate: true
                    }
                    onPaymentSuccessRef.current(duplicateResult)
                    return // Exit early, don't throw error
                  }

                  if (response.status === 400) {
                    errorMessage = 'Please check your payment information and try again.'
                  } else if (response.status === 402) {
                    errorMessage = 'Your card was declined. Please try a different payment method.'
                  } else if (response.status >= 500) {
                    errorMessage = 'Our payment system is temporarily unavailable. Please try again in a few minutes.'
                  }
                }

                throw new Error(errorMessage)
              }

              const apiResult = await response.json()
              console.log('📋 API Response data:', apiResult)

              if (apiResult.success) {
                console.log('✅ Payment processed successfully via API')
                onPaymentSuccessRef.current(apiResult)
              } else {
                console.error('❌ API payment processing failed:', apiResult)
                onPaymentErrorRef.current(apiResult.message || 'Payment processing failed.', apiResult.errors, apiResult.sessionId)
              }
            } catch (error) {
              console.error('❌ Payment API call failed:', error)

              // Use the enhanced error message from our API error handling
              let userMessage = 'Failed to process payment. Please try again.'
              if (error instanceof Error) {
                userMessage = error.message
              }

              onPaymentErrorRef.current(userMessage)
            }
          } else {
            console.error('❌ Token generation failed:', result.error)
            onPaymentErrorRef.current(result.error || 'Payment token generation failed')
          }
          setLoading(false)
        })
        console.log('✅ CollectJS service payment request initiated')

      } else {
        throw new Error('CollectJS service not ready')
      }
    } catch (error) {
      console.error('❌ Payment submission error:', error)

      // Provide user-friendly error messages
      let userMessage = 'Payment processing failed. Please try again.'

      if (error instanceof Error) {
        if (error.message.includes('CollectJS service not ready')) {
          userMessage = 'Payment system is still loading. Please wait a moment and try again.'
        } else if (error.message.includes('validation')) {
          userMessage = 'Please check your payment information and try again.'
        } else {
          userMessage = error.message
        }
      }

      onPaymentErrorRef.current(userMessage)
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


      {/* Contact Information */}
      <div>
        <h3 className="mb-6 text-[#373738] font-medium sm:text-[2.7rem] text-[3.5rem]">
          Contact
        </h3>
        <div className="">
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
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
            <label htmlFor="email" className="floating-label bg-transparent hidden sm:block">
              Email{' '}
              <span className="text-[1.6rem] text-[#a2a2a2]">(To receive order confirmation email)</span>
            </label>
            
          </div>{errors.email && (
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



      {/* Shipping */}
      <div>
        <h3 className="mb-6 text-[#373738] font-medium sm:text-[2.7rem] text-[3.5rem]">
          Shipping
        </h3>
        <div className="">
          <div className="floating-label-group">
            <input
              ref={addressInputRef}
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
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
            <label htmlFor="address" className="floating-label bg-transparent">
              Street Address
            </label>
           
          </div> {errors.address && (
              <div
                id="address-error"
                className="text-2xl mt-2 error-message"
                style={{ color: '#dc2626' }}
              >
                {errors.address}
              </div>
            )}

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
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
            <label htmlFor="apartment" className="floating-label bg-transparent">
              Apartment, suite, etc{' '}
              <span className="text-[1.6rem] text-[#a2a2a2]">(optional)</span>
            </label>
            
          </div>
{errors.apartment && (
              <div
                id="apartment-error"
                className="text-2xl mt-2 error-message"
                style={{ color: '#dc2626' }}
              >
                {errors.apartment}
              </div>
            )}
          <div className="sm:flex justify-between gap-7 sm:space-y-0">
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
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
                <label htmlFor="city" className="floating-label bg-transparent">
                  City
                </label>
                
              </div>{errors.city && (
                  <div
                    id="city-error"
                    className="text-2xl mt-2 error-message"
                    style={{ color: '#dc2626' }}
                  >
                    {errors.city}
                  </div>
                )}
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
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
                <label htmlFor="state" className="floating-label bg-transparent">
                  State
                </label>
                
              </div>{errors.state && (
                  <div
                    id="state-error"
                    className="text-2xl mt-2 error-message"
                    style={{ color: '#dc2626' }}
                  >
                    {errors.state}
                  </div>
                )}
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
                  onChange={handleZipChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
                <label htmlFor="zip" className="floating-label bg-transparent">
                  Zip Code
                </label>
                
              </div>{errors.zip && (
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

          <FloatingLabelSelect
            id="country"
            name="country"
            label="Country"
            required
            value={formData.country}
            onChange={handleInputChange}
            autoComplete="country"
            error={errors.country}
            isValid={!errors.country && !!formData.country && formData.country !== ''}
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
              onChange={handlePhoneChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
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
           
          </div> {errors.phone && (
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

      {/* Payment - Exact 1:1 Copy from Design */}
      <div className="mt-7.5 relative">
        <h3 className="mt:40 sm:mt:0 mb-4 text-[#373738] font-medium sm:text-[2.7rem] text-[3.5rem]">
          Payment
        </h3>
        <p className="flex gap-2 mb-10 items-center font-medium text-[1.94rem] text-[#6d6d6d] hidden md:block">
          All transactions are secure and encrypted &nbsp;
          <Image
            className="w-6 inline-block -mt-3"
            src="/assets/images/lock.svg"
            alt="Secure"
            width={16}
            height={16}
          />
        </p>
        <p className="absolute right-0 transform top-5 flex gap-2 items-center font-medium text-[1.94rem] text-[#6d6d6d7] sm:hidden md:hidden lg:hidden xl:hidden block">
          <Image
            className="w-6 inline-block"
            src="/assets/images/lock.svg"
            alt="Secure"
            width={16}
            height={16}
          />
          Secure & Encrypted 
        </p>
        <div className="">
          <div className="floating-label-group relative ">
            {/* CollectJS mount point for card number */}
            <div
              id="card-number-field"
              data-autocomplete="cc-number"
              role="textbox"
              aria-label="Card Number"
              aria-required="true"
              aria-invalid={!!errors.cardNumber}
              aria-describedby={errors.cardNumber ? "card-number-error" : undefined}
              className={`collectjs-field collectjs-card-number w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.cardNumber ? 'input-error' : ''} ${!errors.cardNumber && fieldValidationState.ccnumber ? 'border-green-500' : ''}`}
            >
              {collectJSInitializing && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 z-10">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                </div>
              )}
            </div>
            <label htmlFor="card-number-field" className="floating-label bg-transparent">
              Card Number
            </label>
           
            <div className="absolute top-1/2 right-4 -translate-y-1/2 flex gap-2 z-10 pointer-events-none">
              <Image
                className="h-14 opacity-90"
                src="/assets/images/visa.svg"
                alt="Visa"
                width={52}
                height={52}
              />
              <Image
                className="h-14 opacity-90"
                src="/assets/images/mastercard.svg"
                alt="Mastercard"
                width={52}
                height={52}
              />
              <Image
                className="h-14 opacity-90"
                src="/assets/images/american-express.svg"
                alt="American Express"
                width={52}
                height={52}
              />
            </div>
          </div>
           {errors.cardNumber && (
              <div id="card-number-error" className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }} role="alert">
                {errors.cardNumber}
              </div>
            )}
          <div className="sm:flex justify-between gap-7 sm:space-y-0">
            <div className="w-full">
              <div className="floating-label-group relative">
                {/* CollectJS mount point for expiry */}
                <div
                  id="card-expiry-field"
                  data-autocomplete="cc-exp"
                  role="textbox"
                  aria-label="Expiration Date MM/YY format"
                  aria-required="true"
                  aria-invalid={!!errors.expiry}
                  aria-describedby={errors.expiry ? "expiry-error" : "expiry-hint"}
                  className={`collectjs-field w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.expiry ? 'input-error' : ''} ${!errors.expiry && fieldValidationState.ccexp ? 'border-green-500' : ''}`}
                >
                  {collectJSInitializing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 z-10 rounded-xl">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                    </div>
                  )}
                
                </div>
                <label htmlFor="card-expiry-field" className="floating-label bg-transparent">
                  Expiration Date (MM/YY)
                </label>
            

              </div>{errors.expiry && (
                  <div
                    id="expiry-error"
                    className="text-2xl mt-2 error-message"
                    style={{ color: '#dc2626' }}
                    role="alert"
                  >
                    {errors.expiry}
                  </div>
                )}
            </div>
            <div className="w-full">
              <div className="floating-label-group relative">
                {/* CollectJS mount point for CVV */}
                <div
                  id="card-cvv-field"
                  data-autocomplete="cc-csc"
                  role="textbox"
                  aria-label="Security Code CVV"
                  aria-required="true"
                  aria-invalid={!!errors.cvv}
                  aria-describedby={errors.cvv ? "cvv-error" : undefined}
                  className={`collectjs-field collectjs-cvv w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.cvv ? 'input-error' : ''} ${!errors.cvv && fieldValidationState.cvv ? 'border-green-500' : ''}`}
                >
                  {collectJSInitializing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 z-10 rounded-xl">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                    </div>
                  )}
                </div>
                <label htmlFor="card-cvv-field" className="floating-label bg-transparent">
                  Security Code
                </label>

                <span className="absolute w-10 top-1/2 right-9 -translate-y-1/2 z-10 pointer-events-none">
                  <Image
                    src="/assets/images/info.svg"
                    alt="Info"
                    width={40}
                    height={40}
                  />
                </span>

              </div>{errors.cvv && (
                  <div
                    id="cvv-error"
                    className="text-2xl mt-2 error-message"
                    style={{ color: '#dc2626' }}
                    role="alert"
                  >
                    {errors.cvv}
                  </div>
                )}
            </div>
          </div>
          <div  style={{paddingTop:'1rem'}}></div>
          <div className="floating-label-group" >
            <input
              type="text"
              id="nameOnCard"
              name="nameOnCard"
              className={`w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.nameOnCard ? 'input-error' : ''}`}
              value={formData.nameOnCard}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder=" "
              required
              autoComplete="cc-name"
              aria-required="true"
            />
            <label htmlFor="nameOnCard" className="floating-label bg-transparent">
              Name On Card
            </label>
            
          </div>
{errors.nameOnCard && (
              <div className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }}>
                {errors.nameOnCard}
              </div>
            )}
          <div>
            <label className="flex items-center gap-4 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-7 h-7 accent-[#666666] cursor-pointer"
              
                id="sameAddress"
                checked={formData.useSameAddress}
                onChange={(e) => {
                  const isChecked = e.target.checked
                  setFormData(prev => ({ ...prev, useSameAddress: isChecked }))
                  // Clear billing address errors when using same address
                  if (isChecked) {
                    setErrors(prev => ({
                      ...prev,
                      billingAddress: '',
                      billingCity: '',
                      billingState: '',
                      billingZip: ''
                    }))
                  }
                }}
              />
                <p className="flex items-center font-medium text-[1.94rem] text-[#6d6d6d] hidden md:block">
          Use shipping address as payment&nbsp;</p>
            </label>
          </div>

          {/* Billing Address Section - Conditional based on checkbox */}
          {!formData.useSameAddress && (
            <div id="billing-section" className="mt-8 pt-8 border-t-3 border-[#CDCDCD]">
              <h4 className="mb-8 text-[#373738] font-medium text-[2.25rem]">
                Billing Address
              </h4>
            <div className="">
              <div className="floating-label-group">
                <input
                  type="text"
                  id="billing-address"
                  name="billingAddress"
                  className={`w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.billingAddress ? 'input-error' : ''}`}
                  placeholder=" "
                  value={formData.billingAddress || ''}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
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
              <div className="sm:flex justify-between gap-4 sm:space-y-0">
                <div className="floating-label-group w-full">
                  <input
                    type="text"
                    id="billing-city"
                    name="billingCity"
                    className={`w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.billingCity ? 'input-error' : ''}`}
                    placeholder=" "
                    value={formData.billingCity || ''}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
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
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
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
                <div className="w-full">
                  <div className="floating-label-group">
                    <input
                      type="text"
                      id="billing-zip"
                      name="billingZip"
                      className={`w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.billingZip ? 'input-error' : ''}`}
                      placeholder=" "
                      pattern="[0-9]{5}(-[0-9]{4})?"
                      maxLength={10}
                      required
                      autoComplete="postal-code"
                      aria-required="true"
                      inputMode="numeric"
                      value={formData.billingZip || ''}
                      onChange={handleZipChange}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                    />
                    <label htmlFor="billing-zip" className="floating-label bg-transparent">
                      Zip Code
                    </label>

                  </div>{errors.billingZip && (
                      <div
                        id="billing-zip-error"
                        className="text-2xl mt-2 error-message"
                        style={{ color: '#dc2626' }}
                      >
                        {errors.billingZip}
                      </div>
                    )}
                </div>
              </div>
              <FloatingLabelSelect
                id="billing-country"
                name="billingCountry"
                label="Country"
                required
                value={formData.billingCountry || formData.country}
                onChange={handleInputChange}
                autoComplete="country"
                error={errors.billingCountry}
                isValid={!errors.billingCountry && !!(formData.billingCountry || formData.country) && (formData.billingCountry || formData.country) !== ''}
              >
                <option value="" disabled></option>
                <option value="us">United States</option>
                <option value="ca">Canada</option>
                <option value="uk">United Kingdom</option>
                <option value="au">Australia</option>
                <option value="nz">New Zealand</option>
              </FloatingLabelSelect>
            </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="mt-25">
        <button
          type="submit"
          disabled={loading || !collectJSLoaded || !isFormValid}
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

        {collectJSLoaded && !loading && !isFormValid && (
          <div className="mt-4 text-center">
            <p className="text-[1.6rem] text-red-600">
              Please complete all required fields to continue
            </p>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-2 text-[1.2rem] text-gray-400">
                <summary className="cursor-pointer">Debug Info</summary>
                <div className="mt-1 text-left max-w-md mx-auto">
                  <p>Required Fields: {formData.email?.trim() && formData.nameOnCard?.trim() && formData.phone?.trim() && formData.address?.trim() && formData.city?.trim() && formData.state?.trim() && formData.zip?.trim() && formData.country?.trim() ? '✅' : '❌'}</p>
                  <p>Email Valid: {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email?.trim() || '') ? '✅' : '❌'}</p>
                  <p>CollectJS Ready: {collectJSLoaded && collectJSService.isReady() ? '✅' : '❌'}</p>
                  <p>Card Fields: {fieldValidationState.ccnumber === true && fieldValidationState.ccexp === true && fieldValidationState.cvv === true && cardFieldsTouched ? '✅' : '❌'}</p>
                  <p>Billing: {formData.useSameAddress ? '✅ (using same)' : (formData.billingAddress?.trim() && formData.billingCity?.trim() && formData.billingState?.trim() && formData.billingZip?.trim() ? '✅' : '❌')}</p>
                  <p>No Errors: {Object.keys(errors).length === 0 ? '✅' : `❌ (${Object.keys(errors).length})`}</p>
                </div>
              </details>
            )}
          </div>
        )}

        {collectJSLoaded && !loading && isFormValid && (
          <p className="mt-4 text-center text-[1.6rem] text-green-600">
            ✓ Ready to place your order
          </p>
        )}
      </div>

      {/* Trust Badges - McAfee, Norton, TRUSTe */}
      <div className="flex justify-between items-center mt-11 w-full px-7.5 gap-10">
        <div className="w-1/3 flex justify-center">
          <Image
            className="h-32 object-contain"
            src="/assets/images/mcafee-seeklogo.svg"
            alt="McAfee Secure"
            width={128}
            height={128}
          />
        </div>
        <div className="w-1/3 flex justify-center">
          <Image
            className="h-30 object-contain"
            src="/assets/images/Norton.svg"
            alt="Norton Secured"
            width={120}
            height={120}
          />
        </div>
        <div className="w-1/3 flex justify-center">
          <Image
            className="h-32 object-contain"
            src="/assets/images/Truste.svg"
            alt="TRUSTe Verified"
            width={128}
            height={128}
          />
        </div>
      </div>
    </form>
  )
}
