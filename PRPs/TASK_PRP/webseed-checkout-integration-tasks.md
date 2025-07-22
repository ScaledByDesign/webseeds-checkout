# TASK PRP: WebSeed NMI-Konnective Checkout Integration

## Task Overview
Implement NMI payment processing and Konnective CRM integration in WebSeed checkout with event-driven architecture, monitoring, and comprehensive testing.

## Scope Definition

### Affected Files
```yaml
new_files:
  services:
    - /src/services/nmi/NMIService.ts
    - /src/services/nmi/NMICustomerVaultService.ts
    - /src/services/konnective/KonnectiveService.ts
    - /src/services/konnective/KonnectiveTransform.ts
  api_routes:
    - /src/app/api/checkout/process/route.ts
    - /src/app/api/checkout/status/[sessionId]/route.ts
    - /src/app/api/checkout/upsell/route.ts
    - /src/app/api/nmi/tokenize/route.ts
    - /src/app/api/inngest/route.ts
  events:
    - /src/lib/inngest.ts
    - /src/events/checkoutEvents.ts
    - /src/events/paymentEvents.ts
    - /src/events/integrationEvents.ts
  workflows:
    - /src/inngest/functions/payment-processor.ts
    - /src/inngest/functions/konnective-sync.ts
  monitoring:
    - /src/lib/sentry.ts
    - /sentry.client.config.ts
    - /sentry.server.config.ts
    - /instrumentation.ts
  testing:
    - /tests/e2e/checkout.spec.ts
    - /tests/e2e/browserstack.conf.ts
    - /tests/fixtures/test-data.ts

modified_files:
  - /package.json
  - /.env.example
  - /src/app/checkout/page.tsx
  - /src/app/upsell/page.tsx
  - /src/app/thank-you/page.tsx
  - /next.config.ts
  - /tailwind.config.js
```

### Dependencies
```yaml
external:
  runtime:
    - "@sentry/nextjs": "^7.x"
    - "inngest": "^3.x"
    - "zod": "^3.x"
    - "axios": "^1.x"
  dev:
    - "@playwright/test": "^1.x"
    - "@types/node": "^20.x"
    
internal:
  - Next.js 15+ app router
  - TypeScript strict mode
  - Tailwind CSS
```

## Context Section

```yaml
context:
  docs:
    - url: "https://docs.nmi.com/reference/collectjs"
      focus: "Tokenization and secure fields"
    - url: "https://api.konnektive.com/docs/"
      focus: "Order import and customer management"
    - url: "https://www.inngest.com/docs/quick-start"
      focus: "Event-driven workflows"
    - url: "https://docs.sentry.io/platforms/javascript/guides/nextjs/"
      focus: "Next.js error tracking"

  patterns:
    - file: /Users/henryfuentes/Sites/nmi-checkout/src/services/nmiService.ts
      copy: "Singleton pattern and payment processing"
    - file: /Users/henryfuentes/Sites/nmi-checkout/src/lib/inngest.ts
      copy: "Event configuration with Sentry"
    - file: /Users/henryfuentes/Sites/nmi-checkout/src/app/api/funnel/checkout/route.ts
      copy: "API route patterns"

  gotchas:
    - issue: "CollectJS requires HTTPS in production"
      fix: "Use ngrok or similar for local HTTPS testing"
    - issue: "Inngest functions require unique IDs"
      fix: "Prefix with 'webseed-' to avoid conflicts"
    - issue: "BrowserStack requires local tunnel"
      fix: "Use browserstack-local package"
    - issue: "Sentry source maps need auth token"
      fix: "Set SENTRY_AUTH_TOKEN in CI/CD"
```

## Task Breakdown

### Phase 1: Infrastructure Setup (Day 1)

#### Task 1.1: Install Dependencies
```
ACTION package.json:
  - OPERATION: Add production dependencies
    ```json
    {
      "dependencies": {
        "@sentry/nextjs": "^7.106.0",
        "inngest": "^3.12.0",
        "zod": "^3.22.4",
        "axios": "^1.6.7"
      }
    }
    ```
  - VALIDATE: npm install && npm list @sentry/nextjs inngest zod axios
  - IF_FAIL: Check Node version (>=18), clear cache with npm cache clean --force
  - ROLLBACK: git checkout package.json package-lock.json
```

#### Task 1.2: Configure Sentry
```
ACTION sentry setup:
  - OPERATION: Run Sentry wizard
    ```bash
    npx @sentry/wizard@latest -i nextjs --skip-connect
    ```
  - VALIDATE: test -f sentry.client.config.ts && test -f sentry.server.config.ts
  - IF_FAIL: Manually create config files from template
  - ROLLBACK: rm -f sentry.*.config.ts instrumentation.ts

ACTION src/lib/sentry.ts:
  - OPERATION: Create Sentry helper with payment error tracking
    ```typescript
    import * as Sentry from '@sentry/nextjs';

    export function initSentry() {
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        beforeSend(event, hint) {
          // Filter sensitive data
          if (event.request?.cookies) {
            delete event.request.cookies;
          }
          return event;
        },
      });
    }

    export function capturePaymentError(
      error: Error,
      context: {
        sessionId?: string;
        transactionId?: string;
        amount?: number;
        step?: string;
      }
    ) {
      Sentry.captureException(error, {
        tags: {
          type: 'payment_error',
          step: context.step || 'unknown',
        },
        extra: context,
      });
    }
    ```
  - VALIDATE: npm run build
  - IF_FAIL: Check for TypeScript errors, ensure @types/node is installed
  - ROLLBACK: rm src/lib/sentry.ts
```

#### Task 1.3: Setup Inngest
```
ACTION src/lib/inngest.ts:
  - OPERATION: Create Inngest client with event schemas
    ```typescript
    import { Inngest, EventSchemas } from 'inngest';
    import { z } from 'zod';

    const checkoutEvents = {
      'webseed/checkout.initiated': {
        data: z.object({
          sessionId: z.string(),
          email: z.string().email(),
          amount: z.number().positive(),
        })
      },
      'webseed/payment.attempted': {
        data: z.object({
          sessionId: z.string(),
          paymentToken: z.string(),
          amount: z.number(),
        })
      },
      'webseed/payment.succeeded': {
        data: z.object({
          sessionId: z.string(),
          transactionId: z.string(),
          vaultId: z.string(),
          amount: z.number(),
        })
      },
    };

    export const inngest = new Inngest({
      id: 'webseed-checkout',
      schemas: new EventSchemas().fromRecord(checkoutEvents),
    });
    ```
  - VALIDATE: npm run tsc --noEmit
  - IF_FAIL: Check zod import, verify EventSchemas type
  - ROLLBACK: rm src/lib/inngest.ts

ACTION src/app/api/inngest/route.ts:
  - OPERATION: Create Inngest endpoint
    ```typescript
    import { serve } from 'inngest/next';
    import { inngest } from '@/lib/inngest';
    import { paymentProcessor } from '@/inngest/functions/payment-processor';

    export const { GET, POST, PUT } = serve({
      client: inngest,
      functions: [
        // Functions will be added here
      ],
    });
    ```
  - VALIDATE: curl http://localhost:3000/api/inngest
  - IF_FAIL: Ensure app directory structure is correct
  - ROLLBACK: rm -rf src/app/api/inngest
```

### Phase 2: Service Layer (Day 2)

#### Task 2.1: Create NMI Service
```
ACTION src/services/nmi/NMIService.ts:
  - OPERATION: Port NMI service with singleton pattern
    ```typescript
    import axios from 'axios';
    import { z } from 'zod';

    export class NMIService {
      private static instance: NMIService;
      private apiUrl: string;
      private securityKey: string;

      private constructor() {
        this.apiUrl = process.env.NMI_ENDPOINT || '';
        this.securityKey = process.env.NMI_SECURITY_KEY || '';
      }

      static getInstance(): NMIService {
        if (!NMIService.instance) {
          NMIService.instance = new NMIService();
        }
        return NMIService.instance;
      }

      async processPayment(params: PaymentParams): Promise<PaymentResult> {
        try {
          const response = await axios.post(this.apiUrl, {
            security_key: this.securityKey,
            type: 'sale',
            ...params
          });
          
          return {
            success: response.data.response === '1',
            transactionId: response.data.transactionid,
            error: response.data.responsetext
          };
        } catch (error) {
          throw new Error('Payment processing failed');
        }
      }
    }
    ```
  - VALIDATE: npm run test -- NMIService
  - IF_FAIL: Create types file, check axios import
  - ROLLBACK: rm -rf src/services/nmi
```

#### Task 2.2: Create Customer Vault Service
```
ACTION src/services/nmi/NMICustomerVaultService.ts:
  - OPERATION: Implement vault with retry logic
    ```typescript
    export class NMICustomerVaultService {
      private static instance: NMICustomerVaultService;
      private nmiService: NMIService;

      static getInstance(): NMICustomerVaultService {
        if (!NMICustomerVaultService.instance) {
          NMICustomerVaultService.instance = new NMICustomerVaultService();
        }
        return NMICustomerVaultService.instance;
      }

      async createVault(params: VaultParams): Promise<VaultResult> {
        const maxRetries = 3;
        let attempt = 0;
        
        while (attempt < maxRetries) {
          try {
            const result = await this.attemptVaultCreation(params);
            if (result.success) return result;
            
            if (!this.isRetryable(result.errorCode)) {
              throw new Error(result.error);
            }
            
            attempt++;
            await this.delay(Math.pow(2, attempt) * 1000);
          } catch (error) {
            if (attempt === maxRetries - 1) throw error;
          }
        }
        
        throw new Error('Max retries exceeded');
      }

      private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
      }
    }
    ```
  - VALIDATE: npm run test -- NMICustomerVaultService
  - IF_FAIL: Check retry logic, verify delay implementation
  - ROLLBACK: rm src/services/nmi/NMICustomerVaultService.ts
```

#### Task 2.3: Create Konnective Service
```
ACTION src/services/konnective/KonnectiveService.ts:
  - OPERATION: Implement CRM integration
    ```typescript
    export class KonnectiveService {
      private static instance: KonnectiveService;
      private apiUrl: string;
      private credentials: { loginId: string; password: string };

      static getInstance(): KonnectiveService {
        if (!KonnectiveService.instance) {
          KonnectiveService.instance = new KonnectiveService();
        }
        return KonnectiveService.instance;
      }

      async createOrder(orderData: OrderData): Promise<OrderResult> {
        const response = await axios.post(
          `${this.apiUrl}/order/import`,
          {
            loginId: this.credentials.loginId,
            password: this.credentials.password,
            ...this.transformOrderData(orderData),
          }
        );

        return {
          success: response.data.result === 'SUCCESS',
          orderId: response.data.orderId,
          error: response.data.error
        };
      }
    }
    ```
  - VALIDATE: npm run test -- KonnectiveService
  - IF_FAIL: Check API URL configuration, verify transform method
  - ROLLBACK: rm -rf src/services/konnective
```

### Phase 3: API Routes (Day 3)

#### Task 3.1: Create Checkout Process Route
```
ACTION src/app/api/checkout/process/route.ts:
  - OPERATION: Implement async checkout endpoint
    ```typescript
    import { NextRequest, NextResponse } from 'next/server';
    import { z } from 'zod';
    import { inngest } from '@/lib/inngest';

    const checkoutSchema = z.object({
      email: z.string().email(),
      paymentToken: z.string(),
      amount: z.number().positive(),
      customerInfo: z.object({
        firstName: z.string(),
        lastName: z.string(),
        phone: z.string(),
      }),
    });

    export async function POST(request: NextRequest) {
      try {
        const body = await request.json();
        const validated = checkoutSchema.parse(body);
        
        const sessionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await inngest.send({
          name: 'webseed/payment.attempted',
          data: {
            sessionId,
            paymentToken: validated.paymentToken,
            amount: validated.amount,
          }
        });

        return NextResponse.json({
          success: true,
          sessionId,
          message: 'Payment processing initiated'
        });
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Invalid request data' },
          { status: 400 }
        );
      }
    }
    ```
  - VALIDATE: curl -X POST http://localhost:3000/api/checkout/process -H "Content-Type: application/json" -d '{"email":"test@example.com","paymentToken":"test","amount":99.99,"customerInfo":{"firstName":"John","lastName":"Doe","phone":"555-1234"}}'
  - IF_FAIL: Check Inngest client import, verify route export
  - ROLLBACK: rm -rf src/app/api/checkout
```

#### Task 3.2: Create Status Polling Route
```
ACTION src/app/api/checkout/status/[sessionId]/route.ts:
  - OPERATION: Implement status checking
    ```typescript
    export async function GET(
      request: NextRequest,
      { params }: { params: { sessionId: string } }
    ) {
      // Check session status in storage/cache
      const status = await getSessionStatus(params.sessionId);
      
      return NextResponse.json({
        status: status?.status || 'processing',
        transactionId: status?.transactionId,
        error: status?.error,
      });
    }
    ```
  - VALIDATE: curl http://localhost:3000/api/checkout/status/test_session_123
  - IF_FAIL: Verify dynamic route syntax, check params type
  - ROLLBACK: rm src/app/api/checkout/status
```

### Phase 4: Inngest Workflows (Day 4)

#### Task 4.1: Create Payment Processor
```
ACTION src/inngest/functions/payment-processor.ts:
  - OPERATION: Implement payment workflow with Sentry
    ```typescript
    import { inngest } from '@/lib/inngest';
    import { NMIService } from '@/services/nmi/NMIService';
    import { capturePaymentError } from '@/lib/sentry';

    export const paymentProcessor = inngest.createFunction(
      {
        id: 'webseed-payment-processor',
        name: 'Process WebSeed Payments',
        retries: 3,
      },
      { event: 'webseed/payment.attempted' },
      async ({ event, step }) => {
        const nmiService = NMIService.getInstance();
        
        const vaultResult = await step.run('create-vault', async () => {
          try {
            return await nmiService.createCustomerVault({
              paymentToken: event.data.paymentToken,
              sessionId: event.data.sessionId,
            });
          } catch (error) {
            capturePaymentError(error as Error, {
              sessionId: event.data.sessionId,
              step: 'vault_creation',
            });
            throw error;
          }
        });

        if (!vaultResult.success) {
          await step.run('handle-failure', async () => {
            await inngest.send({
              name: 'webseed/payment.failed',
              data: { sessionId: event.data.sessionId, error: vaultResult.error }
            });
          });
          return { success: false };
        }

        // Continue with payment processing...
        return { success: true, vaultId: vaultResult.vaultId };
      }
    );
    ```
  - VALIDATE: npm run inngest:dev && curl http://localhost:8288
  - IF_FAIL: Check function registration, verify event names
  - ROLLBACK: rm src/inngest/functions/payment-processor.ts
```

### Phase 5: UI Enhancement (Day 5)

#### Task 5.1: Enhance Checkout Form
```
ACTION src/app/checkout/page.tsx:
  - OPERATION: Add CollectJS and API integration
    ```typescript
    'use client';
    
    import { useEffect, useState } from 'react';
    import { useRouter } from 'next/navigation';

    export default function CheckoutPage() {
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState<string | null>(null);
      const router = useRouter();

      useEffect(() => {
        // Load CollectJS
        const script = document.createElement('script');
        script.src = process.env.NEXT_PUBLIC_COLLECT_JS_URL || '';
        script.async = true;
        document.body.appendChild(script);

        return () => {
          document.body.removeChild(script);
        };
      }, []);

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
          // Get token from CollectJS
          const token = await window.CollectJS.getToken();
          
          const response = await fetch('/api/checkout/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: formData.email,
              paymentToken: token,
              amount: 99.99,
              customerInfo: formData,
            }),
          });

          const result = await response.json();
          
          if (result.success) {
            sessionStorage.setItem('checkout_session', result.sessionId);
            router.push('/checkout/upsell');
          } else {
            setError(result.error);
          }
        } catch (err) {
          setError('Payment processing failed');
        } finally {
          setLoading(false);
        }
      };

      return (
        <form onSubmit={handleSubmit}>
          {/* Form fields */}
          {error && <div className="text-red-500">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'Processing...' : 'Complete Order'}
          </button>
        </form>
      );
    }
    ```
  - VALIDATE: npm run dev && npm run test:e2e -- checkout-form
  - IF_FAIL: Check CollectJS global, verify form handling
  - ROLLBACK: git checkout src/app/checkout/page.tsx
```

### Phase 6: Testing Setup (Day 6)

#### Task 6.1: Configure BrowserStack
```
ACTION tests/e2e/browserstack.conf.ts:
  - OPERATION: Create test configuration
    ```typescript
    import { defineConfig, devices } from '@playwright/test';

    export default defineConfig({
      testDir: './tests/e2e',
      timeout: 90000,
      retries: process.env.CI ? 2 : 0,
      
      use: {
        baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
        trace: 'on-first-retry',
      },

      projects: [
        {
          name: 'Chrome@latest',
          use: {
            ...devices['Desktop Chrome'],
            browserName: 'chromium',
          },
        },
        {
          name: 'Safari@latest',
          use: {
            ...devices['Desktop Safari'],
            browserName: 'webkit',
          },
        },
      ],
    });
    ```
  - VALIDATE: npx playwright test --list
  - IF_FAIL: Install Playwright browsers with npx playwright install
  - ROLLBACK: rm tests/e2e/browserstack.conf.ts
```

#### Task 6.2: Write E2E Tests
```
ACTION tests/e2e/checkout.spec.ts:
  - OPERATION: Create checkout flow tests
    ```typescript
    import { test, expect } from '@playwright/test';

    test.describe('Checkout Flow', () => {
      test('should complete payment successfully', async ({ page }) => {
        await page.goto('/checkout');
        
        // Fill form
        await page.fill('[name="email"]', 'test@example.com');
        await page.fill('[name="firstName"]', 'John');
        await page.fill('[name="lastName"]', 'Doe');
        
        // Submit
        await page.click('[type="submit"]');
        
        // Wait for redirect
        await page.waitForURL('**/checkout/upsell');
        
        // Verify session
        const sessionId = await page.evaluate(() => 
          sessionStorage.getItem('checkout_session')
        );
        expect(sessionId).toBeTruthy();
      });

      test('should handle payment errors', async ({ page }) => {
        await page.goto('/checkout');
        
        // Use test card that triggers decline
        await page.fill('[name="cardNumber"]', '4000000000000002');
        
        await page.click('[type="submit"]');
        
        // Check error message
        await expect(page.locator('.text-red-500')).toContainText('declined');
      });
    });
    ```
  - VALIDATE: npm run test:e2e
  - IF_FAIL: Start dev server first, check selectors
  - ROLLBACK: rm tests/e2e/checkout.spec.ts
```

### Phase 7: Environment Configuration

#### Task 7.1: Create Environment Template
```
ACTION .env.example:
  - OPERATION: Add all required variables
    ```bash
    # NMI Configuration
    NMI_SECURITY_KEY=your_security_key
    NMI_ENDPOINT=https://secure.networkmerchants.com/api/transact.php
    NEXT_PUBLIC_COLLECT_JS_URL=https://secure.nmi.com/token/Collect.js

    # Konnective Configuration
    KONNECTIVE_LOGIN_ID=your_login_id
    KONNECTIVE_PASSWORD=your_password
    KONNECTIVE_ENDPOINT=https://api.konnektive.com
    KONNECTIVE_CAMPAIGN_ID=your_campaign_id

    # Inngest
    INNGEST_EVENT_KEY=your_event_key
    INNGEST_SIGNING_KEY=your_signing_key

    # Sentry
    NEXT_PUBLIC_SENTRY_DSN=https://your-key@sentry.io/project
    SENTRY_AUTH_TOKEN=your_auth_token
    
    # BrowserStack
    BROWSERSTACK_USERNAME=your_username
    BROWSERSTACK_ACCESS_KEY=your_access_key
    ```
  - VALIDATE: cp .env.example .env.local && npm run dev
  - IF_FAIL: Check for syntax errors, ensure no trailing spaces
  - ROLLBACK: rm .env.example
```

## Validation Strategy

### After Each Phase
```bash
# Phase 1: Infrastructure
npm run build && npm run lint

# Phase 2: Services
npm run test:unit

# Phase 3: API Routes
npm run test:integration

# Phase 4: Workflows
npm run inngest:dev && npm run test:workflows

# Phase 5: UI
npm run test:e2e:local

# Phase 6: Testing
npm run test:e2e:browserstack

# Phase 7: Full validation
npm run validate:all
```

## Rollback Procedures

### Complete Rollback
```bash
# Remove all changes
git checkout main -- .
rm -rf src/services/nmi src/services/konnective
rm -rf src/app/api/checkout src/app/api/nmi
rm -rf src/inngest src/events
rm -rf tests/e2e
npm uninstall @sentry/nextjs inngest zod axios @playwright/test
```

### Partial Rollback (by phase)
```bash
# Rollback specific phase
git checkout main -- src/services  # Phase 2
git checkout main -- src/app/api   # Phase 3
git checkout main -- src/inngest   # Phase 4
```

## Debug Strategies

### Common Issues
1. **TypeScript errors**
   - Run `npm run tsc -- --noEmit --pretty`
   - Check tsconfig.json strict mode settings

2. **API route 404s**
   - Verify file naming (route.ts not page.tsx)
   - Check Next.js app directory structure

3. **Inngest not receiving events**
   - Check INNGEST_EVENT_KEY is set
   - Verify endpoint is registered
   - Use Inngest dev tools

4. **CollectJS not loading**
   - Check HTTPS requirement
   - Verify CORS settings
   - Test with ngrok for local HTTPS

## Performance Checks

### After Implementation
```bash
# Bundle size
npm run analyze

# Lighthouse
npm run lighthouse

# Load testing
npm run test:load -- --concurrent=50
```

## Security Validation

### Checklist
- [ ] No sensitive data in client bundles
- [ ] All API routes have validation
- [ ] Environment variables properly scoped
- [ ] CORS configured correctly
- [ ] Rate limiting implemented
- [ ] Input sanitization in place

## Success Criteria

All tasks are complete when:
1. All validation commands pass
2. E2E tests run successfully on BrowserStack
3. No TypeScript errors
4. Bundle size under 350KB
5. Lighthouse performance score >90
6. Security audit passes

---

**Document Version**: 1.0  
**Estimated Time**: 6 days  
**Complexity**: Medium-High  
**Risk Level**: Low (with proper validation)