import { inngest } from '@/src/lib/inngest';
import { KonnectiveService } from '@/src/services/konnective/KonnectiveService';
import { legacyDatabaseSessionManager as databaseSessionManager } from '@/src/lib/unified-session-manager';
import { captureIntegrationError } from '@/src/lib/sentry';
import * as Sentry from '@sentry/nextjs';

export const konnectiveSync = inngest.createFunction(
  {
    id: 'webseed-konnective-sync',
    name: 'Sync Order to Konnective CRM',
    concurrency: { limit: 20 },
    retries: 5,
  },
  { event: 'webseed/payment.succeeded' },
  async ({ event, step }) => {
    const {
      sessionId,
      transactionId,
      vaultId,
      amount,
      customerInfo,
      products,
      orderData,
    } = event.data;

    const transaction = Sentry.startTransaction({
      name: 'integration.konnective.sync',
      op: 'integration',
      data: {
        sessionId,
        transactionId,
        customerCount: 1,
        productCount: products.length,
      },
    });

    try {
      // Step 1: Get session data and validate
      const sessionValidation = await step.run('validate-session-data', async () => {
        const session = await databaseSessionManager.getSession(sessionId);
        
        if (!session) {
          throw new Error('Session not found for Konnective sync');
        }

        return {
          session,
          billingInfo: session.customer_info,
          shippingInfo: session.customer_info,
        };
      });

      // Step 2: Transform data for Konnective
      const transformedData = await step.run('transform-data-for-konnective', async () => {
        const span = transaction.startChild({
          op: 'transform',
          description: 'Transform data for Konnective',
        });

        try {
          const konnectiveService = KonnectiveService.getInstance();
          
          const orderTransformData = {
            sessionId,
            transactionId,
            amount,
            customerInfo,
            products,
            billingInfo: sessionValidation.billingInfo,
            shippingInfo: sessionValidation.shippingInfo,
          };

          const transformed = konnectiveService.transformCheckoutData(orderTransformData);
          span.setStatus('ok');
          
          return transformed;
        } catch (error) {
          span.setStatus('internal_error');
          throw error;
        } finally {
          span.finish();
        }
      });

      // Step 3: Create or update customer in Konnective
      const customerResult = await step.run('upsert-konnective-customer', async () => {
        const span = transaction.startChild({
          op: 'konnective.customer.upsert',
          description: 'Create/Update Konnective Customer',
        });

        try {
          const konnectiveService = KonnectiveService.getInstance();
          const result = await konnectiveService.upsertCustomer(transformedData.customer);

          if (result.success) {
            span.setStatus('ok');
            Sentry.addBreadcrumb({
              message: 'Customer upserted successfully',
              level: 'info',
              data: {
                customerId: result.customerId,
                email: transformedData.customer.email,
              },
            });
          } else {
            span.setStatus('invalid_argument');
            Sentry.addBreadcrumb({
              message: 'Customer upsert failed',
              level: 'warning',
              data: {
                error: result.error,
                email: transformedData.customer.email,
              },
            });
          }

          return result;
        } catch (error) {
          span.setStatus('internal_error');
          captureIntegrationError(
            error as Error,
            'konnective',
            'customer_upsert',
            {
              sessionId,
              email: transformedData.customer.email,
            }
          );
          throw error;
        } finally {
          span.finish();
        }
      });

      // Don't fail the entire sync if customer creation fails
      if (!customerResult.success) {
        Sentry.captureMessage('Konnective customer upsert failed, continuing with order sync', {
          level: 'warning',
          tags: {
            integration: 'konnective',
            operation: 'customer_upsert',
          },
          extra: {
            error: customerResult.error,
            sessionId,
            email: transformedData.customer.email,
          },
        });
      }

      // Step 4: Create order in Konnective
      const orderResult = await step.run('create-konnective-order', async () => {
        const span = transaction.startChild({
          op: 'konnective.order.create',
          description: 'Create Konnective Order',
        });

        try {
          const konnectiveService = KonnectiveService.getInstance();
          
          // Use customer ID if available, otherwise proceed with guest order
          const orderToCreate = {
            ...transformedData.order,
            customerId: customerResult.customerId,
            transactionId,
            orderNotes: `WebSeed Order - Session: ${sessionId}, Vault: ${vaultId}`,
          };

          const result = await konnectiveService.createOrder(orderToCreate);

          if (result.success) {
            span.setStatus('ok');
            Sentry.addBreadcrumb({
              message: 'Order created successfully',
              level: 'info',
              data: {
                orderId: result.orderId,
                orderNumber: result.orderNumber,
                transactionId,
              },
            });
          } else {
            span.setStatus('invalid_argument');
          }

          return result;
        } catch (error) {
          span.setStatus('internal_error');
          captureIntegrationError(
            error as Error,
            'konnective',
            'order_create',
            {
              sessionId,
              transactionId,
              customerId: customerResult.customerId,
            }
          );
          throw error;
        } finally {
          span.finish();
        }
      });

      if (!orderResult.success) {
        // Order creation is critical - send to dead letter queue for manual review
        await step.run('handle-order-sync-failure', async () => {
          await inngest.send({
            name: 'webseed/integration.sync.failed',
            data: {
              service: 'konnective',
              type: 'order',
              originalEvent: event.data,
              error: orderResult.error || 'Order creation failed',
              customerResult: customerResult.success ? { customerId: customerResult.customerId } : null,
              retryable: true,
            },
          });

          Sentry.captureMessage('Konnective order creation failed', {
            level: 'error',
            tags: {
              integration: 'konnective',
              operation: 'order_create',
            },
            extra: {
              sessionId,
              transactionId,
              error: orderResult.error,
              customerCreated: customerResult.success,
            },
          });
        });

        return {
          success: false,
          error: orderResult.error,
          customerSynced: customerResult.success,
          customerResult,
        };
      }

      // Step 5: Send confirmation events
      const confirmationResult = await step.run('send-confirmation-events', async () => {
        const events = [
          // Order confirmation email
          {
            name: 'webseed/email.order.confirmation',
            data: {
              email: customerInfo.email,
              orderId: orderResult.orderId!,
              transactionId,
              customerName: `${customerInfo.firstName} ${customerInfo.lastName}`,
              amount,
            },
          },
          // Analytics conversion tracking
          {
            name: 'webseed/analytics.conversion',
            data: {
              sessionId,
              amount,
              products,
              customerInfo: {
                email: customerInfo.email,
                firstName: customerInfo.firstName,
                lastName: customerInfo.lastName,
              },
            },
          },
          // Sync completion event
          {
            name: 'webseed/konnective.sync.completed',
            data: {
              sessionId,
              transactionId,
              konnectiveOrderId: orderResult.orderId!,
              konnectiveCustomerId: customerResult.customerId || 'GUEST',
            },
          },
        ];

        try {
          await inngest.send(events);
          return { success: true, eventsSent: events.length };
        } catch (error) {
          // Don't fail the sync if events can't be sent
          console.error('Failed to send confirmation events:', error);
          return { success: false, error: (error as Error).message };
        }
      });

      // Step 6: Log successful completion
      Sentry.captureMessage('Konnective sync completed successfully', {
        level: 'info',
        tags: {
          integration: 'konnective',
          operation: 'full_sync',
        },
        extra: {
          sessionId,
          transactionId,
          konnectiveOrderId: orderResult.orderId,
          konnectiveCustomerId: customerResult.customerId,
          confirmationEventsSent: confirmationResult.success,
        },
      });

      transaction.setStatus('ok');
      return {
        success: true,
        konnectiveOrderId: orderResult.orderId,
        konnectiveCustomerId: customerResult.customerId,
        orderNumber: orderResult.orderNumber,
        confirmationEventsSent: confirmationResult.success,
      };

    } catch (error) {
      // Handle unexpected errors
      captureIntegrationError(
        error as Error,
        'konnective',
        'sync_workflow',
        {
          sessionId,
          transactionId,
          step: 'unexpected_error',
        }
      );

      transaction.setStatus('internal_error');
      throw error;
    } finally {
      transaction.finish();
    }
  }
);

// Handle upsell sync to Konnective
export const konnectiveUpsellSync = inngest.createFunction(
  {
    id: 'webseed-konnective-upsell-sync',
    name: 'Sync Upsell to Konnective',
    concurrency: { limit: 15 },
    retries: 3,
  },
  { event: 'webseed/upsell.completed' },
  async ({ event, step }) => {
    const {
      sessionId,
      transactionId,
      productId,
      amount,
      upsellStep,
      orderId,
    } = event.data;

    try {
      // Step 1: Get original session and order data
      const sessionData = await step.run('get-session-data', async () => {
        const session = await databaseSessionManager.getSession(sessionId);
        
        if (!session) {
          throw new Error('Session not found for upsell sync');
        }

        return {
          session,
          originalTransactionId: session.transaction_id,
          customerInfo: session.customer_info,
        };
      });

      // Step 2: Create upsell order in Konnective
      const upsellOrderResult = await step.run('create-upsell-order', async () => {
        const konnectiveService = KonnectiveService.getInstance();

        const upsellOrder = {
          campaignId: process.env.KONNECTIVE_CAMPAIGN_ID || '',
          products: [{
            productId: productId,
            quantity: 1,
            price: amount,
          }],
          totalAmount: amount,
          transactionId,
          paymentStatus: 'completed' as const,
          orderNotes: `WebSeed Upsell ${upsellStep} - Session: ${sessionId}, Original: ${sessionData.originalTransactionId}`,
        };

        if (sessionData.customerInfo) {
          upsellOrder.billingInfo = {
            firstName: sessionData.customerInfo.firstName || sessionData.customerInfo.first_name || '',
            lastName: sessionData.customerInfo.lastName || sessionData.customerInfo.last_name || '',
            address: sessionData.customerInfo.address || '',
            city: sessionData.customerInfo.city || '',
            state: sessionData.customerInfo.state || '',
            zipCode: sessionData.customerInfo.zipCode || sessionData.customerInfo.zip_code || '',
            country: sessionData.customerInfo.country || 'US',
          };
        }

        const result = await konnectiveService.createOrder(upsellOrder);
        return result;
      });

      if (!upsellOrderResult.success) {
        // Send to dead letter queue for manual review
        await step.run('handle-upsell-sync-failure', async () => {
          await inngest.send({
            name: 'webseed/integration.sync.failed',
            data: {
              service: 'konnective',
              type: 'upsell_order',
              originalEvent: event.data,
              error: upsellOrderResult.error || 'Upsell order creation failed',
              retryable: true,
            },
          });
        });

        return {
          success: false,
          error: upsellOrderResult.error,
        };
      }

      // Log successful upsell sync
      Sentry.captureMessage('Konnective upsell sync completed', {
        level: 'info',
        tags: {
          integration: 'konnective',
          operation: 'upsell_sync',
        },
        extra: {
          sessionId,
          upsellTransactionId: transactionId,
          originalTransactionId: sessionData.originalTransactionId,
          konnectiveOrderId: upsellOrderResult.orderId,
          upsellStep,
          amount,
        },
      });

      return {
        success: true,
        konnectiveOrderId: upsellOrderResult.orderId,
        orderNumber: upsellOrderResult.orderNumber,
        upsellStep,
      };

    } catch (error) {
      captureIntegrationError(
        error as Error,
        'konnective',
        'upsell_sync',
        {
          sessionId,
          transactionId,
          upsellStep,
          amount,
        }
      );

      throw error;
    }
  }
);

// Handle failed sync retries from dead letter queue
export const konnectiveRetrySync = inngest.createFunction(
  {
    id: 'webseed-konnective-retry-sync',
    name: 'Retry Failed Konnective Syncs',
    concurrency: { limit: 5 },
    retries: 2,
  },
  { event: 'webseed/integration.sync.failed' },
  async ({ event, step }) => {
    const { service, type, originalEvent, error, retryable } = event.data;

    if (service !== 'konnective' || !retryable) {
      return { success: false, reason: 'Not retryable' };
    }

    try {
      // Wait before retrying to avoid overwhelming the service
      await step.sleep('retry-delay', '30s');

      // Retry the original sync based on type
      if (type === 'order') {
        await step.run('retry-order-sync', async () => {
          await inngest.send({
            name: 'webseed/payment.succeeded',
            data: originalEvent,
          });
        });
      } else if (type === 'upsell_order') {
        await step.run('retry-upsell-sync', async () => {
          await inngest.send({
            name: 'webseed/upsell.completed',
            data: originalEvent,
          });
        });
      }

      return { success: true, retryType: type };

    } catch (error) {
      // Final failure - requires manual intervention
      Sentry.captureMessage('Konnective sync retry failed - manual intervention required', {
        level: 'error',
        tags: {
          integration: 'konnective',
          operation: 'retry_failed',
        },
        extra: {
          originalError: error,
          syncType: type,
          originalEvent,
        },
      });

      return {
        success: false,
        requiresManualIntervention: true,
        error: (error as Error).message,
      };
    }
  }
);