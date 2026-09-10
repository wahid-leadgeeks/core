# Original User Request

## Initial Request — 2026-09-08T17:14:16Z

Build CORE (Company Operations, Resources & Environment), an internal administrative platform that replaces company spreadsheets for managing accounts, Google Groups, hardware devices, and software applications. This is a production-quality MVP for a small team of IT administrators.

Working directory: /home/noah/project/core
Integrity mode: development

Reference material: The working directory already contains complete documentation — read these files before implementation:
- `PRD.md` — product requirements
- `ARCHITECTURE.md` — system architecture (modular monolith, layered)
- `DATA_MODEL.md` — complete database schema (12 tables, all fields typed, ER diagram)
- `DESIGN.md` — UI/UX design principles and page patterns
- `AGENTS.md` — domain boundaries and rules
- `ROADMAP.md` — phased delivery plan
- `TODO.md` — immediate tasks
- `docs/adr/` — 5 architectural decision records
- `docs/domains/` — 6 domain docs with actual data from spreadsheets
- `docs/data/spreadsheet-mapping.md` — exact column-level mapping from spreadsheets to CORE tables

Source spreadsheets to import (read-only, do not modify):
- `/home/noah/Documents/sheets/List of Accounts and Google Group Management.xlsx` — 42 accounts, 15 Google Groups
- `/home/noah/Documents/sheets/List of Company Hardware Devices (Laptop).xlsx` — 31 devices + credentials
- `/home/noah/Documents/sheets/List of Softwares_Tools_Applications.xlsx` — 125 applications

## Requirements

### R1. Full-stack Next.js application with PostgreSQL database

A working Next.js (App Router) application with TypeScript, a PostgreSQL database with all 12 tables defined in `DATA_MODEL.md`, an ORM (Drizzle or Prisma), database migrations, and seed scripts for reference data (8 departments, 5 account roles, 3 domains). The app must start with `npm run dev` and connect to a local PostgreSQL database. Include a `.env.example` with all required environment variables.

### R2. Authentication and authorization

Google OAuth / OIDC login flow for administrators. RBAC middleware enforcing 5 roles (Super Admin, IT Admin, Asset Admin, Software Admin, Auditor) with server-side permission checks on all API routes. Unauthenticated requests must be redirected to login. Auditor role must be read-only. Include an audit logging system that records all create, update, delete, and sensitive operations to the `audit_events` table.

### R3. Spreadsheet data import

A working import mechanism (seed script, CLI command, or admin UI page) that reads the 3 source `.xlsx` spreadsheets and populates CORE's database tables following the exact column mapping in `docs/data/spreadsheet-mapping.md`. Must handle: department name normalization (e.g., "HRD" → "Human Resource and Development"), multi-domain accounts, fuzzy PIC name matching for device assignments, and PIN encryption for device credentials. Import must be idempotent (safe to run multiple times).

### R4. CRUD pages for all four domains

A functional admin UI with sidebar navigation and pages for:
- **Identity**: List/detail pages for accounts with department, role, domain, and group membership display. Search and filter.
- **Groups**: List/detail pages for Google Groups showing members. Membership matrix view.
- **Assets**: List/detail pages for devices with specifications, assignment info, and status. Asset search.
- **Software**: List/detail pages for applications with department and subscription type filters.

Pages must follow the List Page Pattern and Resource Page Pattern described in `DESIGN.md` — resource cards with status indicators, tabbed detail views (Overview, Relationships, History), and the status color language (🟢 Active, 🔵 Assigned, ⚪ Available, etc.). The UI should feel like a calm infrastructure command center, not a spreadsheet clone.

### R5. Audit trail visibility

An audit log page (accessible to Super Admin and Auditor roles) that displays audit events in reverse chronological order with actor, action, entity type, entity ID, and timestamp. Basic filtering by entity type and action.

## Acceptance Criteria

### Application boots and serves pages
- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts the application on localhost
- [ ] `npm run build` completes without TypeScript errors
- [ ] `npm run lint` passes with no errors
- [ ] Database migrations run successfully against a fresh PostgreSQL instance

### Database schema matches DATA_MODEL.md
- [ ] All 12 tables exist: accounts, departments, account_roles, domains, account_domains, google_groups, group_memberships, devices, device_specifications, device_assignments, device_credentials, applications
- [ ] The `audit_events` table exists with the fields specified in DATA_MODEL.md
- [ ] Foreign key constraints are enforced
- [ ] Unique constraints are enforced (account email, device asset_number, group email, application name)

### Spreadsheet import works
- [ ] Running the import script populates the database with data from all 3 spreadsheets
- [ ] After import: 42 accounts, 8 departments, 5 roles, 3 domains exist in the database
- [ ] After import: 15 Google Groups with correct member counts exist
- [ ] After import: 31 devices with specifications exist
- [ ] After import: 125 applications exist
- [ ] Device credential PINs are NOT stored in plain text
- [ ] Running the import a second time does not create duplicate records

### Authentication and RBAC work
- [ ] Unauthenticated users cannot access any page except login
- [ ] Login page initiates Google OAuth flow (or mock auth for local development)
- [ ] Auditor role cannot create, update, or delete any resource
- [ ] API routes return 403 for unauthorized actions

### CRUD pages are functional
- [ ] Each domain (Identity, Groups, Assets, Software) has a working list page with data from the import
- [ ] Each domain has a working detail page showing resource information
- [ ] List pages support search or filtering
- [ ] Status indicators use the color language from DESIGN.md
- [ ] Navigation sidebar links to all domain sections

### Audit logging works
- [ ] Create, update, and delete operations generate audit_events records
- [ ] Audit log page displays events with actor, action, entity, and timestamp
- [ ] Audit log page is accessible only to Super Admin and Auditor roles

## Follow-up — 2026-09-08T18:33:14Z

RESUME CORE MVP IMPLEMENTATION.

Existing progress in /home/noah/project/core:
- Milestone 1 is verified & completed (PostgreSQL Drizzle schema for 13 tables & enums, migrations, seed script).
- Milestone 2 is verified & completed (182/182 tests passing, AES-256-GCM cipher, session management, RBAC with 5 roles, route guard middleware, immutable audit logger).
- Milestone 3: Spreadsheet Ingestion Engine (read /home/noah/Documents/sheets/*.xlsx, normalize departments, match PICs, encrypt PINs, idempotent upserts).
- Milestone 4: Domain CRUD Pages & Navigation UI (/accounts, /groups with matrix view, /assets with specs/credentials, /software, /audit, calm infrastructure layout).
- Verify with `npm run build`, `npm test`, and ensure `npm run dev` serves all pages cleanly.

Proceed through Milestone 3 and Milestone 4 to MVP completion.
