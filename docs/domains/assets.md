# Assets Domain

Manages company-owned physical resources including laptops and equipment.

---

## Entities

### Device

A company laptop or hardware device.

| Field | Example |
|-------|---------|
| asset_number | LGI-CD-2024-042 |
| brand | LENOVO |
| model | LENOVO IDEAPAD SLIM 3 14AMN8 |
| computer_name | LeadGeeks-011 |
| status | assigned, available, reserve, decommissioned |
| purchased_at | 2024-06-25 |
| has_antivirus | true |

**31 devices** in current spreadsheet.

Brands: LENOVO (21), MSI (9), ASUS (1).

Status breakdown:

| Status | Count | Description |
|--------|-------|-------------|
| assigned | 26 | Has a named PIC |
| reserve | 2 | "Laptop cadangan" |
| available | 2 | PIC = N/A |
| decommissioned | 1 | "Akan dijual" (to be sold) |

### Device Specification

Technical details of a device. One-to-one with device.

| Field | Values |
|-------|--------|
| processor | Intel Core i3, Intel Core i5, AMD Ryzen 3, AMD Ryzen 5 |
| ram | 4 GB, 8 GB, 16 GB |
| storage | SSD 256 GB, SSD 512 GB |

### Device Assignment

Current and historical assignments of devices to accounts.

| Field | Description |
|-------|-------------|
| device_id | FK → devices |
| account_id | Primary assignee (PIC Name) |
| custodian_id | Secondary assignee (PIC 2 Name) |
| assigned_at | When assigned |
| returned_at | null = currently assigned |

Assignment matching is by first name → account display name.

---

## Asset Number Convention

Format: `LGI-CD-{YEAR}-{SEQ}`

- `LGI` — LeadGeeks Indonesia
- `CD` — Company Device
- `YEAR` — Purchase year
- `SEQ` — Sequential number

Range: LGI-CD-2021-002 through LGI-CD-2025-068.

---

## Relationships

- Devices have one specification (1:1)
- Devices have assignment history (1:M)
- Device assignments link to accounts
- Devices have credentials (→ Access module)

---

## Import Source

Spreadsheet: `List of Company Hardware Devices (Laptop).xlsx`
Sheet: `Laptop Information`
