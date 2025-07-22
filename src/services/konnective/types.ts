// Konnective Service Types

export interface KonnectiveConfig {
  loginId: string;
  password: string;
  endpoint: string;
  campaignId: string;
  mode: 'sandbox' | 'production';
}

export interface KonnectiveCustomer {
  customerId?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface KonnectiveProduct {
  productId: string;
  quantity: number;
  price: number;
}

export interface KonnectiveOrder {
  orderId?: string;
  customerId?: string;
  campaignId: string;
  products: KonnectiveProduct[];
  totalAmount: number;
  transactionId: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  billingInfo?: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  shippingInfo?: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  orderNotes?: string;
}

export interface CustomerResult {
  success: boolean;
  customerId?: string;
  error?: string;
  errorCode?: string;
  rawResponse?: any;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
  errorCode?: string;
  rawResponse?: any;
}

export interface KonnectiveResponse {
  result: 'SUCCESS' | 'ERROR';
  message: string;
  orderId?: string;
  customerId?: string;
  errors?: string[];
  
  // Additional fields that may be present
  orderTotal?: string;
  orderNumber?: string;
  transactionId?: string;
}

export interface ProductMapping {
  webseedProductId: string;
  konnectiveProductId: string;
  name: string;
  price: number;
}

export interface OrderTransformData {
  sessionId: string;
  transactionId: string;
  amount: number;
  customerInfo: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  products: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  billingInfo?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  shippingInfo?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}