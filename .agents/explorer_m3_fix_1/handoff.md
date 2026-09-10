# Investigation & Remediation Strategy Report: Identity & Groups Ingestion

- **Agent**: `explorer_m3_fix_1` (Remediation Explorer — Identity & Groups)
- **Working Directory**: `/home/noah/project/core/.agents/explorer_m3_fix_1`
- **Target File**: `/home/noah/project/core/scripts/import-spreadsheets.ts`
- **Parent Conversation ID**: `5b2f3e24-eeb6-48d1-bebc-ac2e66214188`
- **Timestamp**: 2026-09-08T19:00:00Z
- **Verdict**: **REMEDIATION STRATEGY FORMULATED (READY FOR IMPLEMENTATION)**

---

## Executive Summary

Following the forensic integrity audit by `auditor_m3_1` and code reviews by `reviewer_m3_1` and `reviewer_m3_2`, Milestone 3 failed due to verification discrepancies, account misclassification, and dropped Google Group memberships.

This investigation conducted a direct empirical audit against the live PostgreSQL database (`core_db`), the authoritative spreadsheet `/home/noah/Documents/sheets/List of Accounts and Google Group Management.xlsx`, and the codebase. We have diagnosed the root causes and formulated the exact code-level fix strategy for:
1. **Account Type Classification**: Restricting `service` classification strictly to `sales@leadgeeksinc.com`, classifying `admin@leadgeeksinc.co` as `shared`, and ensuring Amanda Stevany (`amanda.s@leadgeeksinc.com`) is classified as `personal`, achieving the canonical invariant of **40 personal, 1 service, 1 shared** (42 total accounts).
2. **Google Groups Member Resolution**: Resolving cross-domain `.co` ↔ `.com` aliases and parsing multiline/comma-separated `previous_email` tokens, achieving **27 members in Operations Calendar Team** and **168 total memberships** across all 15 Google Groups (0 dropped members).

---

## 1. Observation

### 1.1 Empirical PostgreSQL State (Pre-Remediation)

Direct query against the live PostgreSQL instance (`core_db`) revealed the following discrepancies:

```bash
# 1. Accounts by Account Type
psql "postgresql://postgres:postgres@localhost:5432/core_db" -c \
  "SELECT account_type, count(*) FROM accounts GROUP BY account_type ORDER BY account_type;"

 account_type | count 
--------------+-------
 personal     |    39
 service      |     2
 shared       |     1

# 2. Service Accounts List
psql "postgresql://postgres:postgres@localhost:5432/core_db" -c \
  "SELECT id, email, full_name, account_type FROM accounts WHERE account_type = 'service';"

                  id                  |           email            |    full_name     | account_type 
--------------------------------------+----------------------------+------------------+--------------
 51a9fcd7-09bc-402c-93d5-5b5c2cc77b6d | sales@leadgeeksinc.com     | LeadGeeks Sales  | service
 3b0b2223-723a-4c0f-bc65-a8033b3c0225 | amanda.s@leadgeeksinc.com  | Amanda Stevany   | service

# 3. Operations Calendar Team Member Count
psql "postgresql://postgres:postgres@localhost:5432/core_db" -c \
  "SELECT name, email, member_count FROM google_groups WHERE email = 'operations.calendar@leadgeeksinc.co';"

           name           |                 email                 | member_count 
--------------------------+---------------------------------------+--------------
 Operations Calendar Team | operations.calendar@leadgeeksinc.co   |           26

# 4. Total Group Memberships
psql "postgresql://postgres:postgres@localhost:5432/core_db" -c \
  "SELECT count(*) FROM group_memberships;"

 count 
-------
   167
```

### 1.2 Authoritative Source Spreadsheet Evidence

In `/home/noah/Documents/sheets/List of Accounts and Google Group Management.xlsx`:

#### A. Sheet `List of User Account`
- **Row 1**:
  - `Nama Lengkap`: `"LeadGeeks Sales"`
  - `Account User Name`: `"Leadgeeks Sales"`
  - `New Email Address`: `"sales@leadgeeksinc.com"`
  - `Old Email Address`: `"sales@leadgeeksprospecting.com"`
  - `Department`: `"Growth"`
  - `Email Type`: `"Commercial"`
  - `Notes`: `"Email Sales 1"`
- **Row 2**:
  - `Nama Lengkap`: `"Amanda Stevany"`
  - `Account User Name`: `"Amanda Stevany"`
  - `New Email Address`: `"amanda.s@leadgeeksinc.com"`
  - `Old Email Address`: `"amanda.s@leadgeeksprospecting.com"`
  - `Department`: `"Growth"`
  - `Email Type`: `"Commercial"`
  - `Notes`: `"Email Sales 2"`
- **Row 3**:
  - `Nama Lengkap`: `"Jean Amanda Stevany Loupatty"`
  - `Account User Name`: `"Amanda Loupatty"`
  - `New Email Address`: `"amanda@leadgeeksinc.com"`
  - `Old Email Address`: `"amanda@leadgeeksprospecting.com"`
  - `Department`: `"Management Office"`
  - `Email Type`: `"Top Management"`
  - `Domain`: `"leadgeeksprospecting.com, leadgeeksinc.com"`
- **Row 24**:
  - `Nama Lengkap`: `"LeadGeeks Indonesia"`
  - `New Email Address`: `"admin@leadgeeksinc.co"`
  - `Department`: `"IT"`
  - `Email Type`: `"Leaders"`
- **Multiline `Old Email Address` Rows**:
  - Row 16: `shirley@leadgeeksinc.com` → `"hrd@leadgeeksprospecting.com\nshirley@leadgeeksprospecting.com"`
  - Row 23: `ardhian@leadgeeksinc.com` → `"admin@leadgeeksprospecting.com\nadmin@leadgeeksinc.com"`
  - Row 28: `nayunda.a@leadgeeksinc.com` → `"finance.accounting@leadgeeksprospecting.com\nfinance.accounting@leadgeeksinc.com"`
  - Row 31: `rizky.a@leadgeeksinc.com` → `"hrd.office@leadgeeksprospecting.com\nhrd.office@leadgeeksinc.com"`

#### B. Sheet `Google Group`
- **Grid Layout**: Row 0 (Group Names, 15 columns), Row 1 (Group Emails, 15 columns), Rows 2+ (Member Emails).
- **Column 13**:
  - Group Name: `"Operations Calendar Team"`
  - Group Email: `"operations.calendar@leadgeeksinc.co"`
  - Non-empty member cells: **27 rows** (Rows 2 to 28).
  - Row 5: `"amanda@leadgeeksinc.co"`.
- **Total Non-Empty Member Cells Across All 15 Columns**: **168 cells**:
  - Col 0 (`team@leadgeeksinc.com`): 38
  - Col 1 (`management@leadgeeksinc.com`): 7
  - Col 2 (`leaders@leadgeeksinc.com`): 13
  - Col 3 (`geo.team@leadgeeksinc.com`): 13
  - Col 4 (`fba.team@leadgeeksinc.com`): 4
  - Col 5 (`growth.team@leadgeeksinc.com`): 9
  - Col 6 (`experience.team@leadgeeksinc.com`): 3
  - Col 7 (`hrd.team@leadgeeksinc.com`): 2
  - Col 8 (`finance.team@leadgeeksinc.com`): 1
  - Col 9 (`it.team@leadgeeksinc.com`): 2
  - Col 10 (`operations.team@leadgeeksinc.com`): 23
  - Col 11 (`operations.leaders@leadgeeksinc.com`): 6
  - Col 12 (`operations.members@leadgeeksinc.com`): 16
  - Col 13 (`operations.calendar@leadgeeksinc.co`): 27
  - Col 14 (`growth.calendar@leadgeeksinc.co`): 4
  - **Sum = 168**.

### 1.3 Target Code Defect Locations in `scripts/import-spreadsheets.ts`

1. **Defect 1 — Account Type Classification** (`scripts/import-spreadsheets.ts:663-670`):
   ```typescript
   // Account type classification
   let accountType: 'personal' | 'service' | 'shared' = 'personal';
   if (email === 'sales@leadgeeksinc.com' || roleRaw === 'Commercial') {
     accountType = 'service';
   } else if (email === 'admin@leadgeeksinc.co') {
     accountType = 'shared';
   }
   ```
   Checking `|| roleRaw === 'Commercial'` incorrectly captures Amanda Stevany (`amanda.s@leadgeeksinc.com`).

2. **Defect 2 — Incomplete `previousEmail` Map Population** (`scripts/import-spreadsheets.ts:716-718`):
   ```typescript
   if (a.previousEmail) {
     accountMapByPrevEmail.set(a.previousEmail.toLowerCase(), a);
   }
   ```
   Multiline and comma-separated previous emails are stored as a single literal string key containing `\n`, making individual address lookups fail.

3. **Defect 3 — Rigid Two-Tier Member Email Resolution** (`scripts/import-spreadsheets.ts:815-820`):
   ```typescript
   // Two-tier resolution: 1) primary email, 2) previous email
   let account = accountMapByEmail.get(memberEmail);
   if (!account) {
     account = accountMapByPrevEmail.get(memberEmail);
   }
   ```
   Fails to resolve cross-domain aliases like `amanda@leadgeeksinc.co` in `operations.calendar@leadgeeksinc.co`, dropping Amanda Loupatty and resulting in 26 members and 167 total memberships.

---

## 2. Logic Chain

1. **Canonical Specifications**:
   - `docs/domains/identity.md:28-30` defines:
     > - personal — Individual employee accounts (40)
     > - service — Commercial/functional accounts like `sales@leadgeeksinc.com` (1)
     > - shared — Shared admin accounts like `admin@leadgeeksinc.co` (1)
   - `docs/domains/groups.md:37,51` defines:
     > - Operations Calendar Team: `operations.calendar@leadgeeksinc.co` — 27 members
     > - Total: `~168 memberships` in current spreadsheet.
     > - Data Quality Notes: Two calendar groups use the `.co` domain instead of `.com`.
2. **Account Type Logic Trace**:
   - In `List of User Account`, there are 42 accounts.
   - Only `sales@leadgeeksinc.com` is a commercial/functional service account.
   - `amanda.s@leadgeeksinc.com` is Amanda Stevany, a human staff member in Growth. Her spreadsheet "Email Type" column was labeled `"Commercial"` purely because of her commercial sales role.
   - Testing `roleRaw === 'Commercial'` causes both accounts to become `service`, reducing `personal` to 39 and inflating `service` to 2.
   - **Fix**: Match `accountType = 'service'` exclusively on `email === 'sales@leadgeeksinc.com'`. This restores Amanda Stevany to `personal`, ensuring exactly 40 personal, 1 service, 1 shared.
3. **Group Member Resolution Logic Trace**:
   - The `Google Group` tab contains 168 non-empty cells across 15 columns.
   - In Column 13 (`operations.calendar@leadgeeksinc.co`), cell row 5 is `amanda@leadgeeksinc.co`.
   - In `accounts`, Amanda Loupatty's primary email is `amanda@leadgeeksinc.com` and previous email is `amanda@leadgeeksprospecting.com`.
   - Because `amanda@leadgeeksinc.co` is neither her primary nor previous email, the current two-tier lookup returns `undefined` and skips row 5.
   - Operations Calendar Team ends up with 26 members instead of 27, and total memberships ends up at 167 instead of 168.
   - By implementing cross-domain `.co` ↔ `.com` alias resolution (`amanda@leadgeeksinc.co` → `amanda@leadgeeksinc.com`) and username prefix matching as a fallback, `amanda@leadgeeksinc.co` successfully resolves to Amanda Loupatty.
   - In Column 6 (`experience.team@leadgeeksinc.com`), three members use `@leadgeeksprospecting.com` legacy addresses (`adi.h`, `bianca.g`, `theodora`). Splitting `previous_email` by whitespace/newlines/commas ensures all pre-migration email aliases map to their respective accounts.
   - With both fixes, all 168 cells resolve cleanly:
     - 164 resolve via Tier 1 (primary email)
     - 3 resolve via Tier 2 (previous email token)
     - 1 resolves via Tier 3 (cross-domain `.co` → `.com`)
     - Operations Calendar Team reaches 27 members.
     - Total memberships reaches 168.

---

## 3. Caveats

1. **Hardware & Software Ingestion Scope**:
   This report covers only the Identity and Groups domains. Hardware device assignment (PIC fuzzy matching for `Nuri`, `Tya`, `Kiki`), device credentials off-by-one asset matching (`LGI-CD-2025-061`/`064`), and software application subscription enrichments are in scope for peer explorers (`explorer_m3_fix_2` and `explorer_m3_fix_3`).
2. **Read-Only Exploration Constraint**:
   Per the explorer protocol, no source code files in `/home/noah/project/core/scripts/` were directly modified during this task. All code proposals are documented below for the remediation worker implementer.
3. **Adversarial Test Threshold Update**:
   In `tests/adversarial-stress-ingestion.mjs:129`, the script currently checks `if (Number(totalMemberships[0].count) !== 167)`. Once the group member resolution bug is fixed and 168 memberships are achieved, line 129 in the adversarial harness must be updated to check `!== 168` to pass cleanly.

---

## 4. Conclusion & Concrete Fix Strategy

### 4.1 Proposed Code Edits for `scripts/import-spreadsheets.ts`

The worker implementer should make the following contiguous edits to `/home/noah/project/core/scripts/import-spreadsheets.ts`:

#### Fix 1: Account Type Condition (Step 2)
**Location**: `scripts/import-spreadsheets.ts:677-684`

```typescript
<<<<<< BEFORE
      // Account type classification
      let accountType: 'personal' | 'service' | 'shared' = 'personal';
      if (email === 'sales@leadgeeksinc.com' || roleRaw === 'Commercial') {
        accountType = 'service';
      } else if (email === 'admin@leadgeeksinc.co') {
        accountType = 'shared';
      }
======
      // Account type classification (Invariant: exactly 40 personal, 1 service, 1 shared)
      let accountType: 'personal' | 'service' | 'shared' = 'personal';
      if (email === 'sales@leadgeeksinc.com') {
        accountType = 'service';
      } else if (email === 'admin@leadgeeksinc.co') {
        accountType = 'shared';
      }
>>>>>> AFTER
```

#### Fix 2: Multiline `previousEmail` Parsing and Account Prefix Map (Step 2 / Step 3 transition)
**Location**: `scripts/import-spreadsheets.ts:724-740`

```typescript
<<<<<< BEFORE
    const accountMapByEmail = new Map<string, (typeof schema.accounts.$inferSelect)>();
    const accountMapByPrevEmail = new Map<string, (typeof schema.accounts.$inferSelect)>();
    const accountListForPic: { id: string; email: string; displayName: string; fullName: string }[] = [];

    for (const a of insertedAccounts) {
      accountMapByEmail.set(a.email.toLowerCase(), a);
      if (a.previousEmail) {
        accountMapByPrevEmail.set(a.previousEmail.toLowerCase(), a);
      }
      accountListForPic.push({
        id: a.id,
        email: a.email.toLowerCase(),
        displayName: a.displayName,
        fullName: a.fullName,
      });
    }
======
    const accountMapByEmail = new Map<string, (typeof schema.accounts.$inferSelect)>();
    const accountMapByPrevEmail = new Map<string, (typeof schema.accounts.$inferSelect)>();
    const accountMapByPrefix = new Map<string, (typeof schema.accounts.$inferSelect)>();
    const accountListForPic: { id: string; email: string; displayName: string; fullName: string }[] = [];

    for (const a of insertedAccounts) {
      const emailLower = a.email.toLowerCase();
      accountMapByEmail.set(emailLower, a);

      // Register email username prefix (100% unique across all 42 accounts)
      const prefix = emailLower.split('@')[0];
      if (prefix) {
        accountMapByPrefix.set(prefix, a);
      }

      // Parse multiline and comma-separated previous emails into individual lookup tokens
      if (a.previousEmail) {
        const tokens = a.previousEmail
          .split(/[\r\n,]+/)
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
        for (const token of tokens) {
          accountMapByPrevEmail.set(token, a);
        }
      }

      accountListForPic.push({
        id: a.id,
        email: emailLower,
        displayName: a.displayName,
        fullName: a.fullName,
      });
    }
>>>>>> AFTER
```

#### Fix 3: Multi-Tier Group Member Resolution (Step 5)
**Location**: `scripts/import-spreadsheets.ts:830-845`

```typescript
<<<<<< BEFORE
        // Two-tier resolution: 1) primary email, 2) previous email
        let account = accountMapByEmail.get(memberEmail);
        if (!account) {
          account = accountMapByPrevEmail.get(memberEmail);
        }

        if (account) {
          distinctMembers.add(account.id);
======
        // Multi-tier member resolution:
        // Tier 1: Primary email exact match
        let account = accountMapByEmail.get(memberEmail);

        // Tier 2: Previous email token match (from newline/comma split)
        if (!account) {
          account = accountMapByPrevEmail.get(memberEmail);
        }

        // Tier 3: Cross-domain alias resolution (.co <-> .com <-> .prospecting)
        if (!account) {
          if (memberEmail.endsWith('@leadgeeksinc.co')) {
            const altCom = memberEmail.replace('@leadgeeksinc.co', '@leadgeeksinc.com');
            account = accountMapByEmail.get(altCom) || accountMapByPrevEmail.get(altCom);
          } else if (memberEmail.endsWith('@leadgeeksinc.com')) {
            const altCo = memberEmail.replace('@leadgeeksinc.com', '@leadgeeksinc.co');
            account = accountMapByEmail.get(altCo) || accountMapByPrevEmail.get(altCo);
          } else if (memberEmail.endsWith('@leadgeeksprospecting.com')) {
            const altCom = memberEmail.replace('@leadgeeksprospecting.com', '@leadgeeksinc.com');
            const altCo = memberEmail.replace('@leadgeeksprospecting.com', '@leadgeeksinc.co');
            account = accountMapByEmail.get(altCom) || accountMapByEmail.get(altCo);
          }
        }

        // Tier 4: Email prefix fallback (unique username matching)
        if (!account) {
          const prefix = memberEmail.split('@')[0];
          if (prefix) {
            account = accountMapByPrefix.get(prefix);
          }
        }

        if (account) {
          distinctMembers.add(account.id);
>>>>>> AFTER
```

#### Fix 4: Adversarial Test Harness Threshold (`tests/adversarial-stress-ingestion.mjs`)
**Location**: `tests/adversarial-stress-ingestion.mjs:129-136`

Update the expected membership count from 167 to 168:
```javascript
<<<<<< BEFORE
  if (Number(totalMemberships[0].count) !== 167) {
    findings.push({
      id: 'DEFECT-4',
      severity: 'LOW',
      title: 'Google Group Membership Count Mismatch',
      details: `Expected 167 resolved memberships. Actual: ${totalMemberships[0].count}.`
    });
  }
======
  if (Number(totalMemberships[0].count) !== 168) {
    findings.push({
      id: 'DEFECT-4',
      severity: 'LOW',
      title: 'Google Group Membership Count Mismatch',
      details: `Expected 168 resolved memberships. Actual: ${totalMemberships[0].count}.`
    });
  }
>>>>>> AFTER
```

---

## 5. Verification Method

To independently verify the implementation after the changes are applied:

### Step 1: Run Ingestion Pipeline
```bash
npm run db:import
```

### Step 2: Verify Account Type Breakdown (Must be exactly 40 / 1 / 1)
```bash
psql "postgresql://postgres:postgres@localhost:5432/core_db" -c \
  "SELECT account_type, count(*) FROM accounts GROUP BY account_type ORDER BY account_type;"
```
**Expected Output**:
```
 account_type | count 
--------------+-------
 personal     |    40
 service      |     1
 shared       |     1
```

### Step 3: Verify Amanda Stevany vs LeadGeeks Sales Classification
```bash
psql "postgresql://postgres:postgres@localhost:5432/core_db" -c \
  "SELECT email, full_name, account_type FROM accounts WHERE email IN ('sales@leadgeeksinc.com', 'amanda.s@leadgeeksinc.com', 'admin@leadgeeksinc.co');"
```
**Expected Output**:
```
           email            |    full_name     | account_type 
----------------------------+------------------+--------------
 sales@leadgeeksinc.com     | LeadGeeks Sales  | service
 amanda.s@leadgeeksinc.com  | Amanda Stevany   | personal
 admin@leadgeeksinc.co      | LeadGeeks Indonesia | shared
```

### Step 4: Verify Operations Calendar Team Member Count (Must be 27)
```bash
psql "postgresql://postgres:postgres@localhost:5432/core_db" -c \
  "SELECT name, email, member_count FROM google_groups WHERE email = 'operations.calendar@leadgeeksinc.co';"
```
**Expected Output**:
```
           name           |                 email                 | member_count 
--------------------------+---------------------------------------+--------------
 Operations Calendar Team | operations.calendar@leadgeeksinc.co   |           27
```

### Step 5: Verify Total Google Group Memberships (Must be 168)
```bash
psql "postgresql://postgres:postgres@localhost:5432/core_db" -c \
  "SELECT count(*) FROM group_memberships;"
```
**Expected Output**:
```
 count 
-------
   168
```

### Step 6: Verify Amanda Loupatty Membership in Operations Calendar Team
```bash
psql "postgresql://postgres:postgres@localhost:5432/core_db" -c \
  "SELECT a.email, a.full_name, g.name, g.email \
   FROM group_memberships gm \
   JOIN accounts a ON gm.account_id = a.id \
   JOIN google_groups g ON gm.group_id = g.id \
   WHERE g.email = 'operations.calendar@leadgeeksinc.co' AND a.email = 'amanda@leadgeeksinc.com';"
```
**Expected Output**: Exactly 1 record returned linking Amanda Loupatty to the group.

### Step 7: Verify Zero Plaintext PIN Leaks and Decryption Fidelity
```bash
psql "postgresql://postgres:postgres@localhost:5432/core_db" -c \
  "SELECT count(*) FROM device_credentials WHERE pin_hash NOT LIKE '%:%:%' AND pin_hash IS NOT NULL;"
```
**Expected Output**: `0`

### Step 8: Run Full Regression & Ingestion Test Suites
```bash
npm test
```
**Expected Output**: `182/182` tests pass with exit code 0.

### Invalidation Conditions
This strategy is invalidated if:
1. `SELECT account_type, count(*) FROM accounts GROUP BY account_type` produces any distribution other than `personal: 40, service: 1, shared: 1`.
2. `Operations Calendar Team` (`operations.calendar@leadgeeksinc.co`) has fewer than 27 members.
3. Total records in `group_memberships` is fewer than 168.
4. Amanda Stevany (`amanda.s@leadgeeksinc.com`) remains classified as `service`.
5. Re-running `npm run db:import` fails with duplicate key violations or increases row counts.
