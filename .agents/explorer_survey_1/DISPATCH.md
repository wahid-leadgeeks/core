## 2026-09-08T17:16:40Z
You are a teamwork_preview_explorer.
Your working directory is: /home/noah/project/core/.agents/explorer_survey_1
Your parent conversation ID is: 2a2e0c6b-97bf-45c3-8284-e57d986edeac

MANDATORY: Read /home/noah/project/core/ORIGINAL_REQUEST.md before starting work. Do NOT skip reading this file.

Your mission in Phase 0 Survey:
Investigate Frontend UI/UX, Page Specifications, and System/Architecture Integration for CORE (Company Operations, Resources & Environment).

Review and probe:
1. /home/noah/project/core/ORIGINAL_REQUEST.md
2. /home/noah/project/core/DESIGN.md
3. /home/noah/project/core/PRD.md
4. /home/noah/project/core/ARCHITECTURE.md
5. /home/noah/project/core/TODO.md
6. /home/noah/project/core/ROADMAP.md
7. /home/noah/project/core/docs/adr/

Document thoroughly:
- Next.js Application Architecture & Directory Layout:
  - App Router structure per ARCHITECTURE.md (src/app, src/components, src/domains, src/lib, etc.).
  - ORM choice based on ADRs (Drizzle vs Prisma).
  - PostgreSQL connection, database migration tooling, seed scripts.
  - Scripts required: npm run dev, npm run build, npm run lint, test runner.
  - Environment variables (.env.example).
- Frontend UI/UX Design System:
  - Design philosophy from DESIGN.md: calm infrastructure command center, not a spreadsheet clone.
  - Navigation sidebar layout linking to all domain sections.
  - List Page Pattern: search, filtering, pagination, summary stats.
  - Resource Page Pattern: resource cards with status indicators, tabbed detail views (Overview, Relationships, History).
  - Status color language: 🟢 Active, 🔵 Assigned, ⚪ Available, 🟡 Maintenance, 🔴 Retired, etc.
- Complete Page Inventory & Feature Requirements:
  - Identity: List & Detail pages for accounts (with department, role, domain, group membership display, search & filters).
  - Groups: List & Detail pages for Google Groups (member list, membership matrix view).
  - Assets: List & Detail pages for devices (specifications, assignment info, status, asset search).
  - Software: List & Detail pages for applications (department & subscription type filters).
  - Audit: Audit log page (actor, action, entity type, entity ID, timestamp, filters).
  - Login: Authentication page initiating OAuth / Mock login.

Write your findings to /home/noah/project/core/.agents/explorer_survey_1/handoff.md.
Maintain progress in /home/noah/project/core/.agents/explorer_survey_1/progress.md.
When finished, send a message to parent (ID: 2a2e0c6b-97bf-45c3-8284-e57d986edeac).
