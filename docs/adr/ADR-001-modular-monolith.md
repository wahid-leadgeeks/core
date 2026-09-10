# ADR-001: Use Modular Monolith Architecture

## Status

Accepted

## Context

CORE contains multiple connected domains:

- Accounts
- Google Groups
- Assets
- Software
- Access
- Audit

These domains require transactional consistency and are currently maintained by a small team.

## Decision

CORE will use a Modular Monolith architecture.

## Consequences

### Benefits

- Simple deployment
- One codebase
- One database
- Easier development
- Clear domain boundaries

### Tradeoffs

- Modules must remain disciplined
- Future extraction requires planning
