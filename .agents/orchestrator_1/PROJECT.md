# Project: CORE (Company Operations, Resources & Environment)

## Architecture
CORE uses a modular monolith architecture built with Next.js 15 (App Router), TypeScript, Tailwind CSS, PostgreSQL, and Drizzle ORM.
- **Presentation Layer**: Next.js App Router (`src/app/`), calm infrastructure command center UI, Resource Page Pattern, List Page Pattern.
- **Application Layer**: API Route Handlers and Server Actions enforcing server-side RBAC and audit logging.
- **Domain Layer**: Modular domain logic (`src/domains/{identity,groups,assets,access,software,audit}/`) with isolated schemas, types, and services.
- **Infrastructure Layer**: PostgreSQL connection pool (`src/lib/db/`), Drizzle ORM client, AES-256-GCM cryptographic cipher (`src/lib/crypto/`), and session management (`src/lib/auth/`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Reference Seed: Departments | Pre-populates 8 departments (MNG, OPS, GRW, EXP, HRD, ITE, FAC, GNR) | M1 | DATA_MODEL.md |
| 2 | Reference Seed: Account Roles | Pre-populates 5 hierarchy roles with levels 1-5 | M1 | DATA_MODEL.md |
| 3 | Reference Seed: Domains | Pre-populates 3 corporate domains (1 primary, 2 secondary) | M1 | DATA_MODEL.md |
| 4 | Database Schema | 12 domain tables + `audit_events` with strict types, PK, FK, unique, enums | M1 | DATA_MODEL.md |
| 5 | Database Migrations | Drizzle Kit / migration runner executable against fresh PostgreSQL | M1 | ORIGINAL_REQUEST.md |
| 6 | App Bootstrap & Scripts | Next.js App Router setup with `npm run dev`, `build`, `lint`, `test`, `db:migrate`, `db:seed` | M1 | ORIGINAL_REQUEST.md |
| 7 | Dual-Mode Authentication | Google OAuth / OIDC flow + local Mock Auth role-switching for dev/test | M2 | ORIGINAL_REQUEST.md, ADR-005 |
| 8 | Route Protection Middleware | Next.js middleware redirecting unauthenticated requests to `/login` | M2 | ORIGINAL_REQUEST.md |
| 9 | Server-Side RBAC Enforcement | 5 roles (Super Admin, IT Admin, Asset Admin, Software Admin, Auditor) enforced on API routes | M2 | ORIGINAL_REQUEST.md, ADR-005 |
| 10 | Auditor Read-Only Invariant | Auditor role strictly prohibited from write operations (returns 403) | M2 | ORIGINAL_REQUEST.md, ADR-005 |
| 11 | Device Credential Encryption | PINs encrypted at rest using AES-256-GCM, never stored in plain text | M2 | ADR-004, AGENTS.md |
| 12 | Secure Credential Reveal | Reveal endpoint requiring admin permissions and writing audit record | M2 | ADR-004, AGENTS.md |
| 13 | Immutable Audit Logging | System recording all CUD mutations + 5 sensitive actions to `audit_events` | M2 | DATA_MODEL.md, AGENTS.md |
| 14 | Audit API Access Control | `/api/audit` accessible exclusively to Super Admin and Auditor | M2 | ORIGINAL_REQUEST.md |
| 15 | Account Spreadsheet Ingestion | Ingests 42 accounts from XLSX with role/department resolution | M3 | spreadsheet-mapping.md |
| 16 | Multi-Domain Account Parsing | Parses comma-separated domains per account into `account_domains` | M3 | spreadsheet-mapping.md |
| 17 | Google Group & Membership Ingestion | Imports 15 Google Groups and ~168 memberships with email resolution | M3 | spreadsheet-mapping.md |
| 18 | Hardware Device & Specs Ingestion | Imports 31 laptops and 1:1 hardware specifications | M3 | spreadsheet-mapping.md |
| 19 | Fuzzy PIC Device Assignment | Matches PIC names to accounts; sets reserve/available/decommissioned | M3 | spreadsheet-mapping.md |
| 20 | Credential Encrypted Ingestion | Ingests device credentials with AES-256-GCM encryption | M3 | spreadsheet-mapping.md, ADR-004 |
| 21 | Software Ingestion & Enrichment | Imports 125 applications with Drop Down sheet subscription enrichment | M3 | spreadsheet-mapping.md |
| 22 | Department Canonicalization | Normalizes disparate department strings across all sheets | M3 | spreadsheet-mapping.md |
| 23 | Ingestion Idempotency | Seed/import scripts safe to run multiple times without duplicates | M3 | ORIGINAL_REQUEST.md |
| 24 | Command Center Shell & Sidebar | Global navigation sidebar linking to all domain sections and status UI | M4 | DESIGN.md |
| 25 | UI Design System Components | Resource card pattern, tabbed views, status color language (🟢🔵⚪🟡🟠🔴⚫) | M4 | DESIGN.md |
| 26 | Identity Domain Pages | Account list (search/filters) and detail page (groups, assets, history) | M4 | ORIGINAL_REQUEST.md, DESIGN.md |
| 27 | Groups Domain Pages | Group list, detail page, and full 42x15 membership matrix view | M4 | ORIGINAL_REQUEST.md, DESIGN.md |
| 28 | Assets Domain Pages | Device list (status/specs/PIC), detail page, and PIN reveal modal | M4 | ORIGINAL_REQUEST.md, DESIGN.md |
| 29 | Software Domain Pages | Application list (department/subscription filters) and detail page | M4 | ORIGINAL_REQUEST.md, DESIGN.md |
| 30 | Audit Log Viewer Page | `/audit` page displaying chronological event stream with filters | M4 | ORIGINAL_REQUEST.md, DESIGN.md |
| 31 | Login & Role Selector Page | Login page supporting Google OAuth and local mock authentication | M4 | ORIGINAL_REQUEST.md |
| 32 | 100% E2E Test Pass (Tiers 1-4) | Pass all functional, boundary, combination, and workload tests | Final-P1 | ORIGINAL_REQUEST.md |
| 33 | Adversarial Coverage Hardening | White-box adversarial testing and gap elimination (Tier 5) | Final-P2 | Project Pattern |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Test infra, Tier 1 (Feature), Tier 2 (Boundary), Tier 3 (Pairwise), Tier 4 (Workload) | none | DONE (180 tests ready) |
| M1 | App Foundation, Schema & Migrations | Next.js 15, Drizzle ORM, 13 tables, migrations, reference seed scripts | none | DONE (13 tables, 9 enums, 8 depts, 5 roles, 3 domains) |
| M2 | Auth, RBAC & Audit System | Google/Mock Auth, Middleware, RBAC (5 roles), AES-256 PIN crypto, audit logger | M1 | IN_PROGRESS |
| M3 | Spreadsheet Ingestion Engine | 3 XLSX workbooks, normalization, fuzzy matching, PIN encryption, idempotency | M1, M2 | PLANNED |
| M4 | Domain CRUD Pages & Navigation UI | Sidebar shell, design system, Identity, Groups, Assets, Software, Audit, Login | M1, M2, M3 | PLANNED |
| Final | 100% E2E Pass & Adversarial Hardening | Phase 1 (100% Tier 1-4 pass) -> Phase 2 (Adversarial coverage hardening) | M4, E2E | PLANNED |

## Interface Contracts

### M1 ↔ M2, M3, M4: Database Schema (`src/lib/db/schema.ts`)
- Exports all Drizzle tables: `departments`, `accountRoles`, `domains`, `accounts`, `accountDomains`, `googleGroups`, `groupMemberships`, `devices`, `deviceSpecifications`, `deviceAssignments`, `deviceCredentials`, `applications`, `auditEvents`.
- Enums: `accountTypeEnum`, `accountStatusEnum`, `syncStatusEnum`, `groupRoleEnum`, `groupSourceEnum`, `deviceStatusEnum`, `appCategoryEnum`, `subscriptionTypeEnum`, `appStatusEnum`.
- Connection: `db` exported from `src/lib/db/client.ts`.

### M2 ↔ M3, M4: Auth, RBAC & Crypto (`src/lib/auth/`, `src/lib/crypto/`, `src/domains/audit/`)
- `getUserSession(req: Request): Promise<UserSession | null>`
- `hasPermission(role: Role, action: Action, resource: Resource): boolean`
- `requireRole(roles: Role[]): Promise<UserSession>`
- `encryptPin(pin: string): { ciphertext: string, iv: string, tag: string }`
- `decryptPin(encrypted: string): string`
- `logAuditEvent(event: { actorId?: string, action: string, entityType: string, entityId?: string, metadata?: Record<string, any>, ipAddress?: string }): Promise<void>`

### M3 ↔ M4: Ingestion Engine (`scripts/import-spreadsheets.ts`, `src/domains/*/service.ts`)
- Script: `npm run db:import` executes the idempotent pipeline.
- Database contains 42 accounts, 15 groups, 31 devices with specs and credentials, 125 applications.

## Code Layout
```
/home/noah/project/core/
├── scripts/
│   ├── migrate.ts
│   ├── seed-reference.ts
│   └── import-spreadsheets.ts
├── src/
│   ├── app/
│   │   ├── (admin)/
│   │   │   ├── accounts/
│   │   │   ├── assets/
│   │   │   ├── audit/
│   │   │   ├── groups/
│   │   │   ├── software/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── api/
│   │   │   ├── accounts/
│   │   │   ├── assets/
│   │   │   ├── audit/
│   │   │   ├── auth/
│   │   │   ├── groups/
│   │   │   ├── import/
│   │   │   └── software/
│   │   ├── login/
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── layout/ (Sidebar, Topbar)
│   │   ├── ui/ (Button, Card, Tabs, Modal, etc.)
│   │   └── feedback/ (StatusBadge, StatusDot)
│   ├── domains/
│   │   ├── access/
│   │   ├── assets/
│   │   ├── audit/
│   │   ├── groups/
│   │   ├── identity/
│   │   └── software/
│   ├── lib/
│   │   ├── auth/ (session, rbac, mock)
│   │   ├── crypto/ (cipher)
│   │   └── db/ (client, schema)
│   └── middleware.ts
└── tests/
    ├── e2e/
    └── fixtures/
```
