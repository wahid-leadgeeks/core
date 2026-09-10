# Task Dispatch: Spec Miner M3-1 (Accounts & Google Groups Ingestion)

## Identity
- Role: Specification Miner / Domain Analyst
- Working Directory: /home/noah/project/core/.agents/spec_miner_m3_1

## Objective
Analyze the exact requirements, mappings, and source data for importing Accounts and Google Groups from `/home/noah/Documents/sheets/List of Accounts and Google Group Management.xlsx` into CORE's database.

## Inputs to Read
- /home/noah/project/core/.agents/ORIGINAL_REQUEST.md
- /home/noah/project/core/.agents/orchestrator_2/PROJECT.md
- /home/noah/project/core/docs/data/spreadsheet-mapping.md
- /home/noah/project/core/docs/domains/identity.md
- /home/noah/project/core/docs/domains/groups.md
- /home/noah/project/core/DATA_MODEL.md
- /home/noah/project/core/src/lib/db/schema.ts
- Source file: `/home/noah/Documents/sheets/List of Accounts and Google Group Management.xlsx`

## Investigation Scope
1. Sheet structure and tabs of the Accounts and Google Groups spreadsheet.
2. Accounts mapping: column names, account type (Employee, Contractor, etc.), status, department normalization (e.g. abbreviations to full canonical names in `departments` table), role resolution against `account_roles`.
3. Multi-domain handling: parsing secondary domains (e.g. comma-separated) into `account_domains`.
4. Google Groups mapping: 15 groups, their email addresses, names, description, source.
5. Group Memberships mapping: how memberships are represented in the sheet, resolution of members to account IDs via primary email or secondary emails, role in group (MEMBER/OWNER/MANAGER).
6. Idempotency strategy: unique keys (`accounts.email`, `google_groups.email`, composite `(group_id, account_id)`).
7. Any edge cases, missing data, or discrepancies in the sheet.

## Output Requirements
Write a comprehensive report to `/home/noah/project/core/.agents/spec_miner_m3_1/handoff.md`.
Report back when finished.

## 2026-09-08T18:36:19Z
You are spec_miner_m3_1. Your working directory is /home/noah/project/core/.agents/spec_miner_m3_1.
Read your task assignment in /home/noah/project/core/.agents/spec_miner_m3_1/DISPATCH.md.
MANDATORY: Read /home/noah/project/core/.agents/ORIGINAL_REQUEST.md before starting work.
Mine the exact specifications, column mappings, department normalizations, multi-domain parsing, and membership resolutions from /home/noah/project/core/docs/data/spreadsheet-mapping.md, docs/domains/identity.md, docs/domains/groups.md, and the source spreadsheet /home/noah/Documents/sheets/List of Accounts and Google Group Management.xlsx.
Write your complete analysis to /home/noah/project/core/.agents/spec_miner_m3_1/handoff.md and report back when finished.

