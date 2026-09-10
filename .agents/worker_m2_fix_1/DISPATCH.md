## 2026-09-08T18:11:14Z

You are a teamwork_preview_worker implementing the remediation for Milestone 2: Security, Authentication, Server-Side RBAC & Audit System for CORE.
Your working directory is: /home/noah/project/core/.agents/worker_m2_fix_1
Your parent conversation ID is: 2a2e0c6b-97bf-45c3-8284-e57d986edeac

MANDATORY: Read /home/noah/project/core/ORIGINAL_REQUEST.md before starting work. Do NOT skip reading this file.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context & Reviewer Feedback:
Read /home/noah/project/core/.agents/reviewer_m2_1/handoff.md carefully.
Reviewer caught 3 critical/high findings in Milestone 2:
1. Infinite Redirect Loop on `/login` with Query String:
   In `src/middleware.ts` and `tests/helpers/auth-helper.mjs`, `evaluateRouteGuard` checks `req.path === '/login'`. When redirected with query parameters (e.g. `?callbackUrl=...`), `isPublic` evaluates to false, causing an infinite redirect loop (ERR_TOO_MANY_REDIRECTS).
   Fix: Normalize path using `const pathname = req.path.split('?')[0];` and test `pathname === '/login'`.
2. Identity Header Spoofing via Unsanitized `x-user-*` Request Headers:
   In `src/middleware.ts`, incoming client headers (`new Headers(req.headers)`) are copied without deleting `x-user-id`, `x-user-email`, `x-user-role`, `x-user-dept`. In `src/lib/auth/session.ts`, `getSession(req)` trusts these headers directly.
   Fix: Explicitly delete `x-user-id`, `x-user-email`, `x-user-role`, `x-user-dept` from `requestHeaders` before attaching authenticated session headers.
3. Default-Allow Fallback on Unrecognized / Malformed Roles:
   In `src/middleware.ts`, unhandled roles fall through to `{ allowed: true, statusCode: 200 }`.
   Fix: Enforce role whitelisting against `VALID_ROLES` (`super_admin`, `it_admin`, `asset_admin`, `software_admin`, `auditor`). Return 403 Forbidden for unknown or malformed roles.
   In `src/lib/auth/session.ts`, validate roles upon deserialization.
4. Align test helpers and test files:
   - Ensure `tests/helpers/auth-helper.mjs` has the identical `evaluateRouteGuard` logic.
   - Update `tests/e2e/02-auth-and-sessions.test.mjs` and `tests/e2e/02-auth-and-sessions.test.ts` to test `/login?callbackUrl=...` access and verify empty/invalid role rejection.

Your Verification Checklist:
- Run: `node tests/runner.mjs --suite=02` (all 22+ tests pass)
- Run: `node tests/runner.mjs --suite=03` (all 28 tests pass)
- Run: `node tests/runner.mjs --suite=04` (all 24 tests pass)
- Run: `node tests/runner.mjs --suite=05` (all 22 tests pass)
- Run: `npm run typecheck`
- Run: `npm run lint`
- Run: `npm run build`

Write your completion report to /home/noah/project/core/.agents/worker_m2_fix_1/handoff.md.
Maintain progress in /home/noah/project/core/.agents/worker_m2_fix_1/progress.md.
When finished, send a message to parent (ID: 2a2e0c6b-97bf-45c3-8284-e57d986edeac).
