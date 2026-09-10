import crypto from 'node:crypto';
import { encryptPin } from './crypto-helper.mjs';
import { hasPermission } from './auth-helper.mjs';

export function createAssetStore(initialDevices = []) {
  const devices = new Map();
  const auditLogs = [];

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

    findByIdOrTag(identifier) {
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

export function provisionDevice(store, input, session) {
  if (!session || !hasPermission(session.role, 'assets', 'create')) {
    throw new Error(`Forbidden: Role '${session?.role}' lacks permission to create assets`);
  }

  if (!input.assetNumber || !input.assetNumber.trim()) {
    throw new Error('Asset number is required');
  }
  const assetNumber = input.assetNumber.trim().toUpperCase();

  if (!input.model || !input.model.trim()) {
    throw new Error('Device model is required');
  }

  if (store.findByIdOrTag(assetNumber)) {
    throw new Error(`Device with asset tag '${assetNumber}' already exists`);
  }

  const id = `dev-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  let encryptedPinHash = null;
  if (input.credential?.pinPlain && input.credential.pinPlain.trim()) {
    encryptedPinHash = encryptPin(input.credential.pinPlain.trim()).serialized;
  }

  let status = input.status || 'available';
  let assignment = null;
  if (input.assignment?.accountId || input.assignment?.assigneeName) {
    status = 'assigned';
    assignment = {
      id: `assign-${crypto.randomUUID()}`,
      deviceId: id,
      accountId: input.assignment.accountId || null,
      assigneeName: input.assignment.assigneeName || null,
      assigneeEmail: input.assignment.assigneeEmail || null,
      custodianName: input.assignment.custodianName || null,
      assignedAt: now,
      returnedAt: null,
      notes: input.assignment.notes || null
    };
  }

  const device = {
    id,
    assetNumber,
    brand: input.brand?.trim() || null,
    model: input.model.trim(),
    computerName: input.computerName?.trim() || null,
    status,
    purchasedAt: input.purchasedAt || null,
    hasAntivirus: Boolean(input.hasAntivirus),
    notes: input.notes || null,
    specifications: input.specifications ? {
      processor: input.specifications.processor || null,
      ram: input.specifications.ram || null,
      storage: input.specifications.storage || null
    } : null,
    credential: (input.credential?.loginEmail || encryptedPinHash) ? {
      id: `cred-${crypto.randomUUID()}`,
      deviceId: id,
      loginEmail: input.credential?.loginEmail || null,
      pinHash: encryptedPinHash,
      pinMasked: encryptedPinHash ? '••••••••' : null,
      pinLastRotatedAt: encryptedPinHash ? now : null
    } : null,
    assignment,
    assignmentHistory: []
  };

  store.devices.set(id, device);

  store.auditLogs.push({
    id: `audit-${crypto.randomUUID()}`,
    actorId: session.id,
    action: 'asset.create',
    entityType: 'device',
    entityId: id,
    metadata: {
      assetNumber,
      model: device.model,
      brand: device.brand,
      status: device.status,
      hasInitialCredential: Boolean(encryptedPinHash)
    },
    createdAt: now
  });

  return device;
}

export function updateDevice(store, identifier, input, session) {
  if (!session || !hasPermission(session.role, 'assets', 'update')) {
    throw new Error(`Forbidden: Role '${session?.role}' lacks permission to update assets`);
  }

  const device = store.findByIdOrTag(identifier);
  if (!device) {
    throw new Error(`Device not found for identifier '${identifier}'`);
  }

  if (input.model !== undefined && !input.model.trim()) {
    throw new Error('Model cannot be empty');
  }

  if (input.brand !== undefined) device.brand = input.brand;
  if (input.model !== undefined) device.model = input.model.trim();
  if (input.computerName !== undefined) device.computerName = input.computerName;
  if (input.purchasedAt !== undefined) device.purchasedAt = input.purchasedAt;
  if (input.hasAntivirus !== undefined) device.hasAntivirus = Boolean(input.hasAntivirus);
  if (input.notes !== undefined) device.notes = input.notes;
  if (input.status) device.status = input.status;

  if (input.specifications) {
    device.specifications = {
      ...device.specifications,
      processor: input.specifications.processor !== undefined ? input.specifications.processor : device.specifications?.processor,
      ram: input.specifications.ram !== undefined ? input.specifications.ram : device.specifications?.ram,
      storage: input.specifications.storage !== undefined ? input.specifications.storage : device.specifications?.storage
    };
  }

  store.auditLogs.push({
    id: `audit-${crypto.randomUUID()}`,
    actorId: session.id,
    action: 'asset.update',
    entityType: 'device',
    entityId: device.id,
    metadata: {
      assetNumber: device.assetNumber,
      model: device.model,
      status: device.status
    },
    createdAt: new Date().toISOString()
  });

  return device;
}

export function assignDevice(store, identifier, input, session) {
  if (!session || !hasPermission(session.role, 'assets', 'assign')) {
    throw new Error(`Forbidden: Role '${session?.role}' lacks permission to assign assets`);
  }

  const device = store.findByIdOrTag(identifier);
  if (!device) {
    throw new Error(`Device not found for identifier '${identifier}'`);
  }

  const now = new Date().toISOString();

  // Close previous assignment if exists
  if (device.assignment) {
    const closed = {
      ...device.assignment,
      returnedAt: now,
      notes: input.notes || device.assignment.notes
    };
    device.assignmentHistory.unshift(closed);
  }

  if (input.isReturn || (!input.accountId && !input.assigneeName)) {
    device.assignment = null;
    device.status = input.targetStatus || 'available';

    store.auditLogs.push({
      id: `audit-${crypto.randomUUID()}`,
      actorId: session.id,
      action: 'asset.return',
      entityType: 'device',
      entityId: device.id,
      metadata: {
        assetNumber: device.assetNumber,
        newStatus: device.status,
        returnNotes: input.notes || null
      },
      createdAt: now
    });

    return device;
  }

  // Assigning
  device.status = 'assigned';
  device.assignment = {
    id: `assign-${crypto.randomUUID()}`,
    deviceId: device.id,
    accountId: input.accountId || null,
    assigneeName: input.assigneeName || null,
    assigneeEmail: input.assigneeEmail || null,
    custodianName: input.custodianName || null,
    assignedAt: now,
    returnedAt: null,
    notes: input.notes || null
  };

  store.auditLogs.push({
    id: `audit-${crypto.randomUUID()}`,
    actorId: session.id,
    action: 'asset.assign',
    entityType: 'device',
    entityId: device.id,
    metadata: {
      assetNumber: device.assetNumber,
      assigneeName: device.assignment.assigneeName,
      custodianName: device.assignment.custodianName
    },
    createdAt: now
  });

  return device;
}

export function rotateDevicePin(store, identifier, input, session) {
  if (!session || !hasPermission(session.role, 'credentials', 'rotate')) {
    throw new Error(`Forbidden: Role '${session?.role}' lacks permission to rotate credentials`);
  }

  const device = store.findByIdOrTag(identifier);
  if (!device) {
    throw new Error(`Device not found for identifier '${identifier}'`);
  }

  if (!input.pinPlain || !input.pinPlain.trim()) {
    throw new Error('PIN / Password cannot be empty');
  }

  const now = new Date().toISOString();
  const encrypted = encryptPin(input.pinPlain.trim()).serialized;

  if (!device.credential) {
    device.credential = {
      id: `cred-${crypto.randomUUID()}`,
      deviceId: device.id,
      loginEmail: input.loginEmail?.trim() || null,
      pinHash: encrypted,
      pinMasked: '••••••••',
      pinLastRotatedAt: now
    };
  } else {
    device.credential.pinHash = encrypted;
    device.credential.pinMasked = '••••••••';
    device.credential.pinLastRotatedAt = now;
    if (input.loginEmail !== undefined) {
      device.credential.loginEmail = input.loginEmail?.trim() || null;
    }
  }

  store.auditLogs.push({
    id: `audit-${crypto.randomUUID()}`,
    actorId: session.id,
    action: 'credential.rotate',
    entityType: 'credential',
    entityId: device.credential.id,
    metadata: {
      deviceId: device.id,
      assetNumber: device.assetNumber,
      loginEmail: device.credential.loginEmail
    },
    createdAt: now
  });

  return device;
}

export function decommissionDevice(store, identifier, input, session) {
  // Decommission requires 'delete' permission on assets (strictly super_admin & it_admin)
  if (!session || !hasPermission(session.role, 'assets', 'delete')) {
    throw new Error(`Forbidden: Role '${session?.role}' lacks permission to decommission assets`);
  }

  const device = store.findByIdOrTag(identifier);
  if (!device) {
    throw new Error(`Device not found for identifier '${identifier}'`);
  }

  if (!input.confirmTag || input.confirmTag.trim().toUpperCase() !== device.assetNumber.toUpperCase()) {
    throw new Error(`Confirmation tag '${input.confirmTag}' does not match asset tag '${device.assetNumber}'`);
  }

  if (!input.reason || !input.reason.trim()) {
    throw new Error('Decommissioning reason is required');
  }

  const now = new Date().toISOString();

  if (device.assignment) {
    const closed = {
      ...device.assignment,
      returnedAt: now,
      notes: `Decommissioned: ${input.reason.trim()}`
    };
    device.assignmentHistory.unshift(closed);
    device.assignment = null;
  }

  device.status = 'decommissioned';
  device.notes = device.notes ? `${device.notes} | Decommission reason: ${input.reason.trim()}` : `Decommission reason: ${input.reason.trim()}`;

  store.auditLogs.push({
    id: `audit-${crypto.randomUUID()}`,
    actorId: session.id,
    action: 'asset.decommission',
    entityType: 'device',
    entityId: device.id,
    metadata: {
      assetNumber: device.assetNumber,
      reason: input.reason.trim()
    },
    createdAt: now
  });

  return device;
}
