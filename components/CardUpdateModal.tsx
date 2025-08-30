'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CollectJSService, type TokenResult } from '@/src/lib/collectjs-service';

declare global {
  interface Window {
    CollectJS: any;
  }
}

interface CardUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
  vaultId?: string;
  customerInfo?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  onSuccess: () => void;
  onError: (message: string) => void;
  errorMessage?: string;
}

// Convert technical error messages to user-friendly ones
const getFriendlyErrorMessage = (errorMessage: string): string => {
  if (!errorMessage) return 'There was an issue with your payment method.';
  
  const lowerError = errorMessage.toLowerCase();
  
  // Card declined scenarios
  if (lowerError.includes('declined') || lowerError.includes('decline') || lowerError.includes('do not honor')) {
    return 'Your card was declined by your bank. Please try a different payment method or contact your bank.';
  }
  
  // Insufficient funds
  if (lowerError.includes('insufficient') || lowerError.includes('nsf')) {
    return 'Your card has insufficient funds. Please try a different payment method.';
  }
  
  // Expired card (but not expired session)
  if ((lowerError.includes('expired') && !lowerError.includes('session')) || 
      (lowerError.includes('expir') && !lowerError.includes('session'))) {
    return 'Your card has expired. Please update your card information.';
  }
  
  // Session issues
  if (lowerError.includes('session') || lowerError.includes('vault')) {
    return 'Your payment session needs to be refreshed. Please update your payment method to continue.';
  }
  
  // Invalid card details
  if (lowerError.includes('invalid card') || lowerError.includes('invalid account')) {
    return 'The card information appears to be invalid. Please double-check your card details.';
  }
  
  // CVV issues
  if (lowerError.includes('cvv') || lowerError.includes('security code') || lowerError.includes('cvc')) {
    return 'The security code (CVV) doesn\'t match your card. Please verify the 3-digit code on the back of your card.';
  }
  
  // Duplicate transaction
  if (lowerError.includes('duplicate') || lowerError.includes('refid')) {
    return 'This appears to be a duplicate transaction. Please update your payment method to continue.';
  }
  
  // Processing/system errors
  if (lowerError.includes('processing') || lowerError.includes('system error') || lowerError.includes('timeout')) {
    return 'There was a temporary processing issue. Please update your payment information and try again.';
  }
  
  // Card restrictions
  if (lowerError.includes('restricted') || lowerError.includes('blocked') || lowerError.includes('hold')) {
    return 'Your card has restrictions that prevent this transaction. Please contact your bank or try a different card.';
  }
  
  // Generic fallback for other errors
  return 'There was an issue processing your payment. Please update your payment method to continue.';
};

export default function CardUpdateModal({
  isOpen,
  onClose,
  sessionId,
  vaultId,
  customerInfo,
  onSuccess,
  onError,
  errorMessage
}: CardUpdateModalProps) {
  const [collectJSReady, setCollectJSReady] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const collectJSService = CollectJSService.getInstance();
  const [updateError, setUpdateError] = useState('');
  const [fallbackCardData, setFallbackCardData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: ''
  });
  
  // Use refs to prevent re-initialization
  const isInitializing = useRef(false);
  const handleVaultUpdateRef = useRef<(token: string) => Promise<void>>();
  
  // Field validation state
  const [fieldErrors, setFieldErrors] = useState({
    nameOnCard: '',
    cardNumber: '',
    expiryDate: '',
    cvv: ''
  });
  
  const [fieldTouched, setFieldTouched] = useState({
    nameOnCard: false,
    cardNumber: false,
    expiryDate: false,
    cvv: false
  });
  
  const [validFields, setValidFields] = useState({
    nameOnCard: false,
    cardNumber: false,
    expiryDate: false,
    cvv: false
  });



  // Define handleVaultUpdate and store in ref to prevent re-creation
  handleVaultUpdateRef.current = async (paymentToken: string) => {
    console.log('🎯 handleVaultUpdate function called with token:', paymentToken?.substring(0, 20) + '...');

    // Get the current name value at the time of submission
    const currentNameOnCard = fallbackCardData.nameOnCard;

    // Determine which method to use: direct (preferred) or session-based (fallback)
    const useDirectMethod = vaultId && customerInfo;

    console.log('🚀 Starting vault update process...');
    console.log('📋 Update method:', useDirectMethod ? 'DIRECT (vault ID + customer info)' : 'SESSION-BASED (fallback)');
    console.log('📋 Update details:', {
      method: useDirectMethod ? 'direct' : 'session-based',
      vaultId: vaultId || 'N/A',
      customerEmail: customerInfo?.email || 'N/A',
      sessionId: sessionId || 'N/A',
      paymentToken: paymentToken.substring(0, 10) + '...',
      nameOnCard: currentNameOnCard
    });

    setUpdateLoading(true);
    setUpdateError('');

    try {
      console.log('🔄 Sending vault update request to API...');

      let requestBody: any;

      if (useDirectMethod) {
        // Use direct method - no session validation required
        console.log('✅ Using DIRECT method with vault ID and customer info');
        requestBody = {
          vaultId,
          customerInfo,
          payment_token: paymentToken,
          name_on_card: currentNameOnCard || customerInfo.firstName + ' ' + customerInfo.lastName
        };
      } else {
        // Fallback to session-based method
        console.log('⚠️ Using SESSION-BASED fallback method');
        if (!sessionId) {
          console.error('❌ Cannot update vault: No session ID or vault info available');
          setUpdateError('Session not available');
          setUpdateLoading(false);
          return;
        }
        requestBody = {
          sessionId,
          payment_token: paymentToken,
          name_on_card: currentNameOnCard || 'Customer'
        };
      }

      // Debug: Log the exact request being sent
      console.log('📤 API Request Details:');
      console.log('  URL: /api/vault/update-card');
      console.log('  Method: POST');
      console.log('  Body:', JSON.stringify(requestBody, null, 2));
      console.log('  Time:', new Date().toISOString());

      const fetchStartTime = Date.now();
      
      const response = await fetch('/api/vault/update-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify(requestBody)
      });
      
      const fetchEndTime = Date.now();
      const fetchDuration = fetchEndTime - fetchStartTime;
      
      console.log('📡 Vault update API response received:');
      console.log(`  Status: ${response.status} ${response.statusText}`);
      console.log(`  Duration: ${fetchDuration}ms`);
      console.log(`  OK: ${response.ok}`);
      console.log(`  Headers:`, Object.fromEntries(response.headers.entries()));
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ Response is not JSON. Content-Type:', contentType);
        const text = await response.text();
        console.error('Response text:', text);
        throw new Error('Invalid response format from server');
      }
      
      const result = await response.json();
      console.log('📦 Vault update API result:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('✅ Vault updated successfully! New payment method is now active.');
        console.log('🎯 Vault Update Success Details:');
        console.log('  Vault ID:', result.vaultId);
        console.log('  Response Code:', result.responseCode);
        console.log('  Timestamp:', new Date(result.timestamp || Date.now()).toISOString());
        console.log('🎯 Calling onSuccess callback to trigger upsell retry...');
        
        // Set loading to false before calling onSuccess to ensure UI updates
        setUpdateLoading(false);
        
        // Increase delay to ensure vault update propagates through the system
        const delayMs = 500; // Increased from 100ms to 500ms
        console.log(`⏳ Waiting ${delayMs}ms to ensure vault update is fully propagated...`);
        
        setTimeout(() => {
          console.log('🔄 Executing onSuccess callback now...');
          console.log('  Callback function exists:', typeof onSuccess === 'function');
          
          try {
            onSuccess();
            console.log('✅ onSuccess callback executed successfully');
          } catch (callbackError) {
            console.error('❌ Error in onSuccess callback:', callbackError);
          }
        }, delayMs);
      } else {
        console.error('❌ Vault update failed:', result.error);
        console.error('  Error details:', {
          error: result.error,
          message: result.message,
          responseCode: result.responseCode,
          timestamp: new Date().toISOString()
        });
        
        // Check if it's a temporary error that might benefit from retry
        const isTemporaryError = result.error && (
          result.error.toLowerCase().includes('timeout') ||
          result.error.toLowerCase().includes('network') ||
          result.error.toLowerCase().includes('temporary')
        );
        
        if (isTemporaryError) {
          console.log('⚠️ This appears to be a temporary error. Consider retrying.');
        }
        
        setUpdateError(result.error || 'Failed to update payment method');
        setUpdateLoading(false);
      }
    } catch (error) {
      console.error('❌ Vault update network/parsing error:', error);
      console.error('  Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('  Error message:', error instanceof Error ? error.message : String(error));
      console.error('  Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // More specific error messages based on error type
      let errorMessage = 'An error occurred while updating payment method';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Network connection error. Please check your internet connection.';
      } else if (error instanceof SyntaxError) {
        errorMessage = 'Server response error. Please try again.';
      } else if (error instanceof Error && error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setUpdateError(errorMessage);
      setUpdateLoading(false);
    }
  };



  // Sync fallback form data for password managers (informational logging)
  useEffect(() => {
    if (!collectJSReady) return;

    // Log available password manager data
    if (fallbackCardData.cardNumber || fallbackCardData.expiryDate || fallbackCardData.cvv) {
      console.log('🔄 Password manager data available for CollectJS fields');
      
      if (fallbackCardData.cardNumber) {
        console.log('📝 Card number available from password manager');
      }
      if (fallbackCardData.expiryDate) {
        console.log('📝 Expiry date available from password manager');
      }
      if (fallbackCardData.cvv) {
        console.log('📝 CVV available from password manager');
      }
    }
  }, [fallbackCardData, collectJSReady]);

  // Initialize CollectJS service when modal opens
  useEffect(() => {
    if (isOpen && !isInitializing.current) {
      console.log('📂 CardUpdateModal opened, initializing...');
      isInitializing.current = true;
      setUpdateError('');
      setCollectJSReady(false);
      
      // Reset validation state
      setFieldErrors({
        nameOnCard: '',
        cardNumber: '',
        expiryDate: '',
        cvv: ''
      });
      setFieldTouched({
        nameOnCard: false,
        cardNumber: false,
        expiryDate: false,
        cvv: false
      });
      setValidFields({
        nameOnCard: false,
        cardNumber: false,
        expiryDate: false,
        cvv: false
      });
      
      // Initialize CollectJS service with modal-specific configuration
      const initializeService = async () => {
        try {
          await collectJSService.initialize({
            fieldSelectors: {
              cardNumber: '#update-card-number-field',
              expiry: '#update-card-expiry-field',
              cvv: '#update-card-cvv-field'
            },
            onToken: async (result: TokenResult) => {
              console.log('🎯 Token callback triggered with result:', { 
                success: result.success, 
                hasToken: !!result.token,
                error: result.error 
              });
              
              if (result.success && result.token) {
                console.log('✅ Payment token generated successfully!');
                console.log('   Token:', result.token.substring(0, 20) + '...');
                console.log('🚀 Processing vault update with token...');
                
                // Process the vault update using ref
                if (handleVaultUpdateRef.current) {
                  await handleVaultUpdateRef.current(result.token);
                }
              } else {
                console.error('❌ Token generation failed:', result.error);
                setUpdateError(result.error || 'Failed to generate payment token');
                setUpdateLoading(false);
              }
            },
            onReady: () => {
              console.log('✅ CollectJS ready for card update');
              setCollectJSReady(true);
            },
            onError: (error: string) => {
              console.error('❌ CollectJS initialization error:', error);
              setUpdateError(error);
            },
            onValidation: (field: string, status: string, message: string) => {
              console.log(`🔍 Card update validation [${field}]:`, { status, message });
              
              setFieldTouched(prev => ({ ...prev, [field]: true }));
              
              if (status === 'valid') {
                setValidFields(prev => ({ ...prev, [field]: true }));
                setFieldErrors(prev => ({ ...prev, [field]: '' }));
              } else if (status === 'invalid' || status === 'blank') {
                setValidFields(prev => ({ ...prev, [field]: false }));
                const errorMessage = message || `Invalid ${field === 'cardNumber' ? 'card number' : 
                  field === 'expiry' ? 'expiry date' : 'CVV'}`;
                setFieldErrors(prev => ({ ...prev, [field]: errorMessage }));
              }
            }
          });
        } catch (error) {
          console.error('Failed to initialize CollectJS service:', error);
          setUpdateError('Failed to initialize payment system');
        }
      };
      
      // Add delay to ensure modal is rendered
      const timer = setTimeout(() => {
        initializeService();
      }, 500);
      
      return () => {
        clearTimeout(timer);
      };
    } else if (!isOpen) {
      // Reset initialization flag when modal closes
      isInitializing.current = false;
    }
  }, [isOpen, collectJSService]) // Only re-initialize when modal opens/closes, not on every render
  
  // Cleanup effect when modal closes
  useEffect(() => {
    if (!isOpen && collectJSReady) {
      const cleanupTimer = setTimeout(() => {
        console.log('🧹 Cleaning up CollectJS service for card update modal');
        collectJSService.reset();
      }, 100);
      
      return () => clearTimeout(cleanupTimer);
    }
  }, [isOpen, collectJSReady, collectJSService]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 Card Update Form Submission Started');
    console.log('  CollectJS Ready:', collectJSReady);
    console.log('  Name on Card:', fallbackCardData.nameOnCard);
    
    if (!collectJSReady || !collectJSService.isReady()) {
      console.error('❌ Payment system not ready');
      setUpdateError('Payment system not ready. Please wait a moment.');
      return;
    }

    // Validate name field
    if (!fallbackCardData.nameOnCard.trim()) {
      console.error('❌ Name field is empty');
      setFieldErrors(prev => ({ ...prev, nameOnCard: 'Please enter the name as shown on your card' }));
      setFieldTouched(prev => ({ ...prev, nameOnCard: true }));
      
      // Focus on name field
      const nameField = document.querySelector('input[name="cc-name"]') as HTMLInputElement;
      if (nameField) {
        nameField.focus();
      }
      return;
    }
    
    // Mark all fields as touched to show validation
    setFieldTouched({
      nameOnCard: true,
      cardNumber: true,
      expiryDate: true,
      cvv: true
    });
    
    // Check current validation state
    console.log('🔍 Pre-submission validation state:', {
      nameValid: validFields.nameOnCard,
      cardValid: validFields.cardNumber,
      expiryValid: validFields.expiryDate,
      cvvValid: validFields.cvv,
      errors: fieldErrors
    });
    
    setUpdateError('');
    setUpdateLoading(true);
    
    console.log('🚀 Triggering CollectJS tokenization...');
    console.log('  Session ID:', sessionId);
    console.log('  Name on Card:', fallbackCardData.nameOnCard);
    
    try {
      // Trigger CollectJS tokenization via service
      await collectJSService.startPaymentRequest();
      console.log('✅ Payment request started via service');
    } catch (error) {
      console.error('❌ Error starting payment request:', error);
      setUpdateError('Failed to process payment information');
      setUpdateLoading(false);
    }
  };

  const handleClose = () => {
    collectJSService.reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="exit-pop" style={{ zIndex: 10000 }}>
      <div id="loadModal-cardupdate" style={{ 
        maxWidth: '500px', 
        margin: '0 auto', 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '30px', 
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)' 
      }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            backgroundColor: '#dbeafe', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 15px' 
          }}>
            <svg style={{ width: '30px', height: '30px', color: '#2563eb' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '10px' }}>
            Update Payment Method
          </h3>
          <p style={{ fontSize: '16px', color: '#6b7280', lineHeight: '1.5' }}>
            Please enter your new payment information below to update your vault and continue with the upgrade.
          </p>
        </div>

        {/* User-Friendly Error Message */}
        {errorMessage && (
          <div style={{ 
            backgroundColor: '#fef2f2', 
            border: '1px solid #fca5a5', 
            borderRadius: '8px', 
            padding: '16px', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <svg style={{ width: '20px', height: '20px', color: '#dc2626', flexShrink: 0, marginTop: '2px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p style={{ color: '#dc2626', fontSize: '14px', margin: 0, fontWeight: '600', lineHeight: '1.4' }}>
                {getFriendlyErrorMessage(errorMessage)}
              </p>
              {errorMessage.toLowerCase().includes('duplicate') && (
                <p style={{ color: '#dc2626', fontSize: '12px', margin: '8px 0 0 0', opacity: 0.8 }}>
                  Technical details: {errorMessage}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Update Error display */}
        {updateError && (
          <div style={{ 
            backgroundColor: '#fef2f2', 
            border: '1px solid #fca5a5', 
            borderRadius: '8px', 
            padding: '12px', 
            marginBottom: '20px' 
          }}>
            <p style={{ color: '#dc2626', fontSize: '14px', margin: 0 }}>
              {updateError}
            </p>
          </div>
        )}

        {/* Autocomplete-friendly form (hidden but accessible to password managers) */}
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', visibility: 'hidden', height: 0, overflow: 'hidden' }}>
          <input
            type="text"
            name="cc-number-hidden"
            autoComplete="cc-number"
            value={fallbackCardData.cardNumber}
            onChange={(e) => setFallbackCardData(prev => ({ ...prev, cardNumber: e.target.value }))}
            placeholder="Card Number"
          />
          <input
            type="text"
            name="cc-exp-hidden"
            autoComplete="cc-exp"
            value={fallbackCardData.expiryDate}
            onChange={(e) => setFallbackCardData(prev => ({ ...prev, expiryDate: e.target.value }))}
            placeholder="MM/YY"
          />
          <input
            type="text"
            name="cc-csc-hidden"
            autoComplete="cc-csc"
            value={fallbackCardData.cvv}
            onChange={(e) => setFallbackCardData(prev => ({ ...prev, cvv: e.target.value }))}
            placeholder="CVV"
          />
          <input
            type="text"
            name="cc-name-hidden"
            autoComplete="cc-name"
            value={fallbackCardData.nameOnCard}
            onChange={(e) => setFallbackCardData(prev => ({ ...prev, nameOnCard: e.target.value }))}
            placeholder="Name on Card"
            style={{ display: 'none' }}
          />
        </div>

        {/* Card Update Form */}
        <form onSubmit={handleSubmit} autoComplete="on">
          {/* Name on Card - visible field for better UX */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: '6px' 
            }}>
              Name on Card
            </label>
            <input
              type="text"
              name="cc-name"
              autoComplete="cc-name"
              value={fallbackCardData.nameOnCard}
              onChange={(e) => {
                setFallbackCardData(prev => ({ ...prev, nameOnCard: e.target.value }));
                setFieldTouched(prev => ({ ...prev, nameOnCard: true }));
                if (e.target.value.trim()) {
                  setFieldErrors(prev => ({ ...prev, nameOnCard: '' }));
                  setValidFields(prev => ({ ...prev, nameOnCard: true }));
                } else {
                  setFieldErrors(prev => ({ ...prev, nameOnCard: 'Name is required' }));
                  setValidFields(prev => ({ ...prev, nameOnCard: false }));
                }
              }}
              placeholder="Full name as shown on card"
              style={{
                width: '100%',
                minHeight: '60px',
                border: '2px solid #CDCDCD',
                borderRadius: '12px',
                padding: '20px 36px',
                fontSize: '18px',
                color: '#666666',
                backgroundColor: '#F9F9F9',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                lineHeight: '1',
                outline: 'none',
                transition: 'border-color 0.2s',
                ...(fieldTouched.nameOnCard && fieldErrors.nameOnCard ? { borderColor: '#dc2626' } : 
                    fieldTouched.nameOnCard && validFields.nameOnCard ? { borderColor: '#059669' } : {})
              }}
              onFocus={(e) => e.target.style.borderColor = '#2563eb'}
              onBlur={(e) => {
                if (fieldTouched.nameOnCard && fieldErrors.nameOnCard) {
                  e.target.style.borderColor = '#dc2626';
                } else if (fieldTouched.nameOnCard && validFields.nameOnCard) {
                  e.target.style.borderColor = '#059669';
                } else {
                  e.target.style.borderColor = '#CDCDCD';
                }
              }}
            />
            {fieldTouched.nameOnCard && fieldErrors.nameOnCard && (
              <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                {fieldErrors.nameOnCard}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: '6px' 
            }}>
              Card Number
            </label>
            <div 
              id="update-card-number-field" 
              style={{
                minHeight: '60px',
                width: '100%',
                position: 'relative'
              }}
            >
              {!collectJSReady && (
                <div style={{ 
                  position: 'absolute',
                  top: '50%',
                  left: '36px',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af', 
                  fontSize: '18px',
                  pointerEvents: 'none'
                }}>Loading secure payment...</div>
              )}
            </div>
            {fieldTouched.cardNumber && fieldErrors.cardNumber && (
              <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                {fieldErrors.cardNumber}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '6px' 
              }}>
                Expiry Date
              </label>
              <div 
                id="update-card-expiry-field" 
                style={{
                  minHeight: '60px',
                  width: '100%',
                  position: 'relative'
                }}
              >
                {!collectJSReady && (
                  <div style={{ 
                    position: 'absolute',
                    top: '50%',
                    left: '36px',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af', 
                    fontSize: '18px',
                    pointerEvents: 'none'
                  }}>MM/YY</div>
                )}
              </div>
              {fieldTouched.expiryDate && fieldErrors.expiryDate && (
                <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                  {fieldErrors.expiryDate}
                </p>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '6px' 
              }}>
                CVV
              </label>
              <div 
                id="update-card-cvv-field" 
                style={{
                  minHeight: '60px',
                  width: '100%',
                  position: 'relative'
                }}
              >
                {!collectJSReady && (
                  <div style={{ 
                    position: 'absolute',
                    top: '50%',
                    left: '36px',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af', 
                    fontSize: '18px',
                    pointerEvents: 'none'
                  }}>123</div>
                )}
              </div>
              {fieldTouched.cvv && fieldErrors.cvv && (
                <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                  {fieldErrors.cvv}
                </p>
              )}
            </div>
          </div>

          <div style={{ 
            backgroundColor: '#f0fdf4', 
            borderRadius: '8px', 
            padding: '15px', 
            marginBottom: '20px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <svg style={{ width: '16px', height: '16px', color: '#16a34a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#166534' }}>
                Secure Payment Processing
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#166534', margin: '0 0 8px 0' }}>
              Your payment information is encrypted and secure. We never store your card details on our servers.
            </p>
            <p style={{ fontSize: '12px', color: '#166534', margin: 0, opacity: 0.9 }}>
              💡 Tip: Your password manager (1Password, LastPass, etc.) can autofill your card information.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
            <button
              type="submit"
              disabled={!collectJSReady || updateLoading}
              style={{
                backgroundColor: (!collectJSReady || updateLoading) ? '#9ca3af' : '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: (!collectJSReady || updateLoading) ? 'not-allowed' : 'pointer'
              }}
            >
              {updateLoading ? 'Updating Payment Method...' : 
               !collectJSReady ? 'Loading Payment System...' :
               'Update & Retry Purchase'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={updateLoading}
              style={{
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                padding: '12px 20px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: updateLoading ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Alternative option */}
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#eff6ff', 
          borderRadius: '8px', 
          textAlign: 'center' 
        }}>
          <p style={{ fontSize: '12px', color: '#1e40af', marginBottom: '8px' }}>
            Having trouble with the card update?
          </p>
          <button
            onClick={() => {
              collectJSService.reset();
              onError('Please try starting a new checkout process');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              textDecoration: 'underline',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Start a new checkout instead
          </button>
        </div>
      </div>
    </div>
  );
}