# Google Workspace Integration

## APIs

- Google Admin SDK
- Google Directory API
- Google Groups API

## Synchronization Model

CORE maintains local metadata for:

- Accounts
- Groups
- Group memberships

Google Workspace is the authoritative source for actual account and group state.

CORE tracks:

- Local resource record
- Google Workspace identifier
- Last sync timestamp
- Sync status
- Sync conflicts

## Principles

- Never assume a Google API operation succeeded without confirmation
- Log all sync operations
- Surface conflicts to administrators
- Support manual re-sync
- Rate limit API calls appropriately
