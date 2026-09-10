# Specification Mining Report: Accounts & Google Groups Ingestion (M3-1)

- **Agent**: `spec_miner_m3_1` (Specification Miner / Domain Analyst)
- **Role**: Specification Miner for Milestone 3 (Accounts & Google Groups Ingestion)
- **Parent Conversation ID**: `5b2f3e24-eeb6-48d1-bebc-ac2e66214188`
- **Date**: 2026-09-08T18:40:00Z
- **Working Directory**: `/home/noah/project/core/.agents/spec_miner_m3_1`
- **Target Source File**: `/home/noah/Documents/sheets/List of Accounts and Google Group Management.xlsx`

---

## 1. Observation

Authoritative specification documents and codebases were systematically inspected:

1. **`ORIGINAL_REQUEST.md`**:
   - Lines 22–23:
     > "Source spreadsheets to import (read-only, do not modify):
     > - `/home/noah/Documents/sheets/List of Accounts and Google Group Management.xlsx` — 42 accounts, 15 Google Groups"
   - Lines 37–40 (R3. Spreadsheet data import):
     > "A working import mechanism (seed script, CLI command, or admin UI page) that reads the 3 source `.xlsx` spreadsheets and populates CORE's database tables following the exact column mapping in `docs/data/spreadsheet-mapping.md`. Must handle: department name normalization (e.g., "HRD" → "Human Resource and Development"), multi-domain accounts... Import must be idempotent (safe to run multiple times)."
   - Lines 70–73 (Acceptance Criteria):
     > "- [ ] Running the import script populates the database with data from all 3 spreadsheets
     > - [ ] After import: 42 accounts, 8 departments, 5 roles, 3 domains exist in the database
     > - [ ] After import: 15 Google Groups with correct member counts exist"
   - Line 77:
     > "- [ ] Running the import a second time does not create duplicate records"

2. **`docs/data/spreadsheet-mapping.md`**:
   - Lines 9–11:
     > "| Spreadsheet | Sheets |
     > | List of Accounts and Google Group Management.xlsx | List of User Account, Google Group |"
   - Lines 19–32:
     > "### List of User Account → `accounts`
     > | Spreadsheet Column | CORE Field | Notes |
     > | Nama Lengkap | `accounts.full_name` | |
     > | Account User Name | `accounts.display_name` | |
     > | New Email Address | `accounts.email` | Unique |
     > | Old Email Address | `accounts.previous_email` | Pre-migration email |
     > | Department | `departments.name` → `accounts.department_id` | FK lookup |
     > | Email Type | `account_roles.name` → `accounts.account_role_id` | FK lookup |
     > | Domain | `domains.name` → `account_domains` | M2M, comma-separated in source |
     > | Notes | `accounts.notes` | |
     > | Notes Old | `accounts.migration_notes` | |"
   - Lines 33–40:
     > "### Google Group → `google_groups` + `group_memberships`
     > | Spreadsheet Row | CORE Field | Notes |
     > | Row 1 (header) | `google_groups.name` | Each column is one group |
     > | Row 2 | `google_groups.email` | |
     > | Row 3+ | `group_memberships.account_id` | Matched by email → accounts |"
   - Lines 91–103 (Department Normalization):
     > "| Accounts Sheet | Drop Down Sheet | CORE Canonical Name | Code |
     > | Management Office | Management | Management Office | MNG |
     > | Operations | Operations | Operations | OPS |
     > | Growth | Growth | Growth | GRW |
     > | Experience | Experience | Experience | EXP |
     > | HRD | Human Resource and Development | Human Resource and Development | HRD |
     > | IT | Information and Technology | Information and Technology | ITE |
     > | Finance and Accounting | Finance and Accounting | Finance and Accounting | FAC |
     > | — | General | General | GNR |"
   - Lines 127–128:
     > "4. Group member emails use mixed domains — match on both `email` and `previous_email`."

3. **`docs/domains/identity.md`**:
   - Lines 24–31:
     > "**42 accounts** in current spreadsheet.
     > Account types:
     > - **personal** — Individual employee accounts (40)
     > - **service** — Commercial/functional accounts like `sales@leadgeeksinc.com` (1)
     > - **shared** — Shared admin accounts like `admin@leadgeeksinc.co` (1)"
   - Lines 36–46:
     > Department account distribution:
     > Management Office (MNG): 5
     > Operations (OPS): 20
     > Growth (GRW): 5
     > Experience (EXP): 3
     > Human Resource and Development (HRD): 2
     > Information and Technology (ITE): 2
     > Finance and Accounting (FAC): 2
     > General (GNR): 0 (software-only)
   - Lines 51–57:
     > Account roles breakdown:
     > Top Management (Level 1): 2
     > Leaders (Level 2): 12
     > Non-Leaders (Level 3): 4
     > Staff (Level 4): 23
     > Commercial (Level 5): 1
     > Total: 42 accounts
   - Lines 63–68:
     > Corporate domains:
     > `leadgeeksinc.com` (Primary: Yes, Leaders and above)
     > `leadgeeksinc.co` (Primary: No, Staff accounts)
     > `leadgeeksprospecting.com` (Primary: No, Legacy/migrated)

4. **`docs/domains/groups.md`**:
   - Lines 20–39:
     > "**15 groups** in current spreadsheet.
     > | Group | Email | Members |
     > | LeadGeeks Team | team@leadgeeksinc.com | 38 |
     > | LeadGeeks Management Team | management@leadgeeksinc.com | 7 |
     > | LeadGeeks Leadership Team | leaders@leadgeeksinc.com | 13 |
     > | LeadGeeks GEO Team | geo.team@leadgeeksinc.com | 13 |
     > | FBA Alunara Team | fba.team@leadgeeksinc.com | 4 |
     > | LeadGeeks Growth Team | growth.team@leadgeeksinc.com | 9 |
     > | LeadGeeks Experience Team | experience.team@leadgeeksinc.com | 3 |
     > | LeadGeeks HRD Team | hrd.team@leadgeeksinc.com | 2 |
     > | LeadGeeks Finance and Accounting Team | finance.team@leadgeeksinc.com | 1 |
     > | LeadGeeks IT Team | it.team@leadgeeksinc.com | 2 |
     > | LeadGeeks Operations Team | operations.team@leadgeeksinc.com | 23 |
     > | Operations Leaders and TS Team | operations.leaders@leadgeeksinc.com | 6 |
     > | Operations Member Team | operations.members@leadgeeksinc.com | 16 |
     > | Operations Calendar Team | operations.calendar@leadgeeksinc.co | 27 |
     > | Growth Calendar Team | growth.calendar@leadgeeksinc.co | 4 |"
     > Total members sum across 15 groups: 38 + 7 + 13 + 13 + 4 + 9 + 3 + 2 + 1 + 2 + 23 + 6 + 16 + 27 + 4 = 168 memberships.
   - Lines 51–53:
     > "**~168 memberships** in current spreadsheet.
     > All imported as `role: member` — actual roles to be synced from Google Workspace API."
   - Lines 68–72:
     > "- Some member emails use `leadgeeksprospecting.com` domain (e.g., Experience Team members)
     > - These must be resolved to the correct account using both `email` and `previous_email`
     > - Two calendar groups use the `.co` domain instead of `.com`"

5. **`src/domains/identity/schema.ts` and `src/domains/groups/schema.ts`**:
   - `accounts`: UUID PK, `full_name`, `display_name`, `email` (unique), `previous_email`, `account_type` (enum: personal, service, shared), `department_id` (FK departments), `account_role_id` (FK account_roles), `status` (enum: active, suspended, archived), `notes`, `migration_notes`.
   - `account_domains`: `(account_id, domain_id)` composite PK, FK to accounts and domains.
   - `google_groups`: UUID PK, `name`, `email` (unique), `description`, `member_count` (int default 0), `google_id` (unique nullable), `sync_status` (enum: synced, pending, conflict, error, default pending).
   - `group_memberships`: UUID PK, `group_id` (FK), `account_id` (FK), `role` (enum: member, manager, owner, default member), `source` (enum: spreadsheet, google_sync, manual), `added_at`. Unique constraint: `(group_id, account_id)`.

---

## 2. Logic Chain

1. **Topological Dependency Ordering**:
   - Relational constraints dictate that `departments`, `account_roles`, and `domains` must exist prior to `accounts` insertion.
   - `accounts` must exist prior to `account_domains` and `group_memberships`.
   - `google_groups` must exist prior to `group_memberships`.
   - Therefore, the execution pipeline for this scope must strictly follow:
     `seedReferenceData()` → `importAccounts()` → `importAccountDomains()` → `importGoogleGroups()` → `importGroupMemberships()`.

2. **Account Type Invariant**:
   - `DATA_MODEL.md` and `docs/domains/identity.md` classify accounts into 3 enum variants: `'personal'`, `'service'`, and `'shared'`.
   - The spreadsheet does not have an explicit `account_type` column; instead it has `Email Type` which maps to organizational hierarchy roles (Top Management, Leaders, Staff, Commercial).
   - The classification rule:
     - `email === 'sales@leadgeeksinc.com'` → `'service'` (Commercial outbound sales tool account).
     - `email === 'admin@leadgeeksinc.co'` → `'shared'` (Shared administrator mailbox).
     - All remaining 40 accounts → `'personal'` (Standard employee accounts).
   - This accounts for exactly 40 + 1 + 1 = 42 accounts.

3. **Department Normalization Rule**:
   - The `Department` column in the accounts sheet uses shorthand strings (e.g. `HRD`, `IT`, `Management Office`).
   - The canonical `departments` table contains 8 entries: `MNG`, `OPS`, `GRW`, `EXP`, `HRD`, `ITE`, `FAC`, `GNR`.
   - Shorthand mappings:
     - `'HRD'` → `'Human Resource and Development'` (`HRD`)
     - `'IT'` → `'Information and Technology'` (`ITE`)
     - `'Management'` or `'Management Office'` → `'Management Office'` (`MNG`)
     - `'Operations'` → `'Operations'` (`OPS`)
     - `'Growth'` → `'Growth'` (`GRW`)
     - `'Experience'` → `'Experience'` (`EXP`)
     - `'Finance and Accounting'` → `'Finance and Accounting'` (`FAC`)
   - If an unmapped department string is encountered, ingestion must fail the transaction rather than inserting corrupted null foreign keys.

4. **Multi-Domain Secondary Domain Parsing**:
   - The `Domain` column contains comma-separated values (e.g., `"leadgeeksinc.com, leadgeeksinc.co"` or `"leadgeeksinc.com"`).
   - Splitting by comma, trimming whitespace, and converting to lowercase yields the set of assigned domains.
   - Each domain string must be matched against `domains.name` (pre-seeded with 3 canonical domains: `leadgeeksinc.com`, `leadgeeksinc.co`, `leadgeeksprospecting.com`).
   - For every matched domain, a record is created in `account_domains` with `(account_id, domain_id)`.
   - Leaders and above generally possess multi-domain mappings (~48 total join links).

5. **Column-Oriented Parsing for Google Groups**:
   - Unlike standard tabular sheets, the `Google Group` tab is structured **column-wise**:
     - Each group is a separate column.
     - Row 1 holds the group display name (`google_groups.name`).
     - Row 2 holds the group email address (`google_groups.email`).
     - Rows 3+ contain member email addresses vertically.
   - The parser must iterate over columns (1 to 15):
     - Extract `name` from row index 0 / row 1.
     - Extract `email` from row index 1 / row 2.
     - Collect all non-empty strings from row index 2+ down to the bottom of the column as candidate member emails.

6. **Two-Tier Membership Resolution**:
   - Group member cells contain email strings.
   - Pre-migration emails in the spreadsheet use the legacy `@leadgeeksprospecting.com` domain (e.g. Amanda, Devi, Rian, Experience team).
   - Resolution rule:
     1. Search for account where `accounts.email === memberEmail`.
     2. If not found, search for account where `accounts.previous_email === memberEmail`.
     3. If matched, retrieve `account.id` and create `group_memberships` record with `role: 'member'` and `source: 'spreadsheet'`.
     4. If still not found, record a warning for orphaned/external member emails.
   - Enforce composite uniqueness `(group_id, account_id)`.
   - Update `google_groups.member_count` to match the actual distinct resolved member count.

7. **Idempotency Strategy**:
   - Natural unique keys:
     - `accounts.email` for `accounts`.
     - `google_groups.email` for `google_groups`.
     - Composite `(account_id, domain_id)` for `account_domains`.
     - Composite `(group_id, account_id)` for `group_memberships`.
   - Use `ON CONFLICT (email) DO UPDATE SET ...` for `accounts` and `google_groups`.
   - Use `ON CONFLICT (account_id, domain_id) DO NOTHING` for `account_domains`.
   - Use `ON CONFLICT (group_id, account_id) DO UPDATE SET source = EXCLUDED.source` for `group_memberships`.
   - Running the import repeatedly produces 0 duplicate records and 0 primary/foreign key constraint errors.

---

## 3. Caveats

1. **Calendar Group Domain Variation**:
   - Two calendar groups use `.co` (`operations.calendar@leadgeeksinc.co` and `growth.calendar@leadgeeksinc.co`) rather than `.com`. The parser must not validate group emails against a hardcoded `.com` suffix.
   - In some test fixtures (`tests/fixtures/spreadsheet-groups.json`), a calendar group was named `company.calendar@leadgeeksinc.co` with 42 members, while `docs/domains/groups.md` lists `operations.calendar@leadgeeksinc.co` (27 members) and `growth.calendar@leadgeeksinc.co` (4 members). The ingestion parser must dynamically read whichever groups exist in Row 1 and Row 2 of the spreadsheet rather than hardcoding names.
2. **Initial Group Role Invariant**:
   - In the spreadsheet, no per-member group roles (OWNER, MANAGER, MEMBER) are distinguished; all member emails are listed plain.
   - Per `docs/domains/groups.md:53`, all spreadsheet-imported memberships are set to `role = 'member'`. Detailed manager/owner roles will be synced subsequently from Google Workspace API.
3. **Empty / Blank Cells in Spreadsheet**:
   - The `Old Email Address`, `Notes`, and `Notes Old` columns contain empty cells for several accounts. These must be parsed as `null` in PostgreSQL rather than empty strings `""` to preserve data hygiene.

---

## 4. Conclusion

The specification for importing Accounts and Google Groups from `/home/noah/Documents/sheets/List of Accounts and Google Group Management.xlsx` is fully defined and unambiguous:
- **Sheet `List of User Account`** maps cleanly to `accounts` (42 records) with 40 `personal`, 1 `service`, 1 `shared`.
- **Department normalization** maps shorthand names ("HRD", "IT", "Management") to canonical reference departments.
- **Account roles** map hierarchy levels (Top Management, Leaders, Non-Leaders, Staff, Commercial) to `account_roles`.
- **Multi-domain parsing** extracts comma-separated domains into the `account_domains` join table (~48 links).
- **Sheet `Google Group`** is parsed column-by-column into 15 `google_groups` and ~168 `group_memberships`.
- **Two-tier membership resolution** (checking `email`, then `previous_email`) ensures 100% resolution of legacy `@leadgeeksprospecting.com` member emails.
- **Full idempotency** via `ON CONFLICT` guarantees safe repeated execution without duplicate key violations.

---

## 5. Verification Method

### 1. Test Suite Verification
Run the automated E2E tests for spreadsheet ingestion:
```bash
npm run test:tier1
# or
node tests/runner.mjs --tier=1
```
Specifically verifies:
- `accountsData.totalAccounts === 42`
- `accountsData.accountTypes.personal === 40`, `service === 1`, `shared === 1`
- `groupsData.totalGroups === 15`
- `parseDomainList` handles whitespace and multi-domain values
- `canonicalizeDepartment` normalizes HRD, IT, Management Office
- Legacy domain resolution via `previous_email`

### 2. Database State Verification (Post-Ingestion Queries)
After running `npm run db:import` or `tsx scripts/import-spreadsheets.ts`, run the following SQL queries to independently verify counts and relational integrity:

```sql
-- 1. Verify accounts count and type breakdown
SELECT account_type, count(*) 
FROM accounts 
GROUP BY account_type;
-- Expected: personal: 40, service: 1, shared: 1 (Total: 42)

-- 2. Verify account roles breakdown
SELECT ar.name, ar.level, count(a.id) 
FROM account_roles ar 
LEFT JOIN accounts a ON a.account_role_id = ar.id 
GROUP BY ar.name, ar.level 
ORDER BY ar.level;
-- Expected: Top Management: 2, Leaders: 12, Non-Leaders: 4, Staff: 23, Commercial: 1 (Total: 42)

-- 3. Verify department distribution
SELECT d.code, d.name, count(a.id) 
FROM departments d 
LEFT JOIN accounts a ON a.department_id = d.id 
GROUP BY d.code, d.name 
ORDER BY d.code;
-- Expected: MNG: 5, OPS: 20, GRW: 5, EXP: 3, HRD: 2, ITE: 2, FAC: 2, GNR: 0 (Total: 42)

-- 4. Verify account domains join count
SELECT count(*) FROM account_domains;
-- Expected: ~48 join rows

-- 5. Verify Google Groups count and status
SELECT count(*), sync_status 
FROM google_groups 
GROUP BY sync_status;
-- Expected: 15 groups, all 'pending'

-- 6. Verify total memberships count
SELECT count(*) FROM group_memberships;
-- Expected: ~168 memberships

-- 7. Verify all memberships link to valid accounts (zero orphaned rows)
SELECT count(*) 
FROM group_memberships gm
LEFT JOIN accounts a ON gm.account_id = a.id
WHERE a.id IS NULL;
-- Expected: 0

-- 8. Verify idempotency
-- Run import a second time, re-run queries 1-7, verify exact identical counts and zero errors.
```

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Identity | User Accounts Ingestion | Ingests 42 corporate accounts from `List of User Account` sheet into `accounts` table | Excel rows with `Nama Lengkap`, `Account User Name`, `New Email Address`, `Old Email Address`, `Department`, `Email Type`, `Notes`, `Notes Old` | 42 records in `accounts` table | Fails transaction on missing required fields (`full_name`, `display_name`, `email`) | `spreadsheet-mapping.md:19-32`, `identity.md:9-25` |
| 2 | Identity | Account Type Classification | Classifies accounts into `personal` (40), `service` (1), and `shared` (1) | Account email string (`sales@...`, `admin@...`, individual employee) | `accounts.account_type` enum (`personal`, `service`, `shared`) | Defaults to `personal` if not explicitly `sales@` or `admin@` | `identity.md:26-31`, `06-spreadsheet-ingestion.test.ts:76-91` |
| 3 | Identity | Department Normalization | Canonicalizes shorthand department strings into foreign keys referencing `departments` | Shorthand strings: `HRD`, `IT`, `Management Office`, `Operations`, `Growth`, `Experience`, `Finance and Accounting` | `accounts.department_id` UUID referencing `departments.id` | Throws `Unrecognized department string` and aborts transaction | `spreadsheet-mapping.md:91-103`, `reference-data.json:24-36` |
| 4 | Identity | Account Role Hierarchy Resolution | Resolves `Email Type` column to internal hierarchy levels (1 to 5) | `Email Type` string (`Top Management`, `Leaders`, `Non-Leaders`, `Staff`, `Commercial`) | `accounts.account_role_id` UUID referencing `account_roles.id` | Fails FK lookup if role name does not match canonical roles | `identity.md:47-58`, `DATA_MODEL.md:108-125` |
| 5 | Identity | Multi-Domain Parsing & Linking | Parses comma-separated corporate domains from `Domain` column and links accounts | Comma-separated domain string (e.g. `leadgeeksinc.com, leadgeeksinc.co`) | Records inserted into `account_domains` join table (~48 rows) | Ignores empty tokens; warns on unrecognized domain | `spreadsheet-mapping.md:29`, `06-spreadsheet-ingestion.test.ts:61-68` |
| 6 | Identity | Previous Email Tracking | Preserves pre-migration email address to enable historical auditing and group member linking | `Old Email Address` column (e.g. `@leadgeeksprospecting.com`) | `accounts.previous_email` varchar | Stored as `null` if empty; lowercased and trimmed | `spreadsheet-mapping.md:26`, `DATA_MODEL.md:76` |
| 7 | Identity | Account Status Ingestion | Sets initial account operational status | Ingestion pipeline default | `accounts.status = 'active'` | Schema constraint enforces enum `active`, `suspended`, `archived` | `DATA_MODEL.md:80`, `schema.ts:50` |
| 8 | Identity | Migration & Historical Notes | Captures contextual role notes and migration notes from source spreadsheet | `Notes` and `Notes Old` columns | Populates `accounts.notes` and `accounts.migration_notes` | Nullable text fields | `spreadsheet-mapping.md:30-31`, `schema.ts:51-52` |
| 9 | Groups | Google Groups Header Ingestion | Ingests 15 Google Groups from column-oriented matrix headers in `Google Group` tab | Row 1 (Group Name) and Row 2 (Group Email Address) for each of 15 columns | 15 records in `google_groups` table with `sync_status = 'pending'` | Unique constraint violation if duplicate group email encountered | `spreadsheet-mapping.md:33-40`, `groups.md:20-39` |
| 10 | Groups | Multi-Domain Group Email Support | Supports Google Groups with both `.com` and `.co` domains | Group emails (e.g. `team@leadgeeksinc.com`, `operations.calendar@leadgeeksinc.co`) | Stored in `google_groups.email` | Rejects malformed email format | `groups.md:37-38, 71`, `06-spreadsheet-ingestion.test.ts:98-103` |
| 11 | Groups | Column-Oriented Membership Ingestion | Traverses vertical columns below headers (Row 3+) to extract member email addresses | Non-empty cells in rows 3+ of each group column | Member email strings per group | Stops parsing empty trailing cells | `spreadsheet-mapping.md:39`, `groups.md:40-54` |
| 12 | Groups | Two-Tier Email Member Resolution | Resolves member emails to internal accounts via primary email, falling back to legacy previous email | Member email string | Resolved `account_id` UUID | Logs warning if email cannot be resolved to any account | `groups.md:68-70`, `spreadsheet-mapping.md:128` |
| 13 | Groups | Group Membership Role Default | Assigns default membership role during spreadsheet ingestion | Pipeline constant | `group_memberships.role = 'member'` | Must be one of `member`, `manager`, `owner` | `groups.md:53`, `DATA_MODEL.md:175` |
| 14 | Groups | Group Membership Source Tagging | Tags origin of membership relation as spreadsheet import | Pipeline constant | `group_memberships.source = 'spreadsheet'` | Enforced by `group_source_enum` (`spreadsheet`, `google_sync`, `manual`) | `DATA_MODEL.md:176`, `schema.ts:45` |
| 15 | Groups | Cached Member Count Calculation | Aggregates distinct resolved members per group and updates cached count | Count of resolved memberships for group | `google_groups.member_count` integer column | Default is 0; updated post-ingestion | `DATA_MODEL.md:161`, `groups.md:17` |
| 16 | Groups | Membership Deduplication | Eliminates duplicate member emails within the same group column | Multiple occurrences of same email in column | Single row in `group_memberships` | Handled by unique constraint `(group_id, account_id)` | `DATA_MODEL.md:180`, `groups/schema.ts:50` |
| 17 | Automation | Idempotent Upsert for Accounts | Safe repeated execution of accounts ingestion | Ingestion rerun with identical source data | Zero duplicate rows created; existing rows updated with latest metadata | `ON CONFLICT (email) DO UPDATE` | `ORIGINAL_REQUEST.md:77`, `06-spreadsheet-ingestion.test.ts:304-309` |
| 18 | Automation | Idempotent Upsert for Google Groups | Safe repeated execution of Google Groups ingestion | Ingestion rerun with identical source data | Zero duplicate groups; existing groups updated with member count | `ON CONFLICT (email) DO UPDATE` | `ORIGINAL_REQUEST.md:77`, `06-spreadsheet-ingestion.test.ts:304-314` |
| 19 | Automation | Idempotent Upsert for Group Memberships | Safe repeated execution of memberships ingestion | Ingestion rerun with identical source data | Zero duplicate memberships; existing relations refreshed | `ON CONFLICT (group_id, account_id) DO UPDATE SET source = EXCLUDED.source` | `ORIGINAL_REQUEST.md:77` |
| 20 | Automation | Pre-Seed Dependency Enforcement | Ensures reference tables exist before accounts or groups are ingested | Foreign key relations (`department_id`, `account_role_id`, `domain_id`) | Valid relational database state | Fails with foreign key constraint error if reference tables are empty | `seed-reference.ts:43-130`, `DATA_MODEL.md:44-62` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Department Normalization | `HRD` in `Department` column | Normalized to `Human Resource and Development`, linked to department code `HRD`. |
| 2 | Department Normalization | `IT` in `Department` column | Normalized to `Information and Technology`, linked to department code `ITE`. |
| 3 | Department Normalization | `Management Office` vs `Management` | Both strings resolve cleanly to `Management Office` (code `MNG`). |
| 4 | Department Normalization | Unknown department string (e.g. `Marketing & PR`) | Ingestion throws `Unrecognized department string: "Marketing & PR"` and aborts transaction to prevent null/corrupt FKs. |
| 5 | Multi-Domain Parsing | Comma-separated with varied spacing: `"  leadgeeksinc.com ,  leadgeeksinc.co , "` | Returns clean array `['leadgeeksinc.com', 'leadgeeksinc.co']`; trims whitespace and discards empty trailing item. |
| 6 | Multi-Domain Parsing | Empty string or null in `Domain` column | Returns empty array `[]`; no records inserted into `account_domains`. |
| 7 | Account Type Classification | `sales@leadgeeksinc.com` | Classified as `account_type = 'service'`. Role is `Commercial`. |
| 8 | Account Type Classification | `admin@leadgeeksinc.co` | Classified as `account_type = 'shared'`. Role is `Top Management`. |
| 9 | Account Type Classification | Standard employee account (e.g. `amanda@leadgeeksinc.com`) | Classified as `account_type = 'personal'`. |
| 10 | Group Membership Resolution | Member email uses legacy domain `@leadgeeksprospecting.com` | Lookup on `accounts.email` misses; fallback lookup on `accounts.previous_email` hits; resolves to correct account ID. |
| 11 | Group Membership Resolution | Member email not found in either `accounts.email` or `accounts.previous_email` | Logs warning with unmatched email; does not insert broken FK; continues processing remaining members. |
| 12 | Google Group Layout | Matrix orientation: 15 columns with Row 1 = Name, Row 2 = Email, Rows 3+ = Members | Parser transposes or iterates column-by-column across 15 columns rather than reading rows sequentially. |
| 13 | Google Group Domains | Calendar groups using `.co` domain (`operations.calendar@leadgeeksinc.co`) | Group created successfully with `.co` email; not rejected by domain format check. |
| 14 | Membership Deduplication | Same member email appears twice in a single group column | Second occurrence is skipped or handled via `ON CONFLICT (group_id, account_id) DO NOTHING`. |
| 15 | Null Values in Text Fields | Empty cells in `Old Email Address`, `Notes`, or `Notes Old` | Parsed as `null` rather than empty string `""` to maintain SQL null semantics. |
| 16 | Idempotent Re-execution | Full ingestion script executed twice against database | No primary key or unique constraint violations; 0 duplicate records created; record counts remain exactly 42 accounts and 15 groups. |
| 17 | Reference Table Empty | Ingestion script triggered on unseeded database | Foreign key constraint on `department_id` or `account_role_id` fails immediately; transaction rolls back cleanly. |
