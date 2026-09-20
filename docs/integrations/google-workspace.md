# Google Workspace Integration

## APIs

- Google Admin SDK
- Google Directory API
- Google Groups API
- Google Sheets API v4

## Linked Authoritative Spreadsheet

CORE is connected to the company authoritative Google Spreadsheet:
- **Spreadsheet URL**: [Google Spreadsheet](https://docs.google.com/spreadsheets/d/1vWFuIU_LxCqyQ7Bn5N2K4gBDcIcnmogYA_ALiucWxbo)
- **Spreadsheet ID**: `1vWFuIU_LxCqyQ7Bn5N2K4gBDcIcnmogYA_ALiucWxbo`
- **Architecture**: Configured using direct Google Sheets API v4 REST client matching `/home/noah/project/onboarding-copilot`.

### Sheets Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/google` | GET | Initiates Google OAuth consent flow with `spreadsheets` scope |
| `/api/auth/callback/google` | GET | Exchanges authorization code for tokens, logs audit event |
| `/api/sheets/status` | GET | Reports Google connection and linked spreadsheet status |
| `/api/sheets/extract` | GET | Extracts all sheet metadata and matrices from linked spreadsheet |
| `/api/sheets/update-cell` | GET/POST | Reads or updates cells and ranges in the spreadsheet |

## Synchronization Model

CORE maintains local metadata for:

- Accounts
- Groups
- Group memberships
- Spreadsheets data

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

