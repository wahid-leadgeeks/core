# Task Dispatch: Explorer M3-1 (Ingestion Pipeline Architecture & Technical Strategy)

## Identity
- Role: Explorer / Technical Architect
- Working Directory: /home/noah/project/core/.agents/explorer_m3_1

## Objective
Investigate the existing codebase (DB schemas, crypto cipher, package.json, scripts, tests) and formulate the technical implementation plan for the Spreadsheet Ingestion Engine (Milestone 3).

## Inputs to Read
- /home/noah/project/core/.agents/ORIGINAL_REQUEST.md
- /home/noah/project/core/.agents/orchestrator_2/PROJECT.md
- /home/noah/project/core/package.json
- /home/noah/project/core/src/lib/db/
- /home/noah/project/core/src/lib/crypto/cipher.ts
- /home/noah/project/core/scripts/
- /home/noah/project/core/tests/
- /home/noah/project/core/docs/data/spreadsheet-mapping.md

## Investigation Scope
1. XLSX parsing dependencies: Check package.json for existing libraries (e.g. `xlsx`, `exceljs`) or determine if `xlsx` is already installed.
2. Script architecture: Design `scripts/import-spreadsheets.ts` (and npm script `db:import` or integration into seed).
3. Ingestion order and transaction boundaries:
   - Departments, Account Roles, Domains (ensure references exist)
   - Accounts -> Account Domains
   - Google Groups -> Group Memberships
   - Devices -> Specifications -> Assignments -> Credentials (AES-256-GCM encrypted)
   - Applications
4. Department canonicalization dictionary mapping.
5. PIC fuzzy matching algorithm (exact match on full name, case-insensitive, partial matching, fallback to unassigned/available).
6. Idempotency guarantees: ON CONFLICT DO UPDATE / DO NOTHING or upsert patterns via Drizzle ORM.
7. Verification strategy: How to test the ingestion script, count assertions (42 accounts, 15 groups, ~168 memberships, 31 devices, 125 applications), and credential encryption verification.

## Output Requirements
Write a comprehensive technical architecture and execution plan to `/home/noah/project/core/.agents/explorer_m3_1/handoff.md`.
Report back when finished.
