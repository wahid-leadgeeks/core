# Dispatch: Worker Final Verify (Final Build, Full Test Suite & Dev Server Certification)

## Working Directory
`/home/noah/project/core/.agents/worker_final_verify/`

## Mandatory Documents to Read First
- `/home/noah/project/core/.agents/ORIGINAL_REQUEST.md` (MANDATORY — read first)
- `/home/noah/project/core/.agents/orchestrator_3/PROJECT.md`
- `/home/noah/project/core/TEST_READY.md`
- `/home/noah/project/core/.agents/worker_m4_fix_2/handoff.md`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Verification Tasks
1. **Execute Full E2E Test Suite**:
   Run `npm test` or `node tests/runner.mjs`.
   Verify all 180 tests across all 7 suites and all 4 tiers pass with exit code 0:
   - Suite 01: Database Schema, Constraints & Reference Seed (26/26)
   - Suite 02: Auth, Route Guard & Sessions (22/22)
   - Suite 03: RBAC Enforcement for 5 roles (28/28)
   - Suite 04: Immutable Audit Logging & Sensitive Actions (24/24)
   - Suite 05: Credential Encryption (AES-256-GCM) & Reveal (22/22)
   - Suite 06: Spreadsheet Ingestion & Idempotency (30/30)
   - Suite 07: Domain CRUD Routes, Membership Matrix & UI Contracts (28/28)
   Record verbatim test summary in `handoff.md`.

2. **Execute Production Build Verification**:
   Run `npm run build`.
   Verify that Next.js App Router compiles with exit code 0, 0 TypeScript errors, 0 ESLint errors, and all 19 routes generated.
   Record verbatim build log in `handoff.md`.

3. **Verify Dev Server**:
   Start dev server (`npm run dev`) or test route readiness via HTTP fetch to verify that pages boot cleanly.

Write your handoff report to `/home/noah/project/core/.agents/worker_final_verify/handoff.md` and report back via `send_message`.

## 2026-09-09T00:08:48Z
You are worker_final_verify. Your working directory is: /home/noah/project/core/.agents/worker_final_verify.
Read /home/noah/project/core/.agents/worker_final_verify/DISPATCH.md and /home/noah/project/core/.agents/ORIGINAL_REQUEST.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Tasks:
1. Run full E2E test suite (node tests/runner.mjs or npm test) verifying 180/180 tests pass across all 7 suites and 4 tiers with exit code 0.
2. Run production build (npm run build) verifying exit code 0 with 0 TypeScript and 0 ESLint errors.
3. Test dev server boot (npm run dev) ensuring all pages serve cleanly.

Write your handoff report to /home/noah/project/core/.agents/worker_final_verify/handoff.md and report back via send_message with verbatim outputs.

