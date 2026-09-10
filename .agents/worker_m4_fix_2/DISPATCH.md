# Dispatch: Worker M4 Fix 2 (Next.js 15 App Router Route Typing & Build Certification)

## Working Directory
`/home/noah/project/core/.agents/worker_m4_fix_2/`

## Mandatory Documents to Read First
- `/home/noah/project/core/.agents/ORIGINAL_REQUEST.md` (MANDATORY — read first)
- `/home/noah/project/core/.agents/orchestrator_3/PROJECT.md`
- `/home/noah/project/core/.agents/reviewer_m4_fix_recheck/handoff.md` (Contains exact Next.js 15 route typing error)

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Tasks
1. **Fix Next.js 15 App Router Route Typing in all 4 dynamic API route handlers**:
   - `src/app/api/accounts/[id]/route.ts`
   - `src/app/api/groups/[id]/route.ts`
   - `src/app/api/assets/[id]/route.ts`
   - `src/app/api/software/[id]/route.ts`
   
   In each file, replace:
   `context: { params: Promise<{ id: string }> | { id: string } }`
   with:
   `context: { params: Promise<{ id: string }> }`
   
   And ensure resolution uses:
   `const resolvedParams = await context.params;`
   `const identifier = decodeURIComponent(resolvedParams.id);`

2. **Verify Next.js Production Build**:
   - Run `npm run build`. Verify that Next.js App Router compiles with exit code 0 and ZERO TypeScript or ESLint errors.

3. **Verify Full E2E Test Suite**:
   - Run `npm test` (or `node tests/runner.mjs`). Verify all 180 tests across all 7 suites and 4 tiers pass with exit code 0.

4. **Verify Dev Server**:
   - Ensure pages boot and serve cleanly (`npm run dev`).

## Output Location
Write your handoff report to `/home/noah/project/core/.agents/worker_m4_fix_2/handoff.md`.
Report back via `send_message` with verbatim build and test outputs.

## 2026-09-09T00:02:14Z
You are worker_m4_fix_2. Your working directory is: /home/noah/project/core/.agents/worker_m4_fix_2.
Read /home/noah/project/core/.agents/worker_m4_fix_2/DISPATCH.md and /home/noah/project/core/.agents/ORIGINAL_REQUEST.md.
Review reviewer_m4_fix_recheck/handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Tasks:
1. Fix Next.js 15 App Router Route Typing in the 4 dynamic API route handlers:
   - src/app/api/accounts/[id]/route.ts
   - src/app/api/groups/[id]/route.ts
   - src/app/api/assets/[id]/route.ts
   - src/app/api/software/[id]/route.ts
   Change `context: { params: Promise<{ id: string }> | { id: string } }` to `context: { params: Promise<{ id: string }> }` and `await context.params`.
2. Run `npm run build` and verify exit code 0 and clean build output.
3. Run `npm test` and verify 180/180 tests pass with exit code 0.
4. Verify dev server boot (`npm run dev`).

Write your handoff report to /home/noah/project/core/.agents/worker_m4_fix_2/handoff.md and report back via send_message with verbatim outputs.
