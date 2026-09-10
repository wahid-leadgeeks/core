# Phase 0 Survey Handoff: Security, Authentication, RBAC, and Audit Logging

## 1. Observation

Authoritative project documents were systematically inspected in `/home/noah/project/core`:

1. **`ORIGINAL_REQUEST.md`**:
   - Lines 33–36: **R2. Authentication and authorization**:
     > "Google OAuth / OIDC login flow for administrators. RBAC middleware enforcing 5 roles (Super Admin, IT Admin, Asset Admin, Software Admin, Auditor) with server-side permission checks on all API routes. Unauthenticated requests must be redirected to login. Auditor role must be read-only. Include an audit logging system that records all create, update, delete, and sensitive operations to the `audit_events` table."
   - Lines 51–54: **R5. Audit trail visibility**:
     > "An audit log page (accessible to Super Admin and Auditor roles) that displays audit events in reverse chronological order with actor, action, entity type, entity ID, and timestamp. Basic filtering by entity type and action."
   - Lines 79–84: **Acceptance Criteria — Authentication and RBAC work**:
     > "- [ ] Unauthenticated users cannot access any page except login\n- [ ] Login page initiates Google OAuth flow (or mock auth for local development)\n- [ ] Auditor role cannot create, update, or delete any resource\n- [ ] API routes return 403 for unauthorized actions"
   - Lines 92–96: **Acceptance Criteria — Audit logging works**:
     > "- [ ] Create, update, and delete operations generate audit_events records\n- [ ] Audit log page displays events with actor, action, entity, and timestamp\n- [ ] Audit log page is accessible only to Super Admin and Auditor roles"

2. **`AGENTS.md`**:
   - Lines 63–71: **Forbidden**:
     > "Agents must not:\n- Store secrets in plain text\n- Bypass authorization\n- Modify unrelated modules\n- Delete audit logs\n- Hardcode credentials\n- Expose sensitive API responses\n- Assume Google API operations succeeded"
   - Lines 73–87: **Sensitive Data & Operations**:
     > "Sensitive operations require:\n- Explicit permission\n- Server-side validation\n- Audit logging\nExamples:\n- Reveal credential\n- Export accounts\n- Change permissions\n- Delete assets\n- Synchronize Google Workspace"

3. **`PRD.md`**:
   - Lines 56–77: **Users / Roles**:
     > "- Super Admin: Full system access.\n- IT Admin: Accounts, Google Workspace, devices, software.\n- Asset Admin: Hardware and asset assignments.\n- Software Admin: Applications, licenses, subscriptions.\n- Auditor: Read-only access to approved resources and audit logs."

4. **`ARCHITECTURE.md`**:
   - Lines 78–85:
     > "### Authentication: Google OAuth / OIDC\n### Authorization: RBAC + Permissions"
   - Lines 92–95:
     > "### Secrets: External Secret Manager or encrypted secrets layer"

5. **`docs/adr/ADR-004-secrets-management.md`**:
   - Lines 1–25:
     > "Decision: Passwords, PINs, recovery codes, and secrets must not be stored as plain database fields.\nRequirements: Encryption at rest, Restricted access, Reveal logging, Permission checks, Re-authentication, Secret rotation tracking.\nPrinciple: Metadata may be widely visible. Secrets require explicit authorization."

6. **`docs/adr/ADR-005-rbac.md`**:
   - Lines 1–24:
     > "Decision: CORE uses RBAC.\nRoles: Super Admin, IT Admin, Asset Admin, Software Admin, Auditor.\nPrinciple: Permissions are evaluated server-side. The frontend must never be trusted as the authorization boundary."

7. **`DATA_MODEL.md`**:
   - Lines 227–243: `device_credentials` table:
     > `id` (uuid, PK), `device_id` (uuid, FK → devices), `login_email` (varchar(255)), `pin_hash` (varchar(255), encrypted, never plain text), `pin_last_rotated_at` (timestamptz), `notes` (text), `created_at` (timestamptz), `updated_at` (timestamptz).
   - Lines 265–280: `audit_events` table:
     > `id` (uuid, PK), `actor_id` (uuid, FK → accounts, nullable), `action` (varchar(100), not null), `entity_type` (varchar(100), not null), `entity_id` (uuid, nullable), `metadata` (jsonb, nullable), `ip_address` (inet, nullable), `created_at` (timestamptz, not null, immutable).

8. **`docs/domains/access.md`**:
   - Lines 20–28:
     > "31 credential records in current spreadsheet. 28 of 31 devices share the same login email (`leadgeeksindonesia@gmail.com`). 27 of 31 devices share the same PIN. 3 devices have unique PINs. All PINs are stored in plain text in the source spreadsheet."
   - Lines 31–42:
     > "Credentials in CORE must: 1. Be encrypted at rest, 2. Require explicit authorization to reveal, 3. Log every reveal action to audit, 4. Require re-authentication for access, 5. Track rotation dates."

---

## 2. Logic Chain

1. **Authentication Architecture**:
   - From `ORIGINAL_REQUEST.md` (lines 33–36, 79–84) and `ARCHITECTURE.md` (line 80), authentication must support two modes:
     - **Production / Staging**: Google OAuth 2.0 / OpenID Connect (OIDC) flow. Only accounts configured in CORE are permitted to access administrative sessions.
     - **Local Development / Automated Testing**: Mock authentication mechanism allowing developers/tests to instantly authenticate as any of the 5 roles (Super Admin, IT Admin, Asset Admin, Software Admin, Auditor) without needing Google client secrets or external network requests.
   - Route protection is mandated: unauthenticated requests attempting to access any protected route (pages or API routes) must be redirected to `/login` or rejected with `401 Unauthorized`.
   - Next.js Edge / Node Middleware (`middleware.ts`) provides route-level gatekeeping, while session cookies propagate user identity (`actor_id`, `email`, `role`, `department_id`) to React Server Components and API Route Handlers / Server Actions.

2. **Role-Based Access Control (RBAC)**:
   - From `ADR-005` and `PRD.md`, authorization uses 5 explicit roles.
   - `ADR-005` specifies: "Permissions are evaluated server-side. The frontend must never be trusted as the authorization boundary."
   - When a user requests an API endpoint or Server Action:
     - If unauthenticated → `401 Unauthorized`.
     - If role lacks necessary permission → `403 Forbidden`.
   - The **Auditor** role has a strict invariant: strictly read-only across all resources. Every write operation (`POST`, `PUT`, `PATCH`, `DELETE`) initiated by an Auditor must return `403 Forbidden`. Furthermore, an Auditor must NOT have access to reveal device credentials (secrets).
   - Domain isolation:
     - Asset Admin is restricted to Assets/Devices and cannot manage Google Groups or software applications.
     - Software Admin is restricted to Software/Applications and cannot modify devices or Google Groups.
     - IT Admin manages infrastructure resources (Accounts, Groups, Assets, Software), but cannot view audit logs or alter Super Admin RBAC policies.
     - Super Admin has unconstrained access across all modules, including Audit logs and sensitive actions.

3. **Audit Logging & Immutability**:
   - From `DATA_MODEL.md` and `AGENTS.md`, audit records are written to `audit_events`.
   - Triggers:
     - All entity lifecycle mutations: `create`, `update`, `delete` across accounts, groups, group memberships, devices, specifications, assignments, credentials, applications.
     - All sensitive operations explicitly enumerated in `AGENTS.md`:
       1. `credential.reveal` (revealing device PIN / secret)
       2. `account.export` (exporting accounts to spreadsheet/CSV)
       3. `permission.change` (modifying roles/permissions)
       4. `device.delete` (deleting hardware device)
       5. `google_workspace.sync` (synchronizing Google Workspace directory/groups)
   - Immutability: `AGENTS.md` strictly forbids: "Delete audit logs". No API, ORM method, or UI exists to update or delete `audit_events`. Database constraints or append-only policies ensure no modification of historical events.
   - Audit Log Viewer:
     - Route: `/audit`.
     - Access strictly limited to `Super Admin` and `Auditor`. Any other role (IT Admin, Asset Admin, Software Admin, or unauthenticated) receives `403 Forbidden` or redirect.
     - Displays events in reverse chronological order (`created_at DESC`) with actor, action, entity type, entity ID, timestamp, and metadata diff. Supports filtering by `entity_type` and `action`.

4. **Secrets Management & Device Credentials**:
   - `DATA_MODEL.md` column is named `pin_hash`, but `access.md` and `ADR-004` mandate: "Encrypted PIN. Never stored in plain text", "Require explicit authorization to reveal", "Log every reveal action to audit".
   - Because administrators must be able to *reveal* the PIN to provision or troubleshoot laptops, the PIN cannot be a one-way hash (like bcrypt); it must be encrypted reversibly at rest using AES-256-GCM (with encryption key from environment variable `ENCRYPTION_KEY`).
   - Plaintext PINs must NEVER be returned in bulk list queries (`/api/devices` or `/api/credentials`), never stored in audit metadata, and never logged to stdout/stderr.

---

## 3. Caveats

1. **Role Storage Location**:
   - `DATA_MODEL.md` has `account_roles` (Top Management, Leaders, Non-Leaders, Staff, Commercial) which represents *organizational hierarchy level* from the spreadsheet.
   - The 5 system RBAC roles (Super Admin, IT Admin, Asset Admin, Software Admin, Auditor) represent *system administrative access levels*.
   - In implementation, an administrative user's RBAC role must be tracked either as a separate column on `accounts` (e.g. `system_role` enum) or in a dedicated user session / admin mapping table so that organizational role (e.g. "Leaders") and system role (e.g. "IT Admin") do not conflict.
2. **Re-authentication Requirement in ADR-004**:
   - ADR-004 lists "Re-authentication" as a requirement for revealing secrets. In an MVP, this can be implemented via a prompt for the user's password or an explicit confirmation modal before triggering the `POST /api/credentials/[id]/reveal` endpoint.
3. **Audit Actor on Pre-Auth Actions**:
   - If an unauthenticated user or failed API token accesses an endpoint, `actor_id` in `audit_events` is nullable (`actor_id UUID REFERENCES accounts(id)` allows NULL). Pre-auth security events should record NULL `actor_id` and capture `ip_address` and metadata.

---

## 4. Conclusion

The security, authentication, RBAC, and audit architecture for CORE is completely defined by the authoritative project documents. The implementation must follow:
- Dual-mode authentication (Google OAuth 2.0 / OIDC + local Mock Auth).
- Next.js Middleware route protection redirecting unauthenticated users to `/login`.
- Server-side RBAC enforcement with 5 distinct roles, returning `403 Forbidden` on unauthorized operations.
- Strictly read-only access for the `Auditor` role across all resources, with exclusive viewing access to `/audit` shared only with `Super Admin`.
- An immutable `audit_events` logging system recording all mutations and sensitive actions.
- Symmetric encryption at rest for device credentials with explicit reveal auditing and zero plaintext leaks.

---

## 5. Verification Method

To independently verify adherence to this specification during and after implementation:

1. **Unauthenticated Access Verification**:
   - Request `GET /` or `GET /devices` or `GET /api/accounts` without cookies.
   - Expected: HTTP redirect to `/login` (for web pages) or `HTTP 401 Unauthorized` (for API routes).
2. **Mock Authentication Verification**:
   - Navigate to `/login` in local development (`NODE_ENV=development` or `MOCK_AUTH_ENABLED=true`).
   - Select each of the 5 roles (Super Admin, IT Admin, Asset Admin, Software Admin, Auditor) and sign in.
   - Inspect session cookie and verify user context contains corresponding `actor_id` and `role`.
3. **Auditor Read-Only Verification**:
   - Authenticate as `Auditor`.
   - Attempt `POST /api/devices`, `PATCH /api/accounts/[id]`, or `DELETE /api/applications/[id]`.
   - Expected: `HTTP 403 Forbidden`. No record is created, modified, or deleted in the database.
4. **Audit Viewer Access Control Verification**:
   - Access `/audit` as `Super Admin` → HTTP 200, log viewer rendered.
   - Access `/audit` as `Auditor` → HTTP 200, log viewer rendered.
   - Access `/audit` as `IT Admin`, `Asset Admin`, or `Software Admin` → HTTP 403 Forbidden or redirect.
5. **Audit Event Generation Verification**:
   - As `IT Admin`, create or update a device.
   - Query database: `SELECT * FROM audit_events WHERE entity_type = 'device' ORDER BY created_at DESC LIMIT 1;`.
   - Verify `actor_id`, `action`, `entity_type`, `entity_id`, and `ip_address` are correctly populated.
6. **Audit Immutability Verification**:
   - Run SQL command: `DELETE FROM audit_events;` or `UPDATE audit_events SET action = 'tampered';`.
   - Verify database trigger/permissions or application code rejects deletion/modification.
7. **Credential Security Verification**:
   - Inspect database: `SELECT pin_hash FROM device_credentials;`.
   - Verify no plain text PIN exists in the database.
   - Perform a "Reveal Credential" action.
   - Verify plaintext PIN is returned only to authorized admin and an audit event with action `credential.reveal` is immediately recorded.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Auth | Google OAuth / OIDC Flow | Production SSO login using Google Workspace credentials | Google account auth code / tokens | Session cookie, authenticated user context | Redirects to login with error if account not found or unauthorized | ORIGINAL_REQUEST.md:33, ARCHITECTURE.md:80 |
| 2 | Auth | Mock Authentication | Local development/testing login without external Google API | Selectable role (Super Admin, IT Admin, Asset Admin, Software Admin, Auditor) | Local test session cookie | Disabled in production; returns 400 if invalid role requested | ORIGINAL_REQUEST.md:81, TODO.md:8 |
| 3 | Auth | Route Protection Middleware | Global Next.js middleware intercepting unauthenticated traffic | HTTP request URL & session cookie | Passes request to protected route if valid session | Redirects browser to `/login` with `callbackUrl`; returns 401 for API routes | ORIGINAL_REQUEST.md:35, 80 |
| 4 | Auth | Session Context Propagation | Propagates current user `actor_id`, `email`, `role`, `department_id` to server components and API routes | Session cookie | User session object (`SessionUser`) | Invalid/expired session results in session termination | ARCHITECTURE.md:61, ADR-005 |
| 5 | RBAC | Super Admin Role | Full system access across all 5 domains, credentials, sensitive actions, and audit log viewer | All admin operations | Permitted | N/A | PRD.md:58-60, ADR-005:13 |
| 6 | RBAC | IT Admin Role | Operational management of Accounts, Google Groups, Devices, and Software; Google Workspace sync | Infrastructure CRUD requests | Permitted for infrastructure domains | 403 Forbidden on Audit log viewer, system role modifications, or unauthorized secrets | PRD.md:62-64, ADR-005:14 |
| 7 | RBAC | Asset Admin Role | Manages physical hardware, laptop inventory, specifications, and assignments | Device/Hardware CRUD and assignment operations | Permitted for assets | 403 Forbidden on Accounts, Groups, Software, Audit logs | PRD.md:66-68, ADR-005:15 |
| 8 | RBAC | Software Admin Role | Manages applications, licenses, subscriptions, and renewal tracking | Application and license CRUD operations | Permitted for software | 403 Forbidden on Devices, Groups, Accounts, Audit logs | PRD.md:70-72, ADR-005:16 |
| 9 | RBAC | Auditor Role | Read-only inspection across all domains, access to Audit Log Viewer | Read-only (`GET`) requests | Rendered resource views and audit logs | 403 Forbidden on any write operation (POST, PUT, PATCH, DELETE) and secret reveal | ORIGINAL_REQUEST.md:35, 82, PRD.md:74-76 |
| 10 | RBAC | Server-Side Authorization Check | Guard logic on API route handlers and Server Actions to enforce permissions | Target action, resource, user session role | Allows execution if permitted | HTTP 403 Forbidden if user role lacks permission | ADR-005:21-23, ORIGINAL_REQUEST.md:83 |
| 11 | Audit | Audit Event Logging | Records actor, action, entity type, entity ID, metadata, and IP on all CRUD operations | Action name, entity details, metadata diff, actor session | Insert record into `audit_events` | Logs error to stderr if DB write fails, does not silently fail | ORIGINAL_REQUEST.md:36, DATA_MODEL.md:265 |
| 12 | Audit | Sensitive Operation Auditing | Explicit audit logging for high-risk operations (reveal credential, export accounts, change permissions, delete assets, sync Google) | Sensitive action trigger, target entity, actor, IP | Mandatory audit event record with detailed context | Hard failure if audit logging cannot be completed | AGENTS.md:73-87, ORIGINAL_REQUEST.md:36 |
| 13 | Audit | Audit Trail Immutability | Guarantees audit records cannot be edited or deleted | Any update or delete command on `audit_events` | Rejection / blocked | Database constraint error or application-level rejection; forbidden per AGENTS.md | AGENTS.md:67, DATA_MODEL.md:278 |
| 14 | Audit | Audit Log Viewer Page | UI page at `/audit` displaying audit events in reverse chronological order with filtering | Filters: `entity_type`, `action`, date range, search query | Paginated list of audit events with metadata inspection | 403 Forbidden for non-Super Admin / non-Auditor users | ORIGINAL_REQUEST.md:51-54, 95 |
| 15 | Security | Credential Encryption at Rest | Encrypts device PINs and sensitive secrets prior to storing in `device_credentials` | Plain text PIN (during import or update) | Encrypted ciphertext (e.g. AES-256-GCM) stored in `pin_hash` | Fails transaction if encryption key is missing or encryption fails | ADR-004:9-14, DATA_MODEL.md:236 |
| 16 | Security | Credential Reveal Protection | Guarded endpoint to decrypt and view device PIN with re-authentication and audit trigger | Device ID, admin session | Decrypted plaintext PIN returned to authorized admin | 403 Forbidden for Auditor and unauthorized roles; logs `credential.reveal` to audit | ADR-004:15-18, access.md:38-40 |
| 17 | Security | Sensitive Response Scrubbing | Prevents exposing plain text credentials or secret tokens in bulk API list endpoints | Resource list query (`/api/devices`, `/api/credentials`) | Sanitized resource records without `pin_hash` or secret data | Never returns plain text secret in list payloads | AGENTS.md:69, ADR-004:22-24 |
| 18 | Security | Google Workspace Sync Safety | Ensures external Google API operations are validated and logged without assuming success | Sync command (groups, accounts) | Sync status tracking (`synced`, `pending`, `conflict`, `error`) | Records conflict or error; never corrupts local data | AGENTS.md:70, ADR-003:11-20, google-workspace.md:29-33 |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Route Protection | Unauthenticated user visits `/` or `/assets/devices` | Middleware intercepts request, preserves path as `callbackUrl`, redirects to `/login` |
| 2 | Route Protection | Unauthenticated user submits `POST /api/devices` | Middleware or API handler immediately returns `401 Unauthorized` JSON response |
| 3 | Mock Auth | Mock auth invoked in production (`NODE_ENV=production` without mock flag) | Mock auth endpoint disabled, returns 404 or 403, preventing unauthorized elevation in production |
| 4 | RBAC Authorization | Auditor attempts `DELETE /api/devices/123` | Server-side check identifies role as `Auditor`, rejects with `403 Forbidden`, no state change occurs |
| 5 | RBAC Authorization | Software Admin attempts `POST /api/devices` | Server-side check identifies role lacks `assets:create` permission, rejects with `403 Forbidden` |
| 6 | RBAC Authorization | Asset Admin attempts to access `/audit` | Page/API route checks permission `audit:read`, rejects with `403 Forbidden` |
| 7 | Audit Log Viewer | Auditor accesses `/audit` | Allowed: Auditor role has read-only permission specifically including audit log inspection |
| 8 | Audit Log Viewer | Super Admin accesses `/audit` | Allowed: Super Admin has full visibility over audit trail |
| 9 | Credential Reveal | Auditor attempts `POST /api/credentials/123/reveal` | Rejected with `403 Forbidden`: Auditor is read-only for metadata, but credentials/secrets are excluded |
| 10 | Credential Reveal | Super Admin reveals PIN for device `LGI-CD-2024-042` | Returns decrypted PIN, simultaneously inserts row into `audit_events` with action `credential.reveal`, actor_id, entity_id, and IP |
| 11 | Audit Logging | Database failure occurs during audit log insert | Sensitive operation transaction aborts / rolls back; sensitive actions cannot complete without audit record |
| 12 | Audit Immutability | User issues `DELETE FROM audit_events WHERE id = '...'` | Operation rejected by database policy / lack of ORM mutation method; preserves audit integrity |
| 13 | Spreadsheet Ingestion | Ingestion script reads plain text PIN `123456` from `Access Login` sheet | Ingestion script encrypts `123456` using AES-256-GCM before writing to `device_credentials.pin_hash` |
| 14 | Identity & Sessions | Account has `suspended` or `archived` status in `accounts` table | Session validation rejects login or invalidates existing session cookie, returning `403 Account Suspended` |
| 15 | Pre-auth Audit Events | Failed login attempt or unauthenticated attack probe | `audit_events` record written with `actor_id = NULL`, capturing `action = auth.failed`, `ip_address`, and metadata |

---

## Detailed Specifications

### A. Authentication Architecture

#### 1. Dual-Mode Authentication Flow
CORE implements a unified session provider that supports two distinct authentication strategies:
- **Strategy 1: Google OAuth 2.0 / OpenID Connect (OIDC)**:
  - Intended for production and staging environments.
  - Configuration: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET` / `AUTH_SECRET`, `NEXTAUTH_URL`.
  - Flow:
    1. User navigates to `/login` and clicks "Sign in with Google".
    2. User is redirected to Google OAuth consent screen requesting `openid`, `email`, and `profile` scopes.
    3. Google redirects to callback handler with authorization code.
    4. CORE exchanges authorization code for ID token and access token.
    5. Core verifies ID token and extracts verified email.
    6. Core verifies the email belongs to an active account in the `accounts` table (matching on `email` or `previous_email`).
    7. If account exists and is `active`:
       - User session is established with `actor_id` (`account.id`), `email`, `role`, and `department_id`.
       - Session cookie (encrypted JWT) is set on the HTTP response with `HttpOnly`, `SameSite=Lax`, and `Secure` (in production).
    8. If account does not exist or status is `suspended` / `archived`:
       - Authentication is rejected with an explicit error message (e.g. `AccessDenied: Your account is not authorized to access CORE`).
- **Strategy 2: Mock Authentication**:
  - Intended for local development, CI pipelines, and automated Playwright / Jest integration testing.
  - Active when `MOCK_AUTH_ENABLED=true` or `NODE_ENV=development`.
  - Flow:
    1. User navigates to `/login`.
    2. A "Developer Quick Login" panel displays quick-switch options for the 5 system roles:
       - **Super Admin**: Amanda Stevany (`amanda@leadgeeksinc.com`, Management Office)
       - **IT Admin**: LeadGeeks IT Admin (`it.team@leadgeeksinc.com`, Information and Technology)
       - **Asset Admin**: Hardware Specialist (`operations@leadgeeksinc.com`, Operations)
       - **Software Admin**: Software Coordinator (`growth@leadgeeksinc.com`, Growth)
       - **Auditor**: Compliance Auditor (`auditor@leadgeeksinc.com`, General)
    3. Clicking a role immediately posts to `/api/auth/mock-login` (or sets the mock session).
    4. The endpoint generates a valid session cookie for that user and redirects to `/` or the `callbackUrl`.

#### 2. Route Protection Middleware
- Implemented in Next.js `middleware.ts` at the root of the application.
- **Matcher Configuration**:
  - Excluded paths: `/_next/static`, `/_next/image`, `/favicon.ico`, `/login`, `/api/auth/*`.
  - Protected paths: `/`, `/identity/*`, `/groups/*`, `/assets/*`, `/software/*`, `/audit/*`, `/api/*` (except `/api/auth/*`).
- **Middleware Behavior**:
  - Extracts and verifies session token from cookies.
  - If no valid session token exists:
    - For HTML page requests: Redirect to `/login?callbackUrl=${encodeURIComponent(req.nextUrl.pathname)}`.
    - For API / JSON requests: Return `401 Unauthorized` with JSON `{ "error": "Unauthorized", "message": "Authentication required" }`.
  - If valid session token exists:
    - Attaches `x-user-id`, `x-user-email`, `x-user-role` headers to downstream request headers for fast server-side access.
    - Passes request to target Server Component or API handler.

#### 3. Session Context & Propagation
- **Session Data Structure**:
  ```typescript
  export type SystemRole = 'super_admin' | 'it_admin' | 'asset_admin' | 'software_admin' | 'auditor';

  export interface UserSession {
    id: string;            // UUID matching accounts.id
    email: string;         // Primary email
    displayName: string;   // Display name
    role: SystemRole;      // Administrative RBAC role
    departmentId?: string; // UUID matching departments.id
    departmentCode?: string;
  }
  ```
- **Server-Side Access**:
  - Server Components: Helper `getCurrentUser(): Promise<UserSession | null>` parses cookie session.
  - API Routes / Route Handlers: Helper `requireAuth(req): Promise<UserSession>` throws or returns `401` if session missing.

---

### B. Role-Based Access Control (RBAC) Architecture

#### 1. The 5 Administrative Roles
1. **Super Admin**:
   - Scope: Universal access across all domains and system administration.
   - Distinct capabilities: Can manage RBAC roles, export sensitive account data, reveal device credentials, decommission/delete assets, manage system settings, and inspect audit logs.
2. **IT Admin**:
   - Scope: Operational administrator for Identity, Google Groups, Hardware Assets, and Software Applications.
   - Distinct capabilities: Can create, update, and manage accounts, trigger Google Workspace synchronization, assign devices, rotate device PINs, manage software catalogs.
   - Restrictions: Cannot view audit logs (`/audit`), cannot alter Super Admin permissions.
3. **Asset Admin**:
   - Scope: Hardware device and equipment custodian.
   - Distinct capabilities: Full CRUD on devices (`devices`, `device_specifications`), perform device assignments (`device_assignments`), manage device lifecycle status (`assigned`, `available`, `reserve`, `decommissioned`).
   - Restrictions: Read-only access to Identity accounts (for assignee lookups); no access to Google Groups, Software catalogs, or Audit logs.
4. **Software Admin**:
   - Scope: Software application, subscription, and license manager.
   - Distinct capabilities: Full CRUD on applications (`applications`), subscription categories, license keys, and upcoming license assignments.
   - Restrictions: Read-only access to Identity (accounts/departments) and Devices; no access to Google Groups, Hardware management, Device credentials, or Audit logs.
5. **Auditor**:
   - Scope: Compliance, inspection, and security verification.
   - Distinct capabilities: Comprehensive read-only (`GET`) access across all entities (Accounts, Departments, Roles, Domains, Google Groups, Group Memberships, Devices, Specs, Assignments, Applications) AND full access to the Audit Log Viewer (`/audit`).
   - Strict Invariant: Strictly prohibited from all mutations (`POST`, `PUT`, `PATCH`, `DELETE`) and prohibited from revealing device PINs/secrets.

#### 2. Comprehensive Permission Matrix Across All Domains

| Domain / Entity | Action / Operation | Super Admin | IT Admin | Asset Admin | Software Admin | Auditor |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **Identity** (`accounts`) | Read / List / View Detail | ✅ | ✅ | ✅ (Read) | ✅ (Read) | ✅ (Read) |
| | Create / Update Account | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Delete / Archive Account | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Export Accounts (Sensitive) | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Change Role / Permissions (Sensitive) | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Groups** (`google_groups`) | Read / List / View Members | ✅ | ✅ | ❌ | ❌ | ✅ (Read) |
| | Create / Update Group | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Manage Memberships | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Trigger Google Sync (Sensitive) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Assets** (`devices`, `specs`) | Read / List / View Detail | ✅ | ✅ | ✅ | ✅ (Read) | ✅ (Read) |
| | Create / Update Device & Specs | ✅ | ✅ | ✅ | ❌ | ❌ |
| | Delete Device (Sensitive) | ✅ | ✅ | ❌ (Decommission only) | ❌ | ❌ |
| | Assign / Return Device | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Access** (`device_credentials`) | Read Metadata (email, last rotated) | ✅ | ✅ | ✅ | ❌ | ❌ |
| | Reveal PIN / Secret (Sensitive) | ✅ (Logged) | ✅ (Logged) | ❌ | ❌ | ❌ (Strictly Forbidden) |
| | Create / Rotate PIN | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Software** (`applications`) | Read / List / View Detail | ✅ | ✅ | ✅ (Read) | ✅ | ✅ (Read) |
| | Create / Update Application | ✅ | ✅ | ❌ | ✅ | ❌ |
| | Delete Application | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Audit** (`audit_events`) | View Audit Log Page (`/audit`) | ✅ | ❌ | ❌ | ❌ | ✅ |
| | Filter / Inspect Event Metadata | ✅ | ❌ | ❌ | ❌ | ✅ |
| | Update / Delete Audit Logs | ❌ (Immutable) | ❌ (Immutable) | ❌ (Immutable) | ❌ (Immutable) | ❌ (Immutable) |

#### 3. Server-Side Authorization Enforcement
- In accordance with `ADR-005`, all authorization checks must be enforced strictly on the server:
  ```typescript
  export function checkPermission(user: UserSession, action: ActionPermission): boolean {
    // Evaluates user.role against the permission matrix
  }

  export function assertPermission(user: UserSession, action: ActionPermission): void {
    if (!checkPermission(user, action)) {
      const error = new Error(`Forbidden: Role ${user.role} lacks permission for ${action}`);
      (error as any).statusCode = 403;
      throw error;
    }
  }
  ```
- Every API route handler and Server Action must call `assertPermission(user, '...')` before invoking business logic or database queries.
- If unauthorized: Returns HTTP status `403 Forbidden` with `{ "error": "Forbidden", "message": "You do not have permission to perform this action" }`.

---

### C. Audit Logging System

#### 1. Schema of `audit_events` Table
From `DATA_MODEL.md` (lines 265–280):

```sql
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    metadata JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recommended Indexing for query performance
CREATE INDEX idx_audit_events_created_at ON audit_events (created_at DESC);
CREATE INDEX idx_audit_events_entity ON audit_events (entity_type, entity_id);
CREATE INDEX idx_audit_events_actor ON audit_events (actor_id);
CREATE INDEX idx_audit_events_action ON audit_events (action);
```

**Field Descriptions**:
- `id`: Unique identifier for the audit event.
- `actor_id`: Foreign key to `accounts.id` representing the user who triggered the action. Nullable for unauthenticated/system actions.
- `action`: Standardized action key using dot-notation:
  - `account.create`, `account.update`, `account.delete`, `account.export`
  - `group.create`, `group.update`, `group.delete`, `group.sync`, `group_membership.add`, `group_membership.remove`
  - `device.create`, `device.update`, `device.delete`, `device.assign`, `device.return`
  - `credential.create`, `credential.update`, `credential.rotate`, `credential.reveal`
  - `application.create`, `application.update`, `application.delete`
  - `permission.change`, `auth.login`, `auth.failed`
- `entity_type`: Canonical domain entity type: `'account'`, `'google_group'`, `'device'`, `'device_assignment'`, `'device_credential'`, `'application'`, `'system'`.
- `entity_id`: UUID of the primary target entity.
- `metadata`: JSON object containing contextual change details:
  - For updates: `{ "changes": { "status": { "from": "available", "to": "assigned" } } }`
  - For sensitive reveals: `{ "device_asset_number": "LGI-CD-2024-042", "reason": "laptop provisioning" }` (plaintext secret is NEVER stored here!)
  - For syncs: `{ "synced_groups": 15, "members_added": 3, "errors": 0 }`
- `ip_address`: Client IP address captured from `x-forwarded-for` or request socket.
- `created_at`: Exact timestamp when the action was recorded.

#### 2. Audit Event Triggers
Audit logging is triggered synchronously or within the same database transaction across:
1. **All Entity Lifecycle Operations**:
   - `create`: Any insert into accounts, groups, group memberships, devices, device specifications, device assignments, device credentials, applications.
   - `update`: Any modification of entity fields (records changed fields in metadata).
   - `delete`: Any entity deletion or archival.
2. **Sensitive Operations (Strictly Mandated by AGENTS.md & ORIGINAL_REQUEST.md)**:
   - `credential.reveal`: Triggered whenever an administrator decrypts/views a device PIN.
   - `accounts.export`: Triggered whenever an administrator downloads or exports the accounts dataset.
   - `permissions.change`: Triggered whenever an administrator updates user roles or permissions.
   - `device.delete`: Triggered whenever a hardware asset record is deleted.
   - `google_workspace.sync`: Triggered whenever Google Workspace synchronization is executed.

#### 3. Audit Immutability Guarantees
- **No API Endpoint**: There is no API route, Server Action, or GraphQL query that exposes `UPDATE` or `DELETE` on `audit_events`.
- **Repository Isolation**: The `audit` module exposes only `createAuditEvent(...)`, `getAuditEvents(...)`, and `getAuditEventById(...)`. No update or delete methods exist.
- **Database-Level Protection**:
  ```sql
  -- Protect audit_events from tampering at the database level
  CREATE OR REPLACE FUNCTION prevent_audit_modification()
  RETURNS TRIGGER AS $$
  BEGIN
      RAISE EXCEPTION 'audit_events table is immutable. Modifications and deletions are strictly prohibited.';
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER trg_audit_events_immutable
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();
  ```

#### 4. Audit Log Viewer Page (`/audit`)
- **Access Control**: Accessible **ONLY** to `Super Admin` and `Auditor` roles. All other authenticated roles (`IT Admin`, `Asset Admin`, `Software Admin`) or unauthenticated users receive `403 Forbidden` or redirection.
- **UI & Interaction Specifications** (aligned with `DESIGN.md` calm infrastructure style):
  - **Header**: Title "Audit Trail", summary counter (total events recorded), date range indicator.
  - **Filter Bar**:
    - Filter by `entity_type` (All, Account, Device, Group, Application, Credential).
    - Filter by `action` (All, Create, Update, Delete, Reveal, Sync, Export).
    - Search input (filter by actor email, entity ID, or keyword).
  - **Event Table / Feed**:
    - Ordered reverse-chronologically (`created_at DESC`).
    - Columns:
      - **Timestamp**: Formatted with local time + relative duration (`2026-09-08 17:15:02 (5m ago)`).
      - **Actor**: Display name and email of actor (or "System" if `actor_id` is null).
      - **Action**: Styled badge with semantic color (e.g. Green for `create`, Blue for `update`, Red for `delete`, Orange/Amber for `reveal`/sensitive).
      - **Entity**: Entity type tag + entity ID (linked to detail page if active).
      - **IP Address**: Client IP.
      - **Details**: Expandable row or modal displaying formatted JSON diff from `metadata`.

---

### D. Secrets Management & Credential Security

#### 1. Security Flaws in Spreadsheet Source
From `docs/domains/access.md` and `docs/data/spreadsheet-mapping.md`:
- Source spreadsheet `List of Company Hardware Devices (Laptop).xlsx` (`Access Login` sheet) contains:
  - 31 device credential entries.
  - 28 of 31 devices share identical login email: `leadgeeksindonesia@gmail.com`.
  - 27 of 31 devices share the exact same PIN password.
  - **Critical vulnerability**: All PINs are stored in plain text in the spreadsheet!

#### 2. Secrets Handling in CORE
- `ADR-004` dictates: "Passwords, PINs, recovery codes, and secrets must not be stored as plain database fields."
- **Encryption at Rest**:
  - In `device_credentials`, the column is typed `pin_hash varchar(255)`.
  - To support legitimate administrative device provisioning where the PIN must be retrieved/revealed to set up a laptop for an employee, symmetric encryption (AES-256-GCM) must be used.
  - Encryption format: `iv:auth_tag:ciphertext` (Base64 encoded string stored in `pin_hash`).
  - Secret key: Loaded from environment variable `ENCRYPTION_KEY` (32-byte hexadecimal or base64 key).
- **Zero-Knowledge API Responses**:
  - GET requests to `/api/devices` or `/api/devices/[id]` MUST OMIT the PIN secret or return `{ "hasPin": true }`.
  - Plaintext PIN is NEVER returned in list responses or resource overviews.
- **Reveal Protocol**:
  - Endpoint: `POST /api/credentials/[id]/reveal`
  - Requires:
    1. Authenticated session.
    2. Role check (`Super Admin` or authorized `IT Admin`).
    3. Re-authentication confirmation in UI.
    4. Immediate synchronous insert of `audit_events` with `action: 'credential.reveal'`, `entity_type: 'device_credential'`, `entity_id: credential.id`, `actor_id: user.id`, `ip_address`.
    5. Returns decrypted PIN to the client.
    6. UI displays PIN with auto-masking after 15 seconds.

---

Report finalized for handoff to parent orchestrator.
