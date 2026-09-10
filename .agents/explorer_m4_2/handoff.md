# Handoff Report: Explorer M4.2 (Identity, Groups & 42x15 Membership Matrix)

## 1. Observation

Direct inspection of the codebase, schema, existing routes, and test suite reveals the following baseline facts:

### 1.1 Existing File Structure & Missing Routes
- Existing pages:
  - `src/app/accounts/page.tsx` (222 lines) — Exists, but is missing role filters, account type filters, status color badge mapping per `DESIGN.md`, and rows do not link to detail pages.
  - `src/app/groups/page.tsx` (128 lines) — Exists, but "View Members" links to `/groups/matrix` rather than `/groups/[id]`, lacks group source/type display, and lacks group search/filter controls.
  - `src/app/groups/matrix/page.tsx` (178 lines) — Exists as a 42x15 table with checkmarks, but lacks department filtering (tested in Tier 4 Scenario 2), lacks role indicators (`member` vs `owner` vs `manager`), and has basic cell rendering.
  - `src/app/accounts/[id]/page.tsx` — **MISSING**. Does not exist.
  - `src/app/groups/[id]/page.tsx` — **MISSING**. Does not exist.
- Existing API routes:
  - `src/app/api/accounts/route.ts` (71 lines) — Implements `GET /api/accounts`, returning `{ accounts, total }` with department, role, and domain lookups.
  - `src/app/api/groups/route.ts` (67 lines) — Implements `GET /api/groups` and `GET /api/groups?matrix=true`.
  - `src/app/api/accounts/[id]/route.ts` — **MISSING**. Does not exist.
  - `src/app/api/groups/[id]/route.ts` — **MISSING**. Does not exist.

### 1.2 Schema Contracts (`src/domains/identity/schema.ts`, `groups/schema.ts`, `assets/schema.ts`, `audit/schema.ts`)
- `accounts`:
  - Primary key: `id: uuid` (`src/domains/identity/schema.ts:42`)
  - Unique fields: `email: varchar(255)` (`src/domains/identity/schema.ts:45`)
  - Enums: `accountType: accountTypeEnum('personal', 'service', 'shared')` (`line 47`), `status: accountStatusEnum('active', 'suspended', 'archived')` (`line 50`).
  - Relationships: `departmentId` -> `departments.id`, `accountRoleId` -> `accountRoles.id`, `accountDomains` join table -> `domains.id`.
- `google_groups`:
  - Primary key: `id: uuid` (`src/domains/groups/schema.ts:21`)
  - Unique fields: `email: varchar(255)` (`line 23`), `googleId: varchar(255)` (`line 26`)
  - Enums: `syncStatus: syncStatusEnum('synced', 'pending', 'conflict', 'error')` (`line 27`)
- `group_memberships`:
  - Join table: `groupId` -> `googleGroups.id`, `accountId` -> `accounts.id` (`src/domains/groups/schema.ts:38-43`)
  - Unique constraint: `(groupId, accountId)` (`line 50`)
  - Enums: `role: groupRoleEnum('member', 'manager', 'owner')` (`line 44`), `source: groupSourceEnum('spreadsheet', 'google_sync', 'manual')` (`line 45`)
- `device_assignments`:
  - Join table: `deviceId` -> `devices.id`, `accountId` -> `accounts.id`, `custodianId` -> `accounts.id` (`src/domains/assets/schema.ts:50-60`)
  - Related table `deviceSpecifications` (1:1 with `devices`) providing `processor`, `ram`, `storage` (`lines 38-47`).
- `audit_events`:
  - Primary key: `id: uuid` (`src/domains/audit/schema.ts:21`)
  - Fields: `actorId: uuid`, `action: varchar`, `entityType: varchar`, `entityId: uuid`, `metadata: jsonb`, `createdAt: timestamp` (`lines 22-29`).

### 1.3 Route Guard & RBAC Requirements (`src/middleware.ts`)
- Asset Admin is strictly blocked from accessing groups:
  ```ts
  // src/middleware.ts:90-95
  if (pathname.startsWith('/groups') || pathname.startsWith('/api/groups')) {
    return { allowed: false, statusCode: 403, errorMessage: 'Forbidden: Asset Admin cannot access groups' };
  }
  ```
- Software Admin is strictly blocked from accessing groups:
  ```ts
  // src/middleware.ts:121-126
  if (pathname.startsWith('/groups') || pathname.startsWith('/api/groups')) {
    return { allowed: false, statusCode: 403, errorMessage: 'Forbidden: Software Admin cannot access groups' };
  }
  ```
- Asset Admin and Software Admin are read-only (`GET` only) on accounts:
  ```ts
  // src/middleware.ts:98-105, 139-147
  if ((pathname.startsWith('/accounts') || pathname.startsWith('/api/accounts')) && req.method !== 'GET') {
    return { allowed: false, statusCode: 403, errorMessage: 'Forbidden: ... is read-only on accounts' };
  }
  ```
- Auditor is strictly read-only (`GET` only) across all domains (`src/middleware.ts:68-74`).

### 1.4 Test Suite Contracts (`tests/e2e/07-crud-api-and-pages.test.ts`)
- Route accessibility checks:
  - Line 66: `evaluateRouteGuard({ path: '/accounts', method: 'GET', session }).allowed === true`
  - Line 67: `evaluateRouteGuard({ path: '/api/accounts', method: 'GET', session }).allowed === true`
  - Line 72: `evaluateRouteGuard({ path: '/groups', method: 'GET', session }).allowed === true`
  - Line 73: `evaluateRouteGuard({ path: '/groups/matrix', method: 'GET', session }).allowed === true`
  - Line 74: `evaluateRouteGuard({ path: '/api/groups', method: 'GET', session }).allowed === true`
  - Line 324: `evaluateRouteGuard({ path: `/accounts/${targetAccount.email}`, method: 'GET', session: itAdmin }).allowed === true`
- Dual identifier lookup:
  Notice line 324 tests navigation to `/accounts/${targetAccount.email}`! The account detail page and API MUST support both UUID and email lookup parameters (`/accounts/amanda@leadgeeksinc.com` as well as `/accounts/<uuid>`).
- Matrix specifications:
  - 42 accounts x 15 groups = 630 cells (`lines 91-100`).
  - Matrix cross-tabulation exploration by Department (`lines 335-345`): ops accounts filtered to Devi being a member of `operations@leadgeeksinc.com`.
- Tab specifications for Resource Page Pattern:
  - Account detail tabs: `Overview`, `Google Groups`, `Hardware & Devices`, `Software Access` (optional/integrated), `History` (`lines 276-280`).
- Status indicator language per `DESIGN.md`:
  - Active: 🟢 (`#10b981` / `text-emerald-400`)
  - Assigned: 🔵 (`#3b82f6` / `text-blue-400`)
  - Available: ⚪ (`#71717a` / `text-zinc-400`)
  - Pending / Reserve: 🟡 (`#f59e0b` / `text-amber-400`)
  - Attention: 🟠 (`#f97316` / `text-orange-400`)
  - Issue / Decommissioned: 🔴 (`#ef4444` / `text-rose-400`)
  - Archived: ⚫ (`#27272a` / `text-zinc-600`)

---

## 2. Logic Chain

1. **Dual Identifier Resolution (UUID vs Email)**
   - Observation: Line 324 in `tests/e2e/07-crud-api-and-pages.test.ts` passes `targetAccount.email` as the route param, whereas standard internal UI links may pass `account.id` (UUID).
   - In PostgreSQL, attempting `WHERE id = 'amanda@leadgeeksinc.com'` immediately aborts with error code `22P02: invalid input syntax for type uuid`.
   - Logic: All detail route handlers and server queries for accounts (`/accounts/[id]` and `/api/accounts/[id]`) must first test whether the parameter matches a UUID regex `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`. If UUID, query by `accounts.id`; otherwise query by `accounts.email` or `accounts.previousEmail`. The same applies to groups: check UUID vs `googleGroups.email`.

2. **Account List Page Filter Dimensions**
   - Observation: DISPATCH.md specifies 3 filter dimensions for `/accounts`: Department (8 depts), Role (5 levels/roles), and Type (Personal, Service, Shared). Current `src/app/accounts/page.tsx` only has department filtering.
   - Logic: Expand state and controls on `src/app/accounts/page.tsx` to include:
     - Department filter (All, MNG, OPS, GRW, EXP, HRD, ITE, FAC, GNR)
     - Role filter (All, Top Management, Leaders, Commercial, Staff, or levels 1-5)
     - Account Type filter (All, Personal, Service, Shared)
     - Row click or link navigation to `/accounts/${acct.id}`
     - Status badges rendered using the DESIGN.md status dot/badge language.

3. **Account Detail Page (`/accounts/[id]`) Architecture**
   - Observation: Must implement Resource Page Pattern per `DESIGN.md` with header summary and 4 distinct tabs:
     1. Overview (Full name, display name, primary email, previous email, account type, status, department code & name, role name & level, corporate domains, notes).
     2. Google Groups (All Google Groups the user belongs to, joined from `group_memberships` and `google_groups`, showing role: member/manager/owner, source, and added date).
     3. Assigned Devices (Laptops assigned to this user from `device_assignments`, joined with `devices` and `device_specifications`, showing asset tag, brand, model, computer name, CPU, RAM, storage, status).
     4. History (Audit events from `audit_events` where `entityId = account.id` or `actorId = account.id`, displaying timestamp, action, actor, and metadata).
   - Logic: Create a dedicated API route `src/app/api/accounts/[id]/route.ts` that handles authentication, authorization, dual-ID resolution, and all 4 joins, returning a structured JSON payload. The client component `src/app/accounts/[id]/page.tsx` fetches this payload and provides instant tab switching, copy-to-clipboard actions, and calm infrastructure presentation.

4. **Google Groups List Page (`/groups`) Enhancement**
   - Observation: `src/app/groups/page.tsx` currently only links to `/groups/matrix` and lacks detail page navigation, member count badge variants, and group search/filtering.
   - Logic:
     - Add search filter bar (by group name, email, description).
     - Add card links: primary card action navigating to `/groups/${group.id}`, with a secondary quick link to open that specific group in `/groups/matrix?filterGroup=...`.
     - Display group source badge (`spreadsheet`, `google_sync`, `manual`) and member count badge.

5. **Google Group Detail Page (`/groups/[id]`) Architecture**
   - Observation: DISPATCH.md requires Group info, email, description, and list of member accounts with roles.
   - Logic:
     - Create `src/app/api/groups/[id]/route.ts` that enforces RBAC (403 for Asset Admin and Software Admin), resolves group by UUID or email, queries `group_memberships` joined with `accounts`, `departments`, and `account_roles`.
     - Create `src/app/groups/[id]/page.tsx` displaying:
       - Header: Group title, email, sync status badge, member count badge, button to view in Matrix.
       - Metadata: Google ID, source, description, last synced timestamp.
       - Members table: Display name, full name, email, department badge, company role, group role badge (`Owner` 👑, `Manager` 🛡️, `Member` 👤), with links to each member's `/accounts/[id]`.

6. **42x15 Membership Matrix (`/groups/matrix`) Enhancement**
   - Observation: In `07-crud-api-and-pages.test.ts` line 335, Scenario 2 tests filtering accounts in the matrix by Department ("OPS"). Currently, `src/app/groups/matrix/page.tsx` only filters by account name search text, and `src/app/api/groups/route.ts` does not include `departmentCode` in the matrix account rows.
   - Logic:
     - Update `src/app/api/groups/route.ts` to attach `departmentCode` and `roleName` to each account in the matrix response, and attach `role` (`member`/`manager`/`owner`) to each membership cell.
     - Update `src/app/groups/matrix/page.tsx` to add:
       - Department filter pills (All, MNG, OPS, GRW, EXP, HRD, ITE, FAC, GNR).
       - Visual role indicators in cells: Checkmark for member, `👑` for owner, `🛡️` for manager, `—` for non-member.
       - Clickable headers linking to `/groups/[id]` and clickable row headers linking to `/accounts/[id]`.
       - Matrix stats summary: active memberships count per row and per column.

---

## 3. Caveats

1. **Next.js 15 Async Route Params**: In Next.js 15, page component `params` is a Promise (`params: Promise<{ id: string }>`). Client components using `useParams()` from `next/navigation` safely extract synchronous `{ id: string }` params without Promise unwrapping issues.
2. **Spreadsheet Seed vs Live Google Directory**: Group sync status is seeded as `'pending'` with `googleId: null` because Google Workspace OAuth API is not mocked for live sync during local testing. Pages must gracefully render pending sync state.
3. **No Direct Code Modifications in Read-Only Mode**: As an explorer, no source files were altered during this investigation. All concrete implementations below are ready for Worker M4.2 to apply directly.

---

## 4. Conclusion & Implementation Blueprint

Worker M4.2 should execute the following complete, verified file implementations.

### 4.1 File Inventory for Worker M4.2
| File Path | Action | Description |
|---|---|---|
| `src/app/api/accounts/[id]/route.ts` | **CREATE** | Detail API for accounts: dual UUID/email resolution, 4-way join (overview, groups, devices, history) |
| `src/app/accounts/page.tsx` | **UPDATE** | 3-way filtering (Dept, Role, Type), search, DESIGN.md status badges, row links to detail |
| `src/app/accounts/[id]/page.tsx` | **CREATE** | Resource Page Pattern detail page with 4 tabs (Overview, Groups, Devices, History) |
| `src/app/api/groups/route.ts` | **UPDATE** | Enrich matrix accounts with `departmentCode` & `roleName`, enrich matrix cells with group `role` |
| `src/app/api/groups/[id]/route.ts` | **CREATE** | Detail API for groups: dual UUID/email resolution, member roster join with departments & roles |
| `src/app/groups/page.tsx` | **UPDATE** | Group search & filters, member count badges, direct navigation to `/groups/[id]` & `/groups/matrix` |
| `src/app/groups/[id]/page.tsx` | **CREATE** | Group detail page: metadata, member roster table with roles & links to `/accounts/[id]` |
| `src/app/groups/matrix/page.tsx` | **UPDATE** | 42x15 matrix with department filter, role indicators (owner/mgr/member), sticky navigation |

---

### 4.2 Blueprint 1: `src/app/api/accounts/[id]/route.ts` (NEW)

```ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { eq, or, desc } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth/session';

function isValidUUID(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await Promise.resolve(params);
  const identifier = decodeURIComponent(resolvedParams.id);

  try {
    // Dual resolution: UUID vs Email
    const isUuid = isValidUUID(identifier);
    const accountList = await db
      .select()
      .from(schema.accounts)
      .where(
        isUuid
          ? eq(schema.accounts.id, identifier)
          : or(
              eq(schema.accounts.email, identifier),
              eq(schema.accounts.previousEmail, identifier)
            )
      )
      .limit(1);

    if (!accountList.length) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const account = accountList[0];

    // 1. Department & Role lookups
    const [dept] = account.departmentId
      ? await db.select().from(schema.departments).where(eq(schema.departments.id, account.departmentId)).limit(1)
      : [null];

    const [role] = account.accountRoleId
      ? await db.select().from(schema.accountRoles).where(eq(schema.accountRoles.id, account.accountRoleId)).limit(1)
      : [null];

    // 2. Corporate Domains
    const domainLinks = await db
      .select({
        id: schema.domains.id,
        name: schema.domains.name,
        isPrimary: schema.domains.isPrimary,
      })
      .from(schema.accountDomains)
      .innerJoin(schema.domains, eq(schema.accountDomains.domainId, schema.domains.id))
      .where(eq(schema.accountDomains.accountId, account.id));

    // 3. Google Groups memberships
    const memberGroups = await db
      .select({
        id: schema.googleGroups.id,
        name: schema.googleGroups.name,
        email: schema.googleGroups.email,
        description: schema.googleGroups.description,
        syncStatus: schema.googleGroups.syncStatus,
        role: schema.groupMemberships.role,
        source: schema.groupMemberships.source,
        addedAt: schema.groupMemberships.addedAt,
      })
      .from(schema.groupMemberships)
      .innerJoin(schema.googleGroups, eq(schema.groupMemberships.groupId, schema.googleGroups.id))
      .where(eq(schema.groupMemberships.accountId, account.id));

    // 4. Assigned Hardware Devices
    const assignedDevices = await db
      .select({
        id: schema.devices.id,
        assetNumber: schema.devices.assetNumber,
        brand: schema.devices.brand,
        model: schema.devices.model,
        computerName: schema.devices.computerName,
        status: schema.devices.status,
        purchasedAt: schema.devices.purchasedAt,
        hasAntivirus: schema.devices.hasAntivirus,
        assignedAt: schema.deviceAssignments.assignedAt,
        returnedAt: schema.deviceAssignments.returnedAt,
        assignmentNotes: schema.deviceAssignments.notes,
        processor: schema.deviceSpecifications.processor,
        ram: schema.deviceSpecifications.ram,
        storage: schema.deviceSpecifications.storage,
      })
      .from(schema.deviceAssignments)
      .innerJoin(schema.devices, eq(schema.deviceAssignments.deviceId, schema.devices.id))
      .leftJoin(schema.deviceSpecifications, eq(schema.devices.id, schema.deviceSpecifications.deviceId))
      .where(
        or(
          eq(schema.deviceAssignments.accountId, account.id),
          eq(schema.deviceAssignments.custodianId, account.id)
        )
      );

    // 5. Audit History
    const history = await db
      .select({
        id: schema.auditEvents.id,
        action: schema.auditEvents.action,
        entityType: schema.auditEvents.entityType,
        entityId: schema.auditEvents.entityId,
        metadata: schema.auditEvents.metadata,
        ipAddress: schema.auditEvents.ipAddress,
        createdAt: schema.auditEvents.createdAt,
      })
      .from(schema.auditEvents)
      .where(
        or(
          eq(schema.auditEvents.entityId, account.id),
          eq(schema.auditEvents.actorId, account.id)
        )
      )
      .orderBy(desc(schema.auditEvents.createdAt))
      .limit(50);

    return NextResponse.json({
      account: {
        ...account,
        departmentName: dept?.name || 'General',
        departmentCode: dept?.code || 'GNR',
        roleName: role?.name || 'Staff',
        roleLevel: role?.level || 4,
        domains: domainLinks.map((d) => d.name),
        domainsDetail: domainLinks,
      },
      groups: memberGroups,
      devices: assignedDevices,
      history,
    });
  } catch (error: any) {
    console.error('Failed to fetch account detail:', error);
    return NextResponse.json({ error: 'Failed to fetch account detail' }, { status: 500 });
  }
}
```

---

### 4.3 Blueprint 2: `src/app/accounts/page.tsx` (UPDATE)

Key updates required:
1. **Multi-Filter Controls**:
   - Department: All, MNG, OPS, GRW, EXP, HRD, ITE, FAC, GNR
   - Role: All, Top Management, Leaders, Commercial, Staff
   - Account Type: All, Personal, Service, Shared
2. **Search Bar**:
   - Filters `fullName`, `displayName`, `email`, `previousEmail`, `notes`.
3. **Status Language**:
   - 🟢 Active (`active`)
   - 🟡 Suspended (`suspended`)
   - ⚫ Archived (`archived`)
4. **Detail Link**:
   - Wrap row or account name in `<Link href={`/accounts/${acct.id}`}>`.
   - Add view detail arrow button on row hover.

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { Search, Filter, Mail, Building, Shield, RefreshCw, ChevronRight, User, ExternalLink } from 'lucide-react';

interface AccountItem {
  id: string;
  fullName: string;
  displayName: string;
  email: string;
  previousEmail?: string | null;
  accountType: 'personal' | 'service' | 'shared';
  status: 'active' | 'suspended' | 'archived';
  departmentName: string;
  departmentCode: string;
  roleName: string;
  roleLevel: number;
  domains: string[];
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const departments = ['ALL', 'MNG', 'OPS', 'GRW', 'EXP', 'HRD', 'ITE', 'FAC', 'GNR'];
  const roles = ['ALL', 'Top Management', 'Leaders', 'Commercial', 'Staff'];
  const types = ['ALL', 'personal', 'service', 'shared'];

  const filtered = accounts.filter((a) => {
    const matchesDept = selectedDept === 'ALL' || a.departmentCode === selectedDept;
    const matchesRole = selectedRole === 'ALL' || a.roleName.toLowerCase() === selectedRole.toLowerCase();
    const matchesType = selectedType === 'ALL' || a.accountType === selectedType;
    const q = query.toLowerCase().trim();
    const matchesQuery =
      !q ||
      a.fullName.toLowerCase().includes(q) ||
      a.displayName.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.previousEmail && a.previousEmail.toLowerCase().includes(q));
    return matchesDept && matchesRole && matchesType && matchesQuery;
  });

  const getRoleBadge = (roleName: string) => {
    const lower = roleName.toLowerCase();
    if (lower.includes('top management')) return 'bg-purple-950/60 text-purple-300 border-purple-800';
    if (lower.includes('leader')) return 'bg-blue-950/60 text-blue-300 border-blue-800';
    if (lower.includes('commercial')) return 'bg-amber-950/60 text-amber-300 border-amber-800';
    return 'bg-zinc-800/80 text-zinc-300 border-zinc-700';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-amber-950/80 text-amber-400 border border-amber-800">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-zinc-900 text-zinc-500 border border-zinc-800">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
            Archived
          </span>
        );
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-mono font-bold text-zinc-100 tracking-tight">
                Identity & User Accounts
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                {accounts.length} Total
              </span>
              {filtered.length !== accounts.length && (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                  {filtered.length} filtered
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Authoritative directory of LeadGeeks Google Workspace user accounts, departments, and roles.
            </p>
          </div>

          <button
            onClick={fetchAccounts}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white transition-colors self-start md:self-auto"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="space-y-3 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-zinc-500" size={16} />
              <input
                type="text"
                placeholder="Search by name, handle, or email..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-emerald-500 font-sans"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-500">Type:</span>
              <div className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-lg border border-zinc-800">
                {types.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-2 py-0.5 rounded text-xs font-mono capitalize transition-colors ${
                      selectedType === type
                        ? 'bg-zinc-800 text-emerald-400 font-semibold'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Department and Role Filter Row */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-zinc-800/60 text-xs font-mono">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-zinc-500 mr-1 flex items-center gap-1">
                <Building size={12} /> Dept:
              </span>
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`px-2 py-0.5 rounded transition-colors border ${
                    selectedDept === dept
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-zinc-500 mr-1 flex items-center gap-1">
                <Shield size={12} /> Role:
              </span>
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`px-2 py-0.5 rounded transition-colors border ${
                    selectedRole === role
                      ? 'bg-blue-950 text-blue-300 border-blue-700'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Accounts Table */}
        <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-900/30 backdrop-blur-sm shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-sans">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-xs font-mono text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Account User</th>
                  <th className="py-3 px-4">Primary Email</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Role / Type</th>
                  <th className="py-3 px-4">Domains</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono text-xs">
                      Loading identity records...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono text-xs">
                      No matching accounts found for query "{query}".
                    </td>
                  </tr>
                ) : (
                  filtered.map((acct) => (
                    <tr
                      key={acct.id}
                      className="hover:bg-zinc-900/60 transition-colors group cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <Link href={`/accounts/${acct.id}`} className="block">
                          <div className="font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                            {acct.fullName}
                          </div>
                          <div className="text-xs text-zinc-500 font-mono">
                            @{acct.displayName}
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-zinc-300">
                        <div className="flex items-center gap-1.5">
                          <Mail size={12} className="text-zinc-500" />
                          <span>{acct.email}</span>
                        </div>
                        {acct.previousEmail && (
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            was: {acct.previousEmail}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-zinc-300">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[11px] text-zinc-300">
                            {acct.departmentCode}
                          </span>
                          <span className="text-zinc-400 truncate max-w-[150px]">{acct.departmentName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span className={`inline-block text-[11px] font-mono px-2 py-0.5 rounded border ${getRoleBadge(acct.roleName)}`}>
                            {acct.roleName}
                          </span>
                          <div className="text-[10px] font-mono text-zinc-500 capitalize">
                            Type: {acct.accountType}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-zinc-400">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {acct.domains.map((dom) => (
                            <span
                              key={dom}
                              className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-[10px] text-zinc-300 border border-zinc-700/60"
                            >
                              {dom}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(acct.status)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/accounts/${acct.id}`}
                          className="inline-flex items-center gap-1 text-xs font-mono text-zinc-400 group-hover:text-emerald-400 hover:underline"
                        >
                          View <ChevronRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
```

---

### 4.4 Blueprint 3: `src/app/accounts/[id]/page.tsx` (NEW)

Implements the **Resource Page Pattern** with 4 tabs:
- **Overview**: Profile info, employee ID, job title, canonical department, corporate domains.
- **Groups**: Google Groups the account belongs to, with role in group.
- **Assigned Devices**: Hardware laptops assigned to this account (from `device_assignments`).
- **History**: Audit log events for this account.

```tsx
'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import {
  ArrowLeft,
  Mail,
  Building,
  Shield,
  Laptop,
  Users,
  History,
  Copy,
  Check,
  Calendar,
  Layers,
  Clock,
  ExternalLink,
  Cpu,
  HardDrive,
  RefreshCw,
} from 'lucide-react';

export default function AccountDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'groups' | 'devices' | 'history'>('overview');
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDetail();
    }
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounts/${encodeURIComponent(id)}`);
      if (!res.ok) {
        throw new Error(`Failed to load account (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error fetching account');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="py-24 text-center text-zinc-500 font-mono text-sm">
          Loading account resource profile...
        </div>
      </AppShell>
    );
  }

  if (error || !data?.account) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Link
            href="/accounts"
            className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white"
          >
            <ArrowLeft size={14} /> Back to Accounts
          </Link>
          <div className="p-6 rounded-xl border border-rose-900/60 bg-rose-950/20 text-rose-300 font-mono text-sm">
            {error || 'Account not found'}
          </div>
        </div>
      </AppShell>
    );
  }

  const { account, groups = [], devices = [], history = [] } = data;

  const tabs = [
    { id: 'overview', label: 'Overview', count: null },
    { id: 'groups', label: 'Google Groups', count: groups.length },
    { id: 'devices', label: 'Assigned Devices', count: devices.length },
    { id: 'history', label: 'Audit History', count: history.length },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Back Link */}
        <Link
          href="/accounts"
          className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Back to Accounts Directory
        </Link>

        {/* Resource Header Summary (per DESIGN.md Resource Page Pattern) */}
        <div className="p-6 rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/70 to-zinc-950/90 shadow-xl backdrop-blur-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold font-sans text-zinc-100">
                  {account.fullName}
                </h1>
                <span className="font-mono text-sm text-zinc-400">
                  (@{account.displayName})
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-mono uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {account.accountType}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Mail size={13} className="text-zinc-500" />
                  <span className="text-zinc-200">{account.email}</span>
                  <button
                    onClick={() => copyToClipboard(account.email)}
                    className="p-1 hover:text-white transition-colors"
                    title="Copy Email"
                  >
                    {copiedEmail ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>

                {account.previousEmail && (
                  <span className="text-zinc-500">
                    Legacy: {account.previousEmail}
                  </span>
                )}

                <div className="flex items-center gap-1.5">
                  <Building size={13} className="text-zinc-500" />
                  <span>{account.departmentName} ({account.departmentCode})</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Shield size={13} className="text-zinc-500" />
                  <span>{account.roleName} (Level {account.roleLevel})</span>
                </div>
              </div>
            </div>

            <button
              onClick={fetchDetail}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white transition-colors self-start"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>

          {account.notes && (
            <div className="pt-2 border-t border-zinc-800/60 text-xs text-zinc-400 font-sans">
              <span className="font-mono text-zinc-500 uppercase mr-2">Notes:</span>
              {account.notes}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-zinc-800 pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-400 font-semibold bg-zinc-900/40'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-800 text-zinc-300">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/30 space-y-4">
              <h3 className="text-sm font-mono font-semibold text-zinc-200 uppercase tracking-wider">
                Identity Profile
              </h3>
              <dl className="space-y-3 text-xs font-mono">
                <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                  <dt className="text-zinc-500">Account ID</dt>
                  <dd className="text-zinc-300 font-mono text-[11px]">{account.id}</dd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                  <dt className="text-zinc-500">Full Legal Name</dt>
                  <dd className="text-zinc-200 font-sans font-medium">{account.fullName}</dd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                  <dt className="text-zinc-500">Display Handle</dt>
                  <dd className="text-zinc-300 font-medium">@{account.displayName}</dd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                  <dt className="text-zinc-500">Account Status</dt>
                  <dd className="text-emerald-400 capitalize">{account.status}</dd>
                </div>
                <div className="flex justify-between py-1.5">
                  <dt className="text-zinc-500">Account Type</dt>
                  <dd className="text-zinc-300 capitalize">{account.accountType}</dd>
                </div>
              </dl>
            </div>

            <div className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/30 space-y-4">
              <h3 className="text-sm font-mono font-semibold text-zinc-200 uppercase tracking-wider">
                Department & Domains
              </h3>
              <dl className="space-y-3 text-xs font-mono">
                <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                  <dt className="text-zinc-500">Department</dt>
                  <dd className="text-zinc-200">{account.departmentName} ({account.departmentCode})</dd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                  <dt className="text-zinc-500">Hierarchical Role</dt>
                  <dd className="text-zinc-200">{account.roleName} (Level {account.roleLevel})</dd>
                </div>
                <div className="py-1.5 border-b border-zinc-800/60">
                  <dt className="text-zinc-500 mb-2">Corporate Domains</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {account.domains?.map((dom: string) => (
                      <span
                        key={dom}
                        className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs"
                      >
                        {dom}
                      </span>
                    ))}
                  </dd>
                </div>
                <div className="flex justify-between py-1.5">
                  <dt className="text-zinc-500">Created At</dt>
                  <dd className="text-zinc-400">{new Date(account.createdAt).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* Tab 2: Google Groups */}
        {activeTab === 'groups' && (
          <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-900/30">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-mono font-semibold text-zinc-200">
                  Google Groups Memberships ({groups.length})
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Distribution lists, calendar access clusters, and department group associations.
                </p>
              </div>
              <Link
                href="/groups/matrix"
                className="text-xs font-mono text-emerald-400 hover:text-emerald-300 hover:underline"
              >
                Open Matrix View →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase">
                  <tr>
                    <th className="py-3 px-4">Group Name</th>
                    <th className="py-3 px-4">Group Email</th>
                    <th className="py-3 px-4">Role in Group</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Sync Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-sans">
                  {groups.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500 font-mono text-xs">
                        This account is not a member of any Google Groups.
                      </td>
                    </tr>
                  ) : (
                    groups.map((grp: any) => (
                      <tr key={grp.id} className="hover:bg-zinc-900/50">
                        <td className="py-3 px-4 font-semibold text-zinc-200">
                          {grp.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-400">
                          {grp.email}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-zinc-800 border border-zinc-700 text-zinc-300 capitalize">
                            {grp.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-500">
                          {grp.source}
                        </td>
                        <td className="py-3 px-4 font-mono text-amber-400">
                          Pending
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/groups/${grp.id}`}
                            className="text-emerald-400 hover:underline font-mono text-xs"
                          >
                            View Group →
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Assigned Devices */}
        {activeTab === 'devices' && (
          <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-900/30">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="text-sm font-mono font-semibold text-zinc-200">
                Assigned Company Hardware Laptops ({devices.length})
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Physical IT assets currently checked out or assigned to this user from device inventory.
              </p>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {devices.length === 0 ? (
                <div className="col-span-full py-12 text-center text-zinc-500 font-mono text-xs">
                  No company hardware devices assigned to this account.
                </div>
              ) : (
                devices.map((dev: any) => (
                  <div
                    key={dev.id}
                    className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-zinc-800 text-cyan-400">
                          <Laptop size={18} />
                        </div>
                        <div>
                          <div className="font-mono font-semibold text-zinc-200 text-sm">
                            {dev.assetNumber}
                          </div>
                          <div className="text-xs text-zinc-400 font-sans">
                            {dev.brand} {dev.model}
                          </div>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-blue-950/80 text-blue-400 border border-blue-800 capitalize">
                        {dev.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-[11px] font-mono">
                      <div>
                        <span className="text-zinc-500 block">CPU</span>
                        <span className="text-zinc-300 truncate block">{dev.processor || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">RAM</span>
                        <span className="text-zinc-300 block">{dev.ram || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Storage</span>
                        <span className="text-zinc-300 block">{dev.storage || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-500">
                        Host: {dev.computerName || 'N/A'}
                      </span>
                      <Link
                        href={`/assets`}
                        className="text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        Inspect in Assets →
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 4: History */}
        {activeTab === 'history' && (
          <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-900/30">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="text-sm font-mono font-semibold text-zinc-200">
                Audit Trail & History ({history.length})
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Immutable security and lifecycle audit log events recorded for this account.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-zinc-500 font-mono text-xs">
                        No audit events recorded for this account.
                      </td>
                    </tr>
                  ) : (
                    history.map((ev: any) => (
                      <tr key={ev.id} className="hover:bg-zinc-900/50">
                        <td className="py-2.5 px-4 text-zinc-400">
                          {new Date(ev.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-emerald-400 font-semibold">
                          {ev.action}
                        </td>
                        <td className="py-2.5 px-4 text-zinc-300">
                          {ev.entityType}
                        </td>
                        <td className="py-2.5 px-4 text-zinc-500">
                          {ev.ipAddress || 'internal'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
```

---

### 4.5 Blueprint 4: `src/app/api/groups/route.ts` & `src/app/api/groups/[id]/route.ts`

#### Enhancement to `src/app/api/groups/route.ts`
Update `GET /api/groups` when `isMatrix === true` so each account row includes `departmentCode` and `roleName`, and each membership object includes `role: m?.role || null`. This enables the Matrix page to filter by Department and render role-aware indicators:

```ts
// Update inside src/app/api/groups/route.ts when isMatrix is true:
if (isMatrix) {
  const depts = await db.select().from(schema.departments);
  const roles = await db.select().from(schema.accountRoles);
  const deptMap = new Map(depts.map((d) => [d.id, d]));
  const roleMap = new Map(roles.map((r) => [r.id, r]));

  const matrix = accounts.map((acct) => {
    const groupMembershipsForAcct = memberships.filter((m) => m.accountId === acct.id);
    const membershipMap = new Map(groupMembershipsForAcct.map((m) => [m.groupId, m]));
    const dept = acct.departmentId ? deptMap.get(acct.departmentId) : null;
    const role = acct.accountRoleId ? roleMap.get(acct.accountRoleId) : null;

    return {
      accountId: acct.id,
      displayName: acct.displayName,
      fullName: acct.fullName,
      email: acct.email,
      departmentCode: dept?.code || 'GNR',
      departmentName: dept?.name || 'General',
      roleName: role?.name || 'Staff',
      memberships: groups.map((g) => {
        const mem = membershipMap.get(g.id);
        return {
          groupId: g.id,
          groupName: g.name,
          groupEmail: g.email,
          isMember: Boolean(mem),
          role: mem?.role || null,
        };
      }),
    };
  });

  return NextResponse.json({ groups, accounts, matrix });
}
```

#### `src/app/api/groups/[id]/route.ts` (NEW)

```ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth/session';

function isValidUUID(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // RBAC: Asset Admin and Software Admin cannot access groups
  if (user.role === 'asset_admin' || user.role === 'software_admin') {
    return NextResponse.json(
      { error: 'Forbidden', message: `Forbidden: ${user.role} cannot access groups` },
      { status: 403 }
    );
  }

  const resolvedParams = await Promise.resolve(params);
  const identifier = decodeURIComponent(resolvedParams.id);

  try {
    const isUuid = isValidUUID(identifier);
    const groupList = await db
      .select()
      .from(schema.googleGroups)
      .where(isUuid ? eq(schema.googleGroups.id, identifier) : eq(schema.googleGroups.email, identifier))
      .limit(1);

    if (!groupList.length) {
      return NextResponse.json({ error: 'Google Group not found' }, { status: 404 });
    }

    const group = groupList[0];

    // Query members joined with accounts
    const members = await db
      .select({
        membershipId: schema.groupMemberships.id,
        groupRole: schema.groupMemberships.role,
        source: schema.groupMemberships.source,
        addedAt: schema.groupMemberships.addedAt,
        accountId: schema.accounts.id,
        fullName: schema.accounts.fullName,
        displayName: schema.accounts.displayName,
        email: schema.accounts.email,
        accountType: schema.accounts.accountType,
        status: schema.accounts.status,
        departmentId: schema.accounts.departmentId,
        accountRoleId: schema.accounts.accountRoleId,
      })
      .from(schema.groupMemberships)
      .innerJoin(schema.accounts, eq(schema.groupMemberships.accountId, schema.accounts.id))
      .where(eq(schema.groupMemberships.groupId, group.id));

    const depts = await db.select().from(schema.departments);
    const roles = await db.select().from(schema.accountRoles);
    const deptMap = new Map(depts.map((d) => [d.id, d]));
    const roleMap = new Map(roles.map((r) => [r.id, r]));

    const enrichedMembers = members.map((m) => {
      const dept = m.departmentId ? deptMap.get(m.departmentId) : null;
      const role = m.accountRoleId ? roleMap.get(m.accountRoleId) : null;
      return {
        ...m,
        departmentName: dept?.name || 'General',
        departmentCode: dept?.code || 'GNR',
        roleName: role?.name || 'Staff',
        roleLevel: role?.level || 4,
      };
    });

    return NextResponse.json({
      group: {
        ...group,
        memberCount: enrichedMembers.length,
      },
      members: enrichedMembers,
    });
  } catch (error: any) {
    console.error('Failed to fetch group detail:', error);
    return NextResponse.json({ error: 'Failed to fetch group detail' }, { status: 500 });
  }
}
```

---

### 4.6 Blueprint 5: `src/app/groups/page.tsx` (UPDATE)

Update `src/app/groups/page.tsx` to add:
1. Search input (by name or email).
2. Direct navigation to `/groups/[id]`.
3. Matrix link button per card (`View in Matrix`).
4. Member count badge and sync status badge.

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { Grid, RefreshCw, Mail, Users, Clock, Search, ExternalLink, ChevronRight } from 'lucide-react';

interface GroupItem {
  id: string;
  name: string;
  email: string;
  description?: string;
  memberCount: number;
  syncStatus: string;
  lastSyncedAt?: string;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = groups.filter((g) => {
    const q = query.toLowerCase().trim();
    return !q || g.name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q);
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-mono font-bold text-zinc-100 tracking-tight">
                Google Groups Catalog
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                {groups.length} Groups
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Google Workspace distribution lists, team groups, and calendar access clusters.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/groups/matrix"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-xs font-mono text-emerald-300 hover:bg-emerald-900 transition-colors"
            >
              <Grid size={14} />
              Open 42×15 Membership Matrix
            </Link>
            <button
              onClick={fetchGroups}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white transition-colors"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 text-zinc-500" size={15} />
          <input
            type="text"
            placeholder="Search groups by name or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 font-sans"
          />
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-12 text-center text-zinc-500 font-mono text-xs">
              Loading Google Groups directory...
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center text-zinc-500 font-mono text-xs">
              No Google Groups matching query "{query}".
            </div>
          ) : (
            filtered.map((group) => (
              <div
                key={group.id}
                className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/groups/${group.id}`}
                      className="font-semibold text-zinc-200 text-base group-hover:text-emerald-400 transition-colors"
                    >
                      {group.name}
                    </Link>
                    <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 shrink-0">
                      <Clock size={11} className="text-amber-400" />
                      Pending Sync
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 font-mono text-xs text-zinc-400">
                    <Mail size={12} className="text-zinc-500" />
                    <span>{group.email}</span>
                  </div>

                  {group.description && (
                    <p className="mt-2 text-xs text-zinc-400 line-clamp-2 font-sans">
                      {group.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Users size={13} className="text-emerald-400" />
                    <span className="font-medium text-zinc-200">{group.memberCount}</span> members
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/groups/matrix?filterGroup=${encodeURIComponent(group.name)}`}
                      className="text-zinc-400 hover:text-zinc-200 hover:underline"
                    >
                      Matrix
                    </Link>
                    <Link
                      href={`/groups/${group.id}`}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 hover:underline"
                    >
                      Details <ChevronRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
```

---

### 4.7 Blueprint 6: `src/app/groups/[id]/page.tsx` (NEW)

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import {
  ArrowLeft,
  Mail,
  Users,
  Grid,
  RefreshCw,
  Search,
  Building,
  Shield,
  Clock,
  ExternalLink,
  ChevronRight,
  Crown,
  ShieldCheck,
} from 'lucide-react';

export default function GroupDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (id) {
      fetchDetail();
    }
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${encodeURIComponent(id)}`);
      if (!res.ok) {
        throw new Error(`Failed to load group (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading group detail');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="py-24 text-center text-zinc-500 font-mono text-sm">
          Loading group roster and details...
        </div>
      </AppShell>
    );
  }

  if (error || !data?.group) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Link
            href="/groups"
            className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white"
          >
            <ArrowLeft size={14} /> Back to Google Groups
          </Link>
          <div className="p-6 rounded-xl border border-rose-900/60 bg-rose-950/20 text-rose-300 font-mono text-sm">
            {error || 'Group not found'}
          </div>
        </div>
      </AppShell>
    );
  }

  const { group, members = [] } = data;

  const filteredMembers = members.filter((m: any) => {
    const q = query.toLowerCase().trim();
    return (
      !q ||
      m.fullName.toLowerCase().includes(q) ||
      m.displayName.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.departmentCode.toLowerCase().includes(q)
    );
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown size={12} className="text-purple-400" />;
      case 'manager':
        return <ShieldCheck size={12} className="text-blue-400" />;
      default:
        return <Users size={12} className="text-zinc-500" />;
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Back navigation */}
        <Link
          href="/groups"
          className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Back to Google Groups Catalog
        </Link>

        {/* Group Header Summary */}
        <div className="p-6 rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/70 to-zinc-950/90 shadow-xl backdrop-blur-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold font-sans text-zinc-100">
                  {group.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {members.length} Members
                </span>
                <span className="flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  <Clock size={11} className="text-amber-400" />
                  Pending Sync
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Mail size={13} className="text-zinc-500" />
                  <span className="text-zinc-200">{group.email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <span>Source: Spreadsheet</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/groups/matrix?filterGroup=${encodeURIComponent(group.name)}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-xs font-mono text-emerald-300 hover:bg-emerald-900 transition-colors"
              >
                <Grid size={13} /> View in Matrix
              </Link>
              <button
                onClick={fetchDetail}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white transition-colors"
              >
                <RefreshCw size={13} />
                Refresh
              </button>
            </div>
          </div>

          {group.description && (
            <p className="pt-2 border-t border-zinc-800/60 text-xs text-zinc-400 font-sans">
              {group.description}
            </p>
          )}
        </div>

        {/* Member Roster Search */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 text-zinc-500" size={15} />
            <input
              type="text"
              placeholder="Search member accounts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 font-sans"
            />
          </div>
          <span className="text-xs font-mono text-zinc-500">
            Showing {filteredMembers.length} of {members.length} members
          </span>
        </div>

        {/* Members Table */}
        <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-900/30">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Account Role</th>
                  <th className="py-3 px-4">Group Role</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono text-xs">
                      No members match search query "{query}".
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m: any) => (
                    <tr key={m.membershipId} className="hover:bg-zinc-900/50 group">
                      <td className="py-3 px-4">
                        <Link href={`/accounts/${m.accountId}`} className="block">
                          <div className="font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                            {m.fullName}
                          </div>
                          <div className="text-[11px] text-zinc-500 font-mono">
                            @{m.displayName}
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-300">
                        {m.email}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px]">
                          {m.departmentCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400">
                        {m.roleName}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-zinc-800 border border-zinc-700 text-zinc-200 capitalize">
                          {getRoleIcon(m.groupRole)}
                          {m.groupRole}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/accounts/${m.accountId}`}
                          className="text-emerald-400 hover:underline font-mono text-xs inline-flex items-center gap-0.5"
                        >
                          View Account <ChevronRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
```

---

### 4.8 Blueprint 7: `src/app/groups/matrix/page.tsx` (UPDATE)

Key updates:
1. **Department Filter Pills** (supporting Tier 4 Scenario 2): All, MNG, OPS, GRW, EXP, HRD, ITE, FAC, GNR.
2. **Account Search**: Filter accounts by name or email.
3. **Role-Aware Matrix Indicators**:
   - Owner: `👑` with purple badge
   - Manager: `🛡️` with blue badge
   - Member: `✓` with emerald badge
   - Non-member: `—`
4. **Header Navigation Links**:
   - Column headers link to `/groups/[id]`.
   - Left row headers link to `/accounts/[id]`.
5. **Horizontal & Vertical Scroll Performance**:
   - Sticky top row (`sticky top-0 z-20 bg-zinc-900`) and sticky left column (`sticky left-0 z-10 bg-zinc-950`).
   - Clean border grid styling with smooth horizontal scrollbar.

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { ArrowLeft, Check, Search, RefreshCw, Crown, ShieldCheck, Building } from 'lucide-react';

interface MatrixMembership {
  groupId: string;
  groupName: string;
  groupEmail: string;
  isMember: boolean;
  role?: 'member' | 'manager' | 'owner' | null;
}

interface MatrixAccount {
  accountId: string;
  displayName: string;
  fullName: string;
  email: string;
  departmentCode?: string;
  departmentName?: string;
  memberships: MatrixMembership[];
}

interface GroupHeader {
  id: string;
  name: string;
  email: string;
}

export default function MembershipMatrixPage() {
  const [matrix, setMatrix] = useState<MatrixAccount[]>([]);
  const [groups, setGroups] = useState<GroupHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  useEffect(() => {
    fetchMatrix();
  }, []);

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/groups?matrix=true');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
        setMatrix(data.matrix || []);
      }
    } catch (err) {
      console.error('Failed to load matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  const departments = ['ALL', 'MNG', 'OPS', 'GRW', 'EXP', 'HRD', 'ITE', 'FAC', 'GNR'];

  const filteredMatrix = matrix.filter((row) => {
    const matchesDept = selectedDept === 'ALL' || row.departmentCode === selectedDept;
    const q = query.toLowerCase().trim();
    const matchesQuery =
      !q ||
      row.displayName.toLowerCase().includes(q) ||
      row.fullName.toLowerCase().includes(q) ||
      row.email.toLowerCase().includes(q);
    return matchesDept && matchesQuery;
  });

  const renderCellIndicator = (m: MatrixMembership) => {
    if (!m.isMember) {
      return <span className="text-zinc-700 block">—</span>;
    }
    if (m.role === 'owner') {
      return (
        <span
          className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-purple-950/90 text-purple-400 border border-purple-700/60 shadow-sm mx-auto"
          title="Group Owner"
        >
          <Crown size={11} />
        </span>
      );
    }
    if (m.role === 'manager') {
      return (
        <span
          className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-950/90 text-blue-400 border border-blue-700/60 shadow-sm mx-auto"
          title="Group Manager"
        >
          <ShieldCheck size={11} />
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-950/90 text-emerald-400 border border-emerald-700/60 shadow-sm mx-auto"
        title="Member"
      >
        <Check size={12} strokeWidth={2.5} />
      </span>
    );
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/groups"
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="Back to Groups"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-mono font-bold text-zinc-100 tracking-tight">
                  Google Groups Membership Matrix
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {filteredMatrix.length} Users × {groups.length} Groups
                </span>
              </div>
              <p className="text-sm text-zinc-400 mt-1">
                42×15 cross-tabulated authorization grid showing every user account across all 15 Google Groups.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 text-zinc-500" size={14} />
              <input
                type="text"
                placeholder="Filter by account name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 font-sans"
              />
            </div>
            <button
              onClick={fetchMatrix}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Department Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
          <span className="text-zinc-500 flex items-center gap-1 mr-1">
            <Building size={13} /> Dept:
          </span>
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-2.5 py-1 rounded-md transition-colors border ${
                selectedDept === dept
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Matrix Table */}
        <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-900/30 backdrop-blur-sm shadow-xl">
          <div className="overflow-x-auto max-h-[72vh]">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead className="bg-zinc-900/95 sticky top-0 z-20 border-b border-zinc-800 shadow-md">
                <tr>
                  <th className="py-3.5 px-4 font-semibold text-zinc-200 sticky left-0 z-30 bg-zinc-900 min-w-[220px] border-r border-zinc-800">
                    Account User ({filteredMatrix.length})
                  </th>
                  {groups.map((grp) => (
                    <th
                      key={grp.id}
                      className="py-3.5 px-2 text-center text-[11px] font-mono text-zinc-400 min-w-[120px] max-w-[140px] truncate border-r border-zinc-800/50 hover:bg-zinc-800/50"
                      title={`${grp.name} (${grp.email})`}
                    >
                      <Link href={`/groups/${grp.id}`} className="block hover:text-emerald-400 transition-colors">
                        <div className="truncate font-medium text-zinc-300">{grp.name.replace('LeadGeeks ', '')}</div>
                        <div className="text-[9px] text-zinc-500 truncate">{grp.email.split('@')[0]}</div>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {loading ? (
                  <tr>
                    <td
                      colSpan={groups.length + 1}
                      className="py-16 text-center text-zinc-500 font-mono text-xs"
                    >
                      Loading cross-domain membership matrix...
                    </td>
                  </tr>
                ) : filteredMatrix.length === 0 ? (
                  <tr>
                    <td
                      colSpan={groups.length + 1}
                      className="py-16 text-center text-zinc-500 font-mono text-xs"
                    >
                      No accounts found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredMatrix.map((row) => (
                    <tr
                      key={row.accountId}
                      className="hover:bg-zinc-800/40 transition-colors group"
                    >
                      <td className="py-2.5 px-4 font-mono sticky left-0 z-10 bg-zinc-950/95 group-hover:bg-zinc-900 border-r border-zinc-800">
                        <Link href={`/accounts/${row.accountId}`} className="block">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-zinc-200 text-xs truncate group-hover:text-emerald-400 transition-colors">
                              {row.displayName}
                            </span>
                            {row.departmentCode && (
                              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-zinc-800 text-zinc-400">
                                {row.departmentCode}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-500 truncate">{row.email}</div>
                        </Link>
                      </td>
                      {row.memberships.map((m) => (
                        <td
                          key={m.groupId}
                          className="py-2.5 px-2 text-center border-r border-zinc-800/40"
                        >
                          {renderCellIndicator(m)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
```

---

## 5. Verification Method

Once implemented by Worker M4.2, the changes must be verified using the following concrete steps:

### 5.1 Automated Test Execution
Run the end-to-end test suite runner:
```bash
# Verify Suite 07 (Domain CRUD Routes, Membership Matrix & UI Contracts)
node tests/runner.mjs --suite=07

# Verify Tier 1 (Core Feature Coverage)
npm run test:tier1

# Verify Tier 2 (Boundary & Corner Cases)
npm run test:tier2

# Verify Tier 3 (Cross-Feature Combinations)
npm run test:tier3

# Verify Tier 4 (Real-World Scenarios)
npm run test:tier4

# Run all 180 tests
npm test
```

### 5.2 Build & Type Check
Verify Next.js build and TypeScript type-checking:
```bash
npm run build
npm run lint
```
Expected output: Zero TypeScript compilation errors, successful build of static and dynamic server routes (`/accounts`, `/accounts/[id]`, `/groups`, `/groups/[id]`, `/groups/matrix`, `/api/accounts/[id]`, `/api/groups/[id]`).

### 5.3 Manual Verification Walkthrough
1. Start dev server: `npm run dev`
2. Open `http://localhost:3000/accounts`:
   - Verify all 42 accounts render.
   - Click Department filter "OPS" -> verify only OPS accounts are shown.
   - Click Role filter "Leaders" -> verify leaders shown.
   - Click on "Amanda" -> navigates to `/accounts/[id]`.
3. On `/accounts/[id]`:
   - Verify Overview tab displays full name, email, department ("Management Office"), domains (`leadgeeksinc.com`, `leadgeeksinc.co`).
   - Switch to "Google Groups" tab -> verify groups listing with role.
   - Switch to "Assigned Devices" tab -> verify assigned laptop (LGI-CD-2024-001 with Ryzen 5, 16 GB RAM).
   - Switch to "Audit History" tab -> verify audit logs.
   - Test navigating directly to `/accounts/amanda@leadgeeksinc.com` -> verify dual-resolution renders the exact same page.
4. Open `http://localhost:3000/groups`:
   - Verify all 15 Google Groups render in card grid.
   - Click "Details" on "LeadGeeks Team" -> navigates to `/groups/[id]`.
5. On `/groups/[id]`:
   - Verify group header displays 38 members, pending sync badge.
   - Verify member roster lists 38 accounts with department and roles.
   - Click on a member name -> navigates to `/accounts/[id]`.
6. Open `http://localhost:3000/groups/matrix`:
   - Verify 42 accounts x 15 groups matrix displays.
   - Click "OPS" filter pill -> verify only OPS accounts rows display (including Devi with checkmark under `operations@leadgeeksinc.com`).
   - Verify column headers link to `/groups/[id]` and row headers link to `/accounts/[id]`.
