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

      // Enhanced logging for NMI request data with fallback analysis
      console.log('📤 NMI PAYMENT REQUEST DATA:');
      console.log('  💰 Amount:', requestData.amount);
      console.log('  🆔 Order ID:', requestData.orderid || 'N/A');
      console.log('  👤 Customer:', requestData.first_name, requestData.last_name);
      console.log('  📧 Email:', requestData.email);
      console.log('  📞 Phone:', requestData.phone || 'N/A');

      // Analyze address fallback logic
      const hasShipping = params.customerInfo?.address?.trim();
      const hasBilling = params.billingInfo?.address?.trim();
      const shippingSource = hasShipping ? 'customerInfo' : (hasBilling ? 'billingInfo (fallback)' : 'none');
      const billingSource = hasBilling ? 'billingInfo' : (hasShipping ? 'customerInfo (fallback)' : 'none');

      console.log('  🔄 Address Sources:');
      console.log(`    📦 Shipping from: ${shippingSource}`);
      console.log(`    💳 Billing from: ${billingSource}`);

      console.log('  🏠 BILLING Address:', requestData.address1 || 'N/A');
      console.log('  🏙️ BILLING City:', requestData.city || 'N/A');
      console.log('  🗺️ BILLING State:', requestData.state || 'N/A');
      console.log('  📮 BILLING ZIP:', requestData.zip || 'N/A');
      console.log('  🌍 BILLING Country:', requestData.country || 'N/A');
      console.log('  🚚 SHIPPING Address:', requestData.shipping_address1 || 'N/A');
      console.log('  🚚 SHIPPING City:', requestData.shipping_city || 'N/A');
      console.log('  🚚 SHIPPING State:', requestData.shipping_state || 'N/A');
      console.log('  🚚 SHIPPING ZIP:', requestData.shipping_zip || 'N/A');
      console.log('  🚚 SHIPPING Country:', requestData.shipping_country || 'N/A');

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

      // Enhanced logging for NMI vault request data with fallback analysis
      console.log('📤 NMI VAULT REQUEST DATA:');
      console.log('  👤 Customer:', requestData.first_name, requestData.last_name);
      console.log('  📧 Email:', requestData.email);
      console.log('  📞 Phone:', requestData.phone || 'N/A');

      // Analyze address fallback logic for vault
      const hasShipping = params.customerInfo?.address?.trim();
      const hasBilling = params.billingInfo?.address?.trim();
      const shippingSource = hasShipping ? 'customerInfo' : (hasBilling ? 'billingInfo (fallback)' : 'none');
      const billingSource = hasBilling ? 'billingInfo' : (hasShipping ? 'customerInfo (fallback)' : 'none');

      console.log('  🔄 Address Sources:');
      console.log(`    📦 Shipping from: ${shippingSource}`);
      console.log(`    💳 Billing from: ${billingSource}`);

      console.log('  🏠 BILLING Address:', requestData.address1 || 'N/A');
      console.log('  🏙️ BILLING City:', requestData.city || 'N/A');
      console.log('  🗺️ BILLING State:', requestData.state || 'N/A');
      console.log('  📮 BILLING ZIP:', requestData.zip || 'N/A');
      console.log('  🌍 BILLING Country:', requestData.country || 'N/A');
      console.log('  🚚 SHIPPING Address:', requestData.shipping_address1 || 'N/A');
      console.log('  🚚 SHIPPING City:', requestData.shipping_city || 'N/A');
      console.log('  🚚 SHIPPING State:', requestData.shipping_state || 'N/A');
      console.log('  🚚 SHIPPING ZIP:', requestData.shipping_zip || 'N/A');
      console.log('  🚚 SHIPPING Country:', requestData.shipping_country || 'N/A');

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

    // Determine shipping and billing addresses with bidirectional fallback
    const hasShippingAddress = params.customerInfo?.address?.trim();
    const hasBillingAddress = params.billingInfo?.address?.trim();

    // Add shipping information - use customerInfo if available, otherwise fallback to billingInfo
    if (hasShippingAddress && params.customerInfo) {
      // Primary: Use customerInfo for shipping
      data.shipping_firstname = params.customerInfo.firstName;
      data.shipping_lastname = params.customerInfo.lastName;
      data.shipping_address1 = params.customerInfo.address;
      data.shipping_city = params.customerInfo.city || '';
      data.shipping_state = params.customerInfo.state || '';
      data.shipping_zip = params.customerInfo.zipCode || '';
      data.shipping_country = params.customerInfo.country || 'US';
      if (params.customerInfo.phone) {
        data.shipping_phone = params.customerInfo.phone;
      }
    } else if (hasBillingAddress && params.billingInfo && params.customerInfo) {
      // Fallback: Use billingInfo for shipping when no shipping address
      data.shipping_firstname = params.customerInfo.firstName;
      data.shipping_lastname = params.customerInfo.lastName;
      data.shipping_address1 = params.billingInfo.address;
      data.shipping_city = params.billingInfo.city;
      data.shipping_state = params.billingInfo.state;
      data.shipping_zip = params.billingInfo.zipCode;
      data.shipping_country = params.billingInfo.country || 'US';
      if (params.customerInfo.phone) {
        data.shipping_phone = params.customerInfo.phone;
      }
    }

    // Add billing information - use billingInfo if available, otherwise fallback to customerInfo
    if (hasBillingAddress && params.billingInfo) {
      // Primary: Use billingInfo for billing
      data.address1 = params.billingInfo.address;
      data.city = params.billingInfo.city;
      data.state = params.billingInfo.state;
      data.zip = params.billingInfo.zipCode;
      data.country = params.billingInfo.country || 'US';
    } else if (hasShippingAddress && params.customerInfo) {
      // Fallback: Use customerInfo for billing when no billing address
      data.address1 = params.customerInfo.address;
      data.city = params.customerInfo.city || '';
      data.state = params.customerInfo.state || '';
      data.zip = params.customerInfo.zipCode || '';
      data.country = params.customerInfo.country || 'US';
    }

    // Add Level 3 data for enhanced processing
    this.addLevel3Data(data, params);

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

    // Determine shipping and billing addresses with bidirectional fallback
    const hasShippingAddress = params.customerInfo?.address?.trim();
    const hasBillingAddress = params.billingInfo?.address?.trim();

    // Add shipping information - use customerInfo if available, otherwise fallback to billingInfo
    if (hasShippingAddress && params.customerInfo) {
      // Primary: Use customerInfo for shipping
      data.shipping_firstname = params.customerInfo.firstName;
      data.shipping_lastname = params.customerInfo.lastName;
      data.shipping_address1 = params.customerInfo.address;
      data.shipping_city = params.customerInfo.city || '';
      data.shipping_state = params.customerInfo.state || '';
      data.shipping_zip = params.customerInfo.zipCode || '';
      data.shipping_country = params.customerInfo.country || 'US';
      if (params.customerInfo.phone) {
        data.shipping_phone = params.customerInfo.phone;
      }
    } else if (hasBillingAddress && params.billingInfo && params.customerInfo) {
      // Fallback: Use billingInfo for shipping when no shipping address
      data.shipping_firstname = params.customerInfo.firstName;
      data.shipping_lastname = params.customerInfo.lastName;
      data.shipping_address1 = params.billingInfo.address;
      data.shipping_city = params.billingInfo.city;
      data.shipping_state = params.billingInfo.state;
      data.shipping_zip = params.billingInfo.zipCode;
      data.shipping_country = params.billingInfo.country || 'US';
      if (params.customerInfo.phone) {
        data.shipping_phone = params.customerInfo.phone;
      }
    }

    // Add billing information - use billingInfo if available, otherwise fallback to customerInfo
    if (hasBillingAddress && params.billingInfo) {
      // Primary: Use billingInfo for billing
      data.address1 = params.billingInfo.address;
      data.city = params.billingInfo.city;
      data.state = params.billingInfo.state;
      data.zip = params.billingInfo.zipCode;
      data.country = params.billingInfo.country || 'US';
    } else if (hasShippingAddress && params.customerInfo) {
      // Fallback: Use customerInfo for billing when no billing address
      data.address1 = params.customerInfo.address;
      data.city = params.customerInfo.city || '';
      data.state = params.customerInfo.state || '';
      data.zip = params.customerInfo.zipCode || '';
      data.country = params.customerInfo.country || 'US';
    }

    return data;
  }

  /**
   * Add Level 3 data for enhanced processing rates
   */
  private addLevel3Data(data: Record<string, string>, params: PaymentParams): void {
    try {
      // Calculate tax and shipping
      const state = params.customerInfo?.state?.toUpperCase() || 'CA';
      const TAX_RATES: Record<string, number> = {
        'CA': 0.0725,  // California: 7.25%
        'TX': 0.0625,  // Texas: 6.25%
        'NY': 0.08,    // New York: 8%
        'FL': 0.06,    // Florida: 6%
        'WA': 0.065,   // Washington: 6.5%
        'DEFAULT': 0.0 // No tax for other states
      };

      const taxRate = TAX_RATES[state] || TAX_RATES.DEFAULT;
      const subtotal = params.amount;
      const tax = parseFloat((subtotal * taxRate).toFixed(2));
      const shipping = 0.00; // Free shipping

      // Add Level 3 transaction data
      data.tax = tax.toFixed(2);
      data.shipping = shipping.toFixed(2);
      data.order_description = params.products?.map(p => `${p.name} (${p.quantity})`).join(', ') || 'Product Order';
      data.ponumber = `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Add merchant defined fields
      data.merchant_defined_field_1 = 'webseed-checkout';
      data.merchant_defined_field_2 = 'initial-order';
      data.merchant_defined_field_3 = params.products?.[0]?.id || 'product';

      // Add line item data for Level 3 (first product)
      if (params.products && params.products.length > 0) {
        const product = params.products[0];
        const itemTax = parseFloat((product.price * product.quantity * taxRate).toFixed(2));

        data.item_product_code_1 = product.id;
        data.item_description_1 = product.name;
        data.item_quantity_1 = product.quantity.toString();
        data.item_unit_cost_1 = product.price.toFixed(2);
        data.item_unit_of_measure_1 = 'EA';
        data.item_total_amount_1 = (product.price * product.quantity).toFixed(2);
        data.item_tax_amount_1 = itemTax.toFixed(2);
        data.item_tax_rate_1 = taxRate.toFixed(4);
        data.item_commodity_code_1 = '50202504'; // Dietary supplements
        data.item_discount_amount_1 = '0.00';
      }

      console.log('📊 LEVEL 3 DATA ADDED:');
      console.log(`  💰 Subtotal: $${subtotal.toFixed(2)}`);
      console.log(`  🏛️ Tax: $${tax.toFixed(2)} (${(taxRate * 100).toFixed(2)}% for ${state})`);
      console.log(`  🚚 Shipping: $${shipping.toFixed(2)}`);
      console.log(`  📦 Products: ${params.products?.length || 0} items`);
      console.log(`  🆔 PO Number: ${data.ponumber}`);

    } catch (error) {
      console.warn('⚠️ Failed to add Level 3 data:', error);
      // Don't fail the transaction if Level 3 data fails
    }
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