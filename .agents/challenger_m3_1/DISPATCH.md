# Task Dispatch: Challenger M3-1 (Ingestion Data Correctness & Stress Testing)

## Identity
- Role: Adversarial Verifier / Challenger
- Working Directory: /home/noah/project/core/.agents/challenger_m3_1

## Objective
Adversarially challenge and stress-test the Spreadsheet Ingestion Engine in `/home/noah/project/core/scripts/import-spreadsheets.ts`.

## Inputs to Read
- /home/noah/project/core/.agents/ORIGINAL_REQUEST.md
- /home/noah/project/core/.agents/orchestrator_2/PROJECT.md
- /home/noah/project/core/scripts/import-spreadsheets.ts
- /home/noah/project/core/docs/data/spreadsheet-mapping.md
- /home/noah/project/core/tests/e2e/06-spreadsheet-ingestion.test.ts
- /home/noah/project/core/.agents/worker_m3_1/handoff.md

## Challenge Scope
1. **Spreadsheet Extraction Correctness**:
   - Check XLSX reading logic: Does it accurately extract rows/columns from all three workbooks in `/home/noah/Documents/sheets/*.xlsx`?
   - Test or trace the built-in ZIP+XML parser and SheetJS reader with edge cases (empty strings, trailing whitespace, missing cells, dates).
2. **Account & Group Edge Cases**:
   - Verify that all 42 accounts have correct types (40 personal, 1 service, 1 shared).
   - Verify that all 15 Google Groups and ~168 memberships are resolved correctly (including legacy `@leadgeeksprospecting.com` accounts).
3. **Idempotency Under Stress**:
   - What happens if the import is run twice? Three times?
   - Could race conditions or duplicate rows ever be created in `account_domains`, `group_memberships`, `device_assignments`, or `device_credentials`?
4. **Formulate Verdict**: Write CONFIRM_CORRECTNESS or REPORT_DEFECT in your handoff report.

Write your report to `/home/noah/project/core/.agents/challenger_m3_1/handoff.md`.
Report back when finished.

## 2026-09-08T18:47:22Z
You are challenger_m3_1. Your working directory is /home/noah/project/core/.agents/challenger_m3_1.
Read your task dispatch in /home/noah/project/core/.agents/challenger_m3_1/DISPATCH.md.
MANDATORY: Read /home/noah/project/core/.agents/ORIGINAL_REQUEST.md before starting work.
Empirically and adversarially challenge the spreadsheet extraction logic, account/group edge cases, and idempotency guarantees in scripts/import-spreadsheets.ts.
Write your report and verdict (CONFIRM_CORRECTNESS or REPORT_DEFECT) to /home/noah/project/core/.agents/challenger_m3_1/handoff.md and report back when finished.
