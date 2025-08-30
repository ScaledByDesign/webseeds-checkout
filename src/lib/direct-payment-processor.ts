import { UnifiedSessionManager } from './unified-session-manager';
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
  billingInfo?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
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
    const startTime = Date.now();
    console.log('🚀 DIRECT PAYMENT PROCESSOR STARTED');
    console.log('📋 INPUT DATA ANALYSIS:');
    console.log(`  🆔 Session ID: ${data.sessionId}`);
    console.log(`  🎫 Payment Token: ${data.paymentToken ? `${data.paymentToken.substring(0, 15)}...` : 'Missing'}`);
    console.log(`  💰 Amount: $${data.amount}`);
    console.log(`  👤 Customer: ${data.customerInfo?.firstName} ${data.customerInfo?.lastName}`);
    console.log(`  📧 Email: ${data.customerInfo?.email}`);
    console.log(`  🛒 Products: ${data.products?.length || 0} items`);
    console.log(`  🏠 Billing Info: ${data.billingInfo ? 'Provided' : 'Using shipping'}`);

    try {
      // Step 1: Validate and get session
      console.log('📋 STEP 1: Validating session...');
      const session = await UnifiedSessionManager.getInstance().getSession(data.sessionId);

      if (!session) {
        console.error('❌ SESSION VALIDATION FAILED:');
        console.error(`  🆔 Session ID: ${data.sessionId}`);
        console.error(`  📋 Reason: Session not found in database`);
        return {
          success: false,
          sessionId: data.sessionId,
          error: 'Session not found or expired'
        };
      }

      console.log('✅ SESSION FOUND:');
      console.log(`  🆔 ID: ${session.id}`);
      console.log(`  📧 Email: ${session.email}`);
      console.log(`  📊 Status: ${session.status}`);
      console.log(`  📅 Created: ${session.created_at}`);

      // Update session to processing
      console.log('📋 Updating session status to processing...');
      await UnifiedSessionManager.getInstance().updateSession(data.sessionId, { status: 'processing' });
      console.log('✅ Session status updated to processing');

      // Step 2: Create customer vault
      console.log('🏦 STEP 2: Creating customer vault...');
      const vaultData = {
        paymentToken: data.paymentToken,
        customerInfo: data.customerInfo,
        sessionId: data.sessionId,
        billingInfo: data.billingInfo,
      };

      console.log('📤 VAULT CREATION INPUT:');
      console.log(`  🎫 Payment Token: ${vaultData.paymentToken.substring(0, 15)}...`);
      console.log(`  👤 Customer: ${vaultData.customerInfo.firstName} ${vaultData.customerInfo.lastName}`);
      console.log(`  📧 Email: ${vaultData.customerInfo.email}`);
      console.log(`  🏠 Billing: ${vaultData.billingInfo ? 'Separate address' : 'Using customer info'}`);

      const vaultResult = await this.vaultService.createVault(vaultData);

      if (!vaultResult.success) {
        console.error('❌ VAULT CREATION FAILED:');
        console.error(`  📋 Error: ${vaultResult.error}`);
        console.error(`  🆔 Session: ${data.sessionId}`);
        console.error(`  ⏱️ Failed after: ${Date.now() - startTime}ms`);

        await UnifiedSessionManager.getInstance().updateSession(data.sessionId, { status: 'failed' });
        return {
          success: false,
          sessionId: data.sessionId,
          error: vaultResult.error || 'Failed to create customer vault'
        };
      }

      console.log('✅ VAULT CREATION SUCCESS:');
      console.log(`  🏦 Vault ID: ${vaultResult.vaultId}`);
      console.log(`  💳 Last Four: ${vaultResult.lastFour || 'N/A'}`);
      console.log(`  🎫 Card Type: ${vaultResult.cardType || 'N/A'}`);

      // Update session with vault ID
      console.log('📋 Updating session with vault ID...');
      await UnifiedSessionManager.getInstance().updateSession(data.sessionId, {
        vault_id: vaultResult.vaultId
      });
      console.log('✅ Session updated with vault ID');

      // Step 3: Process payment
      console.log('💳 STEP 3: Processing payment...');
      const paymentData = {
        vaultId: vaultResult.vaultId!,
        amount: data.amount,
        customerInfo: data.customerInfo,
        products: data.products,
        orderId: `order_${data.sessionId}`,
        billingInfo: data.billingInfo,
      };

      console.log('📤 PAYMENT PROCESSING INPUT:');
      console.log(`  🏦 Vault ID: ${paymentData.vaultId}`);
      console.log(`  💰 Amount: $${paymentData.amount}`);
      console.log(`  🆔 Order ID: ${paymentData.orderId}`);
      console.log(`  👤 Customer: ${paymentData.customerInfo.firstName} ${paymentData.customerInfo.lastName}`);
      console.log(`  🛒 Products: ${paymentData.products.length} items`);
      console.log(`  🏠 Billing: ${paymentData.billingInfo ? 'Separate address' : 'Using customer info'}`);

      const paymentResult = await this.nmiService.processPayment(paymentData);

      if (!paymentResult.success) {
        console.error('❌ PAYMENT PROCESSING FAILED:');
        console.error(`  📋 Error: ${paymentResult.error}`);
        console.error(`  🆔 Error Code: ${paymentResult.errorCode || 'N/A'}`);
        console.error(`  🏦 Vault ID: ${vaultResult.vaultId}`);
        console.error(`  💰 Amount: $${data.amount}`);
        console.error(`  ⏱️ Failed after: ${Date.now() - startTime}ms`);

        await UnifiedSessionManager.getInstance().updateSession(data.sessionId, { status: 'failed' });
        return {
          success: false,
          sessionId: data.sessionId,
          error: paymentResult.error || 'Payment processing failed'
        };
      }

      console.log('✅ PAYMENT PROCESSING SUCCESS:');
      console.log(`  💳 Transaction ID: ${paymentResult.transaction_id}`);
      console.log(`  🔐 Auth Code: ${paymentResult.authCode || 'N/A'}`);
      console.log(`  🏠 AVS Response: ${paymentResult.avsResponse || 'N/A'}`);
      console.log(`  🔒 CVV Response: ${paymentResult.cvvResponse || 'N/A'}`);
      console.log(`  ⏱️ Processing time: ${Date.now() - startTime}ms`);

      // Update session with transaction ID
      console.log('📋 Updating session to completed status...');
      await UnifiedSessionManager.getInstance().updateSession(data.sessionId, {
        transaction_id: paymentResult.transaction_id,
        status: 'completed',
        current_step: 'upsell-1'
      });
      console.log('✅ Session updated to completed');

      const nextStep = `/upsell/1?session=${data.sessionId}&transaction=${paymentResult.transaction_id}`;
      console.log(`➡️ Next step: ${nextStep}`);
      console.log('🎉 PAYMENT PROCESSING COMPLETED SUCCESSFULLY!');

      return {
        success: true,
        sessionId: data.sessionId,
        transaction_id: paymentResult.transaction_id,
        vaultId: vaultResult.vaultId,
        nextStep: nextStep
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('💥 PAYMENT PROCESSOR ERROR:');
      console.error(`  ❌ Error Type: ${error instanceof Error ? error.constructor.name : 'Unknown'}`);
      console.error(`  📋 Error Message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error(`  🆔 Session ID: ${data.sessionId}`);
      console.error(`  ⏱️ Failed after: ${processingTime}ms`);
      console.error(`  📍 Stack Trace:`, error instanceof Error ? error.stack : 'No stack trace');

      // Update session to failed
      try {
        console.log('📋 Updating session status to failed...');
        await UnifiedSessionManager.getInstance().updateSession(data.sessionId, { status: 'failed' });
        console.log('✅ Session status updated to failed');
      } catch (updateError) {
        console.error('❌ Failed to update session status:', updateError);
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`🔄 Returning error response: ${errorMessage}`);

      return {
        success: false,
        sessionId: data.sessionId,
        error: errorMessage
      };
    }
  }
}

// Export singleton instance
export const directPaymentProcessor = new DirectPaymentProcessor();
