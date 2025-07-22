# SPEC PRP: NMI-Konnective WebSeed Checkout Migration

## Specification Overview

Transform the WebSeed checkout from a theme-based static system into a fully integrated payment processing platform by migrating NMI payment processing and Konnective CRM functionality from the existing nmi-checkout codebase.

## Current State Assessment

### WebSeed Checkout (Target System)
```yaml
current_state:
  files:
    - /src/app/checkout/page.tsx (static form)
    - /src/app/upsell/page.tsx (static upsell)
    - /src/app/thank-you/page.tsx (static confirmation)
    - /tailwind.config.js (styling configuration)
    - /package.json (minimal dependencies)
  
  behavior:
    - Static HTML forms without backend processing
    - No payment gateway integration
    - No session management
    - No error handling
    - No CRM integration
    - Basic theme system planned but not implemented
  
  issues:
    - Cannot process actual payments
    - No customer data persistence
    - No upsell functionality
    - Missing security features
    - No analytics or tracking
    - No cross-browser testing
```

### NMI Checkout (Source System)
```yaml
source_state:
  files:
    - /src/services/nmiService.ts (payment processing)
    - /src/services/nmiCustomerVaultService.ts (vault management)
    - /src/services/konnectiveApi.ts (CRM integration)
    - /src/integrations/konnective/* (plugin architecture)
    - /src/app/api/payment/process/route.ts (API endpoints)
    - /src/lib/funnel-session.ts (session management)
    - /src/types/* (TypeScript definitions)
  
  behavior:
    - Full payment processing with NMI
    - Customer Vault for one-click purchases
    - Konnective CRM synchronization
    - Event-driven architecture with Inngest
    - Comprehensive error handling
    - Security and compliance features
  
  strengths:
    - Production-tested code
    - Robust error handling
    - Type-safe implementations
    - Event-driven architecture
    - Comprehensive testing
```

## Desired State

```yaml
desired_state:
  files:
    - /src/services/nmi/* (ported payment services)
    - /src/services/konnective/* (CRM integration)
    - /src/app/api/checkout/* (API routes)
    - /src/app/api/nmi/* (NMI endpoints)
    - /src/app/api/konnective/* (CRM endpoints)
    - /src/lib/inngest.ts (event configuration)
    - /src/events/* (event definitions)
    - /src/inngest/functions/* (workflows)
    - /tests/e2e/* (BrowserStack tests)
    - /src/components/checkout/* (enhanced UI)
  
  behavior:
    - Secure payment processing via NMI
    - Customer Vault one-click purchases
    - Real-time Konnective CRM sync
    - Event-driven async processing
    - Comprehensive error handling
    - Cross-browser/device testing
    - Performance monitoring
    - PCI compliance
  
  benefits:
    - 70%+ checkout conversion rate
    - <3s page load times
    - 99.9% uptime reliability
    - Automatic retry mechanisms
    - Complete observability
    - Scalable architecture
```

## Hierarchical Transformation Objectives

### 1. High-Level Objective
**Transform WebSeed into a production-ready payment processing platform**

### 2. Mid-Level Milestones

#### 2.1 Infrastructure Foundation
- Set up monitoring (Sentry)
- Configure event system (Inngest)
- Establish testing framework (BrowserStack)
- Create environment configuration

#### 2.2 Core Services Migration
- Port NMI payment service
- Migrate Customer Vault functionality
- Integrate Konnective CRM
- Implement session management

#### 2.3 API Layer Implementation
- Create checkout processing endpoints
- Build webhook receivers
- Implement status polling
- Add tokenization endpoints

#### 2.4 UI Enhancement
- Upgrade checkout form with CollectJS
- Add loading states and error displays
- Implement mobile responsiveness
- Create upsell flow components

#### 2.5 Quality Assurance
- Write comprehensive tests
- Set up CI/CD pipeline
- Configure monitoring alerts
- Document implementation

### 3. Low-Level Tasks with Validation

## Implementation Tasks

### Phase 1: Infrastructure Setup

#### Task 1.1: Install Core Dependencies
```yaml
task_name: install_dependencies
action: MODIFY
file: /Users/henryfuentes/Sites/webseed-checkout/package.json
changes: |
  Add dependencies:
  - "@sentry/nextjs": "^7.x"
  - "inngest": "^3.x"
  - "zod": "^3.x"
  - "@playwright/test": "^1.x"
  - "axios": "^1.x"
  - Add scripts for testing and monitoring
validation:
  - command: "cd /Users/henryfuentes/Sites/webseed-checkout && npm install"
  - expect: "dependencies installed successfully"
  - command: "npm list @sentry/nextjs inngest zod"
  - expect: "all packages listed"
```

#### Task 1.2: Configure Sentry
```yaml
task_name: setup_sentry
action: CREATE
file: /Users/henryfuentes/Sites/webseed-checkout/src/lib/sentry.ts
changes: |
  COPY implementation from:
  /Users/henryfuentes/Sites/nmi-checkout/PRPs/nmi-konnective-checkout-integration.md
  Section: "5. Sentry Configuration"
  
  CREATE files:
  - sentry.client.config.ts
  - sentry.server.config.ts
  - sentry.edge.config.ts
  - instrumentation.ts
validation:
  - command: "npx @sentry/wizard -i nextjs --skip-connect"
  - expect: "Sentry configuration files created"
```

#### Task 1.3: Setup Inngest
```yaml
task_name: configure_inngest
action: CREATE
file: /Users/henryfuentes/Sites/webseed-checkout/src/lib/inngest.ts
changes: |
  MIRROR structure from:
  /Users/henryfuentes/Sites/nmi-checkout/src/lib/inngest.ts
  
  CREATE event schemas matching checkout flow
  ADD Sentry middleware for tracing
validation:
  - command: "cd /Users/henryfuentes/Sites/webseed-checkout && npm run inngest:dev"
  - expect: "Inngest Dev Server started"
```

### Phase 2: Service Layer Migration

#### Task 2.1: Port NMI Service
```yaml
task_name: migrate_nmi_service
action: CREATE
file: /Users/henryfuentes/Sites/webseed-checkout/src/services/nmi/NMIService.ts
changes: |
  COPY core implementation from:
  /Users/henryfuentes/Sites/nmi-checkout/src/services/nmiService.ts
  
  MODIFY to use webseed environment variables
  KEEP singleton pattern
  KEEP all payment methods
  ADD proper TypeScript exports
validation:
  - command: "cd /Users/henryfuentes/Sites/webseed-checkout && npm run tsc --noEmit"
  - expect: "no TypeScript errors"
```

#### Task 2.2: Port Customer Vault Service
```yaml
task_name: migrate_vault_service
action: CREATE
file: /Users/henryfuentes/Sites/webseed-checkout/src/services/nmi/NMICustomerVaultService.ts
changes: |
  COPY implementation from:
  /Users/henryfuentes/Sites/nmi-checkout/src/services/nmiCustomerVaultService.ts
  
  KEEP retry logic with exponential backoff
  KEEP event emission patterns
  INTEGRATE with webseed Inngest instance
validation:
  - command: "npm run test:unit -- NMICustomerVaultService"
  - expect: "all tests pass"
```

#### Task 2.3: Port Konnective Service
```yaml
task_name: migrate_konnective_service
action: CREATE
file: /Users/henryfuentes/Sites/webseed-checkout/src/services/konnective/KonnectiveService.ts
changes: |
  COPY from: /Users/henryfuentes/Sites/nmi-checkout/src/services/konnectiveApi.ts
  
  CREATE data transformation utilities
  KEEP error mapping logic
  ADD webseed-specific configuration
validation:
  - command: "npm run test:unit -- KonnectiveService"
  - expect: "service tests pass"
```

#### Task 2.4: Implement Session Manager
```yaml
task_name: create_session_manager
action: CREATE
file: /Users/henryfuentes/Sites/webseed-checkout/src/lib/funnel-session.ts
changes: |
  COPY from: /Users/henryfuentes/Sites/nmi-checkout/src/lib/funnel-session.ts
  
  KEEP 24-hour expiration
  KEEP localStorage persistence
  ADD TypeScript strict mode compatibility
validation:
  - command: "npm run test:unit -- FunnelSessionManager"
  - expect: "session management tests pass"
```

### Phase 3: API Implementation

#### Task 3.1: Create Checkout API Route
```yaml
task_name: implement_checkout_api
action: CREATE
file: /Users/henryfuentes/Sites/webseed-checkout/src/app/api/checkout/process/route.ts
changes: |
  CREATE async endpoint that:
  - Validates input with Zod
  - Creates session
  - Sends Inngest event
  - Returns immediately
  
  REFERENCE: /Users/henryfuentes/Sites/nmi-checkout/PRPs/nmi-konnective-checkout-integration.md
  Section: "8. Simplified API Route"
validation:
  - command: "curl -X POST http://localhost:3000/api/checkout/process -H 'Content-Type: application/json' -d '{\"email\":\"test@example.com\",\"amount\":99.99}'"
  - expect: "200 status with sessionId"
```

#### Task 3.2: Create Tokenization Endpoint
```yaml
task_name: implement_tokenization_api
action: CREATE
file: /Users/henryfuentes/Sites/webseed-checkout/src/app/api/nmi/tokenize/route.ts
changes: |
  CREATE endpoint for CollectJS callbacks
  ADD CORS headers for NMI domain
  VALIDATE token format
  RETURN success response
validation:
  - command: "npm run test:integration -- tokenization"
  - expect: "tokenization tests pass"
```

#### Task 3.3: Create Webhook Receivers
```yaml
task_name: implement_webhooks
action: CREATE
file: /Users/henryfuentes/Sites/webseed-checkout/src/app/api/webhooks/[provider]/route.ts
changes: |
  CREATE dynamic webhook handler
  ADD signature verification
  EMIT appropriate Inngest events
  HANDLE both NMI and Konnective webhooks
validation:
  - command: "npm run test:integration -- webhooks"
  - expect: "webhook handling tests pass"
```

### Phase 4: Inngest Workflows

#### Task 4.1: Payment Processing Workflow
```yaml
task_name: create_payment_workflow
action: CREATE
file: /Users/henryfuentes/Sites/webseed-checkout/src/inngest/functions/payment-processor.ts
changes: |
  COPY workflow structure from:
  /Users/henryfuentes/Sites/nmi-checkout/PRPs/nmi-konnective-checkout-integration.md
  Section: "7. Payment Processing Workflow with Sentry"
  
  ADD comprehensive error handling
  ADD Sentry transaction tracking
  INTEGRATE with services
validation:
  - command: "npm run test:workflows -- payment-processor"
  - expect: "workflow tests pass"
```

#### Task 4.2: Konnective Sync Workflow
```yaml
task_name: create_sync_workflow
action: CREATE
file: /Users/henryfuentes/Sites/webseed-checkout/src/inngest/functions/konnective-sync.ts
changes: |
  COPY from PRD Section: "8. Konnective Sync Workflow"
  
  ADD retry logic with exponential backoff
  ADD dead letter queue for failures
  EMIT tracking events
validation:
  - command: "npm run test:workflows -- konnective-sync"
  - expect: "sync workflow tests pass"
```

### Phase 5: UI Components Enhancement

#### Task 5.1: Upgrade Checkout Form
```yaml
task_name: enhance_checkout_form
action: MODIFY
file: /Users/henryfuentes/Sites/webseed-checkout/src/app/checkout/page.tsx
changes: |
  ADD CollectJS integration for secure fields
  ADD real-time validation
  ADD loading states
  ADD error displays
  INTEGRATE with checkout API
  
  REFERENCE UI from:
  /Users/henryfuentes/Sites/nmi-checkout/src/app/checkout/page.tsx
validation:
  - command: "npm run dev && npm run test:e2e -- checkout-form"
  - expect: "form renders and processes payments"
```

#### Task 5.2: Implement Upsell Flow
```yaml
task_name: create_upsell_components
action: MODIFY
file: /Users/henryfuentes/Sites/webseed-checkout/src/app/upsell/page.tsx
changes: |
  ADD one-click purchase functionality
  ADD countdown timer
  ADD dynamic product display
  USE Customer Vault for instant checkout
  ADD decline handling
validation:
  - command: "npm run test:e2e -- upsell-flow"
  - expect: "upsell accepts and declines work"
```

### Phase 6: Testing Infrastructure

#### Task 6.1: Configure BrowserStack
```yaml
task_name: setup_browserstack
action: CREATE
file: /Users/henryfuentes/Sites/webseed-checkout/tests/e2e/browserstack.conf.ts
changes: |
  COPY configuration from PRD
  ADD device matrix (desktop + mobile)
  CONFIGURE parallel execution
  SET UP local testing tunnel
validation:
  - command: "npm run test:e2e:browserstack -- --list"
  - expect: "shows all configured browsers"
```

#### Task 6.2: Write E2E Tests
```yaml
task_name: create_e2e_tests
action: CREATE
file: /Users/henryfuentes/Sites/webseed-checkout/tests/e2e/checkout.spec.ts
changes: |
  CREATE comprehensive test suite:
  - Happy path checkout
  - Error handling
  - Mobile responsiveness
  - Performance metrics
  - Cross-browser compatibility
validation:
  - command: "npm run test:e2e"
  - expect: "all E2E tests pass"
```

### Phase 7: Environment Configuration

#### Task 7.1: Setup Environment Variables
```yaml
task_name: configure_environment
action: CREATE
file: /Users/henryfuentes/Sites/webseed-checkout/.env.example
changes: |
  ADD all required variables from PRD:
  - NMI credentials
  - Konnective credentials
  - Inngest keys
  - Sentry DSN
  - BrowserStack credentials
  - Feature flags
validation:
  - command: "cp .env.example .env.local && npm run validate:env"
  - expect: "environment validation passes"
```

## Rollback Strategy

### Phase-Based Rollback Plans

#### Phase 1 Rollback (Infrastructure)
```bash
# Remove monitoring dependencies
npm uninstall @sentry/nextjs inngest @playwright/test
# Delete configuration files
rm -rf sentry.*.config.ts instrumentation.ts
# Restore original package.json
git checkout package.json
```

#### Phase 2-3 Rollback (Services/API)
```bash
# Remove service directories
rm -rf src/services/nmi src/services/konnective
# Remove API routes
rm -rf src/app/api/checkout src/app/api/nmi src/app/api/konnective
# Clear Inngest functions
rm -rf src/inngest
```

#### Phase 4-5 Rollback (UI)
```bash
# Restore original checkout pages
git checkout src/app/checkout src/app/upsell
# Remove component enhancements
rm -rf src/components/checkout
```

### Data Rollback
- Customer Vault IDs remain valid (no action needed)
- Session data expires automatically (24 hours)
- No database migrations to revert

## Risk Mitigation

| Risk | Mitigation Strategy | Rollback Trigger |
|------|-------------------|------------------|
| Payment Processing Failure | Feature flag to disable new checkout | >5% error rate |
| Performance Degradation | Gradual rollout with monitoring | >3s load time |
| Browser Incompatibility | BrowserStack testing before deploy | Test failures |
| Security Vulnerability | Immediate patch or rollback | Any security alert |
| Integration Failure | Async processing with retry | >10% sync failures |

## Integration Points

### External Dependencies
- NMI API (payment processing)
- Konnective API (CRM)
- CollectJS CDN (tokenization)
- Inngest Cloud (event processing)
- Sentry (monitoring)
- BrowserStack (testing)

### Internal Dependencies
- Next.js 15+ (framework)
- React 19+ (UI library)
- TypeScript 5+ (type safety)
- Tailwind CSS (styling)

## Validation Checklist

- [ ] All TypeScript compiles without errors
- [ ] Unit tests achieve >80% coverage
- [ ] Integration tests pass
- [ ] E2E tests pass on all browsers
- [ ] Performance metrics meet targets
- [ ] Security audit passes
- [ ] Monitoring dashboards active
- [ ] Documentation complete
- [ ] Rollback tested and verified

## Success Criteria

The migration is considered successful when:
1. WebSeed checkout processes live payments via NMI
2. Customer Vault enables one-click upsells
3. Konnective receives order data automatically
4. Error rate remains below 1%
5. Page load times stay under 3 seconds
6. All BrowserStack tests pass
7. Monitoring shows healthy metrics

---

**Document Version**: 1.0  
**Migration Complexity**: High  
**Estimated Effort**: 3-4 weeks  
**Risk Level**: Medium (mitigated through phased approach)