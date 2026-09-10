# Task Dispatch: Reviewer M3-1 (Accounts & Google Groups Ingestion Code Review)

## Identity
- Role: Code Reviewer (Identity & Groups Focus)
- Working Directory: /home/noah/project/core/.agents/reviewer_m3_1

## Objective
Review the implementation in `/home/noah/project/core/scripts/import-spreadsheets.ts` with specific focus on Accounts, Account Domains, Department Normalization, Google Groups, and Group Memberships.

## Inputs to Read
- /home/noah/project/core/.agents/ORIGINAL_REQUEST.md
- /home/noah/project/core/.agents/orchestrator_2/PROJECT.md
- /home/noah/project/core/scripts/import-spreadsheets.ts
- /home/noah/project/core/docs/data/spreadsheet-mapping.md
- /home/noah/project/core/docs/domains/identity.md
- /home/noah/project/core/docs/domains/groups.md
- /home/noah/project/core/.agents/worker_m3_1/handoff.md

## Review Checklist
1. **Accounts Mapping**: Are all 42 accounts correctly parsed? Are account types mapped (40 personal, 1 service, 1 shared)?
2. **Department Normalization**: Does `DEPARTMENT_NORMALIZATION_MAP` properly map shorthand names ("HRD", "IT", "Management") to canonical reference departments? What happens on unrecognized department?
3. **Multi-Domain Parsing**: Does it split and trim comma-separated domains and insert into `account_domains`?
4. **Google Groups**: Does the column-oriented reader correctly extract 15 groups, their names and emails? Is `sync_status` set to 'pending'?
5. **Group Memberships**: Does the two-tier resolution resolve member emails against `accounts.email` and `accounts.previous_email` (for legacy `@leadgeeksprospecting.com`)? Is `member_count` updated?
6. **Idempotency**: Are `onConflictDoUpdate` / `onConflictDoNothing` applied properly?
7. **Formulate Verdict**: Write APPROVE or REQUEST_CHANGES in your handoff report.

Write your report to `/home/noah/project/core/.agents/reviewer_m3_1/handoff.md`.
Report back when finished.

## 2026-09-08T18:47:22Z
You are reviewer_m3_1. Your working directory is /home/noah/project/core/.agents/reviewer_m3_1.
Read your task dispatch in /home/noah/project/core/.agents/reviewer_m3_1/DISPATCH.md.
MANDATORY: Read /home/noah/project/core/.agents/ORIGINAL_REQUEST.md before starting work.
Perform a thorough code review of scripts/import-spreadsheets.ts with focus on Accounts, Account Domains, Department Normalization, Google Groups, and Group Memberships.
Write your review report and verdict (APPROVE or REQUEST_CHANGES) to /home/noah/project/core/.agents/reviewer_m3_1/handoff.md and report back when finished.
