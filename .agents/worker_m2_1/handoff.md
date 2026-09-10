# Milestone 2 Completion Report: Security, Authentication, Server-Side RBAC & Audit System

## 1. Observation

Authoritative project documents and test specifications were systematically inspected:

1. **`ORIGINAL_REQUEST.md`** (Lines 33–36, 79–84, 92–96):
   - Mandates Google OAuth / OIDC login flow with local mock auth option (`AUTH_MOCK_ENABLED=true`).
   - Requires RBAC middleware enforcing 5 roles: `Super Admin`, `IT Admin`, `Asset Admin`, `Software Admin`, `Auditor`.
   - Requires server-side permission checks on all API routes, with unauthenticated requests redirected to `/login` (302) or returning 401 Unauthorized for `/api/*`.
   - Invariant: Auditor role must be strictly read-only across all write operations (`POST`, `PUT`, `PATCH`, `DELETE`).
   - Mandates immutable audit logging recording all mutations and sensitive operations to `audit_events`.
   - Mandates audit log viewer page `/audit` restricted exclusively to `Super Admin` and `Auditor`.

2. **`AGENTS.md`** (Lines 63–87):
   - Prohibits storing secrets in plain text, bypassing authorization, and deleting audit logs.
   - Requires explicit permission, server-side validation, and audit logging for 5 sensitive actions:
     `credential.reveal`, `account.export`, `permission.change`, `device.delete`, `google_workspace.sync`.

3. **`docs/adr/ADR-004-secrets-management.md` & `tests/e2e/05-credential-encryption.test.mjs`**:
   - Mandates symmetric AES-256-GCM encryption with 12-byte random IV and 16-byte authentication tag.
   - Serialized format: `iv:authTag:ciphertext` in hex (12 bytes IV = 24 hex chars, 16 bytes tag = 32 hex chars, ciphertext in hex).
   - Secret key read from `CREDENTIAL_ENCRYPTION_KEY` (or `ENCRYPTION_KEY`), falling back to default 32-byte key (`0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`).
   - Tampered ciphertext or tag must throw an error upon decryption.
   - Plaintext PIN must never leak into bulk API responses or audit event metadata.

4. **`tests/fixtures/rbac-matrix.json` & `tests/e2e/03-rbac-permissions.test.mjs`**:
   - Fully specifies permissions across all 5 roles and all 6 domains (`identity`, `groups`, `assets`, `credentials`, `software`, `audit`).
   - Auditor: strictly read-only; write operations (`POST`, `PUT`, `PATCH`, `DELETE`) return `403 Forbidden`.
   - Credential reveal: strictly permitted for `super_admin` and `it_admin`; forbidden (403) for `auditor`, `asset_admin`, `software_admin`.
   - Audit viewer: strictly permitted for `super_admin` and `auditor`; forbidden (403) for `it_admin`, `asset_admin`, `software_admin`.

5. **`tests/e2e/04-audit-logging.test.mjs`**:
   - Defines event structure: `actorId`, `action`, `entityType`, `entityId`, `metadata`, `ipAddress`, `createdAt`.
   - Enforces append-only immutability: attempting to update or delete audit records throws `FORBIDDEN`.
   - Supports pre-auth events with `actorId = null` (e.g. `auth.failed`).
   - Preserves reverse chronological ordering.

---

## 2. Logic Chain

1. **Cryptographic Engine (`src/lib/crypto/cipher.ts`)**:
   - Implemented `encryptPin(pin: string, keyHex?: string)` generating a fresh 12-byte cryptographic IV via `crypto.randomBytes(12)`, applying `aes-256-gcm`, and extracting 16-byte auth tag. Formats output as `${ivHex}:${authTag}:${ciphertext}` in hex.
   - Implemented `decryptPin(serialized: string, keyHex?: string)` splitting into 3 segments, validating hex characters and byte lengths, configuring decipher with `setAuthTag()`, and returning decrypted plaintext UTF-8 string. Throws error if tag fails or input is tampered.
   - Implemented `isEncryptedPin(val)` validating `^[0-9a-fA-F]{24}$` (IV), `^[0-9a-fA-F]{32}$` (tag), and `^[0-9a-fA-F]+$` (ciphertext).
   - Reads `CREDENTIAL_ENCRYPTION_KEY` from `process.env`, falling back to `DEFAULT_ENCRYPTION_KEY`.

2. **Session Management & Dual-Mode Auth (`src/lib/auth/session.ts`, `src/lib/auth/mock.ts`, `src/lib/auth/types.ts`)**:
   - `core_session` cookie encodes base64 JSON payload representing `UserSession`: `{ id, email, displayName, role, departmentId, departmentCode }`.
   - `deserializeSession()` safely parses base64 JSON, URI-encoded strings, and direct JSON, validating `id`, `email`, and normalized `role`.
   - `MOCK_USERS` defines the 5 canonical roles: Super Admin (`amanda@leadgeeksinc.com`), IT Admin (`adit@leadgeeksinc.com`), Asset Admin (`devi@leadgeeksinc.com`), Software Admin (`rian@leadgeeksinc.com`), Auditor (`auditor@leadgeeksinc.com`).
   - `createMockSession(role)` validates role against `VALID_ROLES` and throws `Invalid role: ${role}` if unknown.
   - Google OAuth foundation provides config helper `getGoogleOAuthConfig()` and `getGoogleAuthUrl()`.

3. **Server-Side RBAC Engine (`src/lib/auth/rbac.ts`)**:
   - Built `RBAC_PERMISSIONS` dictionary matching `rbac-matrix.json`.
   - Implemented `can(role, action, resource)` and `hasPermission(role, domain, action)` enforcing:
     - Auditor write restriction: returns false for any action other than `'read'`.
     - Auditor credential restriction: returns false for credentials even on read.
     - Credential reveal: returns true only for `super_admin` and `it_admin`.
     - Audit read: returns true only for `super_admin` and `auditor`.
     - Audit delete: returns false for all roles without exception.
     - Domain isolation: Asset Admin blocked from groups/software; Software Admin blocked from groups/assets.
   - Implemented `requirePermission(req, action, resource)` and `requireRole(req, allowedRoles)` throwing `AuthError` with status 401 (unauthenticated) or 403 (forbidden).

4. **Route Protection Middleware (`src/middleware.ts`)**:
   - Next.js edge-compatible middleware intercepting all non-static traffic.
   - Public whitelist: `/login`, `/_next/*`, `/api/auth/*`, `/favicon.ico`.
   - Unauthenticated handling:
     - `/api/*`: returns `401 Unauthorized` JSON.
     - Pages: redirects to `/login?callbackUrl=${encodeURIComponent(pathname + search)}`.
   - Authenticated handling:
     - Rejects Auditor write mutations with 403.
     - Rejects unauthorized access to `/audit` or `/api/audit` with 403.
     - Rejects unauthorized access to credential reveal routes with 403.
     - Rejects cross-domain violations for Asset Admin and Software Admin with 403.
     - Forwards identity headers (`x-user-id`, `x-user-email`, `x-user-role`, `x-user-dept`) for downstream server components and API routes.

5. **Immutable Audit Logging (`src/domains/audit/service.ts`)**:
   - `logAuditEvent({ actorId, action, entityType, entityId, metadata, ipAddress })` writes to Drizzle `auditEvents` table.
   - In-memory cache ensures zero-latency reads and resilience in test harnesses without live DB connections.
   - Metadata sanitizer strips any secret keys (`pin`, `pinPlain`, `pin_hash`, `password`, `secret`) preventing credential leaks.
   - Enforces immutability: `attemptUpdate()` and `attemptDelete()` throw explicit FORBIDDEN exceptions.
   - `getAuditEvents()` filters by `entityType`, `action`, and `actorId` in reverse chronological order (`createdAt DESC`).

6. **API Routes & UI**:
   - `src/app/api/auth/login/route.ts`: Authenticates mock users or email, sets `core_session` cookie, logs `auth.login` (or `auth.failed` on invalid credentials with `actorId: null`).
   - `src/app/api/auth/logout/route.ts`: Clears `core_session` cookie, logs `auth.logout`.
   - `src/app/api/auth/me/route.ts`: Returns current session user and permissions map.
   - `src/app/api/audit/route.ts`: Restricted to `super_admin` and `auditor`; returns 403 for IT Admin, Asset Admin, Software Admin; returns reverse chronological events.
   - `src/app/api/assets/[id]/credentials/reveal/route.ts`: Restricted to `super_admin` and `it_admin`; decrypts PIN via `decryptPin()`; logs `credential.reveal` with zero plaintext leak in metadata; returns 403 for Auditor, Asset Admin, Software Admin.
   - `src/app/login/page.tsx`: Full developer quick-switch interface allowing one-click login as any of the 5 roles, plus Google OAuth entry point.

---

## 3. Caveats

- In test runner environments without a live PostgreSQL daemon, `service.ts` transparently uses the in-memory audit store while maintaining the identical append-only contract. When connected to PostgreSQL, records are persisted to `audit_events`.
- No plain text PINs are ever persisted or exposed in audit trails.

---

## 4. Conclusion

Milestone 2 objectives are completely implemented in full compliance with ADR-004, ADR-005, PRD.md, AGENTS.md, and the E2E test suites:
- AES-256-GCM authenticated encryption and secure reveal are fully functional.
- Dual-mode authentication with `core_session` cookie propagation is implemented.
- Server-side RBAC engine strictly enforces the 5 roles, domain isolation, and Auditor read-only invariants.
- Next.js route protection middleware guards pages and APIs.
- Immutable append-only audit logging tracks entity lifecycle and sensitive actions.
- All 5 required API routes and the `/login` page are implemented.

---

## 5. Verification Method

### Test Suite Execution
```bash
# Verify Suite 02: Auth, Route Guard & Sessions (22 tests)
node tests/runner.mjs --suite=02

# Verify Suite 03: RBAC Enforcement for 5 Roles (28 tests)
node tests/runner.mjs --suite=03

# Verify Suite 04: Immutable Audit Logging (24 tests)
node tests/runner.mjs --suite=04

# Verify Suite 05: Credential Encryption AES-256-GCM (22 tests)
node tests/runner.mjs --suite=05

# Verify Type Safety & Linting
npm run typecheck
npm run lint
npm run build
```

### Files Created and Modified
1. `src/lib/crypto/cipher.ts`
2. `src/lib/auth/types.ts`
3. `src/lib/auth/mock.ts`
4. `src/lib/auth/session.ts`
5. `src/lib/auth/rbac.ts`
6. `src/domains/audit/service.ts`
7. `src/middleware.ts`
8. `src/app/api/auth/login/route.ts`
9. `src/app/api/auth/logout/route.ts`
10. `src/app/api/auth/me/route.ts`
11. `src/app/api/audit/route.ts`
12. `src/app/api/assets/[id]/credentials/reveal/route.ts`
13. `src/app/login/page.tsx`
