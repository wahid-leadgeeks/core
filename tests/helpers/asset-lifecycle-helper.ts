import crypto from 'node:crypto';
import { encryptPin } from './crypto-helper';
import { hasPermission } from './auth-helper';
import type { SystemRole } from '../../src/lib/auth/types';

export interface TestSession {
  id: string;
  email: string;
  displayName: string;
  role: SystemRole;
  departmentCode?: string;
}

export function createAssetStore(initialDevices: any[] = []) {
  const devices = new Map<string, any>();
  const auditLogs: any[] = [];

  for (const d of initialDevices) {
    const id = d.id || `dev-${d.assetNumber.toLowerCase()}`;
    devices.set(id, {
      id,
      assetNumber: d.assetNumber,
      brand: d.brand || null,
      model: d.model,
      computerName: d.computerName || null,
      status: d.status || 'available',
      purchasedAt: d.purchasedAt || '2024-01-15',
      hasAntivirus: Boolean(d.hasAntivirus),
      notes: d.notes || null,
      specifications: {
        processor: d.processor || null,
        ram: d.ram || null,
        storage: d.storage || null
      },
      assignment: d.picName ? {
        id: `assign-${id}`,
        deviceId: id,
        assigneeName: d.picName,
        assigneeEmail: d.loginEmail,
        custodianName: d.pic2Name || null,
        assignedAt: '2024-01-20T00:00:00.000Z',
        returnedAt: null
      } : null,
      credential: d.loginEmail ? {
        id: `cred-${id}`,
        deviceId: id,
        loginEmail: d.loginEmail,
        pinHash: d.pinPlain ? encryptPin(d.pinPlain).serialized : null,
        pinMasked: '••••••••',
        pinLastRotatedAt: null
      } : null,
      assignmentHistory: []
    });
  }

  return {
    devices,
    auditLogs,

    findByIdOrTag(identifier: string) {
      const clean = String(identifier).trim().toLowerCase();
      for (const dev of devices.values()) {
        if (dev.id.toLowerCase() === clean || dev.assetNumber.toLowerCase() === clean) {
          return dev;
        }
      }
      return null;
    }
  };
}
