# Groups Domain

Manages Google Workspace groups and membership relationships.

---

## Entities

### Google Group

A Google Workspace distribution/access group.

| Field | Example |
|-------|---------|
| name | LeadGeeks Team |
| email | team@leadgeeksinc.com |
| member_count | 38 |
| sync_status | synced, pending, conflict, error |

**15 groups** in current spreadsheet.

| Group | Email | Members |
|-------|-------|---------|
| LeadGeeks Team | team@leadgeeksinc.com | 38 |
| LeadGeeks Management Team | management@leadgeeksinc.com | 7 |
| LeadGeeks Leadership Team | leaders@leadgeeksinc.com | 13 |
| LeadGeeks GEO Team | geo.team@leadgeeksinc.com | 13 |
| FBA Alunara Team | fba.team@leadgeeksinc.com | 4 |
| LeadGeeks Growth Team | growth.team@leadgeeksinc.com | 9 |
| LeadGeeks Experience Team | experience.team@leadgeeksinc.com | 3 |
| LeadGeeks HRD Team | hrd.team@leadgeeksinc.com | 2 |
| LeadGeeks Finance and Accounting Team | finance.team@leadgeeksinc.com | 1 |
| LeadGeeks IT Team | it.team@leadgeeksinc.com | 2 |
| LeadGeeks Operations Team | operations.team@leadgeeksinc.com | 23 |
| Operations Leaders and TS Team | operations.leaders@leadgeeksinc.com | 6 |
| Operations Member Team | operations.members@leadgeeksinc.com | 16 |
| Operations Calendar Team | operations.calendar@leadgeeksinc.co | 27 |
| Growth Calendar Team | growth.calendar@leadgeeksinc.co | 4 |

### Group Membership

Association between an account and a group.

| Field | Description |
|-------|-------------|
| group_id | FK → google_groups |
| account_id | FK → accounts |
| role | member, manager, owner |
| source | spreadsheet, google_sync, manual |

**~168 memberships** in current spreadsheet.

All imported as `role: member` — actual roles to be synced from Google Workspace API.

---

## Google Workspace Sync

Groups are synced with Google Workspace. See [Google Workspace integration](../integrations/google-workspace.md).

- CORE maintains local metadata
- Google Workspace is authoritative for actual group state
- Sync conflicts are surfaced to administrators

---

## Data Quality Notes

- Some member emails use `leadgeeksprospecting.com` domain (e.g., Experience Team members)
- These must be resolved to the correct account using both `email` and `previous_email`
- Two calendar groups use the `.co` domain instead of `.com`

---

## Import Source

Spreadsheet: `List of Accounts and Google Group Management.xlsx`
Sheet: `Google Group`
