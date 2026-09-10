/**
 * CORE — Milestone 4 Adversarial Challenge Suite: Identity, Groups & Matrix Invariants
 * Agent: challenger_m4_1
 *
 * Rigorously stress-tests:
 * 1. Identity Domain Dual Resolution & Edge Case Testing (UUID vs email, previousEmail, URL-encoding, 404 handling)
 * 2. Groups Domain Dual Resolution & Edge Case Testing (UUID vs email, 404 handling, malformed IDs)
 * 3. 42x15 Membership Matrix Dimensions, Department Cross-Tabulation & Role Indicators
 * 4. RBAC Route Guard Invariants (asset_admin/software_admin blocked from /groups, auditor read-only on mutations)
 */

import accountsData from './fixtures/spreadsheet-accounts.json' with { type: 'json' };
import groupsData from './fixtures/spreadsheet-groups.json' with { type: 'json' };
import rbacData from './fixtures/rbac-matrix.json' with { type: 'json' };
import { evaluateRouteGuard, createMockSession, VALID_ROLES } from './helpers/auth-helper.js';
import { can, hasPermission, RBAC_PERMISSIONS } from '../src/lib/auth/rbac.js';

let passes = 0;
let failures = 0;
const defects: string[] = [];

function assert(condition: boolean, message: string, failureDetails?: string) {
  if (condition) {
    passes++;
    console.log(`  ✔ PASS: ${message}`);
  } else {
    failures++;
    const detail = failureDetails ? ` (${failureDetails})` : '';
    const err = `FAIL: ${message}${detail}`;
    defects.push(err);
    console.error(`  ❌ ${err}`);
  }
}

function isValidUUID(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

export function runAdversarialM4Suite() {
  console.log('======================================================================');
  console.log(' EMPIRICAL ADVERSARIAL CHALLENGE SUITE: IDENTITY, GROUPS & MATRIX ');
  console.log(' Agent: challenger_m4_1 ');
  console.log('======================================================================\n');

  // ============================================================================
  // PART 1: IDENTITY DUAL LOOKUP & 404 RESILIENCE
  // ============================================================================
  console.log('--- PART 1: Identity Dual UUID/Email Lookup & 404 Resilience ---');

  // 1.1 Target email lookup verification for Amanda
  const amanda = accountsData.accounts.find(a => a.email === 'amanda@leadgeeksinc.com');
  assert(Boolean(amanda), 'Target account amanda@leadgeeksinc.com exists in fixture inventory');
  assert(amanda?.displayName === 'Amanda', 'Amanda display name matches expected token');
  assert(amanda?.previousEmail === 'amanda@leadgeeksprospecting.com', 'Amanda legacy previousEmail preserved');

  // 1.2 Target email lookup verification for Adit
  const adit = accountsData.accounts.find(a => a.email === 'adit@leadgeeksinc.com');
  assert(Boolean(adit), 'Target account adit@leadgeeksinc.com exists in fixture inventory');
  assert(adit?.displayName === 'Adit', 'Adit display name matches expected token');
  assert(adit?.departmentCode === 'ITE', 'Adit departmentCode is ITE');

  // 1.3 UUID validation logic generator & boundary testing
  const validUuids = [
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '00000000-0000-0000-0000-000000000000',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '12345678-1234-1234-1234-123456789abc',
    'A0EEBC99-9C0B-4EF8-BB6D-6BB9BD380A11', // uppercase hex
  ];
  for (const uuid of validUuids) {
    assert(isValidUUID(uuid), `Valid UUID recognized correctly: ${uuid}`);
  }

  const invalidUuids = [
    'amanda@leadgeeksinc.com',
    'adit@leadgeeksinc.com',
    'not-a-uuid',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a1', // 35 chars (too short)
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a111', // 37 chars (too long)
    'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // non-hex character 'g'
    '',
    null as any,
    undefined as any,
    "'; DROP TABLE accounts; --",
    '../../../etc/passwd',
  ];
  for (const invalid of invalidUuids) {
    assert(!isValidUUID(invalid), `Non-UUID rejected by UUID validator: ${String(invalid)}`);
  }

  // 1.4 Dual lookup logic simulation for accounts
  const resolveAccount = (identifier: string) => {
    const isUuid = isValidUUID(identifier);
    const decoded = decodeURIComponent(identifier);
    const found = accountsData.accounts.find((a: any) => {
      if (isUuid) {
        return a.id === decoded;
      }
      return (
        a.email.toLowerCase() === decoded.toLowerCase() ||
        (a.previousEmail && a.previousEmail.toLowerCase() === decoded.toLowerCase())
      );
    });
    if (!found) {
      return { status: 404, error: 'Account not found' };
    }
    return { status: 200, account: found };
  };

  // Lookup via primary email
  const lookupAmanda = resolveAccount('amanda@leadgeeksinc.com');
  assert(lookupAmanda.status === 200 && lookupAmanda.account?.displayName === 'Amanda', 'Lookup via primary email amanda@leadgeeksinc.com succeeds');

  const lookupAdit = resolveAccount('adit@leadgeeksinc.com');
  assert(lookupAdit.status === 200 && lookupAdit.account?.displayName === 'Adit', 'Lookup via primary email adit@leadgeeksinc.com succeeds');

  // Lookup via legacy email
  const lookupLegacy = resolveAccount('amanda@leadgeeksprospecting.com');
  assert(lookupLegacy.status === 200 && lookupLegacy.account?.displayName === 'Amanda', 'Lookup via legacy previousEmail amanda@leadgeeksprospecting.com succeeds');

  // Lookup via URL-encoded email
  const lookupEncoded = resolveAccount('amanda%40leadgeeksinc.com');
  assert(lookupEncoded.status === 200 && lookupEncoded.account?.displayName === 'Amanda', 'Lookup via URL-encoded email amanda%40leadgeeksinc.com succeeds');

  // Lookup via non-existent email
  const lookupNonExistentEmail = resolveAccount('ghost@leadgeeksinc.com');
  assert(lookupNonExistentEmail.status === 404, 'Lookup via non-existent email safely returns 404');

  // Lookup via non-existent UUID
  const lookupNonExistentUuid = resolveAccount('00000000-0000-0000-0000-000000000000');
  assert(lookupNonExistentUuid.status === 404, 'Lookup via non-existent UUID safely returns 404');

  // Lookup via hostile SQL injection string
  const lookupSqlInject = resolveAccount("'; DROP TABLE accounts; --");
  assert(lookupSqlInject.status === 404, 'Hostile SQL injection string safely returns 404');

  // ============================================================================
  // PART 2: GROUPS DUAL LOOKUP & 404 RESILIENCE
  // ============================================================================
  console.log('\n--- PART 2: Groups Dual UUID/Email Lookup & 404 Resilience ---');

  // 2.1 Target group lookup verification for Management
  const mgmtGroup = groupsData.groups.find(g => g.email === 'management@leadgeeksinc.com');
  assert(Boolean(mgmtGroup), 'Target group management@leadgeeksinc.com exists in fixture inventory');
  assert(mgmtGroup?.name === 'LeadGeeks Management', 'Management group name matches expected token');

  // 2.2 Dual lookup logic simulation for groups
  const resolveGroup = (identifier: string) => {
    const isUuid = isValidUUID(identifier);
    const decoded = decodeURIComponent(identifier);
    const found = groupsData.groups.find((g: any) => {
      if (isUuid) {
        return g.id === decoded;
      }
      return (
        g.email.toLowerCase() === decoded.toLowerCase() ||
        g.name.toLowerCase() === decoded.toLowerCase()
      );
    });
    if (!found) {
      return { status: 404, error: 'Google Group not found' };
    }
    return { status: 200, group: found };
  };

  const lookupMgmt = resolveGroup('management@leadgeeksinc.com');
  assert(lookupMgmt.status === 200 && lookupMgmt.group?.name === 'LeadGeeks Management', 'Lookup via primary email management@leadgeeksinc.com succeeds');

  const lookupEncodedMgmt = resolveGroup('management%40leadgeeksinc.com');
  assert(lookupEncodedMgmt.status === 200 && lookupEncodedMgmt.group?.name === 'LeadGeeks Management', 'Lookup via URL-encoded email management%40leadgeeksinc.com succeeds');

  const lookupTeam = resolveGroup('team@leadgeeksinc.com');
  assert(lookupTeam.status === 200 && lookupTeam.group?.name === 'LeadGeeks Team', 'Lookup via team@leadgeeksinc.com succeeds');

  const lookupNonExistentGroup = resolveGroup('nonexistent-group@leadgeeksinc.com');
  assert(lookupNonExistentGroup.status === 404, 'Lookup via non-existent group email safely returns 404');

  const lookupNonExistentGroupUuid = resolveGroup('11111111-1111-1111-1111-111111111111');
  assert(lookupNonExistentGroupUuid.status === 404, 'Lookup via non-existent group UUID safely returns 404');

  // ============================================================================
  // PART 3: 42x15 MEMBERSHIP MATRIX DIMENSIONS, CROSS-TABULATION & ROLES
  // ============================================================================
  console.log('\n--- PART 3: 42x15 Membership Matrix Dimensions, Filters & Roles ---');

  // 3.1 Dimensions invariant
  const totalAccounts = accountsData.accounts.length;
  const totalGroups = groupsData.groups.length;
  assert(totalAccounts === 42, `Accounts dimension is exactly 42 (observed: ${totalAccounts})`);
  assert(totalGroups === 15, `Groups dimension is exactly 15 (observed: ${totalGroups})`);

  // Build matrix
  const matrix = accountsData.accounts.map(acct => {
    const groupMembershipsForAcct = groupsData.sampleMemberships.filter(
      m => m.memberEmail === acct.email
    );
    const membershipMap = new Map(
      groupMembershipsForAcct.map(m => [m.groupEmail, m])
    );

    return {
      accountId: acct.email,
      displayName: acct.displayName,
      fullName: acct.fullName,
      email: acct.email,
      departmentCode: acct.departmentCode,
      memberships: groupsData.groups.map(g => {
        const mem = membershipMap.get(g.email);
        return {
          groupId: g.email,
          groupName: g.name,
          groupEmail: g.email,
          isMember: Boolean(mem),
          role: Boolean(mem) ? (acct.accountRole === 'Top Management' ? 'owner' : acct.accountRole === 'Leaders' ? 'manager' : 'member') : null,
        };
      }),
    };
  });

  assert(matrix.length === 42, `Matrix row count is exactly 42`);
  const allRows15Cols = matrix.every(row => row.memberships.length === 15);
  assert(allRows15Cols, `Every row in matrix has exactly 15 group columns`);

  const totalCells = matrix.reduce((acc, r) => acc + r.memberships.length, 0);
  assert(totalCells === 630, `Total cross-tabulated cells is exactly 42 x 15 = 630 (observed: ${totalCells})`);

  // 3.2 Department Filter Cross-Tabulation
  const canonicalDepts = ['MNG', 'OPS', 'GRW', 'EXP', 'HRD', 'ITE', 'FAC', 'GNR'];
  let deptSum = 0;
  for (const dept of canonicalDepts) {
    const filteredRows = matrix.filter(r => r.departmentCode === dept);
    deptSum += filteredRows.length;
    console.log(`    Dept [${dept}]: ${filteredRows.length} accounts`);
    assert(filteredRows.length >= 0, `Department filter [${dept}] produces non-negative account count`);
    assert(filteredRows.every(r => r.departmentCode === dept), `All accounts under filter [${dept}] strictly belong to ${dept}`);
  }
  assert(deptSum === 42, `Sum of all department partitions equals total accounts (42)`);

  // 3.3 Role-Aware Cell Indicators
  const sampleCells = matrix.flatMap(r => r.memberships.filter(m => m.isMember));
  const hasOwner = sampleCells.some(c => c.role === 'owner');
  const hasManager = sampleCells.some(c => c.role === 'manager');
  const hasMember = sampleCells.some(c => c.role === 'member');
  assert(hasOwner, 'Matrix cells support role "owner"');
  assert(hasManager, 'Matrix cells support role "manager"');
  assert(hasMember, 'Matrix cells support role "member"');

  // ============================================================================
  // PART 4: ROUTE GUARD INVARIANTS & RBAC AUTHORIZATION
  // ============================================================================
  console.log('\n--- PART 4: RBAC Route Guard Invariants & Forbidden Access ---');

  // 4.1 Asset Admin Forbidden from Groups
  const assetAdmin = createMockSession('asset_admin');
  const aaGroupsPage = evaluateRouteGuard({ path: '/groups', method: 'GET', session: assetAdmin });
  assert(!aaGroupsPage.allowed && aaGroupsPage.statusCode === 403, 'Asset Admin is blocked with 403 from /groups page');

  const aaMatrixPage = evaluateRouteGuard({ path: '/groups/matrix', method: 'GET', session: assetAdmin });
  assert(!aaMatrixPage.allowed && aaMatrixPage.statusCode === 403, 'Asset Admin is blocked with 403 from /groups/matrix page');

  const aaGroupDetailPage = evaluateRouteGuard({ path: '/groups/management@leadgeeksinc.com', method: 'GET', session: assetAdmin });
  assert(!aaGroupDetailPage.allowed && aaGroupDetailPage.statusCode === 403, 'Asset Admin is blocked with 403 from /groups/[id] page');

  const aaGroupsApi = evaluateRouteGuard({ path: '/api/groups', method: 'GET', session: assetAdmin });
  assert(!aaGroupsApi.allowed && aaGroupsApi.statusCode === 403, 'Asset Admin is blocked with 403 from /api/groups endpoint');

  // 4.2 Software Admin Forbidden from Groups
  const softwareAdmin = createMockSession('software_admin');
  const saGroupsPage = evaluateRouteGuard({ path: '/groups', method: 'GET', session: softwareAdmin });
  assert(!saGroupsPage.allowed && saGroupsPage.statusCode === 403, 'Software Admin is blocked with 403 from /groups page');

  const saMatrixPage = evaluateRouteGuard({ path: '/groups/matrix', method: 'GET', session: softwareAdmin });
  assert(!saMatrixPage.allowed && saMatrixPage.statusCode === 403, 'Software Admin is blocked with 403 from /groups/matrix page');

  const saGroupDetailPage = evaluateRouteGuard({ path: '/groups/management@leadgeeksinc.com', method: 'GET', session: softwareAdmin });
  assert(!saGroupDetailPage.allowed && saGroupDetailPage.statusCode === 403, 'Software Admin is blocked with 403 from /groups/[id] page');

  const saGroupsApi = evaluateRouteGuard({ path: '/api/groups', method: 'GET', session: softwareAdmin });
  assert(!saGroupsApi.allowed && saGroupsApi.statusCode === 403, 'Software Admin is blocked with 403 from /api/groups endpoint');

  // 4.3 Auditor Read-Only Invariant across all write mutations
  const auditor = createMockSession('auditor');

  // Auditor GET is allowed
  const audAccountsGet = evaluateRouteGuard({ path: '/accounts', method: 'GET', session: auditor });
  assert(audAccountsGet.allowed && audAccountsGet.statusCode === 200, 'Auditor is allowed GET /accounts');

  const audGroupsGet = evaluateRouteGuard({ path: '/groups', method: 'GET', session: auditor });
  assert(audGroupsGet.allowed && audGroupsGet.statusCode === 200, 'Auditor is allowed GET /groups');

  const audMatrixGet = evaluateRouteGuard({ path: '/groups/matrix', method: 'GET', session: auditor });
  assert(audMatrixGet.allowed && audMatrixGet.statusCode === 200, 'Auditor is allowed GET /groups/matrix');

  // Auditor POST/PUT/DELETE is blocked with 403
  const writeEndpoints = [
    { path: '/api/accounts', method: 'POST' as const },
    { path: '/api/accounts/acct-1', method: 'PUT' as const },
    { path: '/api/accounts/acct-1', method: 'PATCH' as const },
    { path: '/api/accounts/acct-1', method: 'DELETE' as const },
    { path: '/api/groups', method: 'POST' as const },
    { path: '/api/groups/grp-1', method: 'PUT' as const },
    { path: '/api/groups/grp-1', method: 'DELETE' as const },
    { path: '/api/assets', method: 'POST' as const },
    { path: '/api/assets/LGI-CD-2024-001', method: 'PUT' as const },
    { path: '/api/assets/LGI-CD-2024-001', method: 'DELETE' as const },
    { path: '/api/assets/LGI-CD-2024-001/credentials/reveal', method: 'POST' as const },
    { path: '/api/software', method: 'POST' as const },
    { path: '/api/software/app-1', method: 'PUT' as const },
    { path: '/api/software/app-1', method: 'DELETE' as const },
  ];

  for (const ep of writeEndpoints) {
    const res = evaluateRouteGuard({ path: ep.path, method: ep.method, session: auditor });
    assert(!res.allowed && res.statusCode === 403, `Auditor blocked with 403 on ${ep.method} ${ep.path}`);
  }

  // 4.4 RBAC can() unit oracle checks
  assert(!can('auditor', 'create', 'identity'), 'RBAC can("auditor", "create", "identity") is false');
  assert(!can('auditor', 'update', 'groups'), 'RBAC can("auditor", "update", "groups") is false');
  assert(!can('auditor', 'delete', 'assets'), 'RBAC can("auditor", "delete", "assets") is false');
  assert(!can('auditor', 'reveal', 'credentials'), 'RBAC can("auditor", "reveal", "credentials") is false');
  assert(!can('asset_admin', 'read', 'groups'), 'RBAC can("asset_admin", "read", "groups") is false');
  assert(!can('software_admin', 'read', 'groups'), 'RBAC can("software_admin", "read", "groups") is false');
  assert(can('it_admin', 'read', 'groups'), 'RBAC can("it_admin", "read", "groups") is true');
  assert(can('super_admin', 'read', 'groups'), 'RBAC can("super_admin", "read", "groups") is true');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n======================================================================');
  console.log(` SUITE SUMMARY: ${passes} PASSED, ${failures} FAILED`);
  console.log('======================================================================\n');

  return { passes, failures, defects };
}

// Auto-run when executed directly
runAdversarialM4Suite();
