'use client';

import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    CollectJS: any;
  }
}

interface CardUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
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
  
  // Expired card
  if (lowerError.includes('expired') || lowerError.includes('expir')) {
    return 'Your card has expired. Please update your card information.';
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
  onSuccess, 
  onError,
  errorMessage 
}: CardUpdateModalProps) {
  const [collectJSReady, setCollectJSReady] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [fallbackCardData, setFallbackCardData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: ''
  });

  // Load CollectJS when modal opens
  useEffect(() => {
    if (isOpen) {
      setUpdateError('');
      setCollectJSReady(false);
      
      // Load CollectJS with a delay to ensure modal is rendered
      setTimeout(() => {
        loadCollectJS();
      }, 500);
    }
    
    // Cleanup when modal closes
    return () => {
      if (!isOpen) {
        cleanup();
      }
    };
  }, [isOpen, loadCollectJS, cleanup]);

  // Sync fallback form data with CollectJS when available
  useEffect(() => {
    if (!collectJSReady || typeof window === 'undefined' || !window.CollectJS) return;

    // If fallback data has card number, try to populate CollectJS fields
    if (fallbackCardData.cardNumber || fallbackCardData.expiryDate || fallbackCardData.cvv) {
      console.log('🔄 Syncing password manager data with CollectJS...');
      
      try {
        // Note: Direct manipulation of CollectJS fields is complex due to iframe security
        // The main benefit is the autocomplete attributes for password managers
        if (fallbackCardData.cardNumber) {
          console.log('📝 Card number available from password manager');
        }
        if (fallbackCardData.expiryDate) {
          console.log('📝 Expiry date available from password manager');
        }
        if (fallbackCardData.cvv) {
          console.log('📝 CVV available from password manager');
        }
      } catch (error) {
        console.log('⚠️ Could not sync password manager data with CollectJS fields');
      }
    }
  }, [fallbackCardData, collectJSReady]);

  const cleanup = useCallback(() => {
    try {
      // Reset CollectJS if it exists
      if (typeof window !== 'undefined' && window.CollectJS) {
        console.log('🧹 Cleaning up CollectJS...');
        // Reset CollectJS to prevent conflicts
        if (window.CollectJS.clearFields) {
          window.CollectJS.clearFields();
        }
      }
      
      // Remove CollectJS script
      const existingScript = document.getElementById('collectjs-update-script');
      if (existingScript) {
        existingScript.remove();
        console.log('🗑️ Removed CollectJS script');
      }
      
      // Remove any Apple Pay related elements that might conflict
      const applePayElements = document.querySelectorAll('apple-spinner, [class*="apple-pay"]');
      applePayElements.forEach(element => {
        try {
          element.remove();
        } catch (e) {
          // Ignore errors when removing elements
        }
      });
      
    } catch (error) {
      console.log('⚠️ Error during CollectJS cleanup:', error);
    }
    
    // Reset state
    setCollectJSReady(false);
    setUpdateLoading(false);
    setUpdateError('');
  }, []);

  const configureCollectJS = useCallback(() => {
    console.log('🔄 Configuring CollectJS for card update...');
    
    try {
      window.CollectJS.configure({
        'variant': 'inline',
        'styleSniffer': false,
        'invalidCss': {
          'color': '#dc2626'
        },
        'validCss': {
          'color': '#059669'
        },
        'googleFont': 'Roboto:400,600',
        'fields': {
          'ccnumber': {
            'selector': '#update-card-number-field',
            'title': 'Card Number',
            'placeholder': '•••• •••• •••• ••••'
          },
          'ccexp': {
            'selector': '#update-card-expiry-field', 
            'title': 'Expiry',
            'placeholder': 'MM / YY'
          },
          'cvv': {
            'display': 'show',
            'selector': '#update-card-cvv-field',
            'title': 'CVV',
            'placeholder': '•••'
          }
        },
        'fieldsAvailableCallback': () => {
          console.log('✅ CollectJS fields ready for card update');
          setCollectJSReady(true);
        },
        'callback': (response: any) => {
          console.log('💳 CollectJS Response:', response);
          if (response.token) {
            handleVaultUpdate(response.token);
          } else {
            console.error('❌ No token in CollectJS response:', response);
            setUpdateError('Failed to tokenize payment information');
          }
        },
        'validationCallback': (field: string, status: string, message: string) => {
          console.log('🔍 Field validation:', field, status, message);
        }
      });
    } catch (error) {
      console.error('❌ Error configuring CollectJS:', error);
      setUpdateError('Failed to initialize payment system');
    }
  }, [onUpdate]);

  const loadCollectJS = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    // Check if CollectJS is already loaded globally
    if (window.CollectJS) {
      console.log('🔄 CollectJS already exists, configuring for card update...');
      configureCollectJS();
      return;
    }
    
    // Remove existing script if present
    cleanup();
    
    const script = document.createElement('script');
    script.id = 'collectjs-update-script';
    script.src = 'https://secure.networkmerchants.com/token/Collect.js';
    script.setAttribute('data-tokenization-key', process.env.NEXT_PUBLIC_NMI_TOKENIZATION_KEY || 'vZ668s-j859wu-6THDmy-kA46Hh');
    
    script.onload = () => {
      if (window.CollectJS) {
        configureCollectJS();
      }
    };
    
    script.onerror = () => {
      console.error('❌ Failed to load CollectJS for card update');
      setUpdateError('Failed to load payment system');
    };
    
    document.head.appendChild(script);
  }, [cleanup, configureCollectJS]);

  const handleVaultUpdate = async (paymentToken: string) => {
    if (!sessionId) {
      console.error('❌ Cannot update vault: No session ID available');
      setUpdateError('Session not available');
      return;
    }

    console.log('🚀 Starting vault update process...');
    console.log('📋 Update details:', {
      sessionId,
      paymentToken: paymentToken.substring(0, 10) + '...',
      nameOnCard: fallbackCardData.nameOnCard
    });

    setUpdateLoading(true);
    setUpdateError('');
    
    try {
      console.log('🔄 Sending vault update request to API...');
      
      const response = await fetch('/api/vault/update-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          sessionId,
          payment_token: paymentToken,
          name_on_card: fallbackCardData.nameOnCard || 'Customer'
        })
      });
      
      console.log('📡 Vault update API response status:', response.status);
      
      const result = await response.json();
      console.log('📦 Vault update API result:', result);
      
      if (result.success) {
        console.log('✅ Vault updated successfully! New payment method is now active.');
        console.log('🎯 Calling onSuccess callback to trigger upsell retry...');
        onSuccess();
      } else {
        console.error('❌ Vault update failed:', result.error);
        setUpdateError(result.error || 'Failed to update payment method');
      }
    } catch (error) {
      console.error('❌ Vault update network error:', error);
      setUpdateError('Network error occurred while updating payment method');
    } finally {
      console.log('🔄 Vault update process completed, setting loading to false');
      setUpdateLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!collectJSReady) {
      setUpdateError('Payment system not ready. Please wait a moment.');
      return;
    }
    
    if (typeof window === 'undefined' || !window.CollectJS) {
      setUpdateError('Payment system not available');
      return;
    }

    if (!fallbackCardData.nameOnCard.trim()) {
      setUpdateError('Please enter the name as shown on your card.');
      return;
    }
    
    setUpdateError('');
    setUpdateLoading(true);
    
    console.log('🚀 Submitting card update with name:', fallbackCardData.nameOnCard);
    
    // Trigger CollectJS tokenization
    window.CollectJS.startPaymentRequest();
  };

  const handleClose = () => {
    cleanup();
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
              onChange={(e) => setFallbackCardData(prev => ({ ...prev, nameOnCard: e.target.value }))}
              placeholder="Full name as shown on card"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 min-h-[3rem] bg-white"
            >
              {!collectJSReady && (
                <div style={{ color: '#9ca3af', fontSize: '16px' }}>Loading secure payment system...</div>
              )}
            </div>
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 min-h-[3rem] bg-white"
              >
                {!collectJSReady && (
                  <div style={{ color: '#9ca3af', fontSize: '16px' }}>MM/YY</div>
                )}
              </div>
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 min-h-[3rem] bg-white"
              >
                {!collectJSReady && (
                  <div style={{ color: '#9ca3af', fontSize: '16px' }}>000</div>
                )}
              </div>
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
              cleanup();
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