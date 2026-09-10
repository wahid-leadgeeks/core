# AGENTS.md

## Project

CORE — Company Operations, Resources & Environment

---

## Primary Rule

Understand the affected domain before modifying code.

Do not make unrelated changes.

---

## Architecture

CORE uses:

- Modular Monolith
- Domain modules
- PostgreSQL
- Server-side authorization
- Audit logging

---

## Modules

- identity
- accounts
- groups
- assets
- software
- licenses
- access
- audit
- automation

---

## Agent Workflow

### Before Implementation

1. Read relevant documentation
2. Identify domain module
3. Identify affected entities
4. Check existing ADRs
5. Create implementation plan

### During Implementation

1. Keep domain boundaries
2. Validate input
3. Check authorization
4. Log sensitive actions
5. Add tests

### After Implementation

1. Run type checks
2. Run tests
3. Run linting
4. Verify authorization
5. Update documentation

---

## Forbidden

Agents must not:

- Store secrets in plain text
- Bypass authorization
- Modify unrelated modules
- Delete audit logs
- Hardcode credentials
- Expose sensitive API responses
- Assume Google API operations succeeded

---

## Sensitive Data

Sensitive operations require:

- Explicit permission
- Server-side validation
- Audit logging

Examples:

- Reveal credential
- Export accounts
- Change permissions
- Delete assets
- Synchronize Google Workspace
