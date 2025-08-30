# E2E Testing Guidelines

## 🚨 CRITICAL: ALWAYS USE EXISTING TESTS

### Primary Test File
**USE THIS TEST:** `/tests/e2e/test-complete-flow-fresh.js`

This is the **ONLY** test file that should be used for validating the checkout flow. It is complete, working, and covers all critical paths.

## ⛔ DO NOT:
- Create new test files
- Modify the existing test structure
- Change test assertions
- Add duplicate tests

## ✅ DO:
- Always run `test-complete-flow-fresh.js` for validation
- Use this test to verify no regressions after changes
- Rely on this test's passing status as the source of truth

## Running the Test

```bash
# Standard test run
npm run test:e2e

# With visible browser (for debugging)
npm run test:e2e:visible

# Specific test file (if needed)
npm run test:e2e -- tests/e2e/test-complete-flow-fresh.js
```

## Test Coverage

`test-complete-flow-fresh.js` validates:
- ✅ Complete checkout form submission
- ✅ All form validations
- ✅ CollectJS payment token generation
- ✅ NMI payment processing
- ✅ Session management
- ✅ Upsell flow navigation
- ✅ Thank you page confirmation
- ✅ Error handling and user feedback

## Test Requirements

The test expects:
- Dev server running on port 3255
- Valid NMI test credentials in `.env.local`
- CollectJS properly configured
- All API endpoints functional

## Validation Criteria

**The checkout system is considered working if and only if:**
1. `test-complete-flow-fresh.js` passes without modifications
2. No errors in console during test execution
3. All assertions in the test pass

## Why This Matters

This test file represents months of refinement and captures all edge cases discovered during development. Creating new tests or modifying this one risks:
- Missing critical validation points
- Introducing false positives
- Losing accumulated test wisdom
- Duplicating effort unnecessarily

## For AI Assistants

**MANDATORY PROCESS:**
1. Check for existing tests by reading this README
2. Use `test-complete-flow-fresh.js` exclusively
3. Never create new test files
4. Report test results without modification
5. If test fails, fix the code, not the test

---

Last Updated: 2025-08-30
Test File Version: STABLE - DO NOT MODIFY