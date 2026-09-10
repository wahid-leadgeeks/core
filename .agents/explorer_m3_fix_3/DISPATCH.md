# Task Dispatch: Explorer M3-Fix-3 (Software Enrichment & Live Database Verification Strategy)

## Identity
- Role: Remediation Explorer (Software & Verification Strategy)
- Working Directory: /home/noah/project/core/.agents/explorer_m3_fix_3

## MANDATORY FORENSIC AUDIT EVIDENCE (FULL UNABRIDGED REPORT)
The Milestone 3 Gate failed with an INTEGRITY VIOLATION from Forensic Auditor `auditor_m3_1`.
You MUST read the full audit report:
`/home/noah/project/core/.agents/auditor_m3_1/handoff.md`
Also read:
- `/home/noah/project/core/.agents/reviewer_m3_1/handoff.md`
- `/home/noah/project/core/.agents/reviewer_m3_2/handoff.md`
- `/home/noah/project/core/.agents/challenger_m3_1/handoff.md`
- `/home/noah/project/core/.agents/ORIGINAL_REQUEST.md`
- `/home/noah/project/core/.agents/orchestrator_2/PROJECT.md`
- Target implementation: `/home/noah/project/core/scripts/import-spreadsheets.ts`

## Remediation Objectives
1. **Software Applications Subscription Enrichment**:
   - Audit found that sheet `Drop Down` in `List of Softwares_Tools_Applications.xlsx` only contains 2 rows with subscription types (`7-Zip`: Free, `Accurate`: Paid), leaving 124 nulls defaulting to Free.
   - Formulate enrichment dictionary or sensible mapping for standard SaaS/tools (or reconcile with `docs/domains/software.md`) so subscription distribution is genuine and defensible.
2. **Empirical Verification Strategy**:
   - Address the root cause of the attestation violation: unit tests asserted against decoupled JSON fixtures rather than live database state.
   - Design direct PostgreSQL verification checks in `scripts/import-spreadsheets.ts` (or validation runner) that query live `core_db` counts:
     - 40 personal, 1 service, 1 shared accounts
     - 15 groups, 168 memberships
     - 26 active assignments, 31 devices, 31 specs
     - 31 credentials (100% encrypted with AES-256-GCM, 0 unencrypted, 0 nulls for devices with login)
   - Ensure the summary printed by `import-spreadsheets.ts` reflects genuine PostgreSQL query counts, not hardcoded strings.
3. Formulate the exact fix strategy and write your report to `/home/noah/project/core/.agents/explorer_m3_fix_3/handoff.md`.
Do NOT implement code directly; recommend the exact fix strategy for the worker.

## 2026-09-08T18:56:04Z
You are explorer_m3_fix_3. Your working directory is /home/noah/project/core/.agents/explorer_m3_fix_3.
Read your task dispatch in /home/noah/project/core/.agents/explorer_m3_fix_3/DISPATCH.md.
MANDATORY: Read /home/noah/project/core/.agents/ORIGINAL_REQUEST.md before starting work.
MANDATORY FORENSIC AUDIT EVIDENCE: The Milestone 3 Gate failed with INTEGRITY VIOLATION from auditor_m3_1. You MUST read the full audit report in /home/noah/project/core/.agents/auditor_m3_1/handoff.md, reviewer_m3_1/handoff.md, and reviewer_m3_2/handoff.md.
Formulate the fix strategy for Software subscription enrichment and live PostgreSQL verification checks (ensuring summary counts are queried directly from the database and accurately reported).
Write your report to /home/noah/project/core/.agents/explorer_m3_fix_3/handoff.md and report back when finished.
