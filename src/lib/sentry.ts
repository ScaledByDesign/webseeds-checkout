import * as Sentry from '@sentry/nextjs';

export function initSentry() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    profilesSampleRate: 0.1,
    integrations: [
      // Automatic instrumentation
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.extraErrorDataIntegration(),
    ],
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      // Don't send PII
      if (event.user) {
        event.user = { id: event.user.id };
      }
      return event;
    },
  });
}

// Helper to capture payment errors with context
export function capturePaymentError(
  error: Error,
  context: {
    sessionId?: string;
    transactionId?: string;
    amount?: number;
    paymentMethod?: string;
    step?: string;
  }
) {
  Sentry.captureException(error, {
    tags: {
      type: 'payment_error',
      payment_method: context.paymentMethod || 'unknown',
      step: context.step || 'unknown',
    },
    extra: {
      sessionId: context.sessionId,
      transactionId: context.transactionId,
      amount: context.amount,
    },
    fingerprint: ['payment', error.name, context.step],
  });
}

// Helper for integration errors
export function captureIntegrationError(
  error: Error,
  integration: string,
  operation: string,
  data?: Record<string, any>
) {
  Sentry.captureException(error, {
    tags: {
      type: 'integration_error',
      integration,
      operation,
    },
    extra: data,
    fingerprint: ['integration', integration, operation, error.name],
  });
}

// Helper for checkout events
export function captureCheckoutEvent(
  message: string,
  level: Sentry.SeverityLevel,
  data: Record<string, any>
) {
  Sentry.captureMessage(message, {
    level,
    tags: { type: 'checkout_event' },
    extra: data,
  });
}