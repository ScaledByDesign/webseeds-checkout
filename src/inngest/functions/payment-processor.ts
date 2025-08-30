import { inngest } from '@/src/lib/inngest';
import { NMIService } from '@/src/services/nmi/NMIService';
import { NMICustomerVaultService } from '@/src/services/nmi/NMICustomerVaultService';
import { legacyDatabaseSessionManager as databaseSessionManager } from '@/src/lib/unified-session-manager';
import { capturePaymentError } from '@/src/lib/sentry';
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

    // Set Sentry context for the entire workflow (temporarily disabled)
    try {
      Sentry.withScope(scope => {
        scope.setTag('operation', 'payment.process');
        scope.setContext('payment', {
          sessionId,
          amount,
          productCount: products.length,
        });
      });
    } catch (error) {
      console.warn('Sentry context failed, continuing without telemetry:', error);
    }

    try {
      // Step 1: Validate session and update status
      const sessionValidation = await step.run('validate-session', async () => {
        const session = await databaseSessionManager.getSession(sessionId);

        if (!session) {
          throw new Error('Session not found or expired');
        }

        if (session.status !== 'processing') {
          await databaseSessionManager.updateSessionStatus(sessionId, 'processing');
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
        // const span = transaction.startChild({
        //   op: 'payment.vault.create',
        //   description: 'Create NMI Customer Vault',
        // });

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
            await databaseSessionManager.updateSession(sessionId, { vault_id: result.vaultId! });
            // Vault creation successful
          }

          return result;

        } catch (error) {
          capturePaymentError(error as Error, {
            sessionId,
            step: 'vault_creation',
            amount,
          });
          throw error;
        }
      });

      if (!vaultResult.success) {
        await step.run('handle-vault-failure', async () => {
          await databaseSessionManager.updateSessionStatus(sessionId, 'failed');
          
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

        // Vault creation failed - no further processing needed
        return {
          success: false,
          error: vaultResult.error,
          step: 'vault_creation',
        };
      }

      // Step 3: Process Initial Payment
      const paymentResult = await step.run('process-initial-payment', async () => {
        // const span = transaction.startChild({
        //   op: 'payment.process',
        //   description: 'Process NMI Payment',
        // });

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
            await databaseSessionManager.updateSession(sessionId, { transaction_id: result.transactionId! });
            // Track payment amount in Sentry with v8 compatible API
            try {
              Sentry.withScope(scope => {
                scope.setMeasurement('payment.amount', amount, 'usd');
              });
            } catch (error) {
              console.warn('Sentry measurement failed:', error);
            }
          }

          return {
            ...result,
            orderId,
          };

        } catch (error) {
          capturePaymentError(error as Error, {
            sessionId,
            step: 'payment_processing',
            amount,
            paymentMethod: 'nmi',
          });
          throw error;
        }
      });

      if (!paymentResult.success) {
        await step.run('handle-payment-failure', async () => {
          await databaseSessionManager.updateSessionStatus(sessionId, 'failed');

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

        // Payment processing failed - transaction recorded
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
        await databaseSessionManager.updateSession(sessionId, {
          status: 'completed',
          current_step: 'upsell-1'
        });

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

      // Payment processing completed successfully
      return successResult;

    } catch (error) {
      // Handle any unexpected errors
      await step.run('handle-unexpected-error', async () => {
        await databaseSessionManager.updateSessionStatus(sessionId, 'failed');

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

      // Unexpected error occurred during payment processing
      throw error;
    } finally {
      // Payment processing workflow completed
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

    // const transaction = Sentry.startTransaction({
    //   name: 'checkout.upsell.process',
    //   op: 'upsell',
    //   data: {
    //     sessionId,
    //     productId,
    //     amount,
    //     upsellStep,
    //   },
    // });

    try {
      // Step 1: Validate session and vault
      const validation = await step.run('validate-upsell', async () => {
        const session = await databaseSessionManager.getSession(sessionId);

        if (!session || !session.vault_id) {
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
          // Add to declined upsells
          const session = await databaseSessionManager.getSession(sessionId);
          const upsellsDeclined = [...(session?.upsells_declined || []), productId];
          await databaseSessionManager.updateSession(sessionId, { upsells_declined: upsellsDeclined });

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
        // Add to accepted upsells and update step
        const session = await databaseSessionManager.getSession(sessionId);
        const upsellsAccepted = [...(session?.upsells_accepted || []), productId];

        // Determine next step
        const nextStep = upsellStep === 1 ? 'upsell-2' : 'success';

        await databaseSessionManager.updateSession(sessionId, {
          upsells_accepted: upsellsAccepted,
          current_step: nextStep
        });

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

      // Upsell payment processing completed successfully
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

      // Unexpected error occurred during upsell processing
      throw error;
    } finally {
      // Upsell processing workflow completed
    }
  }
);