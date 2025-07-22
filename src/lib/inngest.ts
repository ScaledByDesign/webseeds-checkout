import { Inngest, EventSchemas } from 'inngest';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';

// Define customer info schema
const customerSchema = z.object({
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  country: z.string().default('US'),
});

// Define product schema
const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
});

// Define checkout events
const checkoutEvents = {
  'webseed/checkout.initiated': {
    data: z.object({
      sessionId: z.string(),
      email: z.string().email(),
      amount: z.number().positive(),
      products: z.array(productSchema),
      customerInfo: customerSchema,
    })
  },
  'webseed/payment.attempted': {
    data: z.object({
      sessionId: z.string(),
      paymentToken: z.string(),
      amount: z.number().positive(),
      customerInfo: customerSchema,
      products: z.array(productSchema),
      couponCode: z.string().optional(),
    })
  },
  'webseed/payment.succeeded': {
    data: z.object({
      sessionId: z.string(),
      transactionId: z.string(),
      vaultId: z.string(),
      amount: z.number().positive(),
      customerInfo: customerSchema,
      products: z.array(productSchema),
      orderData: z.record(z.any()).optional(),
    })
  },
  'webseed/payment.failed': {
    data: z.object({
      sessionId: z.string(),
      error: z.string(),
      errorCode: z.string().optional(),
      amount: z.number().positive(),
      attempt: z.number().int().positive().default(1),
    })
  },
  'webseed/upsell.accepted': {
    data: z.object({
      sessionId: z.string(),
      vaultId: z.string(),
      productId: z.string(),
      amount: z.number().positive(),
      upsellStep: z.number().int().positive(),
    })
  },
  'webseed/upsell.declined': {
    data: z.object({
      sessionId: z.string(),
      productId: z.string(),
      upsellStep: z.number().int().positive(),
    })
  }
} as const;

// Define integration events
const integrationEvents = {
  'webseed/konnective.sync.started': {
    data: z.object({
      sessionId: z.string(),
      transactionId: z.string(),
      customerId: z.string().optional(),
    })
  },
  'webseed/konnective.sync.completed': {
    data: z.object({
      sessionId: z.string(),
      transactionId: z.string(),
      konnectiveOrderId: z.string(),
      konnectiveCustomerId: z.string(),
    })
  },
  'webseed/konnective.sync.failed': {
    data: z.object({
      sessionId: z.string(),
      transactionId: z.string(),
      error: z.string(),
      attempt: z.number().int().positive(),
    })
  },
  'webseed/integration.sync.failed': {
    data: z.object({
      service: z.string(),
      type: z.string(),
      originalEvent: z.record(z.any()),
      error: z.string(),
    })
  }
} as const;

// Define notification events
const notificationEvents = {
  'webseed/email.order.confirmation': {
    data: z.object({
      email: z.string().email(),
      orderId: z.string(),
      transactionId: z.string(),
      customerName: z.string(),
      amount: z.number().positive(),
    })
  },
  'webseed/analytics.conversion': {
    data: z.object({
      sessionId: z.string(),
      amount: z.number().positive(),
      products: z.array(productSchema),
      customerInfo: customerSchema.partial(),
    })
  }
} as const;

// Create Inngest client with comprehensive event schemas
export const inngest = new Inngest({
  id: 'webseed-checkout',
  schemas: new EventSchemas().fromRecord({
    ...checkoutEvents,
    ...integrationEvents,
    ...notificationEvents
  }),
  middleware: [
    // Add Sentry tracing to Inngest functions
    {
      name: 'sentry-tracing',
      init() {
        return {
          onFunctionRun(ctx) {
            const transaction = Sentry.startTransaction({
              name: `inngest.${ctx.fn.id}`,
              op: 'function',
              data: {
                eventName: ctx.event.name,
                functionId: ctx.fn.id,
              },
            });
            
            Sentry.getCurrentHub().configureScope(scope => {
              scope.setSpan(transaction);
              scope.setTag('inngest.function', ctx.fn.id);
              scope.setTag('inngest.event', ctx.event.name);
              scope.setContext('inngest', {
                runId: ctx.runId,
                attempt: ctx.attempt,
              });
            });

            return {
              transformOutput(ctx) {
                transaction.finish();
                return ctx.output;
              },
              transformError(ctx) {
                Sentry.captureException(ctx.error, {
                  tags: {
                    'inngest.function': ctx.fn.id,
                    'inngest.event': ctx.event.name,
                  },
                  extra: {
                    runId: ctx.runId,
                    attempt: ctx.attempt,
                    event: ctx.event,
                  },
                });
                transaction.setStatus('internal_error');
                transaction.finish();
                throw ctx.error;
              },
            };
          },
        };
      },
    },
  ],
});

// Export event schemas for use in other files
export { checkoutEvents, integrationEvents, notificationEvents };
export type { customerSchema as CustomerSchema, productSchema as ProductSchema };