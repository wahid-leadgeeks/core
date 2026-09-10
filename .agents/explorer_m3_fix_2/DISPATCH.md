# Task Dispatch: Explorer M3-Fix-2 (Assets, Assignments & Credentials Remediation Strategy)

## Identity
- Role: Remediation Explorer (Assets, Assignments & Credentials)
- Working Directory: /home/noah/project/core/.agents/explorer_m3_fix_2

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
1. **Fuzzy PIC Nickname Matching**:
   - `Nuri` -> Nur Rahman (`nur.r@leadgeeksinc.co`, full name "Nur Kurnia Rahman").
   - `Tya` -> Novia Mutiaraningtyas (`tya.n@leadgeeksinc.com`, former "tya@leadgeeksprospecting.com").
   - `Kiki` -> Rizky Amalia (`rizky.a@leadgeeksinc.com`, full name "Rizky Amalia Safitri").
   - Currently, these 3 active employee laptops are misclassified as `available` instead of `assigned`, leaving 23 active assignments instead of 26.
   - Formulate exact matching expansion in `matchPicToAccount` (email prefix tokens, alias mapping, previous email prefixes).
2. **Access Login Asset Erratum Reconciliation**:
   - In `List of Company Hardware Devices (Laptop).xlsx`, rows 26-27 have asset numbers `LGI-CD-2025-062` and `064` for computer names `LeadGeeks-026` (Ziqma) and `LeadGeeks-027` (Theodora).
   - Because of matching strictly on `Asset No`, `LGI-CD-2025-061` receives no credential (leaving 30 credentials instead of 31) and Theodora receives Ziqma's PIN (`636597`).
   - Formulate dual-key reconciliation using `Computer Name` (e.g. `LeadGeeks-026` -> `LGI-CD-2025-061`, `LeadGeeks-027` -> `LGI-CD-2025-062`).
3. **Secondary Custodian Guard Fix**:
   - Line 983 gates on `if (dev.status === 'assigned' && match1.accountId)`, blocking all 5 devices that have a `PIC 2 Name` (where PIC 1 is N/A or reserve or decommissioned).
   - Formulate exact fix to record secondary custodian assignments (`custodian_id`).
4. Formulate the exact fix strategy and write your report to `/home/noah/project/core/.agents/explorer_m3_fix_2/handoff.md`.
Do NOT implement code directly; recommend the exact fix strategy for the worker.

## 2026-09-08T18:56:04Z
You are explorer_m3_fix_2. Your working directory is /home/noah/project/core/.agents/explorer_m3_fix_2.
Read your task dispatch in /home/noah/project/core/.agents/explorer_m3_fix_2/DISPATCH.md.
MANDATORY: Read /home/noah/project/core/.agents/ORIGINAL_REQUEST.md before starting work.
MANDATORY FORENSIC AUDIT EVIDENCE: The Milestone 3 Gate failed with INTEGRITY VIOLATION from auditor_m3_1. You MUST read the full audit report in /home/noah/project/core/.agents/auditor_m3_1/handoff.md and reviewer_m3_2/handoff.md.
Formulate the exact fix strategy for fuzzy PIC nicknames (Nuri, Tya, Kiki -> assigned laptops, 26 active assignments), Access Login asset erratum dual-key reconciliation (Computer Name LeadGeeks-026 -> LGI-CD-2025-061 Ziqma, LeadGeeks-027 -> LGI-CD-2025-062 Theodora, achieving 31 credentials), and secondary custodian status guard fix.
Write your report to /home/noah/project/core/.agents/explorer_m3_fix_2/handoff.md and report back when finished.
