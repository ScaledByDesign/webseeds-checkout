import axios, { AxiosResponse } from 'axios';
import { captureIntegrationError } from '@/src/lib/sentry';
import {
  KonnectiveConfig,
  KonnectiveCustomer,
  KonnectiveOrder,
  CustomerResult,
  OrderResult,
  KonnectiveResponse,
  OrderTransformData,
} from './types';

export class KonnectiveService {
  private static instance: KonnectiveService;
  private config: KonnectiveConfig;

  private constructor() {
    this.config = {
      loginId: process.env.KONNECTIVE_LOGIN_ID || '',
      password: process.env.KONNECTIVE_PASSWORD || '',
      endpoint: process.env.KONNECTIVE_ENDPOINT || 'https://api.konnektive.com',
      campaignId: process.env.KONNECTIVE_CAMPAIGN_ID || '',
      mode: (process.env.KONNECTIVE_MODE === 'production' ? 'production' : 'sandbox') as 'production' | 'sandbox',
    };

    if (!this.config.loginId || !this.config.password || !this.config.campaignId) {
      throw new Error('Konnective credentials (loginId, password, campaignId) are required');
    }
  }

  public static getInstance(): KonnectiveService {
    if (!KonnectiveService.instance) {
      KonnectiveService.instance = new KonnectiveService();
    }
    return KonnectiveService.instance;
  }

  /**
   * Create or update customer in Konnective
   */
  async upsertCustomer(customer: KonnectiveCustomer): Promise<CustomerResult> {
    try {
      const requestData = this.buildCustomerRequest(customer);
      
      const response = await this.makeKonnectiveRequest('/customer/import/', requestData);
      
      return this.mapCustomerResponse(response.data);

    } catch (error) {
      captureIntegrationError(
        error as Error,
        'konnective',
        'customer_upsert',
        {
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
        }
      );

      return {
        success: false,
        error: 'Failed to create/update customer in CRM',
        errorCode: 'CUSTOMER_SYNC_ERROR',
      };
    }
  }

  /**
   * Create order in Konnective
   */
  async createOrder(order: KonnectiveOrder): Promise<OrderResult> {
    try {
      const requestData = this.buildOrderRequest(order);
      
      const response = await this.makeKonnectiveRequest('/order/import/', requestData);
      
      return this.mapOrderResponse(response.data);

    } catch (error) {
      captureIntegrationError(
        error as Error,
        'konnective',
        'order_create',
        {
          transactionId: order.transactionId,
          totalAmount: order.totalAmount,
          customerId: order.customerId,
        }
      );

      return {
        success: false,
        error: 'Failed to create order in CRM',
        errorCode: 'ORDER_SYNC_ERROR',
      };
    }
  }

  /**
   * Transform checkout data to Konnective format
   */
  transformCheckoutData(data: OrderTransformData): {
    customer: KonnectiveCustomer;
    order: KonnectiveOrder;
  } {
    const customer: KonnectiveCustomer = {
      email: data.customerInfo.email,
      firstName: data.customerInfo.firstName,
      lastName: data.customerInfo.lastName,
      phone: data.customerInfo.phone,
      address: data.customerInfo.address || data.billingInfo?.address,
      city: data.customerInfo.city || data.billingInfo?.city,
      state: data.customerInfo.state || data.billingInfo?.state,
      zipCode: data.customerInfo.zipCode || data.billingInfo?.zipCode,
      country: data.customerInfo.country || data.billingInfo?.country || 'US',
    };

    const products = data.products.map(product => ({
      productId: this.mapProductId(product.id),
      quantity: product.quantity,
      price: product.price,
    }));

    const order: KonnectiveOrder = {
      campaignId: this.config.campaignId,
      products,
      totalAmount: data.amount,
      transactionId: data.transactionId,
      paymentStatus: 'completed',
    };

    // Add billing info if available
    if (data.billingInfo || data.customerInfo) {
      order.billingInfo = {
        firstName: data.customerInfo.firstName,
        lastName: data.customerInfo.lastName,
        address: data.billingInfo?.address || data.customerInfo.address || '',
        city: data.billingInfo?.city || data.customerInfo.city || '',
        state: data.billingInfo?.state || data.customerInfo.state || '',
        zipCode: data.billingInfo?.zipCode || data.customerInfo.zipCode || '',
        country: data.billingInfo?.country || data.customerInfo.country || 'US',
      };
    }

    // Add shipping info if different from billing
    if (data.shippingInfo) {
      order.shippingInfo = {
        firstName: data.shippingInfo.firstName || data.customerInfo.firstName,
        lastName: data.shippingInfo.lastName || data.customerInfo.lastName,
        address: data.shippingInfo.address,
        city: data.shippingInfo.city,
        state: data.shippingInfo.state,
        zipCode: data.shippingInfo.zipCode,
        country: data.shippingInfo.country || 'US',
      };
    }

    return { customer, order };
  }

  /**
   * Update order status in Konnective
   */
  async updateOrderStatus(
    orderId: string,
    status: 'pending' | 'completed' | 'failed' | 'refunded'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const requestData = {
        loginId: this.config.loginId,
        password: this.config.password,
        orderId,
        orderStatus: status,
      };

      const response = await this.makeKonnectiveRequest('/order/update/', requestData);
      
      return {
        success: response.data.result === 'SUCCESS',
        error: response.data.result !== 'SUCCESS' ? response.data.message : undefined,
      };

    } catch (error) {
      captureIntegrationError(
        error as Error,
        'konnective',
        'order_update',
        { orderId, status }
      );

      return {
        success: false,
        error: 'Failed to update order status',
      };
    }
  }

  /**
   * Validate Konnective configuration
   */
  validateConfig(): boolean {
    return !!(
      this.config.loginId &&
      this.config.password &&
      this.config.endpoint &&
      this.config.campaignId
    );
  }

  /**
   * Test Konnective connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const testData = {
        loginId: this.config.loginId,
        password: this.config.password,
      };

      const response = await this.makeKonnectiveRequest('/customer/query/', testData);
      
      return {
        success: response.data.result === 'SUCCESS' || response.status === 200,
      };

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message || 'Connection test failed',
      };
    }
  }

  /**
   * Make request to Konnective API
   */
  private async makeKonnectiveRequest(
    endpoint: string,
    data: Record<string, any>
  ): Promise<AxiosResponse<KonnectiveResponse>> {
    return axios.post(
      `${this.config.endpoint}${endpoint}`,
      new URLSearchParams(data).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000, // 30 second timeout
      }
    );
  }

  /**
   * Build customer request data
   */
  private buildCustomerRequest(customer: KonnectiveCustomer): Record<string, string> {
    const data: Record<string, string> = {
      loginId: this.config.loginId,
      password: this.config.password,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
    };

    // Add optional fields
    if (customer.phone) data.phoneNumber = customer.phone;
    if (customer.address) data.address1 = customer.address;
    if (customer.city) data.city = customer.city;
    if (customer.state) data.state = customer.state;
    if (customer.zipCode) data.postalCode = customer.zipCode;
    if (customer.country) data.country = customer.country;

    return data;
  }

  /**
   * Build order request data
   */
  private buildOrderRequest(order: KonnectiveOrder): Record<string, string> {
    const data: Record<string, string> = {
      loginId: this.config.loginId,
      password: this.config.password,
      campaignId: order.campaignId,
      orderId: order.transactionId, // Use transaction ID as order reference
    };

    if (order.customerId) {
      data.customerId = order.customerId;
    }

    // Add product information
    order.products.forEach((product, index) => {
      const productIndex = index + 1;
      data[`product${productIndex}_id`] = product.productId;
      data[`product${productIndex}_qty`] = product.quantity.toString();
      data[`product${productIndex}_price`] = product.price.toFixed(2);
    });

    // Add billing information
    if (order.billingInfo) {
      data.billShipSame = '1';
      data.firstName = order.billingInfo.firstName;
      data.lastName = order.billingInfo.lastName;
      data.address1 = order.billingInfo.address;
      data.city = order.billingInfo.city;
      data.state = order.billingInfo.state;
      data.postalCode = order.billingInfo.zipCode;
      data.country = order.billingInfo.country;
    }

    // Add shipping information if different
    if (order.shippingInfo) {
      data.billShipSame = '0';
      data.shipFirstName = order.shippingInfo.firstName;
      data.shipLastName = order.shippingInfo.lastName;
      data.shipAddress1 = order.shippingInfo.address;
      data.shipCity = order.shippingInfo.city;
      data.shipState = order.shippingInfo.state;
      data.shipPostalCode = order.shippingInfo.zipCode;
      data.shipCountry = order.shippingInfo.country;
    }

    return data;
  }

  /**
   * Map customer response from Konnective
   */
  private mapCustomerResponse(response: KonnectiveResponse): CustomerResult {
    return {
      success: response.result === 'SUCCESS',
      customerId: response.customerId,
      error: response.result !== 'SUCCESS' ? response.message : undefined,
      errorCode: response.result !== 'SUCCESS' ? response.result : undefined,
      rawResponse: response,
    };
  }

  /**
   * Map order response from Konnective
   */
  private mapOrderResponse(response: KonnectiveResponse): OrderResult {
    return {
      success: response.result === 'SUCCESS',
      orderId: response.orderId,
      orderNumber: response.orderNumber,
      error: response.result !== 'SUCCESS' ? response.message : undefined,
      errorCode: response.result !== 'SUCCESS' ? response.result : undefined,
      rawResponse: response,
    };
  }

  /**
   * Map WebSeed product ID to Konnective product ID
   * This would typically come from a configuration file or database
   */
  private mapProductId(webseedProductId: string): string {
    // Default mapping - in production this should come from configuration
    const productMapping: Record<string, string> = {
      'fitspresso': '1',
      'upsell-1': '2',
      'upsell-2': '3',
      // Add more mappings as needed
    };

    return productMapping[webseedProductId] || webseedProductId;
  }

  /**
   * Get configuration for debugging
   */
  getConfig(): Omit<KonnectiveConfig, 'password'> {
    return {
      loginId: this.config.loginId,
      endpoint: this.config.endpoint,
      campaignId: this.config.campaignId,
      mode: this.config.mode,
      password: '[HIDDEN]',
    };
  }
}