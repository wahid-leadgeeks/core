# Dispatch: Explorer M4.2 (Accounts & Groups Domain Pages + 42x15 Membership Matrix)

## Context & Objectives
You are `explorer_m4_2`.
Working directory: `/home/noah/project/core/.agents/explorer_m4_2/`

You must read:
- `/home/noah/project/core/.agents/ORIGINAL_REQUEST.md` (MANDATORY — read first)
- `/home/noah/project/core/.agents/orchestrator_3/PROJECT.md`
- `/home/noah/project/core/DESIGN.md`
- `/home/noah/project/core/TEST_READY.md`
- `/home/noah/project/core/tests/e2e/07-crud-api-and-pages.test.ts`
- Existing schema in `src/lib/db/schema.ts` and routes in `src/app/api/` or `src/domains/`

## Mission Scope
Investigate the existing codebase and design a concrete, executable implementation blueprint for:
1. `/accounts` (Accounts List Page):
   - Search bar (filtering by name, email).
   - Filters: Department (8 depts), Role (5 levels/roles), Type (Personal, Service, Shared).
   - Display account cards / table rows with status badges (🟢 Active, etc.), department, primary role, email.
   - Link to detail page.
2. `/accounts/[id]` (Account Detail Page):
   - Resource Page Pattern per `DESIGN.md` with header summary and tabs:
     - Overview: Profile info, employee ID, job title, canonical department, corporate domains.
     - Groups: Google Groups the account belongs to, with role in group.
     - Assigned Devices: Hardware laptops assigned to this account (from `device_assignments`).
     - History: Audit log events for this account.
3. `/groups` (Google Groups List Page):
   - List of all 15 Google Groups with member count badges, email, type/source.
   - Quick navigation to detail page and to `/groups/matrix`.
4. `/groups/[id]` (Group Detail Page):
   - Group info, email, description, and list of member accounts with roles.
5. `/groups/matrix` (42x15 Membership Matrix View):
   - Full cross-tabulation table with 42 accounts as rows and 15 groups as columns.
   - Clean indicators showing group membership status (e.g. checkmark or badge for member/owner/manager).
   - Performant rendering and horizontal scroll support.

## Output Requirements
Write your comprehensive architectural and implementation blueprint to:
`/home/noah/project/core/.agents/explorer_m4_2/handoff.md`

Include:
- Verified evidence of existing database queries and API routes
- Exact file paths (`src/app/(admin)/accounts/page.tsx`, `src/app/(admin)/accounts/[id]/page.tsx`, `src/app/(admin)/groups/page.tsx`, `src/app/(admin)/groups/[id]/page.tsx`, `src/app/(admin)/groups/matrix/page.tsx`, etc.)
- Data fetching strategy (Server Components with Drizzle ORM queries / client components where interactivity is needed)
- Handoff verdict and implementation recommendations for Worker

## 2026-09-08T23:33:53Z
You are explorer_m4_2. Your working directory is: /home/noah/project/core/.agents/explorer_m4_2.
Read /home/noah/project/core/.agents/explorer_m4_2/DISPATCH.md and /home/noah/project/core/.agents/ORIGINAL_REQUEST.md.
Investigate the codebase and produce an implementation blueprint for the Identity and Groups domain pages (/accounts, /accounts/[id], /groups, /groups/[id], and the 42x15 membership matrix view /groups/matrix).
Write your handoff report to /home/noah/project/core/.agents/explorer_m4_2/handoff.md and report back via send_message when done.

