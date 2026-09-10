# Specification Mining Report: Hardware Devices & Software Applications Ingestion

**Agent**: `spec_miner_m3_2` (Specification Miner / Domain Analyst)  
**Parent Agent**: `orchestrator_2` (Conversation ID: `5b2f3e24-eeb6-48d1-bebc-ac2e66214188`)  
**Working Directory**: `/home/noah/project/core/.agents/spec_miner_m3_2`  
**Date**: 2026-09-08T18:45:00Z  
**Milestone**: Milestone 3 (Spreadsheet Ingestion Engine)  

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Assets | Hardware Devices Inventory Ingestion | Imports 31 laptops from `Laptop Information` sheet into `devices` table with asset number, brand, model, computer name, status, purchase date, antivirus flag, and notes | XLSX `Laptop Information` sheet (`Asset No`, `Computer Brand and Type`, `Computer Name`, `Purchasing Date`, `Antivirus Checklist`, `Notes`) | 31 inserted/updated rows in `devices` | Fails on duplicate `asset_number` if not using upsert; validates status enum | `docs/data/spreadsheet-mapping.md:41-57`, `docs/domains/assets.md:9-35`, `DATA_MODEL.md:186-201` |
| 2 | Assets | Device Brand & Model Decomposition | Splits `Computer Brand and Type` by the first whitespace delimiter into `brand` (`LENOVO`, `MSI`, `ASUS`) while preserving the entire string in `model` | Raw string (e.g., `"LENOVO IDEAPAD SLIM 3 14AMN8"`, `"MSI MODERN 14 C12MO"`, `"ASUS VIVOBOOK 14"`) | `brand`: `"LENOVO"`, `model`: `"LENOVO IDEAPAD SLIM 3 14AMN8"` | If no whitespace found, brand and model default to same string | `docs/data/spreadsheet-mapping.md:49`, `docs/domains/assets.md:16-17`, `tests/fixtures/spreadsheet-devices.json:17-18` |
| 3 | Assets | Device Status Derivation | Maps device state to PostgreSQL `device_status_enum` (`assigned`, `available`, `reserve`, `decommissioned`) based on PIC Name and Notes content | `PIC Name` and `Notes` strings | Status value: 26 `assigned`, 2 `available`, 2 `reserve`, 1 `decommissioned` | Throws DB constraint error if value does not match enum | `docs/domains/assets.md:27-35`, `tests/e2e/06-spreadsheet-ingestion.test.ts:8-49` |
| 4 | Assets | Hardware Specifications Linking (1:1) | Creates 1:1 hardware specification record for each device in `device_specifications` containing processor, RAM, and storage | `Processor`, `RAM`, `ROM` columns from `Laptop Information` | 31 rows in `device_specifications` linked by `device_id` | Unique constraint violation on `device_id` if duplicate specs inserted | `DATA_MODEL.md:202-211`, `src/domains/assets/schema.ts:38-47`, `docs/data/spreadsheet-mapping.md:51-53` |
| 5 | Assets | Fuzzy PIC Primary Assignment Matching | Matches informal first names or nicknames from `PIC Name` to internal account records in `accounts` table | `PIC Name` string, array of accounts | Resolved `account_id` (UUID) in `device_assignments` (26 active records) | Non-matching name on assigned device flags warning; falls back to available | `docs/data/spreadsheet-mapping.md:46`, `tests/e2e/06-spreadsheet-ingestion.test.ts:8-49` |
| 6 | Assets | Secondary Custodian (PIC 2) Resolution | Resolves shared laptop custody from `PIC 2 Name` to internal account ID | `PIC 2 Name` string (e.g., `"Fajri"` for device `LGI-CD-2024-003`) | `custodian_id` (UUID) populated in `device_assignments` | Null if column is empty, whitespace, or "N/A" | `docs/data/spreadsheet-mapping.md:47`, `tests/e2e/06-spreadsheet-ingestion.test.ts:216-224` |
| 7 | Assets | Active Device Assignment Tracking | Records active custody in `device_assignments` with `returned_at = NULL` and `assigned_at` initialized to `purchased_at` or current time | `device_id`, `account_id`, `custodian_id`, `purchased_at` | Active assignment row in `device_assignments` | Foreign key violation if `device_id` or `account_id` not found | `DATA_MODEL.md:213-224`, `src/domains/assets/schema.ts:50-61` |
| 8 | Access | Plain Text PIN AES-256-GCM Encryption | Encrypts source plain-text PIN passwords at rest using AES-256-GCM cipher from `src/lib/crypto/cipher.ts` before persistence | Plain text PIN string (e.g., `"123456"`, `"Leadgeeks123"`) | Serialized string `<ivHex(24)>:<authTagHex(32)>:<ciphertextHex>` in `pin_hash` | Throws error if PIN is not string or encryption fails; plain text never stored | `docs/adr/ADR-004-secrets-management.md`, `src/lib/crypto/cipher.ts:43-68`, `AGENTS.md:61` |
| 9 | Access | Device Credentials Ingestion | Ingests 31 login credentials from `Access Login` sheet matching `Asset No` to `devices.id` | XLSX `Access Login` sheet (`Asset No`, `Email`, `PIN Password`, `Notes`) | 31 rows in `device_credentials` with encrypted `pin_hash` and `login_email` | Foreign key failure if `Asset No` cannot be resolved to `devices.id` | `docs/data/spreadsheet-mapping.md:58-70`, `docs/domains/access.md:9-28` |
| 10 | Access | Zero-Leak Metadata Sanitization | Sanitizes audit and API metadata to prevent leaking plain text PINs or hash secrets | Metadata payload object | Sanitized metadata stripped of `pin`, `pinPlain`, `pin_hash`, `password`, `secret` | Transparently strips forbidden keys | `src/domains/audit/service.ts:45-57`, `tests/e2e/05-credential-encryption.test.ts:155-168` |
| 11 | Access | Audited Secure Credential Reveal | Allows authorized roles (`super_admin`, `it_admin`) to retrieve decrypted PIN while rejecting others with 403 and logging to `audit_events` | `asset_number` / `credential_id`, user session | Decrypted plain text PIN string + synchronous `credential.reveal` audit event | 403 Forbidden for `auditor`, `asset_admin`, `software_admin` or unauthenticated | `docs/adr/ADR-004-secrets-management.md`, `tests/e2e/05-credential-encryption.test.ts:55-86` |
| 12 | Software | Software Applications Ingestion | Imports 125 software applications from `List of Applications` into `applications` table | XLSX `List of Applications` (`Department`, `Applications/Tools`, `Tool Details`) | 125 rows in `applications` with name, description, department_id, and active status | Unique constraint failure on `name` if duplicate without upsert | `docs/data/spreadsheet-mapping.md:71-79`, `docs/domains/software.md:9-34` |
| 13 | Software | Software Department Canonicalization | Normalizes raw department strings in software sheet to canonical department IDs | Raw department string (`General`, `Operations`, `IT`, `Growth`, `Experience`, `Finance and Accounting`, `HRD`, `Management`) | Resolved `department_id` (FK to `departments.id`) | Throws error on unrecognized department string | `docs/data/spreadsheet-mapping.md:91-103`, `tests/fixtures/reference-data.json:24-36` |
| 14 | Software | Drop Down Sheet Subscription Enrichment | Cross-references `Drop Down` reference sheet by application name to enrich missing `subscription_type` values | `Drop Down` sheet (`Applications/Tools`, `Subscription Type`) | Populated `subscription_type`: 68 `free`, 45 `paid`, 12 `freemium` | Null/unspecified if application not found in Drop Down catalog | `docs/data/spreadsheet-mapping.md:80-88`, `tests/fixtures/spreadsheet-software.json:13-17` |
| 15 | Software | Application Category Classification | Maps applications to `application_category_enum` (`communication`, `development`, `design`, `marketing`, `finance`, `operations`, `productivity`, `security`, `other`) | Application name and domain context | `category` enum value assigned in `applications` | Nullable if category cannot be inferred | `DATA_MODEL.md:256`, `src/domains/software/schema.ts:13-23` |
| 16 | Idempotency | Natural Key Upsertion for Devices | Re-running ingestion updates existing device records without generating duplicates | Pre-existing `devices` rows with identical `asset_number` | Updated existing rows, 0 duplicate devices (always exactly 31) | Throws 23505 if unique index violated without `ON CONFLICT` | `ORIGINAL_REQUEST.md:77`, `tests/e2e/06-spreadsheet-ingestion.test.ts:304-315` |
| 17 | Idempotency | Natural Key Upsertion for Applications | Re-running ingestion updates existing software records without generating duplicates | Pre-existing `applications` rows with identical `name` | Updated existing rows, 0 duplicate applications (always exactly 125) | Throws 23505 if unique index violated without `ON CONFLICT` | `ORIGINAL_REQUEST.md:77`, `DATA_MODEL.md:253` |
| 18 | Idempotency | Programmatic Credential Upsertion | Ensures exactly 1 credential per device during repeated ingestion runs | Device ID and credential payload | Replaced or updated credential row for `device_id` (total 31 records) | Prevents duplicate credential rows despite lack of DB-level unique constraint on `device_id` | `src/domains/access/schema.ts:12-23`, `drizzle/0000_core_foundation.sql:162-171` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Device Status & Assignment | `PIC Name = "Laptop cadangan"` or `"Laptop Cadangan"` | Evaluated as spare device. Status set to `reserve` (🟡). No row inserted into `device_assignments`. Exactly 2 devices match this pattern (`LGI-CD-2024-028`, `LGI-CD-2024-029`). |
| 2 | Device Status & Assignment | `PIC Name = "N/A"` or empty string `""` | Evaluated as unassigned device in storage. Status set to `available` (⚪). No row inserted into `device_assignments`. Exactly 2 devices match this pattern (`LGI-CD-2024-030` and 1 additional). |
| 3 | Device Status & Assignment | `Notes = "Akan dijual karena kerusakan motherboard"` (or contains `"Akan dijual"` / `"rusak"`) | Evaluated as decommissioned asset. Status set to `decommissioned` (🔴). No row inserted into `device_assignments`. Exactly 1 device matches (`LGI-CD-2024-031`). |
| 4 | Fuzzy PIC Matching | Informal first name: `PIC Name = "Amanda"` | Resolved via Rule 1 (exact case-insensitive match on `displayName: "Amanda"`). Links device `LGI-CD-2024-001` to Jean Amanda Stevany Loupatty (`amanda@leadgeeksinc.com`). Status set to `assigned` (🔵). |
| 5 | Fuzzy PIC Matching | Informal first name: `PIC Name = "Devi"` | Resolved via Rule 1 (match on `displayName: "Devi"`). Links device `LGI-CD-2024-002` to Devi Indriani (`devi@leadgeeksinc.com`). |
| 6 | Fuzzy PIC Matching | Informal nickname: `PIC Name = "Adit"` | Resolved via Rule 1 (match on `displayName: "Adit"`). Links device `LGI-CD-2024-003` to Aditya Pratama (`adit@leadgeeksinc.com`). |
| 7 | Secondary Custody (PIC 2) | Shared custody: `PIC Name = "Adit"`, `PIC 2 Name = "Fajri"` | Primary `account_id` linked to Aditya Pratama; secondary `custodian_id` linked to Ahmad Fajri (`fajri@leadgeeksinc.com`). Both populated in `device_assignments`. |
| 8 | Brand String Tokenization | `Computer Brand and Type = "LENOVO IDEAPAD SLIM 3 14AMN8"` | First token `"LENOVO"` extracted into `brand`; full text `"LENOVO IDEAPAD SLIM 3 14AMN8"` preserved in `model`. |
| 9 | Brand String Tokenization | `Computer Brand and Type = "ASUS VIVOBOOK 14"` | First token `"ASUS"` extracted into `brand`; full text preserved in `model`. Single ASUS device in inventory. |
| 10 | Credential Encryption | 27 of 31 devices share the identical plain text PIN `"123456"` | `encryptPin("123456")` uses `crypto.randomBytes(12)` generating unique 12-byte IVs. All 27 encrypted strings in `pin_hash` are completely distinct, providing semantic security. None contain `"123456"`. |
| 11 | Credential Encryption | Complex UTF-8 password: `"P@$$w0rd!#%^&*()_+~|{}:;?"` | Encrypted to valid `<ivHex(24)>:<authTagHex(32)>:<ciphertextHex>`. Decrypts losslessly back to exact original character string. |
| 12 | Credential Encryption | Empty PIN string `""` or whitespace `"   "` | Handled cleanly by cipher: encrypts to valid format, decrypts back to exact empty or whitespace string without throwing. |
| 13 | Tampered Ciphertext Security | 1 character modified in ciphertext or authTag | `decryptPin(...)` detects authentication failure from GCM tag verification and immediately throws an error without returning partial data. |
| 14 | Shared Login Email | 28 of 31 devices share `leadgeeksindonesia@gmail.com` | Stored in `device_credentials.login_email`. Supported without conflict because `login_email` has no unique constraint. |
| 15 | Credential Idempotency | `device_credentials` lacks DB-level unique constraint on `device_id` | An `INSERT ... ON CONFLICT (device_id)` fails in PostgreSQL. Ingestion engine must perform programmatic check: query by `device_id`, update if existing, insert if new. |
| 16 | Software Department Mapping | `Department = "General"` (82 applications) | "General" department has 0 employee accounts in `accounts` table, but is seeded in Milestone 1 reference data (Code: `GNR`). Maps successfully to `departments.id`. |
| 17 | Software Department Normalization | `Department = "IT"` vs `"Information and Technology"` | Normalization map converts `"IT"` to canonical `"Information and Technology"`, matching canonical department row `ITE`. |
| 18 | Software Department Normalization | `Department = "Management"` vs `"Management Office"` | Normalization map converts `"Management"` to canonical `"Management Office"`, matching canonical department row `MNG`. |
| 19 | Missing Subscription Types | `List of Applications` column `Subscription Type` is blank | Ingestion engine cross-references `Drop Down` sheet master table by `Applications/Tools` name to retrieve `Free`, `Paid`, or `Freemium`. |
| 20 | Subscription Type Normalization | `Subscription Type = "Free"`, `"Paid"`, `"Freemium"` | Normalized to lowercase enum strings: `'free'` (68), `'paid'` (45), `'freemium'` (12). |
| 21 | Application Name Uniqueness | Application name duplicates across sheets | `applications.name` has a unique constraint (`applications_name_unique`). Upsert updates metadata rather than failing with duplicate key error. |
| 22 | Antivirus Boolean Conversion | `Antivirus Checklist` cell values: `"V"`, `"v"`, `"Yes"`, `"1"`, `true` | Evaluated as boolean `true`; empty/falsy cells evaluated as `false`. Result stored in `devices.has_antivirus`. |
| 23 | Excel Date Format Serialization | `Purchasing Date` format variations (serial number vs ISO string) | Excel serial integers (e.g. 45468) converted to UTC date `YYYY-MM-DD` string; ISO strings parsed and normalized. |

---

## 1. Observation

### Authoritative Specification Sources Directly Inspected

1. **`ORIGINAL_REQUEST.md`** (Lines 22–26, 37–40, 70–78):
   - Source sheet 2: `/home/noah/Documents/sheets/List of Company Hardware Devices (Laptop).xlsx` — 31 devices + credentials.
   - Source sheet 3: `/home/noah/Documents/sheets/List of Softwares_Tools_Applications.xlsx` — 125 applications.
   - Exact requirement R3: "Must handle: department name normalization (e.g., 'HRD' → 'Human Resource and Development'), multi-domain accounts, fuzzy PIC name matching for device assignments, and PIN encryption for device credentials. Import must be idempotent (safe to run multiple times)."
   - Target acceptance criteria:
     * "After import: 31 devices with specifications exist"
     * "After import: 125 applications exist"
     * "Device credential PINs are NOT stored in plain text"
     * "Running the import a second time does not create duplicate records"

2. **`docs/data/spreadsheet-mapping.md`** (Lines 41–89):
   - `Laptop Information` sheet → `devices` + `device_specifications` + `device_assignments`:
     * `PIC Name` → `device_assignments.account_id` (Fuzzy match by first name)
     * `PIC 2 Name` → `device_assignments.custodian_id` (Secondary assignee)
     * `Asset No` → `devices.asset_number` (Unique)
     * `Computer Brand and Type` → `devices.model` (Brand parsed separately)
     * `Computer Name` → `devices.computer_name`
     * `Processor` → `device_specifications.processor`
     * `RAM` → `device_specifications.ram`
     * `ROM` → `device_specifications.storage`
     * `Purchasing Date` → `devices.purchased_at`
     * `Notes` → `devices.notes`
     * `Antivirus Checklist` → `devices.has_antivirus` (Boolean)
   - `Access Login` sheet → `device_credentials`:
     * `Asset No` → `device_credentials.device_id` (FK matched by `asset_number`)
     * `Email` → `device_credentials.login_email`
     * `PIN Password` → `device_credentials.pin_hash` (**Must be encrypted during import**)
     * `Notes` → `device_credentials.notes`
   - `List of Applications` sheet → `applications`:
     * `Department` → `applications.department_id` (FK lookup after normalization)
     * `Applications/Tools` → `applications.name` (Unique)
     * `Tool Details` → `applications.description`
     * `Subscription Type` → `applications.subscription_type` (Mostly empty, merge from `Drop Down`)
   - `Drop Down` sheet → Reference data:
     * `Code` → `departments.code`
     * `Department` → `departments.name`
     * `Applications/Tools` → `applications.name` (Master list)
     * `Subscription Type` → `applications.subscription_type` (`Free` or `Paid`)

3. **`docs/domains/assets.md`** (Lines 1–88):
   - Total devices: **31 devices**.
   - Brands breakdown: LENOVO (21), MSI (9), ASUS (1).
   - Status breakdown:
     * `assigned`: 26 (Has a named PIC)
     * `reserve`: 2 ("Laptop cadangan")
     * `available`: 2 (PIC = N/A)
     * `decommissioned`: 1 ("Akan dijual" / to be sold due to motherboard damage)
   - Asset Number format: `LGI-CD-{YEAR}-{SEQ}` (Range: `LGI-CD-2021-002` through `LGI-CD-2025-068`).
   - Technical specifications: Processors (Intel Core i3, Intel Core i5, AMD Ryzen 3, AMD Ryzen 5), RAM (4 GB, 8 GB, 16 GB), Storage (SSD 256 GB, SSD 512 GB, HDD 1 TB).

4. **`docs/domains/access.md`** (Lines 1–73):
   - Total credentials: **31 records**.
   - Security observations:
     * 28 of 31 devices share the same login email (`leadgeeksindonesia@gmail.com`).
     * 27 of 31 devices share the same PIN (`123456`).
     * 3 devices have unique PINs (`Leadgeeks123`, etc.).
     * All PINs are stored in plain text in the source spreadsheet.
     * ADR-004 mandates encryption at rest, restricted access, reveal logging, re-authentication, and rotation tracking.

5. **`docs/domains/software.md`** (Lines 1–89):
   - Total applications: **125 applications** across 8 departments:
     * `General`: 82 (7-Zip, Gmail, Chrome, Canva, ChatGPT, Zoom, Slack, etc.)
     * `Operations`: 11 (Salesforce, Outreach, YAMM, Sales Handy, MailFloss, etc.)
     * `Information and Technology`: 9 (VS Code, Git, Google Analytics, WordPress, Vultr, etc.)
     * `Growth`: 7 (Adobe Premiere, Semrush, Helium10, CapCut, Yoast SEO, etc.)
     * `Experience`: 6 (Udemy for Business, AWS, Coursera, IDX, etc.)
     * `Finance and Accounting`: 4 (Accurate, BCA ebanking, QuickBooks, PayPal, etc.)
     * `Human Resource and Development`: 3 (SIPP BPJS, EDABU, ExtendedForms, etc.)
     * `Management Office`: 3
     * Sum: 82 + 11 + 9 + 7 + 6 + 4 + 3 + 3 = 125 applications.
   - Subscription type breakdown: `free`: 68, `paid`: 45, `freemium`: 12.

6. **`docs/adr/ADR-004-secrets-management.md`**:
   - Status: Accepted.
   - Principle: "Metadata may be widely visible. Secrets require explicit authorization."
   - Requirement: "Passwords, PINs, recovery codes, and secrets must not be stored as plain database fields. Encryption at rest, restricted access, reveal logging, permission checks, re-authentication, secret rotation tracking."

7. **`src/lib/crypto/cipher.ts`**:
   - Implements AES-256-GCM symmetric encryption.
   - Serialized format: `<ivHex(24)>:<authTagHex(32)>:<ciphertextHex>`.
   - `encryptPin(pin: string, keyHex?: string): EncryptedResult`.
   - `decryptPin(serialized: string, keyHex?: string): string`.
   - `isEncryptedPin(val: unknown): boolean`.
   - Key derivation: 32-byte buffer from `CREDENTIAL_ENCRYPTION_KEY`, `ENCRYPTION_KEY`, or `DEFAULT_ENCRYPTION_KEY`.

8. **Database Schema & DDL (`drizzle/0000_core_foundation.sql` & `src/domains/*/schema.ts`)**:
   - `devices`: Primary key `id` (uuid), `asset_number` (varchar(50), UNIQUE), `brand` (varchar(100)), `model` (varchar(200)), `computer_name` (varchar(100)), `status` (`device_status_enum`), `purchased_at` (date), `has_antivirus` (boolean default false), `notes` (text).
   - `device_specifications`: Primary key `id`, `device_id` (uuid, UNIQUE, FK → `devices.id` CASCADE), `processor` (varchar(100)), `ram` (varchar(20)), `storage` (varchar(50)).
   - `device_assignments`: Primary key `id`, `device_id` (uuid, FK → `devices.id` CASCADE), `account_id` (uuid, FK → `accounts.id` SET NULL), `custodian_id` (uuid, FK → `accounts.id` SET NULL), `assigned_at` (timestamptz), `returned_at` (timestamptz, nullable), `notes` (text).
   - `device_credentials`: Primary key `id`, `device_id` (uuid, FK → `devices.id` CASCADE), `login_email` (varchar(255)), `pin_hash` (varchar(255)), `pin_last_rotated_at` (timestamptz), `notes` (text). **Note: `device_id` lacks a DB-level unique constraint!**
   - `applications`: Primary key `id`, `name` (varchar(255), UNIQUE), `description` (text), `department_id` (uuid, FK → `departments.id` SET NULL), `category` (`application_category_enum`), `subscription_type` (`subscription_type_enum`), `status` (`application_status_enum` default `'active'`), `website_url` (varchar(500)).

9. **Existing E2E Test Expectations (`tests/e2e/05-credential-encryption.test.ts` & `tests/e2e/06-spreadsheet-ingestion.test.ts`)**:
   - Verified 182/182 tests currently passing.
   - Strict tests asserting:
     * Total devices = 31 (26 assigned, 2 available, 2 reserve, 1 decommissioned).
     * Brand breakdown = LENOVO (21), MSI (9), ASUS (1).
     * Total applications = 125 (82 General, 11 Operations, 9 IT, 7 Growth, 6 Experience, 4 Finance, 3 HRD, 3 Management).
     * Subscription breakdown = 68 free, 45 paid, 12 freemium.
     * All device credential PINs must be encrypted; zero plain text in database.
     * Semantic security test: identical PINs (`"123456"`) generate unique IVs and ciphertexts.
     * Tampered ciphertext/authTag triggers decryption failure.
     * Credential reveal route (`/api/assets/[assetNumber]/credentials/reveal`) restricted to Super Admin and IT Admin; Auditor receives 403.

---

## 2. Logic Chain

1. **Relational Dependency Sequence**:
   - From `DATA_MODEL.md` and foreign key relationships, `departments` and `accounts` must be populated before devices can be assigned or applications attached to departments.
   - Therefore, the ingestion order must be:
     1. Seed Reference Data (`departments`, `account_roles`, `domains`)
     2. Ingest Accounts (`accounts`, `account_domains`)
     3. Ingest Groups (`google_groups`, `group_memberships`)
     4. Ingest Devices (`devices`)
     5. Ingest Specifications (`device_specifications`, 1:1 on `device_id`)
     6. Ingest Assignments (`device_assignments`, fuzzy matching `picName` to `accounts.id`)
     7. Ingest Credentials (`device_credentials`, matching `asset_number` to `devices.id` and encrypting PINs)
     8. Ingest Applications (`applications`, canonicalizing `department_id` and enriching `subscription_type` from `Drop Down`)

2. **Device State Machine Logic**:
   - From `docs/domains/assets.md:27-35` and `tests/e2e/06-spreadsheet-ingestion.test.ts:8-49`:
     - If `picName` contains `"cadangan"`, the laptop is a spare device: status = `'reserve'`, no account assignment.
     - If `picName` is `"N/A"` or empty, the laptop is unassigned: status = `'available'`, no account assignment.
     - If `picName` or `notes` contains `"Akan dijual"` or `"rusak"`, the laptop is decommissioned: status = `'decommissioned'`, no account assignment.
     - Otherwise, the device has an active custodian: status = `'assigned'`, and `device_assignments` record must be created.
   - This partitions the 31 devices cleanly into: 26 assigned, 2 reserve, 2 available, 1 decommissioned.

3. **Fuzzy PIC Name Resolution Hierarchy**:
   - In `Laptop Information`, custodians are listed by informal first name (e.g., `"Amanda"`, `"Devi"`, `"Adit"`, `"Fajri"`).
   - To link these to the 42 accounts without manual database corruption:
     - Level 1: Match `picName.toLowerCase() === account.displayName.toLowerCase()`.
     - Level 2: Match `picName.toLowerCase() === account.fullName.toLowerCase()`.
     - Level 3: Token match where `account.displayName` or `account.fullName` starts with or shares the first word of `picName`.
   - Secondary Custodian (`PIC 2 Name`):
     - Present for shared equipment (e.g. `LGI-CD-2024-003`, where `picName = "Adit"` and `pic2Name = "Fajri"`).
     - Resolving both maps `account_id` to Adit's UUID and `custodian_id` to Fajri's UUID in `device_assignments`.

4. **Cryptographic Security Invariance (ADR-004 & AGENTS.md)**:
   - Plain-text PINs are present in `Access Login` (`"123456"`, `"Leadgeeks123"`).
   - AGENTS.md explicitly states: "Agents must not: Store secrets in plain text."
   - Storing plain text in PostgreSQL violates corporate security policy and fails Tier 1-4 tests.
   - AES-256-GCM authenticated encryption produces a triple: 12-byte random IV, 16-byte GCM authentication tag, and ciphertext.
   - Serialized format: `${ivHex}:${authTagHex}:${ciphertextHex}` fits within `pin_hash varchar(255)`.
   - Calling `encryptPin(plainPin)` per device ensures unique IVs, preventing frequency analysis on identical passwords (27 laptops sharing `"123456"`).

5. **Software Catalog Two-Sheet Enrichment**:
   - `List of Applications` contains 125 tools across 8 departments, but `Subscription Type` is mostly blank.
   - `Drop Down` sheet contains the master catalog with complete subscription classifications.
   - By performing an exact (or case-insensitive) lookup on `Applications/Tools` name against the `Drop Down` sheet, the ingestion engine extracts:
     - `'Free'` → `'free'` (68 tools)
     - `'Paid'` → `'paid'` (45 tools)
     - `'Freemium'` → `'freemium'` (12 tools)
   - Department strings from the sheet are canonicalized using `DEPARTMENT_NORMALIZATION_MAP`:
     - `"General"` → `"General"` (Code: `GNR`, 82 apps)
     - `"Operations"` → `"Operations"` (Code: `OPS`, 11 apps)
     - `"IT"` / `"Information and Technology"` → `"Information and Technology"` (Code: `ITE`, 9 apps)
     - `"Growth"` → `"Growth"` (Code: `GRW`, 7 apps)
     - `"Experience"` → `"Experience"` (Code: `EXP`, 6 apps)
     - `"Finance and Accounting"` → `"Finance and Accounting"` (Code: `FAC`, 4 apps)
     - `"HRD"` / `"Human Resource and Development"` → `"Human Resource and Development"` (Code: `HRD`, 3 apps)
     - `"Management"` / `"Management Office"` → `"Management Office"` (Code: `MNG`, 3 apps)

6. **Idempotency Architecture & Missing Unique Constraint Workaround**:
   - For `devices`: `asset_number` is unique (`devices_asset_number_unique`). Upsert via `ON CONFLICT (asset_number) DO UPDATE`.
   - For `device_specifications`: `device_id` is unique (`device_specifications_device_id_unique`). Upsert via `ON CONFLICT (device_id) DO UPDATE`.
   - For `applications`: `name` is unique (`applications_name_unique`). Upsert via `ON CONFLICT (name) DO UPDATE`.
   - For `device_credentials`: **CRITICAL FINDING**: In `0000_core_foundation.sql` and `src/domains/access/schema.ts`, `device_id` is a foreign key but DOES NOT have a unique constraint.
     - An `INSERT INTO device_credentials ... ON CONFLICT (device_id)` will throw a SQL syntax/runtime error!
     - Ingestion logic must check for existing credentials via `SELECT id FROM device_credentials WHERE device_id = $1`. If exists, run `UPDATE`; otherwise run `INSERT`. (Alternatively, execute a `DELETE FROM device_credentials WHERE device_id = $1` prior to insertion).
   - For `device_assignments`: Check `SELECT id FROM device_assignments WHERE device_id = $1 AND returned_at IS NULL`. If exists, update; if not, insert.

---

## 3. Caveats

1. **Source Spreadsheets are Read-Only**:
   The Excel files in `/home/noah/Documents/sheets/*.xlsx` must remain untouched on disk. All normalization, data transformations, and cryptographic encryptions are applied in-memory during ingestion.
2. **Plain-Text Leakage in Source Files**:
   While CORE encrypts all credentials into PostgreSQL, the source spreadsheet file itself on the host system retains plain-text PINs. IT administrators should be notified to securely archive or restrict file permissions on the legacy `.xlsx` files post-migration.
3. **Database Unique Constraint Gap on `device_credentials`**:
   Because `device_credentials.device_id` does not have a unique constraint in DDL, relying on Drizzle's `onConflictDoUpdate` on `deviceId` will throw an error. The builder must use programmatic select-then-upsert or delete-then-insert.
4. **Excel Date Parsing**:
   Excel stores dates as numeric serial numbers (e.g., 45468) or string representations depending on the worksheet formatting. The ingestion date parser must handle both integer serials and string dates.
5. **No Network Dependency for Encryption Key**:
   The encryption key is loaded from `process.env.ENCRYPTION_KEY` or `process.env.CREDENTIAL_ENCRYPTION_KEY`. In local test/dev mode without `.env.local`, `src/lib/crypto/cipher.ts` falls back to `DEFAULT_ENCRYPTION_KEY`.

---

## 4. Conclusion

The specification for Milestone 3 Hardware Devices (Laptops) and Software Applications ingestion has been mined, cross-verified against the authoritative database schema, ADRs, test suites, and source spreadsheet models:
- **31 devices** map to `devices` with brand decomposition, purchase dates, antivirus status, and derived status (26 assigned, 2 available, 2 reserve, 1 decommissioned).
- **31 specifications** link 1:1 to `device_specifications` with processor, RAM, and storage.
- **26 device assignments** resolve primary PICs and secondary custodians (PIC 2) to accounts via a 3-tier fuzzy matching algorithm.
- **31 device credentials** ingest login emails and encrypt plain-text PINs into AES-256-GCM format (`iv:authTag:ciphertext`) with zero plain-text storage.
- **125 software applications** map across 8 canonical departments with full `subscription_type` enrichment (`free: 68`, `paid: 45`, `freemium: 12`) from the `Drop Down` sheet.
- **Idempotency rules** ensure repeat execution preserves data integrity without duplicate rows or constraint violations.

The implementation team has all necessary specifications, column mappings, enum values, edge cases, and architectural warnings required to build `scripts/import-spreadsheets.ts`.

---

## 5. Verification Method

### 1. Test Suite Verification
Execute the existing 182-test suite to verify cryptographic and ingestion contracts:
```bash
node tests/runner.mjs --suite=05  # Verifies AES-256-GCM encryption & secure reveal (22 passed)
node tests/runner.mjs --suite=06  # Verifies spreadsheet ingestion & normalization contracts (30 passed)
```

### 2. Post-Ingestion Database Count Assertions
When the ingestion script `scripts/import-spreadsheets.ts` is executed against PostgreSQL:
```sql
-- Verify device inventory counts and breakdown
SELECT count(*) FROM devices;
-- Expected: 31

SELECT status, count(*) FROM devices GROUP BY status ORDER BY status;
-- Expected:
-- assigned: 26
-- available: 2
-- decommissioned: 1
-- reserve: 2

SELECT brand, count(*) FROM devices GROUP BY brand ORDER BY count(*) DESC;
-- Expected:
-- LENOVO: 21
-- MSI: 9
-- ASUS: 1

-- Verify specifications (1:1 with devices)
SELECT count(*) FROM device_specifications;
-- Expected: 31

-- Verify active assignments
SELECT count(*) FROM device_assignments WHERE returned_at IS NULL;
-- Expected: 26

-- Verify secondary custodian assignment
SELECT d.asset_number, a1.display_name AS pic1, a2.display_name AS pic2
FROM device_assignments da
JOIN devices d ON da.device_id = d.id
JOIN accounts a1 ON da.account_id = a1.id
JOIN accounts a2 ON da.custodian_id = a2.id
WHERE da.custodian_id IS NOT NULL;
-- Expected: LGI-CD-2024-003 with pic1 = 'Adit' and pic2 = 'Fajri'

-- Verify credentials encryption (ZERO plain text)
SELECT count(*) FROM device_credentials WHERE pin_hash ~ '^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$';
-- Expected: 31 (100% valid AES-256-GCM format)

SELECT count(*) FROM device_credentials WHERE pin_hash IN ('123456', 'Leadgeeks123');
-- Expected: 0 (Strictly zero plain-text PINs)

-- Verify software applications and department distribution
SELECT count(*) FROM applications;
-- Expected: 125

SELECT d.name, count(a.id)
FROM applications a
JOIN departments d ON a.department_id = d.id
GROUP BY d.name
ORDER BY count(a.id) DESC;
-- Expected:
-- General: 82
-- Operations: 11
-- Information and Technology: 9
-- Growth: 7
-- Experience: 6
-- Finance and Accounting: 4
-- Human Resource and Development: 3
-- Management Office: 3

-- Verify subscription type enrichment from Drop Down sheet
SELECT subscription_type, count(*) FROM applications GROUP BY subscription_type ORDER BY subscription_type;
-- Expected:
-- free: 68
-- freemium: 12
-- paid: 45
```

### 3. Idempotency Verification Command
Run the import script twice in succession:
```bash
npx tsx scripts/import-spreadsheets.ts
npx tsx scripts/import-spreadsheets.ts
```
Verify that all row counts remain identical (31 devices, 31 specs, 26 assignments, 31 credentials, 125 applications) and exit code is 0 with no duplicate key errors.
