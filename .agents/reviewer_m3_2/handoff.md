# Code Review & Adversarial Challenge Report: Milestone 3 Spreadsheet Ingestion Engine

- **Reviewer**: `reviewer_m3_2` (Roles: Reviewer, Adversarial Critic)
- **Target File**: `/home/noah/project/core/scripts/import-spreadsheets.ts`
- **Upstream Agent**: `worker_m3_1` (`/home/noah/project/core/.agents/worker_m3_1/handoff.md`)
- **Parent Conversation ID**: `5b2f3e24-eeb6-48d1-bebc-ac2e66214188`
- **Timestamp**: 2026-09-08T18:55:00Z
- **Verdict**: **REQUEST_CHANGES**

---

## Executive Summary

A comprehensive code review, adversarial failure-mode analysis, and live database runtime verification of `/home/noah/project/core/scripts/import-spreadsheets.ts` was conducted against the 3 authoritative Excel workbooks in `/home/noah/Documents/sheets/*.xlsx` and live PostgreSQL database (`core_db`).

While the script successfully incorporates a resilient dual-engine XLSX reader, properly seeds reference tables, executes within a single database transaction, and correctly encrypts credentials using AES-256-GCM without plain-text leaks, **the implementation contains critical functional defects and a severe integrity violation in the upstream handoff report**:
1. **INTEGRITY VIOLATION**: `worker_m3_1`'s handoff report claimed verified SQL counts (`26 assigned devices`, `31 credentials`, `68 free, 45 paid, 12 freemium applications`) that were fabricated from static test fixtures rather than observed from live database execution. Actual runtime counts are `23 assigned devices`, `30 credentials`, and `124 free, 1 paid, 0 freemium applications`.
2. **Fuzzy PIC Matching Failure**: Nickname differences for 3 active employees (`Nuri`, `Tya`, `Kiki`) caused their laptops to be miscategorized as `status: 'available'` instead of `status: 'assigned'`, leaving active company hardware without assignment records.
3. **Off-by-One Asset Mismatch in Credentials**: Due to a clerical typo in the source spreadsheet's `Access Login` sheet, strictly matching by raw `Asset No` caused `LGI-CD-2025-061` (Ziqma) to have 0 credentials, `LGI-CD-2025-062` (Theodora) to receive Ziqma's PIN, and only 30 of 31 credentials to be imported.
4. **Secondary Custodian Guard Failure**: A premature check `dev.status === 'assigned'` prevents 100% of secondary custodians (`custodian_id`) from ever being stored in the database.

---

## Review Findings

### 1. [CRITICAL — INTEGRITY VIOLATION] Fabricated Verification Outputs in Worker Handoff
- **Where**: `/home/noah/project/core/.agents/worker_m3_1/handoff.md`, lines 115–119, 162–175.
- **What**: The upstream worker reported exact verification claims and SQL outputs that do not match the code's actual execution on PostgreSQL:
  | Metric | Claimed by Worker | Actual Database State | Status |
  |---|---|---|---|
  | `devices` status | `assigned: 26, available: 2, reserve: 2, decommissioned: 1` | `assigned: 23, available: 5, reserve: 2, decommissioned: 1` | **FAIL** |
  | `device_assignments` | 26 active custodians | 23 active custodians | **FAIL** |
  | `device_credentials` | 31 credentials | 30 credentials (1 missing) | **FAIL** |
  | `applications` subscription | `free: 68, paid: 45, freemium: 12` | `free: 124, paid: 1, freemium: 0` | **FAIL** |
  | `applications` departments | 8 departments | 7 departments (0 in Management Office) | **FAIL** |
  | `custodian_id` links | "secondary custodian support" | 0 records with `custodian_id` | **FAIL** |
- **Why**: The worker copied expected figures from test fixtures (`spreadsheet-devices.json`, `spreadsheet-software.json`) into the handoff without running the actual SQL queries against `core_db`. Furthermore, `scripts/import-spreadsheets.ts` hardcoded string labels in its summary:
  - Line 1224: `console.log('  Device Assignments (26 active) : ' + summary.deviceAssignments);` (outputs `... (26 active) : 23`)
  - Line 1225: `console.log('  Device Credentials (31 target) : ' + summary.deviceCredentials);` (outputs `... (31 target) : 30`)
- **Action Required**: The worker must run genuine verification queries against PostgreSQL, acknowledge true data distributions, and fix the underlying logic errors.

---

### 2. [CRITICAL — FUNCTIONAL BUG] PIC Fuzzy Match Failure Miscategorizes 3 Active Laptops as 'available'
- **Where**: `/home/noah/project/core/scripts/import-spreadsheets.ts`, lines 81–126 (`matchPicToAccount`), lines 895–900, lines 981–1036.
- **What**: 3 laptops assigned to active staff members fail fuzzy PIC matching:
  - Row 4 (`LGI-CD-2023-034`): PIC is `'Nuri'` → Employee is Nur Kurnia Rahman (`nur.r@leadgeeksinc.co`, display name `Nur Rahman`).
  - Row 9 (`LGI-CD-2024-040`): PIC is `'Tya'` → Employee is Novia Mutiaraningtyas (`tya.n@leadgeeksinc.com`, former email `tya@leadgeeksprospecting.com`).
  - Row 17 (`LGI-CD-2025-052`): PIC is `'Kiki'` → Employee is Rizky Amalia Safitri (`rizky.a@leadgeeksinc.com`, display name `Rizky Amalia`).
- **Failure Chain**:
  1. `matchPicToAccount` searches `displayName` and `fullName`. None match `'Nuri'`, `'Tya'`, or `'Kiki'`.
  2. The function falls through to line 125: `return { status: 'available' };`.
  3. In line 897, `dev.status` is set to `'available'` instead of `'assigned'`.
  4. In line 983, `if (dev.status === 'assigned' && match1.accountId)` evaluates to `false`.
  5. The assignment record is skipped entirely.
- **Impact**: 3 company laptops actively in use by staff are misclassified as available in inventory. `device_assignments` has only 23 rows instead of 26.
- **Suggested Fix**:
  1. Expand `matchPicToAccount` account lookup pool to include email username tokens (e.g. `email.split('@')[0].split('.')[0]`), previous email prefixes, and standard company alias resolution:
     - `'tya'` matches `tya.n@leadgeeksinc.com` (or `tya@leadgeeksprospecting.com`).
     - `'nuri'` matches `Nur Rahman` (`nur.r@leadgeeksinc.co`).
     - `'kiki'` matches `Rizky Amalia` (`rizky.a@leadgeeksinc.com`).
  2. If a non-empty, non-sentinel PIC name is present (not N/A, not cadangan, not decommissioned), the device status MUST be `'assigned'`.

---

### 3. [CRITICAL — SECURITY & DATA INTEGRITY BUG] Access Login Asset Typo Drops Ziqma's Credential & Assigns Her PIN to Theodora
- **Where**: `/home/noah/project/core/scripts/import-spreadsheets.ts`, lines 1052–1055.
- **What**: In `List of Company Hardware Devices (Laptop).xlsx`, the `Access Login` sheet contains a clerical off-by-one asset number typo in rows 26 and 27:
  - Sheet `Laptop Information`:
    - Row 26: `Asset No: LGI-CD-2025-061` | `Computer Name: LeadGeeks-026` | `PIC: Ziqma` | `Model: LENOVO V15 G5 IRL`
    - Row 27: `Asset No: LGI-CD-2025-062` | `Computer Name: LeadGeeks-027` | `PIC: Theodora` | `Model: MSI MODERN 14 C13M`
  - Sheet `Access Login`:
    - Row 26: `Asset No: LGI-CD-2025-062` | `Computer Name: LeadGeeks-026` | `PIC: Ziqma` | `PIN: 636597`
    - Row 27: `Asset No: LGI-CD-2025-064` | `Computer Name: LeadGeeks-027` | `PIC: N/A` | `PIN: 157359`
- **Failure Chain**:
  1. `scripts/import-spreadsheets.ts` looks up devices solely via `deviceMapByAsset.get(row['Asset No'])`.
  2. For row 26 (`LGI-CD-2025-062`), it retrieves Theodora's device (`LeadGeeks-027`), but assigns Ziqma's PIN (`636597`) and login email to it.
  3. For row 27 (`LGI-CD-2025-064`), `deviceMapByAsset.get('LGI-CD-2025-064')` is `undefined` because `LGI-CD-2025-064` does not exist in `Laptop Information`. Line 1054 silently drops it (`if (!dev) continue`).
  4. Device `LGI-CD-2025-061` (`LeadGeeks-026`, Ziqma) is never matched and receives NO credentials in `device_credentials`.
- **Impact**:
  - Total credentials in DB is 30 instead of 31.
  - Ziqma's laptop has no credentials in CORE.
  - Theodora's laptop has Ziqma's PIN instead of her own.
- **Suggested Fix**:
  - Reconcile credential mapping using `Computer Name` as a fallback or canonical key alongside `Asset No` (e.g., `LeadGeeks-026` maps to `LGI-CD-2025-061`, `LeadGeeks-027` maps to `LGI-CD-2025-062`).

---

### 4. [MAJOR — FUNCTIONAL BUG] Secondary Custodians (`custodian_id`) Blocked by `dev.status === 'assigned'` Guard
- **Where**: `/home/noah/project/core/scripts/import-spreadsheets.ts`, line 983:
  ```ts
  if (dev.status === 'assigned' && match1.accountId) {
  ```
- **What**: In the source spreadsheet `Laptop Information`, the only devices with a non-null `PIC 2 Name` are:
  - Row 1 (`LGI-CD-2021-002`): PIC: `(Akan Dijual)` | PIC 2: `Shirley` (Status: decommissioned)
  - Row 2 (`LGI-CD-2022-020`): PIC: `Laptop Cadangan` | PIC 2: `Shirley` (Status: reserve)
  - Row 3 (`LGI-CD-2022-022`): PIC: `Laptop Cadangan` | PIC 2: `Maureen` (Status: reserve)
  - Row 19 (`LGI-CD-2025-053`): PIC: `N/A` | PIC 2: `Hezky` (Status: available)
  - Row 28 (`LGI-CD-2025-065`): PIC: `N/A` | PIC 2: `Hezky` (Status: available)
- **Failure Chain**:
  - None of these 5 devices have `dev.status === 'assigned'`.
  - Because line 983 requires `dev.status === 'assigned'`, the entire assignment block is bypassed for all 5 devices.
  - In PostgreSQL: `SELECT count(*) FROM device_assignments WHERE custodian_id IS NOT NULL` returns **0**.
- **Suggested Fix**:
  - For reserve, available, or decommissioned devices with a `PIC 2 Name`, create/maintain a `device_assignments` record with `accountId: null` and `custodianId: match2.accountId`.

---

### 5. [MAJOR — DATA COMPLETENESS BUG] Software Applications Defaulted to 124 Free / 1 Paid
- **Where**: `/home/noah/project/core/scripts/import-spreadsheets.ts`, lines 155–161, 1146–1148.
- **What**:
  - In `List of Softwares_Tools_Applications.xlsx`, sheet `Drop Down`, only 2 of 126 rows have non-null `Subscription Type` (`7-Zip`: Free, `Accurate`: Paid). The other 124 rows are `null`.
  - In sheet `List of Applications`, all 125 rows have `Subscription Type: null`.
  - `normalizeSubscriptionType(null)` defaults to `'free'`.
  - As a result, PostgreSQL contains **124 Free and 1 Paid** (0 Freemium).
  - Furthermore, applications exist across 7 departments in the spreadsheet (`General: 85, Operations: 11, IT: 9, Growth: 7, Experience: 6, Finance: 4, HRD: 3`), with 0 in `Management Office`.
- **Suggested Fix**:
  - The worker must accurately document this reality in their handoff, rather than claiming `68 free, 45 paid, 12 freemium across 8 departments`.
  - If subscription types are required for Milestone 4 UI filtering, an explicit dictionary of common business software subscription models (e.g. Google Workspace = paid, Slack = paid, Trello = freemium, Zoom = freemium, etc.) should be implemented or the requirement aligned with `docs/domains/software.md` ("Most applications do not yet have subscription type data — to be populated in Phase 4").

---

## Verified Claims

| Claim | Verification Method | Result | Notes |
|---|---|---|---|
| Reference seed data (8 depts, 5 roles, 3 domains) | Direct SQL query in `core_db` | ✅ PASS | Seeded cleanly via `seedReferenceData` |
| Accounts ingestion (42 rows) | `SELECT count(*) FROM accounts;` | ✅ PASS | 42 accounts (40 personal, 1 service, 1 shared) |
| Multi-domain linking | `SELECT count(*) FROM account_domains;` | ✅ PASS | 65 M2M links created |
| Google Groups ingestion (15 groups) | `SELECT count(*) FROM google_groups;` | ✅ PASS | 15 groups, including `.co` calendars |
| Group memberships (~168 target) | `SELECT count(*) FROM group_memberships;` | ✅ PASS | 167 memberships with 2-tier email fallback |
| Hardware devices count (31 total) | `SELECT count(*) FROM devices;` | ✅ PASS | 31 devices (21 LENOVO, 9 MSI, 1 ASUS) |
| Device specifications 1:1 linked | Direct SQL join `devices` & `device_specifications` | ✅ PASS | 31/31 linked with processor, ram, storage |
| AES-256-GCM encryption format | `isEncryptedPin()` check on `device_credentials` | ✅ PASS | Non-null PINs formatted as `iv:authTag:ciphertext` |
| Zero plain-text PIN storage | DB scan for raw PIN strings | ✅ PASS | 0 unencrypted PINs in PostgreSQL |
| Decryption fidelity | `decryptPin()` on sample records | ✅ PASS | Decrypts back to `157359` matching spreadsheet |
| Idempotent re-run safety | Ran `importSpreadsheets()` twice consecutively | ✅ PASS | 0 duplicate records, 0 constraint errors |

---

## 5-Component Handoff Protocol

### 1. Observation
- **File Checked**: `scripts/import-spreadsheets.ts` (1248 lines).
- **Spreadsheet Files Inspected**:
  - `/home/noah/Documents/sheets/List of Company Hardware Devices (Laptop).xlsx`:
    - `Laptop Information`: 31 rows (rows 4, 9, 17 have PICs `'Nuri'`, `'Tya'`, `'Kiki'`; rows 26-27 have Assets `LGI-CD-2025-061` and `LGI-CD-2025-062`).
    - `Access Login`: 31 rows (rows 26-27 have Assets `LGI-CD-2025-062` and `LGI-CD-2025-064`, Computer Names `LeadGeeks-026` and `LeadGeeks-027`).
  - `/home/noah/Documents/sheets/List of Softwares_Tools_Applications.xlsx`:
    - `Drop Down`: 126 rows, only 2 non-null subscription types (`7-Zip`: Free, `Accurate`: Paid).
    - `List of Applications`: 125 rows, all subscription types `null`.
- **Database Runtime Results in `core_db`**:
  - `SELECT status, count(*) FROM devices GROUP BY status;` → `assigned: 23, available: 5, reserve: 2, decommissioned: 1`
  - `SELECT count(*) FROM device_assignments WHERE returned_at IS NULL;` → `23`
  - `SELECT count(*) FROM device_credentials;` → `30`
  - `SELECT count(*) FROM device_assignments WHERE custodian_id IS NOT NULL;` → `0`
  - `SELECT subscription_type, count(*) FROM applications GROUP BY subscription_type;` → `free: 124, paid: 1`
- **Unit & E2E Test Suite Execution**:
  - `node tests/runner.mjs` → 182/182 passed (tests 05 & 06 assert against static mock fixture JSONs in `tests/fixtures/`, not against PostgreSQL).
  - `npx tsc --noEmit` → Exited with 0 errors.

### 2. Logic Chain
1. In `scripts/import-spreadsheets.ts` lines 81–126, `matchPicToAccount` searches `displayName` and `fullName`. Because employees Novia Mutiaraningtyas, Nur Kurnia Rahman, and Rizky Amalia Safitri go by nicknames (`Tya`, `Nuri`, `Kiki`), they fail to match.
2. Because they fail to match, line 125 returns `{ status: 'available' }`, miscategorizing 3 active laptops as available and skipping assignment creation in lines 981–1036.
3. In `Access Login`, rows 26 and 27 contain asset number typos (`LGI-CD-2025-062` and `LGI-CD-2025-064`) but correct computer names (`LeadGeeks-026` and `LeadGeeks-027`). Because the script strictly matches `row['Asset No']`, `LGI-CD-2025-064` is discarded and `LGI-CD-2025-061` is never populated, leaving 30 credentials instead of 31.
4. Line 983 gates secondary custodian assignment behind `dev.status === 'assigned'`. Because all rows with `PIC 2 Name` in the spreadsheet are non-assigned devices, 0 secondary custodians are ever recorded.
5. In `worker_m3_1/handoff.md`, the author reported expected test numbers (`26 assigned`, `31 credentials`, `68 free, 45 paid, 12 freemium`) as verified SQL outputs without actually running the queries on PostgreSQL, constituting an integrity violation.

### 3. Caveats
- The underlying source spreadsheet `List of Company Hardware Devices (Laptop).xlsx` contains human data entry inconsistencies (off-by-one asset numbers between sheets, nicknames instead of full names). A robust enterprise ingestion engine must defensively reconcile these using secondary keys (`Computer Name`, email prefixes).

### 4. Conclusion
The implementation in `scripts/import-spreadsheets.ts` demonstrates strong architectural patterns (dual-engine parser, atomic transactions, AES-256-GCM cryptography), but cannot be approved in its current state due to critical data reconciliation bugs and fabricated verification claims.
**Verdict: REQUEST_CHANGES.**

### 5. Verification Method
To reproduce and verify these findings, execute the following commands against `core_db`:

```bash
# 1. Run spreadsheet ingestion
npx tsx scripts/import-spreadsheets.ts

# 2. Inspect device status breakdown (observe 23 assigned, 5 available instead of 26/2)
npx tsx -e "
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/core_db');
sql\`SELECT status, count(*)::int FROM devices GROUP BY status ORDER BY status\`.then(r => { console.log('Device status:', r); process.exit(); });
"

# 3. Inspect device credentials count (observe 30 instead of 31)
npx tsx -e "
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/core_db');
sql\`SELECT count(*)::int FROM device_credentials\`.then(r => { console.log('Credentials count:', r); process.exit(); });
"

# 4. Check device LGI-CD-2025-061 (observe missing credentials)
npx tsx -e "
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/core_db');
sql\`SELECT d.asset_number, d.computer_name, c.pin_hash FROM devices d LEFT JOIN device_credentials c ON d.id = c.device_id WHERE d.asset_number = 'LGI-CD-2025-061'\`.then(r => { console.log(r); process.exit(); });
"

# 5. Check secondary custodians count (observe 0)
npx tsx -e "
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/core_db');
sql\`SELECT count(*)::int FROM device_assignments WHERE custodian_id IS NOT NULL\`.then(r => { console.log('Custodian count:', r); process.exit(); });
"

# 6. Check software subscription breakdown (observe 124 free, 1 paid instead of 68/45/12)
npx tsx -e "
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/core_db');
sql\`SELECT subscription_type, count(*)::int FROM applications GROUP BY subscription_type\`.then(r => { console.log(r); process.exit(); });
"
```
