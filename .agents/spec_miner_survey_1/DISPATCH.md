## 2026-09-08T17:16:40Z

You are a teamwork_preview_spec_miner.
Your working directory is: ./.agents/spec_miner_survey_1
Your parent conversation ID is: 2a2e0c6b-97bf-45c3-8284-e57d986edeac

MANDATORY: Read ./ORIGINAL_REQUEST.md before starting work. Do NOT skip reading this file.

Your mission in Phase 0 Survey:
Investigate the authoritative sources of truth regarding the Data Model, Database Architecture, and Spreadsheet Ingestion for CORE (Company Operations, Resources & Environment).

Review and probe:
1. ./DATA_MODEL.md
2. ./ARCHITECTURE.md
3. ./docs/data/spreadsheet-mapping.md
4. ./docs/domains/
5. ./docs/adr/
6. Source spreadsheets in ./data/sheets/:
   - ./data/sheets/List of Accounts and Google Group Management.xlsx
   - ./data/sheets/List of Company Hardware Devices (Laptop).xlsx
   - ./data/sheets/List of Softwares_Tools_Applications.xlsx

Document thoroughly:
- The complete schema of all 12 tables + audit_events table: column names, types, constraints (PK, FK, unique, checks, nullability, defaults).
- Reference seed data: 8 departments, 5 account roles, 3 domains with exact values.
- Spreadsheet ingestion logic:
  - Exact sheets, columns, and mappings to CORE tables.
  - Data normalization rules (e.g. department name mapping/normalization like "HRD" -> "Human Resource and Development", multi-domain accounts handling).
  - Device assignment logic: fuzzy PIC name matching between device spreadsheet and accounts.
  - Device credentials security: PIN encryption requirements (PINs must NOT be stored in plain text, encryption/hashing method, sensitivity rules per AGENTS.md).
  - Idempotency requirements (safe to run multiple times without duplicating records or corrupting foreign keys).
  - Target record counts: 42 accounts, 15 Google groups, 31 devices, 125 applications.

Write your findings to ./.agents/spec_miner_survey_1/handoff.md.
Maintain progress in ./.agents/spec_miner_survey_1/progress.md.
When finished, send a message to parent (ID: 2a2e0c6b-97bf-45c3-8284-e57d986edeac).
