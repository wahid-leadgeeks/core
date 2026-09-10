# Spreadsheet → CORE Mapping Reference

This document describes how the original company spreadsheets map to CORE entities.

---

## Source Files

| Spreadsheet | Sheets |
|-------------|--------|
| List of Accounts and Google Group Management.xlsx | List of User Account, Google Group |
| List of Company Hardware Devices (Laptop).xlsx | Laptop Information, Access Login |
| List of Softwares_Tools_Applications.xlsx | List of Applications, Drop Down |

---

## Column Mapping

### List of User Account → `accounts`

| Spreadsheet Column | CORE Field | Notes |
|--------------------|------------|-------|
| Nama Lengkap | `accounts.full_name` | |
| Account User Name | `accounts.display_name` | |
| New Email Address | `accounts.email` | Unique |
| Old Email Address | `accounts.previous_email` | Pre-migration email |
| Department | `departments.name` → `accounts.department_id` | FK lookup |
| Email Type | `account_roles.name` → `accounts.account_role_id` | FK lookup |
| Domain | `domains.name` → `account_domains` | M2M, comma-separated in source |
| Notes | `accounts.notes` | |
| Notes Old | `accounts.migration_notes` | |

### Google Group → `google_groups` + `group_memberships`

| Spreadsheet Row | CORE Field | Notes |
|-----------------|------------|-------|
| Row 1 (header) | `google_groups.name` | Each column is one group |
| Row 2 | `google_groups.email` | |
| Row 3+ | `group_memberships.account_id` | Matched by email → accounts |

### Laptop Information → `devices` + `device_specifications` + `device_assignments`

| Spreadsheet Column | CORE Field | Notes |
|--------------------|------------|-------|
| No | — | Not imported |
| PIC Name | `device_assignments.account_id` | Fuzzy match by first name |
| PIC 2 Name | `device_assignments.custodian_id` | Secondary assignee |
| Asset No | `devices.asset_number` | Unique |
| Computer Brand and Type | `devices.model` | Brand parsed separately |
| Computer Name | `devices.computer_name` | |
| Processor | `device_specifications.processor` | |
| RAM | `device_specifications.ram` | |
| ROM | `device_specifications.storage` | |
| Purchasing Date | `devices.purchased_at` | |
| Notes | `devices.notes` | |
| Antivirus Checklist | `devices.has_antivirus` | Boolean |

### Access Login → `device_credentials`

| Spreadsheet Column | CORE Field | Notes |
|--------------------|------------|-------|
| No | — | Not imported |
| PIC Name | — | Resolved via device assignment |
| Asset No | `device_credentials.device_id` | FK matched by asset_number |
| Computer Brand and Type | — | Redundant with devices |
| Computer Name | — | Redundant with devices |
| Email | `device_credentials.login_email` | |
| PIN Password | `device_credentials.pin_hash` | **Must be encrypted during import** |
| Notes | `device_credentials.notes` | |

### List of Applications → `applications`

| Spreadsheet Column | CORE Field | Notes |
|--------------------|------------|-------|
| Department | `applications.department_id` | FK lookup |
| Applications/Tools | `applications.name` | Unique |
| Tool Details | `applications.description` | Mostly empty |
| Subscription Type | `applications.subscription_type` | Mostly empty, merge from Drop Down |

### Drop Down → Reference data

| Spreadsheet Column | CORE Field | Notes |
|--------------------|------------|-------|
| Code | `departments.code` | |
| Department | `departments.name` | |
| Applications/Tools | `applications.name` | Master list |
| Subscription Type | `applications.subscription_type` | `Free` or `Paid` |

---

## Department Name Normalization

| Accounts Sheet | Drop Down Sheet | CORE Canonical Name | Code |
|----------------|-----------------|---------------------|------|
| Management Office | Management | Management Office | MNG |
| Operations | Operations | Operations | OPS |
| Growth | Growth | Growth | GRW |
| Experience | Experience | Experience | EXP |
| HRD | Human Resource and Development | Human Resource and Development | HRD |
| IT | Information and Technology | Information and Technology | ITE |
| Finance and Accounting | Finance and Accounting | Finance and Accounting | FAC |
| — | General | General | GNR |

---

## Import Order

1. `domains` (3 records)
2. `departments` (8 records)
3. `account_roles` (5 records)
4. `accounts` (42 records)
5. `account_domains` (M2M links)
6. `google_groups` (15 records)
7. `group_memberships` (~168 records)
8. `devices` (31 records)
9. `device_specifications` (31 records)
10. `device_assignments` (linked to accounts by name)
11. `device_credentials` (31 records, PINs encrypted)
12. `applications` (125 records)

---

## Data Quality Notes

1. Department names are inconsistent across sheets — use normalization map above.
2. PIN passwords are stored in plain text in the spreadsheet — encrypt during import.
3. PIC names in laptop sheet are first-names only — fuzzy match to account display names.
4. Group member emails use mixed domains — match on both `email` and `previous_email`.
5. Most devices share the same login email and PIN — flag as security concern.
6. Subscription types are mostly empty — populate during Phase 4.
