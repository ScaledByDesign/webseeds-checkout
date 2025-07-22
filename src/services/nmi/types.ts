// NMI Service Types

export interface PaymentParams {
  amount: number;
  orderId?: string;
  paymentToken?: string;
  vaultId?: string;
  customerInfo?: {
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
  billingInfo?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  authCode?: string;
  avsResponse?: string;
  cvvResponse?: string;
  error?: string;
  errorCode?: string;
  rawResponse?: any;
}

export interface VaultParams {
  paymentToken: string;
  sessionId: string;
  customerInfo?: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  billingInfo?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };
}

export interface VaultResult {
  success: boolean;
  vaultId?: string;
  lastFour?: string;
  cardType?: string;
  expiryMonth?: string;
  expiryYear?: string;
  error?: string;
  errorCode?: string;
  rawResponse?: any;
}

export interface TokenizationParams {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

export interface TokenizationResult {
  success: boolean;
  token?: string;
  error?: string;
}

export interface NMIResponse {
  response: string; // '1' for approved, '2' for declined, '3' for error
  responsetext: string;
  authcode?: string;
  transactionid?: string;
  avsresponse?: string;
  cvvresponse?: string;
  orderid?: string;
  type?: string;
  response_code?: string;
  
  // Vault-specific fields
  customer_vault_id?: string;
  cc_number?: string;
  cc_exp?: string;
  
  // Error fields
  error?: string;
  error_code?: string;
}

export interface NMIConfig {
  securityKey: string;
  endpoint: string;
  collectJsUrl: string;
  publicKey?: string;
  mode: 'sandbox' | 'production';
}