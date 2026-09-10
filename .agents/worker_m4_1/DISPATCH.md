# Dispatch: Worker M4.1 (Milestone 4 Implementation)

## Working Directory
`/home/noah/project/core/.agents/worker_m4_1/`

## Mandatory Documents to Read First
- `/home/noah/project/core/.agents/ORIGINAL_REQUEST.md` (MANDATORY — read first)
- `/home/noah/project/core/.agents/orchestrator_3/PROJECT.md`
- `/home/noah/project/core/DESIGN.md`
- `/home/noah/project/core/TEST_READY.md`
- `/home/noah/project/core/.agents/explorer_m4_1/handoff.md` (UI Shell, Navigation, Role Switcher, Status Badges, Login)
- `/home/noah/project/core/.agents/explorer_m4_2/handoff.md` (Identity, Groups, 42x15 Matrix)
- `/home/noah/project/core/.agents/explorer_m4_3/handoff.md` (Assets, PIN Reveal Modal, Software, Audit Viewer)

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Implementation Tasks

### 1. UI Shell, Design System & Authentication
- Implement `src/lib/design/status.ts` containing status tokens, labels, and Tailwind class mappings for all 7 statuses per `DESIGN.md` (🟢 Active, 🔵 Assigned, ⚪ Available, 🟡 Pending / Reserve, 🟠 Attention, 🔴 Issue / Decommissioned, ⚫ Archived).
- Implement `src/components/feedback/StatusBadge.tsx` and `src/components/feedback/StatusDot.tsx`.
- Implement `src/components/layout/AppShell.tsx`, `Sidebar.tsx`, `Topbar.tsx`, and `RoleSwitcher.tsx` with the calm infrastructure command center dark navy palette (`#0a0f1d`, `#070b14`, `#0b132b` with `slate-800` borders). Ensure the sidebar contains all 7 navigation links and reflects role permissions. Ensure the topbar in-place role switcher enables 1-click switching between all 5 roles (`super_admin`, `it_admin`, `asset_admin`, `software_admin`, `auditor`) via POST `/api/auth/login`.
- Update `src/app/login/page.tsx` with the command center dark theme, Google OAuth button, and 5-role mock authentication switcher preserving `callbackUrl`.

### 2. Identity & Groups Domain Pages
- Enhance `src/app/accounts/page.tsx` with search, 3-dimensional filtering (Department, Role, Type), status badges, and row links to detail page.
- Implement `src/app/api/accounts/[id]/route.ts` and `src/app/accounts/[id]/page.tsx` following the Resource Page Pattern with 4 tabs (Overview, Groups, Assigned Devices, Audit History). MUST support dual-identifier resolution (both UUID and email) to satisfy Tier 4 Scenario 1 (`/accounts/amanda@leadgeeksinc.com`).
- Enhance `src/app/groups/page.tsx` with member count badges, sync status, and navigation to detail page and `/groups/matrix`.
- Implement `src/app/api/groups/[id]/route.ts` and `src/app/groups/[id]/page.tsx` with group info, sync status, and member roster displaying group roles (`owner`, `manager`, `member`) linking to `/accounts/[id]`. Supports lookup by UUID or group email.
- Enhance `src/app/groups/matrix/page.tsx` with Department filter pills (supporting Tier 4 Scenario 2), role-aware cell indicators (owner, manager, member), sticky header/columns, and horizontal scrolling.

### 3. Assets, Software & Audit Domain Pages
- Enhance `src/app/assets/page.tsx` with search, Status filters, Brand filter, Department filter, and row/card links to detail page.
- Implement `src/app/api/assets/[id]/route.ts` and `src/app/assets/[id]/page.tsx` supporting lookup by both UUID and `assetNumber` (e.g. `LGI-CD-2024-001`). Resource Page Pattern with 5 tabs (Overview, Specifications, Assignment, Access & Credentials, History).
- Implement `src/components/assets/PinRevealModal.tsx` gated to Super Admin and IT Admin, calling `/api/assets/[id]/credentials/reveal`, 30s auto-mask countdown, copy button, and zero plain-text audit leakage.
- Enhance `src/app/software/page.tsx` with search, Department filter, Category filter, and full Subscription Type filter (`free`, `paid`, `freemium`).
- Implement `src/app/api/software/[id]/route.ts` and `src/app/software/[id]/page.tsx` supporting lookup by UUID or name slug (e.g. `app-slack`) with Overview, Subscription & Licensing, and Department & Ownership tabs.
- Enhance `src/app/audit/page.tsx` with role guard (Super Admin & Auditor only), filters (Action, Entity Type, Actor), and interactive JSON Metadata Viewer modal.

### 4. Verification Requirements
- Worker MUST run `npm test` (or `node tests/runner.mjs`) to verify all 180 E2E tests pass 100%.
- Worker MUST run `npm run build` to verify Next.js compiles and typechecks with zero errors.
- Document all modified and created files, exact commands executed, and test/build output in `handoff.md`.

## Output Location
Write your handoff report to `/home/noah/project/core/.agents/worker_m4_1/handoff.md`.
Report back via `send_message` when complete.

## 2026-09-08T23:38:23Z
You are worker_m4_1. Your working directory is: /home/noah/project/core/.agents/worker_m4_1.
Read /home/noah/project/core/.agents/worker_m4_1/DISPATCH.md and /home/noah/project/core/.agents/ORIGINAL_REQUEST.md.
Review the architectural blueprints in:
- /home/noah/project/core/.agents/explorer_m4_1/handoff.md
- /home/noah/project/core/.agents/explorer_m4_2/handoff.md
- /home/noah/project/core/.agents/explorer_m4_3/handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement Milestone 4:
1. Calm infrastructure command center shell per DESIGN.md with dark navy sidebar navigation, in-place role switcher, and status color badges (🟢🔵⚪🟡🔴).
2. /accounts list & detail (/accounts/[id]) with 3-dimensional filters, dual identifier resolution (UUID and email), groups, assigned devices, audit log.
3. /groups list, detail (/groups/[id]), and 42x15 membership matrix (/groups/matrix) with department filter pills.
4. /assets list & detail (/assets/[id]) with specs/custodian and PinRevealModal generating audit events with zero plaintext leaks.
5. /software list & detail (/software/[id]) with dept and subscription (free/paid/freemium) filters.
6. /audit log viewer accessible only to Super Admin & Auditor with filters and JSON metadata viewer modal.
7. /login page with Google OAuth and mock authentication role switcher.
8. Verify with `npm test` and `npm run build`.

Write your handoff report to /home/noah/project/core/.agents/worker_m4_1/handoff.md and report back via send_message when complete.
