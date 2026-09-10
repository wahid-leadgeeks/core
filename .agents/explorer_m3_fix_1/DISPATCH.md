# Task Dispatch: Explorer M3-Fix-1 (Identity & Groups Remediation Strategy)

## Identity
- Role: Remediation Explorer (Identity & Groups)
- Working Directory: /home/noah/project/core/.agents/explorer_m3_fix_1

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
1. **Account Type Condition**:
   - Current bug in line 665: `if (email === 'sales@leadgeeksinc.com' || roleRaw === 'Commercial')` classifies Amanda Stevany (`amanda.s@leadgeeksinc.com`) as `service`, resulting in 39 personal / 2 service accounts.
   - Formulate exact code fix so that ONLY `sales@leadgeeksinc.com` is `service`, `admin@leadgeeksinc.co` is `shared`, and the remaining 40 accounts are `personal` (exact 40 personal, 1 service, 1 shared).
2. **Google Group Member Resolution**:
   - Current bug in lines 809–842 drops `amanda@leadgeeksinc.co` in `Operations Calendar Team` (`operations.calendar@leadgeeksinc.co`), resulting in 26 members instead of 27 and 167 total memberships instead of 168.
   - Formulate cross-domain `.co` ↔ `.com` alias resolution and newline-separated `previous_email` parsing.
3. Formulate the exact fix strategy and write your report to `/home/noah/project/core/.agents/explorer_m3_fix_1/handoff.md`.
Do NOT implement code directly; recommend the exact fix strategy for the worker.

## 2026-09-08T18:56:04Z
You are explorer_m3_fix_1. Your working directory is /home/noah/project/core/.agents/explorer_m3_fix_1.
Read your task dispatch in /home/noah/project/core/.agents/explorer_m3_fix_1/DISPATCH.md.
MANDATORY: Read /home/noah/project/core/.agents/ORIGINAL_REQUEST.md before starting work.
MANDATORY FORENSIC AUDIT EVIDENCE: The Milestone 3 Gate failed with INTEGRITY VIOLATION from auditor_m3_1. You MUST read the full audit report in /home/noah/project/core/.agents/auditor_m3_1/handoff.md and reviewer_m3_1/handoff.md.
Formulate the exact fix strategy for the Account Type condition (only sales@leadgeeksinc.com is service; Amanda Stevany must be personal, achieving 40 personal, 1 service, 1 shared) and Google Groups member resolution (cross-domain .co ↔ .com alias resolution and multiline previous_email parsing, achieving 27 members in Operations Calendar Team and 168 total memberships).
Write your report to /home/noah/project/core/.agents/explorer_m3_fix_1/handoff.md and report back when finished.
