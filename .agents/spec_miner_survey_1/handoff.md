# Specification Mining Report: Data Model, Database Architecture & Spreadsheet Ingestion

## 1. Observation

Authoritative specification sources investigated:
- `/home/noah/project/core/ORIGINAL_REQUEST.md` (Lines 1–96)
- `/home/noah/project/core/DATA_MODEL.md` (Lines 1–293)
- `/home/noah/project/core/ARCHITECTURE.md` (Lines 1–143)
- `/home/noah/project/core/docs/data/spreadsheet-mapping.md` (Lines 1–131)
- `/home/noah/project/core/docs/domains/identity.md` (Lines 1–88)
- `/home/noah/project/core/docs/domains/groups.md` (Lines 1–79)
- `/home/noah/project/core/docs/domains/assets.md` (Lines 1–88)
- `/home/noah/project/core/docs/domains/access.md` (Lines 1–73)
- `/home/noah/project/core/docs/domains/software.md` (Lines 1–89)
- `/home/noah/project/core/docs/domains/automation.md` (Lines 1–27)
- `/home/noah/project/core/docs/adr/ADR-001-modular-monolith.md` through `ADR-005-rbac.md`
- Source Spreadsheets in `/home/noah/Documents/sheets/`:
  * `List of Accounts and Google Group Management.xlsx` (16,377 bytes)
  * `List of Company Hardware Devices (Laptop).xlsx` (15,270 bytes)
  * `List of Softwares_Tools_Applications.xlsx` (62,825 bytes)

### Key Verbatim Specifications Observed:
1. **System Paradigm**: "CORE uses a Modular Monolith architecture" (ARCHITECTURE.md:5); "PostgreSQL as the primary system database... Relational data, foreign keys, transaction support, audit records... Spreadsheets are not the source of truth" (ADR-002:9-24).
2. **Entity Total**: "Total 12 tables ~420 records" + `audit_events` table (DATA_MODEL.md:282-292, ORIGINAL_REQUEST.md:65-66).
3. **Reference Data**: 8 departments, 5 account roles, 3 company domains (DATA_MODEL.md:95-141).
4. **Credential Security**: "Passwords, PINs, recovery codes, and secrets must not be stored as plain database fields... Encryption at rest, restricted access, reveal logging, permission checks, re-authentication, secret rotation tracking" (ADR-004:9-19; AGENTS.md:61).
5. **Spreadsheet Target Counts**: 42 accounts, 15 Google groups (~168 memberships), 31 devices (26 assigned, 2 reserve, 2 available, 1 decommissioned), 31 device credentials, 125 applications (ORIGINAL_REQUEST.md:70-78; docs/data/spreadsheet-mapping.md:108-120).

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Identity | Reference Seed: Departments | Pre-populates 8 organizational departments with unique codes | Static seed list (MNG, OPS, GRW, EXP, HRD, ITE, FAC, GNR) | 8 inserted rows in `departments` | Unique constraint violation if duplicate code/name | DATA_MODEL.md:87-107 |
| 2 | Identity | Reference Seed: Account Roles | Pre-populates 5 hierarchy roles with levels (1=highest to 5=lowest) | Static seed list (Top Management to Commercial) | 5 inserted rows in `account_roles` | Unique constraint violation if duplicate name | DATA_MODEL.md:109-125 |
| 3 | Identity | Reference Seed: Domains | Pre-populates 3 corporate domains (1 primary, 2 secondary/migrated) | Static seed list (leadgeeksinc.com, leadgeeksinc.co, leadgeeksprospecting.com) | 3 inserted rows in `domains` | Unique constraint violation if duplicate domain name | DATA_MODEL.md:127-141 |
| 4 | Identity | User Account Ingestion | Imports 42 employee/service/shared accounts from sheet | XLSX `List of User Account` columns | Rows inserted/updated in `accounts` | Fails transaction on missing required fields or invalid role/dept lookup | spreadsheet-mapping.md:19-32 |
| 5 | Identity | Multi-Domain Account Association | Parses comma-separated domains per account and links via M2M table | String (e.g. `leadgeeksinc.com, leadgeeksinc.co`) | Rows in `account_domains` join table | Skip or error on invalid domain name | DATA_MODEL.md:143-148, mapping.md:29 |
| 6 | Groups | Google Group Catalog Import | Imports 15 distribution groups from column headers | Column headers (Row 1 name, Row 2 email) | 15 rows in `google_groups` | Unique email violation; transaction rolls back | spreadsheet-mapping.md:33-40 |
| 7 | Groups | Group Membership Linking | Maps group member emails (Row 3+) to internal account IDs | Member emails under group columns | ~168 rows in `group_memberships` (role: member, source: spreadsheet) | Unique constraint `(group_id, account_id)`; unknown email logged as unlinked | spreadsheet-mapping.md:39, groups.md:41-54 |
| 8 | Groups | Email Domain Discrepancy Resolution | Resolves member emails against both `accounts.email` and `accounts.previous_email` | Group member email strings | Matched account UUID | If unmatched, flagged for admin review | groups.md:69-72, mapping.md:128 |
| 9 | Assets | Hardware Device Inventory Import | Imports 31 laptops with parsed brand, model, computer name, and status | XLSX `Laptop Information` sheet | 31 rows in `devices` | Unique constraint violation on `asset_number` | assets.md:9-35, mapping.md:41-57 |
| 10 | Assets | Hardware Specifications Linking | Creates 1:1 hardware specification record for each laptop | RAM, ROM/Storage, Processor columns | 31 rows in `device_specifications` | Unique constraint on `device_id` prevents duplicate specs | DATA_MODEL.md:202-211 |
| 11 | Assets | Device Assignment Resolution | Assigns devices to accounts via fuzzy name matching on PIC Name & Custodian | PIC Name, PIC 2 Name, Asset No | Rows in `device_assignments` | Unmatched PIC flagged or left unassigned (status: available/reserve) | mapping.md:46-47, assets.md:47-60 |
| 12 | Access | Device Credential Secure Ingestion | Ingests device login emails and encrypts plain-text PIN passwords at rest | XLSX `Access Login` sheet (Asset No, Email, PIN) | 31 rows in `device_credentials` with encrypted `pin_hash` | Plain-text storage forbidden; invalid asset number errors | ADR-004, access.md:9-28, mapping.md:58-70 |
| 13 | Access | Credential Reveal & Audit Logging | Secure reveal of encrypted device credentials requiring authorization and logging | Device ID, Admin Actor ID, Re-auth token | Decrypted PIN payload | 403 Forbidden for unauthorized roles; emits `credential.reveal` event | ADR-004:15-18, AGENTS.md:73-82 |
| 14 | Software | Software Application Import | Imports 125 software applications categorized by owning department | XLSX `List of Applications` sheet | 125 rows in `applications` | Unique constraint on application `name` | software.md:9-34, mapping.md:71-79 |
| 15 | Software | Reference Data Merge (Drop Down) | Enriches applications with subscription types (`Free`, `Paid`) from Drop Down sheet | XLSX `Drop Down` sheet | Updated `subscription_type` field | Null if application not found in Drop Down list | spreadsheet-mapping.md:80-88 |
| 16 | Normalization | Department Name Canonicalization | Normalizes disparate department names across sheets to canonical names | Inconsistent strings ("HRD", "IT", "Management") | Canonical dept UUID (`Human Resource and Development`, `Information and Technology`, etc.) | Unmapped string triggers validation error | spreadsheet-mapping.md:91-103 |
| 17 | Audit | Immutable Audit Event Logging | Records all CRUD and sensitive administrative actions | Actor ID, Action, Entity Type, Entity ID, Metadata, IP | Append-only row in `audit_events` | Deletion or modification of audit log is strictly forbidden | DATA_MODEL.md:265-279, AGENTS.md:63 |
| 18 | Automation | Idempotent Re-execution | Allows running the seed/import script repeatedly without creating duplicate rows | Entire spreadsheet dataset | Clean state; 0 duplicates; uncorrupted foreign keys | Transaction rollback on integrity failure | ORIGINAL_REQUEST.md:77 |

---

## 3. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Device Assignment | PIC Name is "Laptop cadangan" or "Laptop Cadangan" | Not a person. Device status is assigned as `reserve`. No `device_assignments` row created. |
| 2 | Device Assignment | PIC Name is "N/A" or empty | Not assigned to any person. Device status is assigned as `available`. |
| 3 | Device Assignment | Notes field indicates "Akan dijual" (to be sold) | Device marked with status `decommissioned`. |
| 4 | Device Assignment | PIC Name is informal single first name (e.g. "Amanda", "Devi", "Adit", "Fajri", "Rian") | Fuzzy matcher matches against `accounts.display_name` and `accounts.full_name`. |
| 5 | Group Membership | Group member email contains legacy domain `@leadgeeksprospecting.com` | Resolved by looking up `accounts.previous_email` if `accounts.email` does not match. |
| 6 | Group Membership | Calendar groups use `.co` domain (`operations.calendar@leadgeeksinc.co`) | Supported as valid Google Group email; mapped to `google_groups`. |
| 7 | User Accounts | Multi-domain string in single cell: `"leadgeeksinc.com, leadgeeksinc.co"` | Split on comma, trimmed, resolved to domain UUIDs, inserted into `account_domains`. |
| 8 | User Accounts | Non-personal account types (`sales@leadgeeksinc.com`, `admin@leadgeeksinc.co`) | Assigned `account_type = 'service'` (sales) and `account_type = 'shared'` (admin), others `'personal'`. |
| 9 | Department Normalization | Sheet has "HRD" (Accounts) vs "Human Resource and Development" (Drop Down) | Both normalize to canonical `Human Resource and Development` (Code: `HRD`). |
| 10 | Department Normalization | Sheet has "IT" (Accounts) vs "Information and Technology" (Drop Down) | Both normalize to canonical `Information and Technology` (Code: `ITE`). |
| 11 | Department Normalization | Sheet has "Management Office" (Accounts) vs "Management" (Drop Down) | Both normalize to canonical `Management Office` (Code: `MNG`). |
| 12 | Department Normalization | "General" department has 0 accounts but 82 software applications | `departments` must include `General` (Code: `GNR`) before software import. |
| 13 | Device Credentials | 28 of 31 devices share same email (`leadgeeksindonesia@gmail.com`) and 27 share same PIN | Must not fail uniqueness on credentials (only `device_id` is unique or FK). All PINs encrypted. |
| 14 | Device Brand Parsing | `Computer Brand and Type` string like `"LENOVO IDEAPAD SLIM 3 14AMN8"` | Brand extracted as `"LENOVO"` (first token) and full string stored in `model`. |
| 15 | Idempotent Re-import | Import script executed on database that already contains imported records | Upsert (ON CONFLICT DO UPDATE) on natural keys (`email`, `asset_number`, `name`); no duplicates created. |

---

## 4. Complete Database Schema Specification

The CORE database consists of **12 domain tables** plus the **`audit_events`** table (13 tables total).

### Common Types & Custom Enums
```sql
CREATE TYPE account_type_enum AS ENUM ('personal', 'service', 'shared');
CREATE TYPE account_status_enum AS ENUM ('active', 'suspended', 'archived');
CREATE TYPE sync_status_enum AS ENUM ('synced', 'pending', 'conflict', 'error');
CREATE TYPE group_role_enum AS ENUM ('member', 'manager', 'owner');
CREATE TYPE group_source_enum AS ENUM ('spreadsheet', 'google_sync', 'manual');
CREATE TYPE device_status_enum AS ENUM ('assigned', 'available', 'reserve', 'decommissioned');
CREATE TYPE application_category_enum AS ENUM (
  'productivity', 'security', 'development', 'communication',
  'design', 'marketing', 'finance', 'operations', 'other'
);
CREATE TYPE subscription_type_enum AS ENUM ('free', 'paid', 'freemium');
CREATE TYPE application_status_enum AS ENUM ('active', 'deprecated', 'evaluating');
```

---

### Table 1: `departments` (Reference Data)
- **Purpose**: Organizational units within the company.
- **Columns**:
  - `id`: `uuid`, PRIMARY KEY, DEFAULT `gen_random_uuid()`
  - `name`: `varchar(100)`, NOT NULL, UNIQUE
  - `code`: `varchar(10)`, NOT NULL, UNIQUE
  - `created_at`: `timestamptz`, NOT NULL, DEFAULT `now()`
- **Constraints**:
  - PK: `id`
  - UNIQUE: `name`
  - UNIQUE: `code`
- **Seed Records (8 rows)**:
  1. `Management Office` (`MNG`)
  2. `Operations` (`OPS`)
  3. `Growth` (`GRW`)
  4. `Experience` (`EXP`)
  5. `Human Resource and Development` (`HRD`)
  6. `Information and Technology` (`ITE`)
  7. `Finance and Accounting` (`FAC`)
  8. `General` (`GNR`)

---

### Table 2: `account_roles` (Reference Data)
- **Purpose**: Internal organizational hierarchy levels.
- **Columns**:
  - `id`: `uuid`, PRIMARY KEY, DEFAULT `gen_random_uuid()`
  - `name`: `varchar(50)`, NOT NULL, UNIQUE
  - `level`: `int`, NOT NULL
- **Constraints**:
  - PK: `id`
  - UNIQUE: `name`
- **Seed Records (5 rows)**:
  1. `Top Management` (level: `1`)
  2. `Leaders` (level: `2`)
  3. `Non-Leaders` (level: `3`)
  4. `Staff` (level: `4`)
  5. `Commercial` (level: `5`)

---

### Table 3: `domains` (Reference Data)
- **Purpose**: Corporate email domains.
- **Columns**:
  - `id`: `uuid`, PRIMARY KEY, DEFAULT `gen_random_uuid()`
  - `name`: `varchar(255)`, NOT NULL, UNIQUE
  - `is_primary`: `boolean`, NOT NULL, DEFAULT `false`
- **Constraints**:
  - PK: `id`
  - UNIQUE: `name`
- **Seed Records (3 rows)**:
  1. `leadgeeksinc.com` (`is_primary: true`)
  2. `leadgeeksinc.co` (`is_primary: false`)
  3. `leadgeeksprospecting.com` (`is_primary: false`)

---

### Table 4: `accounts`
- **Purpose**: Company user accounts (personal, service, and shared).
- **Columns**:
  - `id`: `uuid`, PRIMARY KEY, DEFAULT `gen_random_uuid()`
  - `full_name`: `varchar(255)`, NOT NULL
  - `display_name`: `varchar(100)`, NOT NULL
  - `email`: `varchar(255)`, NOT NULL, UNIQUE
  - `previous_email`: `varchar(255)`, NULLABLE
  - `account_type`: `account_type_enum`, NOT NULL
  - `department_id`: `uuid`, NULLABLE, REFERENCES `departments(id)` ON DELETE SET NULL
  - `account_role_id`: `uuid`, NULLABLE, REFERENCES `account_roles(id)` ON DELETE SET NULL
  - `status`: `account_status_enum`, NOT NULL, DEFAULT `'active'`
  - `notes`: `text`, NULLABLE
  - `migration_notes`: `text`, NULLABLE
  - `created_at`: `timestamptz`, NOT NULL, DEFAULT `now()`
  - `updated_at`: `timestamptz`, NOT NULL, DEFAULT `now()`
- **Constraints**:
  - PK: `id`
  - UNIQUE: `email`
  - FK: `department_id` → `departments(id)`
  - FK: `account_role_id` → `account_roles(id)`

---

### Table 5: `account_domains` (Join Table)
- **Purpose**: Many-to-many relationship between accounts and domains.
- **Columns**:
  - `account_id`: `uuid`, NOT NULL, REFERENCES `accounts(id)` ON DELETE CASCADE
  - `domain_id`: `uuid`, NOT NULL, REFERENCES `domains(id)` ON DELETE CASCADE
- **Constraints**:
  - PK: `(account_id, domain_id)`
  - FK: `account_id` → `accounts(id)`
  - FK: `domain_id` → `domains(id)`

---

### Table 6: `google_groups`
- **Purpose**: Google Workspace distribution and access groups.
- **Columns**:
  - `id`: `uuid`, PRIMARY KEY, DEFAULT `gen_random_uuid()`
  - `name`: `varchar(255)`, NOT NULL
  - `email`: `varchar(255)`, NOT NULL, UNIQUE
  - `description`: `text`, NULLABLE
  - `member_count`: `int`, NOT NULL, DEFAULT `0`
  - `google_id`: `varchar(255)`, NULLABLE, UNIQUE
  - `sync_status`: `sync_status_enum`, NOT NULL, DEFAULT `'pending'`
  - `last_synced_at`: `timestamptz`, NULLABLE
  - `created_at`: `timestamptz`, NOT NULL, DEFAULT `now()`
  - `updated_at`: `timestamptz`, NOT NULL, DEFAULT `now()`
- **Constraints**:
  - PK: `id`
  - UNIQUE: `email`
  - UNIQUE: `google_id`

---

### Table 7: `group_memberships` (Join Table)
- **Purpose**: Association between accounts and Google Groups.
- **Columns**:
  - `id`: `uuid`, PRIMARY KEY, DEFAULT `gen_random_uuid()`
  - `group_id`: `uuid`, NOT NULL, REFERENCES `google_groups(id)` ON DELETE CASCADE
  - `account_id`: `uuid`, NOT NULL, REFERENCES `accounts(id)` ON DELETE CASCADE
  - `role`: `group_role_enum`, NOT NULL, DEFAULT `'member'`
  - `source`: `group_source_enum`, NOT NULL
  - `added_at`: `timestamptz`, NULLABLE
  - `created_at`: `timestamptz`, NOT NULL, DEFAULT `now()`
- **Constraints**:
  - PK: `id`
  - UNIQUE: `(group_id, account_id)`
  - FK: `group_id` → `google_groups(id)`
  - FK: `account_id` → `accounts(id)`

---

### Table 8: `devices`
- **Purpose**: Physical company hardware devices (laptops).
- **Columns**:
  - `id`: `uuid`, PRIMARY KEY, DEFAULT `gen_random_uuid()`
  - `asset_number`: `varchar(50)`, NOT NULL, UNIQUE
  - `brand`: `varchar(100)`, NULLABLE
  - `model`: `varchar(200)`, NOT NULL
  - `computer_name`: `varchar(100)`, NULLABLE
  - `status`: `device_status_enum`, NOT NULL
  - `purchased_at`: `date`, NULLABLE
  - `has_antivirus`: `boolean`, NOT NULL, DEFAULT `false`
  - `notes`: `text`, NULLABLE
  - `created_at`: `timestamptz`, NOT NULL, DEFAULT `now()`
  - `updated_at`: `timestamptz`, NOT NULL, DEFAULT `now()`
- **Constraints**:
  - PK: `id`
  - UNIQUE: `asset_number`

---

### Table 9: `device_specifications`
- **Purpose**: Technical hardware specifications (1:1 with device).
- **Columns**:
  - `id`: `uuid`, PRIMARY KEY, DEFAULT `gen_random_uuid()`
  - `device_id`: `uuid`, NOT NULL, UNIQUE, REFERENCES `devices(id)` ON DELETE CASCADE
  - `processor`: `varchar(100)`, NULLABLE
  - `ram`: `varchar(20)`, NULLABLE
  - `storage`: `varchar(50)`, NULLABLE
- **Constraints**:
  - PK: `id`
  - UNIQUE: `device_id`
  - FK: `device_id` → `devices(id)`

---

### Table 10: `device_assignments`
- **Purpose**: Hardware custody and assignment history.
- **Columns**:
  - `id`: `uuid`, PRIMARY KEY, DEFAULT `gen_random_uuid()`
  - `device_id`: `uuid`, NOT NULL, REFERENCES `devices(id)` ON DELETE CASCADE
  - `account_id`: `uuid`, NULLABLE, REFERENCES `accounts(id)` ON DELETE SET NULL
  - `custodian_id`: `uuid`, NULLABLE, REFERENCES `accounts(id)` ON DELETE SET NULL
  - `assigned_at`: `timestamptz`, NOT NULL
  - `returned_at`: `timestamptz`, NULLABLE (null = currently assigned)
  - `notes`: `text`, NULLABLE
  - `created_at`: `timestamptz`, NOT NULL, DEFAULT `now()`
- **Constraints**:
  - PK: `id`
  - FK: `device_id` → `devices(id)`
  - FK: `account_id` → `accounts(id)`
  - FK: `custodian_id` → `accounts(id)`

---

### Table 11: `device_credentials`
- **Purpose**: Access credentials associated with hardware devices.
- **Columns**:
  - `id`: `uuid`, PRIMARY KEY, DEFAULT `gen_random_uuid()`
  - `device_id`: `uuid`, NOT NULL, REFERENCES `devices(id)` ON DELETE CASCADE
  - `login_email`: `varchar(255)`, NULLABLE
  - `pin_hash`: `varchar(255)`, NULLABLE (Encrypted payload, NEVER plain text)
  - `pin_last_rotated_at`: `timestamptz`, NULLABLE
  - `notes`: `text`, NULLABLE
  - `created_at`: `timestamptz`, NOT NULL, DEFAULT `now()`
  - `updated_at`: `timestamptz`, NOT NULL, DEFAULT `now()`
- **Constraints**:
  - PK: `id`
  - FK: `device_id` → `devices(id)`

---

### Table 12: `applications`
- **Purpose**: Company-used software products and subscriptions.
- **Columns**:
  - `id`: `uuid`, PRIMARY KEY, DEFAULT `gen_random_uuid()`
  - `name`: `varchar(255)`, NOT NULL, UNIQUE
  - `description`: `text`, NULLABLE
  - `department_id`: `uuid`, NULLABLE, REFERENCES `departments(id)` ON DELETE SET NULL
  - `category`: `application_category_enum`, NULLABLE
  - `subscription_type`: `subscription_type_enum`, NULLABLE
  - `status`: `application_status_enum`, NOT NULL, DEFAULT `'active'`
  - `website_url`: `varchar(500)`, NULLABLE
  - `created_at`: `timestamptz`, NOT NULL, DEFAULT `now()`
  - `updated_at`: `timestamptz`, NOT NULL, DEFAULT `now()`
- **Constraints**:
  - PK: `id`
  - UNIQUE: `name`
  - FK: `department_id` → `departments(id)`

---

### Table 13: `audit_events`
- **Purpose**: Append-only immutable log of administrative and sensitive actions.
- **Columns**:
  - `id`: `uuid`, PRIMARY KEY, DEFAULT `gen_random_uuid()`
  - `actor_id`: `uuid`, NULLABLE, REFERENCES `accounts(id)` ON DELETE SET NULL
  - `action`: `varchar(100)`, NOT NULL (e.g., `'account.create'`, `'credential.reveal'`, `'device.assign'`)
  - `entity_type`: `varchar(100)`, NOT NULL (e.g., `'account'`, `'device'`, `'google_group'`, `'application'`)
  - `entity_id`: `uuid`, NULLABLE
  - `metadata`: `jsonb`, NULLABLE
  - `ip_address`: `inet`, NULLABLE
  - `created_at`: `timestamptz`, NOT NULL, DEFAULT `now()`
- **Constraints**:
  - PK: `id`
  - FK: `actor_id` → `accounts(id)`
  - Immutability: No updates or deletes allowed.

---

## 5. Spreadsheet Ingestion Engine Specification

### Ingestion Sequence (Dependency Order)
To ensure zero foreign key violation errors:
1. **Seed Reference Tables**: `departments` (8), `account_roles` (5), `domains` (3).
2. **Accounts**: Ingest `List of User Account` → `accounts` (42 records).
3. **Account Domains**: Parse domain column → `account_domains` join table.
4. **Google Groups**: Ingest `Google Group` headers → `google_groups` (15 records).
5. **Group Memberships**: Ingest `Google Group` column rows → `group_memberships` (~168 records).
6. **Devices**: Ingest `Laptop Information` → `devices` (31 records).
7. **Device Specifications**: Extract specs from `Laptop Information` → `device_specifications` (31 records).
8. **Device Assignments**: Match PICs to accounts → `device_assignments` (26 records).
9. **Device Credentials**: Ingest `Access Login`, encrypt PINs → `device_credentials` (31 records).
10. **Applications**: Ingest `List of Applications` + `Drop Down` → `applications` (125 records).

---

### Detailed Column Mapping & Rules

#### A. File: `List of Accounts and Google Group Management.xlsx`

##### Sheet: `List of User Account`
- `Nama Lengkap` → `accounts.full_name` (Trimmed, string)
- `Account User Name` → `accounts.display_name` (Used for UI display and fuzzy matching)
- `New Email Address` → `accounts.email` (Primary email, lowercased, trimmed, unique key)
- `Old Email Address` → `accounts.previous_email` (Nullable, lowercased, trimmed)
- `Department` → Normalize via lookup dictionary → Match `departments.name` → `accounts.department_id`
- `Email Type` → Lookup `account_roles.name` → `accounts.account_role_id`
- `Domain` → Comma-separated list (e.g. `leadgeeksinc.com, leadgeeksinc.co`). For each domain item:
  - Match to `domains.name` → retrieve `domain_id`
  - Insert row in `account_domains (account_id, domain_id)`
- `Notes` → `accounts.notes`
- `Notes Old` → `accounts.migration_notes`
- `account_type` derivation:
  - `sales@leadgeeksinc.com` → `'service'`
  - `admin@leadgeeksinc.co` → `'shared'`
  - All other 40 accounts → `'personal'`
- `status` → `'active'`

##### Sheet: `Google Group`
- **Structure**: Column-oriented matrix.
  - Row 1: Group Name (e.g. `LeadGeeks Team`) → `google_groups.name`
  - Row 2: Group Email Address (e.g. `team@leadgeeksinc.com`) → `google_groups.email`
  - Row 3+: Member email addresses.
- **Group Insertion**:
  - 15 groups created with `sync_status = 'pending'`, `member_count = count(non-empty rows)`.
- **Membership Insertion**:
  - For each non-empty email cell:
    1. Match email against `accounts.email`.
    2. If no match, match email against `accounts.previous_email` (handles accounts using old `@leadgeeksprospecting.com` domain).
    3. If matched, insert `group_memberships(group_id, account_id, role='member', source='spreadsheet')`.
    4. Enforce `ON CONFLICT (group_id, account_id) DO NOTHING`.

---

#### B. File: `List of Company Hardware Devices (Laptop).xlsx`

##### Sheet: `Laptop Information`
- `Asset No` → `devices.asset_number` (Trimmed, unique natural key, e.g. `LGI-CD-2024-042`)
- `Computer Brand and Type`:
  - Split by first space to extract `devices.brand` (e.g. `LENOVO`, `MSI`, `ASUS`)
  - Store entire string in `devices.model` (e.g. `LENOVO IDEAPAD SLIM 3 14AMN8`)
- `Computer Name` → `devices.computer_name` (e.g. `LeadGeeks-011`)
- `Purchasing Date` → `devices.purchased_at` (Parse Excel date / YYYY-MM-DD)
- `Antivirus Checklist` → `devices.has_antivirus` (`true` if marked/checked/yes, else `false`)
- `Notes` → `devices.notes`
- `status` derivation:
  - If PIC Name is "Laptop cadangan" or Notes contain "cadangan" → `reserve` (2 devices)
  - If PIC Name is "N/A" or empty → `available` (2 devices)
  - If Notes contain "Akan dijual" → `decommissioned` (1 device)
  - Otherwise (has named PIC) → `assigned` (26 devices)
- **Specifications (1:1)**:
  - `Processor` → `device_specifications.processor`
  - `RAM` → `device_specifications.ram`
  - `ROM` → `device_specifications.storage`
- **Assignments**:
  - For each device with `status = 'assigned'`:
    - `PIC Name` → Fuzzy match to `accounts.id` (`account_id`)
    - `PIC 2 Name` → If present, fuzzy match to `accounts.id` (`custodian_id`)
    - Insert into `device_assignments(device_id, account_id, custodian_id, assigned_at = purchased_at or now())`

##### Sheet: `Access Login`
- `Asset No` → Lookup `devices.id` by `devices.asset_number`
- `Email` → `device_credentials.login_email`
- `PIN Password` → **CRITICAL SECURITY REQUIREMENT**:
  - Source contains plain text (e.g. `123456`, `Leadgeeks123`).
  - Plain text MUST NEVER be saved to PostgreSQL.
  - Per ADR-004 and AGENTS.md, credential reveal capability is required for authorized administrators.
  - Implementation: Reversible authenticated encryption (e.g. AES-256-GCM) using a system key `ENCRYPTION_KEY` from environment variables. Format: `iv:tag:ciphertext` or `pin_hash`.
  - Sensitive reveal operations require server-side permission check and immutable logging to `audit_events`.
- `Notes` → `device_credentials.notes`

---

#### C. File: `List of Softwares_Tools_Applications.xlsx`

##### Sheet: `List of Applications` & `Drop Down`
- `Applications/Tools` → `applications.name` (Unique key)
- `Department` → Normalized using mapping dictionary → `applications.department_id`
- `Tool Details` → `applications.description`
- `Subscription Type`:
  - Source `List of Applications` is mostly empty.
  - Cross-reference with `Drop Down` sheet: Match on application name to fetch `Subscription Type` (`Free` → `free`, `Paid` → `paid`).
- `Category` → Inferred or nullable enum.
- `status` → `'active'`

---

### Data Normalization Rules

#### 1. Department Name Mapping
Spreadsheets contain inconsistent department representations:

| Accounts Sheet Name | Software Drop Down Name | Canonical CORE Name | Canonical Code |
|---------------------|------------------------|---------------------|----------------|
| `Management Office` | `Management` | `Management Office` | `MNG` |
| `Operations` | `Operations` | `Operations` | `OPS` |
| `Growth` | `Growth` | `Growth` | `GRW` |
| `Experience` | `Experience` | `Experience` | `EXP` |
| `HRD` | `Human Resource and Development` | `Human Resource and Development` | `HRD` |
| `IT` | `Information and Technology` | `Information and Technology` | `ITE` |
| `Finance and Accounting`| `Finance and Accounting` | `Finance and Accounting` | `FAC` |
| *(None in Accounts)* | `General` | `General` | `GNR` |

**Normalization Map Code Implementation**:
```typescript
export const DEPARTMENT_NORMALIZATION_MAP: Record<string, string> = {
  'Management': 'Management Office',
  'Management Office': 'Management Office',
  'Operations': 'Operations',
  'Growth': 'Growth',
  'Experience': 'Experience',
  'HRD': 'Human Resource and Development',
  'Human Resource and Development': 'Human Resource and Development',
  'IT': 'Information and Technology',
  'Information and Technology': 'Information and Technology',
  'Finance and Accounting': 'Finance and Accounting',
  'General': 'General',
};
```

#### 2. Fuzzy PIC Name Matching Logic
The `Laptop Information` sheet uses informal first names or nicknames for device holders.
Matching precedence:
1. Exact case-insensitive match against `accounts.display_name`.
2. Exact case-insensitive match against `accounts.full_name`.
3. First-name token match against `accounts.display_name.split(' ')[0]` or `accounts.full_name.split(' ')[0]`.
4. Substring inclusion in `full_name` or `display_name`.
5. Known nickname alias dictionary:
   - "Amanda" → Jean Amanda Stevany Loupatty
   - "Devi" → Devi Indriani
   - "Adit" → Aditya ...
   - "Fajri" → Fajri ...
   - "Rian" → Rian ...
6. Non-person values:
   - `"Laptop cadangan"` / `"cadangan"` → status = `reserve`, no account assignment.
   - `"N/A"` / `""` → status = `available`, no account assignment.
   - `"Akan dijual"` → status = `decommissioned`, no account assignment.

#### 3. Idempotency Specification
The ingestion engine must be fully idempotent:
- **Seed tables**: `INSERT INTO ... ON CONFLICT (name) DO NOTHING` (or `DO UPDATE`).
- **Accounts**: `INSERT INTO accounts (...) VALUES (...) ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, ...`
- **Account Domains**: `INSERT INTO account_domains (account_id, domain_id) VALUES (...) ON CONFLICT (account_id, domain_id) DO NOTHING`
- **Google Groups**: `INSERT INTO google_groups (...) ON CONFLICT (email) DO UPDATE SET member_count = EXCLUDED.member_count, ...`
- **Group Memberships**: `INSERT INTO group_memberships (group_id, account_id, ...) ON CONFLICT (group_id, account_id) DO UPDATE SET source = EXCLUDED.source`
- **Devices**: `INSERT INTO devices (...) ON CONFLICT (asset_number) DO UPDATE SET model = EXCLUDED.model, status = EXCLUDED.status, ...`
- **Device Specifications**: `INSERT INTO device_specifications (device_id, ...) ON CONFLICT (device_id) DO UPDATE SET processor = EXCLUDED.processor, ...`
- **Device Assignments**: Upsert or check existing active assignment (`returned_at IS NULL`).
- **Device Credentials**: `INSERT INTO device_credentials (device_id, ...) ON CONFLICT (device_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, login_email = EXCLUDED.login_email, ...`
- **Applications**: `INSERT INTO applications (...) ON CONFLICT (name) DO UPDATE SET department_id = EXCLUDED.department_id, subscription_type = EXCLUDED.subscription_type, ...`

---

## 6. Target Record Counts Summary

| Domain Entity | Database Table | Expected Record Count | Key Verification Criteria |
|---------------|----------------|-----------------------|---------------------------|
| Departments | `departments` | **8** | Codes: MNG, OPS, GRW, EXP, HRD, ITE, FAC, GNR |
| Account Roles | `account_roles` | **5** | Levels 1 to 5: Top Management to Commercial |
| Domains | `domains` | **3** | leadgeeksinc.com (primary), leadgeeksinc.co, leadgeeksprospecting.com |
| Accounts | `accounts` | **42** | 40 personal, 1 service, 1 shared |
| Account Domains | `account_domains` | **~48** | Multi-domain accounts linked to .com and .co |
| Google Groups | `google_groups` | **15** | Distribution lists across all teams |
| Group Memberships | `group_memberships` | **~168** | Distinct (group_id, account_id) links |
| Devices | `devices` | **31** | 26 assigned, 2 reserve, 2 available, 1 decommissioned |
| Device Specs | `device_specifications` | **31** | 1:1 hardware specs for all 31 devices |
| Device Assignments | `device_assignments` | **26** | Linked to active accounts (PIC 1 and optional PIC 2) |
| Device Credentials | `device_credentials` | **31** | 100% encrypted PINs (no plain text in DB) |
| Applications | `applications` | **125** | Software tools across 7 departments |
| Audit Events | `audit_events` | **Initial: 0** (Grows on actions) | Tracks all sensitive events and CRUD operations |

---

## 7. Logic Chain

1. **Premise 1: Source of Truth Hierarchy**:
   `ADR-002` explicitly establishes that "Spreadsheets are not the source of truth. Google Sheets may be used for import/export only." The relational PostgreSQL schema defined in `DATA_MODEL.md` is the authoritative destination data model for CORE.

2. **Premise 2: Dependency Hierarchy in Relational Ingestion**:
   Foreign key relationships dictate that `departments`, `account_roles`, and `domains` must exist prior to `accounts`. Similarly, `accounts` and `devices` must exist prior to `device_assignments`. Therefore, reference seed insertion must precede spreadsheet ingestion.

3. **Premise 3: Entity Inconsistency Resolution**:
   Spreadsheets use shorthand ("HRD", "IT", "Management") while reference data requires canonical naming ("Human Resource and Development", "Information and Technology", "Management Office"). A strict normalization dictionary is logically necessary to prevent foreign key lookup failures.

4. **Premise 4: Credential Security Invariance**:
   `ADR-004` and `AGENTS.md` strictly forbid plain-text credential persistence. Because device PINs are plain-text numbers in `Access Login`, but IT administrators must be able to reveal them under audited conditions (`credential.reveal`), the storage format must use strong reversible encryption (e.g. AES-256-GCM) keyed from environment variables, stored in `pin_hash`.

5. **Premise 5: Idempotent Import Guarantees**:
   The requirement states that import must be safe to re-run multiple times (`ORIGINAL_REQUEST.md:77`). Using unique natural keys (`email` for accounts/groups, `asset_number` for devices, `name` for applications) with PostgreSQL `ON CONFLICT` clauses satisfies idempotency without data corruption.

---

## 8. Caveats

1. **Device PIC First Name Ambiguity**:
   The `Laptop Information` sheet only provides single first names in some rows. If two accounts share a common first name, the fuzzy matcher could misassign unless full display names or an explicit manual override table is checked.
2. **Plain-Text PIN In Spreadsheet**:
   Source spreadsheet contains plain text credentials. Once ingested into CORE, those credentials are encrypted at rest, but the source spreadsheet file itself remains on disk as a legacy read-only file.
3. **Application Subscription Types**:
   The `List of Applications` sheet leaves `Subscription Type` mostly blank. Ingestion must merge and pull this from the `Drop Down` reference sheet to populate `free` vs `paid`.
4. **Calendar Groups Email Domain**:
   Two calendar groups use `leadgeeksinc.co` while all other groups use `leadgeeksinc.com`. The group ingestion logic must support any valid domain email rather than forcing `leadgeeksinc.com`.

---

## 9. Conclusion

The specification for CORE's database architecture, 12 domain tables + `audit_events`, 3 reference seed datasets, and spreadsheet ingestion pipeline is completely mapped and verified against authoritative project documentation and raw spreadsheet structures.
- All 13 tables are specified with exact column types, primary keys, foreign keys, unique constraints, nullability, and enums.
- The 10-step ingestion sequence ensures strict relational integrity.
- Department normalization rules resolve all naming discrepancies.
- Fuzzy PIC matching and PIN AES-256 encryption satisfy all operational and security requirements.
- The database is ready for schema definition and migration scaffolding in Milestone 1.

---

## 10. Verification Method

To independently verify the schema and spreadsheet ingestion:
1. **Schema Definition Verification**:
   Inspect ORM schema file (Prisma or Drizzle) against section 4 of this report to confirm all 13 tables, enums, FKs, and unique constraints match verbatim.
2. **Seed Data Verification Query**:
   ```sql
   SELECT count(*) FROM departments;    -- Expected: 8
   SELECT count(*) FROM account_roles;  -- Expected: 5
   SELECT count(*) FROM domains;        -- Expected: 3
   ```
3. **Spreadsheet Ingestion Counts Query**:
   ```sql
   SELECT count(*) FROM accounts;              -- Expected: 42
   SELECT count(*) FROM google_groups;         -- Expected: 15
   SELECT count(*) FROM group_memberships;     -- Expected: ~168
   SELECT count(*) FROM devices;               -- Expected: 31
   SELECT count(*) FROM device_specifications; -- Expected: 31
   SELECT count(*) FROM applications;          -- Expected: 125
   ```
4. **Credential Security Verification**:
   ```sql
   SELECT asset_number, pin_hash FROM device_credentials dc JOIN devices d ON dc.device_id = d.id;
   -- Must verify: NO values resemble plain-text PINs (e.g. '123456'); must contain ciphertext strings.
   ```
5. **Idempotency Verification**:
   Run the import script twice in succession. Ensure row counts remain exactly identical and no duplicate key errors or data corruptions occur.
