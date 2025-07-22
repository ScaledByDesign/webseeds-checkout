import { inngest } from '@/lib/inngest';
import { NMIService } from '@/services/nmi/NMIService';
import { NMICustomerVaultService } from '@/services/nmi/NMICustomerVaultService';
import { funnelSessionManager } from '@/lib/funnel-session';
import { capturePaymentError } from '@/lib/sentry';
import * as Sentry from '@sentry/nextjs';

export const paymentProcessor = inngest.createFunction(
  {
    id: 'webseed-payment-processor',
    name: 'Process WebSeed Payments',
    concurrency: { limit: 50 },
    retries: 3,
  },
  { event: 'webseed/payment.attempted' },
  async ({ event, step }) => {
    const { sessionId, paymentToken, amount, customerInfo, products, couponCode } = event.data;

    // Create Sentry transaction for the entire workflow
    const transaction = Sentry.startTransaction({
      name: 'checkout.payment.process',
      op: 'payment',
      data: {
        sessionId,
        amount,
        productCount: products.length,
      },
    });

    try {
      // Step 1: Validate session and update status
      const sessionValidation = await step.run('validate-session', async () => {
        const session = funnelSessionManager.getSession(sessionId);
        
        if (!session) {
          throw new Error('Session not found or expired');
        }

        if (session.status !== 'processing') {
          funnelSessionManager.setSessionStatus(sessionId, 'processing');
        }

        return {
          sessionValid: true,
          sessionData: session,
        };
      });

      if (!sessionValidation.sessionValid) {
        throw new Error('Session validation failed');
      }

      // Step 2: Create Customer Vault
      const vaultResult = await step.run('create-customer-vault', async () => {
        const span = transaction.startChild({
          op: 'payment.vault.create',
          description: 'Create NMI Customer Vault',
        });

        try {
          const vaultService = NMICustomerVaultService.getInstance();
          
          const vaultParams = {
            paymentToken,
            sessionId,
            customerInfo: {
              email: customerInfo.email,
              firstName: customerInfo.firstName,
              lastName: customerInfo.lastName,
              phone: customerInfo.phone,
            },
            billingInfo: {
              address: customerInfo.address,
              city: customerInfo.city,
              state: customerInfo.state,
              zipCode: customerInfo.zipCode,
              country: customerInfo.country || 'US',
            },
          };

          const result = await vaultService.createVault(vaultParams);
          
          if (result.success) {
            // Update session with vault ID
            funnelSessionManager.setVaultId(sessionId, result.vaultId!);
            span.setStatus('ok');
          } else {
            span.setStatus('internal_error');
          }

          return result;

        } catch (error) {
          span.setStatus('internal_error');
          capturePaymentError(error as Error, {
            sessionId,
            step: 'vault_creation',
            amount,
          });
          throw error;
        } finally {
          span.finish();
        }
      });

      if (!vaultResult.success) {
        await step.run('handle-vault-failure', async () => {
          funnelSessionManager.setSessionStatus(sessionId, 'failed');
          
          Sentry.captureMessage('Customer vault creation failed', {
            level: 'error',
            tags: { type: 'payment_failure', step: 'vault' },
            extra: {
              sessionId,
              error: vaultResult.error,
              errorCode: vaultResult.errorCode,
            },
          });

          await inngest.send({
            name: 'webseed/payment.failed',
            data: {
              sessionId,
              error: vaultResult.error || 'Vault creation failed',
              errorCode: vaultResult.errorCode || 'VAULT_ERROR',
              amount,
              attempt: 1,
            },
          });
        });

        transaction.setStatus('failed_precondition');
        return {
          success: false,
          error: vaultResult.error,
          step: 'vault_creation',
        };
      }

      // Step 3: Process Initial Payment
      const paymentResult = await step.run('process-initial-payment', async () => {
        const span = transaction.startChild({
          op: 'payment.process',
          description: 'Process NMI Payment',
        });

        try {
          const nmiService = NMIService.getInstance();
          const orderId = `ORDER-${sessionId}-${Date.now()}`;

          const paymentParams = {
            vaultId: vaultResult.vaultId!,
            amount,
            orderId,
            customerInfo: {
              email: customerInfo.email,
              firstName: customerInfo.firstName,
              lastName: customerInfo.lastName,
              phone: customerInfo.phone,
            },
            billingInfo: {
              address: customerInfo.address,
              city: customerInfo.city,
              state: customerInfo.state,
              zipCode: customerInfo.zipCode,
              country: customerInfo.country || 'US',
            },
          };

          const result = await nmiService.processPayment(paymentParams);

          if (result.success) {
            // Update session with transaction ID
            funnelSessionManager.setTransactionId(sessionId, result.transactionId!);
            span.setStatus('ok');
            Sentry.setMeasurement('payment.amount', amount, 'usd');
          } else {
            span.setStatus('invalid_argument');
          }

          return {
            ...result,
            orderId,
          };

        } catch (error) {
          span.setStatus('internal_error');
          capturePaymentError(error as Error, {
            sessionId,
            step: 'payment_processing',
            amount,
            paymentMethod: 'nmi',
          });
          throw error;
        } finally {
          span.finish();
        }
      });

      if (!paymentResult.success) {
        await step.run('handle-payment-failure', async () => {
          funnelSessionManager.setSessionStatus(sessionId, 'failed');

          Sentry.captureMessage('Payment processing failed', {
            level: 'error',
            tags: {
              type: 'payment_failure',
              step: 'process',
              error_code: paymentResult.errorCode || 'unknown',
            },
            extra: {
              sessionId,
              transactionId: paymentResult.transactionId,
              error: paymentResult.error,
              errorCode: paymentResult.errorCode,
              amount,
            },
          });

          await inngest.send({
            name: 'webseed/payment.failed',
            data: {
              sessionId,
              error: paymentResult.error || 'Payment processing failed',
              errorCode: paymentResult.errorCode || 'PAYMENT_ERROR',
              amount,
              attempt: 1,
            },
          });
        });

        transaction.setStatus('invalid_argument');
        return {
          success: false,
          error: paymentResult.error,
          errorCode: paymentResult.errorCode,
          step: 'payment_processing',
        };
      }

      // Step 4: Update session and trigger success events
      const successResult = await step.run('handle-payment-success', async () => {
        // Update session status
        funnelSessionManager.setSessionStatus(sessionId, 'completed');
        funnelSessionManager.setCurrentStep(sessionId, 'upsell-1');

        // Send payment success event for Konnective sync
        await inngest.send({
          name: 'webseed/payment.succeeded',
          data: {
            sessionId,
            transactionId: paymentResult.transactionId!,
            vaultId: vaultResult.vaultId!,
            amount,
            customerInfo,
            products,
            orderData: {
              orderId: paymentResult.orderId,
              couponCode,
            },
          },
        });

        // Track successful conversion
        Sentry.captureMessage('Payment successful', {
          level: 'info',
          tags: { type: 'payment_success' },
          extra: {
            sessionId,
            transactionId: paymentResult.transactionId,
            vaultId: vaultResult.vaultId,
            amount,
            productCount: products.length,
          },
        });

        return {
          success: true,
          transactionId: paymentResult.transactionId,
          vaultId: vaultResult.vaultId,
          orderId: paymentResult.orderId,
        };
      });

      transaction.setStatus('ok');
      return successResult;

    } catch (error) {
      // Handle any unexpected errors
      await step.run('handle-unexpected-error', async () => {
        funnelSessionManager.setSessionStatus(sessionId, 'failed');

        capturePaymentError(error as Error, {
          sessionId,
          step: 'payment_workflow',
          amount,
        });

        await inngest.send({
          name: 'webseed/payment.failed',
          data: {
            sessionId,
            error: 'Unexpected error during payment processing',
            errorCode: 'WORKFLOW_ERROR',
            amount,
            attempt: 1,
          },
        });
      });

      transaction.setStatus('internal_error');
      throw error;
    } finally {
      transaction.finish();
    }
  }
);

// Separate function for handling upsell payments
export const upsellProcessor = inngest.createFunction(
  {
    id: 'webseed-upsell-processor',
    name: 'Process WebSeed Upsell Payments',
    concurrency: { limit: 30 },
    retries: 2,
  },
  { event: 'webseed/upsell.accepted' },
  async ({ event, step }) => {
    const { sessionId, vaultId, productId, amount, upsellStep } = event.data;

    const transaction = Sentry.startTransaction({
      name: 'checkout.upsell.process',
      op: 'upsell',
      data: {
        sessionId,
        productId,
        amount,
        upsellStep,
      },
    });

    try {
      // Step 1: Validate session and vault
      const validation = await step.run('validate-upsell', async () => {
        const session = funnelSessionManager.getSession(sessionId);
        
        if (!session || !session.vaultId) {
          throw new Error('Invalid session or missing vault');
        }

        if (session.vaultId !== vaultId) {
          throw new Error('Vault ID mismatch');
        }

        return { valid: true, session };
      });

      // Step 2: Process upsell payment
      const upsellResult = await step.run('process-upsell-payment', async () => {
        const vaultService = NMICustomerVaultService.getInstance();
        const orderId = `UPSELL-${sessionId}-${upsellStep}-${Date.now()}`;

        const result = await vaultService.processOneClickPayment(
          vaultId,
          amount,
          orderId,
          sessionId
        );

        return { ...result, orderId };
      });

      if (!upsellResult.success) {
        await step.run('handle-upsell-failure', async () => {
          funnelSessionManager.declineUpsell(sessionId, productId);

          await inngest.send({
            name: 'webseed/upsell.payment.failed',
            data: {
              sessionId,
              productId,
              amount,
              upsellStep,
              error: upsellResult.error || 'Upsell payment failed',
            },
          });
        });

        return {
          success: false,
          error: upsellResult.error,
          step: 'upsell_payment',
        };
      }

      // Step 3: Update session and move to next step
      await step.run('complete-upsell', async () => {
        funnelSessionManager.acceptUpsell(sessionId, productId);

        // Determine next step
        const nextStep = upsellStep === 1 ? 'upsell-2' : 'success';
        funnelSessionManager.setCurrentStep(sessionId, nextStep as any);

        // Send success event for CRM sync
        await inngest.send({
          name: 'webseed/upsell.completed',
          data: {
            sessionId,
            transactionId: upsellResult.transactionId!,
            productId,
            amount,
            upsellStep,
            orderId: upsellResult.orderId,
          },
        });

        Sentry.captureMessage('Upsell completed successfully', {
          level: 'info',
          tags: { type: 'upsell_success' },
          extra: {
            sessionId,
            productId,
            amount,
            upsellStep,
            transactionId: upsellResult.transactionId,
          },
        });
      });

      transaction.setStatus('ok');
      return {
        success: true,
        transactionId: upsellResult.transactionId,
        orderId: upsellResult.orderId,
      };

    } catch (error) {
      capturePaymentError(error as Error, {
        sessionId,
        step: 'upsell_workflow',
        amount,
      });

      transaction.setStatus('internal_error');
      throw error;
    } finally {
      transaction.finish();
    }
  }
);