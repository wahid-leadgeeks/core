import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from '../helpers/test-framework.mjs';
import { createMockSession, hasPermission } from '../helpers/auth-helper.mjs';
import { isEncryptedPin, decryptPin } from '../helpers/crypto-helper.mjs';
import {
  createAssetStore,
  provisionDevice,
  updateDevice,
  assignDevice,
  rotateDevicePin,
  decommissionDevice
} from '../helpers/asset-lifecycle-helper.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const devicesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/spreadsheet-devices.json'), 'utf8'));

describe('Suite 08: Hardware Asset Lifecycle & Operational Mutations', () => {

  // ============================================================================
  // TIER 1: FEATURE COVERAGE
  // ============================================================================

  it('[Tier 1] provisions a new hardware asset with specifications and status available', () => {
    const store = createAssetStore(devicesData.sampleDevices);
    const session = createMockSession('it_admin');

    const newDevice = provisionDevice(store, {
      assetNumber: 'LGI-TEST-001',
      brand: 'LENOVO',
      model: 'ThinkPad T14s Gen 4',
      computerName: 'LeadGeeks-Test-01',
      status: 'available',
      purchasedAt: '2025-01-10',
      hasAntivirus: true,
      notes: 'New engineering laptop',
      specifications: {
        processor: 'Intel Core i7-1365U',
        ram: '32 GB',
        storage: 'SSD 1 TB'
      }
    }, session);

    expect(newDevice.id).toBeDefined();
    expect(newDevice.assetNumber).toBe('LGI-TEST-001');
    expect(newDevice.status).toBe('available');
    expect(newDevice.specifications.processor).toBe('Intel Core i7-1365U');
    expect(newDevice.specifications.ram).toBe('32 GB');
    expect(newDevice.specifications.storage).toBe('SSD 1 TB');
    expect(newDevice.assignment).toBeNull();
    expect(store.devices.has(newDevice.id)).toBe(true);
  });

  it('[Tier 1] provisions a new asset with initial encrypted PIN credential (AES-256-GCM)', () => {
    const store = createAssetStore(devicesData.sampleDevices);
    const session = createMockSession('super_admin');

    const newDevice = provisionDevice(store, {
      assetNumber: 'LGI-SEC-001',
      brand: 'MSI',
      model: 'Modern 14 C12M',
      computerName: 'LeadGeeks-Sec-01',
      credential: {
        loginEmail: 'secadmin@leadgeeksinc.com',
        pinPlain: '987654'
      }
    }, session);

    expect(newDevice.credential).toBeDefined();
    expect(newDevice.credential.loginEmail).toBe('secadmin@leadgeeksinc.com');
    expect(isEncryptedPin(newDevice.credential.pinHash)).toBe(true);
    expect(newDevice.credential.pinPlain).toBeUndefined();
    expect(decryptPin(newDevice.credential.pinHash)).toBe('987654');
  });

  it('[Tier 1] updates device specifications (processor, RAM, storage) and notes', () => {
    const store = createAssetStore(devicesData.sampleDevices);
    const session = createMockSession('asset_admin');

    const updated = updateDevice(store, 'LGI-CD-2024-001', {
      notes: 'Upgraded for Machine Learning tasks',
      specifications: {
        processor: 'AMD Ryzen 7 7840U',
        ram: '32 GB',
        storage: 'SSD 1 TB'
      }
    }, session);

    expect(updated.assetNumber).toBe('LGI-CD-2024-001');
    expect(updated.notes).toBe('Upgraded for Machine Learning tasks');
    expect(updated.specifications.processor).toBe('AMD Ryzen 7 7840U');
    expect(updated.specifications.ram).toBe('32 GB');
  });

  it('[Tier 1] assigns an available device to an employee account (auto-updates status to assigned)', () => {
    const store = createAssetStore(devicesData.sampleDevices);
    const session = createMockSession('asset_admin');

    // First ensure device is available
    const targetDev = store.findByIdOrTag('LGI-CD-2024-001');
    targetDev.status = 'available';
    targetDev.assignment = null;

    const assigned = assignDevice(store, 'LGI-CD-2024-001', {
      accountId: 'acc-alexandra',
      assigneeName: 'Alexandra Pratama',
      assigneeEmail: 'alexandra@leadgeeksinc.com',
      custodianName: 'Devi (Team Lead)',
      notes: 'Permanent company device'
    }, session);

    expect(assigned.status).toBe('assigned');
    expect(assigned.assignment).toBeDefined();
    expect(assigned.assignment.assigneeName).toBe('Alexandra Pratama');
    expect(assigned.assignment.custodianName).toBe('Devi (Team Lead)');
    expect(assigned.assignment.assignedAt).toBeDefined();
    expect(assigned.assignment.returnedAt).toBeNull();
  });

  it('[Tier 1] returns an assigned device to the reserve pool (status reserve, archives prior assignment)', () => {
    const store = createAssetStore(devicesData.sampleDevices);
    const session = createMockSession('asset_admin');

    const returned = assignDevice(store, 'LGI-CD-2024-001', {
      isReturn: true,
      targetStatus: 'reserve',
      notes: 'Employee offboarded - hardware in good condition'
    }, session);

    expect(returned.status).toBe('reserve');
    expect(returned.assignment).toBeNull();
    expect(returned.assignmentHistory.length).toBeGreaterThanOrEqual(1);
    expect(returned.assignmentHistory[0].returnedAt).toBeDefined();
    expect(returned.assignmentHistory[0].notes).toBe('Employee offboarded - hardware in good condition');
  });

  it('[Tier 1] rotates device login PIN and records timestamp with zero plaintext leak', () => {
    const store = createAssetStore(devicesData.sampleDevices);
    const session = createMockSession('it_admin');

    const rotated = rotateDevicePin(store, 'LGI-CD-2024-001', {
      pinPlain: 'NewSecurePin#2026',
      loginEmail: 'rotated-admin@leadgeeksinc.com'
    }, session);

    expect(rotated.credential).toBeDefined();
    expect(isEncryptedPin(rotated.credential.pinHash)).toBe(true);
    expect(decryptPin(rotated.credential.pinHash)).toBe('NewSecurePin#2026');
    expect(rotated.credential.pinMasked).toBe('••••••••');
    expect(rotated.credential.pinLastRotatedAt).toBeDefined();
  });

  it('[Tier 1] decommissions a retired device with confirmed asset tag and non-empty reason', () => {
    const store = createAssetStore(devicesData.sampleDevices);
    const session = createMockSession('super_admin');

    const decommissioned = decommissionDevice(store, 'LGI-CD-2024-001', {
      confirmTag: 'LGI-CD-2024-001',
      reason: 'Liquid damage; repair cost exceeds asset value'
    }, session);

    expect(decommissioned.status).toBe('decommissioned');
    expect(decommissioned.assignment).toBeNull();
    expect(decommissioned.notes).toContain('Liquid damage');
  });

  // ============================================================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ============================================================================

  it('[Tier 2] rejects provisioning with duplicate asset tag (case-insensitive)', () => {
    const store = createAssetStore(devicesData.sampleDevices);
    const session = createMockSession('it_admin');

    expect(() => {
      provisionDevice(store, {
        assetNumber: 'lgi-cd-2024-001', // Already exists in fixture
        model: 'Duplicate Laptop'
      }, session);
    }).toThrow(/already exists/i);
  });

  it('[Tier 2] rejects provisioning with missing asset tag or empty model', () => {
    const store = createAssetStore(devicesData.sampleDevices);
    const session = createMockSession('it_admin');

    expect(() => {
      provisionDevice(store, {
        assetNumber: '',
        model: 'Lenovo ThinkPad'
      }, session);
    }).toThrow(/asset number is required/i);

    expect(() => {
      provisionDevice(store, {
        assetNumber: 'LGI-NEW-099',
        model: '   '
      }, session);
    }).toThrow(/device model is required/i);
  });

  it('[Tier 2] rejects decommission when confirmation tag does not match asset number', () => {
    const store = createAssetStore(devicesData.sampleDevices);
    const session = createMockSession('super_admin');

    expect(() => {
      decommissionDevice(store, 'LGI-CD-2024-001', {
        confirmTag: 'WRONG-TAG-001',
        reason: 'Broken display'
      }, session);
    }).toThrow(/does not match asset tag/i);
  });

  it('[Tier 2] rejects decommission when reason is empty or whitespace', () => {
    const store = createAssetStore(devicesData.sampleDevices);
    const session = createMockSession('super_admin');

    expect(() => {
      decommissionDevice(store, 'LGI-CD-2024-001', {
        confirmTag: 'LGI-CD-2024-001',
        reason: '   '
      }, session);
    }).toThrow(/reason is required/i);
  });

  it('[Tier 2] rejects PIN rotation when PIN is empty string', () => {
    const store = createAssetStore(devicesData.sampleDevices);
    const session = createMockSession('it_admin');

    expect(() => {
      rotateDevicePin(store, 'LGI-CD-2024-001', {
        pinPlain: ''
      }, session);
    }).toThrow(/cannot be empty/i);
  });

  it('[Tier 2] safely rejects operations on non-existent device identifier', () => {
    const store = createAssetStore(devicesData.sampleDevices);
    const session = createMockSession('super_admin');

    expect(() => {
      updateDevice(store, 'NON-EXISTENT-TAG', { model: 'Test' }, session);
    }).toThrow(/not found/i);

    expect(() => {
      assignDevice(store, 'NON-EXISTENT-TAG', { isReturn: true }, session);
    }).toThrow(/not found/i);

    expect(() => {
      decommissionDevice(store, 'NON-EXISTENT-TAG', { confirmTag: 'NON-EXISTENT-TAG', reason: 'Test' }, session);
    }).toThrow(/not found/i);
  });

  it('[Tier 2] guarantees zero plaintext PIN leakage in audit metadata and serialized state', () => {
    const store = createAssetStore(devicesData.sampleDevices);
    const session = createMockSession('it_admin');
    const secretPlain = 'SensitivePassphrase123!';

    provisionDevice(store, {
      assetNumber: 'LGI-AUDIT-SAFE-1',
      model: 'Lenovo V14',
      credential: {
        loginEmail: 'safe@leadgeeksinc.com',
        pinPlain: secretPlain
      }
    }, session);

    // Check all audit logs in store
    for (const log of store.auditLogs) {
      const serialized = JSON.stringify(log);
      expect(serialized.includes(secretPlain)).toBe(false);
      expect(log.metadata?.pin).toBeUndefined();
      expect(log.metadata?.pinPlain).toBeUndefined();
    }
  });

  // ============================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS & RBAC PERMISSIONS
  // ============================================================================

  it('[Tier 3] pairwise check: Super Admin has full mutation authority', () => {
    expect(hasPermission('super_admin', 'assets', 'create')).toBe(true);
    expect(hasPermission('super_admin', 'assets', 'update')).toBe(true);
    expect(hasPermission('super_admin', 'assets', 'assign')).toBe(true);
    expect(hasPermission('super_admin', 'credentials', 'rotate')).toBe(true);
    expect(hasPermission('super_admin', 'assets', 'delete')).toBe(true);
  });

  it('[Tier 3] pairwise check: IT Admin has full mutation authority', () => {
    expect(hasPermission('it_admin', 'assets', 'create')).toBe(true);
    expect(hasPermission('it_admin', 'assets', 'update')).toBe(true);
    expect(hasPermission('it_admin', 'assets', 'assign')).toBe(true);
    expect(hasPermission('it_admin', 'credentials', 'rotate')).toBe(true);
    expect(hasPermission('it_admin', 'assets', 'delete')).toBe(true);
  });

  it('[Tier 3] pairwise check: Asset Admin can provision, update, assign, and rotate PIN, but is BLOCKED from decommission', () => {
    expect(hasPermission('asset_admin', 'assets', 'create')).toBe(true);
    expect(hasPermission('asset_admin', 'assets', 'update')).toBe(true);
    expect(hasPermission('asset_admin', 'assets', 'assign')).toBe(true);
    expect(hasPermission('asset_admin', 'credentials', 'rotate')).toBe(true);
    expect(hasPermission('asset_admin', 'assets', 'delete')).toBe(false);

    const store = createAssetStore(devicesData.sampleDevices);
    const session = createMockSession('asset_admin');

    // Asset admin attempting decommission must throw Forbidden error
    expect(() => {
      decommissionDevice(store, 'LGI-CD-2024-001', {
        confirmTag: 'LGI-CD-2024-001',
        reason: 'Attempted by asset admin'
      }, session);
    }).toThrow(/Forbidden.*lacks permission/i);
  });

  it('[Tier 3] pairwise check: Software Admin is blocked from all asset mutations', () => {
    expect(hasPermission('software_admin', 'assets', 'create')).toBe(false);
    expect(hasPermission('software_admin', 'assets', 'update')).toBe(false);
    expect(hasPermission('software_admin', 'assets', 'assign')).toBe(false);
    expect(hasPermission('software_admin', 'credentials', 'rotate')).toBe(false);
    expect(hasPermission('software_admin', 'assets', 'delete')).toBe(false);

    const store = createAssetStore(devicesData.sampleDevices);
    const session = createMockSession('software_admin');

    expect(() => {
      provisionDevice(store, { assetNumber: 'LGI-BLOCKED', model: 'Test' }, session);
    }).toThrow(/Forbidden/i);
  });

  it('[Tier 3] pairwise check: Auditor role is strictly read-only and blocked from all mutations', () => {
    expect(hasPermission('auditor', 'assets', 'create')).toBe(false);
    expect(hasPermission('auditor', 'assets', 'update')).toBe(false);
    expect(hasPermission('auditor', 'assets', 'assign')).toBe(false);
    expect(hasPermission('auditor', 'credentials', 'rotate')).toBe(false);
    expect(hasPermission('auditor', 'assets', 'delete')).toBe(false);

    const store = createAssetStore(devicesData.sampleDevices);
    const session = createMockSession('auditor');

    expect(() => {
      updateDevice(store, 'LGI-CD-2024-001', { model: 'Auditor Edit' }, session);
    }).toThrow(/Forbidden/i);
  });

  it('[Tier 3] verifies every lifecycle mutation creates an immutable audit event with actor linkage', () => {
    const store = createAssetStore(devicesData.sampleDevices);
    const itSession = createMockSession('it_admin');

    const dev = provisionDevice(store, {
      assetNumber: 'LGI-AUDIT-TEST-1',
      model: 'MSI Modern 14'
    }, itSession);

    assignDevice(store, dev.id, {
      assigneeName: 'Test Assignee',
      notes: 'Initial assignment'
    }, itSession);

    rotateDevicePin(store, dev.id, {
      pinPlain: 'RotatedAuditPin#1'
    }, itSession);

    const actions = store.auditLogs.map(l => l.action);
    expect(actions).toContain('asset.create');
    expect(actions).toContain('asset.assign');
    expect(actions).toContain('credential.rotate');

    for (const log of store.auditLogs) {
      expect(log.actorId).toBe(itSession.id);
      expect(log.createdAt).toBeDefined();
    }
  });

  // ============================================================================
  // TIER 4: REAL-WORLD SCENARIOS
  // ============================================================================

  it('[Tier 4] Scenario 1: Complete end-to-end employee device lifecycle', () => {
    const store = createAssetStore(devicesData.sampleDevices);
    const itAdmin = createMockSession('it_admin');
    const assetAdmin = createMockSession('asset_admin');
    const superAdmin = createMockSession('super_admin');

    // Step 1: IT Admin provisions new laptop
    const laptop = provisionDevice(store, {
      assetNumber: 'LGI-LC-2026-001',
      brand: 'LENOVO',
      model: 'ThinkPad T14s Gen 5',
      computerName: 'LeadGeeks-LC-01',
      status: 'available',
      specifications: {
        processor: 'Intel Core Ultra 7 155H',
        ram: '32 GB',
        storage: 'SSD 1 TB'
      },
      credential: {
        loginEmail: 'newhire@leadgeeksinc.com',
        pinPlain: 'InitialWelcomePin2026'
      }
    }, itAdmin);

    expect(laptop.status).toBe('available');

    // Step 2: Asset Admin assigns to onboarding engineer A
    assignDevice(store, laptop.assetNumber, {
      assigneeName: 'Engineer Alice',
      assigneeEmail: 'alice@leadgeeksinc.com',
      custodianName: 'Lead Bob',
      notes: 'Full-time engineer setup'
    }, assetAdmin);

    expect(laptop.status).toBe('assigned');
    expect(laptop.assignment.assigneeName).toBe('Engineer Alice');

    // Step 3: Engineer Alice leaves company; device returned to reserve pool
    assignDevice(store, laptop.assetNumber, {
      isReturn: true,
      targetStatus: 'reserve',
      notes: 'Offboarding complete; laptop returned in mint condition'
    }, assetAdmin);

    expect(laptop.status).toBe('reserve');
    expect(laptop.assignment).toBeNull();
    expect(laptop.assignmentHistory).toHaveLength(1);
    expect(laptop.assignmentHistory[0].assigneeName).toBe('Engineer Alice');

    // Step 4: IT Admin wipes device and rotates OS PIN
    rotateDevicePin(store, laptop.assetNumber, {
      pinPlain: 'PostOffboardingSanitizedPin!99',
      loginEmail: 'engineer-bob@leadgeeksinc.com'
    }, itAdmin);

    expect(decryptPin(laptop.credential.pinHash)).toBe('PostOffboardingSanitizedPin!99');

    // Step 5: Device reassigned to Engineer Bob
    assignDevice(store, laptop.assetNumber, {
      assigneeName: 'Engineer Bob',
      assigneeEmail: 'bob@leadgeeksinc.com',
      notes: 'Reissued after offboarding rotation'
    }, assetAdmin);

    expect(laptop.status).toBe('assigned');
    expect(laptop.assignment.assigneeName).toBe('Engineer Bob');
    expect(laptop.assignmentHistory).toHaveLength(1);

    // Step 6: 2 years later - catastrophic hardware failure; Super Admin decommissions
    decommissionDevice(store, laptop.assetNumber, {
      confirmTag: 'LGI-LC-2026-001',
      reason: 'Physical motherboard circuit burn; hardware retired for electronic recycling'
    }, superAdmin);

    expect(laptop.status).toBe('decommissioned');
    expect(laptop.assignment).toBeNull();
    expect(laptop.assignmentHistory).toHaveLength(2);
    expect(laptop.assignmentHistory[0].notes).toContain('Decommissioned');
  });

  it('[Tier 4] Scenario 2: Security incident response - rapid credential rotation across assigned hardware', () => {
    const store = createAssetStore(devicesData.sampleDevices);
    const itAdmin = createMockSession('it_admin');

    const devicesToRotate = ['LGI-CD-2024-001', 'LGI-CD-2024-002', 'LGI-CD-2024-003'];
    for (const tag of devicesToRotate) {
      const dev = store.findByIdOrTag(tag);
      if (dev) {
        rotateDevicePin(store, tag, {
          pinPlain: `EmergencyRevokePin#${tag}#2026`
        }, itAdmin);

        expect(decryptPin(dev.credential.pinHash)).toBe(`EmergencyRevokePin#${tag}#2026`);
      }
    }

    const rotationLogs = store.auditLogs.filter(l => l.action === 'credential.rotate');
    expect(rotationLogs.length).toBe(3);
  });

  it('[Tier 4] Scenario 3: Bulk inventory audit and decommission of damaged laptops with audit verification', () => {
    const store = createAssetStore(devicesData.sampleDevices);
    const superAdmin = createMockSession('super_admin');

    // Decommission two reserve units
    decommissionDevice(store, 'LGI-CD-2024-001', {
      confirmTag: 'LGI-CD-2024-001',
      reason: 'End of hardware support lifecycle'
    }, superAdmin);

    const dev = store.findByIdOrTag('LGI-CD-2024-001');
    expect(dev.status).toBe('decommissioned');

    const decommLogs = store.auditLogs.filter(l => l.action === 'asset.decommission');
    expect(decommLogs.length).toBe(1);
    expect(decommLogs[0].metadata.reason).toBe('End of hardware support lifecycle');
  });
});
