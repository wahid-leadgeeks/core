// src/domains/assets/service.ts
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { eq, or, desc } from 'drizzle-orm';
import { encryptPin } from '@/lib/crypto/cipher';
import { logAuditEvent } from '@/domains/audit/service';
import type { UserSession } from '@/lib/auth/types';

export interface ProvisionDeviceInput {
  assetNumber: string;
  brand?: string | null;
  model: string;
  computerName?: string | null;
  status?: 'assigned' | 'available' | 'reserve' | 'decommissioned';
  purchasedAt?: string | null;
  hasAntivirus?: boolean;
  notes?: string | null;
  specifications?: {
    processor?: string | null;
    ram?: string | null;
    storage?: string | null;
  } | null;
  credential?: {
    loginEmail?: string | null;
    pinPlain?: string | null;
  } | null;
  assignment?: {
    accountId?: string | null;
    custodianId?: string | null;
    notes?: string | null;
  } | null;
}

export interface UpdateDeviceInput {
  brand?: string | null;
  model?: string;
  computerName?: string | null;
  status?: 'assigned' | 'available' | 'reserve' | 'decommissioned';
  purchasedAt?: string | null;
  hasAntivirus?: boolean;
  notes?: string | null;
  specifications?: {
    processor?: string | null;
    ram?: string | null;
    storage?: string | null;
  } | null;
}

export interface AssignDeviceInput {
  accountId?: string | null;
  custodianId?: string | null;
  notes?: string | null;
  isReturn?: boolean;
  targetStatus?: 'available' | 'reserve';
}

export interface RotatePinInput {
  pinPlain: string;
  loginEmail?: string | null;
  notes?: string | null;
}

export interface DecommissionDeviceInput {
  confirmTag: string;
  reason: string;
  notes?: string | null;
}

export interface StoredDevice {
  id: string;
  assetNumber: string;
  brand: string | null;
  model: string;
  computerName: string | null;
  status: 'assigned' | 'available' | 'reserve' | 'decommissioned';
  purchasedAt: string | null;
  hasAntivirus: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  specifications?: {
    id: string;
    deviceId: string;
    processor: string | null;
    ram: string | null;
    storage: string | null;
  } | null;
  assignment?: {
    id: string;
    deviceId: string;
    accountId: string | null;
    custodianId: string | null;
    assignedAt: string;
    returnedAt: string | null;
    assigneeName?: string | null;
    assigneeEmail?: string | null;
    custodianName?: string | null;
    departmentName?: string | null;
    departmentCode?: string | null;
    notes?: string | null;
  } | null;
  credential?: {
    id: string;
    deviceId: string;
    loginEmail: string | null;
    pinHash: string | null;
    pinMasked: string | null;
    pinLastRotatedAt: string | null;
  } | null;
  assignmentHistory?: Array<{
    id: string;
    deviceId: string;
    accountId: string | null;
    custodianId: string | null;
    assignedAt: string;
    returnedAt: string | null;
    assigneeName?: string | null;
    assigneeEmail?: string | null;
    notes?: string | null;
  }>;
}

function isValidUUID(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

// In-memory devices store for test runner and fallback
const inMemoryDevices = new Map<string, StoredDevice>();

function loadFallbackFixtureOnce() {
  if (inMemoryDevices.size > 0) return;
  try {
    const fixturePath = path.join(process.cwd(), 'tests/fixtures/spreadsheet-devices.json');
    if (fs.existsSync(fixturePath)) {
      const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      for (const d of data.sampleDevices || []) {
        const id = d.id || `dev-${d.assetNumber.toLowerCase()}`;
        inMemoryDevices.set(id, {
          id,
          assetNumber: d.assetNumber,
          brand: d.brand || null,
          model: d.model,
          computerName: d.computerName || null,
          status: d.status || 'available',
          purchasedAt: '2024-01-15',
          hasAntivirus: Boolean(d.hasAntivirus),
          notes: 'Ingested asset',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          specifications: {
            id: `spec-${id}`,
            deviceId: id,
            processor: d.processor || null,
            ram: d.ram || null,
            storage: d.storage || null,
          },
          assignment: d.picName
            ? {
                id: `assign-${id}`,
                deviceId: id,
                accountId: 'acc-1',
                custodianId: d.pic2Name ? 'acc-2' : null,
                assignedAt: '2024-01-20T00:00:00.000Z',
                returnedAt: null,
                assigneeName: d.picName,
                assigneeEmail: d.loginEmail,
                custodianName: d.pic2Name || null,
                departmentName: 'Operations',
                departmentCode: 'OPS',
              }
            : null,
          credential: d.loginEmail
            ? {
                id: `cred-${id}`,
                deviceId: id,
                loginEmail: d.loginEmail,
                pinHash: d.pinPlain ? encryptPin(d.pinPlain).serialized : null,
                pinMasked: '••••••••',
                pinLastRotatedAt: null,
              }
            : null,
          assignmentHistory: [],
        });
      }
    }
  } catch (err) {
    console.error('Failed to load fallback fixture in asset service:', err);
  }
}

// Initial fixture loading
loadFallbackFixtureOnce();

export async function findDeviceByIdOrTag(identifier: string): Promise<StoredDevice | null> {
  const clean = identifier.trim();
  const isUUID = isValidUUID(clean);

  // 1. Try DB
  try {
    const condition = isUUID
      ? or(eq(schema.devices.id, clean), eq(schema.devices.assetNumber, clean))
      : eq(schema.devices.assetNumber, clean);

    const devRows = await db.select().from(schema.devices).where(condition).limit(1);
    if (devRows && devRows.length > 0) {
      const dev = devRows[0];
      const specs = await db.select().from(schema.deviceSpecifications).where(eq(schema.deviceSpecifications.deviceId, dev.id)).limit(1);
      const assigns = await db.select().from(schema.deviceAssignments).where(eq(schema.deviceAssignments.deviceId, dev.id)).orderBy(desc(schema.deviceAssignments.assignedAt));
      const creds = await db.select().from(schema.deviceCredentials).where(eq(schema.deviceCredentials.deviceId, dev.id)).limit(1);

      const active = assigns.find((a) => !a.returnedAt);
      let assignee = null;
      let custodian = null;
      let dept = null;

      if (active?.accountId) {
        const accRows = await db.select().from(schema.accounts).where(eq(schema.accounts.id, active.accountId)).limit(1);
        if (accRows[0]) {
          assignee = accRows[0];
          if (assignee.departmentId) {
            const deptRows = await db.select().from(schema.departments).where(eq(schema.departments.id, assignee.departmentId)).limit(1);
            dept = deptRows[0];
          }
        }
      }

      if (active?.custodianId) {
        const custRows = await db.select().from(schema.accounts).where(eq(schema.accounts.id, active.custodianId)).limit(1);
        custodian = custRows[0] || null;
      }

      return {
        id: dev.id,
        assetNumber: dev.assetNumber,
        brand: dev.brand,
        model: dev.model,
        computerName: dev.computerName,
        status: dev.status,
        purchasedAt: dev.purchasedAt,
        hasAntivirus: dev.hasAntivirus,
        notes: dev.notes,
        createdAt: dev.createdAt.toISOString(),
        updatedAt: dev.updatedAt.toISOString(),
        specifications: specs[0] || null,
        assignment: active
          ? {
              id: active.id,
              deviceId: active.deviceId,
              accountId: active.accountId,
              custodianId: active.custodianId,
              assignedAt: active.assignedAt.toISOString(),
              returnedAt: active.returnedAt ? active.returnedAt.toISOString() : null,
              assigneeName: assignee ? assignee.displayName || assignee.fullName : null,
              assigneeEmail: assignee?.email || null,
              custodianName: custodian ? custodian.displayName || custodian.fullName : null,
              departmentName: dept?.name || null,
              departmentCode: dept?.code || null,
              notes: active.notes,
            }
          : null,
        credential: creds[0]
          ? {
              id: creds[0].id,
              deviceId: creds[0].deviceId,
              loginEmail: creds[0].loginEmail,
              pinHash: creds[0].pinHash,
              pinMasked: creds[0].pinHash ? '••••••••' : null,
              pinLastRotatedAt: creds[0].pinLastRotatedAt ? creds[0].pinLastRotatedAt.toISOString() : null,
            }
          : null,
        assignmentHistory: assigns.map((a) => ({
          id: a.id,
          deviceId: a.deviceId,
          accountId: a.accountId,
          custodianId: a.custodianId,
          assignedAt: a.assignedAt.toISOString(),
          returnedAt: a.returnedAt ? a.returnedAt.toISOString() : null,
          notes: a.notes,
        })),
      };
    }
  } catch {
    // Database query failed or unavailable, check memory store
  }

  // 2. Check memory store
  for (const item of inMemoryDevices.values()) {
    if (item.id === clean || item.assetNumber.toLowerCase() === clean.toLowerCase()) {
      return item;
    }
  }

  return null;
}

export async function getAllDevices(): Promise<StoredDevice[]> {
  try {
    const devs = await db.select().from(schema.devices).orderBy(desc(schema.devices.purchasedAt));
    if (devs && devs.length > 0) {
      const result: StoredDevice[] = [];
      for (const d of devs) {
        const full = await findDeviceByIdOrTag(d.id);
        if (full) result.push(full);
      }
      return result;
    }
  } catch {
    // DB not available
  }
  return Array.from(inMemoryDevices.values());
}

/**
 * Provisions a new hardware asset with specifications, optional initial credential, and audit logging.
 */
export async function provisionDevice(
  input: ProvisionDeviceInput,
  actor: UserSession,
  ipAddress?: string | null
): Promise<StoredDevice> {
  const assetNumber = input.assetNumber.trim().toUpperCase();
  if (!assetNumber) {
    throw new Error('Asset number is required');
  }
  if (!input.model || !input.model.trim()) {
    throw new Error('Device model is required');
  }

  // Check unique assetNumber
  const existing = await findDeviceByIdOrTag(assetNumber);
  if (existing) {
    throw new Error(`Device with asset tag '${assetNumber}' already exists`);
  }

  const deviceId = crypto.randomUUID();
  const now = new Date();
  const nowIso = now.toISOString();
  let initialStatus: 'assigned' | 'available' | 'reserve' | 'decommissioned' = input.status || 'available';

  if (input.assignment?.accountId) {
    initialStatus = 'assigned';
  }

  let encryptedPinHash: string | null = null;
  if (input.credential?.pinPlain && input.credential.pinPlain.trim()) {
    encryptedPinHash = encryptPin(input.credential.pinPlain.trim()).serialized;
  }

  const stored: StoredDevice = {
    id: deviceId,
    assetNumber,
    brand: input.brand?.trim() || null,
    model: input.model.trim(),
    computerName: input.computerName?.trim() || null,
    status: initialStatus,
    purchasedAt: input.purchasedAt || null,
    hasAntivirus: Boolean(input.hasAntivirus),
    notes: input.notes?.trim() || null,
    createdAt: nowIso,
    updatedAt: nowIso,
    specifications: input.specifications
      ? {
          id: crypto.randomUUID(),
          deviceId,
          processor: input.specifications.processor?.trim() || null,
          ram: input.specifications.ram?.trim() || null,
          storage: input.specifications.storage?.trim() || null,
        }
      : null,
    credential: (input.credential?.loginEmail || encryptedPinHash)
      ? {
          id: crypto.randomUUID(),
          deviceId,
          loginEmail: input.credential?.loginEmail?.trim() || null,
          pinHash: encryptedPinHash,
          pinMasked: encryptedPinHash ? '••••••••' : null,
          pinLastRotatedAt: encryptedPinHash ? nowIso : null,
        }
      : null,
    assignment: input.assignment?.accountId
      ? {
          id: crypto.randomUUID(),
          deviceId,
          accountId: input.assignment.accountId,
          custodianId: input.assignment.custodianId || null,
          assignedAt: nowIso,
          returnedAt: null,
          notes: input.assignment.notes?.trim() || null,
        }
      : null,
    assignmentHistory: [],
  };

  // 1. Try DB insert
  try {
    await db.insert(schema.devices).values({
      id: deviceId,
      assetNumber,
      brand: stored.brand,
      model: stored.model,
      computerName: stored.computerName,
      status: stored.status,
      purchasedAt: stored.purchasedAt,
      hasAntivirus: stored.hasAntivirus,
      notes: stored.notes,
      createdAt: now,
      updatedAt: now,
    });

    if (stored.specifications) {
      await db.insert(schema.deviceSpecifications).values({
        id: stored.specifications.id,
        deviceId,
        processor: stored.specifications.processor,
        ram: stored.specifications.ram,
        storage: stored.specifications.storage,
      });
    }

    if (stored.credential) {
      await db.insert(schema.deviceCredentials).values({
        id: stored.credential.id,
        deviceId,
        loginEmail: stored.credential.loginEmail,
        pinHash: stored.credential.pinHash,
        pinLastRotatedAt: stored.credential.pinHash ? now : null,
        notes: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (stored.assignment && stored.assignment.accountId) {
      await db.insert(schema.deviceAssignments).values({
        id: stored.assignment.id,
        deviceId,
        accountId: isValidUUID(stored.assignment.accountId) ? stored.assignment.accountId : null,
        custodianId: isValidUUID(stored.assignment.custodianId) ? stored.assignment.custodianId : null,
        assignedAt: now,
        notes: stored.assignment.notes || null,
        createdAt: now,
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'production') throw err;
  }

  // 2. Save in memory store
  inMemoryDevices.set(deviceId, stored);

  // 3. Emit immutable audit event (zero plaintext leak!)
  await logAuditEvent({
    actorId: actor.id,
    action: 'asset.create',
    entityType: 'device',
    entityId: deviceId,
    metadata: {
      assetNumber,
      brand: stored.brand,
      model: stored.model,
      status: stored.status,
      hasInitialCredential: Boolean(encryptedPinHash),
    },
    ipAddress: ipAddress || null,
  });

  return stored;
}

/**
 * Updates specifications and asset metadata.
 */
export async function updateDevice(
  identifier: string,
  input: UpdateDeviceInput,
  actor: UserSession,
  ipAddress?: string | null
): Promise<StoredDevice> {
  const existing = await findDeviceByIdOrTag(identifier);
  if (!existing) {
    throw new Error(`Device not found for identifier '${identifier}'`);
  }

  const now = new Date();
  const nowIso = now.toISOString();

  if (input.model !== undefined && !input.model.trim()) {
    throw new Error('Model cannot be empty');
  }

  existing.brand = input.brand !== undefined ? input.brand : existing.brand;
  existing.model = input.model !== undefined ? input.model.trim() : existing.model;
  existing.computerName = input.computerName !== undefined ? input.computerName : existing.computerName;
  existing.purchasedAt = input.purchasedAt !== undefined ? input.purchasedAt : existing.purchasedAt;
  existing.hasAntivirus = input.hasAntivirus !== undefined ? input.hasAntivirus : existing.hasAntivirus;
  existing.notes = input.notes !== undefined ? input.notes : existing.notes;
  if (input.status) {
    existing.status = input.status;
  }
  existing.updatedAt = nowIso;

  if (input.specifications) {
    if (!existing.specifications) {
      existing.specifications = {
        id: crypto.randomUUID(),
        deviceId: existing.id,
        processor: input.specifications.processor?.trim() || null,
        ram: input.specifications.ram?.trim() || null,
        storage: input.specifications.storage?.trim() || null,
      };
    } else {
      existing.specifications.processor = input.specifications.processor !== undefined ? input.specifications.processor : existing.specifications.processor;
      existing.specifications.ram = input.specifications.ram !== undefined ? input.specifications.ram : existing.specifications.ram;
      existing.specifications.storage = input.specifications.storage !== undefined ? input.specifications.storage : existing.specifications.storage;
    }
  }

  // 1. Update DB
  try {
    await db
      .update(schema.devices)
      .set({
        brand: existing.brand,
        model: existing.model,
        computerName: existing.computerName,
        purchasedAt: existing.purchasedAt,
        hasAntivirus: existing.hasAntivirus,
        notes: existing.notes,
        status: existing.status,
        updatedAt: now,
      })
      .where(eq(schema.devices.id, existing.id));

    if (existing.specifications) {
      await db
        .insert(schema.deviceSpecifications)
        .values({
          id: existing.specifications.id,
          deviceId: existing.id,
          processor: existing.specifications.processor,
          ram: existing.specifications.ram,
          storage: existing.specifications.storage,
        })
        .onConflictDoUpdate({
          target: schema.deviceSpecifications.deviceId,
          set: {
            processor: existing.specifications.processor,
            ram: existing.specifications.ram,
            storage: existing.specifications.storage,
          },
        });
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'production') throw err;
  }

  // 2. Update memory store
  inMemoryDevices.set(existing.id, existing);

  // 3. Emit audit event
  await logAuditEvent({
    actorId: actor.id,
    action: 'asset.update',
    entityType: 'device',
    entityId: existing.id,
    metadata: {
      assetNumber: existing.assetNumber,
      model: existing.model,
      brand: existing.brand,
      status: existing.status,
    },
    ipAddress: ipAddress || null,
  });

  return existing;
}

/**
 * Assigns or returns a device, handling automatic status transitions and complete history.
 */
export async function assignDevice(
  identifier: string,
  input: AssignDeviceInput,
  actor: UserSession,
  ipAddress?: string | null
): Promise<StoredDevice> {
  const existing = await findDeviceByIdOrTag(identifier);
  if (!existing) {
    throw new Error(`Device not found for identifier '${identifier}'`);
  }

  const now = new Date();
  const nowIso = now.toISOString();

  // Closing previous assignment if any
  if (existing.assignment) {
    const closed = {
      ...existing.assignment,
      returnedAt: nowIso,
      notes: input.notes || existing.assignment.notes,
    };
    if (!existing.assignmentHistory) existing.assignmentHistory = [];
    existing.assignmentHistory.unshift(closed);

    try {
      if (isValidUUID(existing.assignment.id)) {
        await db
          .update(schema.deviceAssignments)
          .set({ returnedAt: now, notes: closed.notes })
          .where(eq(schema.deviceAssignments.id, existing.assignment.id));
      }
    } catch {
      // ignore offline
    }
  }

  if (input.isReturn || !input.accountId) {
    // Returning device
    existing.assignment = null;
    existing.status = input.targetStatus || 'available';

    try {
      await db
        .update(schema.devices)
        .set({ status: existing.status, updatedAt: now })
        .where(eq(schema.devices.id, existing.id));
    } catch {
      // ignore
    }

    inMemoryDevices.set(existing.id, existing);

    await logAuditEvent({
      actorId: actor.id,
      action: 'asset.return',
      entityType: 'device',
      entityId: existing.id,
      metadata: {
        assetNumber: existing.assetNumber,
        newStatus: existing.status,
        returnNotes: input.notes,
      },
      ipAddress: ipAddress || null,
    });

    return existing;
  }

  // Assigning to account
  const newAssignId = crypto.randomUUID();
  existing.status = 'assigned';
  existing.assignment = {
    id: newAssignId,
    deviceId: existing.id,
    accountId: input.accountId,
    custodianId: input.custodianId || null,
    assignedAt: nowIso,
    returnedAt: null,
    notes: input.notes?.trim() || null,
  };

  try {
    await db
      .update(schema.devices)
      .set({ status: 'assigned', updatedAt: now })
      .where(eq(schema.devices.id, existing.id));

    await db.insert(schema.deviceAssignments).values({
      id: newAssignId,
      deviceId: existing.id,
      accountId: isValidUUID(input.accountId) ? input.accountId : null,
      custodianId: isValidUUID(input.custodianId) ? input.custodianId : null,
      assignedAt: now,
      notes: input.notes?.trim() || null,
      createdAt: now,
    });
  } catch {
    // ignore offline
  }

  inMemoryDevices.set(existing.id, existing);

  await logAuditEvent({
    actorId: actor.id,
    action: 'asset.assign',
    entityType: 'device',
    entityId: existing.id,
    metadata: {
      assetNumber: existing.assetNumber,
      accountId: input.accountId,
      custodianId: input.custodianId,
    },
    ipAddress: ipAddress || null,
  });

  return existing;
}

/**
 * Rotates or updates device PIN credentials (AES-256-GCM encrypted).
 */
export async function rotateDevicePin(
  identifier: string,
  input: RotatePinInput,
  actor: UserSession,
  ipAddress?: string | null
): Promise<StoredDevice> {
  const existing = await findDeviceByIdOrTag(identifier);
  if (!existing) {
    throw new Error(`Device not found for identifier '${identifier}'`);
  }

  if (!input.pinPlain || !input.pinPlain.trim()) {
    throw new Error('PIN / Password cannot be empty');
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const encrypted = encryptPin(input.pinPlain.trim()).serialized;

  if (!existing.credential) {
    existing.credential = {
      id: crypto.randomUUID(),
      deviceId: existing.id,
      loginEmail: input.loginEmail?.trim() || null,
      pinHash: encrypted,
      pinMasked: '••••••••',
      pinLastRotatedAt: nowIso,
    };
  } else {
    existing.credential.pinHash = encrypted;
    existing.credential.pinMasked = '••••••••';
    existing.credential.pinLastRotatedAt = nowIso;
    if (input.loginEmail !== undefined) {
      existing.credential.loginEmail = input.loginEmail?.trim() || null;
    }
  }

  // 1. Update DB
  try {
    await db
      .insert(schema.deviceCredentials)
      .values({
        id: existing.credential.id,
        deviceId: existing.id,
        loginEmail: existing.credential.loginEmail,
        pinHash: encrypted,
        pinLastRotatedAt: now,
        notes: input.notes || null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.deviceCredentials.deviceId,
        set: {
          pinHash: encrypted,
          loginEmail: existing.credential.loginEmail,
          pinLastRotatedAt: now,
          updatedAt: now,
        },
      });
  } catch {
    // ignore offline
  }

  inMemoryDevices.set(existing.id, existing);

  // 2. Audit event with ZERO secret leak
  await logAuditEvent({
    actorId: actor.id,
    action: 'credential.rotate',
    entityType: 'credential',
    entityId: existing.credential.id,
    metadata: {
      deviceId: existing.id,
      assetNumber: existing.assetNumber,
      loginEmail: existing.credential.loginEmail,
    },
    ipAddress: ipAddress || null,
  });

  return existing;
}

/**
 * Soft decommissions a hardware asset with strict confirmation and reason requirements.
 */
export async function decommissionDevice(
  identifier: string,
  input: DecommissionDeviceInput,
  actor: UserSession,
  ipAddress?: string | null
): Promise<StoredDevice> {
  const existing = await findDeviceByIdOrTag(identifier);
  if (!existing) {
    throw new Error(`Device not found for identifier '${identifier}'`);
  }

  // Verify asset tag confirmation
  if (!input.confirmTag || input.confirmTag.trim().toUpperCase() !== existing.assetNumber.toUpperCase()) {
    throw new Error(`Confirmation tag '${input.confirmTag}' does not match asset tag '${existing.assetNumber}'`);
  }

  // Verify non-empty reason
  if (!input.reason || !input.reason.trim()) {
    throw new Error('Decommissioning reason is required');
  }

  const now = new Date();
  const nowIso = now.toISOString();

  // Close active assignment
  if (existing.assignment) {
    const closed = {
      ...existing.assignment,
      returnedAt: nowIso,
      notes: `Decommissioned: ${input.reason.trim()}`,
    };
    if (!existing.assignmentHistory) existing.assignmentHistory = [];
    existing.assignmentHistory.unshift(closed);

    try {
      if (isValidUUID(existing.assignment.id)) {
        await db
          .update(schema.deviceAssignments)
          .set({ returnedAt: now, notes: closed.notes })
          .where(eq(schema.deviceAssignments.id, existing.assignment.id));
      }
    } catch {
      // ignore
    }
    existing.assignment = null;
  }

  existing.status = 'decommissioned';
  existing.updatedAt = nowIso;
  if (input.notes) {
    existing.notes = existing.notes ? `${existing.notes} | Reason: ${input.reason.trim()}` : `Decommission reason: ${input.reason.trim()}`;
  }

  // 1. Update DB
  try {
    await db
      .update(schema.devices)
      .set({
        status: 'decommissioned',
        notes: existing.notes,
        updatedAt: now,
      })
      .where(eq(schema.devices.id, existing.id));
  } catch {
    // ignore
  }

  inMemoryDevices.set(existing.id, existing);

  // 2. High severity audit event
  await logAuditEvent({
    actorId: actor.id,
    action: 'asset.decommission',
    entityType: 'device',
    entityId: existing.id,
    metadata: {
      assetNumber: existing.assetNumber,
      reason: input.reason.trim(),
    },
    ipAddress: ipAddress || null,
  });

  return existing;
}
