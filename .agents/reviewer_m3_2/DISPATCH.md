# Task Dispatch: Reviewer M3-2 (Devices, Credentials & Software Code Review)

## Identity
- Role: Code Reviewer (Assets, Security & Software Focus)
- Working Directory: /home/noah/project/core/.agents/reviewer_m3_2

## Objective
Review the implementation in `/home/noah/project/core/scripts/import-spreadsheets.ts` with specific focus on Hardware Devices, Specifications, Assignments (fuzzy PIC matching), Device Credentials (AES-256-GCM encryption), and Software Applications.

## Inputs to Read
- /home/noah/project/core/.agents/ORIGINAL_REQUEST.md
- /home/noah/project/core/.agents/orchestrator_2/PROJECT.md
- /home/noah/project/core/scripts/import-spreadsheets.ts
- /home/noah/project/core/src/lib/crypto/cipher.ts
- /home/noah/project/core/docs/data/spreadsheet-mapping.md
- /home/noah/project/core/docs/domains/assets.md
- /home/noah/project/core/docs/domains/access.md
- /home/noah/project/core/docs/domains/software.md
- /home/noah/project/core/.agents/worker_m3_1/handoff.md

## Review Checklist
1. **Hardware Devices**: Are 31 devices parsed with brand decomposition (first whitespace token), computer name, purchased date, antivirus boolean, and status (26 assigned, 2 reserve, 2 available, 1 decommissioned)?
2. **Device Specifications**: 1:1 linked specs for all 31 devices (processor, ram, storage)?
3. **Device Assignments**: Is 3-tier fuzzy matching used? Is secondary custodian (`custodian_id` e.g. Fajri) properly handled?
4. **Device Credentials Encryption**: Is `encryptPin` from `src/lib/crypto/cipher.ts` called on EVERY plain text PIN? Is the output validated as AES-256-GCM (`iv:authTag:ciphertext`)? Are plain-text PINs ever stored in PostgreSQL?
5. **Idempotency Workaround**: Because `device_assignments` and `device_credentials` lack DB-level unique constraints on `device_id`, does the code safely handle upsert via programmatic check (or delete-insert)?
6. **Software Applications**: Are 125 applications parsed across 8 departments? Is `Drop Down` reference catalog used to enrich subscription type (`free: 68`, `paid: 45`, `freemium: 12`)?
7. **Formulate Verdict**: Write APPROVE or REQUEST_CHANGES in your handoff report.

Write your report to `/home/noah/project/core/.agents/reviewer_m3_2/handoff.md`.
Report back when finished.

## 2026-09-08T18:47:22Z
You are reviewer_m3_2. Your working directory is /home/noah/project/core/.agents/reviewer_m3_2.
Read your task dispatch in /home/noah/project/core/.agents/reviewer_m3_2/DISPATCH.md.
MANDATORY: Read /home/noah/project/core/.agents/ORIGINAL_REQUEST.md before starting work.
Perform a thorough code review of scripts/import-spreadsheets.ts with focus on Hardware Devices, Specifications, Assignments (fuzzy PIC matching), Device Credentials (AES-256-GCM encryption), and Software Applications.
Write your review report and verdict (APPROVE or REQUEST_CHANGES) to /home/noah/project/core/.agents/reviewer_m3_2/handoff.md and report back when finished.
