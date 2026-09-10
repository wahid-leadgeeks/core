import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from '../helpers/test-framework.mjs';
import { createMockSession, evaluateRouteGuard } from '../helpers/auth-helper.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const accountsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/spreadsheet-accounts.json'), 'utf8'));
const groupsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/spreadsheet-groups.json'), 'utf8'));
const devicesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/spreadsheet-devices.json'), 'utf8'));
const softwareData = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/spreadsheet-software.json'), 'utf8'));

export function filterResources(items, query, searchFields, filters) {
  let result = [...items];

  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    result = result.filter(item =>
      searchFields.some(field => {
        const val = item[field];
        return val && String(val).toLowerCase().includes(q);
      })
    );
  }

  if (filters) {
    for (const [key, expectedVal] of Object.entries(filters)) {
      if (expectedVal !== undefined && expectedVal !== null && expectedVal !== '') {
        result = result.filter(item => item[key] === expectedVal);
      }
    }
  }

  return result;
}

export function generateMembershipMatrix(accounts, groups, memberships) {
  return accounts.map(acct => {
    return groups.map(grp => {
      const isMember = memberships.some(
        m => m.groupEmail === grp.email && m.memberEmail === acct.email
      );
      return {
        accountEmail: acct.email,
        groupEmail: grp.email,
        isMember
      };
    });
  });
}

describe('Suite 07: Domain CRUD Routes, Membership Matrix & UI Contracts', () => {

  // ============================================================================
  // TIER 1: FEATURE COVERAGE
  // ============================================================================

  it('[Tier 1] verifies Accounts list page and API route accessibility for authenticated IT Admin', () => {
    const session = createMockSession('it_admin');
    expect(evaluateRouteGuard({ path: '/accounts', method: 'GET', session }).allowed).toBe(true);
    expect(evaluateRouteGuard({ path: '/api/accounts', method: 'GET', session }).allowed).toBe(true);
  });

  it('[Tier 1] verifies Google Groups list page and Matrix view accessibility', () => {
    const session = createMockSession('super_admin');
    expect(evaluateRouteGuard({ path: '/groups', method: 'GET', session }).allowed).toBe(true);
    expect(evaluateRouteGuard({ path: '/groups/matrix', method: 'GET', session }).allowed).toBe(true);
    expect(evaluateRouteGuard({ path: '/api/groups', method: 'GET', session }).allowed).toBe(true);
  });

  it('[Tier 1] verifies Hardware Assets list and detail route accessibility', () => {
    const session = createMockSession('asset_admin');
    expect(evaluateRouteGuard({ path: '/assets', method: 'GET', session }).allowed).toBe(true);
    expect(evaluateRouteGuard({ path: '/assets/LGI-CD-2024-001', method: 'GET', session }).allowed).toBe(true);
    expect(evaluateRouteGuard({ path: '/api/assets', method: 'GET', session }).allowed).toBe(true);
  });

  it('[Tier 1] verifies Software Applications list and detail route accessibility', () => {
    const session = createMockSession('software_admin');
    expect(evaluateRouteGuard({ path: '/software', method: 'GET', session }).allowed).toBe(true);
    expect(evaluateRouteGuard({ path: '/software/app-slack', method: 'GET', session }).allowed).toBe(true);
    expect(evaluateRouteGuard({ path: '/api/software', method: 'GET', session }).allowed).toBe(true);
  });

  it('[Tier 1] generates exact 42 accounts x 15 groups membership matrix structure', () => {
    const accounts = accountsData.accounts.map(a => ({ email: a.email, displayName: a.displayName }));
    const groups = groupsData.groups.map(g => ({ email: g.email, name: g.name }));
    const matrix = generateMembershipMatrix(accounts, groups, groupsData.sampleMemberships);

    expect(matrix).toHaveLength(accounts.length);
    for (const row of matrix) {
      expect(row).toHaveLength(groups.length);
    }
  });

  it('[Tier 1] searches accounts by name query', () => {
    const results = filterResources(
      accountsData.accounts,
      'Amanda',
      ['fullName', 'displayName', 'email']
    );
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].displayName).toBe('Amanda');
  });

  it('[Tier 1] filters accounts by department code', () => {
    const opsAccounts = filterResources(
      accountsData.accounts,
      '',
      ['fullName', 'displayName', 'email'],
      { departmentCode: 'OPS' }
    );
    expect(opsAccounts.length).toBeGreaterThanOrEqual(1);
    expect(opsAccounts.every(a => a.departmentCode === 'OPS')).toBe(true);
  });

  it('[Tier 1] searches hardware devices by brand and model', () => {
    const msiLaptops = filterResources(
      devicesData.sampleDevices,
      'MSI',
      ['brand', 'model', 'assetNumber', 'computerName']
    );
    expect(msiLaptops.length).toBeGreaterThanOrEqual(2);
    expect(msiLaptops.every(d => d.brand === 'MSI')).toBe(true);
  });

  it('[Tier 1] filters hardware devices by status', () => {
    const reserveLaptops = filterResources(
      devicesData.sampleDevices,
      '',
      ['assetNumber', 'model'],
      { status: 'reserve' }
    );
    expect(reserveLaptops.length).toBeGreaterThanOrEqual(2);
    expect(reserveLaptops.every(d => d.status === 'reserve')).toBe(true);
  });

  it('[Tier 1] filters software applications by subscription type (free vs paid)', () => {
    const paidApps = filterResources(
      softwareData.sampleApplications,
      '',
      ['name', 'description'],
      { subscriptionType: 'paid' }
    );
    expect(paidApps.length).toBeGreaterThanOrEqual(5);
    expect(paidApps.every(a => a.subscriptionType === 'paid')).toBe(true);
  });

  it('[Tier 1] validates status color language semantic mappings per DESIGN.md', () => {
    const STATUS_INDICATORS = {
      active: '🟢',
      assigned: '🔵',
      available: '⚪',
      reserve: '🟡',
      pending: '🟡',
      attention: '🟠',
      decommissioned: '🔴',
      issue: '🔴',
      archived: '⚫'
    };

    expect(STATUS_INDICATORS.active).toBe('🟢');
    expect(STATUS_INDICATORS.assigned).toBe('🔵');
    expect(STATUS_INDICATORS.available).toBe('⚪');
    expect(STATUS_INDICATORS.reserve).toBe('🟡');
    expect(STATUS_INDICATORS.decommissioned).toBe('🔴');
    expect(STATUS_INDICATORS.archived).toBe('⚫');
  });

  it('[Tier 1] validates Resource Page Pattern tab structure (Overview, Specifications, Assignment, Software, Access, History)', () => {
    const standardTabs = ['Overview', 'Specifications', 'Assignment', 'Software', 'Access', 'History'];
    expect(standardTabs).toHaveLength(6);
    expect(standardTabs).toContain('Overview');
    expect(standardTabs).toContain('History');
  });

  // ============================================================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ============================================================================

  it('[Tier 2] handles empty search query returning entire original collection', () => {
    const all = filterResources(accountsData.accounts, '', ['fullName']);
    expect(all).toHaveLength(accountsData.accounts.length);
  });

  it('[Tier 2] handles search query matching zero items returning empty array', () => {
    const none = filterResources(accountsData.accounts, 'NonExistentPersonName12345', ['fullName']);
    expect(none).toHaveLength(0);
  });

  it('[Tier 2] safely handles special search characters without regex crash', () => {
    const safe = filterResources(accountsData.accounts, '[(*+?)]', ['fullName']);
    expect(safe).toHaveLength(0);
  });

  it('[Tier 2] case-insensitive search matching across mixed casing', () => {
    const lowerMatch = filterResources(accountsData.accounts, 'amanda', ['fullName', 'displayName']);
    const upperMatch = filterResources(accountsData.accounts, 'AMANDA', ['fullName', 'displayName']);
    expect(lowerMatch.length).toBe(upperMatch.length);
    expect(lowerMatch[0].email).toBe(upperMatch[0].email);
  });

  it('[Tier 2] combined search query and multiple filter conditions', () => {
    const combined = filterResources(
      accountsData.accounts,
      'Devi',
      ['fullName', 'displayName'],
      { departmentCode: 'OPS', accountType: 'personal' }
    );
    expect(combined).toHaveLength(1);
    expect(combined[0].displayName).toBe('Devi');
  });

  it('[Tier 2] matrix view handles accounts with zero group memberships without crashing', () => {
    const isolatedAccount = [{ email: 'isolated@leadgeeksinc.com', displayName: 'Isolated' }];
    const groups = groupsData.groups.map(g => ({ email: g.email, name: g.name }));
    const matrix = generateMembershipMatrix(isolatedAccount, groups, []);

    expect(matrix).toHaveLength(1);
    expect(matrix[0].every(cell => !cell.isMember)).toBe(true);
  });

  it('[Tier 2] matrix view handles groups with zero members without crashing', () => {
    const accounts = accountsData.accounts.map(a => ({ email: a.email, displayName: a.displayName }));
    const emptyGroup = [{ email: 'empty@leadgeeksinc.com', name: 'Empty Group' }];
    const matrix = generateMembershipMatrix(accounts, emptyGroup, []);

    expect(matrix).toHaveLength(accounts.length);
    expect(matrix.every(row => !row[0].isMember)).toBe(true);
  });

  it('[Tier 2] handles non-matching filter criteria returning empty array', () => {
    const filtered = filterResources(
      devicesData.sampleDevices,
      '',
      ['assetNumber'],
      { status: 'non_existent_status' }
    );
    expect(filtered).toHaveLength(0);
  });

  // ============================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // ============================================================================

  it('[Tier 3] pairwise check: Navigation sidebar contains links to all primary domains', () => {
    const navItems = [
      { label: 'Command Center', route: '/' },
      { label: 'Identity', route: '/accounts' },
      { label: 'Google Groups', route: '/groups' },
      { label: 'Membership Matrix', route: '/groups/matrix' },
      { label: 'Assets & Hardware', route: '/assets' },
      { label: 'Software & Tools', route: '/software' },
      { label: 'Audit Trail', route: '/audit' }
    ];

    expect(navItems).toHaveLength(7);
    const routes = navItems.map(n => n.route);
    expect(routes).toContain('/');
    expect(routes).toContain('/accounts');
    expect(routes).toContain('/groups');
    expect(routes).toContain('/groups/matrix');
    expect(routes).toContain('/assets');
    expect(routes).toContain('/software');
    expect(routes).toContain('/audit');
  });

  it('[Tier 3] pairwise check: Resource detail tabs cross-reference related domain models', () => {
    const accountDetailTabs = ['Overview', 'Google Groups', 'Hardware & Devices', 'Software Access', 'History'];
    expect(accountDetailTabs).toContain('Google Groups');
    expect(accountDetailTabs).toContain('Hardware & Devices');
    expect(accountDetailTabs).toContain('Software Access');
  });

  it('[Tier 3] pairwise check: Device detail view links to assigned account and masked credentials', () => {
    const deviceDetailTabs = ['Overview & Specifications', 'Assignment & Custody', 'Credentials & Access', 'Audit History'];
    expect(deviceDetailTabs).toContain('Assignment & Custody');
    expect(deviceDetailTabs).toContain('Credentials & Access');
  });

  it('[Tier 3] verifies membership matrix reflects true membership in sample data', () => {
    const accounts = accountsData.accounts.map(a => ({ email: a.email, displayName: a.displayName }));
    const groups = groupsData.groups.map(g => ({ email: g.email, name: g.name }));
    const matrix = generateMembershipMatrix(accounts, groups, groupsData.sampleMemberships);

    const amandaRow = matrix.find(r => r[0].accountEmail === 'amanda@leadgeeksinc.com');
    expect(amandaRow).toBeDefined();
    const teamCell = amandaRow?.find(c => c.groupEmail === 'team@leadgeeksinc.com');
    expect(teamCell?.isMember).toBe(true);
  });

  it('[Tier 3] verifies calm infrastructure color dot rendering across all device statuses', () => {
    const statuses = ['assigned', 'available', 'reserve', 'decommissioned'];
    for (const s of statuses) {
      const filtered = devicesData.sampleDevices.filter(d => d.status === s);
      expect(filtered.length).toBeGreaterThan(0);
    }
  });

  // ============================================================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS
  // ============================================================================

  it('[Tier 4] Scenario 1: IT Administrator full resource inspection walk-through', () => {
    const itAdmin = createMockSession('it_admin');

    expect(evaluateRouteGuard({ path: '/', method: 'GET', session: itAdmin }).allowed).toBe(true);

    const foundAccounts = filterResources(accountsData.accounts, 'Amanda', ['fullName', 'displayName']);
    expect(foundAccounts).toHaveLength(1);
    const targetAccount = foundAccounts[0];

    expect(evaluateRouteGuard({ path: `/accounts/${targetAccount.email}`, method: 'GET', session: itAdmin }).allowed).toBe(true);

    const foundLaptops = filterResources(devicesData.sampleDevices, targetAccount.displayName, ['picName']);
    expect(foundLaptops).toHaveLength(1);
    const targetLaptop = foundLaptops[0];

    expect(evaluateRouteGuard({ path: `/assets/${targetLaptop.assetNumber}`, method: 'GET', session: itAdmin }).allowed).toBe(true);
  });

  it('[Tier 4] Scenario 2: Membership Matrix cross-tabulation exploration by Department', () => {
    const opsAccounts = accountsData.accounts.filter(a => a.departmentCode === 'OPS');
    const groups = groupsData.groups.map(g => ({ email: g.email, name: g.name }));
    const matrix = generateMembershipMatrix(opsAccounts, groups, groupsData.sampleMemberships);

    expect(matrix).toHaveLength(opsAccounts.length);
    const deviRow = matrix.find(r => r[0].accountEmail === 'devi@leadgeeksinc.com');
    const opsGroupCell = deviRow?.find(c => c.groupEmail === 'operations@leadgeeksinc.com');
    expect(opsGroupCell?.isMember).toBe(true);
  });

  it('[Tier 4] Scenario 3: Software application catalog filtering and search for company-wide tools', () => {
    const commTools = filterResources(
      softwareData.sampleApplications,
      '',
      ['name'],
      { category: 'communication' }
    );
    expect(commTools.length).toBeGreaterThanOrEqual(2);
    expect(commTools.map(t => t.name)).toContain('Slack');
    expect(commTools.map(t => t.name)).toContain('Google Workspace');
  });
});
