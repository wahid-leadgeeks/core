# Empirical Adversarial Challenge Report: Milestone 3 Spreadsheet Ingestion Engine

- **Agent**: `challenger_m3_1` (Empirical Challenger / Adversarial Verifier)
- **Working Directory**: `/home/noah/project/core/.agents/challenger_m3_1`
- **Target File**: `/home/noah/project/core/scripts/import-spreadsheets.ts`
- **Parent Conversation ID**: `5b2f3e24-eeb6-48d1-bebc-ac2e66214188`
- **Timestamp**: 2026-09-08T18:52:45Z
- **Verdict**: `REPORT_DEFECT`

---

## 1. Observation

1. **Account Classification Defect (`amanda.s@leadgeeksinc.com`)**:
   - In `/home/noah/project/core/scripts/import-spreadsheets.ts` lines 664–670:
     ```typescript
     // Account type classification
     let accountType: 'personal' | 'service' | 'shared' = 'personal';
     if (email === 'sales@leadgeeksinc.com' || roleRaw === 'Commercial') {
       accountType = 'service';
     } else if (email === 'admin@leadgeeksinc.co') {
       accountType = 'shared';
     }
     ```
   - In `/home/noah/Documents/sheets/List of Accounts and Google Group Management.xlsx` sheet `List of User Account`:
     - Row for Amanda Stevany: `New Email Address: "amanda.s@leadgeeksinc.com"`, `Nama Lengkap: "Amanda Stevany"`, `Account User Name: "Amanda Stevany"`, `Department: "Growth"`, `Email Type: "Commercial"`, `Notes: "Email Sales 2"`.
     - Row for Sales: `New Email Address: "sales@leadgeeksinc.com"`, `Nama Lengkap: "LeadGeeks Sales"`, `Department: "Growth"`, `Email Type: "Commercial"`, `Notes: "Email Sales 1"`.
   - Tool execution command:
     ```bash
     npx tsx -e "import postgres from 'postgres'; const sql = postgres(process.env.DATABASE_URL); console.log(await sql\`SELECT account_type, count(*) FROM accounts GROUP BY account_type\`); await sql.end();"
     ```
   - Actual database counts:
     `{ account_type: 'personal', count: '39' }, { account_type: 'service', count: '2' }, { account_type: 'shared', count: '1' }`
   - Discrepancy: `docs/domains/identity.md` (lines 28–30) and `worker_m3_1/handoff.md` (lines 69–73) state the system invariant is **40 personal, 1 service, 1 shared**. Due to `|| roleRaw === 'Commercial'`, Amanda Stevany is misclassified as a `service` account.

2. **PIC Fuzzy Matching Defect (3 Devices Incorrectly Marked `available`)**:
   - In `/home/noah/project/core/scripts/import-spreadsheets.ts` lines 81–126 (`matchPicToAccount`):
     Matching checks:
     1. Exact case-insensitive match on `displayName`
     2. Exact case-insensitive match on `fullName`
     3. First-name token match on `displayName` or `fullName`
   - In `/home/noah/Documents/sheets/List of Company Hardware Devices (Laptop).xlsx` sheet `Laptop Information`:
     - Row 4 (Asset `LGI-CD-2023-034`): PIC Name is `"Nuri"`. Employee in `accounts` is `Nur Rahman` (`nur.r@leadgeeksinc.co`, full name "Nur Kurnia Rahman"). First token `"nuri"` !== `"nur"`. Status falls back to `available` with no assignment.
     - Row 9 (Asset `LGI-CD-2024-040`): PIC Name is `"Tya"`. Employee in `accounts` is `Novia Mutiaraningtyas` (`tya.n@leadgeeksinc.com`). Neither displayName nor fullName contains `"Tya"`. Status falls back to `available` with no assignment.
     - Row 17 (Asset `LGI-CD-2025-052`): PIC Name is `"Kiki"`. Employee in `accounts` is `Rizky Amalia` (`rizky.a@leadgeeksinc.com`, full name "Rizky Amalia Safitri"). "Kiki" is a nickname. Status falls back to `available` with no assignment.
   - Tool execution command:
     ```bash
     npx tsx -e "import postgres from 'postgres'; const sql = postgres(process.env.DATABASE_URL); console.log(await sql\`SELECT status, count(*) FROM devices GROUP BY status\`); await sql.end();"
     ```
   - Actual database counts:
     `{ decommissioned: 1, reserve: 2, available: 5, assigned: 23 }`
   - Active device assignments: **23 active custodians** (`SELECT count(*) FROM device_assignments WHERE returned_at IS NULL`).
   - Discrepancy: `docs/domains/assets.md` (lines 29–35) and `worker_m3_1/handoff.md` (lines 114–117) claim **26 assigned, 2 available, 2 reserve, 1 decommissioned** and **26 active assignments**. 3 employee laptops are marked as available with zero custodian records.

3. **Mismatched Asset in Access Login (30 Credentials Instead of 31)**:
   - In `/home/noah/Documents/sheets/List of Company Hardware Devices (Laptop).xlsx`:
     - Sheet `Laptop Information` has 31 rows with assets `LGI-CD-2021-002` through `LGI-CD-2025-068` (including `LGI-CD-2025-061` on row 26, PIC Ziqma; and `LGI-CD-2025-062` on row 27, PIC Theodora).
     - Sheet `Access Login` has 31 rows, but row 26 is `LGI-CD-2025-062` (PIC Ziqma) and row 27 is `LGI-CD-2025-064` (PIC N/A).
     - Asset `LGI-CD-2025-061` is completely missing from `Access Login`.
     - Asset `LGI-CD-2025-064` does not exist in `Laptop Information` / `devices`.
   - In `scripts/import-spreadsheets.ts` lines 1052–1054:
     ```typescript
     const assetNumber = (row['Asset No'] || '').toString().trim();
     const dev = deviceMapByAsset.get(assetNumber);
     if (!dev) continue;
     ```
     `LGI-CD-2025-064` is silently skipped, while `LGI-CD-2025-061` never gets a credential.
   - Actual count in `device_credentials`: **30** (NOT 31 as claimed in `worker_m3_1/handoff.md` line 118).

4. **Google Group Unresolvable Email Member (`amanda@leadgeeksinc.co`)**:
   - In `/home/noah/Documents/sheets/List of Accounts and Google Group Management.xlsx` sheet `Google Group`:
     Column 13 (`Operations Calendar Team`, `operations.calendar@leadgeeksinc.co`) contains 27 raw rows, one of which is `amanda@leadgeeksinc.co`.
   - The accounts sheet only defines `amanda@leadgeeksinc.com` (previous: `amanda@leadgeeksprospecting.com`). There is no `.co` account for Amanda Loupatty.
   - In `group_memberships`, 167 total records are resolved and inserted out of 168 non-empty matrix cells.

5. **Software Subscription Type Data Drift**:
   - In `worker_m3_1/handoff.md` lines 119 & 170–172, the worker claimed:
     `free: 68, freemium: 12, paid: 45 (Total: 125)`
   - Actual database count:
     `free: 124, paid: 1 (Accurate), freemium: 0`
   - In source spreadsheet `List of Softwares_Tools_Applications.xlsx`, sheet `List of Applications` has null `Subscription Type` for all 125 rows; sheet `Drop Down` has `Free` for 7-Zip, `Paid` for Accurate, and null for all remaining 124 rows. Defaulting null to `free` creates 124 free and 1 paid. The worker copied numbers from the synthetic unit test fixture `tests/fixtures/spreadsheet-software.json` without verifying the real spreadsheet.

6. **Idempotency and Security Verification (Robust Areas)**:
   - Repeated execution of `tsx scripts/import-spreadsheets.ts` (run 2 and run 3) resulted in:
     - 0 duplicate records in `account_domains`, `group_memberships`, `device_assignments`, and `device_credentials`.
     - 0 database constraint violations or errors.
   - Cryptographic verification via decryption harness `tests/adversarial-stress-ingestion.mjs`:
     - 28 of 30 credentials contain valid AES-256-GCM encrypted hashes (`iv:authTag:ciphertext`) and decrypt 100% cleanly to their plain-text source values.
     - 2 credentials (`LGI-CD-2022-020` and `LGI-CD-2022-022`) have `pin_hash: null`, matching the empty cells in the `Access Login` sheet for reserve laptops.
     - Zero plain-text PIN leaks exist in PostgreSQL.
   - Pure-TS ZIP+XML parser vs SheetJS comparison:
     - Both engines extract identical row counts (42 accounts, 39 groups, 31 laptops, 31 logins, 125 apps, 126 drop-down rows) across all 3 workbooks.

---

## 2. Logic Chain

1. **Acceptance Invariant Check (Step 1 -> Observation 1)**:
   - Contract requirement: 42 accounts = 40 personal, 1 service (`sales@leadgeeksinc.com`), 1 shared (`admin@leadgeeksinc.co`).
   - Line 665 of `scripts/import-spreadsheets.ts` contains `|| roleRaw === 'Commercial'`.
   - In `List of User Account`, `amanda.s@leadgeeksinc.com` has `Email Type: "Commercial"`.
   - Therefore, Amanda Stevany is inserted as `account_type = 'service'`.
   - Conclusion: The database contains 39 personal, 2 service, 1 shared. The acceptance criterion is violated.

2. **Asset Assignment Check (Step 2 -> Observation 2)**:
   - Contract requirement: 26 active device assignments; status breakdown: 26 assigned, 2 available, 2 reserve, 1 decommissioned.
   - `matchPicToAccount` cannot match `"Nuri"`, `"Tya"`, or `"Kiki"` to their respective accounts (`Nur Rahman`, `Novia Mutiaraningtyas`, `Rizky Amalia`).
   - Devices `LGI-CD-2023-034`, `LGI-CD-2024-040`, and `LGI-CD-2025-052` default to `status = 'available'` and have their active assignments omitted.
   - Conclusion: The database contains 23 assigned devices (not 26) and 23 active assignments (not 26). The inventory model is inaccurate.

3. **Credential Integrity Check (Step 3 -> Observation 3)**:
   - Contract requirement: 31 device credentials.
   - The hardware spreadsheet has an asset numbering offset between sheets (`LGI-CD-2025-061` in hardware info vs `LGI-CD-2025-064` in access login).
   - Because `import-spreadsheets.ts` matches credentials strictly on `dev = deviceMapByAsset.get(assetNumber)` and drops unmatched rows, `LGI-CD-2025-061` receives no credential and `LGI-CD-2025-064` is discarded.
   - Conclusion: Only 30 credentials exist in PostgreSQL, violating the worker's claim of 31.

4. **Synthetic Test vs Real Ingestion Divergence (Step 4 -> Observation 5)**:
   - The existing test suite `tests/e2e/06-spreadsheet-ingestion.test.ts` only asserts on `tests/fixtures/spreadsheet-*.json`.
   - It does not execute `scripts/import-spreadsheets.ts` against the live PostgreSQL database or actual `.xlsx` files.
   - Therefore, the test suite showed 182/182 passing while the actual database had 3 defects.

---

## 3. Caveats

1. **Source Spreadsheet Errors**:
   The discrepancies in Defect 3 (asset `LGI-CD-2025-064` in `Access Login` vs `LGI-CD-2025-061` in `Laptop Information`) and Observation 4 (`amanda@leadgeeksinc.co` in `Google Group`) originate from inconsistencies in the source `.xlsx` files provided by the client. The ingestion code must either handle these mappings explicitly with fallback normalization or log an explicit data quality warning.
2. **Review-Only Constraint**:
   Per the agent's constraints, no fixes were made to `scripts/import-spreadsheets.ts`. The implementation remains untouched.

---

## 4. Conclusion

**VERDICT**: `REPORT_DEFECT`

The Spreadsheet Ingestion Engine in `scripts/import-spreadsheets.ts` cannot be certified as correct in its current state due to 2 high-severity defects and 1 medium-severity defect:

1. **DEFECT-1 (High)**: `amanda.s@leadgeeksinc.com` is misclassified as `service` instead of `personal`, leaving 39 personal / 2 service accounts instead of the required 40 / 1.
2. **DEFECT-2 (High)**: PIC matching fails for `Nuri`, `Tya`, and `Kiki`, causing 3 active laptops to be misclassified as `available` without assignment records (23 assigned instead of 26).
3. **DEFECT-3 (Medium)**: Device `LGI-CD-2025-061` is missing credentials, resulting in 30 total credentials instead of 31.

### Recommended Remediation for Worker

1. **Fix Account Classification (`scripts/import-spreadsheets.ts` line 665)**:
   ```typescript
   // Restrict service classification strictly to the designated service email
   let accountType: 'personal' | 'service' | 'shared' = 'personal';
   if (email === 'sales@leadgeeksinc.com') {
     accountType = 'service';
   } else if (email === 'admin@leadgeeksinc.co') {
     accountType = 'shared';
   }
   ```
2. **Expand `matchPicToAccount` Nickname / Email Prefix Map (`scripts/import-spreadsheets.ts` line 81)**:
   ```typescript
   const PIC_ALIASES: Record<string, string> = {
     nuri: 'nur.r@leadgeeksinc.co',
     tya: 'tya.n@leadgeeksinc.com',
     kiki: 'rizky.a@leadgeeksinc.com',
   };
   ```
   Resolve against account email when an alias matches, ensuring all 26 laptops are assigned.
3. **Handle Access Login Asset Erratum (`scripts/import-spreadsheets.ts` line 1051)**:
   Map `LGI-CD-2025-062` in `Access Login` (row 26, PIC Ziqma) to `LGI-CD-2025-061` (Ziqma's laptop in `Laptop Information`), and `LGI-CD-2025-064` (row 27, PIC N/A) to `LGI-CD-2025-062` (Theodora's laptop), or provide a fallback credential for `LGI-CD-2025-061`.
4. **Map Google Group Typo (`scripts/import-spreadsheets.ts` line 815)**:
   Normalize `amanda@leadgeeksinc.co` to `amanda@leadgeeksinc.com` during group member resolution.

---

## 5. Verification Method

To independently verify these findings on the live database and source spreadsheets:

1. **Execute Empirical Adversarial Harness**:
   ```bash
   npx tsx tests/adversarial-stress-ingestion.mjs
   ```
   Expected output:
   - `Account type breakdown in DB: { personal: 39, service: 2, shared: 1 }` (Fails 40/1/1 requirement)
   - `Device status breakdown in DB: { decommissioned: 1, reserve: 2, available: 5, assigned: 23 }` (Fails 26 assigned requirement)
   - `Device credentials in DB: 30` (Fails 31 requirement)

2. **Direct SQL Verification**:
   ```sql
   -- 1. Check account classification
   SELECT account_type, count(*) FROM accounts GROUP BY account_type;
   -- Shows: personal: 39, service: 2, shared: 1

   -- 2. Check assigned device count
   SELECT status, count(*) FROM devices GROUP BY status;
   -- Shows: assigned: 23, available: 5, reserve: 2, decommissioned: 1

   -- 3. Check credentials count
   SELECT count(*) FROM device_credentials;
   -- Shows: 30
   ```

3. **Invalidation Conditions**:
   This defect report is invalidated only if:
   - Running `scripts/import-spreadsheets.ts` produces `personal: 40, service: 1, shared: 1` in `accounts`.
   - Running `scripts/import-spreadsheets.ts` produces `assigned: 26, available: 2, reserve: 2, decommissioned: 1` in `devices` and 26 rows in `device_assignments`.
   - All 31 devices have an associated record in `device_credentials`.
