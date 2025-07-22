# NMI-Konnective Integration Implementation Guide

## Overview
This guide provides step-by-step Claude commands to implement the complete NMI payment processing and Konnective CRM integration into the WebSeed checkout system.

## Prerequisites
- Node.js 20+ installed
- Access to NMI and Konnective credentials
- WebSeed checkout repository cloned locally
- Claude Code CLI installed and configured

## Implementation Phases

### Phase 1: Infrastructure Setup (Day 1)

#### 1.1 Install Core Dependencies
```bash
claude "Install the core dependencies needed for NMI-Konnective integration: @sentry/nextjs (^7.x), inngest (^3.x), zod (^3.x), axios (^1.x) as production dependencies, and @playwright/test (^1.x) as a dev dependency. Update package.json with these dependencies and run npm install."
```

#### 1.2 Configure Sentry Monitoring
```bash
claude "Set up Sentry monitoring by running 'npx @sentry/wizard@latest -i nextjs --skip-connect' to create configuration files. Then create src/lib/sentry.ts with initSentry() function and capturePaymentError() helper for payment-specific error tracking with proper context."
```

#### 1.3 Setup Inngest Event System
```bash
claude "Configure Inngest event system by creating src/lib/inngest.ts with Inngest client and event schemas for checkout events (checkout.initiated, payment.attempted, payment.succeeded, payment.failed). Also create the API route at src/app/api/inngest/route.ts to serve Inngest functions."
```

### Phase 2: Service Layer Migration (Day 2)

#### 2.1 Port NMI Payment Service
```bash
claude "Port the NMI payment service from the nmi-checkout repository to src/services/nmi/NMIService.ts. Implement it with a singleton pattern, including processPayment() method that handles card transactions via the NMI API. Include proper TypeScript types and error handling."
```

#### 2.2 Create Customer Vault Service
```bash
claude "Create the Customer Vault service at src/services/nmi/NMICustomerVaultService.ts with a singleton pattern. Implement createVault() method with retry logic (max 3 attempts) and exponential backoff. Include methods for vault management and one-click purchases."
```

#### 2.3 Port Konnective CRM Service
```bash
claude "Port the Konnective CRM service to src/services/konnective/KonnectiveService.ts with singleton pattern. Include createOrder() and upsertCustomer() methods with proper data transformation. Add error handling and response mapping."
```

#### 2.4 Implement Session Manager
```bash
claude "Implement the funnel session manager at src/lib/funnel-session.ts with FunnelSessionManager class. Include 24-hour expiration, localStorage persistence, and methods for creating, retrieving, and updating session data. Copy the implementation pattern from nmi-checkout."
```

### Phase 3: API Routes Implementation (Day 3)

#### 3.1 Create Checkout Process Route
```bash
claude "Create the checkout processing API route at src/app/api/checkout/process/route.ts. Implement POST handler that validates input with Zod schema, creates a session, sends 'webseed/payment.attempted' event to Inngest, and returns immediately with session ID. Include proper error handling and validation."
```

#### 3.2 Create Status and Tokenization Routes
```bash
claude "Create two API routes: 1) Status polling endpoint at src/app/api/checkout/status/[sessionId]/route.ts that returns current payment processing status, and 2) Tokenization endpoint at src/app/api/nmi/tokenize/route.ts for CollectJS callbacks with proper CORS headers."
```

#### 3.3 Create Webhook Receivers
```bash
claude "Create webhook receiver at src/app/api/webhooks/[provider]/route.ts that handles both NMI and Konnective webhooks dynamically. Include signature verification, proper event emission via Inngest, and error handling for invalid webhooks."
```

### Phase 4: Inngest Workflows (Day 4)

#### 4.1 Payment Processing Workflow
```bash
claude "Create the payment processing workflow at src/inngest/functions/payment-processor.ts. Implement inngest.createFunction() that handles 'webseed/payment.attempted' events, creates customer vault, processes payment, and emits success/failure events. Include comprehensive Sentry error tracking with transaction spans."
```

#### 4.2 Konnective Sync Workflow
```bash
claude "Create the Konnective sync workflow at src/inngest/functions/konnective-sync.ts that handles 'webseed/payment.succeeded' events. Implement customer upsert, order creation, and confirmation event sending. Include retry logic with exponential backoff and dead letter queue for failures."
```

### Phase 5: UI Enhancement (Day 5)

#### 5.1 Enhance Checkout Form
```bash
claude "Enhance the checkout form at src/app/checkout/page.tsx to integrate CollectJS for secure payment fields. Add loading states, error displays, real-time validation, and integration with the checkout API. Include proper TypeScript types and mobile responsiveness."
```

#### 5.2 Implement Upsell Flow
```bash
claude "Modify src/app/upsell/page.tsx to implement one-click upsell functionality using Customer Vault. Add countdown timer, dynamic product display, instant checkout via vault ID, and proper decline handling. Include loading states and error handling."
```

### Phase 6: Testing Infrastructure (Day 6)

#### 6.1 Configure BrowserStack
```bash
claude "Create BrowserStack configuration at tests/e2e/browserstack.conf.ts with desktop (Chrome, Firefox, Safari, Edge) and mobile (iPhone, Android) browser matrix. Configure parallel execution and local testing tunnel setup."
```

#### 6.2 Write E2E Tests
```bash
claude "Create comprehensive E2E tests at tests/e2e/checkout.spec.ts using Playwright. Include tests for: successful checkout flow, payment error handling, one-click upsell, mobile responsiveness, and performance metrics. Add helper functions for form filling and assertions."
```

### Phase 7: Configuration & Documentation (Day 7)

#### 7.1 Environment Configuration
```bash
claude "Create .env.example file with all required environment variables for NMI (security key, endpoint, CollectJS URL), Konnective (login, password, campaign ID), Inngest (event/signing keys), Sentry DSN, and BrowserStack credentials. Include detailed comments for each variable."
```

#### 7.2 Update Documentation
```bash
claude "Update the CLAUDE.md file with new development commands for testing (npm run test:e2e, npm run inngest:dev), monitoring setup instructions, and common troubleshooting steps for the payment integration."
```

## Validation Commands

After each phase, run these validation commands:

```bash
# Phase 1: Infrastructure
npm run build && npm run lint

# Phase 2: Services  
npm run tsc --noEmit

# Phase 3: API Routes
curl -X POST http://localhost:3000/api/checkout/process \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","paymentToken":"test","amount":99.99}'

# Phase 4: Workflows
npm run inngest:dev
# Visit http://localhost:8288 to verify functions

# Phase 5: UI
npm run dev
# Test checkout flow manually

# Phase 6: Testing
npm run test:e2e:local

# Phase 7: Full validation
npm run test:e2e && npm run build
```

## Rollback Strategy

If issues arise, use these rollback commands:

```bash
# Complete rollback
git checkout main -- .
rm -rf src/services/nmi src/services/konnective
rm -rf src/app/api/checkout src/app/api/nmi src/app/api/konnective
rm -rf src/inngest src/events tests/e2e
npm uninstall @sentry/nextjs inngest zod axios @playwright/test

# Partial rollback (by phase)
git checkout main -- src/services   # Phase 2
git checkout main -- src/app/api    # Phase 3
git checkout main -- src/inngest    # Phase 4
```

## Common Issues & Solutions

### TypeScript Errors
```bash
claude "Fix TypeScript errors by checking imports, ensuring proper type exports, and verifying tsconfig.json settings. Run 'npm run tsc --noEmit' to see all errors."
```

### Inngest Not Receiving Events
```bash
claude "Debug Inngest by checking INNGEST_EVENT_KEY is set, verifying the endpoint is registered at /api/inngest, and using the Inngest dev dashboard at localhost:8288."
```

### CollectJS Not Loading
```bash
claude "Fix CollectJS loading issues by verifying HTTPS requirement (use ngrok for local testing), checking CORS settings, and ensuring the NEXT_PUBLIC_COLLECT_JS_URL environment variable is set."
```

## Success Checklist

- [ ] All dependencies installed successfully
- [ ] Sentry monitoring active and capturing events
- [ ] Inngest functions registered and processing events
- [ ] NMI payment processing working
- [ ] Customer Vault creating successfully
- [ ] Konnective orders syncing
- [ ] Checkout form processing payments
- [ ] Upsell flow working with one-click
- [ ] All E2E tests passing
- [ ] Environment variables configured
- [ ] Documentation updated

## Next Steps

After completing all phases:

1. Run full test suite: `npm run test:all`
2. Check bundle size: `npm run analyze`
3. Run performance audit: `npm run lighthouse`
4. Deploy to staging environment
5. Run BrowserStack tests on staging
6. Monitor Sentry for any errors
7. Review Inngest dashboard for workflow health

## Support Resources

- [NMI Documentation](https://docs.nmi.com/)
- [Konnective API Docs](https://api.konnektive.com/docs/)
- [Inngest Documentation](https://www.inngest.com/docs)
- [Sentry Next.js Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [BrowserStack Playwright](https://www.browserstack.com/docs/automate/playwright)

---

**Last Updated**: January 2024  
**Complexity**: High  
**Estimated Time**: 7 days  
**Required Skills**: Next.js, TypeScript, Payment Processing, Event-Driven Architecture