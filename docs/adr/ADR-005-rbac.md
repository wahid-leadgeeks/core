# ADR-005: Role Based Access Control

## Status

Accepted

## Decision

CORE uses RBAC.

## Roles

- Super Admin
- IT Admin
- Asset Admin
- Software Admin
- Auditor

## Principle

Permissions are evaluated server-side.

The frontend must never be trusted as the authorization boundary.
