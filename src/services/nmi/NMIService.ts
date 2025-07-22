import axios, { AxiosResponse } from 'axios';
import { capturePaymentError } from '@/src/lib/sentry';
import {
  PaymentParams,
  PaymentResult,
  VaultParams,
  VaultResult,
  NMIResponse,
  NMIConfig,
} from './types';

export class NMIService {
  private static instance: NMIService;
  private config: NMIConfig;

  private constructor() {
    this.config = {
      securityKey: process.env.NMI_SECURITY_KEY || '',
      endpoint: process.env.NMI_ENDPOINT || 'https://secure.networkmerchants.com/api/transact.php',
      collectJsUrl: process.env.NEXT_PUBLIC_COLLECT_JS_URL || 'https://secure.nmi.com/token/Collect.js',
      publicKey: process.env.NEXT_PUBLIC_NMI_PUBLIC_KEY || '',
      mode: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'production' | 'sandbox',
    };

    if (!this.config.securityKey) {
      throw new Error('NMI_SECURITY_KEY environment variable is required');
    }
  }

  public static getInstance(): NMIService {
    if (!NMIService.instance) {
      NMIService.instance = new NMIService();
    }
    return NMIService.instance;
  }

  /**
   * Process a payment transaction
   */
  async processPayment(params: PaymentParams): Promise<PaymentResult> {
    try {
      const requestData = this.buildPaymentRequest(params);
      
      const response: AxiosResponse<string> = await axios.post(
        this.config.endpoint,
        new URLSearchParams(requestData).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      const parsedResponse = this.parseNMIResponse(response.data);
      return this.mapPaymentResponse(parsedResponse);

    } catch (error) {
      capturePaymentError(error as Error, {
        amount: params.amount,
        step: 'payment_processing',
      });

      return {
        success: false,
        error: 'Payment processing failed. Please try again.',
        errorCode: 'PROCESSING_ERROR',
      };
    }
  }

  /**
   * Create a customer vault for stored payments
   */
  async createCustomerVault(params: VaultParams): Promise<VaultResult> {
    try {
      const requestData = this.buildVaultRequest(params);
      
      const response: AxiosResponse<string> = await axios.post(
        this.config.endpoint,
        new URLSearchParams(requestData).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000,
        }
      );

      const parsedResponse = this.parseNMIResponse(response.data);
      return this.mapVaultResponse(parsedResponse);

    } catch (error) {
      capturePaymentError(error as Error, {
        sessionId: params.sessionId,
        step: 'vault_creation',
      });

      return {
        success: false,
        error: 'Failed to create secure payment method. Please try again.',
        errorCode: 'VAULT_ERROR',
      };
    }
  }

  /**
   * Process payment using existing vault
   */
  async processVaultPayment(vaultId: string, amount: number, orderId?: string): Promise<PaymentResult> {
    const params: PaymentParams = {
      amount,
      vaultId,
      orderId,
    };

    return this.processPayment(params);
  }

  /**
   * Validate NMI configuration
   */
  validateConfig(): boolean {
    return !!(
      this.config.securityKey &&
      this.config.endpoint &&
      this.config.collectJsUrl
    );
  }

  /**
   * Get CollectJS configuration
   */
  getCollectJSConfig() {
    return {
      url: this.config.collectJsUrl,
      publicKey: this.config.publicKey,
      variant: 'inline',
      environment: this.config.mode,
    };
  }

  /**
   * Build payment request data
   */
  private buildPaymentRequest(params: PaymentParams): Record<string, string> {
    const data: Record<string, string> = {
      security_key: this.config.securityKey,
      type: 'sale',
      amount: params.amount.toFixed(2),
    };

    if (params.orderId) {
      data.orderid = params.orderId;
    }

    if (params.paymentToken) {
      data.payment_token = params.paymentToken;
    } else if (params.vaultId) {
      data.customer_vault_id = params.vaultId;
    }

    // Add customer information
    if (params.customerInfo) {
      data.email = params.customerInfo.email;
      data.first_name = params.customerInfo.firstName;
      data.last_name = params.customerInfo.lastName;
      
      if (params.customerInfo.phone) {
        data.phone = params.customerInfo.phone;
      }
    }

    // Add billing information
    if (params.billingInfo) {
      data.address1 = params.billingInfo.address;
      data.city = params.billingInfo.city;
      data.state = params.billingInfo.state;
      data.zip = params.billingInfo.zipCode;
      data.country = params.billingInfo.country || 'US';
    }

    return data;
  }

  /**
   * Build vault request data
   */
  private buildVaultRequest(params: VaultParams): Record<string, string> {
    const data: Record<string, string> = {
      security_key: this.config.securityKey,
      customer_vault: 'add_customer',
      payment_token: params.paymentToken,
    };

    if (params.customerInfo) {
      data.email = params.customerInfo.email;
      data.first_name = params.customerInfo.firstName;
      data.last_name = params.customerInfo.lastName;
      
      if (params.customerInfo.phone) {
        data.phone = params.customerInfo.phone;
      }
    }

    if (params.billingInfo) {
      data.address1 = params.billingInfo.address;
      data.city = params.billingInfo.city;
      data.state = params.billingInfo.state;
      data.zip = params.billingInfo.zipCode;
      data.country = params.billingInfo.country || 'US';
    }

    return data;
  }

  /**
   * Parse NMI response string into object
   */
  private parseNMIResponse(responseData: string): NMIResponse {
    const params = new URLSearchParams(responseData);
    const response: NMIResponse = {
      response: params.get('response') || '3',
      responsetext: params.get('responsetext') || 'Unknown error',
    };

    // Map optional fields
    const optionalFields = [
      'authcode', 'transactionid', 'avsresponse', 'cvvresponse',
      'orderid', 'type', 'response_code', 'customer_vault_id',
      'cc_number', 'cc_exp', 'error', 'error_code'
    ];

    optionalFields.forEach(field => {
      const value = params.get(field);
      if (value !== null) {
        (response as any)[field] = value;
      }
    });

    return response;
  }

  /**
   * Map NMI response to PaymentResult
   */
  private mapPaymentResponse(nmiResponse: NMIResponse): PaymentResult {
    const isApproved = nmiResponse.response === '1';
    
    return {
      success: isApproved,
      transactionId: nmiResponse.transactionid,
      authCode: nmiResponse.authcode,
      avsResponse: nmiResponse.avsresponse,
      cvvResponse: nmiResponse.cvvresponse,
      error: !isApproved ? nmiResponse.responsetext : undefined,
      errorCode: nmiResponse.response_code || nmiResponse.response,
      rawResponse: nmiResponse,
    };
  }

  /**
   * Map NMI response to VaultResult
   */
  private mapVaultResponse(nmiResponse: NMIResponse): VaultResult {
    const isSuccess = nmiResponse.response === '1';
    
    return {
      success: isSuccess,
      vaultId: nmiResponse.customer_vault_id,
      lastFour: nmiResponse.cc_number?.slice(-4),
      cardType: this.detectCardType(nmiResponse.cc_number || ''),
      expiryMonth: nmiResponse.cc_exp?.substring(0, 2),
      expiryYear: nmiResponse.cc_exp?.substring(2, 4),
      error: !isSuccess ? nmiResponse.responsetext : undefined,
      errorCode: nmiResponse.response_code || nmiResponse.response,
      rawResponse: nmiResponse,
    };
  }

  /**
   * Detect card type from card number
   */
  private detectCardType(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/\D/g, '');
    
    if (/^4/.test(cleanNumber)) return 'Visa';
    if (/^5[1-5]/.test(cleanNumber)) return 'MasterCard';
    if (/^3[47]/.test(cleanNumber)) return 'American Express';
    if (/^6(?:011|5)/.test(cleanNumber)) return 'Discover';
    
    return 'Unknown';
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(errorCode: string): boolean {
    const retryableCodes = [
      'TIMEOUT',
      'NETWORK_ERROR',
      'SERVICE_UNAVAILABLE',
      'TEMPORARY_ERROR'
    ];
    
    return retryableCodes.includes(errorCode);
  }
}