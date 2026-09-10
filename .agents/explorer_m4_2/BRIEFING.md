# BRIEFING — 2026-09-08T23:38:40Z

## Mission
Investigate the codebase and produce an implementation blueprint for Identity and Groups domain pages (/accounts, /accounts/[id], /groups, /groups/[id], and 42x15 membership matrix /groups/matrix).

## 🔒 My Identity
- Archetype: explorer
- Roles: explorer, investigator, synthesizer
- Working directory: /home/noah/project/core/.agents/explorer_m4_2
- Original parent: f4820c04-1b52-4163-b871-2dd93083237b
- Milestone: M4 (Domain CRUD Pages & Navigation UI)

## 🔒 Key Constraints
- Read-only investigation — do NOT modify application source code
- Produce structured 5-component handoff report to `handoff.md`
- Report back via `send_message` to parent (`f4820c04-1b52-4163-b871-2dd93083237b`)
- Adhere strictly to CORE architecture, domain boundaries, and DESIGN.md calm infrastructure principles

## Current Parent
- Conversation ID: f4820c04-1b52-4163-b871-2dd93083237b
- Updated: 2026-09-08T23:38:40Z

## Investigation State
- **Explored paths**:
  - `src/domains/identity/schema.ts`
  - `src/domains/groups/schema.ts`
  - `src/domains/assets/schema.ts`
  - `src/domains/audit/schema.ts`, `service.ts`
  - `src/app/accounts/page.tsx`
  - `src/app/groups/page.tsx`
  - `src/app/groups/matrix/page.tsx`
  - `src/app/api/accounts/route.ts`
  - `src/app/api/groups/route.ts`
  - `src/middleware.ts`
  - `src/components/layout/AppShell.tsx`
  - `tests/e2e/07-crud-api-and-pages.test.ts`
  - `tests/fixtures/spreadsheet-accounts.json`, `spreadsheet-groups.json`, `spreadsheet-devices.json`
- **Key findings**:
  - Existing `/accounts/page.tsx` lacks multi-dimension filtering (Role, Type) and detail page linking.
  - Detail page `/accounts/[id]/page.tsx` must support dual resolution (UUID and email) to satisfy Tier 4 Scenario 1 (`/accounts/${targetAccount.email}`).
  - Account detail page needs 4 tabs: Overview, Google Groups, Assigned Devices, and History.
  - Detail API `GET /api/accounts/[id]` must be created to serve this 4-way join cleanly.
  - Existing `/groups/page.tsx` needs search, detail links to `/groups/[id]`, and member count badges.
  - Detail page `/groups/[id]/page.tsx` and API `GET /api/groups/[id]` must be created for member roster and metadata.
  - Matrix page `/groups/matrix/page.tsx` needs department filtering (Tier 4 Scenario 2) and role-aware indicators (Owner 👑, Manager 🛡️, Member ✓).
  - API `GET /api/groups?matrix=true` must be enhanced to return `departmentCode` and membership `role`.
- **Unexplored areas**: None within the scope of M4.2.

## Key Decisions Made
- Dual-ID resolution: test UUID format with regex before querying DB to avoid PG 22P02 invalid input syntax error.
- Enforce strict RBAC: Asset Admin and Software Admin return 403 Forbidden for all groups routes and APIs.
- Matrix cells: Owner rendered with purple crown badge, Manager with blue shield badge, Member with emerald checkmark badge.
- Full drop-in blueprints written to `handoff.md` for Worker M4.2.

## Artifact Index
- `.agents/explorer_m4_2/DISPATCH.md` — Dispatch instructions
- `.agents/explorer_m4_2/BRIEFING.md` — Working memory
- `.agents/explorer_m4_2/progress.md` — Liveness heartbeat
- `.agents/explorer_m4_2/handoff.md` — Final 5-component report
