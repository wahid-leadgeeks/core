# Automation Domain

Manages synchronization jobs, assignment rules, notifications, and scheduled tasks.

## Responsibilities

- Google Workspace synchronization
- Assignment rule evaluation
- Notification dispatch
- Conflict detection
- Scheduled audits

## Jobs

- Google Groups sync
- Account sync
- License expiry checks
- Assignment conflict detection
- Audit report generation

## Principles

- Jobs are idempotent
- Jobs log all actions
- Failed jobs do not corrupt data
- Sync conflicts are surfaced, not silently resolved
