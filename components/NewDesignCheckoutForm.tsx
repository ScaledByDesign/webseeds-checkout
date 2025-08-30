'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { FloatingLabelSelect } from './FloatingLabelInput'
import { validateCheckoutForm, type FormValidationResult } from '@/src/lib/validation/form-validation'
import { getCollectJSService } from '@/src/lib/collectjs-service'

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
  
  // Track individual field validation states
  const [fieldValidationState, setFieldValidationState] = useState({
    ccnumber: false,
    ccexp: false,
    cvv: false
  })
  

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
          onToken: (result) => {
            console.log('🎯 Token generated:', result)
            if (result.success && result.token) {
              // Process payment with the token
              const paymentData = {
                ...formData,
                paymentToken: result.token
              }
              console.log('💳 Processing payment with token...')
              onPaymentSuccessRef.current(paymentData)
            } else {
              console.error('❌ Token generation failed:', result.error)
              onPaymentErrorRef.current(result.error || 'Payment token generation failed')
            }
            setLoading(false)
          },
          onValidation: (field, status, message) => {
            console.log(`📝 Form received validation: ${field} - ${status} - "${message}"`)

            // Special debugging for card number with test card
            if (field === 'cardNumber' && message) {
              console.log(`💳 Card number validation details:`, {
                field,
                status,
                message,
                isTestCard: message.includes('4111') || status === 'valid'
              })
            }

            // Track that user has interacted with card fields
            if (!cardFieldsTouched) {
              setCardFieldsTouched(true)
              console.log('🎯 Card fields touched for first time')
            }

            // Update field validation states
            console.log(`🔄 Updating field errors: ${field} -> status: ${status}, shouldShowError: ${status === 'invalid' || status === 'blank'}`)

            if (field === 'cardNumber') {
              const shouldShowError = (status === 'invalid' || status === 'blank')
              const errorMessage = shouldShowError ? (message || 'Invalid card number') : ''
              console.log(`💳 Card number error update: "${errorMessage}"`)
              setErrors(prev => ({
                ...prev,
                cardNumber: errorMessage
              }))
            } else if (field === 'expiry') {
              setErrors(prev => ({
                ...prev,
                expiry: (status === 'invalid' || status === 'blank') ? message || 'Invalid expiry date' : ''
              }))
            } else if (field === 'cvv') {
              setErrors(prev => ({
                ...prev,
                cvv: (status === 'invalid' || status === 'blank') ? message || 'Invalid CVV' : ''
              }))
            }

            // Update individual field validation states
            setFieldValidationState(prev => {
              // The service already maps ccnumber->cardNumber, ccexp->expiry, cvv->cvv
              // So we need to map back to the legacy field names for the state
              const fieldMap: Record<string, string> = {
                'cardNumber': 'ccnumber',
                'expiry': 'ccexp',
                'cvv': 'cvv'
              }

              const legacyFieldName = fieldMap[field] || field
              const newState = {
                ...prev,
                [legacyFieldName]: status === 'valid'
              }

              // Check if ALL fields are valid
              const allFieldsValid = newState.ccnumber && newState.ccexp && newState.cvv
              setFieldsValid(allFieldsValid)

              console.log(`📊 Field validation update - ${field}: ${status}, All fields valid: ${allFieldsValid}`)

              return newState
            })
          },
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
            console.log('  Fields touched:', collectJSService.areFieldsTouched());
            console.log('  Fields valid:', collectJSService.areFieldsValid());
            console.log('  Field errors:', collectJSService.getFieldErrors());
            console.log('  Validation state:', collectJSService.getValidationState());
            console.log('  Local state - cardFieldsTouched:', cardFieldsTouched);
            console.log('  Local state - fieldsValid:', fieldsValid);
            console.log('  Local state - errors:', errors);
            console.log('  window.CollectJS:', !!window.CollectJS);
            console.log('  CollectJS iframes:', {
              cardNumber: !!document.querySelector('#card-number-field iframe'),
              expiry: !!document.querySelector('#card-expiry-field iframe'),
              cvv: !!document.querySelector('#card-cvv-field iframe')
            });
          };

          // Add manual test function
          (window as any).testCollectJS = () => {
            console.log('🧪 Testing CollectJS manually...');
            if (window.CollectJS) {
              try {
                console.log('  Attempting to start payment request...');
                window.CollectJS.startPaymentRequest();
              } catch (error) {
                console.error('  Error starting payment request:', error);
              }
            } else {
              console.error('  CollectJS not available');
            }
          };

          console.log('🛠️ Debug functions available:');
          console.log('  - window.debugCollectJS() - Show current state');
          console.log('  - window.testCollectJS() - Test manual tokenization');
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

    // Validate using DOM values as fallback - ORDER: Top to Bottom as displayed
    const newErrors: FormErrors = {}
    
    // 1. Contact section
    if (!currentValues.email.trim()) {
      newErrors.email = 'Email is required'
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
    if (!currentValues.zip.trim()) {
      newErrors.zip = 'ZIP code is required'
    }
    // Country is handled separately (it's a select with default value)
    if (!currentValues.phone.trim()) {
      newErrors.phone = 'Phone is required'
    }
    
    // 3. Payment section (last)
    if (!currentValues.nameOnCard.trim()) {
      newErrors.nameOnCard = 'Name on card is required'
    }
    
    // 4. CollectJS Card Validation - CRITICAL for payment processing
    if (collectJSLoaded && collectJSService.isReady()) {
      // Get individual field validation states
      const validationState = collectJSService.getValidationState()
      const serviceFieldErrors = collectJSService.getFieldErrors()

      console.log('🔍 Service validation state:', {
        validationState,
        errors: serviceFieldErrors
      })

      // Debug: Check if CollectJS is actually working
      console.log('🔧 CollectJS Debug Info:')
      console.log('  - window.CollectJS exists:', !!window.CollectJS)
      console.log('  - Service isReady:', collectJSService.isReady())
      console.log('  - collectJSLoaded:', collectJSLoaded)
      console.log('  - Card iframes present:', {
        cardNumber: !!document.querySelector('#card-number-field iframe'),
        expiry: !!document.querySelector('#card-expiry-field iframe'),
        cvv: !!document.querySelector('#card-cvv-field iframe')
      })

      // Check each field individually - required for form submission
      const cardNumberField = validationState.cardNumber
      const expiryField = validationState.expiry
      const cvvField = validationState.cvv

      // Card Number validation
      if (!cardNumberField || !cardNumberField.isTouched) {
        newErrors.cardNumber = 'Please enter your card number'
      } else if (!cardNumberField.isValid) {
        newErrors.cardNumber = serviceFieldErrors.cardNumber || 'Please enter a valid card number'
      }

      // Expiry validation
      if (!expiryField || !expiryField.isTouched) {
        newErrors.expiry = 'Please enter the expiration date (MM/YY)'
      } else if (!expiryField.isValid) {
        newErrors.expiry = serviceFieldErrors.expiry || 'Please enter a valid expiration date'
      }

      // CVV validation
      if (!cvvField || !cvvField.isTouched) {
        newErrors.cvv = 'Please enter the 3 or 4 digit security code'
      } else if (!cvvField.isValid) {
        newErrors.cvv = serviceFieldErrors.cvv || 'Please enter a valid security code'
      }

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
        console.log(`  📝 Card fields touched (local): ${cardFieldsTouched ? '✅' : '❌'}`)
        console.log(`  📝 Card fields touched (service): ${collectJSService.areFieldsTouched() ? '✅' : '❌'}`)
        console.log(`  ✔️ Fields valid (local): ${fieldsValid ? '✅' : '❌'}`)
        console.log(`  ✔️ Fields valid (service): ${collectJSService.areFieldsValid() ? '✅' : '❌'}`)

        // Use service validation state as primary source of truth
        const serviceFieldsTouched = collectJSService.areFieldsTouched()
        const serviceFieldsValid = collectJSService.areFieldsValid()

        // Check if user has entered card information
        if (!serviceFieldsTouched) {
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
        if (!serviceFieldsValid) {
          console.warn('⚠️ Card information is invalid')

          // Get specific field errors from the service
          const fieldErrors = collectJSService.getFieldErrors()
          console.log('🔍 Service field errors:', fieldErrors)

          // Set inline errors for invalid fields
          setErrors(prev => ({
            ...prev,
            cardNumber: fieldErrors.cardNumber || prev.cardNumber || 'Please check your card number',
            expiry: fieldErrors.expiry || prev.expiry || 'Please check the expiration date',
            cvv: fieldErrors.cvv || prev.cvv || 'Please check the security code'
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

        // Use CollectJS service to start payment request
        await collectJSService.startPaymentRequest()
        console.log('✅ CollectJS service payment request initiated')

      } else {
        throw new Error('CollectJS service not ready')
      }
    } catch (error) {
      console.error('❌ Payment submission error:', error)
      onPaymentErrorRef.current('Payment processing failed. Please try again.')
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
                  onChange={handleInputChange}
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
            <div className="floating-label-group w-full lg:mb-0">
              {/* CollectJS mount point for expiry */}
              <div 
                id="card-expiry-field" 
                data-autocomplete="cc-exp"
                role="textbox"
                aria-label="Expiration Date MM/YYYY"
                aria-required="true"
                aria-invalid={!!errors.expiry}
                aria-describedby={errors.expiry ? "expiry-error" : undefined}
                className={`collectjs-field w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.expiry ? 'input-error' : ''} ${!errors.expiry && fieldValidationState.ccexp ? 'border-green-500' : ''}`}
              >
                {collectJSInitializing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 z-10 rounded-xl">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                  </div>
                )}
              </div>
              <label htmlFor="card-expiry-field" className="floating-label bg-transparent">
                Expiration Date{' '}(MM/YYYY)
              </label>{errors.expiry && (
                <div id="expiry-error" className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }} role="alert">
                  {errors.expiry}
                </div>
              )}
              
            </div>
            <div className="floating-label-group relative w-full lg:mb-0">
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
              </span>{errors.cvv && (
                <div id="cvv-error" className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }} role="alert">
                  {errors.cvv}
                </div>
              )}
            </div> 
          </div>
          <div className="floating-label-group"style={{paddingTop:'1rem'}}>
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
                className="w-9 h-9 accent-[#666666] cursor-pointer"
                style={{ transform: 'scale(1.5)' }}
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
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
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
                  className="w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] appearance-none bg-no-repeat form-select"
                  required
                  autoComplete="country"
                  aria-required="true"
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
