# ADR-004: Sensitive Credentials Are Not Normal Data

## Status

Accepted

## Decision

Passwords, PINs, recovery codes, and secrets must not be stored as plain database fields.

## Requirements

- Encryption at rest
- Restricted access
- Reveal logging
- Permission checks
- Re-authentication
- Secret rotation tracking

## Principle

Metadata may be widely visible.

Secrets require explicit authorization.
