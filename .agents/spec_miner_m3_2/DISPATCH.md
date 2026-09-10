# Task Dispatch: Spec Miner M3-2 (Hardware Devices & Software Ingestion)

## Identity
- Role: Specification Miner / Domain Analyst
- Working Directory: /home/noah/project/core/.agents/spec_miner_m3_2

## Objective
Analyze the exact requirements, mappings, and source data for importing Hardware Devices (Laptops) and Software Applications from `/home/noah/Documents/sheets/List of Company Hardware Devices (Laptop).xlsx` and `/home/noah/Documents/sheets/List of Softwares_Tools_Applications.xlsx` into CORE's database.

## Inputs to Read
- /home/noah/project/core/.agents/ORIGINAL_REQUEST.md
- /home/noah/project/core/.agents/orchestrator_2/PROJECT.md
- /home/noah/project/core/docs/data/spreadsheet-mapping.md
- /home/noah/project/core/docs/domains/assets.md
- /home/noah/project/core/docs/domains/software.md
- /home/noah/project/core/DATA_MODEL.md
- /home/noah/project/core/docs/adr/0004-device-credentials-storage.md
- /home/noah/project/core/src/lib/db/schema.ts
- /home/noah/project/core/src/lib/crypto/cipher.ts
- Source file 1: `/home/noah/Documents/sheets/List of Company Hardware Devices (Laptop).xlsx`
- Source file 2: `/home/noah/Documents/sheets/List of Softwares_Tools_Applications.xlsx`

## Investigation Scope
1. Hardware Devices mapping: 31 devices, columns, status values (ASSIGNED, AVAILABLE, SPARE, REPAIR, DECOMMISSIONED).
2. Hardware Specifications mapping: 1:1 specs (brand, model, serial_number, processor, ram_gb, storage, os, etc.).
3. Fuzzy PIC matching logic: How PIC names in the sheet map to accounts (e.g. name variations, nicknames, special cases like "Available", "Reserve", etc.).
4. Device Credentials & PIN encryption: Ingestion of PINs/passwords into `device_credentials` using AES-256-GCM cipher via `src/lib/crypto/cipher.ts`. Verification that plain text is NEVER stored.
5. Software Applications mapping: 125 applications, tabs (including Drop Down sheet for subscription enrichment), category, department canonicalization, subscription type, status.
6. Idempotency strategy: unique keys (`devices.asset_number`, `device_specifications.device_id`, `device_credentials.device_id`, `applications.name`).
7. Any edge cases, missing data, or discrepancies in the sheets.

## Output Requirements
Write a comprehensive report to `/home/noah/project/core/.agents/spec_miner_m3_2/handoff.md`.
Report back when finished.

## 2026-09-08T18:36:19Z
You are spec_miner_m3_2. Your working directory is /home/noah/project/core/.agents/spec_miner_m3_2.
Read your task assignment in /home/noah/project/core/.agents/spec_miner_m3_2/DISPATCH.md.
MANDATORY: Read /home/noah/project/core/.agents/ORIGINAL_REQUEST.md before starting work.
Mine the exact specifications, device specs mapping, fuzzy PIC matching rules, encrypted credential requirements (AES-256-GCM, never plain text), and software application mappings (including Drop Down sheet enrichment) from docs/data/spreadsheet-mapping.md, docs/domains/assets.md, docs/domains/software.md, and source sheets /home/noah/Documents/sheets/List of Company Hardware Devices (Laptop).xlsx and /home/noah/Documents/sheets/List of Softwares_Tools_Applications.xlsx.
Write your complete analysis to /home/noah/project/core/.agents/spec_miner_m3_2/handoff.md and report back when finished.

