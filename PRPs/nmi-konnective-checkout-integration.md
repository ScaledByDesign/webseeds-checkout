# PRP: NMI-Konnective Checkout Integration

## Overview
Integrate NMI payment processing funnel logic from `nmi-checkout` into the `webseed-checkout` theme-based system, while adding Konnective CRM synchronization for order and customer management.

## Context

### Current State
- **nmi-checkout**: Has complete NMI funnel implementation with Customer Vault, multi-step checkout, and upsells
- **webseed-checkout**: Theme-based checkout system lacking payment processing backend
- **Konnective Integration**: Exists in nmi-checkout, needs to be integrated with payment flow

### Target State
- Unified checkout experience in webseed-checkout with NMI payment processing
- Automatic Konnective CRM sync after successful payments
- Theme-based component system for checkout UI
- Production-ready error handling and security

## Implementation Blueprint

### Phase 1: Core Infrastructure Setup

```typescript
// 1. Service Layer Architecture
/Users/henryfuentes/Sites/webseed-checkout/src/services/
├── nmi/
│   ├── NMIService.ts              // Main NMI service (singleton)
│   ├── NMICustomerVault.ts        // Customer Vault management
│   ├── NMITokenizer.ts            // CollectJS integration
│   └── types.ts                   // NMI type definitions
├── konnective/
│   ├── KonnectiveService.ts       // Konnective CRM service
│   ├── KonnectiveTransform.ts    // Data transformation utilities
│   └── types.ts                   // Konnective type definitions
├── checkout/
│   ├── CheckoutOrchestrator.ts    // Coordinates payment flow
│   ├── FunnelSessionManager.ts    // Session state management
│   └── OrderService.ts            // Order creation and tracking
└── utils/
    ├── errorHandler.ts            // Centralized error handling
    └── logger.ts                  // Structured logging

// 2. Event-Driven Architecture with Inngest
/Users/henryfuentes/Sites/webseed-checkout/src/
├── lib/
│   ├── inngest.ts                 // Inngest client configuration
│   └── sentry.ts                  // Sentry configuration and helpers
├── events/
│   ├── checkoutEvents.ts          // Checkout event definitions
│   ├── paymentEvents.ts           // Payment event types
│   └── integrationEvents.ts       // Integration event types
├── inngest/
│   └── functions/
│       ├── payment-processor.ts    // Payment processing workflows
│       ├── konnective-sync.ts      // CRM sync workflows
│       ├── order-workflow.ts       // Order management
│       └── webhook-handler.ts      // Webhook processing
├── instrumentation.ts             // Next.js instrumentation for Sentry
└── tests/
    ├── e2e/
    │   ├── checkout.spec.ts       // Checkout flow tests
    │   ├── upsell.spec.ts         // Upsell flow tests
    │   └── browserstack.conf.ts   // BrowserStack configuration
    └── fixtures/
        └── test-data.ts           // Test payment data
```

### Phase 2: API Routes Implementation

```typescript
// 3. API Route Structure (Simplified with Inngest)
/Users/henryfuentes/Sites/webseed-checkout/src/app/api/
├── nmi/
│   ├── tokenize/route.ts          // POST: Tokenize card via CollectJS
│   ├── webhook/route.ts           // POST: Handle NMI webhooks
├── konnective/
│   └── webhook/route.ts           // POST: Handle Konnective webhooks
├── checkout/
│   ├── session/route.ts           // GET/POST: Session management
│   ├── process/route.ts           // POST: Process checkout (fires events)
│   └── upsell/route.ts            // POST: Process upsell (fires events)
└── inngest/
    └── route.ts                   // Inngest function endpoint
```

### Phase 3: Theme Component Integration

```typescript
// 3. Themed Checkout Components
/Users/henryfuentes/Sites/webseed-checkout/src/components/themes/nmi-checkout/
├── checkout/
│   ├── NMICheckoutForm.tsx        // Main checkout form with CollectJS
│   ├── PaymentFields.tsx          // Secure payment input fields
│   ├── BillingAddress.tsx         // Billing information form
│   ├── ShippingAddress.tsx        // Shipping information form
│   └── OrderSummary.tsx           // Cart and pricing display
├── upsell/
│   ├── UpsellOffer.tsx            // Upsell presentation component
│   ├── OneClickPurchase.tsx       // Vault-based quick purchase
│   └── UpsellTimer.tsx            // Urgency timer component
├── common/
│   ├── LoadingStates.tsx          // Payment processing indicators
│   ├── ErrorDisplay.tsx           // User-friendly error messages
│   └── SecurityBadges.tsx         // Trust indicators
└── config/
    ├── theme.config.ts            // Theme configuration
    └── componentRegistry.ts       // Component registration
```

### Phase 4: Sentry Configuration Files

```typescript
// 9. Sentry Client Configuration
// src/sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';
import { initSentry } from '@/lib/sentry';

// Initialize Sentry on the client
initSentry();

// 10. Sentry Server Configuration
// src/sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  
  // Server-specific options
  integrations: [
    Sentry.extraErrorDataIntegration({ depth: 10 }),
  ],
  
  // Capture unhandled promise rejections
  onUnhandledRejection: 'strict',
  
  // Filter sensitive data
  beforeSend(event, hint) {
    // Remove sensitive headers
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    
    // Filter out known non-errors
    const error = hint.originalException;
    if (error && error.message?.includes('ResizeObserver')) {
      return null; // Don't send ResizeObserver errors
    }
    
    return event;
  },
});

// 11. Sentry Edge Configuration
// src/sentry.edge.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  
  // Edge runtime doesn't support all integrations
  integrations: [],
});

// 12. Next.js Instrumentation
// src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// 13. BrowserStack Configuration
// tests/e2e/browserstack.conf.ts
import { PlaywrightTestConfig } from '@playwright/test';

const capabilities = {
  'browserstack.username': process.env.BROWSERSTACK_USERNAME,
  'browserstack.accessKey': process.env.BROWSERSTACK_ACCESS_KEY,
  'browserstack.local': process.env.CI ? 'false' : 'true',
  'browserstack.localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
  'project': 'WebSeed Checkout',
  'build': process.env.BUILD_NUMBER || `Local Build ${new Date().toISOString()}`,
  'name': 'Checkout Flow Tests',
};

export const browserstackConfig: PlaywrightTestConfig = {
  testDir: './tests/e2e',
  timeout: 90000, // 90 seconds for payment flows
  retries: process.env.CI ? 2 : 0,
  workers: 5, // Parallel execution
  
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  
  projects: [
    // Desktop Browsers
    {
      name: 'Chrome@latest:Windows 11',
      use: {
        connectOptions: {
          wsEndpoint: getCdpEndpoint('chrome', 'latest', 'Windows 11'),
        },
      },
    },
    {
      name: 'Firefox@latest:macOS Ventura',
      use: {
        connectOptions: {
          wsEndpoint: getCdpEndpoint('firefox', 'latest', 'OS X Ventura'),
        },
      },
    },
    {
      name: 'Safari@17:macOS Ventura',
      use: {
        connectOptions: {
          wsEndpoint: getCdpEndpoint('safari', '17', 'OS X Ventura'),
        },
      },
    },
    {
      name: 'Edge@latest:Windows 11',
      use: {
        connectOptions: {
          wsEndpoint: getCdpEndpoint('edge', 'latest', 'Windows 11'),
        },
      },
    },
    
    // Mobile Browsers
    {
      name: 'iPhone 15 Pro',
      use: {
        ...devices['iPhone 15 Pro'],
        connectOptions: {
          wsEndpoint: getCdpEndpoint('safari', '17', 'iPhone 15 Pro'),
        },
      },
    },
    {
      name: 'Samsung Galaxy S24',
      use: {
        ...devices['Galaxy S24'],
        connectOptions: {
          wsEndpoint: getCdpEndpoint('chrome', 'latest', 'Samsung Galaxy S24'),
        },
      },
    },
    {
      name: 'iPad Pro 12.9',
      use: {
        ...devices['iPad Pro 12.9'],
        connectOptions: {
          wsEndpoint: getCdpEndpoint('safari', '17', 'iPad Pro 12.9 2023'),
        },
      },
    },
  ],
};

function getCdpEndpoint(browser: string, version: string, os: string): string {
  const cdpUrl = 'wss://cdp.browserstack.com/playwright';
  return `${cdpUrl}?caps=${encodeURIComponent(JSON.stringify({
    ...capabilities,
    browser,
    browser_version: version,
    os,
    os_version: os.includes('Windows') ? os.split(' ')[1] : undefined,
  }))}`;
}

// 14. E2E Checkout Flow Test
// tests/e2e/checkout.spec.ts
import { test, expect, Page } from '@playwright/test';
import { TestPaymentData } from '../fixtures/test-data';

test.describe('NMI Checkout Flow', () => {
  let testData: TestPaymentData;
  
  test.beforeEach(async ({ page }) => {
    // Initialize test data
    testData = new TestPaymentData();
    
    // Set up Sentry test mode
    await page.addInitScript(() => {
      window.sentryTestMode = true;
    });
    
    // Navigate to checkout
    await page.goto('/checkout');
    
    // Wait for CollectJS to load
    await page.waitForFunction(() => window.CollectJS !== undefined, {
      timeout: 10000
    });
  });
  
  test('Complete checkout with valid card', async ({ page }) => {
    // Fill customer information
    await fillCustomerInfo(page, testData.customer);
    
    // Fill payment information
    await fillPaymentInfo(page, testData.validCard);
    
    // Submit checkout
    await page.click('[data-testid="submit-payment"]');
    
    // Assert loading state
    await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible();
    
    // Wait for success redirect
    await page.waitForURL('**/checkout/upsell-1', { timeout: 30000 });
    
    // Verify vault was created (check session storage)
    const vaultId = await page.evaluate(() => {
      const session = sessionStorage.getItem('funnel_session');
      return session ? JSON.parse(session).vaultId : null;
    });
    expect(vaultId).toBeTruthy();
    
    // Verify Sentry didn't capture errors
    const sentryErrors = await page.evaluate(() => window.sentryErrors || []);
    expect(sentryErrors).toHaveLength(0);
  });
  
  test('Handle declined card gracefully', async ({ page }) => {
    await fillCustomerInfo(page, testData.customer);
    await fillPaymentInfo(page, testData.declinedCard);
    
    await page.click('[data-testid="submit-payment"]');
    
    // Wait for error message
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-error"]')).toContainText(
      'Your card was declined'
    );
    
    // Verify form is still interactive
    await expect(page.locator('[data-testid="submit-payment"]')).toBeEnabled();
    
    // Verify Sentry captured the error with correct context
    const sentryErrors = await page.evaluate(() => window.sentryErrors || []);
    expect(sentryErrors).toContainEqual(
      expect.objectContaining({
        tags: expect.objectContaining({
          type: 'payment_error',
          step: 'payment_processing'
        })
      })
    );
  });
  
  test('Upsell flow with one-click purchase', async ({ page }) => {
    // Complete initial checkout first
    await completeCheckout(page, testData);
    
    // On upsell page
    await expect(page.locator('[data-testid="upsell-offer"]')).toBeVisible();
    
    // Click accept upsell
    await page.click('[data-testid="accept-upsell"]');
    
    // Should not ask for payment info again
    await expect(page.locator('[data-testid="payment-form"]')).not.toBeVisible();
    
    // Wait for processing
    await expect(page.locator('[data-testid="upsell-processing"]')).toBeVisible();
    
    // Wait for next upsell or success page
    await page.waitForURL(/\/(upsell-2|success)/, { timeout: 15000 });
  });
  
  test('Mobile responsive checkout', async ({ page, viewport }) => {
    // Test is automatically run on mobile devices via BrowserStack
    
    // Verify mobile menu is visible
    if (viewport?.width && viewport.width < 768) {
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    }
    
    // Fill form on mobile
    await fillCustomerInfo(page, testData.customer);
    
    // Verify form elements are properly sized for mobile
    const submitButton = page.locator('[data-testid="submit-payment"]');
    const buttonSize = await submitButton.boundingBox();
    expect(buttonSize?.height).toBeGreaterThanOrEqual(44); // Minimum touch target
  });
  
  test('Performance metrics tracking', async ({ page }) => {
    // Measure checkout page load time
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
      };
    });
    
    // Assert performance thresholds
    expect(metrics.domContentLoaded).toBeLessThan(1500);
    expect(metrics.firstContentfulPaint).toBeLessThan(2000);
    
    // Verify Sentry captured performance data
    const sentryTransactions = await page.evaluate(() => window.sentryTransactions || []);
    expect(sentryTransactions).toContainEqual(
      expect.objectContaining({
        name: 'pageload',
        measurements: expect.objectContaining({
          fcp: expect.any(Number),
          lcp: expect.any(Number),
        })
      })
    );
  });
});

// Helper functions
async function fillCustomerInfo(page: Page, customer: any) {
  await page.fill('[name="email"]', customer.email);
  await page.fill('[name="firstName"]', customer.firstName);
  await page.fill('[name="lastName"]', customer.lastName);
  await page.fill('[name="phone"]', customer.phone);
  await page.fill('[name="address"]', customer.address);
  await page.fill('[name="city"]', customer.city);
  await page.selectOption('[name="state"]', customer.state);
  await page.fill('[name="zipCode"]', customer.zipCode);
}

async function fillPaymentInfo(page: Page, card: any) {
  // CollectJS secure fields
  const cardFrame = page.frameLocator('#CollectJSCardNumber');
  await cardFrame.locator('input').fill(card.number);
  
  const cvvFrame = page.frameLocator('#CollectJSCvv');
  await cvvFrame.locator('input').fill(card.cvv);
  
  // Regular fields
  await page.selectOption('[name="expiryMonth"]', card.expiryMonth);
  await page.selectOption('[name="expiryYear"]', card.expiryYear);
}

// 15. Test Data Fixtures
// tests/fixtures/test-data.ts
export class TestPaymentData {
  customer = {
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '555-0123',
    address: '123 Test Street',
    city: 'Test City',
    state: 'CA',
    zipCode: '90210',
  };

  validCard = {
    number: '4111111111111111', // Test Visa
    cvv: '123',
    expiryMonth: '12',
    expiryYear: '2025',
  };

  declinedCard = {
    number: '4000300011112220', // Decline test card
    cvv: '123',
    expiryMonth: '12',
    expiryYear: '2025',
  };

  insufficientFundsCard = {
    number: '4000300211112218', // NSF test card
    cvv: '123',
    expiryMonth: '12',
    expiryYear: '2025',
  };

  // BrowserStack test accounts for different regions
  regionalCustomers = {
    uk: {
      ...this.customer,
      address: '10 Downing Street',
      city: 'London',
      state: 'England',
      zipCode: 'SW1A 2AA',
    },
    canada: {
      ...this.customer,
      address: '350 Sparks Street',
      city: 'Ottawa',
      state: 'ON',
      zipCode: 'K1R 7S8',
    },
  };
}

// 16. CI/CD Configuration for BrowserStack
// .github/workflows/e2e-tests.yml
name: E2E Tests with BrowserStack

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4, 5] # Parallel shards
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install
      
      - name: Setup BrowserStack Local
        uses: browserstack/github-actions/setup-local@master
        with:
          local-testing: start
          local-identifier: github-${{ github.run_id }}-${{ matrix.shard }}
      
      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
      
      - name: Run E2E tests on BrowserStack
        run: npm run test:e2e:browserstack -- --shard=${{ matrix.shard }}/5
        env:
          BROWSERSTACK_USERNAME: ${{ secrets.BROWSERSTACK_USERNAME }}
          BROWSERSTACK_ACCESS_KEY: ${{ secrets.BROWSERSTACK_ACCESS_KEY }}
          BROWSERSTACK_LOCAL_IDENTIFIER: github-${{ github.run_id }}-${{ matrix.shard }}
          TEST_BASE_URL: http://localhost:3000
          BUILD_NUMBER: ${{ github.run_id }}
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report-${{ matrix.shard }}
          path: playwright-report/
      
      - name: Upload traces
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-traces-${{ matrix.shard }}
          path: test-results/
      
      - name: Stop BrowserStack Local
        if: always()
        uses: browserstack/github-actions/setup-local@master
        with:
          local-testing: stop

// 17. Package.json Scripts
// package.json additions
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:local": "playwright test --config=playwright.config.ts",
    "test:e2e:browserstack": "playwright test --config=tests/e2e/browserstack.conf.ts",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:ui": "playwright test --ui",
    "browserstack:local": "browserstack-local --key $BROWSERSTACK_ACCESS_KEY",
    "report:show": "playwright show-report"
  }
}
```

### Phase 6: Event-Driven Integration Flow

```typescript
// 4. Event Definitions
// src/events/checkoutEvents.ts
export const checkoutEvents = {
  'checkout/initiated': {
    data: z.object({
      sessionId: z.string(),
      email: z.string(),
      products: z.array(productSchema),
      amount: z.number()
    })
  },
  'checkout/payment.attempted': {
    data: z.object({
      sessionId: z.string(),
      paymentToken: z.string(),
      amount: z.number()
    })
  },
  'checkout/payment.succeeded': {
    data: z.object({
      sessionId: z.string(),
      transactionId: z.string(),
      vaultId: z.string(),
      amount: z.number(),
      customerInfo: customerSchema,
      products: z.array(productSchema)
    })
  },
  'checkout/payment.failed': {
    data: z.object({
      sessionId: z.string(),
      error: z.string(),
      errorCode: z.string().optional()
    })
  },
  'checkout/upsell.accepted': {
    data: z.object({
      sessionId: z.string(),
      vaultId: z.string(),
      productId: z.string(),
      amount: z.number()
    })
  }
} as const;

// 5. Sentry Configuration
// src/lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

export function initSentry() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
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

// 6. Inngest Client Configuration with Sentry
// src/lib/inngest.ts
import { Inngest, EventSchemas } from 'inngest';
import * as Sentry from '@sentry/nextjs';
import { checkoutEvents } from '@/events/checkoutEvents';
import { paymentEvents } from '@/events/paymentEvents';
import { integrationEvents } from '@/events/integrationEvents';

export const inngest = new Inngest({
  id: 'webseed-checkout',
  schemas: new EventSchemas().fromRecord({
    ...checkoutEvents,
    ...paymentEvents,
    ...integrationEvents
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

// 7. Payment Processing Workflow with Sentry
// src/inngest/functions/payment-processor.ts
import * as Sentry from '@sentry/nextjs';
import { capturePaymentError } from '@/lib/sentry';

export const processPayment = inngest.createFunction(
  {
    id: 'process-payment',
    name: 'Process Payment Workflow',
    concurrency: { limit: 50 },
    retries: 3
  },
  { event: 'checkout/payment.attempted' },
  async ({ event, step }) => {
    // Create Sentry transaction for the entire workflow
    const transaction = Sentry.startTransaction({
      name: 'checkout.payment.process',
      op: 'payment',
      data: {
        sessionId: event.data.sessionId,
        amount: event.data.amount,
      },
    });

    try {
      // Step 1: Create Customer Vault
      const vaultResult = await step.run('create-vault', async () => {
        const span = transaction.startChild({
          op: 'payment.vault.create',
          description: 'Create NMI Customer Vault',
        });
        
        try {
          const nmiService = NMIService.getInstance();
          const result = await nmiService.createCustomerVault({
            paymentToken: event.data.paymentToken,
            sessionId: event.data.sessionId
          });
          span.setStatus('ok');
          return result;
        } catch (error) {
          span.setStatus('internal_error');
          capturePaymentError(error as Error, {
            sessionId: event.data.sessionId,
            step: 'vault_creation',
            amount: event.data.amount,
          });
          throw error;
        } finally {
          span.finish();
        }
      });

      if (!vaultResult.success) {
        await step.run('handle-vault-failure', async () => {
          Sentry.captureMessage('Customer vault creation failed', {
            level: 'error',
            tags: { type: 'payment_failure', step: 'vault' },
            extra: { 
              sessionId: event.data.sessionId,
              error: vaultResult.error,
            },
          });
          
          await inngest.send({
            name: 'checkout/payment.failed',
            data: {
              sessionId: event.data.sessionId,
              error: vaultResult.error || 'Vault creation failed'
            }
          });
        });
        transaction.setStatus('failed_precondition');
        return { success: false, error: vaultResult.error };
      }

      // Step 2: Process Payment
      const paymentResult = await step.run('process-payment', async () => {
        const span = transaction.startChild({
          op: 'payment.process',
          description: 'Process NMI Payment',
        });
        
        try {
          const nmiService = NMIService.getInstance();
          const result = await nmiService.processPayment({
            vaultId: vaultResult.vaultId,
            amount: event.data.amount,
            orderId: `ORDER-${event.data.sessionId}`
          });
          
          if (result.success) {
            span.setStatus('ok');
            Sentry.setMeasurement('payment.amount', event.data.amount, 'usd');
          } else {
            span.setStatus('invalid_argument');
          }
          
          return result;
        } catch (error) {
          span.setStatus('internal_error');
          capturePaymentError(error as Error, {
            sessionId: event.data.sessionId,
            step: 'payment_processing',
            amount: event.data.amount,
            paymentMethod: 'nmi',
          });
          throw error;
        } finally {
          span.finish();
        }
      });

      if (!paymentResult.success) {
        await step.run('handle-payment-failure', async () => {
          Sentry.captureMessage('Payment processing failed', {
            level: 'error',
            tags: { 
              type: 'payment_failure', 
              step: 'process',
              error_code: paymentResult.errorCode || 'unknown',
            },
            extra: {
              sessionId: event.data.sessionId,
              error: paymentResult.error,
              errorCode: paymentResult.errorCode,
              amount: event.data.amount,
            },
          });
          
          await inngest.send({
            name: 'checkout/payment.failed',
            data: {
              sessionId: event.data.sessionId,
              error: paymentResult.error || 'Payment processing failed',
              errorCode: paymentResult.errorCode
            }
          });
        });
        transaction.setStatus('invalid_argument');
        return { success: false, error: paymentResult.error };
      }

      // Step 3: Trigger success event
      await step.run('trigger-success', async () => {
        await inngest.send({
          name: 'checkout/payment.succeeded',
          data: {
            sessionId: event.data.sessionId,
            transactionId: paymentResult.transactionId,
            vaultId: vaultResult.vaultId,
            amount: event.data.amount,
            // Additional data from session
          }
        });
        
        // Track successful conversion
        Sentry.captureMessage('Payment successful', {
          level: 'info',
          tags: { type: 'payment_success' },
          extra: {
            sessionId: event.data.sessionId,
            transactionId: paymentResult.transactionId,
            amount: event.data.amount,
          },
        });
      });

      transaction.setStatus('ok');
      return { 
        success: true, 
        transactionId: paymentResult.transactionId,
        vaultId: vaultResult.vaultId 
      };
      
    } catch (error) {
      transaction.setStatus('internal_error');
      throw error;
    } finally {
      transaction.finish();
    }
  }
);

// 8. Konnective Sync Workflow with Sentry
// src/inngest/functions/konnective-sync.ts
import * as Sentry from '@sentry/nextjs';
import { captureIntegrationError } from '@/lib/sentry';

export const syncToKonnective = inngest.createFunction(
  {
    id: 'sync-to-konnective',
    name: 'Sync Order to Konnective CRM',
    concurrency: { limit: 20 },
    retries: 5
  },
  { event: 'checkout/payment.succeeded' },
  async ({ event, step }) => {
    const transaction = Sentry.startTransaction({
      name: 'integration.konnective.sync',
      op: 'integration',
      data: {
        sessionId: event.data.sessionId,
        transactionId: event.data.transactionId,
      },
    });

    try {
      // Step 1: Transform data for Konnective
      const konnectiveData = await step.run('transform-data', async () => {
        const span = transaction.startChild({
          op: 'transform',
          description: 'Transform data for Konnective',
        });
        try {
          const result = KonnectiveTransform.fromCheckoutEvent(event.data);
          span.setStatus('ok');
          return result;
        } finally {
          span.finish();
        }
      });

      // Step 2: Create/Update Customer in Konnective
      const customerResult = await step.run('upsert-customer', async () => {
        const span = transaction.startChild({
          op: 'konnective.customer.upsert',
          description: 'Create/Update Konnective Customer',
        });
        
        try {
          const konnectiveService = KonnectiveService.getInstance();
          const result = await konnectiveService.upsertCustomer({
            email: konnectiveData.email,
            firstName: konnectiveData.firstName,
            lastName: konnectiveData.lastName,
            phone: konnectiveData.phone
          });
          
          if (result.success) {
            span.setStatus('ok');
          } else {
            span.setStatus('invalid_argument');
          }
          
          return result;
        } catch (error) {
          span.setStatus('internal_error');
          captureIntegrationError(
            error as Error,
            'konnective',
            'customer_upsert',
            {
              sessionId: event.data.sessionId,
              email: konnectiveData.email,
            }
          );
          throw error;
        } finally {
          span.finish();
        }
      });

      if (!customerResult.success) {
        // Log error but don't fail the workflow
        Sentry.captureMessage('Konnective customer creation failed', {
          level: 'warning',
          tags: {
            integration: 'konnective',
            operation: 'customer_create',
          },
          extra: {
            error: customerResult.error,
            sessionId: event.data.sessionId,
            email: konnectiveData.email,
          },
        });
      }

    // Step 3: Create Order in Konnective
    const orderResult = await step.run('create-order', async () => {
      const konnectiveService = KonnectiveService.getInstance();
      return await konnectiveService.createOrder({
        customerId: customerResult.customerId || 'GUEST',
        transactionId: event.data.transactionId,
        products: konnectiveData.products,
        amount: event.data.amount,
        paymentStatus: 'completed',
        campaignId: process.env.KONNECTIVE_CAMPAIGN_ID
      });
    });

    // Step 4: Handle order creation result
    if (!orderResult.success) {
      await step.run('handle-sync-failure', async () => {
        // Send to dead letter queue for manual review
        await inngest.send({
          name: 'integration/sync.failed',
          data: {
            service: 'konnective',
            type: 'order',
            originalEvent: event.data,
            error: orderResult.error
          }
        });
      });
    }

    // Step 5: Send confirmation events
    await step.run('send-confirmations', async () => {
      await inngest.send([
        {
          name: 'email/order.confirmation',
          data: {
            email: event.data.customerInfo.email,
            orderId: orderResult.orderId,
            transactionId: event.data.transactionId
          }
        },
        {
          name: 'analytics/conversion',
          data: {
            sessionId: event.data.sessionId,
            amount: event.data.amount,
            products: event.data.products
          }
        }
      ]);
    });

    return { 
      success: true, 
      konnectiveOrderId: orderResult.orderId,
      konnectiveCustomerId: customerResult.customerId 
    };
  }
);

// 8. Simplified API Route
// src/app/api/checkout/process/route.ts
export async function POST(request: NextRequest) {
  try {
    const formData = await request.json();
    
    // Validate data
    const validation = validateCheckoutData(formData);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }

    // Create session
    const session = await FunnelSessionManager.createSession({
      email: formData.email,
      products: formData.products
    });

    // Fire event to start the workflow
    await inngest.send({
      name: 'checkout/payment.attempted',
      data: {
        sessionId: session.id,
        paymentToken: formData.paymentToken,
        amount: formData.amount,
        customerInfo: formData.customerInfo,
        products: formData.products
      }
    });

    // Return immediately - processing happens async
    return NextResponse.json({
      success: true,
      sessionId: session.id,
      message: 'Payment processing initiated'
    });

  } catch (error) {
    logger.error('api', 'Checkout initiation failed', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to initiate checkout' },
      { status: 500 }
    );
  }
}
```

## Key Files to Reference

### From nmi-checkout:
- `/src/app/funnel/checkout/page.tsx` - Checkout page implementation
- `/src/app/api/funnel/checkout/route.ts` - Checkout API logic
- `/src/services/nmiCustomerVaultService.ts` - Customer Vault service
- `/src/services/integrationRegistry.ts` - Integration patterns
- `/src/integrations/konnective/KonnectivePlugin.ts` - Konnective plugin
- `/src/lib/funnel-session.ts` - Session management utilities
- `/src/lib/inngest.ts` - Inngest client configuration
- `/src/inngest/functions/` - Event-driven workflows
- `/src/events/paymentEvents.ts` - Payment event definitions
- `/src/events/integrationEvents.ts` - Integration event types

### From webseed-checkout:
- `/tailwind.config.js` - Styling configuration
- `/src/app/checkout/page.tsx` - Current checkout page
- `/PRPs/theme-registry-api.md` - Theme system documentation

## Implementation Tasks

1. **Setup Testing & Monitoring Infrastructure** [Priority: High]
   - Install and configure Sentry SDK (`@sentry/nextjs`)
   - Create Sentry configuration files for client/server/edge
   - Set up error boundary components
   - Configure source map uploads for production
   - Install Playwright and BrowserStack dependencies
   - Set up BrowserStack configuration for cross-browser testing
   - Create E2E test suites for checkout flows
   - Configure CI/CD pipeline for automated testing
   - Install and configure Inngest client
   - Create event type definitions with Zod schemas
   - Set up Inngest API route handler
   - Configure development and production environments

2. **Setup NMI Service Layer** [Priority: High]
   - Port NMIService from nmi-checkout with singleton pattern
   - Implement Customer Vault management for one-click purchases
   - Add CollectJS tokenization with proper security
   - Create async event handlers for payment processing

3. **Create Konnective Integration** [Priority: High]
   - Port KonnectiveService with order/customer sync
   - Implement data transformation utilities
   - Add webhook handling for order updates
   - Create Inngest functions for CRM sync

4. **Build Event-Driven Workflows** [Priority: High]
   - Implement payment processing workflow with Inngest
   - Create Konnective sync workflow with retry logic
   - Add webhook processing functions
   - Implement dead letter queue for failed events

5. **Implement Simplified API Routes** [Priority: High]
   - Create checkout initiation endpoint (fires events)
   - Add tokenization endpoint for CollectJS
   - Implement webhook receivers for NMI/Konnective
   - Create Inngest function endpoint

6. **Create Themed Components** [Priority: Medium]
   - Build NMI checkout form with CollectJS integration
   - Create upsell components with one-click purchase
   - Add loading states and error displays
   - Implement real-time status updates via polling

7. **Add Error Handling & Monitoring** [Priority: Medium]
   - Implement centralized error handler with Sentry integration
   - Map NMI/Konnective errors to user messages
   - Set up Inngest function monitoring with Sentry tracing
   - Create Sentry alerts for failed workflows
   - Configure error boundaries for React components
   - Set up custom Sentry contexts for debugging

8. **Implement Logging & Observability** [Priority: Medium]
   - Add structured logging service with Sentry breadcrumbs
   - Track events through Inngest dashboard
   - Monitor payment success rates in Sentry
   - Set up performance monitoring with Web Vitals
   - Create Sentry dashboards for key metrics
   - Implement custom performance traces

9. **Setup Configuration** [Priority: Low]
   - Add environment variables for NMI/Konnective/Inngest
   - Create feature flags for gradual rollout
   - Configure concurrency limits
   - Document deployment requirements

10. **Create Comprehensive Test Suite** [Priority: High]
    - Unit tests for services and utilities
    - Integration tests for Inngest workflows
    - E2E tests with BrowserStack for cross-browser compatibility
    - Mobile device testing on real devices
    - Performance tests for checkout flow
    - Load tests for concurrent processing
    - Accessibility tests for WCAG compliance
    - Visual regression tests with Percy/BrowserStack

11. **Add Documentation** [Priority: Low]
    - Event flow diagrams
    - API documentation for new endpoints
    - Inngest workflow documentation
    - Deployment and monitoring guide

## Environment Variables

```bash
# NMI Configuration
NMI_SECURITY_KEY=your_security_key
NMI_ENDPOINT=https://secure.networkmerchants.com/api/transact.php
NMI_COLLECT_JS_URL=https://secure.nmi.com/token/Collect.js
NMI_PUBLIC_KEY=your_public_key

# Konnective Configuration  
KONNECTIVE_MODE=production
KONNECTIVE_LOGIN_ID=your_login_id
KONNECTIVE_PASSWORD=your_password
KONNECTIVE_ENDPOINT=https://api.konnektive.com
KONNECTIVE_CAMPAIGN_ID=your_campaign_id

# Inngest Configuration
INNGEST_EVENT_KEY=your_event_key
INNGEST_SIGNING_KEY=your_signing_key
INNGEST_BASE_URL=http://localhost:3000 # Production: https://yourdomain.com

# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://your-key@sentry.io/project-id
SENTRY_ORG=your-org
SENTRY_PROJECT=webseed-checkout
SENTRY_AUTH_TOKEN=your-auth-token # For source maps
SENTRY_ENVIRONMENT=production # or development, staging

# BrowserStack Configuration
BROWSERSTACK_USERNAME=your-username
BROWSERSTACK_ACCESS_KEY=your-access-key
BROWSERSTACK_BUILD_NAME=webseed-checkout
BROWSERSTACK_PROJECT_NAME=NMI Konnective Integration

# Feature Flags
ENABLE_NMI_CHECKOUT=true
ENABLE_KONNECTIVE_SYNC=true
ENABLE_CHECKOUT_LOGGING=true
ENABLE_INNGEST_DEV_MODE=true # Set to false in production
ENABLE_SENTRY_TRACING=true
ENABLE_E2E_TESTS=true
SENTRY_TRACES_SAMPLE_RATE=0.1 # 10% in production, 100% in dev
```

## Validation Gates

```bash
# 1. Install dependencies
npm install @sentry/nextjs inngest zod @playwright/test

# 2. TypeScript compilation
npm run tsc --noEmit

# 3. Linting
npm run lint

# 4. Unit tests
npm run test:unit -- --coverage

# 5. Integration tests
npm run test:integration

# 6. Inngest workflow tests
npm run inngest:dev # Start Inngest dev server
npm run test:workflows

# 7. BrowserStack E2E tests
npm run test:e2e:browserstack

# 8. Local E2E tests  
npm run test:e2e:local

# 9. Sentry validation
npx @sentry/wizard -i nextjs # Initial setup
npm run build # Verify source maps are uploaded

# 10. API endpoint tests
# Test checkout initiation
curl -X POST http://localhost:3000/api/checkout/process \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "amount": 99.99}'

# Test Inngest endpoint
curl http://localhost:3000/api/inngest

# 11. Component tests
npm run test:components

# 12. Accessibility audit
npm run test:a11y

# 13. Visual regression tests
npm run test:visual

# 14. Build verification
npm run build

# 15. Bundle size check
npm run analyze

# 16. Security audit
npm audit --production

# 17. Sentry test event
npx sentry-cli send-event -m "Test event from webseed-checkout"

# 18. BrowserStack live testing
npm run browserstack:local # Start local tunnel
# Navigate to BrowserStack Live dashboard

# 19. Load test with monitoring
npm run test:load -- --concurrent=50 --duration=60s
```

## Error Handling Strategy

1. **Payment Errors**: Map to user-friendly messages, offer retry
2. **Network Errors**: Implement exponential backoff with retry
3. **Validation Errors**: Show inline field-specific messages
4. **System Errors**: Log details, show generic message to user
5. **CRM Sync Errors**: Queue for retry, don't block checkout

## Security Considerations

1. **PCI Compliance**: Use CollectJS for tokenization, never handle raw card data
2. **Authentication**: Secure all API endpoints with proper validation
3. **Data Encryption**: Encrypt sensitive data in transit and at rest
4. **Input Validation**: Sanitize all user inputs before processing
5. **Rate Limiting**: Implement rate limits on payment endpoints

## Common Pitfalls to Avoid

1. **Don't store card details** - Always use tokenization
2. **Handle webhook failures** - Implement retry logic with Inngest
3. **Validate amounts** - Ensure correct decimal handling
4. **Test error paths** - Not just happy path scenarios
5. **Monitor API limits** - Both NMI and Konnective have rate limits
6. **Avoid synchronous CRM calls** - Use Inngest for async processing
7. **Don't block on integrations** - Payment should succeed even if CRM fails
8. **Handle race conditions** - Use idempotency keys for payments
9. **Monitor event queue** - Set up alerts for failed workflows
10. **Test concurrent load** - Ensure system handles traffic spikes

## External Resources

- NMI Developer Portal: https://docs.nmi.com/
- NMI Integration Guide: https://secure.networkmerchants.com/gw/merchants/resources/integration/integration_portal.php
- Konnective API Docs: https://api.konnektive.com/docs/
- CollectJS Documentation: https://docs.nmi.com/reference/collectjs
- Inngest Documentation: https://www.inngest.com/docs
- Inngest SDK Reference: https://www.inngest.com/docs/sdk/javascript
- Inngest Best Practices: https://www.inngest.com/docs/guides/best-practices
- Sentry Next.js Guide: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Sentry Performance Monitoring: https://docs.sentry.io/product/performance/
- Sentry Best Practices: https://docs.sentry.io/product/sentry-basics/integrate-backend/
- BrowserStack Documentation: https://www.browserstack.com/docs
- BrowserStack Playwright Guide: https://www.browserstack.com/docs/automate/playwright
- BrowserStack Live Testing: https://www.browserstack.com/live
- Playwright Documentation: https://playwright.dev/

## Success Criteria

- [ ] NMI payment processing works in webseed-checkout
- [ ] Customer Vault enables one-click upsells
- [ ] Konnective receives order/customer data after payment
- [ ] Inngest workflows process payments asynchronously
- [ ] Sentry captures and categorizes all errors properly
- [ ] BrowserStack tests pass on all target browsers/devices
- [ ] Error handling provides clear user feedback
- [ ] Failed CRM syncs don't block successful payments
- [ ] All tests pass with >80% coverage
- [ ] E2E tests cover complete checkout journey
- [ ] Cross-browser compatibility verified (Chrome, Firefox, Safari, Edge)
- [ ] Mobile checkout works on iOS and Android devices
- [ ] Performance metrics meet requirements (<3s checkout)
- [ ] Concurrent payment processing handles 50+ simultaneous checkouts
- [ ] Inngest dashboard shows healthy workflow execution
- [ ] Sentry dashboard shows <1% error rate
- [ ] Performance monitoring shows p95 latency <2s
- [ ] Accessibility audit passes WCAG 2.1 AA standards
- [ ] Security audit passes without critical issues
- [ ] Build size optimized with async job processing

## Architecture Benefits with Inngest + Sentry + BrowserStack

1. **Scalability**: Handle high-volume checkouts with concurrent processing
2. **Reliability**: Automatic retries and error handling for integrations
3. **Observability**: Complete monitoring stack with Inngest + Sentry
4. **Quality Assurance**: Automated cross-browser/device testing
5. **Debugging**: Full error context, transaction traces, and test recordings
6. **Performance**: Faster checkout UX with async background processing
7. **Proactive Monitoring**: Alerts before issues impact users
8. **User Experience**: Consistent checkout flow across all platforms
9. **Confidence**: Real device testing ensures production readiness
10. **Continuous Testing**: Automated E2E tests on every deployment

## Confidence Score: 9.9/10

This PRP provides comprehensive context and clear implementation steps. The confidence score is near-perfect due to:
- Event-driven architecture with Inngest for better scalability
- Complete observability with Sentry error tracking and performance monitoring
- Comprehensive testing strategy with BrowserStack for cross-platform validation
- Detailed analysis of existing implementations
- Clear file references and code examples
- Specific implementation patterns to follow
- Comprehensive error handling strategy with async retry logic
- Well-defined validation gates including workflow and E2E testing
- Optimized build with background job processing
- Proactive monitoring and alerting capabilities
- Real device testing ensuring checkout works everywhere

The implementation should succeed in one pass with this level of detail, combining:
- **Inngest** for robust event management and scalable workflows
- **Sentry** for comprehensive monitoring and debugging
- **BrowserStack** for automated cross-browser/device testing

This triple combination ensures the checkout integration is not only functional but also reliable, performant, and works consistently across all user environments.