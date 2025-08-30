# 🧠 Unified Claude Rulebook  
**Archon = Project Manager (control plane)**  
**Claude-Flow = Orchestrator (coordination plane)**  
**Claude Code = Executor (execution plane)**  

---

## 🚨 0) Prime Directive: ARCHON-FIRST
- Always start with **Archon MCP server**.  
- **Steps:**  
  1. Load current project/task via `archon:manage_task`.  
  2. If none, create/select one.  
  3. Research with `archon:perform_rag_query` + `archon:search_code_examples`.  
  4. Only then move to orchestration/execution.  

**Violation check:** If you wrote todos or code before touching Archon, **restart**.  

---

## 1) Roles & Boundaries  
**Archon (Control Plane / PM)**  
- Project/task truth, lifecycle (`todo → doing → review → done`).  
- Research + knowledge via RAG and code examples.  

**Claude-Flow (Orchestration Plane)**  
- Set up topologies, workflows, agent *types*.  
- MCP calls: `swarm_init`, `agent_spawn`, `task_orchestrate`.  

**Claude Code (Execution Plane)**  
- Primary executor: Task tool spawns **working agents** in parallel.  
- Does all file ops, code, bash, tests, lint/typecheck, git.  
- `TodoWrite` = only for **secondary notes** after Archon setup.  

---

## 2) Concurrency & Batching  
- **1 message = all related operations.**  
- **Batch**: tasks, todos, files, bash, memory.  
- **Never write to repo root**. Use: `/src`, `/tests`, `/docs`, `/config`, `/scripts`, `/examples`.  

---

## 3) Canonical Agentic Pattern  

### A) Control + Orchestration (Archon + Claude-Flow)  
```bash
archon:manage_task(action="list", filter_by="status", filter_value="todo")
archon:manage_task(action="get", task_id="[id]")
archon:perform_rag_query(query="[topic]", match_count=4)
archon:search_code_examples(query="[pattern]", match_count=3)
archon:manage_task(action="update", task_id="[id]", update_fields={"status":"doing"})

mcp__claude-flow__swarm_init { topology:"mesh", maxAgents:6 }
mcp__claude-flow__agent_spawn { type:"researcher" }
mcp__claude-flow__agent_spawn { type:"coder" }
mcp__claude-flow__agent_spawn { type:"tester" }
mcp__claude-flow__task_orchestrate { plan:"SPARC TDD for [feature]" }
```

### B) Execution (Claude Code — Task Tool)  
```javascript
Task("Research","Summarize Archon findings","researcher")
Task("Coder","Implement feature in /src","coder")
Task("Tester","Write failing tests in /tests","tester")
Task("Reviewer","Review & log notes","reviewer")

Bash("mkdir -p src tests docs config scripts && npm run lint || true && npm run typecheck || true")

Write "tests/feature.spec.ts"
Write "src/feature.ts"

TodoWrite {
  todos: [
    {id:"t1", content:"Write failing tests first", status:"pending"},
    {id:"t2", content:"Implement feature to pass tests", status:"pending"},
    {id:"t3", content:"Security review", status:"pending"}
  ]
}

Bash("npm run test && npm run build")
```

### C) Close Loop (Archon Sync)  
```bash
archon:manage_task(action="update", task_id="[id]", update_fields={"status":"review"})
```

---

## 4) SPARC + TDD with Claude-Flow  
- `sparc run spec-pseudocode "<task>"`  
- `sparc run architect "<task>"`  
- `sparc tdd "<feature>"`  
- `sparc run integration "<task>"`  
- Batch/pipeline for parallel phases.  

---

## 5) File/Repo Discipline  
- Never write to root.  
- Prefer **editing existing files**.  
- Only create docs/README if **explicitly asked**.  

---

## 6) Quality Gates  
- Tests first (TDD).  
- ~90% coverage.  
- No secrets in code.  
- Security review mandatory.  
- Update Archon after each task.

---

## 6.1) E2E Testing Rules
**🚨 CRITICAL: USE EXISTING TESTS**
- **ALWAYS** read `/tests/e2e/README.md` before any testing work
- **NEVER** create new test files without checking for existing ones
- **DEFAULT TEST**: `/tests/e2e/test-complete-flow-fresh.js`
- This test is complete and covers all critical paths
- If test fails, fix the code, NOT the test  

---

## 7) Quickstart Snippets  
**Add Claude-Flow MCP:**  
```bash
claude mcp add claude-flow npx claude-flow@alpha mcp start
```

**Spawn Worker Agents (Claude Code):**  
```javascript
Task("Coder","Implement /src module","coder")
Task("Tester","Write failing tests in /tests","tester")
Task("Reviewer","Security check","reviewer")
```

---

## ✅ Success Criteria  
- Implemented per Archon research.  
- Tests passing.  
- Lint/typecheck clean.  
- Archon updated (`doing → review → done`).

---

## 📝 Important Testing Reminders
- **ALWAYS** check `/tests/e2e/README.md` before any test work
- **NEVER** create new test files - use existing ones
- **DEFAULT TEST**: `/tests/e2e/test-complete-flow-fresh.js`
- If test fails, fix the code, NOT the test

---

## 🎯 Webseeds Checkout Development Insights

### Critical Service Patterns

#### CollectJS Service (Payment Tokenization)
```typescript
// ALWAYS initialize as singleton at component level
const collectJSService = getCollectJSService()

// Initialize with Promise-based pattern for fieldsAvailableCallback
await collectJSService.initialize({
  fieldSelectors: { cardNumber: '#ccnumber', expiry: '#ccexp', cvv: '#cvv' },
  onToken: (result) => { /* handle token */ },
  onValidation: (field, status, message) => { /* field validation */ },
  onReady: () => { /* service ready */ },
  onError: (error) => { /* handle errors */ }
})

// Check readiness before operations
if (!collectJSService.isReady()) {
  // Wait or show loading state
}
```

#### Validation Pattern (Centralized)
```typescript
// ALWAYS use centralized validation from /src/lib/validation
import { 
  validateCheckoutForm,
  validateField,
  createUserFriendlyValidationErrors 
} from '@/lib/validation'

// NEVER create duplicate validation functions
// NEVER use inline validation
// ALWAYS convert errors to user-friendly messages
```

### Common Pitfalls & Solutions

#### ❌ DON'T: Create duplicate validation
```typescript
// WRONG - Creating new validation
const validateEmail = (email) => { ... }
const validatePhone = (phone) => { ... }
```

#### ✅ DO: Use centralized validation
```typescript
// RIGHT - Import from validation library
import { validateEmail, validatePhone } from '@/lib/validation'
```

#### ❌ DON'T: Initialize CollectJS multiple times
```typescript
// WRONG - Multiple initializations
useEffect(() => { collectJSService.initialize(...) })
useEffect(() => { collectJSService.initialize(...) }) // Duplicate!
```

#### ✅ DO: Initialize once with proper cleanup
```typescript
// RIGHT - Single initialization
useEffect(() => {
  const init = async () => {
    await collectJSService.initialize(...)
  }
  init()
  return () => collectJSService.reset() // Cleanup
}, []) // Empty dependency array
```

### Project Structure Best Practices

#### Service Layer
- `/src/lib/` - Core services (CollectJS, validation, session)
- `/src/services/` - External integrations (NMI, APIs)
- Always use singleton pattern for services
- Handle async initialization with Promises

#### Component Layer
- `/components/` - React components
- NewDesignCheckoutForm.tsx is the PRIMARY checkout form
- ModernCheckoutForm.tsx is DEPRECATED - do not use
- Always check for existing components before creating new ones

#### Testing Layer
- `/tests/e2e/test-complete-flow-fresh.js` - ONLY E2E test
- Never create duplicate tests
- Test validates entire checkout flow including CollectJS
- Run with: `node tests/e2e/test-complete-flow-fresh.js`

### Session Management Architecture
```typescript
// UnifiedSessionManager handles multi-tier sessions
// 1. Browser cookies (encrypted)
// 2. Server-side storage
// 3. Database persistence

// Session used for upsells after initial payment
sessionManager.createSession({
  orderId: result.orderId,
  customerId: result.customerId,
  paymentMethodId: result.paymentMethodId
})
```

### Security Requirements
- **PCI Compliance**: Never log card data
- **Token Usage**: CollectJS tokens are single-use
- **Session Security**: HTTP-only, Secure, SameSite cookies
- **Validation**: Always validate input with Zod schemas
- **Environment**: Use sandbox keys in development

### Performance Targets
- CollectJS initialization: <3 seconds
- Form validation: <100ms per field
- Token generation: <2 seconds
- Page load: <2.5s LCP, <100ms FID
- Always check Web Vitals dashboard in development

### Development Workflow
1. Check Archon tasks first
2. Read existing code before creating
3. Use centralized validation library
4. Test with E2E (test-complete-flow-fresh.js)
5. Run lint/typecheck before completion
6. Update Archon task status

### Quick Reference Paths
- Main Checkout Form: `/components/NewDesignCheckoutForm.tsx`
- CollectJS Service: `/src/lib/collectjs-service.ts`
- Validation Library: `/src/lib/validation/index.ts`
- Session Manager: `/src/lib/cookie-session.ts`
- NMI Service: `/src/services/nmi/NMIService.ts`
- Primary E2E Test: `/tests/e2e/test-complete-flow-fresh.js`
- Documentation: `/docs/COLLECTJS_INTEGRATION.md`  
