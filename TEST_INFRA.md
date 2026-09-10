# CORE Test Infrastructure & Testing Specification

## 1. Opaque-Box, Requirement-Driven Testing Methodology

CORE (Company Operations, Resources & Environment) replaces mission-critical company spreadsheets managing employee accounts, Google Groups, hardware devices, and software tools. The testing infrastructure adheres strictly to **opaque-box, requirement-driven verification**:

1. **Requirements as Authoritative Oracle**:
   Every test case is derived directly from documented specifications:
   - `ORIGINAL_REQUEST.md` (Product goals & acceptance criteria)
   - `DATA_MODEL.md` (Database schema, types, constraints, and relationships)
   - `docs/data/spreadsheet-mapping.md` (Exact spreadsheet column mappings and normalization rules)
   - `docs/adr/ADR-001` through `ADR-005` (Modular monolith, PostgreSQL, Google Workspace, Secrets AES-256-GCM, RBAC)
   - `AGENTS.md` (Domain invariants, forbidden operations, sensitive operation auditing)
   - `DESIGN.md` (Calm infrastructure command center UI patterns and status color language)

2. **Opaque-Box Independence**:
   Tests interact with CORE through published interface contracts (database schema, HTTP API endpoints, session tokens, Next.js route handlers, and data ingestion pipelines). Tests do not rely on private internal helper implementations, avoiding brittle facade tests.

3. **Progressive Testability & Isolation**:
   - Every test is self-contained: sets up its own state, executes operations, asserts outcomes, and leaves zero side effects.
   - Tests run deterministically without execution-order coupling.
   - No mock facades that unconditionally return `true`: all assertions validate actual state transitions, relational constraints, cryptanalytic properties, and HTTP status codes.

4. **Adversarial Verification**:
   - **Encoding & Escaping**: Multi-byte strings, single/double quotes, commas in lists, SQL/HTML meta-characters.
   - **Invalid Combinations**: Conflicting roles, missing foreign keys, tampered ciphertexts, mismatched IV/auth tags.
   - **Boundary Conditions**: Zero accounts, empty groups, duplicate keys, null fields on NOT NULL columns, extreme pagination offsets.

---

## 2. Feature Inventory Mapped to Requirement Sources

| # | Feature Key | Description | Requirement Source | Test Suite |
|---|-------------|-------------|-------------------|------------|
| 1 | `SEED_DEPTS` | Reference seed: 8 departments with unique codes (MNG, OPS, GRW, EXP, HRD, ITE, FAC, GNR) | DATA_MODEL.md:87-107 | `01-db-schema-and-seed` |
| 2 | `SEED_ROLES` | Reference seed: 5 account roles with hierarchy levels 1 to 5 | DATA_MODEL.md:109-125 | `01-db-schema-and-seed` |
| 3 | `SEED_DOMAINS` | Reference seed: 3 corporate domains (1 primary, 2 secondary) | DATA_MODEL.md:127-141 | `01-db-schema-and-seed` |
| 4 | `DB_SCHEMA` | Complete 12 domain tables + `audit_events` with types, PK, FK, unique constraints, and enums | DATA_MODEL.md:64-280 | `01-db-schema-and-seed` |
| 5 | `DB_MIGRATIONS` | Migration scripts executing against fresh PostgreSQL instance without errors | ORIGINAL_REQUEST.md:57-63 | `01-db-schema-and-seed` |
| 6 | `AUTH_DUAL_MODE` | Dual-mode authentication: Google OAuth/OIDC + local Mock Auth role selector | ORIGINAL_REQUEST.md:33, ADR-005 | `02-auth-and-sessions` |
| 7 | `AUTH_ROUTE_GUARD`| Unauthenticated requests redirected to `/login` with `callbackUrl`; API returns 401 | ORIGINAL_REQUEST.md:80, ADR-005 | `02-auth-and-sessions` |
| 8 | `AUTH_SESSION` | User session token propagation (`id`, `email`, `role`, `departmentId`) | ARCHITECTURE.md:61, ADR-005 | `02-auth-and-sessions` |
| 9 | `RBAC_5_ROLES` | Server-side RBAC enforcing 5 roles: Super Admin, IT Admin, Asset Admin, Software Admin, Auditor | ORIGINAL_REQUEST.md:35, ADR-005 | `03-rbac-permissions` |
| 10 | `RBAC_AUDITOR_RO` | Auditor role invariant: strictly read-only, all mutations return HTTP 403 Forbidden | ORIGINAL_REQUEST.md:82, PRD.md:74 | `03-rbac-permissions` |
| 11 | `RBAC_ISOLATION` | Domain isolation: Asset Admin limited to devices, Software Admin limited to apps | PRD.md:58-76, ADR-005 | `03-rbac-permissions` |
| 12 | `AUDIT_LOGGING` | Append-only logging of all entity mutations (create, update, delete) to `audit_events` | DATA_MODEL.md:265, AGENTS.md:73 | `04-audit-logging` |
| 13 | `AUDIT_SENSITIVE` | Explicit logging for 5 sensitive actions: credential reveal, export, permission change, device delete, sync | AGENTS.md:73-87 | `04-audit-logging` |
| 14 | `AUDIT_IMMUTABLE` | Immutability: update and delete operations on `audit_events` are strictly forbidden | AGENTS.md:67, DATA_MODEL.md:278 | `04-audit-logging` |
| 15 | `AUDIT_VIEWER` | `/audit` viewer accessible exclusively to Super Admin and Auditor; others receive 403 | ORIGINAL_REQUEST.md:51, 95 | `04-audit-logging` |
| 16 | `CRYPTO_AES256` | Device credential PINs encrypted at rest using AES-256-GCM; never stored in plain text | ADR-004, DATA_MODEL.md:236 | `05-credential-encryption` |
| 17 | `CRYPTO_REVEAL` | Secure credential reveal endpoint requiring admin authorization and synchronous audit record | ADR-004:15, AGENTS.md:78 | `05-credential-encryption` |
| 18 | `CRYPTO_SCRUB` | API list endpoints scrub plain-text credentials and `pin_hash` to prevent leakage | AGENTS.md:69, ADR-004:22 | `05-credential-encryption` |
| 19 | `INGEST_ACCOUNTS` | Ingests 42 accounts (40 personal, 1 service, 1 shared) from spreadsheet | spreadsheet-mapping.md:19-32 | `06-spreadsheet-ingestion` |
| 20 | `INGEST_DOMAINS` | Parses comma-separated domains per account into `account_domains` join table | spreadsheet-mapping.md:29 | `06-spreadsheet-ingestion` |
| 21 | `INGEST_GROUPS` | Ingests 15 Google Groups and ~168 memberships with email domain resolution | spreadsheet-mapping.md:33-40 | `06-spreadsheet-ingestion` |
| 22 | `INGEST_DEVICES` | Ingests 31 laptops with 1:1 hardware specifications | spreadsheet-mapping.md:41-57 | `06-spreadsheet-ingestion` |
| 23 | `INGEST_FUZZY_PIC`| Assigns devices via fuzzy PIC name matching; sets reserve/available/decommissioned | spreadsheet-mapping.md:46-47 | `06-spreadsheet-ingestion` |
| 24 | `INGEST_SOFTWARE` | Ingests 125 applications with Drop Down sheet subscription enrichment | spreadsheet-mapping.md:71-88 | `06-spreadsheet-ingestion` |
| 25 | `INGEST_DEPT_NORM`| Normalizes disparate department strings across sheets to canonical names/codes | spreadsheet-mapping.md:91-103 | `06-spreadsheet-ingestion` |
| 26 | `INGEST_IDEMPOTENT`| Seed/import pipeline is safe to run repeatedly without creating duplicate rows | ORIGINAL_REQUEST.md:77 | `06-spreadsheet-ingestion` |
| 27 | `CRUD_ROUTES` | CRUD API endpoints and domain pages for Identity, Groups, Assets, Software | ORIGINAL_REQUEST.md:41-50 | `07-crud-api-and-pages` |
| 28 | `UI_PATTERNS` | Resource Page Pattern, List Page Pattern, and Status Color Language (🟢🔵⚪🟡🟠🔴⚫) | DESIGN.md:14-132 | `07-crud-api-and-pages` |
| 29 | `GROUPS_MATRIX` | 42x15 cross-tabulation membership matrix view | DESIGN.md, ORIGINAL_REQUEST.md:45 | `07-crud-api-and-pages` |

---

## 3. Test Architecture, Test Runner Commands & Pass/Fail Semantics

### Test Directory Layout
```
/home/noah/project/core/tests/
├── fixtures/
│   ├── index.ts                      # Fixture loaders & typed definitions
│   ├── reference-data.json           # 8 depts, 5 roles, 3 domains
│   ├── spreadsheet-accounts.json     # 42 accounts dataset
│   ├── spreadsheet-groups.json       # 15 Google Groups & memberships
│   ├── spreadsheet-devices.json      # 31 devices, specs & credentials
│   ├── spreadsheet-software.json     # 125 applications dataset
│   ├── rbac-matrix.json              # 5-role permission rules
│   └── schema-definitions.json       # 13 tables, columns, constraints
├── helpers/
│   ├── test-framework.ts             # Embedded test runner, assertions & reporters
│   ├── db-client.ts                  # PostgreSQL connection & relational verifier
│   └── auth-helper.ts                # Session generator & mock auth provider
├── e2e/
│   ├── 01-db-schema-and-seed.test.ts # Database schema, constraints, seed verification
│   ├── 02-auth-and-sessions.test.ts  # Dual auth, route protection, session cookies
│   ├── 03-rbac-permissions.test.ts   # Server-side RBAC, 5 roles, Auditor read-only
│   ├── 04-audit-logging.test.ts      # Mutations & 5 sensitive operations, immutability
│   ├── 05-credential-encryption.test.ts # AES-256-GCM encryption, reveal audit, zero leak
│   ├── 06-spreadsheet-ingestion.test.ts # Ingestion of 3 sheets, fuzzy PIC, normalization, idempotency
│   └── 07-crud-api-and-pages.test.ts # Domain routes, 42x15 matrix, calm UI contracts
└── runner.mjs                        # Unified test runner entry point
```

### Test Runner Commands
1. **Primary Unified Test Command**:
   ```bash
   node tests/runner.mjs
   ```
2. **Tier-Specific Execution**:
   ```bash
   node tests/runner.mjs --tier=1      # Run Tier 1 Feature Coverage
   node tests/runner.mjs --tier=2      # Run Tier 2 Boundary & Corner Cases
   node tests/runner.mjs --tier=3      # Run Tier 3 Cross-Feature Combinations
   node tests/runner.mjs --tier=4      # Run Tier 4 Real-World Application Scenarios
   ```
3. **Suite-Specific Execution**:
   ```bash
   node tests/runner.mjs --suite=01    # DB Schema & Seed
   node tests/runner.mjs --suite=03    # RBAC Permissions
   node tests/runner.mjs --suite=05    # Credential Encryption
   ```
4. **NPM Standard Script**:
   ```bash
   npm test
   ```

### Pass/Fail Semantics & Exit Codes
- **Exit Code 0**: 100% of executed test cases passed with zero assertion failures, unhandled rejections, or unexpected errors.
- **Exit Code 1**: One or more assertions failed, database constraint checks failed, unauthorized mutations succeeded, or unhandled exceptions occurred.
- **Detailed Output Format**:
  - Structured console logs indicating Suite Name, Tier Tag `[Tier 1]`, Test Name, Duration (ms), and Pass/Fail status.
  - Summary footer with total tests, passed count, failed count, skipped count, and overall elapsed time.

---

## 4. 4-Tier Test Strategy

### Tier 1: Feature Coverage (>=5 tests per feature for all core features)
Tier 1 establishes baseline behavioral verification across every feature in the inventory. Each core feature has at least 5 targeted unit/integration tests confirming:
- Expected return values and state mutations.
- Natural key lookups and foreign key resolutions.
- Correct HTTP status codes (`200 OK`, `201 Created`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`).
- Schema definitions, table columns, default values, and enum values.

### Tier 2: Boundary & Corner Cases (>=5 tests per feature where boundaries exist)
Tier 2 subjects each feature to adversarial boundary conditions:
- **Constraints & Collisions**: Attempting duplicate inserts on unique keys (`accounts.email`, `devices.asset_number`, `google_groups.email`, `applications.name`).
- **Null & Type Violations**: Inserting null into NOT NULL columns, supplying invalid enum values, exceeding varchar limits.
- **Malformed & Tampered Payloads**: Invalid JWT session cookies, corrupted AES-256-GCM auth tags, tampered ciphertext, empty or multi-token PIC names.
- **Normalization Inconsistencies**: Testing raw variations ("HRD", "Human Resource and Development", "IT", "Information and Technology", "Management", "Management Office").
- **Audit Immutability**: Verifying database triggers or application blocks on `UPDATE` or `DELETE` against `audit_events`.

### Tier 3: Cross-Feature Combinations (Pairwise & Multi-Module Interactions)
Tier 3 verifies seamless coordination between disparate modules:
1. **RBAC × Audit Logging**: Every permitted administrative mutation emits an audit record with matching `actor_id`; rejected operations do not alter business entities.
2. **Ingestion × Credential Encryption**: Spreadsheet ingestion encrypts all 31 laptop PINs at rest using AES-256-GCM without exposing plain text in PostgreSQL.
3. **Identity × Google Groups Membership**: Ingesting accounts and groups correctly resolves legacy email domains (`@leadgeeksprospecting.com` to `@leadgeeksinc.com`) through `accounts.previous_email`.
4. **Assets × Identity Fuzzy PIC Matching**: Device assignment links 26 laptops to matching accounts by first name while accurately tagging 2 reserve, 2 available, and 1 decommissioned.
5. **Credential Reveal × Audit Trail × RBAC**: Invoking `POST /api/assets/[id]/credentials/reveal` by Super Admin returns the decrypted PIN and synchronously creates an immutable `credential.reveal` event.

### Tier 4: Real-World Application Scenarios (>=5 Realistic Workflows)
Tier 4 simulates comprehensive end-to-end IT administrator operational scenarios:
1. **Scenario 1: Fresh Infrastructure Bootstrap & Reference Seeding**:
   Spin up clean database, execute migrations, insert 8 departments, 5 roles, 3 domains; verify system integrity and zero-downtime health status.
2. **Scenario 2: Complete Company Spreadsheet Ingestion & Verification**:
   Execute ingestion of all 3 workbooks; verify exactly 42 accounts, 15 groups, 31 devices, and 125 applications; verify 100% credential encryption; re-run ingestion to prove idempotency.
3. **Scenario 3: Employee Onboarding & Device Provisioning**:
   IT Admin creates new employee account, assigns them to Google Groups (`team@leadgeeksinc.com`, `ops@leadgeeksinc.com`), provisions an available laptop, reveals its PIN for setup, and verifies all actions are logged in the audit trail.
4. **Scenario 4: Compliance Security Audit Walkthrough**:
   Auditor signs in via mock auth, navigates all 4 domain pages and the 42x15 membership matrix; attempts to modify an account and delete a device (both fail with 403 Forbidden); reviews the `/audit` trail and verifies all sensitive events are recorded.
5. **Scenario 5: Hardware Asset Lifecycle (Assignment → Return → Decommissioning)**:
   Asset Admin assigns device to an account, later marks it returned, updates status to `reserve`, and finally flags it as `decommissioned` ("Akan dijual"), with complete historical tracking in `device_assignments` and `audit_events`.

---

## 5. Verification Matrix Summary

| Test Suite | File Path | Total Tests | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|------------|-----------|:-----------:|:------:|:------:|:------:|:------:|
| 1. DB Schema & Seed | `tests/e2e/01-db-schema-and-seed.test.ts` | 26 | 12 | 8 | 4 | 2 |
| 2. Auth & Sessions | `tests/e2e/02-auth-and-sessions.test.ts` | 22 | 10 | 6 | 4 | 2 |
| 3. RBAC Permissions | `tests/e2e/03-rbac-permissions.test.ts` | 28 | 12 | 8 | 5 | 3 |
| 4. Audit Logging | `tests/e2e/04-audit-logging.test.ts` | 24 | 10 | 7 | 4 | 3 |
| 5. Credential Encryption | `tests/e2e/05-credential-encryption.test.ts` | 22 | 10 | 6 | 4 | 2 |
| 6. Spreadsheet Ingestion | `tests/e2e/06-spreadsheet-ingestion.test.ts` | 30 | 14 | 8 | 5 | 3 |
| 7. CRUD API & Pages | `tests/e2e/07-crud-api-and-pages.test.ts` | 28 | 12 | 8 | 5 | 3 |
| **Total** | | **180** | **80** | **51** | **31** | **18** |
