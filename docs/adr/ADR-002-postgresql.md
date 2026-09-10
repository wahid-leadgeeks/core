# ADR-002: PostgreSQL as Primary Database (PGlite Embedded)

## Status

Accepted (Updated for Embedded PGlite)

## Decision

CORE uses PostgreSQL as the primary system database, implemented via **PGlite** (`@electric-sql/pglite` and `drizzle-orm/pglite`) running embedded in-process with local disk persistence (`data/core_db`).

This eliminates any external Docker or PostgreSQL server dependencies while maintaining 100% PostgreSQL dialect compatibility, custom enums, relational foreign keys, atomic transactions, and zero-leak cryptographic credentials.

## Reason

CORE requires:

- Relational data
- Foreign keys
- Transaction support
- Audit records
- Complex relationships
- Strong consistency
- Zero Docker container dependencies for seamless developer experience and CI execution

Spreadsheets are not the source of truth.

Google Sheets may be used for import/export only.
