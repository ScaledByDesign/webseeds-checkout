'use client';

/**
 * Unified CollectJS Service
 * 
 * Consolidates CollectJS configuration, initialization, and management
 * across all checkout components and card update modals.
 * 
 * Features:
 * - Centralized configuration management
 * - Consistent error handling patterns
 * - Script loading with deduplication
 * - Field validation state management
 * - Token generation with callbacks
 * - Cross-component compatibility
 */

// Global CollectJS type declarations
declare global {
  interface Window {
    CollectJS: {
      configure: (config: CollectJSConfig) => void;
      startPaymentRequest: () => void;
      clearFields?: () => void;
    };
  }
}

// CollectJS Configuration Types
export interface CollectJSFieldConfig {
  selector: string;
  title?: string;
  placeholder?: string;
}

export interface CollectJSFields {
  ccnumber: CollectJSFieldConfig;
  ccexp: CollectJSFieldConfig;
  cvv: CollectJSFieldConfig & {
    display?: 'show' | 'hide';
  };
}

export interface CollectJSConfig {
  variant: 'inline' | 'modal';
  styleSniffer?: boolean;
  tokenizationKey: string;
  paymentSelector?: string;
  customCss?: Record<string, string>;
  focusCss?: Record<string, string>;
  invalidCss?: Record<string, string>;
  validCss?: Record<string, string>;
  placeholderCss?: Record<string, string>;
  fields: CollectJSFields;
  fieldsAvailableCallback?: () => void;
  callback?: (response: CollectJSResponse) => void;
  validationCallback?: (field: string, status: string, message: string) => void;
  timeoutCallback?: () => void;
}

export interface CollectJSResponse {
  token?: string;
  card?: {
    type: string;
    number: string;
    exp: string;
  };
  validationErrors?: Record<string, string>;
  error?: string;
}

// Service Configuration
export interface CollectJSServiceConfig {
  environment?: 'production' | 'sandbox';
  url?: string;
  tokenizationKey?: string;
  fieldSelectors?: {
    cardNumber: string;
    expiry: string;
    cvv: string;
  };
  customStyles?: {
    base?: Record<string, string>;
    focus?: Record<string, string>;
    invalid?: Record<string, string>;
    valid?: Record<string, string>;
    placeholder?: Record<string, string>;
  };
}

// Field Validation State
export interface FieldValidationState {
  [key: string]: {
    isValid: boolean;
    isTouched: boolean;
    error: string;
  };
}

// Token Generation Result
export interface TokenResult {
  success: boolean;
  token?: string;
  error?: string;
  validationErrors?: Record<string, string>;
}

/**
 * Unified CollectJS Service Class
 */
export class CollectJSService {
  private static instance: CollectJSService;
  private config: CollectJSServiceConfig;
  private isLoaded = false;
  private isConfigured = false;
  private loadingPromise: Promise<void> | null = null;
  private validationState: FieldValidationState = {};
  
  // Callbacks
  private onTokenCallback?: (result: TokenResult) => void;
  private onValidationCallback?: (field: string, status: string, message: string) => void;
  private onReadyCallback?: () => void;
  private onErrorCallback?: (error: string) => void;

  private constructor() {
    this.config = {
      environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'),
      url: process.env.NEXT_PUBLIC_COLLECT_JS_URL || 'https://secure.nmi.com/token/Collect.js',
      tokenizationKey: process.env.NEXT_PUBLIC_NMI_TOKENIZATION_KEY || 'vZ668s-j859wu-6THDmy-kA46Hh',
      fieldSelectors: {
        cardNumber: '#card-number-field',
        expiry: '#card-expiry-field',
        cvv: '#card-cvv-field'
      },
      customStyles: {
        base: {
          width: '100%',
          height: '100%',
          border: '2px solid #CDCDCD',
          'border-radius': '12px',
          padding: '20px 36px',
          'font-size': '18px',
          color: '#666666',
          'background-color': '#F9F9F9',
          'font-family': 'system-ui, -apple-system, sans-serif',
          'line-height': '1'
        },
        focus: {
          border: '2px solid #2563eb',
          outline: 'none'
        },
        invalid: {
          color: '#dc2626',
          border: '2px solid #dc2626'
        },
        valid: {
          color: '#059669',
          border: '2px solid #059669'
        },
        placeholder: {
          color: '#9ca3af',
          'font-weight': '400'
        }
      }
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CollectJSService {
    if (!CollectJSService.instance) {
      CollectJSService.instance = new CollectJSService();
    }
    return CollectJSService.instance;
  }

  /**
   * Initialize CollectJS with configuration
   */
  public async initialize(options: {
    fieldSelectors?: Partial<CollectJSServiceConfig['fieldSelectors']>;
    customStyles?: Partial<CollectJSServiceConfig['customStyles']>;
    onToken?: (result: TokenResult) => void;
    onValidation?: (field: string, status: string, message: string) => void;
    onReady?: () => void;
    onError?: (error: string) => void;
  } = {}): Promise<void> {
    console.log('🚀 CollectJS Service: Initializing...');

    // Update configuration
    if (options.fieldSelectors) {
      this.config.fieldSelectors = { ...this.config.fieldSelectors, ...options.fieldSelectors };
    }
    if (options.customStyles) {
      this.config.customStyles = { ...this.config.customStyles, ...options.customStyles };
    }

    // Set callbacks
    this.onTokenCallback = options.onToken;
    this.onValidationCallback = options.onValidation;
    this.onReadyCallback = options.onReady;
    this.onErrorCallback = options.onError;

    // Load script if needed
    if (!this.isLoaded) {
      await this.loadScript();
    }

    // Configure CollectJS
    this.configureCollectJS();

    console.log('✅ CollectJS Service: Initialization complete');
  }

  /**
   * Load CollectJS script with deduplication
   */
  private async loadScript(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('CollectJS can only be loaded in browser environment');
    }

    // Return existing promise if loading
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // Check if already loaded
    if (window.CollectJS) {
      console.log('🔄 CollectJS already loaded globally');
      this.isLoaded = true;
      return Promise.resolve();
    }

    // Check for existing script
    const existingScript = document.querySelector('script[src*="Collect.js"]');
    if (existingScript) {
      console.log('🔄 CollectJS script already exists, waiting for load...');
      return new Promise((resolve, reject) => {
        const checkLoaded = () => {
          if (window.CollectJS) {
            this.isLoaded = true;
            resolve();
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        setTimeout(() => {
          if (!window.CollectJS) {
            reject(new Error('CollectJS script timeout'));
          }
        }, 10000);
        checkLoaded();
      });
    }

    // Create loading promise
    this.loadingPromise = new Promise((resolve, reject) => {
      console.log('📥 Loading CollectJS script...');
      
      const script = document.createElement('script');
      script.src = this.config.url!;
      script.async = true;
      script.setAttribute('data-tokenization-key', this.config.tokenizationKey!);

      script.onload = () => {
        console.log('✅ CollectJS script loaded successfully');
        this.isLoaded = true;
        resolve();
      };

      script.onerror = (error) => {
        console.error('❌ Failed to load CollectJS script:', error);
        this.loadingPromise = null; // Reset for retry
        reject(new Error('Failed to load CollectJS script'));
      };

      document.body.appendChild(script);
    });

    return this.loadingPromise;
  }

  /**
   * Configure CollectJS with consolidated settings
   */
  private configureCollectJS(): void {
    if (!window.CollectJS) {
      throw new Error('CollectJS not available');
    }

    console.log('⚙️ Configuring CollectJS with consolidated settings...');
    console.log('🔑 Using tokenization key:', this.config.tokenizationKey?.substring(0, 10) + '...');
    console.log('📍 Field selectors:', this.config.fieldSelectors);

    const config: CollectJSConfig = {
      variant: 'inline',
      styleSniffer: true,
      tokenizationKey: this.config.tokenizationKey!,
      customCss: this.config.customStyles?.base,
      focusCss: this.config.customStyles?.focus,
      invalidCss: this.config.customStyles?.invalid,
      validCss: this.config.customStyles?.valid,
      placeholderCss: this.config.customStyles?.placeholder,
      fields: {
        ccnumber: {
          selector: this.config.fieldSelectors!.cardNumber!,
          title: 'Card Number',
          placeholder: ' ' // Empty placeholder to work with floating labels
        },
        ccexp: {
          selector: this.config.fieldSelectors!.expiry!,
          title: 'Expiry Date',
          placeholder: ' ' // Empty placeholder to work with floating labels
        },
        cvv: {
          display: 'show',
          selector: this.config.fieldSelectors!.cvv!,
          title: 'CVV',
          placeholder: ' ' // Empty placeholder to work with floating labels
        }
      },
      fieldsAvailableCallback: () => {
        console.log('🎯 CollectJS fields are ready');
        this.isConfigured = true;
        if (this.onReadyCallback) {
          this.onReadyCallback();
        }
      },
      callback: (response: CollectJSResponse) => {
        console.log('💳 CollectJS tokenization response:', response);
        this.handleTokenResponse(response);
      },
      validationCallback: (field: string, status: string, message: string) => {
        console.log(`🔍 Field validation [${field}]:`, { status, message });
        this.handleValidation(field, status, message);
      },
      timeoutCallback: () => {
        console.error('⏱️ CollectJS tokenization timeout');
        const error = 'Payment processing timed out. Please try again.';
        if (this.onErrorCallback) {
          this.onErrorCallback(error);
        }
      }
    };

    try {
      window.CollectJS.configure(config);
      console.log('✅ CollectJS configured successfully');
    } catch (error) {
      console.error('❌ Error configuring CollectJS:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback('Failed to configure payment system');
      }
      throw error;
    }
  }

  /**
   * Handle tokenization response
   */
  private handleTokenResponse(response: CollectJSResponse | any): void {
    // Handle string responses (e.g., just a token string or error code)
    if (typeof response === 'string') {
      // If it's a token-like string (longer than 10 chars, alphanumeric with dashes)
      if (response.length > 10 && /^[\w-]+$/.test(response)) {
        console.log('✅ Payment token generated successfully (string response)');
        const result: TokenResult = {
          success: true,
          token: response
        };
        
        if (this.onTokenCallback) {
          this.onTokenCallback(result);
        }
        return;
      } else {
        // Short string response is likely an error code
        console.error('❌ CollectJS error response:', response);
        const result: TokenResult = {
          success: false,
          error: 'Payment processing failed. Please try again.'
        };
        
        if (this.onTokenCallback) {
          this.onTokenCallback(result);
        }
        return;
      }
    }
    
    // Handle object responses
    if (response.validationErrors) {
      console.error('❌ Validation errors:', response.validationErrors);
      const result: TokenResult = {
        success: false,
        error: 'Please check your card details and try again',
        validationErrors: response.validationErrors
      };
      
      if (this.onTokenCallback) {
        this.onTokenCallback(result);
      }
      return;
    }

    if (response.token) {
      console.log('✅ Payment token generated successfully');
      const result: TokenResult = {
        success: true,
        token: response.token
      };
      
      if (this.onTokenCallback) {
        this.onTokenCallback(result);
      }
    } else {
      console.error('❌ No token in response:', response);
      const result: TokenResult = {
        success: false,
        error: 'Failed to generate payment token'
      };
      
      if (this.onTokenCallback) {
        this.onTokenCallback(result);
      }
    }
  }

  /**
   * Handle field validation
   */
  private handleValidation(field: string, status: string, message: string): void {
    // Map CollectJS field names to common names
    const fieldMap: { [key: string]: string } = {
      'ccnumber': 'cardNumber',
      'ccexp': 'expiry',
      'cvv': 'cvv'
    };

    const mappedField = fieldMap[field] || field;
    
    // Update validation state
    this.validationState[mappedField] = {
      isValid: status === 'valid',
      isTouched: true,
      error: status === 'invalid' || status === 'blank' ? message || `Invalid ${mappedField}` : ''
    };

    // Call external validation callback
    if (this.onValidationCallback) {
      this.onValidationCallback(mappedField, status, message);
    }
  }

  /**
   * Start payment request (tokenization)
   */
  public startPaymentRequest(): Promise<TokenResult> {
    return new Promise((resolve) => {
      if (!this.isConfigured) {
        resolve({
          success: false,
          error: 'Payment system not ready. Please wait a moment.'
        });
        return;
      }

      if (!window.CollectJS) {
        resolve({
          success: false,
          error: 'Payment system not available'
        });
        return;
      }

      // Set up one-time callback for this request
      const originalCallback = this.onTokenCallback;
      this.onTokenCallback = (result: TokenResult) => {
        this.onTokenCallback = originalCallback; // Restore original callback
        resolve(result);
      };

      try {
        console.log('🚀 Starting CollectJS payment request...');
        window.CollectJS.startPaymentRequest();
      } catch (error) {
        console.error('❌ Error starting payment request:', error);
        this.onTokenCallback = originalCallback; // Restore original callback
        resolve({
          success: false,
          error: 'Failed to process payment information'
        });
      }
    });
  }

  /**
   * Clear all payment fields
   */
  public clearFields(): void {
    try {
      if (window.CollectJS?.clearFields) {
        window.CollectJS.clearFields();
        console.log('🧹 CollectJS fields cleared');
      }
      
      // Reset validation state
      this.validationState = {};
    } catch (error) {
      console.log('⚠️ Could not clear CollectJS fields:', error);
    }
  }

  /**
   * Get current field validation state
   */
  public getValidationState(): FieldValidationState {
    return { ...this.validationState };
  }

  /**
   * Check if service is ready for use
   */
  public isReady(): boolean {
    return this.isLoaded && this.isConfigured;
  }

  /**
   * Update field selectors (useful for different components)
   */
  public updateFieldSelectors(selectors: Partial<CollectJSServiceConfig['fieldSelectors']>): void {
    this.config.fieldSelectors = { ...this.config.fieldSelectors, ...selectors };
    // Note: Requires reconfiguration to take effect
  }

  /**
   * Get current configuration
   */
  public getConfig(): CollectJSServiceConfig {
    return { ...this.config };
  }

  /**
   * Reset service state (useful for cleanup)
   */
  public reset(): void {
    console.log('🔄 Resetting CollectJS service state');
    this.isConfigured = false;
    this.validationState = {};
    this.onTokenCallback = undefined;
    this.onValidationCallback = undefined;
    this.onReadyCallback = undefined;
    this.onErrorCallback = undefined;
    
    try {
      this.clearFields();
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Destroy service instance (complete cleanup)
   */
  public destroy(): void {
    console.log('💥 Destroying CollectJS service');
    this.reset();
    
    // Remove script if we loaded it
    if (this.isLoaded) {
      const scripts = document.querySelectorAll('script[src*="Collect.js"]');
      scripts.forEach(script => {
        try {
          script.remove();
        } catch (error) {
          // Ignore removal errors
        }
      });
    }
    
    this.isLoaded = false;
    this.loadingPromise = null;
    
    // Clear singleton instance
    CollectJSService.instance = null as any;
  }

  /**
   * Utility: Create field validation error object
   */
  public static createValidationError(field: string, message: string): Record<string, string> {
    return { [field]: message };
  }

  /**
   * Utility: Check if error is a CollectJS validation error
   */
  public static isValidationError(error: any): error is { validationErrors: Record<string, string> } {
    return error && typeof error === 'object' && error.validationErrors;
  }

  /**
   * Utility: Format card type from response
   */
  public static formatCardType(cardType?: string): string {
    if (!cardType) return 'Card';
    
    const typeMap: { [key: string]: string } = {
      'visa': 'Visa',
      'mastercard': 'Mastercard',
      'amex': 'American Express',
      'discover': 'Discover',
      'jcb': 'JCB',
      'diners': 'Diners Club'
    };
    
    return typeMap[cardType.toLowerCase()] || cardType;
  }

  /**
   * Utility: Validate tokenization key format
   */
  public static isValidTokenizationKey(key: string): boolean {
    return key.length >= 10 && /^[a-zA-Z0-9\-]+$/.test(key);
  }
}

/**
 * Convenience function to get CollectJS service instance
 */
export function getCollectJSService(): CollectJSService {
  return CollectJSService.getInstance();
}

/**
 * React hook for CollectJS service (if using React)
 */
export function useCollectJS() {
  const service = CollectJSService.getInstance();
  
  return {
    initialize: service.initialize.bind(service),
    startPaymentRequest: service.startPaymentRequest.bind(service),
    clearFields: service.clearFields.bind(service),
    getValidationState: service.getValidationState.bind(service),
    isReady: service.isReady.bind(service),
    reset: service.reset.bind(service)
  };
}

export default CollectJSService;