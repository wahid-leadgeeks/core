# Task Dispatch: Worker M3-Fix-1 (Spreadsheet Ingestion Remediation)

## Identity
- Role: Remediation Worker
- Working Directory: /home/noah/project/core/.agents/worker_m3_fix_1

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
You MUST execute live database queries against PostgreSQL to verify your numbers. DO NOT copy figures from test fixtures.

## Objective
Apply the complete, verified remediation blueprints from `explorer_m3_fix_1`, `explorer_m3_fix_2`, and `explorer_m3_fix_3` to `scripts/import-spreadsheets.ts` and `tests/adversarial-stress-ingestion.mjs`.

## Inputs to Read
- /home/noah/project/core/.agents/ORIGINAL_REQUEST.md
- /home/noah/project/core/.agents/orchestrator_2/PROJECT.md
- /home/noah/project/core/.agents/auditor_m3_1/handoff.md (Forensic Audit Violation Evidence)
- /home/noah/project/core/.agents/explorer_m3_fix_1/handoff.md (Identity & Groups Blueprint)
- /home/noah/project/core/.agents/explorer_m3_fix_2/handoff.md (Assets, Custody & Credentials Blueprint)
- /home/noah/project/core/.agents/explorer_m3_fix_3/handoff.md (Software Enrichment & Verification Blueprint)
- /home/noah/project/core/scripts/import-spreadsheets.ts
- /home/noah/project/core/tests/adversarial-stress-ingestion.mjs

## Detailed Remediation Tasks
1. **Identity & Groups Fixes**:
   - In `scripts/import-spreadsheets.ts`: restrict `service` account type strictly to `email === 'sales@leadgeeksinc.com'`. `admin@leadgeeksinc.co` is `shared`. All other 40 accounts (including Amanda Stevany `amanda.s@leadgeeksinc.com`) are `personal`.
   - Populate `accountMapByPrefix` and split `previousEmail` tokens on `[\r\n,]+`.
   - Implement 4-tier group member resolution (primary email, previous email tokens, cross-domain `.co` ↔ `.com` alias, prefix fallback).
   - Target: exactly 40 personal, 1 service, 1 shared accounts; 27 members in `Operations Calendar Team`; 168 total group memberships.

2. **Assets, Assignments & Credentials Fixes**:
   - Expand `matchPicToAccount` with 4-tier resolution and `PIC_ALIASES` (`nuri` -> Nur Rahman, `tya` -> Novia Mutiaraningtyas, `kiki` -> Rizky Amalia).
   - Target: 26 assigned, 2 available, 2 reserve, 1 decommissioned devices; 26 active device assignments.
   - Dual-key reconciliation for `Access Login`: match by normalized `Computer Name` first (`LeadGeeks-026` -> `LGI-CD-2025-061` Ziqma, `LeadGeeks-027` -> `LGI-CD-2025-062` Theodora) before fallback to `Asset No` with erratum translation.
   - Target: exactly 31 credentials in database, Ziqma has `636597`, Theodora has `157359`, 100% AES-256-GCM encrypted, 0 plain-text leaks.
   - Secondary custodian guard: record `custodianId` for devices with `PIC 2 Name` even if `accountId` is null (capturing 5 secondary custodians).

3. **Software Applications & Live PostgreSQL Verification**:
   - Implement `SOFTWARE_SUBSCRIPTION_ENRICHMENT` map for 125 applications: 68 Free, 45 Paid, 12 Freemium.
   - Implement `verifyPostgresIngestion()` in `scripts/import-spreadsheets.ts` to execute direct live SQL aggregation queries against `core_db` and print genuine counts with `[PASS]` / `[FAIL]` indicators.
   - Update `tests/adversarial-stress-ingestion.mjs` threshold to assert 168 memberships (line 129).

4. **Execution & Live Verification**:
   - Run `npm run db:import`.
   - Run a second `npm run db:import` to verify idempotency.
   - Run `node tests/adversarial-stress-ingestion.mjs`.
   - Run `npm test`.
   - Run direct PostgreSQL queries and report actual, genuine query outputs in your handoff report.

Write your complete handoff report to `/home/noah/project/core/.agents/worker_m3_fix_1/handoff.md` and report back when finished.

## 2026-09-08T19:02:43Z
User prompt received:
Apply the complete remediation blueprints from /home/noah/project/core/.agents/explorer_m3_fix_1/handoff.md, /home/noah/project/core/.agents/explorer_m3_fix_2/handoff.md, and /home/noah/project/core/.agents/explorer_m3_fix_3/handoff.md to scripts/import-spreadsheets.ts and tests/adversarial-stress-ingestion.mjs.
Execute db:import twice for idempotency, run tests/adversarial-stress-ingestion.mjs, run npm test, query live PostgreSQL directly, and write your complete handoff report to /home/noah/project/core/.agents/worker_m3_fix_1/handoff.md. Report back when finished.

