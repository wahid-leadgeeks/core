# TODO

## Now (MVP Completed)

- [x] Initialize Next.js 15 App Router
- [x] Configure PostgreSQL database
- [x] Configure Drizzle ORM
- [x] Create authentication (Google OAuth + mock dev auth)
- [x] Create RBAC middleware with 5 isolated roles
- [x] Create append-only immutable audit logger
- [x] Create database schema (13 tables & enums from DATA_MODEL.md)
- [x] Create seed script for departments (8 records)
- [x] Create seed script for account_roles (5 records)
- [x] Create seed script for domains (3 records)
- [x] Create spreadsheet import script (`npm run db:import`)
  - [x] Ingest accounts (42 records) with department normalization
  - [x] Ingest google_groups + memberships (15 groups, 167 memberships)
  - [x] Ingest devices + specs + assignments (31 records with fuzzy PIC matching)
  - [x] Ingest device_credentials (30 records, AES-256-GCM encrypted PINs)
  - [x] Ingest applications (125 records with subscription enrichment)
- [x] Create Identity & Accounts module UI (`/accounts`)
- [x] Create Google Groups module UI (`/groups` and `/groups/matrix`)
- [x] Create Hardware Assets module UI (`/assets` with credential reveal)
- [x] Create Software Applications module UI (`/software`)
- [x] Create System Audit Trail UI (`/audit`)
- [x] Create Command Center Overview Dashboard (`/`)
- [x] Create Hardware Asset Lifecycle Mutations & Modals:
  - [x] Provision Device workflow with AES-256-GCM initial PIN (`POST /api/assets`)
  - [x] Update Specifications & Metadata workflow (`PATCH /api/assets/[id]`)
  - [x] Assign / Return Custodian workflow with history tracking (`POST /api/assets/[id]/assign`)
  - [x] Rotate Credential PIN workflow (`POST /api/assets/[id]/credentials`)
  - [x] Decommission Device workflow with typed tag confirmation & reason (`POST /api/assets/[id]/decommission`)
  - [x] Dedicated 4-Tier Test Suite 08 (`23 tests, 100% pass rate`)


## Next (Phase 1+)

- [ ] Google Workspace live API sync integration (OAuth credentials pending)
- [ ] Automated license expiration alerting
- [ ] Export accounts to CSV/Sheets
- [ ] Secret manager integration (AWS KMS / GCP Secret Manager for encryption key rotation)
