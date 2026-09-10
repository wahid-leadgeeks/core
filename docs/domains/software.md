# Software Domain

Manages company software applications, licenses, and subscriptions.

---

## Entities

### Application

A software product the company uses.

| Field | Example |
|-------|---------|
| name | Canva |
| department_id | FK → departments |
| category | design |
| subscription_type | free, paid, freemium |
| status | active, deprecated, evaluating |

**125 applications** in current spreadsheet across 7 departments.

### Applications by Department

| Department | Count | Examples |
|------------|-------|---------|
| General | 82 | 7-Zip, Gmail, Chrome, Canva, ChatGPT, Zoom, Slack |
| Operations | 11 | Salesforce, Outreach, YAMM, Sales Handy, MailFloss |
| Information and Technology | 9 | VS Code, Git, Google Analytics, Wordpress, Vultr |
| Growth | 7 | Adobe Premiere, Semrush, Helium10, CapCut, Yoast SEO |
| Experience | 6 | Udemy for Business, AWS, Coursera, IDX |
| Finance and Accounting | 4 | Accurate, BCA ebanking, Quickbooks, Paypal |
| Human Resource and Development | 3 | SIPP BPJS, EDABU, ExtendedForms |

### Subscription Types

From the Drop Down reference sheet:

- **Free** — No cost (e.g., 7-Zip, Chrome)
- **Paid** — Requires subscription (e.g., Accurate)

Most applications do not yet have subscription type data — to be populated in Phase 4.

---

## Future Entities

### License

A purchased license for an application. Not yet in spreadsheets — to be built in Phase 4.

| Field | Description |
|-------|-------------|
| application_id | FK → applications |
| license_key | Encrypted |
| seats | Number of allowed users |
| expires_at | Expiry date |

### Subscription

A recurring software subscription. Not yet in spreadsheets — to be built in Phase 4.

| Field | Description |
|-------|-------------|
| application_id | FK → applications |
| billing_cycle | monthly, annual |
| renewal_date | Next renewal |
| cost | Subscription cost |

### Software Assignment

Association between licenses and accounts. Not yet in spreadsheets — to be built in Phase 4.

---

## Relationships

- Applications belong to a department
- Applications will have licenses (1:M)
- Applications will have subscriptions (1:M)
- Licenses will be assigned to accounts (M:M)

---

## Import Source

Spreadsheet: `List of Softwares_Tools_Applications.xlsx`
Sheets: `List of Applications`, `Drop Down`
