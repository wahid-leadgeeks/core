# Task Dispatch: Worker M3-1 (Spreadsheet Ingestion Engine Implementation)

## Identity
- Role: Implementation Worker
- Working Directory: /home/noah/project/core/.agents/worker_m3_1

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Implement the complete, production-quality Spreadsheet Ingestion Engine for Milestone 3 per `ORIGINAL_REQUEST.md`, `docs/data/spreadsheet-mapping.md`, and the exploration reports in `.agents/spec_miner_m3_1/handoff.md`, `.agents/spec_miner_m3_2/handoff.md`, and `.agents/explorer_m3_1/handoff.md`.

## Inputs to Read
- /home/noah/project/core/.agents/ORIGINAL_REQUEST.md
- /home/noah/project/core/.agents/orchestrator_2/PROJECT.md
- /home/noah/project/core/.agents/spec_miner_m3_1/handoff.md
- /home/noah/project/core/.agents/spec_miner_m3_2/handoff.md
- /home/noah/project/core/.agents/explorer_m3_1/handoff.md
- /home/noah/project/core/docs/data/spreadsheet-mapping.md
- /home/noah/project/core/src/lib/crypto/cipher.ts
- /home/noah/project/core/src/lib/db/
- /home/noah/project/core/scripts/seed-reference.ts

## Implementation Scope
1. **Dependency Installation**:
   - Install `xlsx` (`npm install xlsx`).
   - Add `"db:import": "tsx scripts/import-spreadsheets.ts"` to `package.json`.

2. **Pipeline Implementation in `scripts/import-spreadsheets.ts`**:
   - Read 3 workbooks from `/home/noah/Documents/sheets/*.xlsx`:
     - `List of Accounts and Google Group Management.xlsx`
     - `List of Company Hardware Devices (Laptop).xlsx`
     - `List of Softwares_Tools_Applications.xlsx`
   - Execute a 10-step atomic transaction pipeline:
     - **Step 1**: Reference Seed (call `seedReferenceData(tx)` to ensure 8 departments, 5 roles, 3 domains exist).
     - **Step 2**: Accounts Ingestion:
       - 42 accounts with full_name, display_name, email, previous_email, department_id (normalized via `DEPARTMENT_NORMALIZATION_MAP`), account_role_id, notes, migration_notes.
       - Account type: 40 `personal`, 1 `service` (`sales@leadgeeksinc.com`), 1 `shared` (`admin@leadgeeksinc.co`).
       - `ON CONFLICT (email) DO UPDATE`.
     - **Step 3**: Account Domains Ingestion:
       - Split comma-separated `Domain` string, trim, resolve to `domain_id`.
       - Insert into `account_domains` (`ON CONFLICT DO NOTHING`).
     - **Step 4**: Google Groups Ingestion:
       - Note column-oriented structure: Row 1 = group name, Row 2 = group email.
       - 15 groups, set `sync_status = 'pending'`, `ON CONFLICT (email) DO UPDATE`.
     - **Step 5**: Group Memberships Ingestion:
       - Traverse Rows 3+ for each group column.
       - Two-tier email resolution: match `memberEmail` to `accounts.email`, fallback to `accounts.previous_email` to resolve legacy `@leadgeeksprospecting.com` accounts.
       - Insert into `group_memberships` with `role = 'member'`, `source = 'spreadsheet'`.
       - Update `google_groups.member_count` with distinct resolved members count (~168 memberships).
     - **Step 6**: Hardware Devices Ingestion:
       - 31 devices from `Laptop Information`.
       - Asset number (unique), brand (e.g. LENOVO, MSI, ASUS), model, computer_name, purchased_at, has_antivirus (boolean), notes.
       - Status logic: if picName contains "cadangan" -> `reserve` (2 devices); if "Akan dijual"/"rusak" -> `decommissioned` (1 device); if "N/A" or empty -> `available` (2 devices); otherwise -> `assigned` (26 devices).
       - `ON CONFLICT (asset_number) DO UPDATE`.
     - **Step 7**: Hardware Specifications Ingestion:
       - 31 specs linked 1:1 to `devices.id` with processor, ram, storage (`ROM` column).
       - `ON CONFLICT (device_id) DO UPDATE`.
     - **Step 8**: Device Assignments Ingestion:
       - For 26 assigned devices, match `picName` to `account_id` using 3-tier fuzzy matching (`matchPicToAccount`).
       - If `pic2Name` present (e.g. Fajri for Adit's laptop), match to `custodian_id`.
       - Check existing active assignment (`WHERE device_id = dev.id AND returned_at IS NULL`); update if exists, insert if new.
     - **Step 9**: Device Credentials Ingestion:
       - 31 credentials from `Access Login` sheet.
       - Match asset number to `devices.id`.
       - Login email and PIN password.
       - **CRITICAL**: Encrypt PIN with AES-256-GCM via `encryptPin(pin)` from `src/lib/crypto/cipher.ts`. Plain text PIN must NEVER be stored!
       - Check existing credential (`WHERE device_id = dev.id`); update if exists, insert if new (since `device_credentials` lacks a DB unique constraint on `device_id`).
     - **Step 10**: Software Applications Ingestion:
       - 125 applications from `List of Applications`.
       - Canonicalize department via `DEPARTMENT_NORMALIZATION_MAP`.
       - Enrich `subscription_type` (`free`, `paid`, `freemium`) by looking up application name in `Drop Down` sheet.
       - `ON CONFLICT (name) DO UPDATE`.

3. **Verification**:
   - Run `npm run db:migrate`.
   - Run `npm run db:import`.
   - Re-run `npm run db:import` to verify idempotency (must produce identical counts with 0 errors).
   - Run `node tests/runner.mjs --suite=06` (all 30 tests must pass).
   - Run `node tests/runner.mjs --suite=05` (all 22 tests must pass).
   - Run `npm test` (all test suites must pass).
   - Verify zero plain-text PIN leaks in database.

## Output Requirements
Write a complete handoff report to `/home/noah/project/core/.agents/worker_m3_1/handoff.md`.
Document the build and test results and layout compliance.
Report back when finished.

## 2026-09-08T18:40:37Z
Implement the full Spreadsheet Ingestion Engine in scripts/import-spreadsheets.ts per the detailed specification reports in /home/noah/project/core/.agents/spec_miner_m3_1/handoff.md, /home/noah/project/core/.agents/spec_miner_m3_2/handoff.md, and /home/noah/project/core/.agents/explorer_m3_1/handoff.md.
Install xlsx, add db:import script to package.json, run db:migrate and db:import, verify idempotency with a second run, run test suite 06, test suite 05, and npm test.
Write your complete handoff report with build/test outputs to /home/noah/project/core/.agents/worker_m3_1/handoff.md and report back when finished.
