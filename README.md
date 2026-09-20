# CORE

Company Operations, Resources & Environment

---

## Requirements

- Node.js (v20+)
- PGlite (Embedded WASM PostgreSQL — zero Docker setup required)

## Installation

1. Install dependencies (`npm install`)
2. Configure environment variables (`.env.local`)
3. Run database migrations (`npm run db:migrate`)
4. Seed initial data (`npm run db:seed` or `npm run db:import`)
5. Start development server (`npm run dev`)

## Commands

| Command | Description |
| --- | --- |
| `dev` | Start development server |
| `build` | Build for production |
| `test` | Run tests |
| `lint` | Run linter |
| `typecheck` | Run type checker |
| `db:migrate` | Run database migrations |
| `db:seed` | Seed canonical reference data |
| `db:import` | Ingest spreadsheet data into database |

## Local Development Database

CORE uses **PGlite** (`@electric-sql/pglite` and `drizzle-orm/pglite`) for local development:
- **Zero-setup**: Embedded WASM PostgreSQL running directly in-process — no Docker or PostgreSQL server required.
- **Persistence**: Persisted locally to `./data/core_db`.
- **Production parity**: 100% PostgreSQL-compatible SQL dialect, custom enums, foreign keys, and atomic transactions.
- **Production**: Configure `DATABASE_URL` in `.env` to connect to external PostgreSQL (e.g. Neon, Supabase, AWS RDS).


## Documentation

- [PRD.md](PRD.md) — Why are we building this?
- [ARCHITECTURE.md](ARCHITECTURE.md) — What does the system look like?
- [DATA_MODEL.md](DATA_MODEL.md) — What information exists and how is it connected?
- [DESIGN.md](DESIGN.md) — How should it look and behave?
- [AGENTS.md](AGENTS.md) — How should AI agents work?
- [ROADMAP.md](ROADMAP.md) — Where is the product going?
- [TODO.md](TODO.md) — What should we do now?
- [docs/adr/](docs/adr/) — Why did we make important decisions?
- [docs/data/](docs/data/) — How do spreadsheets map to CORE?

## Domains

- [Identity](docs/domains/identity.md) — Accounts, departments, roles, domains
- [Groups](docs/domains/groups.md) — Google Groups and memberships
- [Assets](docs/domains/assets.md) — Laptops and hardware devices
- [Software](docs/domains/software.md) — Applications, licenses, subscriptions
- [Access](docs/domains/access.md) — Credentials and permissions
- [Automation](docs/domains/automation.md) — Sync jobs and rules
- [Integrations](docs/integrations/google-workspace.md) — Google Workspace

## Data

CORE replaces 3 spreadsheets containing:

- 42 accounts across 8 departments
- 15 Google Groups with ~168 memberships
- 31 company laptops with specifications and credentials
- 125 software applications

See [docs/data/spreadsheet-mapping.md](docs/data/spreadsheet-mapping.md) for the full column-level mapping.

### Linked Google Spreadsheet

CORE is connected directly to the live company Google Spreadsheet:
- **Spreadsheet**: [Google Spreadsheet](https://docs.google.com/spreadsheets/d/1vWFuIU_LxCqyQ7Bn5N2K4gBDcIcnmogYA_ALiucWxbo) (`1vWFuIU_LxCqyQ7Bn5N2K4gBDcIcnmogYA_ALiucWxbo`)
- **Integration**: Native Google Sheets API v4 REST client matching `/home/noah/project/onboarding-copilot`.

