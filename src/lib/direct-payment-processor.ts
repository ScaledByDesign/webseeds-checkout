import { databaseSessionManager } from './database-session-manager';
import { NMIService } from '../services/nmi/NMIService';
import { NMICustomerVaultService } from '../services/nmi/NMICustomerVaultService';

export interface PaymentProcessorData {
  sessionId: string;
  paymentToken: string;
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
  couponCode?: string;
}

export interface PaymentResult {
  success: boolean;
  sessionId: string;
  transactionId?: string;
  vaultId?: string;
  error?: string;
  nextStep?: string;
}

export class DirectPaymentProcessor {
  private nmiService: NMIService;
  private vaultService: NMICustomerVaultService;

  constructor() {
    this.nmiService = new NMIService();
    this.vaultService = new NMICustomerVaultService();
  }

  async processPayment(data: PaymentProcessorData): Promise<PaymentResult> {
    console.log('🚀 Starting direct payment processing for session:', data.sessionId);

    try {
      // Step 1: Validate and get session
      console.log('📋 Step 1: Validating session...');
      const session = await databaseSessionManager.getSession(data.sessionId);
      
      if (!session) {
        console.error('❌ Session not found:', data.sessionId);
        return {
          success: false,
          sessionId: data.sessionId,
          error: 'Session not found or expired'
        };
      }

      // Update session to processing
      await databaseSessionManager.updateSessionStatus(data.sessionId, 'processing');
      console.log('✅ Session validated and set to processing');

      // Step 2: Create customer vault
      console.log('🏦 Step 2: Creating customer vault...');
      const vaultResult = await this.vaultService.createCustomerVault({
        paymentToken: data.paymentToken,
        customerInfo: data.customerInfo,
      });

      if (!vaultResult.success) {
        console.error('❌ Vault creation failed:', vaultResult.error);
        await databaseSessionManager.updateSessionStatus(data.sessionId, 'failed');
        return {
          success: false,
          sessionId: data.sessionId,
          error: vaultResult.error || 'Failed to create customer vault'
        };
      }

      // Update session with vault ID
      await databaseSessionManager.updateSession(data.sessionId, { 
        vault_id: vaultResult.vaultId 
      });
      console.log('✅ Customer vault created:', vaultResult.vaultId);

      // Step 3: Process payment
      console.log('💳 Step 3: Processing payment...');
      const paymentResult = await this.nmiService.processPayment({
        vaultId: vaultResult.vaultId!,
        amount: data.amount,
        customerInfo: data.customerInfo,
        products: data.products,
        orderId: `order_${data.sessionId}`,
      });

      if (!paymentResult.success) {
        console.error('❌ Payment processing failed:', paymentResult.error);
        await databaseSessionManager.updateSessionStatus(data.sessionId, 'failed');
        return {
          success: false,
          sessionId: data.sessionId,
          error: paymentResult.error || 'Payment processing failed'
        };
      }

      // Update session with transaction ID
      await databaseSessionManager.updateSession(data.sessionId, { 
        transaction_id: paymentResult.transactionId,
        status: 'completed',
        current_step: 'upsell-1'
      });
      console.log('✅ Payment processed successfully:', paymentResult.transactionId);

      console.log('🎉 Payment processing completed successfully!');
      return {
        success: true,
        sessionId: data.sessionId,
        transactionId: paymentResult.transactionId,
        vaultId: vaultResult.vaultId,
        nextStep: '/checkout/upsell'
      };

    } catch (error) {
      console.error('❌ Payment processing error:', error);
      
      // Update session to failed
      try {
        await databaseSessionManager.updateSessionStatus(data.sessionId, 'failed');
      } catch (updateError) {
        console.error('❌ Failed to update session status:', updateError);
      }

      return {
        success: false,
        sessionId: data.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

// Export singleton instance
export const directPaymentProcessor = new DirectPaymentProcessor();
