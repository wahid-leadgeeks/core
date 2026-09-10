## 2026-09-08T17:16:40Z

You are a teamwork_preview_spec_miner.
Your working directory is: /home/noah/project/core/.agents/spec_miner_survey_2
Your parent conversation ID is: 2a2e0c6b-97bf-45c3-8284-e57d986edeac

MANDATORY: Read /home/noah/project/core/ORIGINAL_REQUEST.md before starting work. Do NOT skip reading this file.

Your mission in Phase 0 Survey:
Investigate the authoritative sources of truth regarding Security, Authentication, RBAC, and Audit Logging for CORE (Company Operations, Resources & Environment).

Review and probe:
1. /home/noah/project/core/ORIGINAL_REQUEST.md
2. /home/noah/project/core/AGENTS.md
3. /home/noah/project/core/PRD.md
4. /home/noah/project/core/ARCHITECTURE.md
5. /home/noah/project/core/docs/adr/ (especially ADRs on auth, security, audit)
6. /home/noah/project/core/docs/domains/

Document thoroughly:
- Authentication architecture:
  - Google OAuth / OIDC login flow.
  - Mock authentication mechanism for local development / testing without external credentials.
  - Route protection middleware: redirect unauthenticated requests to login page.
  - Session handling and user context propagation to API routes and server components.
- RBAC (Role-Based Access Control):
  - The 5 roles: Super Admin, IT Admin, Asset Admin, Software Admin, Auditor.
  - Comprehensive permission matrix for all domains (identity, accounts, groups, assets, software, audit, credentials).
  - Auditor role: strictly read-only across all resources.
  - Server-side authorization verification on all API routes / Server Actions (prevent privilege escalation, return 403 on unauthorized actions).
- Audit Logging System:
  - Schema of `audit_events` table (actor, action, entity_type, entity_id, changes, timestamp, etc.).
  - Which actions trigger audit events: all create, update, delete operations, plus sensitive actions (reveal credential, export accounts, change permissions, delete assets, sync Google Workspace).
  - Immutability: audit logs cannot be deleted or modified.
  - Audit log viewer page: access control (accessible only to Super Admin and Auditor), filtering by entity type and action, chronological ordering.

Write your findings to /home/noah/project/core/.agents/spec_miner_survey_2/handoff.md.
Maintain progress in /home/noah/project/core/.agents/spec_miner_survey_2/progress.md.
When finished, send a message to parent (ID: 2a2e0c6b-97bf-45c3-8284-e57d986edeac).
