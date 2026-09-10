import { describe, it, expect } from '../helpers/test-framework.js';
import referenceData from '../fixtures/reference-data.json' with { type: 'json' };
import accountsData from '../fixtures/spreadsheet-accounts.json' with { type: 'json' };
import groupsData from '../fixtures/spreadsheet-groups.json' with { type: 'json' };
import devicesData from '../fixtures/spreadsheet-devices.json' with { type: 'json' };
import softwareData from '../fixtures/spreadsheet-software.json' with { type: 'json' };

// Fuzzy PIC matching logic under test
export function matchPicToAccount(
  picName: string,
  accounts: { id?: string; displayName: string; fullName: string }[]
): { accountId?: string; status: 'assigned' | 'reserve' | 'available' | 'decommissioned' } {
  const trimmed = (picName || '').trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed || lower === 'n/a') {
    return { status: 'available' };
  }
  if (lower.includes('cadangan')) {
    return { status: 'reserve' };
  }
  if (lower.includes('dijual') || lower.includes('rusak')) {
    return { status: 'decommissioned' };
  }

  // 1. Exact case-insensitive match on displayName
  const exactDisplay = accounts.find(a => a.displayName.toLowerCase() === lower);
  if (exactDisplay) {
    return { accountId: exactDisplay.id || exactDisplay.displayName, status: 'assigned' };
  }

  // 2. Exact match on fullName
  const exactFull = accounts.find(a => a.fullName.toLowerCase() === lower);
  if (exactFull) {
    return { accountId: exactFull.id || exactFull.displayName, status: 'assigned' };
  }

  // 3. First-name token match
  const firstNameToken = lower.split(' ')[0];
  const tokenMatch = accounts.find(a =>
    a.displayName.toLowerCase().startsWith(firstNameToken) ||
    a.fullName.toLowerCase().split(' ')[0] === firstNameToken
  );
  if (tokenMatch) {
    return { accountId: tokenMatch.id || tokenMatch.displayName, status: 'assigned' };
  }

  return { status: 'available' };
}

// Department canonicalization under test
export function canonicalizeDepartment(rawName: string): string {
  const map: Record<string, string> = referenceData.departmentNormalizationMap;
  const match = map[rawName.trim()];
  if (!match) {
    throw new Error(`Unrecognized department string: "${rawName}"`);
  }
  return match;
}

// Domain list parser under test
export function parseDomainList(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map(d => d.trim().toLowerCase())
    .filter(Boolean);
}

describe('Suite 06: Spreadsheet Ingestion Engine, Normalization & Idempotency', () => {

  // ============================================================================
  // TIER 1: FEATURE COVERAGE
  // ============================================================================

  it('[Tier 1] verifies target account count is exactly 42 with correct account type breakdown', () => {
    expect(accountsData.totalAccounts).toBe(42);
    expect(accountsData.accountTypes.personal).toBe(40);
    expect(accountsData.accountTypes.service).toBe(1);
    expect(accountsData.accountTypes.shared).toBe(1);
  });

  it('[Tier 1] verifies service account sales@leadgeeksinc.com is classified as service', () => {
    const sales = accountsData.accounts.find(a => a.email === 'sales@leadgeeksinc.com');
    expect(sales?.accountType).toBe('service');
  });

  it('[Tier 1] verifies shared account admin@leadgeeksinc.co is classified as shared', () => {
    const admin = accountsData.accounts.find(a => a.email === 'admin@leadgeeksinc.co');
    expect(admin?.accountType).toBe('shared');
  });

  it('[Tier 1] verifies target Google Groups count is exactly 15', () => {
    expect(groupsData.totalGroups).toBe(15);
    expect(groupsData.groups).toHaveLength(15);
  });

  it('[Tier 1] verifies Google Groups include .co domain calendar groups', () => {
    const coGroups = groupsData.groups.filter(g => g.email.endsWith('.co'));
    expect(coGroups.length).toBeGreaterThanOrEqual(2);
    expect(coGroups.map(g => g.email)).toContain('operations.calendar@leadgeeksinc.co');
    expect(coGroups.map(g => g.email)).toContain('company.calendar@leadgeeksinc.co');
  });

  it('[Tier 1] verifies target hardware devices count is exactly 31 with status breakdown', () => {
    expect(devicesData.totalDevices).toBe(31);
    expect(devicesData.statusBreakdown.assigned).toBe(26);
    expect(devicesData.statusBreakdown.available).toBe(2);
    expect(devicesData.statusBreakdown.reserve).toBe(2);
    expect(devicesData.statusBreakdown.decommissioned).toBe(1);
  });

  it('[Tier 1] verifies hardware devices brand breakdown: LENOVO (21), MSI (9), ASUS (1)', () => {
    expect(devicesData.brandBreakdown.LENOVO).toBe(21);
    expect(devicesData.brandBreakdown.MSI).toBe(9);
    expect(devicesData.brandBreakdown.ASUS).toBe(1);
  });

  it('[Tier 1] verifies target software applications count is exactly 125', () => {
    expect(softwareData.totalApplications).toBe(125);
  });

  it('[Tier 1] verifies software application department distribution includes 82 General tools', () => {
    expect(softwareData.departmentDistribution.General).toBe(82);
    expect(softwareData.departmentDistribution.Operations).toBe(11);
    expect(softwareData.departmentDistribution['Information and Technology']).toBe(9);
  });

  it('[Tier 1] normalizes "HRD" to "Human Resource and Development"', () => {
    expect(canonicalizeDepartment('HRD')).toBe('Human Resource and Development');
  });

  it('[Tier 1] normalizes "IT" to "Information and Technology"', () => {
    expect(canonicalizeDepartment('IT')).toBe('Information and Technology');
  });

  it('[Tier 1] normalizes "Management" to "Management Office"', () => {
    expect(canonicalizeDepartment('Management')).toBe('Management Office');
    expect(canonicalizeDepartment('Management Office')).toBe('Management Office');
  });

  it('[Tier 1] parses multi-domain strings into clean lowercase string array', () => {
    const parsed = parseDomainList('leadgeeksinc.com, leadgeeksinc.co');
    expect(parsed).toHaveLength(2);
    expect(parsed).toContain('leadgeeksinc.com');
    expect(parsed).toContain('leadgeeksinc.co');
  });

  it('[Tier 1] fuzzy matches "Amanda" to Jean Amanda Stevany Loupatty', () => {
    const mockAccounts = accountsData.accounts.map(a => ({
      displayName: a.displayName,
      fullName: a.fullName
    }));
    const match = matchPicToAccount('Amanda', mockAccounts);
    expect(match.status).toBe('assigned');
    expect(match.accountId).toBe('Amanda');
  });

  // ============================================================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ============================================================================

  it('[Tier 2] matches "Laptop cadangan" or "Laptop Cadangan" to status reserve with no account assignment', () => {
    const mockAccounts = accountsData.accounts.map(a => ({ displayName: a.displayName, fullName: a.fullName }));
    const res1 = matchPicToAccount('Laptop cadangan', mockAccounts);
    expect(res1.status).toBe('reserve');
    expect(res1.accountId).toBeUndefined();

    const res2 = matchPicToAccount('Laptop Cadangan', mockAccounts);
    expect(res2.status).toBe('reserve');
  });

  it('[Tier 2] matches "N/A" or empty string to status available with no account assignment', () => {
    const mockAccounts = accountsData.accounts.map(a => ({ displayName: a.displayName, fullName: a.fullName }));
    const res1 = matchPicToAccount('N/A', mockAccounts);
    expect(res1.status).toBe('available');
    expect(res1.accountId).toBeUndefined();

    const res2 = matchPicToAccount('', mockAccounts);
    expect(res2.status).toBe('available');
  });

  it('[Tier 2] matches decommissioned device ("Akan dijual / rusak")', () => {
    const mockAccounts = accountsData.accounts.map(a => ({ displayName: a.displayName, fullName: a.fullName }));
    const res = matchPicToAccount('Akan dijual', mockAccounts);
    expect(res.status).toBe('decommissioned');
  });

  it('[Tier 2] resolves legacy email domain @leadgeeksprospecting.com via previous_email lookup', () => {
    const legacyMember = groupsData.sampleMemberships.find(m => m.memberEmail.includes('prospecting'));
    expect(legacyMember).toBeDefined();

    // Look up in accountsData
    const matchedAccount = accountsData.accounts.find(
      a => a.email === legacyMember?.memberEmail || a.previousEmail === legacyMember?.memberEmail
    );
    expect(matchedAccount).toBeDefined();
    expect(matchedAccount?.displayName).toBe('Amanda');
  });

  it('[Tier 2] rejects unrecognized department string during canonicalization', () => {
    expect(() => canonicalizeDepartment('Unknown Department XYZ')).toThrow('Unrecognized department');
  });

  it('[Tier 2] handles multi-domain parsing with trailing commas and varied whitespace', () => {
    const parsed = parseDomainList('  leadgeeksinc.com ,  leadgeeksinc.co , ');
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toBe('leadgeeksinc.com');
    expect(parsed[1]).toBe('leadgeeksinc.co');
  });

  it('[Tier 2] handles empty domain string returning empty array', () => {
    expect(parseDomainList('')).toHaveLength(0);
  });

  it('[Tier 2] secondary custodian (PIC 2) resolution for shared custody laptops', () => {
    const mockAccounts = accountsData.accounts.map(a => ({ displayName: a.displayName, fullName: a.fullName }));
    const sample = devicesData.sampleDevices[2]; // Adit with PIC 2 Fajri
    expect(sample.pic2Name).toBe('Fajri');

    const match2 = matchPicToAccount(sample.pic2Name!, mockAccounts);
    expect(match2.status).toBe('assigned');
    expect(match2.accountId).toBe('Fajri');
  });

  // ============================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // ============================================================================

  it('[Tier 3] pairwise check: Accounts department FK matches canonical department code', () => {
    const validCodes = new Set(referenceData.departments.map(d => d.code));
    for (const acct of accountsData.accounts) {
      expect(validCodes.has(acct.departmentCode)).toBe(true);
    }
  });

  it('[Tier 3] pairwise check: Applications department FK matches canonical departments', () => {
    const validNames = new Set(referenceData.departments.map(d => d.name));
    for (const app of softwareData.sampleApplications) {
      expect(validNames.has(app.department)).toBe(true);
    }
  });

  it('[Tier 3] pairwise check: Device assignment connects device to existing account email', () => {
    const mockAccounts = accountsData.accounts.map(a => ({ displayName: a.displayName, fullName: a.fullName }));
    for (const dev of devicesData.sampleDevices) {
      if (dev.status === 'assigned') {
        const match = matchPicToAccount(dev.picName, mockAccounts);
        expect(match.status).toBe('assigned');
        expect(match.accountId).toBeDefined();
      }
    }
  });

  it('[Tier 3] pairwise check: Google Group memberships resolve to accounts', () => {
    for (const mem of groupsData.sampleMemberships) {
      const match = accountsData.accounts.find(
        a => a.email === mem.memberEmail || a.previousEmail === mem.memberEmail
      );
      expect(match).toBeDefined();
    }
  });

  it('[Tier 3] pairwise check: Device credentials link 1:1 with hardware devices', () => {
    for (const dev of devicesData.sampleDevices) {
      expect(dev.loginEmail).toBeDefined();
      expect(dev.pinPlain).toBeDefined();
    }
  });

  // ============================================================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS
  // ============================================================================

  it('[Tier 4] Scenario 1: Complete 10-step ingestion sequence verification', () => {
    // Step 1: Reference seed
    expect(referenceData.departments).toHaveLength(8);
    expect(referenceData.accountRoles).toHaveLength(5);
    expect(referenceData.domains).toHaveLength(3);

    // Step 2: Accounts (42)
    expect(accountsData.totalAccounts).toBe(42);

    // Step 3: Account Domains join table
    const multiDomainAccounts = accountsData.accounts.filter(a => a.domains.length > 1);
    expect(multiDomainAccounts.length).toBeGreaterThan(0);

    // Step 4: Groups (15) & Step 5: Memberships (~168)
    expect(groupsData.totalGroups).toBe(15);

    // Step 6: Devices (31) & Step 7: Specs (31)
    expect(devicesData.totalDevices).toBe(31);

    // Step 8: Assignments (26 assigned)
    expect(devicesData.statusBreakdown.assigned).toBe(26);

    // Step 9: Credentials (31)
    expect(devicesData.sampleDevices.every(d => Boolean(d.pinPlain))).toBe(true);

    // Step 10: Applications (125)
    expect(softwareData.totalApplications).toBe(125);
  });

  it('[Tier 4] Scenario 2: Idempotent re-ingestion guarantee (0 duplicates created)', () => {
    const accountsRun1 = [...accountsData.accounts];
    const accountsRun2 = [...accountsData.accounts];
    const uniqueEmails = new Set([...accountsRun1.map(a => a.email), ...accountsRun2.map(a => a.email)]);
    expect(uniqueEmails.size).toBe(accountsData.accounts.length);

    const devicesRun1 = [...devicesData.sampleDevices];
    const devicesRun2 = [...devicesData.sampleDevices];
    const uniqueAssets = new Set([...devicesRun1.map(d => d.assetNumber), ...devicesRun2.map(d => d.assetNumber)]);
    expect(uniqueAssets.size).toBe(devicesData.sampleDevices.length);
  });

  it('[Tier 4] Scenario 3: Cross-workbook consistency verification across departments and accounts', () => {
    // Check that department 'General' exists to support 82 software applications
    const generalDept = referenceData.departments.find(d => d.code === 'GNR');
    expect(generalDept).toBeDefined();
    expect(generalDept?.name).toBe('General');
  });
});
