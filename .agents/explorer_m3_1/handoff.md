# Milestone 3 Technical Architecture & Implementation Plan: Spreadsheet Ingestion Engine

- **Agent**: `explorer_m3_1` (Teamwork Explorer / Technical Architect)
- **Working Directory**: `/home/noah/project/core/.agents/explorer_m3_1`
- **Parent Conversation ID**: `5b2f3e24-eeb6-48d1-bebc-ac2e66214188`
- **Date**: 2026-09-09T01:40:00+07:00
- **Milestone**: Milestone 3 — Spreadsheet Ingestion Engine

---

## 1. Observation

### 1.1 Source Files & Paths
1. **Source Spreadsheets** (read-only in `/home/noah/Documents/sheets/`):
   - `/home/noah/Documents/sheets/List of Accounts and Google Group Management.xlsx` (16,377 bytes)
     - Sheet `List of User Account`: 42 accounts, roles, departments, domains, notes.
     - Sheet `Google Group`: 15 Google Groups with ~168 memberships arranged in column-wise format.
   - `/home/noah/Documents/sheets/List of Company Hardware Devices (Laptop).xlsx` (15,270 bytes)
     - Sheet `Laptop Information`: 31 laptops, brands, models, PICs, specs, purchase dates, antivirus status.
     - Sheet `Access Login`: 31 credentials with login email and plain text PINs.
   - `/home/noah/Documents/sheets/List of Softwares_Tools_Applications.xlsx` (62,825 bytes)
     - Sheet `List of Applications`: 125 applications categorized by department.
     - Sheet `Drop Down`: Reference catalog containing subscription type mappings (`Free`, `Paid`).

2. **Database Schema & ORM Definition** (`src/lib/db/` & `src/domains/*/schema.ts`):
   - Database client: `src/lib/db/client.ts` exports `db` (Drizzle client over postgres.js) and `client`.
   - Unified schema: `src/lib/db/schema.ts` re-exports 13 tables across 6 domains.
   - Domain schemas:
     - `src/domains/identity/schema.ts`: `departments`, `accountRoles`, `domains`, `accounts`, `accountDomains`.
       - `accounts` has unique constraint on `email`.
       - `account_type` is enum (`'personal'`, `'service'`, `'shared'`).
       - `accountDomains` has composite primary key `(account_id, domain_id)`.
     - `src/domains/groups/schema.ts`: `googleGroups`, `groupMemberships`.
       - `googleGroups` has unique constraint on `email` and `google_id`.
       - `groupMemberships` has unique constraint `(group_id, account_id)`. `source` is enum (`'spreadsheet'`, `'google_sync'`, `'manual'`).
     - `src/domains/assets/schema.ts`: `devices`, `deviceSpecifications`, `deviceAssignments`.
       - `devices` has unique constraint on `asset_number`.
       - `deviceSpecifications` has unique constraint on `device_id` (1:1).
       - `deviceAssignments` has foreign keys `(device_id, account_id, custodian_id)` but **no unique constraint on `device_id`**.
     - `src/domains/access/schema.ts`: `deviceCredentials`.
       - `deviceCredentials` has foreign key `device_id` but **no unique constraint on `device_id`**.
       - `pinHash`: `varchar(255)` intended for encrypted serialized PIN (`iv:authTag:ciphertext`).
     - `src/domains/software/schema.ts`: `applications`.
       - Unique constraint on `name`.
       - `subscriptionType` is enum (`'free'`, `'paid'`, `'freemium'`). Note: lowercase enum values.
     - `src/domains/audit/schema.ts`: `auditEvents`.
       - Immutable audit log table.

3. **Cryptographic Engine** (`src/lib/crypto/cipher.ts`):
   - `encryptPin(pin: string, keyHex?: string): EncryptedResult`: Generates 12-byte IV, encrypts via AES-256-GCM, extracts 16-byte auth tag, formats as `${ivHex}:${authTag}:${ciphertext}` in hex.
   - `decryptPin(serialized: string, keyHex?: string): string`: Decrypts and verifies authentication tag; throws error on tampering.
   - `isEncryptedPin(val: unknown): boolean`: Validates `^[0-9a-fA-F]{24}:[0-9a-fA-F]{32}:[0-9a-fA-F]+$`.
   - Secret key resolved from `process.env.CREDENTIAL_ENCRYPTION_KEY` or `process.env.ENCRYPTION_KEY`, falling back to `DEFAULT_ENCRYPTION_KEY`.

4. **Package Dependencies** (`package.json`):
   - No spreadsheet parser currently installed in `dependencies` or `devDependencies`.
   - `xlsx` and `exceljs` are absent from `package.json` and `node_modules/`.
   - Runtime dependencies present: `drizzle-orm`, `postgres`, `next`, `react`, `react-dom`, `clsx`, `tailwind-merge`, `lucide-react`, `dotenv`.
   - Development dependencies present: `tsx`, `typescript`, `drizzle-kit`, `eslint`, `@types/node`.

5. **Existing Scripts** (`scripts/`):
   - `scripts/migrate.ts`: Drizzle migrator applying migrations from `drizzle/`.
   - `scripts/seed-reference.ts`: Populates 8 canonical departments, 5 account roles, 3 domains inside a transaction.

6. **Authoritative Specification Docs & Test Fixtures**:
   - `docs/data/spreadsheet-mapping.md`: Defines exact column mappings, 8 department normalizations, fuzzy PIC rules, and 12-step ingestion sequence.
   - `tests/fixtures/reference-data.json`: Canonical reference entities and `departmentNormalizationMap`.
   - `tests/e2e/06-spreadsheet-ingestion.test.ts`: Contains 30 test cases across 4 tiers certifying counts (42 accounts, 15 groups, 31 devices, 125 applications), fuzzy PIC rules, and idempotency.

---

## 2. Logic Chain

### 2.1 XLSX Parser Dependency Selection
1. **Premise**: Node.js does not have built-in support for reading binary `.xlsx` spreadsheet archives. An external parsing package is required to read the three workbooks in `/home/noah/Documents/sheets/*.xlsx`.
2. **Options Evaluation**:
   - **SheetJS (`xlsx`)**:
     - Pros: Industry standard for reading `.xlsx` files in Node.js. Extremely fast in-memory workbook reading (`XLSX.readFile(filePath)`). Native support for extracting worksheets as row-based JSON (`XLSX.utils.sheet_to_json`) and raw cell grids (`sheet[cellRef]`), which is critical for the column-oriented `Google Group` worksheet. Zero native C++ compilation dependencies.
     - Installation: `npm install xlsx`
     - TypeScript types: Types are bundled in the package.
   - **ExcelJS (`exceljs`)**:
     - Pros: Native TypeScript types; robust styling features for spreadsheet generation.
     - Cons: Much heavier package; API is verbose for reading column-oriented grids; slower startup time.
3. **Recommendation**: Install `xlsx` (`npm install xlsx`). It directly supports both row-wise parsing (for Accounts, Devices, Applications) and column-wise cell iteration (for Google Groups).

---

### 2.2 Script Architecture & CLI Design
1. **Target Path**: `scripts/import-spreadsheets.ts`
2. **Npm Script Addition**:
   Add to `package.json`:
   ```json
   "db:import": "tsx scripts/import-spreadsheets.ts"
   ```
3. **CLI Arguments & Environmental Options**:
   - `--sheets-dir=<path>`: Custom location of workbooks (defaults to `/home/noah/Documents/sheets` or `process.env.SHEETS_DIR`).
   - `--seed-ref`: Explicitly triggers reference data seeding (`seedReferenceData`) prior to ingestion (default: true).
   - `--dry-run`: Reads, parses, normalizes, and validates all workbooks without executing database writes.
   - `--verbose`: Emits detailed per-row logs.
4. **Execution Flow**:
   ```
   CLI Entry Point
      │
      ▼
   Load Environment (.env.local, .env)
      │
      ▼
   Verify Files Exist in SHEETS_DIR
      │
      ▼
   Database Connection (postgres.js + Drizzle ORM)
      │
      ▼
   Open Single Database Transaction: tx
      │
      ├── Step 1: Ensure Reference Data (8 Depts, 5 Roles, 3 Domains)
      ├── Step 2: Parse & Ingest Accounts (42 rows)
      ├── Step 3: Ingest Account Domains (M2M join table)
      ├── Step 4: Parse & Ingest Google Groups (15 rows)
      ├── Step 5: Ingest Group Memberships (~168 rows) & Update member_count
      ├── Step 6: Parse & Ingest Devices (31 rows)
      ├── Step 7: Ingest Device Specifications (31 rows)
      ├── Step 8: Ingest Device Assignments (26 assigned rows)
      ├── Step 9: Parse & Ingest Device Credentials (31 encrypted rows)
      └── Step 10: Parse & Ingest Applications (125 enriched rows)
      │
      ▼
   Commit Transaction
      │
      ▼
   Output ASCII Audit & Verification Summary Table
   ```

---

### 2.3 Ingestion Sequence & Transaction Boundaries

#### Stage 1: Reference Data (Prerequisites)
1. **Step 1: Reference Seed**:
   - Call `seedReferenceData(tx)` from `scripts/seed-reference.ts`.
   - Guarantees 8 departments (`MNG`, `OPS`, `GRW`, `EXP`, `HRD`, `ITE`, `FAC`, `GNR`), 5 account roles (`Top Management` to `Commercial`), and 3 domains (`leadgeeksinc.com`, `leadgeeksinc.co`, `leadgeeksprospecting.com`).
   - Query and cache ID maps: `deptMapByName`, `roleMapByName`, `domainMapByName`.

#### Stage 2: Identity & Groups (`List of Accounts and Google Group Management.xlsx`)
2. **Step 2: Accounts Ingestion**:
   - Workbook: `List of Accounts and Google Group Management.xlsx`
   - Sheet: `List of User Account`
   - Columns:
     - `Nama Lengkap` → `fullName`
     - `Account User Name` → `displayName`
     - `New Email Address` → `email` (unique natural key)
     - `Old Email Address` → `previousEmail`
     - `Department` → `canonicalizeDepartment(dept)` → lookup `departmentId`
     - `Email Type` → lookup `accountRoleId` in `account_roles`
     - `Notes` → `notes`
     - `Notes Old` → `migrationNotes`
   - Account Type Classification Logic:
     - If `email === 'sales@leadgeeksinc.com'` or `role === 'Commercial'` → `'service'`
     - If `email === 'admin@leadgeeksinc.co'` → `'shared'`
     - Otherwise → `'personal'`
   - Upsert into `accounts` on conflict `(email)`: update all mutable fields, set `updatedAt = now()`.
   - Build in-memory lookup cache: `accountMapByEmail` (mapping both `email` and `previousEmail` to account record).

3. **Step 3: Account Domains Association**:
   - For each account row:
     - Read `Domain` cell (e.g. `"leadgeeksinc.com, leadgeeksinc.co"`).
     - Split on `,`, trim whitespace, filter non-empty.
     - For each domain string: resolve `domainId` from `domainMapByName`.
     - Insert into `account_domains` with `onConflictDoNothing({ target: [accountId, domainId] })`.

4. **Step 4: Google Groups Catalog Ingestion**:
   - Sheet: `Google Group`
   - **Critical Layout Structure**: The sheet is column-oriented!
     - Row 1 (Header): Group display name (e.g. `LeadGeeks Team`, `LeadGeeks Management Team`).
     - Row 2: Group email address (e.g. `team@leadgeeksinc.com`, `operations.calendar@leadgeeksinc.co`).
     - Rows 3+: Member email addresses.
   - For each column with valid Row 2 email:
     - Extract `name` (Row 1) and `email` (Row 2).
     - Upsert into `google_groups` on conflict `(email)`: set `name`, `syncStatus = 'pending'`, `updatedAt = now()`.
     - Record `groupId` mapped by column index.

5. **Step 5: Group Memberships Ingestion**:
   - For each group column, iterate from Row 3 down to the last non-empty cell:
     - Read `memberEmail` string (trim, lowercase).
     - Resolve account ID:
       1. Lookup in `accountMapByEmail.get(memberEmail)`
       2. If not found, check `previousEmail` match across accounts.
     - If account resolved:
       - Upsert into `group_memberships` on conflict `(groupId, accountId)`:
         `role = 'member'`, `source = 'spreadsheet'`, `addedAt = now()`.
     - If account unresolvable:
       - Log diagnostic warning: `⚠️ Unmatched member email ${memberEmail} in group ${groupEmail}`.
   - Update `google_groups.member_count` for each group to reflect actual membership count.

#### Stage 3: Hardware Devices & Credentials (`List of Company Hardware Devices (Laptop).xlsx`)
6. **Step 6: Devices Inventory Ingestion**:
   - Workbook: `List of Company Hardware Devices (Laptop).xlsx`
   - Sheet: `Laptop Information`
   - Columns:
     - `Asset No` → `assetNumber` (unique natural key, e.g. `LGI-CD-2024-001`)
     - `Computer Brand and Type` → `model`
     - Brand Extraction: Extract from model string or known brand list (`LENOVO`, `MSI`, `ASUS`).
     - `Computer Name` → `computerName`
     - `Purchasing Date` → `purchasedAt` (format as YYYY-MM-DD string)
     - `Antivirus Checklist` → `hasAntivirus` (truthy if checked/yes/checklist)
     - `Notes` → `notes`
     - PIC Status Determination: evaluate `picName` and notes via `matchPicToAccount`.
   - Upsert into `devices` on conflict `(assetNumber)`: update `brand`, `model`, `computerName`, `status`, `purchasedAt`, `hasAntivirus`, `notes`, `updatedAt = now()`.
   - Build lookup cache: `deviceMapByAssetNumber`.

7. **Step 7: Device Specifications**:
   - Columns:
     - `Processor` → `processor`
     - `RAM` → `ram`
     - `ROM` → `storage` (note: spreadsheet header is "ROM", database field is `storage`)
   - Upsert into `device_specifications` on conflict `(deviceId)`: update `processor`, `ram`, `storage`.

8. **Step 8: Device Assignments**:
   - For each device where `status === 'assigned'`:
     - Match `picName` to primary `accountId`.
     - If `pic2Name` is present, match to `custodianId`.
     - **Idempotency Strategy for `device_assignments`**:
       Query existing active assignment:
       ```sql
       SELECT id FROM device_assignments WHERE device_id = devId AND returned_at IS NULL LIMIT 1;
       ```
       - If found: update `accountId`, `custodianId`, `assignedAt`, `notes`.
       - If not found: insert new row into `device_assignments`.
   - For devices where status is `'reserve'`, `'available'`, or `'decommissioned'`:
     - If an active assignment exists, close it (`returnedAt = now()`).

9. **Step 9: Device Credentials Ingestion & PIN Encryption**:
   - Sheet: `Access Login`
   - Columns:
     - `Asset No` → match to `deviceId` via `deviceMapByAssetNumber`.
     - `Email` → `loginEmail` (e.g. `leadgeeksindonesia@gmail.com`).
     - `PIN Password` → raw string PIN (e.g. `"123456"`).
     - `Notes` → `notes`.
   - **Encryption Requirement**:
     - Plain text PIN must NEVER be written to the database.
     - Call `encryptPin(pinPassword.toString().trim())` from `src/lib/crypto/cipher.ts`.
     - Output is serialized `iv:authTag:ciphertext` hex string (stored in `pinHash`).
   - **Idempotency Strategy for `device_credentials`**:
     Query existing credential:
     ```sql
     SELECT id FROM device_credentials WHERE device_id = devId LIMIT 1;
     ```
     - If found: update `loginEmail`, `pinHash`, `notes`, `updatedAt = now()`.
     - If not found: insert new row into `device_credentials`.

#### Stage 4: Software Applications (`List of Softwares_Tools_Applications.xlsx`)
10. **Step 10: Applications Ingestion & Drop Down Enrichment**:
    - Workbook: `List of Softwares_Tools_Applications.xlsx`
    - Sheet 1: `Drop Down` (Reference catalog):
      - Read `Applications/Tools` and `Subscription Type` (`Free`, `Paid`).
      - Build in-memory enrichment map: `subscriptionTypeMap` (lowercase: `'free'` | `'paid'`).
    - Sheet 2: `List of Applications`:
      - Columns:
        - `Department` → `canonicalizeDepartment(dept)` → lookup `departmentId`.
        - `Applications/Tools` → `name` (unique natural key).
        - `Tool Details` → `description`.
        - `Subscription Type` → merge from sheet cell or fallback to `subscriptionTypeMap.get(name)`. Normalize to lowercase `'free'` | `'paid'` | `'freemium'`.
        - `category`: infer or default to `'other'` (or match known tools: Chrome/Gmail → `'communication'`, VS Code → `'development'`, Canva → `'design'`, Salesforce → `'marketing'`).
        - `status`: default `'active'`.
    - Upsert into `applications` on conflict `(name)`: update `departmentId`, `description`, `subscriptionType`, `category`, `status`, `updatedAt = now()`.

---

### 2.4 Department Canonicalization Mapping
1. Canonicalization Dictionary:
   ```ts
   export const DEPARTMENT_NORMALIZATION_MAP: Record<string, string> = {
     // Exact matches
     'Management Office': 'Management Office',
     'Operations': 'Operations',
     'Growth': 'Growth',
     'Experience': 'Experience',
     'Finance and Accounting': 'Finance and Accounting',
     'Human Resource and Development': 'Human Resource and Development',
     'Information and Technology': 'Information and Technology',
     'General': 'General',

     // Spreadsheet variations (Accounts & Drop Down)
     'Management': 'Management Office',
     'HRD': 'Human Resource and Development',
     'IT': 'Information and Technology',
   };
   ```
2. Validation Behavior:
   - Trim input string.
   - Look up in `DEPARTMENT_NORMALIZATION_MAP`.
   - If not found, throw explicit error:
     `throw new Error(`Unrecognized department string: "${rawName}"`);`
   - This satisfies test assertion `[Tier 2] rejects unrecognized department string during canonicalization`.

---

### 2.5 PIC Fuzzy Matching Algorithm
1. Exact matching specifications per test suite `tests/e2e/06-spreadsheet-ingestion.test.ts`:
   ```ts
   export function matchPicToAccount(
     picName: string | undefined | null,
     accounts: { id?: string; displayName: string; fullName: string }[]
   ): { accountId?: string; status: 'assigned' | 'reserve' | 'available' | 'decommissioned' } {
     const trimmed = (picName || '').trim();
     const lower = trimmed.toLowerCase();

     // Boundary conditions
     if (!trimmed || lower === 'n/a' || lower === '-' || lower === 'none') {
       return { status: 'available' };
     }
     if (lower.includes('cadangan')) {
       return { status: 'reserve' };
     }
     if (lower.includes('dijual') || lower.includes('rusak')) {
       return { status: 'decommissioned' };
     }

     // Tier 1: Exact case-insensitive match on displayName (e.g. "Amanda")
     const exactDisplay = accounts.find(a => a.displayName.toLowerCase() === lower);
     if (exactDisplay) {
       return { accountId: exactDisplay.id || exactDisplay.displayName, status: 'assigned' };
     }

     // Tier 2: Exact match on fullName (e.g. "Devi Indriani")
     const exactFull = accounts.find(a => a.fullName.toLowerCase() === lower);
     if (exactFull) {
       return { accountId: exactFull.id || exactFull.displayName, status: 'assigned' };
     }

     // Tier 3: First-name token match (e.g. "Amanda" matches "Jean Amanda Stevany Loupatty")
     const firstNameToken = lower.split(/[\s,]+/)[0];
     if (firstNameToken && firstNameToken.length >= 2) {
       const tokenMatch = accounts.find(a =>
         a.displayName.toLowerCase().startsWith(firstNameToken) ||
         a.fullName.toLowerCase().split(/[\s,]+/)[0] === firstNameToken ||
         a.fullName.toLowerCase().split(/[\s,]+/).includes(firstNameToken)
       );
       if (tokenMatch) {
         return { accountId: tokenMatch.id || tokenMatch.displayName, status: 'assigned' };
       }
     }

     // Fallback: unassigned available device
     return { status: 'available' };
   }
   ```
2. Custodian resolution:
   - For secondary PIC (`PIC 2 Name` e.g. "Fajri"), run the same function:
     `const custodianMatch = matchPicToAccount(pic2Name, accounts);`
     If status is `'assigned'`, set `custodianId = custodianMatch.accountId`.

---

### 2.6 Idempotency Strategy Matrix
To ensure the script can run repeatedly without errors or duplicate rows:

| Table | Natural / Target Key | Drizzle Upsert Strategy |
|---|---|---|
| `departments` | `code` or `name` | Disjunctive lookup -> update if found, insert if absent |
| `account_roles` | `name` | Lookup by name -> update level if found, insert if absent |
| `domains` | `name` | Lookup by name -> update `isPrimary` if found, insert if absent |
| `accounts` | `email` | `insert(accounts).values(...).onConflictDoUpdate({ target: accounts.email, set: { ... } })` |
| `account_domains` | `(accountId, domainId)` | `insert(accountDomains).values(...).onConflictDoNothing()` |
| `google_groups` | `email` | `insert(googleGroups).values(...).onConflictDoUpdate({ target: googleGroups.email, set: { ... } })` |
| `group_memberships` | `(groupId, accountId)` | `insert(groupMemberships).values(...).onConflictDoUpdate({ target: [groupMemberships.groupId, groupMemberships.accountId], set: { role: 'member', source: 'spreadsheet' } })` |
| `devices` | `assetNumber` | `insert(devices).values(...).onConflictDoUpdate({ target: devices.assetNumber, set: { ... } })` |
| `device_specifications`| `deviceId` | `insert(deviceSpecifications).values(...).onConflictDoUpdate({ target: deviceSpecifications.deviceId, set: { ... } })` |
| `device_assignments` | None (No unique constraint) | **Query active assignment by `deviceId` (`returnedAt IS NULL`)**: update if found, insert if absent |
| `device_credentials` | None (No unique constraint) | **Query credential by `deviceId`**: update if found, insert if absent |
| `applications` | `name` | `insert(applications).values(...).onConflictDoUpdate({ target: applications.name, set: { ... } })` |

---

## 3. Caveats

1. **Missing Unique Constraints on Assignments & Credentials**:
   - Neither `device_assignments` nor `device_credentials` has a unique constraint on `device_id` in their Drizzle schema definitions.
   - Relying solely on `onConflictDoUpdate` would cause a syntax/runtime SQL error for these two tables.
   - **Mitigation**: The ingestion script MUST execute a pre-check query (`SELECT id FROM ... WHERE device_id = ...`) within the transaction to determine whether to perform an `update()` or an `insert()`.
2. **Column-Oriented Google Group Sheet**:
   - Unlike standard tabular spreadsheets where rows are records, the `Google Group` sheet represents groups as columns. Standard `XLSX.utils.sheet_to_json` row iteration will not extract groups properly.
   - **Mitigation**: Use range decoding (`XLSX.utils.decode_range(sheet['!ref'])`) to iterate column indices `C = range.s.c to range.e.c`.
3. **Multi-Domain Comma Separator Variations**:
   - Cells in the `Domain` column contain varied whitespace and trailing commas (e.g. `"leadgeeksinc.com, leadgeeksinc.co, "`).
   - **Mitigation**: Explicitly split on `,`, trim each token, and filter out empty strings (`.filter(Boolean)`).
4. **Subscription Type Case Sensitivity**:
   - The PostgreSQL enum `subscription_type_enum` requires lowercase values (`'free'`, `'paid'`, `'freemium'`), whereas the Drop Down sheet contains capitalized `"Free"` and `"Paid"`.
   - **Mitigation**: Apply `.toLowerCase()` before database insertion.

---

## 4. Conclusion

The technical strategy and architecture for Milestone 3 (Spreadsheet Ingestion Engine) is fully determined:
1. **Dependency**: Install `xlsx` (`npm install xlsx`).
2. **Pipeline Script**: Implement `scripts/import-spreadsheets.ts` implementing a 10-step atomic transaction pipeline.
3. **Execution Script**: Expose via npm script `"db:import": "tsx scripts/import-spreadsheets.ts"`.
4. **Target Entity Counts**:
   - 8 canonical departments
   - 5 account roles
   - 3 company domains
   - 42 accounts (40 personal, 1 service, 1 shared)
   - 15 Google Groups
   - ~168 group memberships
   - 31 devices (26 assigned, 2 reserve, 2 available, 1 decommissioned)
   - 31 device specifications
   - 31 device credentials (all encrypted with AES-256-GCM via `encryptPin`)
   - 125 applications across 8 departments
5. **Idempotency**: All tables guaranteed idempotent via Drizzle upserts and explicit lookup-updates for non-unique tables.

---

## 5. Verification Method

### 5.1 Verification Commands
Once the implementer builds `scripts/import-spreadsheets.ts`:

1. **Install xlsx dependency**:
   ```bash
   npm install xlsx
   ```

2. **Execute Database Migration & Ingestion**:
   ```bash
   npm run db:migrate
   npm run db:import
   ```

3. **Re-run Ingestion to Verify Idempotency**:
   ```bash
   npm run db:import
   # Must exit with code 0, reporting 0 duplicate rows created
   ```

4. **Run E2E Test Suite 06 (Spreadsheet Ingestion)**:
   ```bash
   node tests/runner.mjs --suite=06
   # Expected: 30 passed, 0 failed
   ```

5. **Run E2E Test Suite 05 (Credential Encryption)**:
   ```bash
   node tests/runner.mjs --suite=05
   # Expected: 22 passed, 0 failed
   ```

6. **Run Full E2E Test Suite**:
   ```bash
   npm test
   # Expected: Exit code 0, 180+ tests passed
   ```

7. **Database Assertion Query**:
   ```sql
   SELECT
     (SELECT COUNT(*) FROM accounts) as accounts_count,
     (SELECT COUNT(*) FROM google_groups) as groups_count,
     (SELECT COUNT(*) FROM devices) as devices_count,
     (SELECT COUNT(*) FROM applications) as apps_count,
     (SELECT COUNT(*) FROM device_credentials WHERE pin_hash NOT LIKE '%:%:%') as plain_pin_leaks;
   ```
   Expected:
   - `accounts_count` = 42
   - `groups_count` = 15
   - `devices_count` = 31
   - `apps_count` = 125
   - `plain_pin_leaks` = 0
