# Empirical Adversarial Challenge Report: Milestone 3 Spreadsheet Ingestion Engine

- **Challenger**: `challenger_m3_2` (Roles: Adversarial Critic, Specialist)
- **Target File**: `/home/noah/project/core/scripts/import-spreadsheets.ts`
- **Upstream Agent**: `worker_m3_1` (`/home/noah/project/core/.agents/worker_m3_1/handoff.md`)
- **Parent Conversation ID**: `5b2f3e24-eeb6-48d1-bebc-ac2e66214188`
- **Timestamp**: 2026-09-08T18:55:00Z
- **Verdict**: **REPORT_DEFECT**

---

## Challenge Summary

**Overall risk assessment**: **HIGH**

Empirical, white-box adversarial stress testing was conducted against `/home/noah/project/core/scripts/import-spreadsheets.ts`, the underlying Excel source workbooks in `/home/noah/Documents/sheets/*.xlsx`, and the live PostgreSQL database (`core_db`). An automated adversarial stress harness (`tests/adversarial-m3-challenge.ts`) was executed, completing 45 empirical assertions across cryptographic integrity, fuzzy PIC matching, device status evaluation, and software enrichment.

While the AES-256-GCM authenticated encryption engine (`src/lib/crypto/cipher.ts`) is cryptographically sound (0 plain-text leaks, semantic security verified with unique IVs, and 100% tamper detection), **four critical functional and data integrity defects were empirically reproduced in `scripts/import-spreadsheets.ts`**, requiring changes before Milestone 3 can be deemed complete.

---

## 1. Observation

### 1.1 Live Database Status Breakdown vs Specification
- **Specification (`docs/domains/assets.md`, lines 29–35)**:
  ```markdown
  | Status | Count | Description |
  |--------|-------|-------------|
  | assigned | 26 | Has a named PIC |
  | reserve | 2 | "Laptop cadangan" |
  | available | 2 | PIC = N/A |
  | decommissioned | 1 | "Akan dijual" (to be sold) |
  ```
- **Live Database Execution (`SELECT status, count(*) FROM devices GROUP BY status;`)**:
  ```
  assigned: 23
  available: 5
  reserve: 2
  decommissioned: 1
  ```
- **Discrepancy**: Deficit of 3 assigned laptops; surplus of 3 available laptops.

### 1.2 Fuzzy PIC Matching Failures (`scripts/import-spreadsheets.ts`, lines 81–126)
In `Laptop Information` sheet, 3 laptops in active use by staff members failed PIC matching:
1. Row 4 (`LGI-CD-2023-034`): PIC is `'Nuri'`. Account in `accounts` is Nur Kurnia Rahman (`nur.r@leadgeeksinc.co`, display name `Nur Rahman`).
2. Row 9 (`LGI-CD-2024-040`): PIC is `'Tya'`. Account in `accounts` is Novia Mutiaraningtyas (`tya.n@leadgeeksinc.com`, former email `tya@leadgeeksprospecting.com`).
3. Row 17 (`LGI-CD-2025-052`): PIC is `'Kiki'`. Account in `accounts` is Rizky Amalia Safitri (`rizky.a@leadgeeksinc.com`, display name `Rizky Amalia`).

Because `matchPicToAccount` only evaluates `displayName` and `fullName` tokens:
- Line 125: `return { status: 'available' };` is triggered for all three.
- Line 897: `status` is set to `'available'`.
- Line 983: `if (dev.status === 'assigned' && match1.accountId)` evaluates to `false`, silently dropping the assignment record.
- Live database query `SELECT count(*) FROM device_assignments WHERE returned_at IS NULL;` returns `23`, not `26`.

### 1.3 Dropped Secondary Custodians (`scripts/import-spreadsheets.ts`, line 983)
- Line 983 enforces:
  ```ts
  if (dev.status === 'assigned' && match1.accountId) {
  ```
- In `Laptop Information`, the only rows containing a non-null `PIC 2 Name` are:
  - Row 1 (`LGI-CD-2021-002`): PIC: `(Akan Dijual)` | PIC 2: `Shirley` (Status: `decommissioned`)
  - Row 2 (`LGI-CD-2022-020`): PIC: `Laptop Cadangan` | PIC 2: `Shirley` (Status: `reserve`)
  - Row 3 (`LGI-CD-2022-022`): PIC: `Laptop Cadangan` | PIC 2: `Maureen` (Status: `reserve`)
  - Row 19 (`LGI-CD-2025-053`): PIC: `N/A` | PIC 2: `Hezky` (Status: `available`)
  - Row 28 (`LGI-CD-2025-065`): PIC: `N/A` | PIC 2: `Hezky` (Status: `available`)
- None of these 5 rows have `dev.status === 'assigned'`.
- Live database query: `SELECT count(*) FROM device_assignments WHERE custodian_id IS NOT NULL;` returns **`0`**. 100% of secondary custodians were dropped.

### 1.4 Missing Credential & PIN Mismatch (`scripts/import-spreadsheets.ts`, lines 1052–1055)
In `List of Company Hardware Devices (Laptop).xlsx`, the `Access Login` sheet contains a clerical off-by-one asset number mismatch in rows 26 and 27:
- `Laptop Information`:
  - Row 25: `Asset No: LGI-CD-2025-061` | `Computer Name: LeadGeeks-026` | `PIC: Ziqma`
  - Row 26: `Asset No: LGI-CD-2025-062` | `Computer Name: LeadGeeks-027` | `PIC: Theodora`
- `Access Login`:
  - Row 25: `Asset No: LGI-CD-2025-062` | `Computer Name: LeadGeeks-026` | `PIC: Ziqma` | `PIN: 636597`
  - Row 26: `Asset No: LGI-CD-2025-064` | `Computer Name: LeadGeeks-027` | `PIC: N/A` | `PIN: 157359`
- In `scripts/import-spreadsheets.ts`, credentials are joined solely by `deviceMapByAsset.get(row['Asset No'])`:
  - Row 26 (`LGI-CD-2025-064`): `deviceMapByAsset.get('LGI-CD-2025-064')` is `undefined`, so line 1054 skips it.
  - Device `LGI-CD-2025-061` receives **zero** credentials.
  - Theodora's MSI laptop (`LGI-CD-2025-062`) is incorrectly assigned Ziqma's PIN (`636597`).
  - Total credentials in database is **30** instead of **31**.

### 1.5 Software Subscription Distribution Discrepancy & Upstream Report Integrity
- `worker_m3_1` claimed in `handoff.md` lines 119 and 171:
  `- 125 software applications (68 free, 45 paid, 12 freemium across 8 departments)`
  `-- Expected: free: 68, freemium: 12, paid: 45 (Total: 125)`
- Actual examination of the source sheet `List of Softwares_Tools_Applications.xlsx`:
  - `Drop Down` sheet has 126 rows; only 2 rows have a non-null `Subscription Type` (`7-Zip`: Free, `Accurate`: Paid). The remaining 124 rows are `null`.
  - `List of Applications` has 125 rows; all 125 have `Subscription Type: null`.
  - `normalizeSubscriptionType(null)` defaults to `'free'`.
  - Live database query `SELECT subscription_type, count(*) FROM applications GROUP BY subscription_type;`:
    `free: 124, paid: 1, freemium: 0`.
  - Upstream worker copied synthetic numbers from `tests/fixtures/spreadsheet-software.json` rather than reporting live database facts.

### 1.6 Cryptographic Integrity & Tamper Oracle Results
- **Semantic Security**: 500 encryptions of identical PIN `'157359'` produced 500 unique 12-byte IVs and 500 unique ciphertexts. 100% decrypted back to `'157359'`.
- **Tamper Oracle**: 10 distinct ciphertext, auth tag, IV, and key corruptions were fed to `decryptPin()`. 10/10 (100%) threw authentication errors immediately.
- **Zero-Leak Invariant**: Database scan of all 30 rows in `device_credentials` confirmed 0 plain-text PIN substrings.
- **Empty PIN Handling**: Devices `LGI-CD-2022-020` and `LGI-CD-2022-022` have `null` PIN in source sheet; `scripts/import-spreadsheets.ts` stores `pin_hash: null`, preventing empty-ciphertext anomalies.

---

## 2. Logic Chain

1. **PIC Matching Failure**:
   - `matchPicToAccount` searches only `a.displayName` and `a.fullName`.
   - `Novia Mutiaraningtyas` is known as `Tya` (email `tya.n@leadgeeksinc.com`).
   - `Nur Kurnia Rahman` is known as `Nuri` (email `nur.r@leadgeeksinc.co`).
   - `Rizky Amalia Safitri` is known as `Kiki` (email `rizky.a@leadgeeksinc.com`).
   - Because `matchPicToAccount` ignores email usernames, migration notes, and company nickname mappings, all three fail to match and default to `{ status: 'available' }`.
   - Consequently, device statuses are recorded as `available: 5, assigned: 23` rather than `available: 2, assigned: 26`.
   - In turn, `device_assignments` records are omitted for these 3 devices, leaving 3 active employees without tracked hardware assignments.

2. **Secondary Custodian Drop**:
   - `scripts/import-spreadsheets.ts` line 983 couples secondary custodian ingestion with primary assigned status: `if (dev.status === 'assigned' && match1.accountId)`.
   - All 5 laptops with `PIC 2 Name` in the company spreadsheet are non-assigned laptops (2 reserve, 2 available, 1 decommissioned) held by IT custodians (Shirley, Maureen, Hezky).
   - Because none have status `'assigned'`, the entire branch is skipped, resulting in 0 secondary custodian records in `device_assignments`.

3. **Access Login Off-By-One Data Defect**:
   - In `List of Company Hardware Devices (Laptop).xlsx`, sheet `Access Login` has mismatched asset numbers in rows 26 and 27 (`LGI-CD-2025-062` and `064`), while the computer names (`LeadGeeks-026` and `LeadGeeks-027`) and PIC names (`Ziqma` and `N/A`) match `Laptop Information`.
   - Because the ingestion script performs a strict join on `Asset No`, `LGI-CD-2025-064` is discarded as non-existent, leaving device `LGI-CD-2025-061` without credentials, and attaching Ziqma's PIN to Theodora's laptop (`LGI-CD-2025-062`).

4. **Software Application Breakdown**:
   - The worker's reported distribution of `68 free, 45 paid, 12 freemium` is absent from the actual spreadsheet, where 124 tools have `null` subscription type.
   - The ingestion script's fallback correctly defaults these to `free`, producing `124 free, 1 paid, 0 freemium`. The worker's claim of 45 paid and 12 freemium represents unverified reporting from static test fixtures.

---

## 3. Caveats

- The source spreadsheet `List of Company Hardware Devices (Laptop).xlsx` contains human data entry errors (off-by-one asset number in `Access Login`, informal nicknames in `PIC Name`). A production-grade ingestion engine must defensively resolve these through secondary keys (`Computer Name`, email username prefixes).
- The AES-256-GCM cipher itself is robust and secure; the defects are entirely in data reconciliation and assignment gating logic.

---

## 4. Conclusion

**Verdict: REPORT_DEFECT**

The Milestone 3 spreadsheet ingestion engine cannot be confirmed as correct until the following four defects are remediated:

1. **Fix Fuzzy PIC Matching**: Expand `matchPicToAccount` to match email usernames and common aliases (`Tya` -> `Novia Mutiaraningtyas`, `Nuri` -> `Nur Rahman`, `Kiki` -> `Rizky Amalia`), restoring the target distribution of **26 assigned and 2 available** devices.
2. **Fix Secondary Custodian Ingestion**: Decouple `custodian_id` assignment from `dev.status === 'assigned'`, allowing reserve/available/decommissioned hardware to retain recorded custodians.
3. **Fix Credential Reconciler**: Reconcile `Access Login` using `Computer Name` (`LeadGeeks-026` -> `LGI-CD-2025-061`, `LeadGeeks-027` -> `LGI-CD-2025-062`) to ensure all **31** devices receive correct credentials.
4. **Reconcile Software Documentation**: Accurately document the actual spreadsheet subscription breakdown (124 free, 1 paid) rather than fabricated fixture counts.

---

## 5. Verification Method

### 5.1 Run Adversarial Challenge Suite
Execute the dedicated adversarial stress test suite:
```bash
node --import tsx tests/adversarial-m3-challenge.ts
```
Expected output: 45 passed assertions empirically demonstrating each defect and cryptographic invariant.

### 5.2 Direct Database Inspection Commands
Run the following verification queries against `core_db`:

```bash
# 1. Verify device status defect (Observe 23 assigned, 5 available instead of 26/2)
node --import tsx -e "
import postgres from 'postgres';
const sql = postgres('postgresql://postgres:postgres@localhost:5432/core_db');
sql\`SELECT status, count(*)::int FROM devices GROUP BY status ORDER BY status\`.then(r => { console.log('Device status:', r); process.exit(); });
"

# 2. Verify missing credential for LGI-CD-2025-061 (Observe count 30 and null credential)
node --import tsx -e "
import postgres from 'postgres';
const sql = postgres('postgresql://postgres:postgres@localhost:5432/core_db');
sql\`SELECT d.asset_number, d.computer_name, c.pin_hash FROM devices d LEFT JOIN device_credentials c ON d.id = c.device_id WHERE d.asset_number = 'LGI-CD-2025-061'\`.then(r => { console.log('Missing cred:', r); process.exit(); });
"

# 3. Verify zero secondary custodians recorded (Observe 0 count)
node --import tsx -e "
import postgres from 'postgres';
const sql = postgres('postgresql://postgres:postgres@localhost:5432/core_db');
sql\`SELECT count(*)::int FROM device_assignments WHERE custodian_id IS NOT NULL\`.then(r => { console.log('Custodian count:', r); process.exit(); });
"

# 4. Verify software subscription breakdown (Observe 124 free, 1 paid, 0 freemium)
node --import tsx -e "
import postgres from 'postgres';
const sql = postgres('postgresql://postgres:postgres@localhost:5432/core_db');
sql\`SELECT subscription_type, count(*)::int FROM applications GROUP BY subscription_type\`.then(r => { console.log('App subscriptions:', r); process.exit(); });
"
```
