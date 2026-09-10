## 2026-09-08T17:54:24Z

You are a teamwork_preview_worker implementing Milestone 2: Security, Authentication, Server-Side RBAC & Audit System for CORE.
Your working directory is: /home/noah/project/core/.agents/worker_m2_1
Your parent conversation ID is: 2a2e0c6b-97bf-45c3-8284-e57d986edeac

MANDATORY: Read /home/noah/project/core/ORIGINAL_REQUEST.md before starting work. Do NOT skip reading this file.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Reference Documents:
- /home/noah/project/core/.agents/orchestrator_1/PROJECT.md
- /home/noah/project/core/.agents/spec_miner_survey_2/handoff.md (Detailed Auth, RBAC matrix, and Audit specifications)
- /home/noah/project/core/.agents/explorer_survey_1/handoff.md
- /home/noah/project/core/PRD.md
- /home/noah/project/core/AGENTS.md
- /home/noah/project/core/TEST_READY.md

Your Objectives:
1. Implement AES-256-GCM authenticated cipher in `src/lib/crypto/cipher.ts` per ADR-004:
   - Encrypts PIN with random 12-byte IV and 16-byte auth tag. Output formatted as `iv:authTag:ciphertext` in base64 or hex.
   - Decrypts ciphertext, throwing an error if authentication tag fails.
   - Reads `CREDENTIAL_ENCRYPTION_KEY` from environment (falling back to a 32-byte hex key in development).
2. Implement Session Management & Dual-Mode Auth in `src/lib/auth/session.ts` and `src/lib/auth/mock.ts`:
   - Session cookies (`core_session`) containing user ID, email, display name, and system role.
   - Google OAuth / OIDC flow foundation and local mock auth role switcher (`AUTH_MOCK_ENABLED=true`) allowing login as Super Admin, IT Admin, Asset Admin, Software Admin, and Auditor.
3. Implement Server-Side RBAC Engine in `src/lib/auth/rbac.ts`:
   - 5 roles: `Super Admin`, `IT Admin`, `Asset Admin`, `Software Admin`, `Auditor`.
   - Implement `can(role, action, resource)`, `requirePermission(req, action, resource)`, and `requireRole(req, allowedRoles)`.
   - Enforce Auditor read-only: any write (`POST`, `PUT`, `PATCH`, `DELETE`) by an Auditor returns `403 Forbidden`.
   - Enforce domain isolation (Asset Admin cannot manage Software, Software Admin cannot manage Assets, etc.).
4. Implement Route Protection Middleware in `src/middleware.ts`:
   - Redirect unauthenticated requests to `/login`.
   - Return `401 Unauthorized` for unauthenticated requests to protected `/api/*` endpoints.
   - Allow public access only to `/login`, `/api/auth/login`, and static assets.
5. Implement Immutable Audit Logging in `src/domains/audit/service.ts`:
   - Function `logAuditEvent({ actorId, action, entityType, entityId, metadata, ipAddress })` writing to `audit_events`.
   - Enforce audit event emission on all CUD operations and the 5 sensitive actions from AGENTS.md: `credential.reveal`, `account.export`, `permission.change`, `device.delete`, `google_workspace.sync`.
   - Strictly append-only: no update or delete operations on `audit_events`.
6. Implement API Routes:
   - `src/app/api/auth/login/route.ts` (authenticates via mock or OAuth, sets session cookie)
   - `src/app/api/auth/logout/route.ts` (clears session cookie)
   - `src/app/api/auth/me/route.ts` (returns current session user and permissions)
   - `src/app/api/audit/route.ts` (GET audit log: restricted exclusively to Super Admin and Auditor, returns 403 Forbidden for IT Admin, Asset Admin, Software Admin)
   - `src/app/api/assets/[id]/credentials/reveal/route.ts` (POST: requires Super Admin or IT Admin, decrypts PIN using AES-256-GCM, records `credential.reveal` in `audit_events`, returns 403 Forbidden for Auditor/Asset Admin/Software Admin)
7. Run Verifications:
   - `node tests/runner.mjs --suite=02` (Auth and Sessions: 22 tests)
   - `node tests/runner.mjs --suite=03` (RBAC Permissions: 28 tests)
   - `node tests/runner.mjs --suite=04` (Audit Logging: 24 tests)
   - `node tests/runner.mjs --suite=05` (Credential Encryption: 22 tests)
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
