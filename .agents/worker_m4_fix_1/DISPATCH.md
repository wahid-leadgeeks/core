# Dispatch: Worker M4 Fix 1 (Build & React Remediation Worker)

## Working Directory
`/home/noah/project/core/.agents/worker_m4_fix_1/`

## Mandatory Documents to Read First
- `/home/noah/project/core/.agents/ORIGINAL_REQUEST.md` (MANDATORY — read first)
- `/home/noah/project/core/.agents/orchestrator_3/PROJECT.md`
- `/home/noah/project/core/.agents/reviewer_m4_2/handoff.md`
- `/home/noah/project/core/.agents/explorer_m4_fix_1/handoff.md` (Contains exact character-level fixes for 6 JSX files and patch)
- `/home/noah/project/core/.agents/explorer_m4_fix_2/handoff.md` (Contains exact fixes for PinRevealModal timer & useCallback wrapping)
- `/home/noah/project/core/.agents/explorer_m4_fix_3/handoff.md` (Contains build & regression checklist)

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Remediation Tasks

1. **Fix ESLint Unescaped Entities in 6 JSX Pages**:
   - `src/app/accounts/page.tsx:213`: replace `"{query}"` with `&quot;{query}&quot;`
   - `src/app/assets/page.tsx:237`: replace `"{query}"` with `&quot;{query}&quot;`
   - `src/app/audit/page.tsx:259`: replace `"{query}"` with `&quot;{query}&quot;`
   - `src/app/groups/[id]/page.tsx:203`: replace `"{query}"` with `&quot;{query}&quot;`
   - `src/app/groups/page.tsx:105`: replace `"{query}"` with `&quot;{query}&quot;`
   - `src/app/software/page.tsx:230`: replace `"{query}"` with `&quot;{query}&quot;`

2. **Refactor `PinRevealModal.tsx` Timer**:
   - Refactor lines 41-58 per `explorer_m4_fix_2/handoff.md` to remove `onClose()`, `setRevealedPin(null)`, and `clearInterval` from inside the `setSecondsRemaining` updater callback.
   - Use a clean dedicated `useEffect` observing `revealedPin && secondsRemaining === 0` to trigger auto-masking and `onClose()`.

3. **Wrap `fetchDetail` in `useCallback` Across 4 Detail Pages**:
   - `src/app/accounts/[id]/page.tsx`
   - `src/app/assets/[id]/page.tsx`
   - `src/app/groups/[id]/page.tsx`
   - `src/app/software/[id]/page.tsx`
   - Wrap `fetchDetail` in `useCallback(async () => { ... }, [id])` and supply `[fetchDetail]` to `useEffect` dependency array.

4. **Case-Insensitive Email Lookups in DB Query**:
   - In `src/app/api/accounts/[id]/route.ts` and `src/app/api/groups/[id]/route.ts`, normalize non-UUID identifiers with `.toLowerCase()`.

5. **Build and Test Verification**:
   - Run `npm run build`. MUST verify Next.js compiles with exit code `0` and ZERO TypeScript or ESLint errors.
   - Run `npm test` (or `node tests/runner.mjs`). MUST verify all 180 tests across all 7 suites and 4 tiers pass with exit code `0`.
   - Document commands executed and verbatim output in `handoff.md`.

## Output Location
Write your handoff report to `/home/noah/project/core/.agents/worker_m4_fix_1/handoff.md` and report back via `send_message`.

## 2026-09-08T23:54:35Z
Dispatch received: Fix ESLint unescaped entities, refactor PinRevealModal timer, wrap fetchDetail in useCallback, normalize email queries, verify npm run build and npm test (180/180).

