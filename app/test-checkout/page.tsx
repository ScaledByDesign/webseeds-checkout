'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export default function TestCheckoutPage() {
  const [loading, setLoading] = useState(false)
  const [collectJSStatus, setCollectJSStatus] = useState('not-loaded')
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [fieldStatus, setFieldStatus] = useState({
    card: 'empty',
    expiry: 'empty',
    cvv: 'empty'
  })
  
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    console.log(`[${timestamp}] ${message}`)
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }, [])

  // Complete form data with all fields
  const [formData, setFormData] = useState({
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
    useSameAddress: true
  })

  const loadCollectJS = useCallback(async () => {
    try {
      addLog('📦 Checking for existing CollectJS script...')
      
      // Check if already loaded
      if (window.CollectJS) {
        addLog('✅ CollectJS already available in window')
        setCollectJSStatus('loaded')
        initializeCollectJS()
        return
      }

      // Load script
      addLog('📥 Loading CollectJS script from NMI...')
      const script = document.createElement('script')
      script.src = 'https://secure.nmi.com/token/Collect.js'
      script.async = true
      script.setAttribute('data-tokenization-key', process.env.NEXT_PUBLIC_NMI_TOKENIZATION_KEY || 'vZ668s-j859wu-6THDmy-kA46Hh')
      
      script.onload = () => {
        addLog('✅ CollectJS script loaded successfully')
        setCollectJSStatus('loaded')
        
        // Wait a bit for full initialization
        setTimeout(() => {
          initializeCollectJS()
        }, 1000)
      }

      script.onerror = (error) => {
        addLog('❌ Failed to load CollectJS script')
        setCollectJSStatus('error')
      }

      document.body.appendChild(script)
      
    } catch (error) {
      addLog(`❌ Error in loadCollectJS: ${error}`)
      setCollectJSStatus('error')
    }
  }, [addLog, initializeCollectJS])

  const initializeCollectJS = useCallback(() => {
    addLog('🔧 Starting CollectJS configuration...')
    
    if (!window.CollectJS) {
      addLog('❌ CollectJS not found in window after load')
      return
    }

    try {
      // Enhanced configuration based on EasyPay Direct best practices
      window.CollectJS.configure({
        // Required fields
        paymentSelector: '#payment-button',
        variant: 'inline',
        
        // Authentication - use environment variable with fallback
        tokenizationKey: process.env.NEXT_PUBLIC_NMI_TOKENIZATION_KEY || 'vZ668s-j859wu-6THDmy-kA46Hh',
        
        // Field styling for better UX
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
        
        // Field definitions with enhanced options
        fields: {
          ccnumber: {
            selector: '#card-number',
            title: 'Card Number',
            placeholder: '0000 0000 0000 0000'
          },
          ccexp: {
            selector: '#card-expiry',
            title: 'Card Expiration',
            placeholder: 'MM / YY'
          },
          cvv: {
            display: 'show',
            selector: '#card-cvv',
            title: 'CVV',
            placeholder: '123'
          }
        },
        
        // Transaction details for better processing
        price: '319.73', // Include tax in the price
        currency: 'USD',
        country: 'US',
        
        // Enhanced validation callback
        validationCallback: function(field, status, message) {
          const statusText = status ? 'valid' : 'invalid'
          const timestamp = new Date().toLocaleTimeString()
          
          // Log validation events
          addLog(`[${timestamp}] Field '${field}' validation: ${statusText} - ${message}`)
          
          // Map field names to our state
          const fieldMap = {
            'ccnumber': 'card',
            'ccexp': 'expiry',
            'cvv': 'cvv'
          }
          
          const fieldKey = fieldMap[field] || field
          
          // Update field status
          setFieldStatus(prev => ({
            ...prev,
            [fieldKey]: status ? 'valid' : message.toLowerCase().includes('empty') ? 'empty' : 'invalid'
          }))
          
          // Check if all fields are valid
          if (field === 'cvv' && status) {
            // Last field validated, check overall form validity
            setTimeout(() => {
              const cardStatus = document.querySelector('#card-number iframe') ? true : false
              const expStatus = document.querySelector('#card-expiry iframe') ? true : false
              const cvvStatus = document.querySelector('#card-cvv iframe') ? true : false
              
              if (cardStatus && expStatus && cvvStatus) {
                addLog('✅ All payment fields validated and ready')
              }
            }, 100)
          }
        },
        
        // Timeout configuration
        timeoutDuration: 15000, // 15 seconds
        timeoutCallback: function() {
          addLog('⏰ Tokenization timeout - this may indicate:')
          addLog('  • Invalid or incomplete card information')
          addLog('  • Network connectivity issues')
          addLog('  • Browser security blocking the request')
          setLoading(false)
        },
        
        // Fields ready callback
        fieldsAvailableCallback: function() {
          addLog('✅ CollectJS fields initialized successfully')
          setCollectJSStatus('fields-available')
          
          // Verify iframes after a short delay to ensure full initialization
          setTimeout(() => {
            checkIframes()
            
            // Additional check for field readiness
            const frames = document.querySelectorAll('#card-number iframe, #card-expiry iframe, #card-cvv iframe')
            if (frames.length === 3) {
              addLog(`📊 Confirmed: All ${frames.length} payment field iframes are loaded`)
            }
          }, 500)
        },
        
        // Token callback - the main success handler
        callback: function(response) {
          const timestamp = new Date().toLocaleTimeString()
          addLog(`[${timestamp}] 🎉 TOKEN CALLBACK TRIGGERED!`)
          
          // Log full response for debugging
          console.log('CollectJS Full Response:', response)
          
          if (response.token) {
            addLog(`✅ Tokenization successful!`)
            addLog(`   Token: ${response.token}`)
            addLog(`   Token Type: ${response.tokenType || 'inline'}`)
            
            // Log card details if available
            if (response.card) {
              addLog(`   Card: ${response.card.number || '****'} (${response.card.type || 'Unknown'})`)
              addLog(`   Expiry: ${response.card.exp || '****'}`)
            }
            
            // Process the payment with the token
            processPayment(response.token)
          } else {
            // Token generation failed
            const errorMsg = response.message || response.error || 'Unknown tokenization error'
            addLog(`❌ Tokenization failed: ${errorMsg}`)
            
            // Check for specific error types
            if (errorMsg.toLowerCase().includes('invalid')) {
              addLog('💡 Tip: Check that all card fields contain valid data')
            } else if (errorMsg.toLowerCase().includes('timeout')) {
              addLog('💡 Tip: The request timed out - please try again')
            }
            
            setLoading(false)
          }
        }
      })
      
      addLog('✅ CollectJS.configure() completed')
      setCollectJSStatus('configured')
      
    } catch (error) {
      addLog(`❌ Error configuring CollectJS: ${error}`)
      setCollectJSStatus('error')
    }
  }, [addLog])

  const checkIframes = () => {
    addLog('🔍 Checking for iframes...')
    
    const cardIframe = document.querySelector('#card-number iframe')
    const expiryIframe = document.querySelector('#card-expiry iframe')
    const cvvIframe = document.querySelector('#card-cvv iframe')
    
    addLog(`Card iframe: ${cardIframe ? '✅ Present' : '❌ Missing'}`)
    addLog(`Expiry iframe: ${expiryIframe ? '✅ Present' : '❌ Missing'}`)
    addLog(`CVV iframe: ${cvvIframe ? '✅ Present' : '❌ Missing'}`)
    
    if (cardIframe && expiryIframe && cvvIframe) {
      setCollectJSStatus('ready')
      addLog('🎯 All iframes present - CollectJS is READY for input!')
      
      // Check what functions are available on CollectJS
      if (window.CollectJS) {
        const functions = Object.keys(window.CollectJS).filter(key => typeof window.CollectJS[key] === 'function')
        addLog(`📌 Available CollectJS functions: ${functions.join(', ')}`)
      }
    }
  }

  const processPayment = async (token: string) => {
    addLog(`🚀 Processing payment with token: ${token}`)
    
    try {
      // Call the direct NMI endpoint that bypasses Inngest
      const response = await fetch('/api/nmi-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerInfo: {
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode,
            country: formData.country
          },
          paymentToken: token,
          products: [{
            id: 'fitspresso-6-pack',
            name: 'Fitspresso 6 Bottle Super Pack',
            price: 294,
            quantity: 1
          }],
          billingInfo: formData.useSameAddress ? {
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode,
            country: formData.country
          } : undefined
        })
      })

      const result = await response.json()
      addLog(`📦 API Response: ${JSON.stringify(result)}`)
      
      if (result.success) {
        addLog('✅ Payment APPROVED!')
        addLog(`Transaction ID: ${result.transactionId}`)
        addLog(`Order ID: ${result.orderId}`)
        addLog(`Auth Code: ${result.authCode}`)
        
        // Show price breakdown
        if (result.breakdown) {
          addLog('💰 Price Breakdown:')
          addLog(`  Subtotal: $${result.breakdown.subtotal}`)
          addLog(`  Tax: $${result.breakdown.tax}`)
          addLog(`  Shipping: $${result.breakdown.shipping}`)
          addLog(`  Total: $${result.breakdown.total}`)
        }
        
        // Show Level 3 data
        if (result.level3Data) {
          addLog('📦 Level 3 Line Items:')
          result.level3Data.items.forEach((item: any, index: number) => {
            addLog(`  ${index + 1}. ${item.name}`)
            addLog(`     Qty: ${item.quantity} × $${item.unitPrice} = $${item.total}`)
          })
        }
        
        if (result.avsResponse) addLog(`AVS Response: ${result.avsResponse}`)
        if (result.cvvResponse) addLog(`CVV Response: ${result.cvvResponse}`)
        
        // Show success message
        alert(`Payment Successful!\n\nTransaction ID: ${result.transactionId}\nOrder ID: ${result.orderId}\nTotal Amount: $${result.amount}`)
      } else {
        addLog(`❌ Payment DECLINED: ${result.message}`)
        addLog(`Response Code: ${result.responseCode}`)
        if (result.details) {
          addLog(`Details: ${JSON.stringify(result.details)}`)
        }
        
        // Show error message
        alert(`Payment Failed\n\n${result.message}`)
      }
      
    } catch (error) {
      addLog(`❌ API Error: ${error}`)
    }
  }

  // CollectJS will handle form submission via paymentSelector
  const handleFormValidation = () => {
    addLog('📝 Validating form before payment...')
    
    // Basic form validation
    const requiredFields = ['email', 'firstName', 'lastName', 'address', 'city', 'state', 'zipCode', 'phone', 'nameOnCard']
    const missingFields = requiredFields.filter(field => !formData[field])
    
    if (missingFields.length > 0) {
      addLog(`❌ Missing required fields: ${missingFields.join(', ')}`)
      return false
    }
    
    addLog('✅ Form validation passed')
    return true
  }

  const testValidation = () => {
    addLog('🧪 Testing field validation...')
    
    if (!window.CollectJS) {
      addLog('❌ CollectJS not available')
      return
    }
    
    try {
      if (typeof window.CollectJS.isValid === 'function') {
        const cardValid = window.CollectJS.isValid('ccnumber')
        const expValid = window.CollectJS.isValid('ccexp')
        const cvvValid = window.CollectJS.isValid('cvv')
        
        addLog(`Card valid: ${cardValid}`)
        addLog(`Expiry valid: ${expValid}`)
        addLog(`CVV valid: ${cvvValid}`)
      } else {
        addLog('❌ isValid function not available')
      }
    } catch (error) {
      addLog(`❌ Error testing validation: ${error}`)
    }
  }

  const manualTokenize = () => {
    addLog('🔧 Attempting manual tokenization...')
    
    if (!window.CollectJS) {
      addLog('❌ CollectJS not available')
      return
    }
    
    try {
      window.CollectJS.startPaymentRequest()
      addLog('✅ Manual tokenization triggered')
    } catch (error) {
      addLog(`❌ Manual tokenization error: ${error}`)
    }
  }

  useEffect(() => {
    addLog('🚀 Page loaded, starting CollectJS initialization')
    loadCollectJS()
  }, [addLog, loadCollectJS])

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">CollectJS Test Checkout</h1>
          <button
            onClick={() => {
              // Quick fill for testing
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
                useSameAddress: true
              })
              addLog('✨ Form auto-filled with test data')
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Quick Fill Test Data
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section - spans 2 columns on large screens */}
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Payment Form</h2>
            
            <div className="mb-4 p-4 bg-blue-50 rounded">
              <p className="text-sm">
                <strong>CollectJS Status:</strong> <span className={`font-semibold ${
                  collectJSStatus === 'ready' ? 'text-green-600' : 
                  collectJSStatus === 'error' ? 'text-red-600' : 
                  'text-yellow-600'
                }`}>{collectJSStatus}</span>
              </p>
              <p className="text-sm mt-1">
                <strong>Payment Fields:</strong> 
                <span className="ml-2">Card: <span className={fieldStatus.card === 'valid' ? 'text-green-600' : 'text-gray-500'}>{fieldStatus.card || 'empty'}</span></span>
                <span className="ml-2">Exp: <span className={fieldStatus.expiry === 'valid' ? 'text-green-600' : 'text-gray-500'}>{fieldStatus.expiry || 'empty'}</span></span>
                <span className="ml-2">CVV: <span className={fieldStatus.cvv === 'valid' ? 'text-green-600' : 'text-gray-500'}>{fieldStatus.cvv || 'empty'}</span></span>
              </p>
            </div>

            <div className="space-y-4">
              {/* Contact Information */}
              <h3 className="font-semibold text-gray-700">Contact Information</h3>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              </div>

              {/* Shipping Information */}
              <h3 className="font-semibold text-gray-700 mt-6">Shipping Information</h3>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">ZIP Code</label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Country</label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder="For delivery notifications"
                  required
                />
              </div>

              {/* Payment Information */}
              <h3 className="font-semibold text-gray-700 mt-6">Payment Information</h3>

              <div>
                <label className="block text-sm font-medium mb-1">Card Number</label>
                <div id="card-number"></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Expiry</label>
                  <div id="card-expiry"></div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CVV</label>
                  <div id="card-cvv"></div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Name on Card</label>
                <input
                  type="text"
                  value={formData.nameOnCard}
                  onChange={(e) => setFormData({...formData, nameOnCard: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.useSameAddress}
                    onChange={(e) => setFormData({...formData, useSameAddress: e.target.checked})}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Use shipping address as billing address</span>
                </label>
              </div>

              <button
                id="payment-button"
                type="button"
                disabled={loading || collectJSStatus !== 'ready'}
                className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Pay Now'}
              </button>

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={testValidation}
                  className="flex-1 bg-green-500 text-white py-2 rounded text-sm"
                >
                  Test Validation
                </button>
                <button
                  type="button"
                  onClick={manualTokenize}
                  className="flex-1 bg-purple-500 text-white py-2 rounded text-sm"
                >
                  Manual Tokenize
                </button>
                <button
                  type="button"
                  onClick={checkIframes}
                  className="flex-1 bg-yellow-500 text-white py-2 rounded text-sm"
                >
                  Check iFrames
                </button>
              </div>
            </div>
          </div>

          {/* Debug Logs Section - single column on large screens */}
          <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
            <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs overflow-y-auto max-h-[800px]">
              {debugLogs.length === 0 ? (
                <p>Loading...</p>
              ) : (
                debugLogs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-yellow-50 p-4 rounded">
          <h3 className="font-semibold mb-2">Testing Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Wait for "CollectJS is READY for input!" message</li>
            <li>Click in the Card Number field and type: 4111111111111111</li>
            <li>Click in the Expiry field and type: 12/25</li>
            <li>Click in the CVV field and type: 123</li>
            <li>Click "Test Validation" to check field status</li>
            <li>Click "Submit Payment" to trigger tokenization</li>
            <li>If nothing happens, click "Manual Tokenize"</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

// Extend Window interface
declare global {
  interface Window {
    CollectJS: {
      configure: (config: any) => void
      startPaymentRequest: () => void
      isValid?: (field: string) => boolean
    }
  }
}