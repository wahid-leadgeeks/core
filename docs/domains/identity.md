# Identity Domain

Manages company-owned accounts, domains, departments, and organizational identity.

---

## Entities

### Account

A company-owned user account.

| Field | Example |
|-------|---------|
| full_name | Jean Amanda Stevany Loupatty |
| display_name | Amanda Stevany |
| email | amanda@leadgeeksinc.com |
| previous_email | amanda@leadgeeksprospecting.com |
| account_type | personal, service, shared |
| department | Management Office |
| role | Top Management |
| status | active |

**42 accounts** in current spreadsheet.

Account types:

- **personal** — Individual employee accounts (40)
- **service** — Commercial/functional accounts like `sales@leadgeeksinc.com` (1)
- **shared** — Shared admin accounts like `admin@leadgeeksinc.co` (1)

### Department

Organizational unit within the company.

| Name | Code | Account Count |
|------|------|---------------|
| Management Office | MNG | 5 |
| Operations | OPS | 20 |
| Growth | GRW | 5 |
| Experience | EXP | 3 |
| Human Resource and Development | HRD | 2 |
| Information and Technology | ITE | 2 |
| Finance and Accounting | FAC | 2 |
| General | GNR | 0 (software-only) |

### Account Role

Hierarchy level within the organization.

| Name | Level | Count |
|------|-------|-------|
| Top Management | 1 | 2 |
| Leaders | 2 | 12 |
| Non-Leaders | 3 | 4 |
| Staff | 4 | 23 |
| Commercial | 5 | 1 |

### Domain

Company email domains.

| Domain | Primary | Usage |
|--------|---------|-------|
| leadgeeksinc.com | Yes | Leaders and above |
| leadgeeksinc.co | No | Staff accounts |
| leadgeeksprospecting.com | No | Legacy/migrated |

Accounts can belong to multiple domains (M2M via `account_domains`).

---

## Relationships

- Accounts belong to one department
- Accounts have one role
- Accounts belong to one or more domains
- Accounts are members of Google Groups (→ Groups module)
- Accounts are assigned devices (→ Assets module)
- Accounts use software (→ Software module)

---

## Import Source

Spreadsheet: `List of Accounts and Google Group Management.xlsx`
Sheet: `List of User Account`
