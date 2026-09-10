## 2026-09-08T17:44:02Z

<USER_REQUEST>
You are a teamwork_preview_worker implementing the remediation for Milestone 1: App Foundation, Schema & Migrations for CORE.
Your working directory is: /home/noah/project/core/.agents/worker_m1_fix_1
Your parent conversation ID is: 2a2e0c6b-97bf-45c3-8284-e57d986edeac

MANDATORY: Read /home/noah/project/core/ORIGINAL_REQUEST.md before starting work. Do NOT skip reading this file.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Reference Documents:
- Remediation Blueprint: /home/noah/project/core/.agents/explorer_m1_fix_1/handoff.md
- Reviewer Feedback: /home/noah/project/core/.agents/reviewer_m1_2/handoff.md
- Scope Document: /home/noah/project/core/.agents/orchestrator_1/PROJECT.md

Your Remediation Tasks:
1. Implement live PostgreSQL database introspection in `tests/helpers/db-client.mjs` and `tests/helpers/db-client.ts` following the blueprint in `explorer_m1_fix_1/handoff.md`:
   - Connect to live PostgreSQL via `DATABASE_URL` using `postgres`.
   - Query `information_schema.tables`, `information_schema.columns`, `pg_type`, `pg_enum`, and `table_constraints` to verify genuine tables, columns, nullability, and enums.
   - Provide graceful client lifecycle (`getDbClient`, `closeDbClient`).
2. Update `tests/e2e/01-db-schema-and-seed.test.mjs` and `tests/e2e/01-db-schema-and-seed.test.ts` to perform real async queries against PostgreSQL:
   - Verify that all 13 tables exist in PostgreSQL `core_db`.
   - Verify column types, nullability, and enums against PostgreSQL catalogs.
   - Verify foreign keys and cascade rules.
   - Test adversarial constraint rejections against PostgreSQL (duplicate code, duplicate email, invalid enum values) expecting real database errors (codes 23505, 22P02).
   - Test live reference counts (8 departments, 5 roles, 3 domains) in the database.
   - Test genuine seed script idempotency against PostgreSQL.
3. Update `scripts/seed-reference.ts` per the blueprint:
   - Wrap seeding in `await db.transaction(async (tx) => { ... })`.
   - Safely handle dual-unique constraints on `departments` (`code` and `name`) using an `or(eq(code), eq(name))` lookup pattern.
4. Execute and document verification:
   - `npm run db:migrate`
   - `npm run db:seed`
   - `node tests/runner.mjs --suite=01` (verify all tests pass against live PostgreSQL!)
   - `npm run test` or `node tests/runner.mjs`
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`

Write your completion report to /home/noah/project/core/.agents/worker_m1_fix_1/handoff.md.
Maintain progress in /home/noah/project/core/.agents/worker_m1_fix_1/progress.md.
When finished, send a message to parent (ID: 2a2e0c6b-97bf-45c3-8284-e57d986edeac).
</USER_REQUEST>
