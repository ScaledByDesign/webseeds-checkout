'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { FloatingLabelSelect } from './FloatingLabelInput'
import { CollectJSService, type TokenResult } from '@/src/lib/collectjs-service'

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
  
  // CollectJS doesn't support real-time card type detection
  // Card type is only available after tokenization via response.card.type
  const [isValidating, setIsValidating] = useState(false)
  const [fieldFocus, setFieldFocus] = useState<string>('')
  const [fieldInteractions, setFieldInteractions] = useState({
    ccnumber: { focused: 0, blurred: 0, changed: 0 },
    ccexp: { focused: 0, blurred: 0, changed: 0 },
    cvv: { focused: 0, blurred: 0, changed: 0 }
  })
  // Card icons are always visible since we can't detect card type in real-time

  // Removed floating states - using pure CSS approach like the design
  const addressInputRef = useRef<HTMLInputElement>(null)
  const collectJSService = CollectJSService.getInstance()
  
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
          // Removed auto zip population as it's often incorrect
          // zip: prev.zip || data.postal || '',
          // Also fill billing address fields if they're empty
          billingCity: prev.billingCity || data.city || '',
          billingState: prev.billingState || data.region_code || '',
          // Removed auto billing zip population as well
          // billingZip: prev.billingZip || data.postal || ''
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

  // Get card type icon
  const getCardIcon = (type: string) => {
    const icons: Record<string, string> = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳',
      jcb: '💳',
      diners: '💳',
      unionpay: '💳'
    }
    return icons[type] || '💳'
  }

  // Get card type display name
  const getCardDisplayName = (type: string) => {
    const names: Record<string, string> = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'American Express',
      discover: 'Discover',
      jcb: 'JCB',
      diners: 'Diners Club',
      unionpay: 'UnionPay'
    }
    return names[type] || ''
  }

  // Card type detection based on BIN (Bank Identification Number)
  const detectCardType = (cardNumber: string) => {
    const cleaned = cardNumber.replace(/\D/g, '')
    
    // Card type patterns with length requirements
    const patterns = {
      visa: /^4/,
      mastercard: /^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/,
      amex: /^3[47]/,
      discover: /^(6011|622|64[4-9]|65)/,
      diners: /^(300|301|302|303|304|305|36|38)/,
      jcb: /^35/,
      unionpay: /^62/
    }
    
    let detectedType = ''
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(cleaned)) {
        detectedType = type
        break
      }
    }
    
    // Note: Card type detection doesn't work with CollectJS iframes
    // This function is kept for reference but isn't used
    
    return detectedType
  }
  
  // Luhn algorithm for card validation
  const luhnCheck = (cardNumber: string) => {
    const cleaned = cardNumber.replace(/\D/g, '')
    if (cleaned.length < 13) return false
    
    let sum = 0
    let isEven = false
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10)
      
      if (isEven) {
        digit *= 2
        if (digit > 9) {
          digit -= 9
        }
      }
      
      sum += digit
      isEven = !isEven
    }
    
    return sum % 10 === 0
  }
  
  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    const type = detectCardType(cleaned)
    
    // Format based on card type
    if (type === 'amex') {
      // Amex: 4-6-5
      return cleaned.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3').trim()
    } else if (type === 'diners') {
      // Diners: 4-6-4
      return cleaned.replace(/(\d{4})(\d{6})(\d{4})/, '$1 $2 $3').trim()
    } else {
      // Default: 4-4-4-4
      return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
    }
  }
  
  // Test card numbers for development (DO NOT use in production)
  const TEST_CARDS = {
    visa: '4111111111111111',           // Visa test card
    mastercard: '5555555555554444',     // Mastercard test card  
    amex: '378282246310005',            // American Express test card
    discover: '6011111111111117',       // Discover test card
    jcb: '3530111333300000',            // JCB test card
    diners: '30569309025904',            // Diners Club test card
    // Additional test cards for specific scenarios
    visa_debit: '4000056655665556',     // Visa debit test
    mastercard_2series: '2223003122003222', // Mastercard 2-series
    insufficient_funds: '4000000000000002', // Will decline - insufficient funds
    expired_card: '4000000000000069',    // Will decline - expired card
    cvc_fail: '4000000000000127',        // Will decline - incorrect CVC
  }

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
      useSameAddress: Math.random() > 0.3 // 70% chance of using same address
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

  // Helper function to handle form submission after token is received
  const handleFormSubmission = async (token: string) => {
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

        // Collect billing address fields when not using same address
        const billingAddress = (document.querySelector('input[name="billingAddress"]') as HTMLInputElement)?.value || ''
        const billingCity = (document.querySelector('input[name="billingCity"]') as HTMLInputElement)?.value || ''
        const billingState = (document.querySelector('input[name="billingState"]') as HTMLInputElement)?.value || ''
        const billingZip = (document.querySelector('input[name="billingZip"]') as HTMLInputElement)?.value || ''

        return {
          email, nameOnCard, phone, address, city, state, zip, country, useSameAddress,
          billingAddress, billingCity, billingState, billingZip
        }
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
        paymentToken: token,
        products: (order?.items || []).map((it: any) => ({
          id: it.id,
          name: it.name,
          price: it.price,
          quantity: it.quantity ?? 1,
        })),
        billingInfo: currentFormData.useSameAddress ? undefined : {
          address: currentFormData.billingAddress.trim() || currentFormData.address.trim(),
          city: currentFormData.billingCity.trim() || currentFormData.city.trim(),
          state: (currentFormData.billingState.trim() || currentFormData.state.trim()).toUpperCase(),
          zipCode: currentFormData.billingZip.replace(/\D/g, '') || normalizedZip,
          country: currentFormData.country.trim().toUpperCase(),
        },
      }

      // Enhanced debug logging
      console.log('📤 FINAL API PAYLOAD:')
      console.log('  📧 Email:', body.customerInfo.email)
      console.log('  👤 Name:', body.customerInfo.firstName, body.customerInfo.lastName)
      console.log('  📞 Phone:', body.customerInfo.phone)
      console.log('  🏠 Address:', body.customerInfo.address)
      console.log('  🏙️ City:', body.customerInfo.city)
      console.log('  🗺️ State:', body.customerInfo.state)
      console.log('  📮 ZIP:', body.customerInfo.zipCode)
      console.log('  🌍 Country:', body.customerInfo.country)
      console.log('  🎫 Token:', body.paymentToken.substring(0, 20) + '...')
      console.log('🏦 Use Same Address:', currentFormData.useSameAddress)
      if (body.billingInfo) {
        console.log('💳 BILLING Address:', body.billingInfo.address)
        console.log('💳 BILLING City:', body.billingInfo.city)
        console.log('💳 BILLING State:', body.billingInfo.state)
        console.log('💳 BILLING ZIP:', body.billingInfo.zipCode)
        console.log('💳 BILLING Country:', body.billingInfo.country)
      } else {
        console.log('💳 BILLING: Using shipping address')
      }
      console.log('📋 Current form data from DOM:', currentFormData)
      console.log('🛒 Order items:', orderRef.current?.items)

      const result = await fetch(apiEndpointRef.current, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      })

      const data = await result.json()

      if (data.success) {
        onPaymentSuccessRef.current(data)
      } else {
        // Pass sessionId to error handler for duplicate transaction handling
        console.log('📋 API error response:', data)
        onPaymentErrorRef.current(data.message || 'Payment processing failed.', data.errors, data.sessionId)
      }
    } catch (error) {
      console.error('Order submission error:', error)
      onPaymentErrorRef.current('Failed to process your order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Initialize CollectJS Service
  useEffect(() => {
    const initializeCollectJS = async () => {
      try {
        await collectJSService.initialize({
          fieldSelectors: {
            cardNumber: '#card-number-field',
            expiry: '#card-expiry-field',
            cvv: '#card-cvv-field'
          },
          customStyles: {
            base: {
              'font-family': 'inherit',
              'line-height': 'inherit',
              'letter-spacing': 'inherit'
            }
          },
          onToken: (result: TokenResult) => {
            if (result.success && result.token) {
              console.log('✅ Payment token received from service:', result.token.substring(0, 20) + '...')
              handleFormSubmission(result.token)
            } else {
              console.error('❌ Tokenization failed:', result.error)
              onPaymentErrorRef.current(result.error || 'Payment tokenization failed. Please check your card details.')
              setLoading(false)
            }
          },
          onValidation: (field: string, status: string, message: string) => {
            // Track that user has interacted with card fields
            if (!cardFieldsTouched) {
              setCardFieldsTouched(true)
            }
            
            // Map CollectJS field names to our error keys
            const fieldMap: Record<string, string> = {
              'ccnumber': 'cardNumber',
              'ccexp': 'expiry',
              'cvv': 'cvv',
              'cardNumber': 'cardNumber',
              'expiry': 'expiry'
            }
            
            const errorField = fieldMap[field] || field
            const isValid = status === 'valid'
            
            // Update inline errors based on validation status with enhanced messages
            if (!isValid && status !== 'blank') {
              setIsValidating(true)
              
              // Provide more user-friendly error messages
              let enhancedMessage = message
              if (field === 'ccnumber' || field === 'cardNumber') {
                if (message.includes('invalid')) {
                  enhancedMessage = 'Card number is invalid. Please check and try again'
                }
              } else if (field === 'ccexp' || field === 'expiry') {
                if (message.includes('past') || message.includes('expired')) {
                  enhancedMessage = 'Card has expired. Please use a different card'
                } else if (message.includes('invalid')) {
                  enhancedMessage = 'Please enter a valid expiration date (MM/YY)'
                }
              } else if (field === 'cvv') {
                if (message.includes('invalid')) {
                  enhancedMessage = 'Please enter the 3 or 4-digit security code from your card'
                }
              }
              
              setErrors(prev => ({
                ...prev,
                [errorField]: enhancedMessage
              }))
            } else {
              // Clear error when field becomes valid or is empty
              setIsValidating(false)
              setErrors(prev => ({
                ...prev,
                [errorField]: ''
              }))
            }

            // Track individual field validation status
            setFieldValidationState(prev => {
              const mappedField = field === 'cardNumber' ? 'ccnumber' : field === 'expiry' ? 'ccexp' : field
              const newState = {
                ...prev,
                [mappedField]: isValid && status !== 'blank'
              }
              
              // Check if ALL fields are valid (not empty and valid format)
              const allFieldsValid = newState.ccnumber && newState.ccexp && newState.cvv
              
              // Update the overall fieldsValid state
              setFieldsValid(allFieldsValid)
              
              console.log(`📊 Field validation update - ${mappedField}: ${isValid}, All fields valid: ${allFieldsValid}`)
              
              return newState
            })
          },
          onReady: () => {
            console.log('✅ CollectJS service is ready')
            setCollectJSLoaded(true)
            setCollectJSInitializing(false)
          },
          onError: (error: string) => {
            console.error('❌ CollectJS service error:', error)
            onPaymentErrorRef.current(error)
            setLoading(false)
          }
        })
      } catch (error) {
        console.error('❌ Failed to initialize CollectJS service:', error)
        onPaymentErrorRef.current('Failed to initialize payment system. Please refresh the page.')
      }
    }

    initializeCollectJS()
    
    // Cleanup on unmount
    return () => {
      collectJSService.reset()
    }
  }, []) // Only initialize once

  // Initialize Google Places Autocomplete
  useEffect(() => {
    const initializeGooglePlaces = () => {
      if (window.google && window.google.maps && window.google.maps.places && addressInputRef.current) {
        const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
          types: ['address'],
          componentRestrictions: { country: ['us', 'ca', 'gb', 'au'] },
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

  // Pure CSS floating labels - no JavaScript state management needed
  // The CSS :focus and :not(:placeholder-shown) pseudo-selectors handle everything

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

  // onBlur validation handlers - standard behavior
  const handleEmailValidation = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setErrors(prev => ({ ...prev, email: 'Email is required' }))
    } else if (!validateEmail(value)) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email' }))
    } else {
      setErrors(prev => ({ ...prev, email: '' }))
    }
  }

  const handleAddressValidation = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setErrors(prev => ({ ...prev, address: 'Address is required' }))
    } else {
      setErrors(prev => ({ ...prev, address: '' }))
    }
  }

  const handleCityValidation = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setErrors(prev => ({ ...prev, city: 'City is required' }))
    } else {
      setErrors(prev => ({ ...prev, city: '' }))
    }
  }

  const handleStateValidation = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setErrors(prev => ({ ...prev, state: 'State is required' }))
    } else {
      setErrors(prev => ({ ...prev, state: '' }))
    }
  }

  const handleZipValidation = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setErrors(prev => ({ ...prev, zip: 'Postal code is required' }))
    } else if (!validateZip(value)) {
      setErrors(prev => ({ ...prev, zip: 'Please enter a valid postal code' }))
    } else {
      setErrors(prev => ({ ...prev, zip: '' }))
    }
  }

  const handlePhoneValidation = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setErrors(prev => ({ ...prev, phone: 'Phone is required' }))
    } else if (!validatePhone(value)) {
      setErrors(prev => ({ ...prev, phone: 'Please enter a valid phone number' }))
    } else {
      setErrors(prev => ({ ...prev, phone: '' }))
    }
  }

  // Billing address onBlur handlers - only validate if not using same address
  const handleBillingAddressValidation = (e: React.FocusEvent<HTMLInputElement>) => {
    // Only validate if not using same address
    if (!formData.useSameAddress) {
      const value = e.target.value.trim()
      if (!value) {
        setErrors(prev => ({ ...prev, billingAddress: 'Billing address is required' }))
      } else {
        setErrors(prev => ({ ...prev, billingAddress: '' }))
      }
    }
  }

  const handleBillingCityValidation = (e: React.FocusEvent<HTMLInputElement>) => {
    // Only validate if not using same address
    if (!formData.useSameAddress) {
      const value = e.target.value.trim()
      if (!value) {
        setErrors(prev => ({ ...prev, billingCity: 'Billing city is required' }))
      } else {
        setErrors(prev => ({ ...prev, billingCity: '' }))
      }
    }
  }

  const handleBillingStateValidation = (e: React.FocusEvent<HTMLInputElement>) => {
    // Only validate if not using same address
    if (!formData.useSameAddress) {
      const value = e.target.value.trim()
      if (!value) {
        setErrors(prev => ({ ...prev, billingState: 'Billing state is required' }))
      } else {
        setErrors(prev => ({ ...prev, billingState: '' }))
      }
    }
  }

  const handleBillingZipValidation = (e: React.FocusEvent<HTMLInputElement>) => {
    // Only validate if not using same address
    if (!formData.useSameAddress) {
      const value = e.target.value.trim()
      if (!value) {
        setErrors(prev => ({ ...prev, billingZip: 'Billing postal code is required' }))
      } else if (!validateZip(value)) {
        setErrors(prev => ({ ...prev, billingZip: 'Please enter a valid billing postal code' }))
      } else {
        setErrors(prev => ({ ...prev, billingZip: '' }))
      }
    }
  }

  // Standard validation functions - less strict
  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const validatePhone = (phone: string): boolean => {
    const trimmed = phone.trim()
    if (!trimmed) return false
    const cleaned = phone.replace(/\D/g, '')
    const internationalPhoneRegex = /^[\+]?[\d\s\-\(\)]{7,20}$/
    const hasValidDigitCount = cleaned.length >= 7 && cleaned.length <= 15
    return internationalPhoneRegex.test(trimmed) && hasValidDigitCount
  }

  const validateZip = (zip: string): boolean => {
    const trimmed = zip.trim()
    if (!trimmed) return false
    const internationalPostalRegex = /^[A-Za-z0-9\s\-]{3,10}$/
    return internationalPostalRegex.test(trimmed)
  }

  const validateCVV = (cvv: string): boolean => {
    const cleaned = cvv.replace(/\D/g, '')
    return cleaned.length === 3 || cleaned.length === 4
  }

  const validateExpiryDate = (expiry: string): boolean => {
    const regex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/
    if (!regex.test(expiry)) return false

    const [monthStr, yearStr] = expiry.split('/')
    const month = parseInt(monthStr, 10)
    const year = parseInt(yearStr, 10)

    if (month < 1 || month > 12) return false

    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentFullYear = currentDate.getFullYear()
    const inputFullYear = year + (year < 50 ? 2000 : 1900)

    if (inputFullYear > currentFullYear + 15) return false
    if (inputFullYear === currentFullYear && month < currentMonth) return false

    return true
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    // Address validation
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required'
    }
    
    // City validation
    if (!formData.city.trim()) {
      newErrors.city = 'City is required'
    }

    // State validation
    if (!formData.state.trim()) {
      newErrors.state = 'State is required'
    }

    // Postal code validation
    if (!formData.zip.trim()) {
      newErrors.zip = 'Postal code is required'
    } else if (!validateZip(formData.zip)) {
      newErrors.zip = 'Please enter a valid postal code'
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required'
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    // Billing address validation only if not using same address
    if (!formData.useSameAddress) {
      if (!formData.billingAddress?.trim()) {
        newErrors.billingAddress = 'Billing address is required'
      }
      if (!formData.billingCity?.trim()) {
        newErrors.billingCity = 'Billing city is required'
      }
      if (!formData.billingState?.trim()) {
        newErrors.billingState = 'Billing state is required'
      }
      if (!formData.billingZip?.trim()) {
        newErrors.billingZip = 'Billing postal code is required'
      } else if (!validateZip(formData.billingZip)) {
        newErrors.billingZip = 'Please enter a valid billing postal code'
      }
    }

    // Card validation is handled by CollectJS
    if (!fieldsValid) {
      if (!cardFieldsTouched) {
        newErrors.cardNumber = 'Please enter your card information'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0 && fieldsValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      const firstErrorField = document.querySelector('.error')
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    setLoading(true)
    
    try {
      await handleFormSubmission(formData, order)
    } catch (error) {
      console.error('Payment submission error:', error)
      onPaymentErrorRef.current('Payment processing failed. Please try again.')
    } finally {
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
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
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
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
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
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
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
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
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
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
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
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
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
              role="textbox"
              aria-label="Card Number"
              aria-required="true"
              aria-invalid={!!errors.cardNumber}
              aria-describedby={errors.cardNumber ? "card-number-error" : undefined}
              className={`collectjs-field collectjs-card-number ${errors.cardNumber ? 'input-error' : ''} ${!errors.cardNumber && fieldValidationState.ccnumber ? 'border-green-500' : ''}`}
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
            {errors.cardNumber && (
              <div id="card-number-error" className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }} role="alert">
                {errors.cardNumber}
              </div>
            )}
            <div className="absolute top-1/2 right-4 -translate-y-1/2 flex gap-2 z-10 pointer-events-none">
              <img
                className="h-14 opacity-90"
                src="/assets/images/visa.svg"
                alt="Visa"
                width="52"
                height="52"
                loading="lazy"
              />
              <img
                className="h-14 opacity-90"
                src="/assets/images/mastercard.svg"
                alt="Mastercard"
                width="52"
                height="52"
                loading="lazy"
              />
              <img
                className="h-14 opacity-90"
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
                role="textbox"
                aria-label="Expiration Date MM/YYYY"
                aria-required="true"
                aria-invalid={!!errors.expiry}
                aria-describedby={errors.expiry ? "expiry-error" : undefined}
                className={`relative w-full border-2 border-[#CDCDCD] px-9 py-7 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.expiry ? 'input-error' : ''} ${!errors.expiry && fieldValidationState.ccexp ? 'border-green-500' : ''}`}
              >
                {collectJSInitializing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 z-10 rounded-xl">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                  </div>
                )}
              </div>
              <label htmlFor="card-expiry-field" className="floating-label bg-transparent">
                Expiration Date{' '}(MM/YYYY)
              </label>
              {errors.expiry && (
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
                className={`relative w-full border-2 border-[#CDCDCD] pl-9 pr-17 py-7 rounded-xl sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9] ${errors.cvv ? 'input-error' : ''} ${!errors.cvv && fieldValidationState.cvv ? 'border-green-500' : ''}`}
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
              {errors.cvv && (
                <div id="cvv-error" className="text-2xl mt-2 error-message" style={{ color: '#dc2626' }} role="alert">
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
