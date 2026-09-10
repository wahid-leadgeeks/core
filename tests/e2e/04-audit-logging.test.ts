import { describe, it, expect } from '../helpers/test-framework.js';
import { createMockSession, evaluateRouteGuard } from '../helpers/auth-helper.js';

export interface AuditEventRecord {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: string;
}

export class InMemoryAuditLogger {
  private events: AuditEventRecord[] = [];

  log(event: Omit<AuditEventRecord, 'id' | 'createdAt'>): AuditEventRecord {
    const record: AuditEventRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      ...event
    };
    this.events.push(record);
    return record;
  }

  getAll(filters?: { entityType?: string; action?: string; actorId?: string }): AuditEventRecord[] {
    let result = [...this.events].reverse(); // Reverse chronological
    if (filters?.entityType) {
      result = result.filter(e => e.entityType === filters.entityType);
    }
    if (filters?.action) {
      result = result.filter(e => e.action === filters.action);
    }
    if (filters?.actorId) {
      result = result.filter(e => e.actorId === filters.actorId);
    }
    return result;
  }

  attemptDelete(): void {
    throw new Error('FORBIDDEN: Deleting audit events is strictly prohibited');
  }

  attemptUpdate(): void {
    throw new Error('FORBIDDEN: Updating audit events is strictly prohibited');
  }

  count(): number {
    return this.events.length;
  }
}

describe('Suite 04: Immutable Audit Logging & Sensitive Operation Tracking', () => {
  let logger: InMemoryAuditLogger;

  it('[Tier 1] creates and records standard account creation audit event', () => {
    logger = new InMemoryAuditLogger();
    const event = logger.log({
      actorId: 'user-admin-1',
      action: 'account.create',
      entityType: 'account',
      entityId: 'acc-123',
      metadata: { email: 'newuser@leadgeeksinc.com', department: 'OPS' },
      ipAddress: '127.0.0.1'
    });

    expect(event.id).toBeDefined();
    expect(event.action).toBe('account.create');
    expect(event.entityType).toBe('account');
    expect(event.actorId).toBe('user-admin-1');
    expect(logger.count()).toBe(1);
  });

  it('[Tier 1] creates and records device assignment update audit event', () => {
    logger.log({
      actorId: 'user-admin-1',
      action: 'device.assign',
      entityType: 'device',
      entityId: 'dev-456',
      metadata: { assigneeId: 'acc-123', previousAssigneeId: null },
      ipAddress: '192.168.1.50'
    });

    expect(logger.count()).toBe(2);
    const events = logger.getAll({ action: 'device.assign' });
    expect(events).toHaveLength(1);
    expect(events[0].entityType).toBe('device');
  });

  it('[Tier 1] logs sensitive operation: credential.reveal', () => {
    const event = logger.log({
      actorId: 'super-admin-id',
      action: 'credential.reveal',
      entityType: 'device_credential',
      entityId: 'cred-789',
      metadata: { deviceAssetNumber: 'LGI-CD-2024-001', reason: 'IT maintenance' },
      ipAddress: '10.0.0.1'
    });

    expect(event.action).toBe('credential.reveal');
    expect(event.metadata?.pin).toBeUndefined(); // Zero plain text PIN in audit metadata
  });

  it('[Tier 1] logs sensitive operation: account.export', () => {
    const event = logger.log({
      actorId: 'super-admin-id',
      action: 'account.export',
      entityType: 'account',
      entityId: null,
      metadata: { format: 'xlsx', recordCount: 42 },
      ipAddress: '10.0.0.1'
    });

    expect(event.action).toBe('account.export');
  });

  it('[Tier 1] logs sensitive operation: permission.change', () => {
    const event = logger.log({
      actorId: 'super-admin-id',
      action: 'permission.change',
      entityType: 'account',
      entityId: 'target-acc-id',
      metadata: { fromRole: 'Staff', toRole: 'Leaders' },
      ipAddress: '10.0.0.1'
    });

    expect(event.action).toBe('permission.change');
  });

  it('[Tier 1] logs sensitive operation: device.delete', () => {
    const event = logger.log({
      actorId: 'super-admin-id',
      action: 'device.delete',
      entityType: 'device',
      entityId: 'dev-deleted-id',
      metadata: { assetNumber: 'LGI-CD-2024-031', model: 'MSI MODERN 14' },
      ipAddress: '10.0.0.1'
    });

    expect(event.action).toBe('device.delete');
  });

  it('[Tier 1] logs sensitive operation: google_workspace.sync', () => {
    const event = logger.log({
      actorId: 'it-admin-id',
      action: 'google_workspace.sync',
      entityType: 'google_group',
      entityId: null,
      metadata: { groupsProcessed: 15, errorsCount: 0 },
      ipAddress: '10.0.0.5'
    });

    expect(event.action).toBe('google_workspace.sync');
  });

  it('[Tier 1] verifies audit viewer route access control: Super Admin allowed', () => {
    const session = createMockSession('super_admin');
    const res = evaluateRouteGuard({ path: '/audit', method: 'GET', session });
    expect(res.allowed).toBe(true);
  });

  it('[Tier 1] verifies audit viewer route access control: Auditor allowed', () => {
    const session = createMockSession('auditor');
    const res = evaluateRouteGuard({ path: '/audit', method: 'GET', session });
    expect(res.allowed).toBe(true);
  });

  it('[Tier 1] verifies audit viewer route access control: IT Admin blocked with 403', () => {
    const session = createMockSession('it_admin');
    const res = evaluateRouteGuard({ path: '/audit', method: 'GET', session });
    expect(res.statusCode).toBe(403);
  });

  // ============================================================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ============================================================================

  it('[Tier 2] strictly enforces immutability: attempting to delete audit records throws error', () => {
    expect(() => logger.attemptDelete()).toThrow('FORBIDDEN');
  });

  it('[Tier 2] strictly enforces immutability: attempting to update audit records throws error', () => {
    expect(() => logger.attemptUpdate()).toThrow('FORBIDDEN');
  });

  it('[Tier 2] supports pre-auth audit events with null actorId', () => {
    const preAuthEvent = logger.log({
      actorId: null,
      action: 'auth.failed',
      entityType: 'auth',
      entityId: null,
      metadata: { attemptedEmail: 'hacker@external.com', reason: 'Account not found' },
      ipAddress: '203.0.113.195'
    });
    expect(preAuthEvent.actorId).toBeNull();
    expect(preAuthEvent.action).toBe('auth.failed');
  });

  it('[Tier 2] verifies zero plain text PIN leak in credential reveal audit event metadata', () => {
    const events = logger.getAll({ action: 'credential.reveal' });
    for (const evt of events) {
      expect(JSON.stringify(evt.metadata)).not.toContain('123456');
      expect(JSON.stringify(evt.metadata)).not.toContain('Leadgeeks123');
    }
  });

  it('[Tier 2] handles filtering with zero matching records returning empty array gracefully', () => {
    const none = logger.getAll({ entityType: 'non_existent_entity' });
    expect(none).toHaveLength(0);
  });

  it('[Tier 2] preserves reverse chronological ordering of audit log', () => {
    const all = logger.getAll();
    expect(all.length).toBeGreaterThan(1);
    for (let i = 0; i < all.length - 1; i++) {
      const current = new Date(all[i].createdAt).getTime();
      const next = new Date(all[i + 1].createdAt).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });

  it('[Tier 2] supports IPv6 client addresses in audit event', () => {
    const ipv6Event = logger.log({
      actorId: 'admin-id',
      action: 'account.update',
      entityType: 'account',
      entityId: 'acc-1',
      metadata: { field: 'notes' },
      ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334'
    });
    expect(ipv6Event.ipAddress).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
  });

  // ============================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // ============================================================================

  it('[Tier 3] pairwise check: Device creation triggers device audit record', () => {
    const devEvent = logger.log({
      actorId: 'asset-admin-id',
      action: 'device.create',
      entityType: 'device',
      entityId: 'dev-new-uuid',
      metadata: { assetNumber: 'LGI-CD-2024-099', brand: 'LENOVO' },
      ipAddress: '10.0.0.2'
    });

    const found = logger.getAll({ entityType: 'device', action: 'device.create' });
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe(devEvent.id);
  });

  it('[Tier 3] pairwise check: Google Group membership update triggers group audit record', () => {
    logger.log({
      actorId: 'it-admin-id',
      action: 'group_membership.add',
      entityType: 'google_group',
      entityId: 'grp-uuid',
      metadata: { memberEmail: 'newjoiner@leadgeeksinc.com', role: 'member' },
      ipAddress: '10.0.0.2'
    });

    const found = logger.getAll({ entityType: 'google_group' });
    expect(found.some(e => e.action === 'group_membership.add')).toBe(true);
  });

  it('[Tier 3] verifies audit filter combination by actor and action', () => {
    const itSync = logger.getAll({ actorId: 'it-admin-id', action: 'google_workspace.sync' });
    expect(itSync).toHaveLength(1);
  });

  it('[Tier 3] verifies audit trail visibility permissions across all 5 roles', () => {
    expect(evaluateRouteGuard({ path: '/audit', method: 'GET', session: createMockSession('super_admin') }).allowed).toBe(true);
    expect(evaluateRouteGuard({ path: '/audit', method: 'GET', session: createMockSession('auditor') }).allowed).toBe(true);
    expect(evaluateRouteGuard({ path: '/audit', method: 'GET', session: createMockSession('it_admin') }).allowed).toBe(false);
    expect(evaluateRouteGuard({ path: '/audit', method: 'GET', session: createMockSession('asset_admin') }).allowed).toBe(false);
    expect(evaluateRouteGuard({ path: '/audit', method: 'GET', session: createMockSession('software_admin') }).allowed).toBe(false);
  });

  // ============================================================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS
  // ============================================================================

  it('[Tier 4] Scenario 1: Forensics investigation of unauthorized action attempt and security review', () => {
    // 1. Unauthenticated attacker fails auth
    logger.log({
      actorId: null,
      action: 'auth.failed',
      entityType: 'auth',
      entityId: null,
      metadata: { reason: 'Invalid token' },
      ipAddress: '198.51.100.23'
    });

    // 2. Auditor logs in to inspect forensics
    const auditor = createMockSession('auditor');
    expect(evaluateRouteGuard({ path: '/audit', method: 'GET', session: auditor }).allowed).toBe(true);

    // 3. Auditor queries failed auth events
    const failedAuthEvents = logger.getAll({ action: 'auth.failed' });
    expect(failedAuthEvents.length).toBeGreaterThan(0);
    expect(failedAuthEvents[0].ipAddress).toBe('198.51.100.23');
  });

  it('[Tier 4] Scenario 2: Complete hardware asset lifecycle audit trail', () => {
    const devId = 'lifecycle-dev-uuid';

    // 1. Asset registered
    logger.log({ actorId: 'asset-admin', action: 'device.create', entityType: 'device', entityId: devId, metadata: { assetNo: 'LGI-CD-2024-080' }, ipAddress: '10.0.0.1' });
    // 2. Asset assigned
    logger.log({ actorId: 'asset-admin', action: 'device.assign', entityType: 'device', entityId: devId, metadata: { assignee: 'amanda@leadgeeksinc.com' }, ipAddress: '10.0.0.1' });
    // 3. Asset returned
    logger.log({ actorId: 'asset-admin', action: 'device.return', entityType: 'device', entityId: devId, metadata: { status: 'available' }, ipAddress: '10.0.0.1' });
    // 4. Asset decommissioned
    logger.log({ actorId: 'asset-admin', action: 'device.decommission', entityType: 'device', entityId: devId, metadata: { notes: 'Akan dijual' }, ipAddress: '10.0.0.1' });

    const deviceEvents = logger.getAll({ entityType: 'device' }).filter(e => e.entityId === devId);
    expect(deviceEvents).toHaveLength(4);
    // Reverse chronological: newest action is decommission
    expect(deviceEvents[0].action).toBe('device.decommission');
    expect(deviceEvents[3].action).toBe('device.create');
  });

  it('[Tier 4] Scenario 3: Secret reveal audit verification', () => {
    logger.log({
      actorId: 'super-admin',
      action: 'credential.reveal',
      entityType: 'device_credential',
      entityId: 'cred-1',
      metadata: { assetNo: 'LGI-CD-2024-001' },
      ipAddress: '127.0.0.1'
    });

    const revealEvents = logger.getAll({ action: 'credential.reveal' });
    expect(revealEvents.length).toBeGreaterThanOrEqual(1);
    expect(revealEvents[0].action).toBe('credential.reveal');
  });
});
