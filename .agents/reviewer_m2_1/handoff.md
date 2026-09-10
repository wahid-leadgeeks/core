# Milestone 2 Review & Adversarial Challenge Report: Auth, Sessions & RBAC

**Reviewer**: `reviewer_m2_1` (Roles: Reviewer, Critic)  
**Target Milestone**: Milestone 2 — Authentication, Session Management, Server-Side RBAC & Audit System  
**Final Verdict**: **REQUEST_CHANGES**

---

## 1. Executive Summary & Review Verdict

### **Verdict: REQUEST_CHANGES**

While the cryptographic engine (`src/lib/crypto/cipher.ts`), the audit logging service (`src/domains/audit/service.ts`), the RBAC matrix (`src/lib/auth/rbac.ts`), and the Auditor read-only invariants are largely well-designed and feature-complete, **critical and high-severity functional defects and security vulnerabilities were discovered during adversarial review of `src/middleware.ts` and `src/lib/auth/session.ts`**:

1. **[CRITICAL] Infinite Redirect Loop on `/login` with Query String**:  
   In `src/middleware.ts`, `isPublic` checks `req.path === '/login'`. When `middleware()` passes `fullPath` (which includes query parameters like `?callbackUrl=...`), any redirected unauthenticated user arriving at `/login?callbackUrl=...` evaluates `isPublic === false` and triggers another redirect to `/login?callbackUrl=...`, resulting in an **infinite redirect loop (`ERR_TOO_MANY_REDIRECTS`)**. Unauthenticated users can never load the login page via a redirect!

2. **[HIGH] Identity Header Spoofing via Unsanitized `x-user-*` Request Headers**:  
   In `src/middleware.ts`, lines 189–204 copy incoming client headers (`new Headers(req.headers)`) without stripping `x-user-id`, `x-user-email`, `x-user-role`, or `x-user-dept`. In `src/lib/auth/session.ts`, lines 121–134 trust these headers. An external unauthenticated attacker can send forged `x-user-role: super_admin` headers to public or partially protected endpoints, achieving privilege escalation.

3. **[HIGH] Default-Allow Fallback for Unrecognized / Invalid Roles in Middleware**:  
   In `src/middleware.ts`, the route guard operates on an exclusion blacklist (`role === 'auditor'`, `role === 'asset_admin'`, `role === 'software_admin'`). If a session has an unrecognized role (e.g. `role: 'guest'`, `role: 'unknown'`, or `role: ''`), it falls through to line 139: `return { allowed: true, statusCode: 200 }`, granting full write access to core administrative APIs (`/api/accounts`, `/api/devices`, etc.).

---

## 2. Detailed Findings

### [Critical Finding 1] Infinite Redirect Loop on Login Page with Callback URL
- **Location**: `/home/noah/project/core/src/middleware.ts` (Lines 14–39, Lines 142–169)
- **Verbatim Code**:
  ```typescript
  // Lines 14-23 in evaluateRouteGuard:
  const isPublic =
    req.path === '/login' ||
    req.path.startsWith('/_next') ||
    req.path.startsWith('/api/auth') ||
    req.path === '/favicon.ico';

  if (isPublic) {
    return { allowed: true, statusCode: 200 };
  }

  // Lines 25-39:
  if (!req.session) {
    if (req.path.startsWith('/api/')) {
      return { allowed: false, statusCode: 401, errorMessage: '...' };
    }
    const callbackUrl = encodeURIComponent(req.path);
    return {
      allowed: false,
      statusCode: 302,
      redirectUrl: `/login?callbackUrl=${callbackUrl}`,
    };
  }

  // Lines 142-145, 160-169 in middleware():
  const { pathname, search } = req.nextUrl;
  const fullPath = `${pathname}${search}`;
  const guard = evaluateRouteGuard({ path: fullPath, method: req.method, session });
  if (!guard.allowed && guard.statusCode === 302 && guard.redirectUrl) {
    return NextResponse.redirect(new URL(guard.redirectUrl, req.url));
  }
  ```
- **Why this is a problem**:
  When an unauthenticated user visits `/accounts`, the middleware redirects them to `/login?callbackUrl=%2Faccounts`. When the browser loads `/login?callbackUrl=%2Faccounts`:
  - `pathname` is `'/login'` and `search` is `'?callbackUrl=%2Faccounts'`.
  - `fullPath` is `'/login?callbackUrl=%2Faccounts'`.
  - `evaluateRouteGuard` checks: `req.path === '/login'`.
  - `'/login?callbackUrl=%2Faccounts' === '/login'` evaluates to **`false`**!
  - `isPublic` is `false`.
  - `!req.session` is `true`.
  - The middleware returns another 302 redirect: `/login?callbackUrl=%2Flogin%3FcallbackUrl%3D%252Faccounts`!
  - This repeats indefinitely until the browser halts with `ERR_TOO_MANY_REDIRECTS`.
- **Root Cause in Test Suite**:
  In `tests/e2e/02-auth-and-sessions.test.mjs`, Tier 1 test 1 only tested `path: '/login'` without query parameters. Tier 4 Scenario 1 checked the initial redirect, but skipped testing whether loading the redirected target URL actually succeeded.
- **Required Fix**:
  In `evaluateRouteGuard`:
  ```typescript
  const normalizedPath = req.path.split('?')[0];
  const isPublic =
    normalizedPath === '/login' ||
    normalizedPath.startsWith('/_next') ||
    normalizedPath.startsWith('/api/auth') ||
    normalizedPath === '/favicon.ico';
  ```
  And in `tests/helpers/auth-helper.mjs`, synchronize this fix so the test suite and middleware are fully aligned.

---

### [High Finding 2] Identity Header Injection / Privilege Escalation via Unstripped `x-user-*` Headers
- **Location**: `/home/noah/project/core/src/middleware.ts` (Lines 189–204) & `src/lib/auth/session.ts` (Lines 121–134)
- **Verbatim Code**:
  ```typescript
  // src/middleware.ts:189-204
  const requestHeaders = new Headers(req.headers);
  if (session) {
    requestHeaders.set('x-user-id', session.id);
    requestHeaders.set('x-user-email', session.email);
    requestHeaders.set('x-user-role', session.role);
    if (session.departmentCode) {
      requestHeaders.set('x-user-dept', session.departmentCode);
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  ```
- **Why this is a problem**:
  `req.headers` contains untrusted client-supplied HTTP headers. If an unauthenticated request reaches an endpoint (such as `/api/auth/me` or any endpoint where `session` is absent), the client can provide their own `x-user-id: 11111111-1111-4111-8111-111111111111`, `x-user-email: amanda@leadgeeksinc.com`, and `x-user-role: super_admin`.
  In `src/lib/auth/session.ts` (lines 121–134), `getSession(req)` trusts `x-user-*` headers directly. Because `middleware.ts` never deletes client-supplied `x-user-*` headers when `!session`, the downstream handler receives the attacker's headers and authenticates the attacker as `super_admin`.
- **Required Fix**:
  Always sanitize and delete `x-user-*` headers from incoming request headers before downstream forwarding:
  ```typescript
  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete('x-user-id');
  requestHeaders.delete('x-user-email');
  requestHeaders.delete('x-user-role');
  requestHeaders.delete('x-user-dept');

  if (session) {
    requestHeaders.set('x-user-id', session.id);
    requestHeaders.set('x-user-email', session.email);
    requestHeaders.set('x-user-role', session.role);
    if (session.departmentCode) {
      requestHeaders.set('x-user-dept', session.departmentCode);
    }
  }
  ```

---

### [High Finding 3] Default-Allow Fallback on Unrecognized / Malformed Roles
- **Location**: `/home/noah/project/core/src/middleware.ts` (Lines 41–140)
- **Verbatim Code**:
  ```typescript
  const role = req.session.role;

  if (role === 'auditor' && req.method !== 'GET') { ... }
  if (req.path.startsWith('/audit') || req.path.startsWith('/api/audit')) { ... }
  if (req.path.includes('/credentials') && req.path.includes('/reveal')) { ... }
  if (role === 'asset_admin') { ... }
  if (role === 'software_admin') { ... }

  return { allowed: true, statusCode: 200 };
  ```
- **Why this is a problem**:
  Middleware follows a blacklist model instead of a whitelist. If a user presents a valid session token containing an unknown or arbitrary role string (e.g. `role: "guest"` or `role: "user"` or `role: ""`):
  - It does not match `auditor`, `asset_admin`, or `software_admin`.
  - It does not access `/audit` or `/credentials/.../reveal`.
  - It falls through directly to `return { allowed: true, statusCode: 200 }`.
  - An attacker with a low-privilege or arbitrary role can perform `POST`, `PUT`, `DELETE` operations on `/api/accounts`, `/api/devices`, etc.!
- **Required Fix**:
  Validate `role` against `VALID_ROLES`. If `role` is not recognized, deny access:
  ```typescript
  import { VALID_ROLES } from './lib/auth/mock';

  if (!VALID_ROLES.includes(role as any)) {
    return {
      allowed: false,
      statusCode: 403,
      errorMessage: 'Forbidden: Invalid or unrecognized role',
    };
  }
  ```
  Furthermore, enforce whitelist checks for sensitive domain writes.

---

### [Medium Finding 4] Unsigned / Unencrypted Base64 Session Cookies
- **Location**: `/home/noah/project/core/src/lib/auth/session.ts` (Lines 12–22, 28–68)
- **Why this is a problem**:
  `serializeSession()` and `deserializeSession()` encode the session object using unkeyed `Buffer.from(JSON.stringify(payload)).toString('base64')`. There is no cryptographic HMAC signature or encryption. Any user can tamper with the base64 string in their browser cookies to set `"role": "super_admin"`.
- **Suggestion**:
  While development mock auth is permitted per ADR-005, session cookies must be signed using HMAC-SHA256 (or AES-GCM encrypted using the existing crypto helper `cipher.ts`) so that client-side tampering is cryptographically rejected.

---

### [Minor Finding 5] Incongruous Test Assertion in `tests/e2e/02-auth-and-sessions.test.mjs`
- **Location**: `/home/noah/project/core/tests/e2e/02-auth-and-sessions.test.mjs` (Lines 106–110)
- **Verbatim Code**:
  ```javascript
  it('[Tier 2] rejects session with empty role string', () => {
    const malformedSession = { id: 'test-1', email: 'test@example.com', displayName: 'Test', role: '' };
    const res = evaluateRouteGuard({ path: '/accounts', method: 'GET', session: malformedSession });
    expect(res.allowed).toBe(true);
  });
  ```
- **Why this is a problem**:
  The test description explicitly states `[Tier 2] rejects session with empty role string`, but the assertion is `expect(res.allowed).toBe(true);`! The TypeScript equivalent (`02-auth-and-sessions.test.ts` lines 107-114) had an unfinished comment indicating write actions should be rejected, but the check was never implemented. This masked Finding 3 during testing.

---

## 3. Verified Claims

| Feature / Invariant | Status | Verification Method & Observation |
|---|:---:|---|
| **Auditor Read-Only Invariant** | **PASS** | Verified in `src/lib/auth/rbac.ts` (lines 146–154) and `src/middleware.ts` (lines 44–50). Any `POST`, `PUT`, `PATCH`, `DELETE` by Auditor returns HTTP 403 Forbidden. `can('auditor', action, resource)` returns `false` for all non-read actions. |
| **Auditor Credential Block** | **PASS** | Verified in `src/lib/auth/rbac.ts` (line 152) and `src/app/api/assets/[id]/credentials/reveal/route.ts` (lines 57–66). Auditor cannot read or reveal device credentials (HTTP 403). |
| **Audit Log Read Access** | **PASS** | Verified in `src/lib/auth/rbac.ts` (line 162), `src/middleware.ts` (lines 53–62), and `src/app/api/audit/route.ts` (lines 17–25). Exclusively accessible to `super_admin` and `auditor`. `it_admin`, `asset_admin`, `software_admin` receive HTTP 403. |
| **Audit Log Deletion Universal Block** | **PASS** | Verified in `src/lib/auth/rbac.ts` (line 141) and `src/domains/audit/service.ts` (lines 223–226). `attemptDelete()` throws `'FORBIDDEN: Deleting audit events is strictly prohibited'`. `can(role, 'delete', 'audit')` returns `false` for ALL roles without exception. |
| **AES-256-GCM Credential Encryption** | **PASS** | Verified in `src/lib/crypto/cipher.ts`. Uses 12-byte random IV (`crypto.randomBytes(12)`), 16-byte auth tag, serialized format `iv:authTag:ciphertext` in hex. Decryption verifies auth tag and throws on tampering. |
| **Zero Plaintext PIN Leakage** | **PASS** | Verified in `src/domains/audit/service.ts` (lines 45–57). `sanitizeMetadata` explicitly strips `pin`, `pinPlain`, `pin_plain`, `plainPin`, `pin_hash`, `pinHash`, `password`, `secret`. `route.ts` reveal logs `credential.reveal` with zero plain PIN in metadata. |
| **5 Roles in RBAC Matrix** | **PASS** | Verified in `src/lib/auth/rbac.ts` against `tests/fixtures/rbac-matrix.json`. All 5 roles (`super_admin`, `it_admin`, `asset_admin`, `software_admin`, `auditor`) match the matrix permissions precisely. |
| **Unauthenticated API Route Guard** | **PASS** | Verified in `src/middleware.ts` (lines 26–32). Unauthenticated requests to `/api/*` return JSON with HTTP 401 Unauthorized. |

---

## 4. Adversarial Attack Surface Analysis

### Attack Scenario 1: Unauthenticated User Page Access via Redirect
- **Hypothesis**: Unauthenticated user accessing `/accounts` is redirected to `/login?callbackUrl=%2Faccounts`. When browser follows redirect, `/login` should be served.
- **Result**: **FAILED (CRITICAL)**. Middleware checks `req.path === '/login'`. Because query parameter is present, `req.path` is `'/login?callbackUrl=%2Faccounts'`, which does not equal `'/login'`. Middleware redirects again to `/login?callbackUrl=%2Flogin%3F...`, causing an infinite redirect loop.
- **Blast Radius**: 100% of unauthenticated users trying to access protected pages are locked in an infinite redirect loop and cannot log in.
- **Mitigation**: Normalize route path in `evaluateRouteGuard` by stripping query parameters (`req.path.split('?')[0] === '/login'`).

### Attack Scenario 2: External Header Injection for Privilege Escalation
- **Hypothesis**: Attacker sends HTTP request to `/api/auth/me` with header `x-user-role: super_admin` and `x-user-id: 11111111-1111-4111-8111-111111111111`.
- **Result**: **FAILED (HIGH)**. Middleware does not strip client headers when `session` is null. It forwards client headers downstream. Downstream `getSession(req)` parses headers and grants `super_admin` permissions.
- **Blast Radius**: Full privilege escalation on public/unauthenticated routes that call `getSession()`.
- **Mitigation**: Delete all `x-user-*` headers in `middleware` before forwarding request to downstream handlers.

### Attack Scenario 3: Malformed Role Injection
- **Hypothesis**: Client tampers base64 session cookie to set `role: "contractor"`.
- **Result**: **FAILED (HIGH)**. Middleware does not validate role against `VALID_ROLES`. Because `contractor` is not `auditor`, `asset_admin`, or `software_admin`, middleware allows the request through to `/api/accounts` with `allowed: true`.
- **Blast Radius**: Unauthorized mutations permitted for any unrecognized role.
- **Mitigation**: Validate role against `VALID_ROLES` and default-deny unknown roles.

---

## 5. Logic Chain

1. **Observation 1**: `src/middleware.ts` evaluates `req.path === '/login'`, while `middleware()` passes `fullPath` (`pathname + search`).
2. **Logic Step 1**: When a query string exists (e.g. `?callbackUrl=...`), `req.path === '/login'` evaluates to `false`.
3. **Logic Step 2**: For an unauthenticated request where `isPublic` evaluates to `false`, lines 25–38 issue a 302 redirect back to `/login?callbackUrl=...`.
4. **Logic Step 3**: The redirected URL itself contains query parameters, so every subsequent request to `/login` also evaluates to `isPublic === false` and issues another redirect, resulting in an infinite redirect loop.
5. **Observation 2**: `src/middleware.ts` creates `requestHeaders = new Headers(req.headers)` and only mutates `x-user-*` if `session` exists.
6. **Logic Step 4**: Client-supplied `x-user-*` headers remain in `requestHeaders` if `session` is null.
7. **Logic Step 5**: `src/lib/auth/session.ts` reads `x-user-*` headers directly in `getSession(req)`, allowing unauthenticated callers to spoof their identity and role.
8. **Conclusion**: Code cannot be approved until these critical and high-severity security flaws are remediated.

---

## 6. Caveats

- Tests executed via code inspection and static analysis because direct interactive terminal command execution in subagent mode timed out waiting for user approval.
- Code logic was verified against the exact test definitions in `tests/e2e/02-auth-and-sessions.test.mjs`, `tests/e2e/03-rbac-permissions.test.mjs`, `tests/e2e/04-audit-logging.test.mjs`, and `tests/e2e/05-credential-encryption.test.mjs`.

---

## 7. Actionable Remediation Checklist for Worker

1. [ ] **Fix Infinite Redirect in `src/middleware.ts` & `tests/helpers/auth-helper.mjs`**:
   - In `evaluateRouteGuard`:
     ```typescript
     const pathname = req.path.split('?')[0];
     const isPublic =
       pathname === '/login' ||
       pathname.startsWith('/_next') ||
       pathname.startsWith('/api/auth') ||
       pathname === '/favicon.ico';
     ```
   - Verify that `evaluateRouteGuard({ path: '/login?callbackUrl=%2Faccounts', method: 'GET' })` returns `{ allowed: true, statusCode: 200 }`.
2. [ ] **Sanitize Client Headers in `src/middleware.ts`**:
   - Delete `x-user-id`, `x-user-email`, `x-user-role`, `x-user-dept` from `requestHeaders` before setting authenticated values.
3. [ ] **Enforce Role Whitelist in `src/middleware.ts` & `src/lib/auth/session.ts`**:
   - Check `if (!VALID_ROLES.includes(role as any))` and reject with 403 Forbidden.
   - In `deserializeSession`, reject or nullify sessions with invalid roles.
4. [ ] **Update Suite 02 Tests**:
   - Add test: `it('[Tier 1] allows public access to /login with callbackUrl query string')`.
   - Correct the anomaly in Tier 2 test: `it('[Tier 2] rejects session with empty role string')` so it tests write rejection or 403.

---

## 8. Verification Method

To verify the fixes once implemented:
1. Run Suite 02:
   ```bash
   node tests/runner.mjs --suite=02
   ```
2. Run Suite 03:
   ```bash
   node tests/runner.mjs --suite=03
   ```
3. Verify unauthenticated redirect manually:
   - Request `GET /accounts` -> Expect 302 redirect to `/login?callbackUrl=%2Faccounts`.
   - Request `GET /login?callbackUrl=%2Faccounts` -> Expect 200 OK (Allowed).
4. Verify header spoofing rejection:
   - Request `GET /api/auth/me` with header `x-user-role: super_admin` and no session cookie -> Expect 401 Unauthorized.
