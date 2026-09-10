# Access Domain

Manages device credentials and access control for company resources.

---

## Entities

### Device Credential

Login credentials associated with a company device.

| Field | Description |
|-------|-------------|
| device_id | FK → devices (matched by asset_number) |
| login_email | Login account email |
| pin_hash | **Encrypted PIN.** Never stored in plain text. |
| pin_last_rotated_at | Last rotation date |

**31 credential records** in current spreadsheet.

**Security observations from spreadsheet data:**

- 28 of 31 devices share the same login email (`leadgeeksindonesia@gmail.com`)
- 27 of 31 devices share the same PIN
- 3 devices have unique PINs
- All PINs are stored in plain text in the source spreadsheet

---

## Security Requirements

See [ADR-004: Secrets Management](../adr/ADR-004-secrets-management.md).

Credentials in CORE must:

1. Be encrypted at rest
2. Require explicit authorization to reveal
3. Log every reveal action to audit
4. Require re-authentication for access
5. Track rotation dates

---

## Future Entities

### Access Record

Record of who can access which resource. Not yet in spreadsheets — to be built in Phase 5.

### Permission

A specific authorization grant. Not yet in spreadsheets — to be built in Phase 5.

### Secret Reference

Pointer to an encrypted credential in a secret manager. Not yet in spreadsheets — to be built in Phase 5.

---

## Relationships

- Device credentials link to devices (→ Assets module)
- Access records will link accounts to resources
- All credential operations logged to audit events (→ Audit module)

---

## Import Source

Spreadsheet: `List of Company Hardware Devices (Laptop).xlsx`
Sheet: `Access Login`
