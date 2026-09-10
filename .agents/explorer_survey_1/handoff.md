# Phase 0 Survey Handoff Report: Frontend UI/UX, Page Specifications & Architecture Integration

- **Agent**: `explorer_survey_1` (teamwork_preview_explorer)
- **Parent Conversation ID**: `2a2e0c6b-97bf-45c3-8284-e57d986edeac`
- **Date**: 2026-09-09T00:20:00+07:00
- **Mission**: Thorough investigation of Frontend UI/UX, Page Specifications, System/Architecture Integration, and Next.js Application Blueprint for CORE (Company Operations, Resources & Environment).

---

## 1. Observation

### 1.1 Existing Repository State
Direct filesystem inspection using `list_dir` on `/home/noah/project/core`:
- Documentation files present: `ORIGINAL_REQUEST.md`, `DESIGN.md`, `PRD.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `AGENTS.md`, `README.md`, `ROADMAP.md`, `TODO.md`.
- Architectural Decision Records in `docs/adr/`:
  - `ADR-001-modular-monolith.md`
  - `ADR-002-postgresql.md`
  - `ADR-003-google-workspace.md`
  - `ADR-004-secrets-management.md`
  - `ADR-005-rbac.md`
- Domain specifications in `docs/domains/`: `identity.md`, `groups.md`, `assets.md`, `software.md`, `access.md`, `automation.md`.
- Data mappings in `docs/data/`: `spreadsheet-mapping.md`.
- Integrations in `docs/integrations/`: `google-workspace.md`.
- Source code / package status: Currently no `package.json`, `src/`, or node modules exist in `/home/noah/project/core`. The project is at the pristine start of Phase 0.

### 1.2 Core Requirements from `ORIGINAL_REQUEST.md`
- **Goal**: "Build CORE (Company Operations, Resources & Environment), an internal administrative platform that replaces company spreadsheets for managing accounts, Google Groups, hardware devices, and software applications. This is a production-quality MVP for a small team of IT administrators." (`ORIGINAL_REQUEST.md:5`)
- **R1**: "Full-stack Next.js application with PostgreSQL database... Next.js (App Router) application with TypeScript, a PostgreSQL database with all 12 tables defined in `DATA_MODEL.md`, an ORM (Drizzle or Prisma), database migrations, and seed scripts for reference data (8 departments, 5 account roles, 3 domains). The app must start with `npm run dev`... Include a `.env.example`..." (`ORIGINAL_REQUEST.md:29-32`)
- **R2**: "Authentication and authorization... Google OAuth / OIDC login flow... RBAC middleware enforcing 5 roles (Super Admin, IT Admin, Asset Admin, Software Admin, Auditor)... Unauthenticated requests must be redirected to login. Auditor role must be read-only. Include an audit logging system that records all create, update, delete, and sensitive operations to the `audit_events` table." (`ORIGINAL_REQUEST.md:33-36`)
- **R3**: "Spreadsheet data import... reads the 3 source `.xlsx` spreadsheets and populates CORE's database tables following the exact column mapping in `docs/data/spreadsheet-mapping.md`... 42 accounts, 15 Google Groups, 31 devices with specs and credentials, 125 applications. PIN encryption for device credentials. Idempotent import." (`ORIGINAL_REQUEST.md:37-40`)
- **R4**: "CRUD pages for all four domains: Identity, Groups, Assets, Software... Pages must follow the List Page Pattern and Resource Page Pattern described in `DESIGN.md` — resource cards with status indicators, tabbed detail views (Overview, Relationships, History), and the status color language (🟢 Active, 🔵 Assigned, ⚪ Available, etc.). The UI should feel like a calm infrastructure command center, not a spreadsheet clone." (`ORIGINAL_REQUEST.md:41-50`)
- **R5**: "Audit trail visibility: An audit log page (accessible to Super Admin and Auditor roles) that displays audit events in reverse chronological order with actor, action, entity type, entity ID, and timestamp. Basic filtering by entity type and action." (`ORIGINAL_REQUEST.md:51-54`)

### 1.3 Design System Directives from `DESIGN.md`
- **Aesthetic**: "CORE should feel like a calm infrastructure command center. Not: Spreadsheet 2.0, Generic corporate ERP dashboard #47." (`DESIGN.md:3-9`)
- **Principles**:
  1. "Resource-First: CORE manages company resources (Account, Device, Application, License, Group). Each resource has its own lifecycle." (`DESIGN.md:14-25`)
  2. "Relationship-First: ACCOUNT belongs to PERSON member of GROUPS assigned DEVICE uses SOFTWARE." (`DESIGN.md:26-53`)
  3. "Information Without Overload: Instead of 50 columns, use Summary, Details, Relationships, History." (`DESIGN.md:54-63`)
- **Resource Page Pattern**: Resource card header with name, status indicator, identifier; followed by tabbed content: Overview, Specifications, Assignment, Software, Access, History. (`DESIGN.md:65-88`)
- **List Page Pattern**: Title + Add Action, Search bar, Filters, and clean resource cards/rows showing icon, name, sub-details, and status indicators. (`DESIGN.md:92-115`)
- **Status Language**:
  - `Active` → 🟢
  - `Assigned` → 🔵
  - `Available` → ⚪
  - `Pending` → 🟡
  - `Attention` → 🟠
  - `Issue` → 🔴
  - `Archived` → ⚫ (`DESIGN.md:118-132`)

### 1.4 Architecture & System Boundaries
- **Modular Monolith**: Layered as Presentation, Application, Domain, Infrastructure, Integrations (`ARCHITECTURE.md:98-114`).
- **Database**: PostgreSQL with 12 core entity tables + `audit_events` table (`DATA_MODEL.md:64-280`). Contains PostgreSQL-specific types (`inet` for IP address, `uuid`, `timestamptz`, `jsonb`, `enum`).
- **Secrets**: Passwords and PINs must be encrypted at rest (AES-256-GCM), never plain text; reveal operations must be logged to `audit_events` and restricted to Super Admin / IT Admin (`ADR-004`, `docs/domains/access.md`).
- **RBAC**: 5 roles evaluated strictly server-side (`ADR-005`). Auditor is read-only everywhere.

---

## 2. Logic Chain

### 2.1 ORM Evaluation & Architectural Recommendation: Drizzle ORM vs. Prisma
Based on `ARCHITECTURE.md`, `DATA_MODEL.md`, `TODO.md` ("Decisions Needed: ORM: Prisma or Drizzle"), and `ADR-001`/`ADR-002`:

1. **Schema Modularity (ADR-001 Modular Monolith)**:
   - *Prisma*: Requires a single monolithic `schema.prisma` file (or complex multi-file preview configurations) where all domain models are blended together.
   - *Drizzle ORM*: Allows defining domain schemas in TypeScript files inside each domain folder (`src/domains/identity/schema.ts`, `src/domains/assets/schema.ts`, `src/domains/software/schema.ts`, `src/domains/groups/schema.ts`, `src/domains/audit/schema.ts`), which are then exported through `src/db/schema.ts`. This directly enforces modular boundaries.
2. **PostgreSQL Native Type Support (`DATA_MODEL.md:269-280`)**:
   - `audit_events.ip_address` is typed as PostgreSQL `inet`. Drizzle has first-class custom and native pg type definitions. Prisma requires mapping `inet` to `String` and loses native PostgreSQL CIDR/inet network validation.
   - `audit_events.metadata` is `jsonb`. Drizzle provides typed JSON column schemas with zero serialization friction.
   - PostgreSQL enums (`account_type`, `account_status`, `device_status`, `app_category`, `group_sync_status`) are natively generated via `pgEnum` in Drizzle.
3. **Runtime Performance & Cold Starts**:
   - *Prisma*: Bundles an external Rust query engine binary, which adds 30MB+ to bundle sizes and incurs engine start latency on serverless/Next.js edge and node runtimes.
   - *Drizzle ORM*: 100% lightweight TypeScript SQL builder with zero binaries. Executes directly over standard `postgres` (`postgres.js`) or `pg` connection pools.
4. **Conclusion on ORM**: **Drizzle ORM** is strongly recommended as the primary ORM for CORE. It aligns with Modular Monolith principles, has native PostgreSQL type fidelity, zero binary footprint, and clean migration tooling (`drizzle-kit`).

### 2.2 Next.js App Router Structure & Directory Layout
To satisfy the layered modular monolith described in `ARCHITECTURE.md:116-137`:

```
/home/noah/project/core/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── drizzle.config.ts
├── .env.example
├── .env.local
│
├── public/
│   └── favicon.ico
│
├── scripts/
│   ├── migrate.ts                   # Drizzle migration executor
│   ├── seed-reference.ts            # Seeds 8 depts, 5 roles, 3 domains
│   └── import-spreadsheets.ts       # 12-step spreadsheet ingestion pipeline
│
└── src/
    ├── app/                         # Next.js App Router (Presentation & Routes)
    │   ├── layout.tsx               # Root layout (Inter font, Theme provider)
    │   ├── globals.css              # Tailwind directives, CSS variables, typography
    │   ├── login/
    │   │   └── page.tsx             # OAuth Login + Dev Mock Role Selector
    │   │
    │   ├── (admin)/                 # Authenticated Command Center Shell
    │   │   ├── layout.tsx           # Admin shell: Sidebar, Topbar, Breadcrumbs
    │   │   ├── page.tsx             # Command Center Dashboard (Overview & Stats)
    │   │   │
    │   │   ├── accounts/            # Identity Domain
    │   │   │   ├── page.tsx         # Account list with search, department & role filters
    │   │   │   └── [id]/
    │   │   │       └── page.tsx     # Account detail (Overview, Groups, Assets, History)
    │   │   │
    │   │   ├── groups/              # Groups Domain
    │   │   │   ├── page.tsx         # Google Groups catalog with sync status
    │   │   │   ├── matrix/
    │   │   │   │   └── page.tsx     # Full membership matrix view (42 users x 15 groups)
    │   │   │   └── [id]/
    │   │   │       └── page.tsx     # Group detail (Members, Sync diagnostics, History)
    │   │   │
    │   │   ├── assets/              # Assets Domain
    │   │   │   ├── page.tsx         # Device inventory with status, PIC, brand filters
    │   │   │   └── [id]/
    │   │   │       └── page.tsx     # Device detail (Specs, Assignment, Credentials PIN reveal)
    │   │   │
    │   │   ├── software/            # Software Domain
    │   │   │   ├── page.tsx         # Applications catalog (125 tools, dept & sub filters)
    │   │   │   └── [id]/
    │   │   │       └── page.tsx     # Application detail (Overview, Dept access, Licenses)
    │   │   │
    │   │   └── audit/               # Audit Domain (Super Admin & Auditor only)
    │   │       └── page.tsx         # Immutable audit trail with actor/action/entity filters
    │   │
    │   └── api/                     # Server-Side API Handlers (RBAC protected)
    │       ├── auth/
    │       │   ├── login/route.ts   # Google OAuth callback or Mock session creator
    │       │   ├── logout/route.ts  # Session destruction
    │       │   └── me/route.ts      # Current authenticated user & permissions
    │       ├── accounts/
    │       │   ├── route.ts         # GET (list/search), POST (create)
    │       │   └── [id]/route.ts    # GET (detail), PATCH (update), DELETE
    │       ├── groups/
    │       │   ├── route.ts         # GET (list), POST (create)
    │       │   ├── sync/route.ts    # POST (trigger Google Workspace sync)
    │       │   └── [id]/route.ts    # GET (detail), POST (memberships)
    │       ├── assets/
    │       │   ├── route.ts         # GET (list), POST (create)
    │       │   ├── [id]/route.ts    # GET (detail), PATCH (update), DELETE
    │       │   └── [id]/credentials/reveal/route.ts # POST (decrypt PIN + audit log)
    │       ├── software/
    │       │   ├── route.ts         # GET (list), POST (create)
    │       │   └── [id]/route.ts    # GET (detail), PATCH (update), DELETE
    │       ├── audit/
    │       │   └── route.ts         # GET (query audit events)
    │       └── import/
    │           └── route.ts         # POST (trigger idempotent spreadsheet ingestion)
    │
    ├── components/                  # Reusable UI Design System
    │   ├── ui/                      # Atoms: Button, Input, Select, Badge, Card, Modal, Tabs
    │   ├── layout/                  # Sidebar, Topbar, UserMenu, Breadcrumbs, PageHeader
    │   ├── feedback/                # StatusDot, StatusBadge, EmptyState, LoadingSkeleton
    │   └── shared/                  # SearchInput, FilterBar, Pagination, JsonViewer
    │
    ├── domains/                     # Domain Logic & Data Schemas (Modular Monolith)
    │   ├── identity/
    │   │   ├── schema.ts            # accounts, departments, account_roles, domains, account_domains
    │   │   ├── types.ts             # Domain models & validation schemas (zod)
    │   │   └── service.ts           # Business logic & repository methods
    │   ├── groups/
    │   │   ├── schema.ts            # google_groups, group_memberships
    │   │   ├── types.ts
    │   │   └── service.ts
    │   ├── assets/
    │   │   ├── schema.ts            # devices, device_specifications, device_assignments
    │   │   ├── types.ts
    │   │   └── service.ts
    │   ├── access/
    │   │   ├── schema.ts            # device_credentials
    │   │   ├── types.ts
    │   │   └── service.ts           # PIN encryption, decryption, rotation
    │   ├── software/
    │   │   ├── schema.ts            # applications
    │   │   ├── types.ts
    │   │   └── service.ts
    │   └── audit/
    │       ├── schema.ts            # audit_events
    │       ├── types.ts
    │       └── service.ts           # Immutable audit logger
    │
    ├── lib/                         # Cross-cutting Infrastructure
    │   ├── db/
    │   │   ├── client.ts            # PostgreSQL connection pool & Drizzle client
    │   │   └── schema.ts            # Unified schema export
    │   ├── auth/
    │   │   ├── session.ts           # Cookie/JWT session management
    │   │   ├── rbac.ts              # 5 RBAC roles, permission matrix, can() helper
    │   │   └── mock.ts              # Local development mock auth provider
    │   ├── crypto/
    │   │   └── cipher.ts            # AES-256-GCM encryption/decryption for PINs (ADR-004)
    │   └── utils/
    │       ├── formatting.ts        # Date, email, asset number formatters
    │       └── cn.ts                # clsx + twMerge utility
    │
    └── middleware.ts                # Edge/Node Next.js authentication & route guard
```

### 2.3 Required Scripts and Tooling
The `package.json` must provide standard, verifiable scripts matching Acceptance Criteria (`ORIGINAL_REQUEST.md:57-62`):
- `npm run dev`: Starts Next.js development server on `http://localhost:3000`.
- `npm run build`: Executes `next build` ensuring zero TypeScript (`tsc`) or lint errors.
- `npm run start`: Runs the production Next.js server.
- `npm run lint`: Runs ESLint across the codebase.
- `npm run typecheck`: Runs `tsc --noEmit` to verify type safety.
- `npm run db:generate`: Uses `drizzle-kit` to generate SQL migrations into `drizzle/`.
- `npm run db:migrate`: Executes migrations against the configured PostgreSQL instance.
- `npm run db:seed`: Seeds reference tables (8 departments, 5 roles, 3 domains).
- `npm run db:import`: Executes the idempotent spreadsheet ingestion pipeline from `/home/noah/Documents/sheets/*.xlsx`.
- `npm run test`: Runs unit and integration tests (Vitest).
- `npm run test:e2e`: Runs end-to-end browser tests (Playwright).

### 2.4 Environment Variables Specification (`.env.example`)
```bash
# ==============================================================================
# CORE (Company Operations, Resources & Environment) Environment Configuration
# ==============================================================================

# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/core_db"

# Application Environment & URLs
NODE_ENV="development"
PORT=3000
NEXTAUTH_URL="http://localhost:3000"
APP_URL="http://localhost:3000"

# Session & JWT Secrets (Generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="super-secret-core-session-token-change-in-production-min-32-chars"

# Authentication Flags
# When true, enables local mock login picker for development and automated testing
AUTH_MOCK_ENABLED=true

# Google Workspace OAuth 2.0 Credentials (for Production / Real Google Login)
GOOGLE_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"

# Credential Encryption Key for ADR-004 (AES-256-GCM, 32-byte hex key = 64 characters)
# Generate with: node -e "console.log(crypto.randomBytes(32).toString('hex'))"
CREDENTIAL_ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

# Spreadsheet Ingestion Directory
SPREADSHEET_DIR="/home/noah/Documents/sheets"
```

---

## 3. Frontend UI/UX Design System Specification

### 3.1 Design Philosophy: Calm Infrastructure Command Center
Following `DESIGN.md` and the `anti-vibecoded-ui-review` / `ui-ux-enhancer` skills:
- **Tone**: High-contrast, sober, intentional, and utility-first. Avoid generic purple SaaS gradients, floating orbs, decorative glassmorphism, or "boring rectangle factory" grids.
- **Palette Tokens**:
  - Background: Neutral zinc/slate tones (`bg-zinc-50` / `bg-white` in light mode, `bg-zinc-950` / `bg-zinc-900` in dark mode).
  - Borders: Crisp hairline borders (`border-zinc-200` / `border-zinc-800`).
  - Monospace Identifiers: For asset numbers (`LGI-CD-2024-042`), email addresses, PIN masks, IP addresses (`JetBrains Mono` or `ui-monospace`).
  - Text: High-readability sans (`Inter` or system-ui).
- **The 3-Layer UI Rule**:
  1. *Layer 1: Orientation* (Where am I?): Clear breadcrumb, domain badge, active navigation item.
  2. *Layer 2: Understanding* (What is happening?): Prominent status badge (🟢 Active, 🔵 Assigned), high-level summary cards, primary metadata.
  3. *Layer 3: Action* (What should I do?): Explicit primary button (`+ Add Device`, `Assign`, `Reveal PIN`), contextual quick filters.

### 3.2 Persistent Navigation Sidebar
- **Width**: Fixed 256px (`w-64`), full height (`h-screen`), sticky left.
- **Header**:
  - CORE logotype (`CORE`) in bold monospace.
  - Subtitle: `Operations & Infrastructure`.
  - System Health Beacon: `🟢 Database Connected` (or `🟡 Sync Pending`).
- **Omnibox Search Trigger**: Quick search trigger button with `Cmd+K` keyboard shortcut.
- **Navigation Links**:
  | Section | Route | Icon | Description |
  |---|---|---|---|
  | **Command Center** | `/` | 📊 LayoutDashboard | System overview, health metrics, quick stats |
  | **Identity** | `/accounts` | 👥 Users | Accounts, departments, roles, domains |
  | **Google Groups** | `/groups` | 💬 FolderGit2 | Groups catalog, member counts, sync status |
  | ↳ *Matrix View* | `/groups/matrix` | 🔲 Grid | Full 42x15 cross-tabulation matrix |
  | **Assets & Hardware**| `/assets` | 💻 Laptop | Laptops, hardware specs, assignments |
  | **Software & Tools** | `/software` | 🧩 Layers | 125 applications, categories, subscriptions |
  | **Audit Trail** | `/audit` | 🛡️ ShieldAlert | Immutable event log (Super Admin & Auditor) |
- **User / Footer Bar**:
  - Current user name and email.
  - Role pill (e.g. `[Super Admin]`, `[IT Admin]`, `[Auditor]`).
  - Quick Role Switcher (in Mock Mode).
  - Sign Out button.

### 3.3 Standardized Status Color Language (`DESIGN.md:118-132`)
Every resource state maps to unambiguous visual tokens with text label and color dot:
| State | Indicator | Tailwind Class | Semantic Meaning |
|---|---|---|---|
| **Active** | 🟢 | `bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400` | Operational account, active application, healthy group |
| **Assigned** | 🔵 | `bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400` | Device assigned to a primary employee (PIC) |
| **Available** | ⚪ | `bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300` | Unassigned device in inventory, ready for deployment |
| **Pending / Reserve** | 🟡 | `bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400` | Backup device ("Laptop cadangan"), pending Google sync |
| **Attention** | 🟠 | `bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400` | Google sync conflict, expiring license, shared PIN alert |
| **Issue / Retired** | 🔴 | `bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400` | Decommissioned device ("Akan dijual"), suspended account |
| **Archived** | ⚫ | `bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-900 dark:text-slate-400` | Former accounts, historical assignment records |

### 3.4 List Page Pattern Specification
Used across Accounts, Groups, Assets, Software, and Audit:
1. **Header Bar**:
   - Page title and resource icon.
   - Summary stat pills (e.g. `Total: 31`, `Assigned: 26`, `Available: 2`, `Reserve: 2`, `Decommissioned: 1`).
   - Primary action button (e.g., `+ Add Device`, `+ Create Account`, `Sync with Google Workspace`).
2. **Filter & Search Toolbar**:
   - Debounced search input (searches across name, email, asset number, model, PIC).
   - Domain-specific dropdown filters (Department, Role, Status, Category, Brand).
   - Active filter tags with "Clear all" button.
   - View mode toggle (Dense Table view vs Resource Cards).
3. **Data Grid / Cards**:
   - High readability, alternating row highlights or subtle borders.
   - Hover preview, keyboard navigation accessibility.
   - Pagination bar (`Showing 1–25 of 125 items`, page selector, rows per page).
4. **Empty & Error States**:
   - Contextual empty message (e.g. "No devices found matching 'MSI' with status 'Available'").
   - Single-click "Reset Filters" action button.

### 3.5 Resource Page Pattern Specification (Detail Views)
Used across individual Account, Group, Device, and Application views:
1. **Hero Header**:
   - Resource icon + primary display title (`💻 LeadGeeks-011` or `Amanda Stevany`).
   - Status Badge (`🔵 Assigned`, `🟢 Active`).
   - Canonical identifier tag (`LGI-CD-2024-042`, `amanda@leadgeeksinc.com`).
   - Contextual actions toolbar: `Edit`, `Assign/Reassign`, `Reveal PIN` (with audit confirmation modal), `Decommission`.
2. **Tabbed Content Container**:
   - **Tab 1: Overview**: Core properties, metadata, dates, notes.
   - **Tab 2: Specifications / Properties**: Technical specs (CPU, RAM, ROM) or configuration.
   - **Tab 3: Relationships**: Cross-domain linkages (Assigned user, Custodian, Groups, Software).
   - **Tab 4: Credentials / Access (when applicable)**: Encrypted credentials, masked PIN, reveal button.
   - **Tab 5: History & Audit**: Chronological log of assignments, status changes, and modifications.

---

## 4. Complete Page Inventory & Feature Requirements

### Page 1: Login & Authentication (`/login`)
- **Route**: `src/app/login/page.tsx`
- **Access**: Public (redirects to `/` if session cookie already valid).
- **Core Functionality**:
  - Primary button: "Sign in with Google Workspace" initiating OAuth 2.0 / OIDC flow.
  - **Dev/Mock Login Selector** (enabled when `AUTH_MOCK_ENABLED=true`):
    - Allows seamless switching between all 5 RBAC roles during development and testing:
      1. `Super Admin` (`admin@leadgeeksinc.com`) — Full administrative & audit access.
      2. `IT Admin` (`it@leadgeeksinc.com`) — Identity, Groups, Assets, Software management; credential reveal; no audit logs.
      3. `Asset Admin` (`assets@leadgeeksinc.com`) — Hardware & device management; read-only elsewhere.
      4. `Software Admin` (`software@leadgeeksinc.com`) — Application & license management; read-only elsewhere.
      5. `Auditor` (`auditor@leadgeeksinc.com`) — Strictly read-only across all resources + audit log viewer.
    - One-click "Sign in as Mock User" button creating a valid session cookie.
  - Records `auth.login` in `audit_events`.

### Page 2: Command Center Dashboard (`/`)
- **Route**: `src/app/(admin)/page.tsx`
- **Access**: All authenticated roles.
- **Core Functionality**:
  - Summary KPI cards:
    - Accounts: 42 total (40 personal, 1 service, 1 shared) across 8 departments.
    - Google Groups: 15 groups, 168 memberships, sync status.
    - Hardware Devices: 31 laptops (26 assigned, 2 available, 2 reserve, 1 decommissioned).
    - Applications: 125 tools across 7 departments.
  - System Health status indicator (PostgreSQL connection, Google Workspace sync status).
  - Quick action shortcuts (`Import Spreadsheets`, `Register Device`, `Sync Groups`).
  - Recent Audit Activity feed (showing latest 5 events).

### Page 3: Identity — Accounts List (`/accounts`)
- **Route**: `src/app/(admin)/accounts/page.tsx`
- **Access**: All authenticated roles (Read-only for Auditor, Asset Admin, Software Admin; Write for Super Admin and IT Admin).
- **Core Functionality**:
  - Summary badges: `42 Total Accounts`, `40 Personal`, `1 Service`, `1 Shared`, `42 Active`.
  - Search: Full name, display name, primary email, previous email.
  - Multi-select filters:
    - Department (8 options: Management Office, Operations, Growth, Experience, HRD, ITE, FAC, General).
    - Role Level (Top Management [L1], Leaders [L2], Non-Leaders [L3], Staff [L4], Commercial [L5]).
    - Domain (`leadgeeksinc.com`, `leadgeeksinc.co`, `leadgeeksprospecting.com`).
    - Account Type (`personal`, `service`, `shared`).
    - Status (`active`, `suspended`, `archived`).
  - Table Columns:
    - Name (Display name + Full legal name).
    - Primary Email (with badge if pre-migration email exists).
    - Department (Department name + short code badge, e.g., `OPS`, `HRD`).
    - Account Role & Level (`Leaders [L2]`, etc.).
    - Assigned Domains (Pills for `.com`, `.co`).
    - Group Count (e.g., `6 groups`).
    - Assigned Device (e.g., `LeadGeeks-011` or `—`).
    - Status Badge (🟢 Active).
    - Quick actions menu: View Details, Edit (IT/Super Admin), Deactivate.
  - Pagination (20 accounts per page).

### Page 4: Identity — Account Detail (`/accounts/[id]`)
- **Route**: `src/app/(admin)/accounts/[id]/page.tsx`
- **Core Functionality**:
  - Header: Display Name, Legal Full Name, Email, Status Badge, Role Badge, Department Badge.
  - Tab 1: **Overview**: Contact information, migration notes, account type, department code, assigned domains.
  - Tab 2: **Google Groups**: Table of all groups the account belongs to, user's role in each group (`member`, `manager`, `owner`), and addition date.
  - Tab 3: **Hardware & Devices**: Devices currently assigned to this user (Primary PIC or Custodian/PIC 2), asset number, computer name, model, assignment date.
  - Tab 4: **Software Access**: List of software applications assigned or used by the user's department.
  - Tab 5: **History**: Timeline of changes, group additions/removals, role modifications from `audit_events`.

### Page 5: Groups — Google Groups List (`/groups`)
- **Route**: `src/app/(admin)/groups/page.tsx`
- **Access**: All authenticated roles (Write/Sync for Super Admin and IT Admin; Read-only for others).
- **Core Functionality**:
  - Summary stats: `15 Groups`, `168 Total Memberships`, `15 Synced / 0 Conflicts`.
  - Search: Group display name, group email address.
  - Filter: Sync status (`synced`, `pending`, `conflict`, `error`).
  - Table Columns:
    - Group Name (`LeadGeeks Team`, `LeadGeeks Operations Team`, etc.).
    - Group Email (`team@leadgeeksinc.com`, `operations.calendar@leadgeeksinc.co`).
    - Member Count (cached count e.g., `38`, `23`, `16`).
    - Sync Status (🟢 Synced, 🟠 Pending, 🔴 Conflict).
    - Last Synced Timestamp.
    - Quick actions: View Details, Open in Matrix, Trigger Manual Sync.
  - Navigation button to toggle directly to **Membership Matrix View**.

### Page 6: Groups — Google Group Detail (`/groups/[id]`)
- **Route**: `src/app/(admin)/groups/[id]/page.tsx`
- **Core Functionality**:
  - Header: Group Name, Group Email, Member Count, Sync Status badge.
  - Action buttons: `Sync with Google`, `Add Member` (IT/Super Admin).
  - Tab 1: **Members**: Filterable table of all member accounts in the group:
    - Member Name & Email.
    - Department & Role.
    - Role in Group (`member`, `manager`, `owner`).
    - Membership Source (`spreadsheet`, `google_sync`, `manual`).
    - Action: Remove Member (IT/Super Admin, logs to audit).
  - Tab 2: **Sync Diagnostics**: Google Workspace ID, sync timestamps, conflict warnings.
  - Tab 3: **History**: Membership audit trail (who was added or removed and when).

### Page 7: Groups — Membership Matrix View (`/groups/matrix`)
- **Route**: `src/app/(admin)/groups/matrix/page.tsx`
- **Core Functionality**:
  - Full cross-tabulation visual grid:
    - Rows: All 42 company accounts (sorted by Department and Level, filterable).
    - Columns: All 15 Google Groups (sticky header).
    - Intersection: Checkmark badge (✓) if the account is a member of the group; empty cell if not.
  - Tooltip on checkmark: Shows role (`member`/`manager`), source, and addition date.
  - Filters & Highlights:
    - Filter rows by Department (e.g. Show only Operations [20 accounts]).
    - Highlight power members (accounts belonging to > 5 groups).
  - Export matrix as CSV button.

### Page 8: Assets — Hardware Devices List (`/assets`)
- **Route**: `src/app/(admin)/assets/page.tsx`
- **Access**: All authenticated roles (Write for Super Admin and Asset Admin; Read-only for others).
- **Core Functionality**:
  - Summary metric pills: `Total: 31`, `Assigned: 26 (84%)`, `Available: 2`, `Reserve: 2`, `Decommissioned: 1`.
  - Search: Asset number (`LGI-CD-2024-042`), Computer name (`LeadGeeks-011`), Brand (`LENOVO`), Model (`IDEAPAD SLIM 3`), Assignee PIC name (`Amanda`).
  - Filters:
    - Status (`assigned`, `available`, `reserve`, `decommissioned`).
    - Brand (`LENOVO` [21], `MSI` [9], `ASUS` [1]).
    - Antivirus installed (`Yes` / `No`).
    - RAM / Processor / Storage.
  - Table Columns:
    - Asset Number (Monospace, e.g., `LGI-CD-2024-042`).
    - Computer Name (`LeadGeeks-011`).
    - Brand & Model (`LENOVO IDEAPAD SLIM 3 14AMN8`).
    - Status Badge (🔵 Assigned, ⚪ Available, 🟡 Reserve, 🔴 Decommissioned).
    - Primary Assignee (PIC name + department badge, or `Unassigned`).
    - Secondary Custodian (PIC 2 name if present).
    - Specs summary (`i5 / 16 GB / SSD 512 GB`).
    - Antivirus indicator (🛡️ Installed / ⚠️ Missing).
    - Actions: View Details, Edit Device, Reassign.
  - Pagination controls.

### Page 9: Assets — Hardware Device Detail (`/assets/[id]`)
- **Route**: `src/app/(admin)/assets/[id]/page.tsx`
- **Core Functionality**:
  - Header: Computer Name, Asset Number, Status Badge, Brand & Model.
  - Actions toolbar: `Edit Device`, `Reassign Device`, `Decommission`, `Reveal PIN`.
  - Tab 1: **Overview & Specifications**:
    - Asset metadata: Asset Number, Computer Name, Brand, Model, Purchase Date, Antivirus status, Notes.
    - Hardware Specs: Processor, RAM, Storage (ROM).
  - Tab 2: **Assignment & Custody**:
    - Current Assignee: Account name, email, department, assigned date.
    - Custodian (PIC 2): Account name and role.
    - Assignment History Table: Previous assignees, assigned date, returned date, condition notes.
  - Tab 3: **Credentials & Access (ADR-004)**:
    - Login Email (`leadgeeksindonesia@gmail.com`).
    - PIN Field: Masked (`••••••`) by default.
    - **Reveal PIN Action**:
      - Permission Gate: Restricted to `Super Admin` and `IT Admin`. (Auditor/Asset Admin receive 403).
      - Warning Modal: "Revealing this PIN is a sensitive action and will be permanently recorded in the audit trail."
      - On Confirm: Calls `POST /api/assets/[id]/credentials/reveal`, decrypts the PIN via AES-256-GCM, displays the decrypted PIN with a 60-second auto-mask timer and copy button, and logs `action: "credential.reveal"` to `audit_events`.
    - Last rotation timestamp and security warning banner if shared PIN is detected.
  - Tab 4: **Audit History**: All audit records associated with this device.

### Page 10: Software — Applications List (`/software`)
- **Route**: `src/app/(admin)/software/page.tsx`
- **Access**: All authenticated roles (Write for Super Admin and Software Admin; Read-only for others).
- **Core Functionality**:
  - Summary stats: `125 Total Applications`, `7 Departments + General`, `Free vs Paid breakdown`.
  - Search: Application name (`Canva`, `Salesforce`, `VS Code`, `Zoom`).
  - Filters:
    - Department (General [82], Operations [11], ITE [9], Growth [7], Experience [6], FAC [4], HRD [3]).
    - Category (Productivity, Security, Development, Communication, Design, Marketing, Finance, Operations, Other).
    - Subscription Type (Free, Paid, Freemium).
    - Status (Active, Deprecated, Evaluating).
  - Table Columns:
    - Application Name + Category Icon.
    - Owning Department (e.g., `General`, `Operations`).
    - Category Badge (`design`, `security`, `communication`).
    - Subscription Type Badge (`Free` [Green], `Paid` [Blue]).
    - Status Badge (🟢 Active, 🟡 Evaluating, 🔴 Deprecated).
    - Website Link (external icon).
    - Quick actions: View Details, Edit (Software/Super Admin).
  - Pagination controls.

### Page 11: Software — Application Detail (`/software/[id]`)
- **Route**: `src/app/(admin)/software/[id]/page.tsx`
- **Core Functionality**:
  - Header: Application Name, Owning Department, Status Badge, Subscription Type Badge.
  - Tab 1: **Overview**: Tool details, description, category, official website URL, notes.
  - Tab 2: **Department & Role Usage**: Which departments, teams, and accounts have access to or utilize this application.
  - Tab 3: **Licenses & Subscriptions (Phase 4 integration)**: License keys (encrypted), seat limits, renewal dates, cost metrics.
  - Tab 4: **Audit History**: Record of who created or updated the application record.

### Page 12: Audit — Immutable Audit Trail (`/audit`)
- **Route**: `src/app/(admin)/audit/page.tsx`
- **Access**: **Strictly restricted to Super Admin and Auditor roles**. IT Admin, Asset Admin, and Software Admin receive 403 Forbidden.
- **Core Functionality**:
  - Summary badges: `Total Events Logged`, `Sensitive Actions (PIN Reveals)`, `Events Today`.
  - Real-time reverse chronological event log.
  - Filters:
    - Entity Type (`account`, `device`, `group`, `application`, `credential`, `auth`, `import`).
    - Action Type (`create`, `update`, `delete`, `credential.reveal`, `auth.login`, `group.sync`, `import.run`).
    - Actor (Select by administrator account).
    - Date Range picker (From date - To date).
  - Table Columns:
    - Timestamp (Formatted absolute ISO/local time + relative "5 mins ago").
    - Actor (Name, email, and role badge).
    - Action Badge (e.g. `[credential.reveal]` in amber, `[create]` in emerald, `[delete]` in rose, `[update]` in blue).
    - Target Entity (`device: LGI-CD-2024-042`, `account: Amanda Stevany`, `group: team@leadgeeksinc.com`).
    - IP Address (Monospace).
    - Metadata / Details Inspector: Expandable drawer/modal rendering formatted JSON payload of the event context (e.g., changed fields, before/after diff, reason).
  - **Immutability Guarantee**: Read-only display. No delete, update, or purge buttons exist in the UI or backend per `AGENTS.md` ("Delete audit logs is FORBIDDEN").

---

## 5. System & Architecture Integration Specifications

### 5.1 Server-Side Authorization Boundary & RBAC Matrix (ADR-005)
Permissions are enforced at the API layer and Next.js middleware, never trusting the frontend:

| Role | Identity (Accounts) | Google Groups | Hardware Assets | Software Apps | Reveal PIN | Audit Logs | Ingest Spreadsheets |
|---|---|---|---|---|---|---|---|
| **Super Admin** | Full (CRUD) | Full (CRUD + Sync) | Full (CRUD) | Full (CRUD) | ✅ Allowed | ✅ Full View | ✅ Allowed |
| **IT Admin** | Full (CRUD) | Full (CRUD + Sync) | Full (CRUD) | Full (CRUD) | ✅ Allowed | ❌ 403 Forbidden | ✅ Allowed |
| **Asset Admin** | Read-Only | Read-Only | Full (CRUD) | Read-Only | ❌ 403 Forbidden | ❌ 403 Forbidden | ❌ 403 Forbidden |
| **Software Admin**| Read-Only | Read-Only | Read-Only | Full (CRUD) | ❌ 403 Forbidden | ❌ 403 Forbidden | ❌ 403 Forbidden |
| **Auditor** | Read-Only | Read-Only | Read-Only | Read-Only | ❌ 403 Forbidden | ✅ Full View | ❌ 403 Forbidden |

### 5.2 ADR-004 Credential Encryption Integration
- In `device_credentials`, `pin_hash` stores `iv:authTag:encryptedData` using AES-256-GCM with `process.env.CREDENTIAL_ENCRYPTION_KEY`.
- No plain text PINs are ever stored in the database or serialized in normal device API responses.
- Decryption occurs only in the dedicated `POST /api/assets/[id]/credentials/reveal` route handler under strict Super Admin / IT Admin authorization and produces an immutable audit event in the same transaction.

### 5.3 Spreadsheet Ingestion Integration Pipeline
- Source files located at `/home/noah/Documents/sheets/*.xlsx`.
- 12-step topological execution order per `docs/data/spreadsheet-mapping.md`:
  1. `domains` (3 records)
  2. `departments` (8 records)
  3. `account_roles` (5 records)
  4. `accounts` (42 records)
  5. `account_domains` (M2M links)
  6. `google_groups` (15 records)
  7. `group_memberships` (~168 records)
  8. `devices` (31 records)
  9. `device_specifications` (31 records)
  10. `device_assignments` (linked by first-name fuzzy match to account display names)
  11. `device_credentials` (31 records, PINs encrypted via AES-256-GCM)
  12. `applications` (125 records, department normalized)
- Idempotency: All queries use `ON CONFLICT DO UPDATE` or check for existing unique keys, allowing repeated execution without duplicates or state corruption.

---

## 6. Caveats

1. **Spreadsheets Are Read-Only**: The source spreadsheets in `/home/noah/Documents/sheets/` are read-only and must never be modified by any agent or script.
2. **External Google APIs in Phase 0**: Real Google OAuth and Google Admin SDK credentials depend on external Google Workspace configurations. Local development and automated testing must rely on the Mock Authentication mechanism (`AUTH_MOCK_ENABLED=true`), which fully supports role simulation and session verification.
3. **Legacy Security Concern**: 28 of 31 devices share the identical login email (`leadgeeksindonesia@gmail.com`) and 27 share the same PIN in the legacy spreadsheet. CORE preserves these records faithfully while encrypting PINs and flagging this risk in the UI.
4. **Subscription Types**: The majority of software applications in the legacy spreadsheet have empty subscription types; these are populated from the `Drop Down` reference sheet where available, with remaining values defaulted and marked for Phase 4 enrichment.

---

## 7. Conclusion

This investigation provides a comprehensive, production-ready specification for CORE's frontend architecture, design system, and full page inventory:
1. **Architecture**: Next.js App Router with TypeScript and Drizzle ORM on PostgreSQL, cleanly organized into domain modules (`accounts`, `groups`, `assets`, `software`, `access`, `audit`).
2. **Design System**: A sober, high-clarity "calm infrastructure command center" adhering to the 3-Layer UI Rule, consistent List/Resource patterns, and standardized semantic status colors.
3. **Page Inventory**: 12 fully specified screens covering Login (with mock role selector), Command Center Dashboard, Accounts list/detail, Google Groups list/detail and matrix view, Hardware Devices list/detail with secure PIN reveal, Software Applications list/detail, and the immutable Audit Trail.
4. **Integration**: Server-side RBAC enforcement, AES-256-GCM credential encryption, and idempotent 12-step spreadsheet ingestion matching all acceptance criteria in `ORIGINAL_REQUEST.md`.

---

## 8. Verification Method

### 8.1 Verification Commands
To independently verify this specification once implemented:
1. **Package & Build Verification**:
   ```bash
   npm install
   npm run build       # Next.js production build and TypeScript check
   npm run lint        # ESLint check
   npm run typecheck   # tsc --noEmit
   ```
2. **Database & Migration Verification**:
   ```bash
   npm run db:generate # Drizzle kit migration generation
   npm run db:migrate  # Run migrations against PostgreSQL
   npm run db:seed     # Seed 8 depts, 5 roles, 3 domains
   npm run db:import   # Ingest 3 spreadsheets
   ```
3. **Application & Route Verification**:
   ```bash
   npm run dev         # Starts server on http://localhost:3000
   ```
   - Verify `/login` displays Google OAuth button and mock role switcher.
   - Verify `/` displays Command Center metrics (42 accounts, 15 groups, 31 devices, 125 applications).
   - Verify `/accounts` displays 42 accounts with department, role, domain filters.
   - Verify `/groups` displays 15 groups; `/groups/matrix` displays the 42x15 cross-tabulation.
   - Verify `/assets` displays 31 devices with specs; `/assets/[id]` PIN reveal button functions only for Super Admin/IT Admin and writes to `audit_events`.
   - Verify `/software` displays 125 applications filterable by department.
   - Verify `/audit` is accessible to Super Admin and Auditor, but returns 403 for other roles.

### 8.2 Invalidation Conditions
- Any introduction of client-side-only security checks that can be bypassed by API calls.
- Storing PINs in plain text or omitting the audit log on credential reveal.
- Hardcoded test fixtures replacing the actual PostgreSQL database.
- Modifying the read-only spreadsheets in `/home/noah/Documents/sheets/`.
