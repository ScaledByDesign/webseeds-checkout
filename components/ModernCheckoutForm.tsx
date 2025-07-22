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
  billingAddress: string
  billingCity: string
  billingState: string
  billingZipCode: string
  billingCountry: string
}

interface FormErrors {
  [key: string]: string
}

interface FieldState {
  isValid: boolean
  isTouched: boolean
  errorMessage: string
}

interface ModernCheckoutFormProps {
  order: any
  onPaymentSuccess: (result: any) => void
  onPaymentError: (error: string) => void
  autoFillTrigger?: number
  apiEndpoint?: string
}

export function ModernCheckoutForm({ 
  order, 
  onPaymentSuccess, 
  onPaymentError, 
  autoFillTrigger = 0,
  apiEndpoint = '/api/test-checkout'
}: ModernCheckoutFormProps) {
  const [loading, setLoading] = useState(false)
  const [collectJSLoaded, setCollectJSLoaded] = useState(false)
  const [collectJSStatus, setCollectJSStatus] = useState('not-loaded')
  const [paymentToken, setPaymentToken] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [paymentFieldsReady, setPaymentFieldsReady] = useState(false)
  const [fieldStatus, setFieldStatus] = useState({
    card: 'empty',
    expiry: 'empty',
    cvv: 'empty'
  })
  const [allFieldsValid, setAllFieldsValid] = useState(false)
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [fieldStates, setFieldStates] = useState<{[key: string]: FieldState}>({})
  const formRef = useRef<HTMLFormElement>(null)
  const submissionDataRef = useRef<FormData | null>(null)

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
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingZipCode: '',
    billingCountry: 'US',
  })

  const formDataRef = useRef<FormData>(formData)

  // US States mapping for validation and formatting
  const US_STATES = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
    'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
    'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
  }

  // Countries list for dropdown
  const COUNTRIES = [
    { value: 'US', label: 'United States' },
    { value: 'CA', label: 'Canada' },
    { value: 'GB', label: 'United Kingdom' },
    { value: 'AU', label: 'Australia' },
    { value: 'DE', label: 'Germany' },
    { value: 'FR', label: 'France' },
    { value: 'IT', label: 'Italy' },
    { value: 'ES', label: 'Spain' },
    { value: 'NL', label: 'Netherlands' },
    { value: 'BE', label: 'Belgium' },
    { value: 'CH', label: 'Switzerland' },
    { value: 'AT', label: 'Austria' },
    { value: 'SE', label: 'Sweden' },
    { value: 'NO', label: 'Norway' },
    { value: 'DK', label: 'Denmark' },
    { value: 'FI', label: 'Finland' }
  ]

  // US States as dropdown options
  const STATE_OPTIONS = Object.entries(US_STATES).map(([code, name]) => ({
    value: code,
    label: `${name} (${code})`
  })).sort((a, b) => a.label.localeCompare(b.label))

  // Formatting functions
  const formatPhone = (value: string): string => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
  }

  const formatZipCode = (value: string): string => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 5) return numbers
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 9)}`
  }

  const formatName = (value: string): string => {
    return value.replace(/[^a-zA-Z\s'-]/g, '').replace(/\s+/g, ' ').trim()
  }

  const formatState = (value: string): string => {
    const upper = value.toUpperCase().replace(/[^A-Z]/g, '')
    // If it's a full state name, try to convert to abbreviation
    const stateEntry = Object.entries(US_STATES).find(([, name]) => 
      name.toLowerCase() === value.toLowerCase()
    )
    return stateEntry ? stateEntry[0] : upper.slice(0, 2)
  }

  // Validation functions
  const validateField = (name: string, value: any): FieldState => {
    let isValid = false
    let errorMessage = ''

    switch (name) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        isValid = emailRegex.test(value)
        errorMessage = isValid ? '' : 'Please enter a valid email address'
        break
      
      case 'firstName':
      case 'lastName':
        isValid = value.length >= 1 && value.length <= 50
        errorMessage = isValid ? '' : 'Name must be 1-50 characters'
        break
      
      case 'phone':
        const phoneNumbers = value.replace(/\D/g, '')
        isValid = phoneNumbers.length === 10
        errorMessage = isValid ? '' : 'Please enter a valid 10-digit phone number'
        break
      
      case 'address':
      case 'billingAddress':
        isValid = value.length >= 5 && value.length <= 100
        errorMessage = isValid ? '' : 'Address must be 5-100 characters'
        break
      
      case 'city':
      case 'billingCity':
        isValid = value.length >= 2 && value.length <= 50
        errorMessage = isValid ? '' : 'City must be 2-50 characters'
        break
      
      case 'state':
      case 'billingState':
        isValid = Object.keys(US_STATES).includes(value.toUpperCase()) && value.length > 0
        errorMessage = isValid ? '' : 'Please select a state'
        break
      
      case 'country':
      case 'billingCountry':
        isValid = COUNTRIES.some(country => country.value === value) && value.length > 0
        errorMessage = isValid ? '' : 'Please select a country'
        break
      
      case 'zipCode':
      case 'billingZipCode':
        const zipNumbers = value.replace(/\D/g, '')
        isValid = zipNumbers.length === 5 || zipNumbers.length === 9
        errorMessage = isValid ? '' : 'Please enter a valid ZIP code'
        break
      
      case 'nameOnCard':
        isValid = value.length >= 2 && value.length <= 100
        errorMessage = isValid ? '' : 'Name on card must be 2-100 characters'
        break
      
      default:
        isValid = value !== ''
        errorMessage = isValid ? '' : 'This field is required'
    }

    return { isValid, isTouched: true, errorMessage }
  }

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
        billingAddress: '456 Billing Ave',
        billingCity: 'Billing City',
        billingState: 'NY',
        billingZipCode: '67890',
        billingCountry: 'US',
      })
    }
  }, [autoFillTrigger])

  // Update formData ref whenever formData changes
  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

  // Check form validity whenever payment field status or CollectJS status changes
  useEffect(() => {
    checkAllFieldsValid()
  }, [fieldStatus, collectJSStatus])

  // Load CollectJS - TEMPORARILY DISABLED FOR DEBUGGING
  useEffect(() => {
    console.log('CollectJS loading disabled for debugging')
    return
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
          setCollectJSStatus('loaded')
          // Wait a bit for full initialization
          setTimeout(() => {
            // Configure CollectJS
            if (window.CollectJS) {
            window.CollectJS.configure({
              // Use paymentSelector for automatic form handling
              paymentSelector: '#payment-button',
              variant: 'inline',
              styleSniffer: true,
              tokenizationKey: process.env.NEXT_PUBLIC_NMI_TOKENIZATION_KEY || 'vZ668s-j859wu-6THDmy-kA46Hh',
              
              // Enhanced field styling
              invalidCss: {
                color: '#e74c3c',
                'border-color': '#e74c3c',
                'box-shadow': '0 0 6px rgba(231, 76, 60, 0.5)'
              },
              validCss: {
                color: '#27ae60',
                'border-color': '#27ae60',
                'box-shadow': '0 0 6px rgba(39, 174, 96, 0.3)'
              },
              placeholderCss: {
                color: '#95a5a6',
                'font-style': 'italic'
              },
              focusCss: {
                color: '#2c3e50',
                'border-color': '#3498db',
                'box-shadow': '0 0 6px rgba(52, 152, 219, 0.5)',
                'outline': 'none'
              },
              
              // Transaction details for better processing
              price: '319.73',
              currency: 'USD',
              country: 'US',
              
              fields: {
                ccnumber: {
                  selector: '#card-number-field',
                  title: 'Card Number',
                  placeholder: '•••• •••• •••• ••••'
                },
                ccexp: {
                  selector: '#card-expiry-field',
                  title: 'Expiration Date',
                  placeholder: 'MM / YY'
                },
                cvv: {
                  display: 'show',
                  selector: '#card-cvv-field',
                  title: 'CVV',
                  placeholder: '•••'
                }
              },
              fieldsAvailableCallback: () => {
                console.log('✅ CollectJS fields are now available and ready for input')
                setCollectJSLoaded(true)
                setCollectJSStatus('fields-available')
                
                // Additional validation to ensure fields are truly ready
                setTimeout(() => {
                  const checkFields = () => {
                    const cardField = document.querySelector('#card-number-field iframe')
                    const expiryField = document.querySelector('#card-expiry-field iframe')
                    const cvvField = document.querySelector('#card-cvv-field iframe')
                    
                    if (cardField && expiryField && cvvField) {
                      console.log('✅ All payment field iframes confirmed ready')
                      console.log('📝 You can now safely enter payment information')
                      setPaymentFieldsReady(true)
                      setCollectJSStatus('ready')
                      
                      // Check available CollectJS functions
                      if (window.CollectJS) {
                        const functions = Object.keys(window.CollectJS).filter(key => typeof window.CollectJS[key] === 'function')
                        console.log(`📌 Available CollectJS functions: ${functions.join(', ')}`)
                      }
                    }
                  }
                  checkFields()
                }, 500)
              },
              validationCallback: (field: string, status: boolean, message: string) => {
                const statusText = status ? 'valid' : 'invalid'
                const timestamp = new Date().toLocaleTimeString()
                console.log(`[${timestamp}] Field '${field}' validation: ${statusText} - ${message}`)
                
                // Map field names to our state
                const fieldMap: { [key: string]: string } = {
                  'ccnumber': 'card',
                  'ccexp': 'expiry',
                  'cvv': 'cvv'
                }
                
                const fieldKey = fieldMap[field] || field
                
                // Update field status
                setFieldStatus(prev => {
                  const newStatus = {
                    ...prev,
                    [fieldKey]: status ? 'valid' : message.toLowerCase().includes('empty') ? 'empty' : 'invalid'
                  }
                  
                  // Trigger overall validation check after state update
                  setTimeout(() => {
                    checkAllFieldsValid()
                  }, 100)
                  
                  return newStatus
                })
              },
              callback: (response: any) => {
                console.log('🔍 CollectJS callback triggered:', response)
                if (response.token) {
                  console.log('✅ Token received:', response.token)
                  setPaymentToken(response.token)
                  
                  // Get current form data at the time of tokenization
                  const currentFormData = submissionDataRef.current || formDataRef.current
                  console.log('📋 Using form data for submission:', currentFormData)
                  
                  handleFormSubmission(response.token, currentFormData)
                } else {
                  console.log('❌ Tokenization failed:', response)
                  const errorMsg = response.message || 'Payment tokenization failed. Please check your card details.'
                  onPaymentError(errorMsg)
                  setLoading(false)
                }
              },
              timeoutDuration: 15000,
              timeoutCallback: () => {
                console.log('⏰ Tokenization timeout - this may indicate:')
                console.log('  • Invalid or incomplete card information')
                console.log('  • Network connectivity issues')
                console.log('  • Browser security blocking the request')
                onPaymentError('Payment processing timed out. Please check your card details and try again.')
                setLoading(false)
              }
            })
            setCollectJSStatus('configured')
          }
          }, 1000)
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

    loadCollectJS()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    // No formatting at all - just raw values
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    
    // Single state update only
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }))
  }

  const validateFormFields = (): FormErrors => {
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

    // Billing address validation (only when not using same address)
    if (!formData.useSameAddress) {
      if (!formData.billingAddress) errors.billingAddress = 'Billing address is required'
      if (!formData.billingCity) errors.billingCity = 'Billing city is required'
      if (!formData.billingState) errors.billingState = 'Billing state is required'
      if (!formData.billingZipCode) errors.billingZipCode = 'Billing ZIP code is required'
      if (!formData.billingCountry) errors.billingCountry = 'Billing country is required'
    }

    return errors
  }

  const validateForm = (): boolean => {
    const errors = validateFormFields()
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Check if all fields (form + payment) are valid
  const checkAllFieldsValid = useCallback(() => {
    try {
      const formErrors = validateFormFields()
      const formValid = Object.keys(formErrors).length === 0
      const paymentFieldsValid = fieldStatus.card === 'valid' && fieldStatus.expiry === 'valid' && fieldStatus.cvv === 'valid'
      const collectJSReady = collectJSStatus === 'ready'
      
      const isAllValid = formValid && paymentFieldsValid && collectJSReady
      setAllFieldsValid(isAllValid)
      
      console.log('🔍 Form validation check:', {
        formValid,
        formErrors: Object.keys(formErrors).length > 0 ? formErrors : 'all valid',
        paymentFieldsValid: `card:${fieldStatus.card}, exp:${fieldStatus.expiry}, cvv:${fieldStatus.cvv}`,
        collectJSReady,
        allFieldsValid: isAllValid
      })
      
      return isAllValid
    } catch (error) {
      console.error('Error in checkAllFieldsValid:', error)
      return false
    }
  }, [fieldStatus.card, fieldStatus.expiry, fieldStatus.cvv, collectJSStatus])

  // Modern Input Component - simplified without real-time validation
  const ModernInput = ({ 
    name, 
    type = 'text', 
    placeholder, 
    required = false,
    icon,
    maxLength,
    autoComplete,
    id
  }: {
    name: string
    type?: string
    placeholder: string
    required?: boolean
    icon?: React.ReactNode
    maxLength?: number
    autoComplete?: string
    id?: string
  }) => {
    const hasError = formErrors[name]
    const value = formData[name as keyof FormData] || ''

    return (
      <div className="relative">
        <div className={`relative flex items-center transition-all duration-200 ${
          hasError 
            ? 'ring-2 ring-red-300 border-red-300' 
            : 'border-gray-cd focus-within:ring-2 focus-within:ring-blue-300 focus-within:border-blue-400'
        } border-3 rounded-xl overflow-hidden`}>
          {icon && (
            <div className="pl-4 pr-2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            type={type}
            name={name}
            id={id || name}
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder}
            required={required}
            maxLength={maxLength}
            autoComplete={autoComplete}
            className={`w-full px-9 py-8 focus:outline-0 text-1.94rem text-gray-666666 leading-none bg-transparent ${
              hasError ? 'text-red-600' : 'text-gray-666666'
            } placeholder:text-gray-400 ${icon ? 'pl-2' : ''}`}
          />
          {hasError && (
            <div className="absolute right-4 flex items-center">
              <div className="text-red-500 text-xl">✗</div>
            </div>
          )}
        </div>
        
        {/* Error Message */}
        {hasError && (
          <p className="mt-2 text-sm text-red-600">
            {hasError}
          </p>
        )}
      </div>
    )
  }

  // Modern Select Component - simplified without real-time validation
  const ModernSelect = ({ 
    name, 
    placeholder, 
    options,
    required = false,
    icon,
    autoComplete,
    id
  }: {
    name: string
    placeholder: string
    options: Array<{value: string, label: string}>
    required?: boolean
    icon?: React.ReactNode
    autoComplete?: string
    id?: string
  }) => {
    const hasError = formErrors[name]
    const value = formData[name as keyof FormData] || ''

    return (
      <div className="relative">
        <div className={`relative flex items-center transition-all duration-200 ${
          hasError 
            ? 'ring-2 ring-red-300 border-red-300' 
            : 'border-gray-cd focus-within:ring-2 focus-within:ring-blue-300 focus-within:border-blue-400'
        } border-3 rounded-xl overflow-hidden bg-white`}>
          {icon && (
            <div className="pl-4 pr-2 text-gray-400">
              {icon}
            </div>
          )}
          <select
            name={name}
            id={id || name}
            value={value}
            onChange={handleInputChange}
            required={required}
            autoComplete={autoComplete}
            className={`w-full px-9 py-8 focus:outline-0 text-1.94rem leading-none bg-transparent appearance-none cursor-pointer ${
              hasError 
                ? 'text-red-600' 
                : value 
                  ? 'text-gray-666666' 
                  : 'text-gray-400'
            } ${icon ? 'pl-2' : ''}`}
          >
            <option value="" disabled className="text-gray-400">
              {placeholder}
            </option>
            {options.map((option) => (
              <option key={option.value} value={option.value} className="text-gray-666666">
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Custom Dropdown Arrow */}
          <div className="absolute right-4 flex items-center pointer-events-none">
            {hasError ? (
              <div className="text-red-500 text-xl">✗</div>
            ) : (
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>
        
        {/* Error Message */}
        {hasError && (
          <p className="mt-2 text-sm text-red-600">
            {hasError}
          </p>
        )}
      </div>
    )
  }

  const handleFormSubmission = async (token: string, submissionData?: FormData) => {
    try {
      // Use passed data if available, otherwise fall back to current formData
      const dataToSubmit = submissionData || formData
      
      // Use direct NMI endpoint to bypass Inngest
      const endpoint = apiEndpoint === '/api/test-checkout' ? '/api/nmi-direct' : apiEndpoint
      
      // Prepare the request payload
      const requestPayload = {
        customerInfo: {
          email: dataToSubmit.email,
          firstName: dataToSubmit.firstName,
          lastName: dataToSubmit.lastName,
          phone: dataToSubmit.phone || undefined, // Ensure phone is undefined if empty
          address: dataToSubmit.address,
          city: dataToSubmit.city,
          state: dataToSubmit.state,
          zipCode: dataToSubmit.zipCode,
          country: dataToSubmit.country || 'US',
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
          country: dataToSubmit.country || 'US',
        } : undefined,
      }

      console.log('📦 Sending request to:', endpoint)
      console.log('📦 Request payload:', JSON.stringify(requestPayload, null, 2))

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      })

      const result = await response.json()
      console.log('🔍 API Response Status:', response.status, response.statusText)
      console.log('🔍 API Response:', result)

      if (result.success) {
        console.log('✅ Success! Payment processed')
        onPaymentSuccess(result)
      } else {
        console.log('❌ API returned error:', result)
        
        // Show detailed validation errors if available
        if (result.errors && Object.keys(result.errors).length > 0) {
          console.log('📋 Validation errors:', result.errors)
          const errorMessages = Object.entries(result.errors)
            .map(([field, message]) => `${field}: ${message}`)
          setValidationErrors(errorMessages)
          setShowValidationModal(true)
        } else {
          onPaymentError(result.message || result.error || 'Payment processing failed. Please try again.')
        }
      }
    } catch (error) {
      console.error('Checkout error:', error)
      onPaymentError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (loading) return

    // Double-check that all fields are valid before submission
    if (!allFieldsValid) {
      console.log('❌ Form submission blocked - not all fields are valid')
      
      // Show current validation errors
      const errors = validateFormFields()
      setFormErrors(errors)
      
      // Scroll to first error field
      const firstErrorField = Object.keys(errors)[0]
      if (firstErrorField) {
        const element = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement
        if (element) {
          element.focus()
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
      
      return
    }

    if (collectJSStatus !== 'ready') {
      onPaymentError('Payment system is still loading. Please wait a moment and try again.')
      return
    }

    setLoading(true)

    // Capture form data at submission time to prevent state issues
    submissionDataRef.current = { ...formDataRef.current }
    console.log('💾 Captured form data for submission:', submissionDataRef.current)
    console.log('✅ All validation passed - form ready for submission')

    // Since we're using paymentSelector, CollectJS will handle the submission automatically
    // The form submission will trigger the tokenization process
    console.log('🚀 Form submitted - CollectJS will handle tokenization via paymentSelector')
  }

  return (
    <form 
      ref={formRef} 
      onSubmit={handleSubmit}
      autoComplete="on"
      name="checkout-form"
      noValidate
    >
      <h3 className="mb-6 text-gray-373738 font-medium text-2.7rem">Contact</h3>
      <div>
        <ModernInput
          name="email"
          id="email"
          type="email"
          placeholder="Email Address (To receive order confirmation email)"
          required
          autoComplete="email"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
          }
        />
      </div>

      <div className="mt-10">
        <h3 className="mb-6 text-gray-373738 font-medium text-2.7rem">Customer Information</h3>
        <div className="space-y-4">
          <div className="sm:flex justify-between gap-3 sm:space-y-0 space-y-4">
            <div className="w-full">
              <ModernInput
                name="firstName"
                id="given-name"
                placeholder="First Name"
                required
                maxLength={50}
                autoComplete="given-name"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />
            </div>
            <div className="w-full">
              <ModernInput
                name="lastName"
                id="family-name"
                placeholder="Last Name"
                required
                maxLength={50}
                autoComplete="family-name"
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

      <div className="mt-10">
        <h3 className="mb-6 text-gray-373738 font-medium text-2.7rem">Shipping</h3>
        <div className="space-y-4">
          <div className="relative">
            <ModernInput
              name="address"
              placeholder="Street Address"
              required
              maxLength={100}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
          </div>
          <div className="sm:flex justify-between gap-3 sm:space-y-0 space-y-4">
            <div className="w-full">
              <ModernInput
                name="city"
                placeholder="City"
                required
                maxLength={50}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
              />
            </div>
            <div className="w-full">
              <ModernSelect
                name="state"
                placeholder="Select State"
                options={STATE_OPTIONS}
                required
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                }
              />
            </div>
            <div className="w-full">
              <ModernInput
                name="zipCode"
                placeholder="ZIP Code"
                required
                maxLength={10}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                }
              />
            </div>
          </div>
          <div>
            <ModernSelect
              name="country"
              placeholder="Select Country"
              options={COUNTRIES}
              required
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>
          <div className="relative">
            <ModernInput
              name="phone"
              type="tel"
              placeholder="Phone Number (For delivery notifications)"
              required
              maxLength={14}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              }
            />
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
            <ModernInput
              name="nameOnCard"
              placeholder="Name On Card"
              required
              maxLength={100}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              }
            />
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

      {/* Billing Address Section - Only show when useSameAddress is false */}
      {!formData.useSameAddress && (
        <div className="mt-10">
          <h3 className="mb-6 text-gray-373738 font-medium text-2.7rem">Billing Address</h3>
          <div className="space-y-4">
            <div className="relative">
              <ModernInput
                name="billingAddress"
                placeholder="Billing Street Address"
                required
                maxLength={100}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              />
            </div>
            <div className="sm:flex justify-between gap-3 sm:space-y-0 space-y-4">
              <div className="w-full">
                <ModernInput
                  name="billingCity"
                  placeholder="Billing City"
                  required
                  maxLength={50}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  }
                />
              </div>
              <div className="w-full">
                <ModernSelect
                  name="billingState"
                  placeholder="Select Billing State"
                  options={STATE_OPTIONS}
                  required
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  }
                />
              </div>
              <div className="w-full">
                <ModernInput
                  name="billingZipCode"
                  placeholder="Billing ZIP Code"
                  required
                  maxLength={10}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  }
                />
              </div>
            </div>
            <div>
              <ModernSelect
                name="billingCountry"
                placeholder="Select Billing Country"
                options={COUNTRIES}
                required
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>
          </div>
        </div>
      )}

      <div className="mt-10">
        <button
          id="payment-button"
          type="submit"
          disabled={loading || !allFieldsValid}
          className="block py-5 w-full rounded-full bg-yellow-f6c657 text-center font-bold text-3.7rem text-gray-373737 leading-none hover:bg-yellow-f4bd3f transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading 
            ? 'Processing...' 
            : collectJSStatus !== 'ready' 
              ? 'Initializing Payment...' 
              : !allFieldsValid
                ? 'Complete All Fields'
                : 'Complete Your Order'
          }
        </button>
        
        {collectJSStatus === 'not-loaded' && (
          <p className="mt-2 text-center text-sm text-gray-500">Loading secure payment system...</p>
        )}
        
        {collectJSStatus === 'loaded' && (
          <p className="mt-2 text-center text-sm text-yellow-600 animate-pulse">Configuring payment fields...</p>
        )}
        
        {collectJSStatus === 'configured' && (
          <p className="mt-2 text-center text-sm text-yellow-600 animate-pulse">Initializing payment fields...</p>
        )}
        
        {collectJSStatus === 'fields-available' && (
          <p className="mt-2 text-center text-sm text-blue-600">Almost ready...</p>
        )}
        
        {collectJSStatus === 'ready' && (
          <div className="mt-2 text-center">
            <p className={`text-sm ${allFieldsValid ? 'text-green-600' : 'text-yellow-600'}`}>
              {allFieldsValid ? '✅ All fields valid - ready to submit!' : '⚠️ Complete all required fields'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Payment: Card <span className={fieldStatus.card === 'valid' ? 'text-green-600' : 'text-gray-400'}>{fieldStatus.card}</span> | 
              Exp <span className={fieldStatus.expiry === 'valid' ? 'text-green-600' : 'text-gray-400'}>{fieldStatus.expiry}</span> | 
              CVV <span className={fieldStatus.cvv === 'valid' ? 'text-green-600' : 'text-gray-400'}>{fieldStatus.cvv}</span>
            </p>
          </div>
        )}
      </div>

      {/* Validation Error Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4 max-h-80 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-red-600">Validation Errors</h3>
              <button
                onClick={() => setShowValidationModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              {validationErrors.map((error, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span className="text-sm text-gray-700">{error}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowValidationModal(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}

// Extend Window interface for CollectJS
declare global {
  interface Window {
    CollectJS: {
      configure: (config: any) => void
      startPaymentRequest: () => void
      isValid?: (field: string) => boolean
    }
  }
}