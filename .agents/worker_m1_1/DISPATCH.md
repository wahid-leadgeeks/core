## 2026-09-08T17:21:04Z

You are a teamwork_preview_worker implementing Milestone 1: App Foundation, Schema & Migrations for CORE.
Your working directory is: /home/noah/project/core/.agents/worker_m1_1
Your parent conversation ID is: 2a2e0c6b-97bf-45c3-8284-e57d986edeac

MANDATORY: Read /home/noah/project/core/ORIGINAL_REQUEST.md before starting work. Do NOT skip reading this file.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Survey Documents:
- /home/noah/project/core/.agents/orchestrator_1/PROJECT.md
- /home/noah/project/core/.agents/spec_miner_survey_1/handoff.md (Detailed schema, types, constraints, seed data)
- /home/noah/project/core/.agents/explorer_survey_1/handoff.md (Next.js layout, Drizzle setup, package.json scripts)
- /home/noah/project/core/DATA_MODEL.md
- /home/noah/project/core/ARCHITECTURE.md
- /home/noah/project/core/AGENTS.md

Your Objectives:
1. Initialize Next.js 15 (App Router) project with TypeScript, Tailwind CSS, ESLint, Drizzle ORM, postgres client (`postgres` or `pg`).
2. Implement all 12 tables + `audit_events` (13 tables total) exactly matching DATA_MODEL.md and spec_miner_survey_1/handoff.md:
   - Tables: `departments`, `account_roles`, `domains`, `accounts`, `account_domains`, `google_groups`, `group_memberships`, `devices`, `device_specifications`, `device_assignments`, `device_credentials`, `applications`, `audit_events`.
   - All custom enums: `account_type_enum`, `account_status_enum`, `sync_status_enum`, `group_role_enum`, `group_source_enum`, `device_status_enum`, `application_category_enum`, `subscription_type_enum`, `application_status_enum`.
   - All PKs, FKs with proper cascade/set null, unique constraints, and PostgreSQL types (e.g. `inet` for `audit_events.ip_address`, `jsonb` for metadata, `timestamptz`).
   - Organize schemas modularly under `src/domains/{identity,groups,assets,access,software,audit}/schema.ts` and re-export unified in `src/lib/db/schema.ts`.
3. Implement database connection client in `src/lib/db/client.ts`.
4. Implement migration runner (`scripts/migrate.ts` / Drizzle Kit) with `npm run db:migrate`.
5. Implement reference seed script (`scripts/seed-reference.ts`) with `npm run db:seed` that idempotently populates:
   - 8 departments: `Management Office` (MNG), `Operations` (OPS), `Growth` (GRW), `Experience` (EXP), `Human Resource and Development` (HRD), `Information and Technology` (ITE), `Finance and Accounting` (FAC), `General` (GNR).
   - 5 account roles: `Top Management` (1), `Leaders` (2), `Non-Leaders` (3), `Staff` (4), `Commercial` (5).
   - 3 domains: `leadgeeksinc.com` (primary: true), `leadgeeksinc.co` (primary: false), `leadgeeksprospecting.com` (primary: false).
6. Create `.env.example` and working `.env.local` / `.env` for local PostgreSQL connection. Check the local PostgreSQL instance on the system and ensure the database exists and connects.
7. Configure package.json scripts: `dev`, `build`, `lint`, `db:migrate`, `db:seed`. Ensure `src/app/layout.tsx` and `src/app/page.tsx` exist so Next.js boots and builds.
8. Run and document verification:
   - `npm install`
   - Run migrations against local PostgreSQL (`npm run db:migrate`)
   - Run seed script (`npm run db:seed`) and verify records in PostgreSQL
   - `npm run build`
   - `npm run lint`

File ownership:
- You own root configuration files (`package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `drizzle.config.ts`, `.env.example`, `.env.local`).
- `scripts/migrate.ts`, `scripts/seed-reference.ts`.
- `src/lib/db/`.
- `src/domains/*/schema.ts`.
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`.

Write your report to /home/noah/project/core/.agents/worker_m1_1/handoff.md.
Maintain progress in /home/noah/project/core/.agents/worker_m1_1/progress.md.
When finished, send a message to parent (ID: 2a2e0c6b-97bf-45c3-8284-e57d986edeac).
