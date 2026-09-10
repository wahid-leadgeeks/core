# Dispatch: Explorer M4.1 (UI Shell, Design System, Navigation Sidebar, Role Switcher & Login)

## Context & Objectives
You are `explorer_m4_1`.
Working directory: `/home/noah/project/core/.agents/explorer_m4_1/`

You must read:
- `/home/noah/project/core/.agents/ORIGINAL_REQUEST.md` (MANDATORY — read first)
- `/home/noah/project/core/.agents/orchestrator_3/PROJECT.md`
- `/home/noah/project/core/DESIGN.md`
- `/home/noah/project/core/TEST_READY.md`
- `/home/noah/project/core/tests/e2e/07-crud-api-and-pages.test.ts` (and tests/e2e/02-auth-and-sessions.test.ts)

## Mission Scope
Investigate the existing codebase (current Next.js app structure, Tailwind configuration, components, layout, auth hooks/context, mock auth session, and route guards) and design a concrete, executable implementation blueprint for:
1. Calm infrastructure command center shell per `DESIGN.md`:
   - Dark navy sidebar navigation linking to all 7 primary sections (`/accounts`, `/groups`, `/assets`, `/software`, `/audit`, etc.).
   - Header / Topbar with current active user display and role switcher dropdown/buttons (Super Admin, IT Admin, Asset Admin, Software Admin, Auditor).
   - Global status color system and badges (🟢 Active, 🔵 Assigned, ⚪ Available, 🟡 Pending / Reserve, 🟠 Attention, 🔴 Issue / Decommissioned, ⚫ Archived) matching `DESIGN.md` and `Suite 07` contracts.
2. `/login` page:
   - Google OAuth / OIDC login button.
   - Local mock authentication role switcher (allowing quick switching between all 5 roles for dev & testing).
   - Proper redirect to callbackUrl upon authentication.
3. Check existing files in `src/app/`, `src/components/`, `src/lib/auth/`, etc., and specify exact component structure, props, types, and files needed.

## Output Requirements
Write your comprehensive architectural and implementation blueprint to:
`/home/noah/project/core/.agents/explorer_m4_1/handoff.md`

Include:
- Verified evidence of existing UI/auth code
- File-by-file blueprint of changes and new components to create
- Exact styling patterns (Tailwind classes for dark navy sidebar, command center look)
- Handoff verdict and implementation recommendations for Worker

## 2026-09-08T23:33:53Z
You are explorer_m4_1. Your working directory is: /home/noah/project/core/.agents/explorer_m4_1.
Read /home/noah/project/core/.agents/explorer_m4_1/DISPATCH.md and /home/noah/project/core/.agents/ORIGINAL_REQUEST.md.
Investigate the codebase and produce an implementation blueprint for the Calm Infrastructure Command Center UI Shell, dark navy sidebar navigation, role switcher, global status color badges (🟢🔵⚪🟡🔴), and the /login page (Google OAuth + mock auth switcher).
Write your handoff report to /home/noah/project/core/.agents/explorer_m4_1/handoff.md and report back via send_message when done.
