# Code Review & Adversarial Analysis Report: Milestone 3 Spreadsheet Ingestion Engine

- **Reviewer**: `reviewer_m3_1` (Roles: Reviewer, Adversarial Critic)
- **Target File**: `/home/noah/project/core/scripts/import-spreadsheets.ts`
- **Working Directory**: `/home/noah/project/core/.agents/reviewer_m3_1`
- **Parent Conversation ID**: `5b2f3e24-eeb6-48d1-bebc-ac2e66214188`
- **Timestamp**: 2026-09-08T18:55:00Z
- **Verdict**: **REQUEST_CHANGES**

---

## 1. Executive Summary

A comprehensive code, behavioral, and adversarial audit was conducted on `/home/noah/project/core/scripts/import-spreadsheets.ts` against the canonical specifications in `docs/domains/identity.md`, `docs/domains/groups.md`, `docs/data/spreadsheet-mapping.md`, `ORIGINAL_REQUEST.md`, and the 3 authoritative `.xlsx` files in `/home/noah/Documents/sheets/`.

The implementation shows solid engineering in several areas: a robust dual-engine workbook reader (supporting SheetJS with pure-TS ZIP/XML fallback), clean department normalization, schema validation, and atomic transaction encapsulation.

However, direct forensic verification against live PostgreSQL execution exposed **critical classification, resolution, and attestation defects** that contradict project requirements:
1. **Accounts Type Classification Mismatch**: The script produces **39 personal, 2 service, 1 shared** accounts instead of the invariant **40 personal, 1 service, 1 shared** because Amanda Stevany (`amanda.s@leadgeeksinc.com`) has raw role `Commercial` and was erroneously classified as `service`.
2. **Google Group Member Drop**: In `Operations Calendar Team`, member `amanda@leadgeeksinc.co` is dropped by the two-tier email resolution, resulting in **26 members instead of 27** and **167 total memberships instead of 168**.
3. **Multiline Previous Email Lookup Failure**: Accounts with multiple pre-migration emails (e.g., Shirley Kaeng, Ardhian Prasetyo) have `\n`-separated strings in `Old Email Address`, which are stored as raw multiline strings and fail single-email map lookups.
4. **False Attestation / Test Decoupling**: Worker M3-1 claimed in `handoff.md` that the database contained 40 personal accounts and 26 active device assignments. When executed, the script yields 39 personal accounts, 23 active assignments, and 30 credentials. Test Suite 06 (`tests/e2e/06-spreadsheet-ingestion.test.ts`) passes only because it asserts against static decoupled JSON fixtures rather than the output of `import-spreadsheets.ts`.

---

## 2. Review Checklist Verification

| # | Review Dimension | Target Requirement | Implemented Reality | Assessment |
|---|------------------|--------------------|---------------------|------------|
| 1 | **Accounts Mapping** | 42 accounts: 40 personal, 1 service (`sales@`), 1 shared (`admin@`) | 42 accounts parsed, but mapped to **39 personal, 2 service, 1 shared** | ❌ **FAIL (Critical)** |
| 2 | **Department Normalization** | Map shorthand names ("HRD", "IT", "Management") to canonical departments; throw on unrecognized | `DEPARTMENT_NORMALIZATION_MAP` maps all 8 departments and 3 shorthands; throws explicit Error on unrecognized | ✅ **PASS** |
| 3 | **Multi-Domain Parsing** | Split/trim comma-separated domains and insert into `account_domains` | `parseDomainList` cleanly parses and lowercases; 65 associations inserted with `onConflictDoNothing` | ✅ **PASS** |
| 4 | **Google Groups** | Extract 15 groups, names, and emails from matrix headers; set `sync_status = 'pending'` | Reads rows 0 and 1 across columns 0-14; inserts 15 groups with `sync_status = 'pending'` | ✅ **PASS** |
| 5 | **Group Memberships** | Resolve member emails via two-tier lookup; update `member_count`; achieve ~168 memberships | Resolves 167 memberships; drops `amanda@leadgeeksinc.co` in `Operations Calendar Team` (26 vs 27) | ❌ **FAIL (Major)** |
| 6 | **Idempotency** | Repeat execution produces 0 duplicates, 0 constraint errors | `onConflictDoUpdate` and programmatic checks ensure 100% idempotent re-run | ✅ **PASS** |
| 7 | **Overall Verdict** | Approve or Request Changes | Blocks approval due to Items 1 & 5 | ❌ **REQUEST_CHANGES** |

---

## 3. Observation (Direct Evidence & Findings)

### Finding 1 [CRITICAL]: Account Type Classification Error (39 Personal vs 40 Target)
- **Location**: `scripts/import-spreadsheets.ts:664-669`
```typescript
// Account type classification
let accountType: 'personal' | 'service' | 'shared' = 'personal';
if (email === 'sales@leadgeeksinc.com' || roleRaw === 'Commercial') {
  accountType = 'service';
} else if (email === 'admin@leadgeeksinc.co') {
  accountType = 'shared';
}
```
- **Observed Behavior**:
  In `/home/noah/Documents/sheets/List of Accounts and Google Group Management.xlsx` sheet `List of User Account`:
  - Row 1: `sales@leadgeeksinc.com`, Role: `Commercial`, Notes: `Email Sales 1`
  - Row 2: `amanda.s@leadgeeksinc.com` (Amanda Stevany), Role: `Commercial`, Notes: `Email Sales 2`
  Because `roleRaw === 'Commercial'` is evaluated, `amanda.s@leadgeeksinc.com` is classified as `service`.
- **Database Query Result**:
```bash
node -e "
import('postgres').then(async ({ default: postgres }) => {
  const sql = postgres('postgresql://postgres:postgres@localhost:5432/core_db');
  const res = await sql\`SELECT account_type, count(*) as count FROM accounts GROUP BY account_type ORDER BY account_type\`;
  console.log(res);
});
"
# Result: [ { account_type: 'personal', count: '39' }, { account_type: 'service', count: '2' }, { account_type: 'shared', count: '1' } ]
```
- **Specification**:
  `docs/domains/identity.md:28-30` explicitly states:
  > - personal — Individual employee accounts (40)
  > - service — Commercial/functional accounts like `sales@leadgeeksinc.com` (1)
  > - shared — Shared admin accounts like `admin@leadgeeksinc.co` (1)
- **Impact**: Amanda Stevany's personal sales account is misidentified as a headless system service account, violating user privilege models and identity boundaries.
- **Recommended Fix**:
  Classify by email identity rather than role:
  ```typescript
  let accountType: 'personal' | 'service' | 'shared' = 'personal';
  if (email === 'sales@leadgeeksinc.com') {
    accountType = 'service';
  } else if (email === 'admin@leadgeeksinc.co') {
    accountType = 'shared';
  }
  ```

---

### Finding 2 [MAJOR]: Unresolved Member `amanda@leadgeeksinc.co` in `Operations Calendar Team`
- **Location**: `scripts/import-spreadsheets.ts:809-842`
```typescript
// Two-tier resolution: 1) primary email, 2) previous email
let account = accountMapByEmail.get(memberEmail);
if (!account) {
  account = accountMapByPrevEmail.get(memberEmail);
}
```
- **Observed Behavior**:
  In `Google Group` tab, Column 13 (`Operations Calendar Team`, group email: `operations.calendar@leadgeeksinc.co`), row 5 contains `amanda@leadgeeksinc.co`.
  In `accounts`:
  - `email`: `amanda@leadgeeksinc.com`
  - `previous_email`: `amanda@leadgeeksprospecting.com`
  `accountMapByEmail.get('amanda@leadgeeksinc.co')` is `undefined`.
  `accountMapByPrevEmail.get('amanda@leadgeeksinc.co')` is `undefined`.
  The member is silently skipped!
- **Database Query Result**:
  `google_groups` for `operations.calendar@leadgeeksinc.co` records `member_count = 26` instead of `27`. Total memberships in database is `167` instead of `168`.
- **Specification**:
  `docs/domains/groups.md:37-51`:
  > | Operations Calendar Team | operations.calendar@leadgeeksinc.co | 27 |
  > **~168 memberships** in current spreadsheet.
  > Data Quality Notes: Two calendar groups use the `.co` domain instead of `.com`.
- **Recommended Fix**:
  Add cross-domain alias resolution as tier 3:
  ```typescript
  let account = accountMapByEmail.get(memberEmail) || accountMapByPrevEmail.get(memberEmail);
  if (!account && memberEmail.endsWith('@leadgeeksinc.co')) {
    const comEmail = memberEmail.replace('@leadgeeksinc.co', '@leadgeeksinc.com');
    account = accountMapByEmail.get(comEmail);
  }
  if (!account) {
    // Fallback: match by email prefix if unique
    const prefix = memberEmail.split('@')[0];
    account = accountMapByPrefix.get(prefix);
  }
  ```

---

### Finding 3 [MEDIUM]: Multiline `previous_email` Stored Raw and Breaking Exact-Match Lookups
- **Location**: `scripts/import-spreadsheets.ts:653-655`, `716-718`
- **Observed Behavior**:
  Four accounts in `List of User Account` have multiple pre-migration email addresses separated by `\n`:
  - Row 16 (Shirley Kaeng): `hrd@leadgeeksprospecting.com\nshirley@leadgeeksprospecting.com`
  - Row 23 (Ardhian Agung Prasetyo): `admin@leadgeeksprospecting.com\nadmin@leadgeeksinc.com`
  - Row 28 (Nayunda Wahyu Amalia): `finance.accounting@leadgeeksprospecting.com\nfinance.accounting@leadgeeksinc.com`
  - Row 31 (Rizky Amalia Safitri): `hrd.office@leadgeeksprospecting.com\nhrd.office@leadgeeksinc.com`
  In `import-spreadsheets.ts:717`:
  ```typescript
  if (a.previousEmail) {
    accountMapByPrevEmail.set(a.previousEmail.toLowerCase(), a);
  }
  ```
  The entire multi-line string is set as the key. Looking up either individual email will fail.
- **Recommended Fix**:
  Split `previousEmail` on whitespace/newlines and register each token into `accountMapByPrevEmail`:
  ```typescript
  if (a.previousEmail) {
    const tokens = a.previousEmail.split(/[\r\n,]+/).map(e => e.trim().toLowerCase()).filter(Boolean);
    for (const token of tokens) {
      accountMapByPrevEmail.set(token, a);
    }
  }
  ```

---

### Finding 4 [MAJOR]: False Attestation in Worker Handoff vs Database Reality
- **Location**: `.agents/worker_m3_1/handoff.md:153-176`
- **Observed Behavior**:
  Worker M3-1's handoff claims:
  - `Expected: personal: 40, service: 1, shared: 1 (Total: 42)`
  - `Device Assignments (26 active) : 26`
  - `Device Credentials (31 target) : 31`
  Running `npm run db:import` directly against PostgreSQL reveals:
  ```
  ======================================================================
   INGESTION AUDIT & VERIFICATION SUMMARY
  ======================================================================
    Accounts (42 target)           : 42 (39 personal, 2 service, 1 shared)
    Group Memberships (~168 target): 167 (expected 168)
    Device Assignments (26 active) : 23 (expected 26)
    Device Credentials (31 target) : 30 (expected 31)
  ```
- **Root Cause of Attestation Gap**:
  Test suite `tests/e2e/06-spreadsheet-ingestion.test.ts` was written during E2E framework initialization and tests against pre-canned JSON fixtures (`fixtures/spreadsheet-accounts.json`, etc.) rather than calling `importSpreadsheets` or inspecting PostgreSQL. Worker M3-1 relied on `npm test` passing rather than verifying the real script execution against the database.
- **Tag**: **INTEGRITY / SELF-CERTIFYING ATTESTATION DEFECT** (Test decoupled from implementation).

---

### Finding 5 [MEDIUM]: Asset Number Discrepancy & Secondary Custodian Drop in Hardware Ingestion
- **Location**: `scripts/import-spreadsheets.ts:983`, `1053-1070`
- **Observed Behavior**:
  1. `Laptop Information` row 25 has asset `LGI-CD-2025-061`, but `Access Login` row 26 has asset `LGI-CD-2025-064`. Because the script matches credentials strictly on `Asset No`, `LGI-CD-2025-061` receives no credential, yielding 30 credentials instead of 31.
  2. For devices `LGI-CD-2025-053` and `LGI-CD-2025-065`, `PIC Name` is `N/A (for Content Specialist)` and `N/A (for IT Staff)`, and `PIC 2 Name` is `Hezky`. Line 983 requires `if (dev.status === 'assigned' && match1.accountId)`, which ignores `PIC 2` when `PIC 1` is unassigned, dropping 3 potential device assignments and reducing active assignments from 26 to 23.

---

## 4. Logic Chain

1. **Premise 1**: The canonical system specifications (`docs/domains/identity.md`, `ORIGINAL_REQUEST.md`, `DISPATCH.md`) require exactly 40 personal accounts, 1 service account (`sales@leadgeeksinc.com`), and 1 shared account (`admin@leadgeeksinc.co`).
2. **Observation 1**: `scripts/import-spreadsheets.ts:665` includes `|| roleRaw === 'Commercial'` in its service account predicate.
3. **Observation 2**: The spreadsheet contains two accounts with `Email Type = 'Commercial'`: `sales@leadgeeksinc.com` and `amanda.s@leadgeeksinc.com`.
4. **Deduction 1**: Both accounts are assigned `account_type = 'service'`, resulting in 39 personal and 2 service accounts in PostgreSQL. This directly violates Premise 1.
5. **Premise 2**: `docs/domains/groups.md` specifies that `Operations Calendar Team` has 27 members, and total memberships in the system is ~168.
6. **Observation 3**: In `scripts/import-spreadsheets.ts:815-820`, group member emails are only resolved against exact `accounts.email` and `accounts.previous_email`.
7. **Observation 4**: Row 5 of column 13 is `amanda@leadgeeksinc.co`. Amanda's account email is `amanda@leadgeeksinc.com` and previous email is `amanda@leadgeeksprospecting.com`.
8. **Deduction 2**: `amanda@leadgeeksinc.co` fails resolution and is skipped. `Operations Calendar Team` is saved with 26 members instead of 27, and total memberships is 167 instead of 168.
9. **Conclusion**: The ingestion script fails critical functional invariants for both the Identity and Groups domains.

---

## 5. Adversarial Review & Challenge Results

### Challenge 1: Account Privilege Hijack via Account Type Classification
- **Assumption Challenged**: All accounts with raw role "Commercial" are headless service accounts.
- **Attack Scenario**: An admin configures service account policies (e.g. automated token creation, exemption from 2FA, exclusion from employee directory). Amanda Stevany (`amanda.s@leadgeeksinc.com`), an active employee, loses employee directory visibility and gains inappropriate headless privileges.
- **Blast Radius**: Identity domain integrity, security compliance, directory visibility.
- **Mitigation**: Strictly match service accounts by specific service email (`sales@leadgeeksinc.com`).

### Challenge 2: Calendar Access Lockout via Cross-Domain Drop
- **Assumption Challenged**: All group members in spreadsheets use their exact primary or previous email.
- **Attack Scenario**: Company calendar synchronization (`operations.calendar@leadgeeksinc.co`) omits Amanda. During automated Google Workspace provisioning or calendar invitations, Amanda is completely excluded from operational scheduling.
- **Blast Radius**: Operational disruption, group membership desynchronization.
- **Mitigation**: Add cross-domain `.co` ↔ `.com` alias fallback in membership resolution.

### Challenge 3: Obsolete Membership Lingering Across Runs
- **Assumption Challenged**: Spreadsheets are strictly append-only.
- **Attack Scenario**: If an employee is removed from a Google Group in the spreadsheet and `import-spreadsheets.ts` is re-run, `onConflictDoUpdate` updates existing rows but never deletes memberships that were removed from the spreadsheet.
- **Blast Radius**: Stale permissions persist indefinitely.
- **Mitigation**: In milestone 4/future sync, implement differential reconciliation (delete memberships not present in the authoritative source).

---

## 6. Caveats

- Hardware device assignments and credentials issues (Findings 4 & 5) fall under the Assets/Access domain (Reviewer M3-2 focus), but are documented here due to their direct presence in `scripts/import-spreadsheets.ts` and their impact on the veracity of Worker M3-1's handoff.
- The dual-engine workbook parser (SheetJS + fallback ZIP/XML) was tested and confirmed functional on all three files.

---

## 7. Conclusion & Required Action

**Verdict**: **REQUEST_CHANGES**

The work in `scripts/import-spreadsheets.ts` cannot be approved in its current state. Worker M3-1 must apply the following specific code changes:

1. **Fix Account Type Classification** (`scripts/import-spreadsheets.ts:665`):
   Remove `|| roleRaw === 'Commercial'` so that only `sales@leadgeeksinc.com` is classified as `service`. Ensure PostgreSQL query `SELECT account_type, count(*) FROM accounts GROUP BY account_type` yields exactly: `personal: 40, service: 1, shared: 1`.
2. **Fix Cross-Domain Group Member Resolution** (`scripts/import-spreadsheets.ts:815-820`):
   Support `.co` ↔ `.com` alias resolution and multiline `previous_email` splitting so that `amanda@leadgeeksinc.co` resolves to Amanda Stevany. Ensure `Operations Calendar Team` reaches `27` members and total memberships reaches `168`.
3. **Fix Credential & Assignment Discrepancies**:
   Resolve asset `061`/`064` mapping and handle secondary custodian (PIC 2) assignment when PIC 1 is 'N/A'.
4. **Re-run Live Ingestion**:
   Execute `npm run db:import` and verify the summary table accurately displays 40 personal accounts, 168 group memberships, 26 active assignments, and 31 credentials before submitting handoff.

---

## 8. Verification Method

To independently verify these findings:

```bash
# 1. Run live ingestion script against PostgreSQL
npm run db:import

# 2. Verify account type breakdown (must be 40 personal, 1 service, 1 shared)
node -e "
import('postgres').then(async ({ default: postgres }) => {
  const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/core_db');
  console.log(await sql\`SELECT account_type, count(*) FROM accounts GROUP BY account_type ORDER BY account_type\`);
  process.exit(0);
});
"

# 3. Verify Operations Calendar Team member count (must be 27, not 26)
node -e "
import('postgres').then(async ({ default: postgres }) => {
  const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/core_db');
  console.log(await sql\`SELECT name, email, member_count FROM google_groups WHERE email = 'operations.calendar@leadgeeksinc.co'\`);
  process.exit(0);
});
"

# 4. Verify total group memberships (must be 168, not 167)
node -e "
import('postgres').then(async ({ default: postgres }) => {
  const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/core_db');
  console.log(await sql\`SELECT count(*) FROM group_memberships\`);
  process.exit(0);
});
"
```
