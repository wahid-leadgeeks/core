import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from '../helpers/test-framework.mjs';
import { hasPermission, createMockSession, evaluateRouteGuard } from '../helpers/auth-helper.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rbacData = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/rbac-matrix.json'), 'utf8'));

describe('Suite 03: Role-Based Access Control (RBAC) & Server-Side Authorization', () => {

  // ============================================================================
  // TIER 1: FEATURE COVERAGE
  // ============================================================================

  it('[Tier 1] verifies Super Admin has unconstrained permissions across all domains', () => {
    expect(hasPermission('super_admin', 'identity', 'create')).toBe(true);
    expect(hasPermission('super_admin', 'identity', 'delete')).toBe(true);
    expect(hasPermission('super_admin', 'groups', 'sync')).toBe(true);
    expect(hasPermission('super_admin', 'assets', 'create')).toBe(true);
    expect(hasPermission('super_admin', 'credentials', 'reveal')).toBe(true);
    expect(hasPermission('super_admin', 'software', 'delete')).toBe(true);
    expect(hasPermission('super_admin', 'audit', 'read')).toBe(true);
  });

  it('[Tier 1] verifies IT Admin has full operational management across infrastructure', () => {
    expect(hasPermission('it_admin', 'identity', 'create')).toBe(true);
    expect(hasPermission('it_admin', 'groups', 'sync')).toBe(true);
    expect(hasPermission('it_admin', 'assets', 'create')).toBe(true);
    expect(hasPermission('it_admin', 'credentials', 'reveal')).toBe(true);
    expect(hasPermission('it_admin', 'software', 'create')).toBe(true);
  });

  it('[Tier 1] verifies IT Admin is blocked from reading audit logs', () => {
    expect(hasPermission('it_admin', 'audit', 'read')).toBe(false);
  });

  it('[Tier 1] verifies Asset Admin can create and update hardware assets', () => {
    expect(hasPermission('asset_admin', 'assets', 'create')).toBe(true);
    expect(hasPermission('asset_admin', 'assets', 'update')).toBe(true);
    expect(hasPermission('asset_admin', 'assets', 'assign')).toBe(true);
  });

  it('[Tier 1] verifies Asset Admin is blocked from modifying software applications', () => {
    expect(hasPermission('asset_admin', 'software', 'create')).toBe(false);
    expect(hasPermission('asset_admin', 'software', 'delete')).toBe(false);
  });

  it('[Tier 1] verifies Software Admin can create and update applications', () => {
    expect(hasPermission('software_admin', 'software', 'create')).toBe(true);
    expect(hasPermission('software_admin', 'software', 'update')).toBe(true);
    expect(hasPermission('software_admin', 'software', 'delete')).toBe(true);
  });

  it('[Tier 1] verifies Software Admin is blocked from modifying hardware devices', () => {
    expect(hasPermission('software_admin', 'assets', 'create')).toBe(false);
    expect(hasPermission('software_admin', 'assets', 'delete')).toBe(false);
  });

  it('[Tier 1] verifies Auditor has read-only access across all business domains', () => {
    expect(hasPermission('auditor', 'identity', 'read')).toBe(true);
    expect(hasPermission('auditor', 'groups', 'read')).toBe(true);
    expect(hasPermission('auditor', 'assets', 'read')).toBe(true);
    expect(hasPermission('auditor', 'software', 'read')).toBe(true);
    expect(hasPermission('auditor', 'audit', 'read')).toBe(true);
  });

  it('[Tier 1] verifies Auditor is strictly prohibited from write operations', () => {
    expect(hasPermission('auditor', 'identity', 'create')).toBe(false);
    expect(hasPermission('auditor', 'identity', 'update')).toBe(false);
    expect(hasPermission('auditor', 'identity', 'delete')).toBe(false);
    expect(hasPermission('auditor', 'groups', 'create')).toBe(false);
    expect(hasPermission('auditor', 'groups', 'sync')).toBe(false);
    expect(hasPermission('auditor', 'assets', 'create')).toBe(false);
    expect(hasPermission('auditor', 'software', 'create')).toBe(false);
  });

  it('[Tier 1] verifies Auditor is strictly prohibited from revealing secrets', () => {
    expect(hasPermission('auditor', 'credentials', 'reveal')).toBe(false);
  });

  it('[Tier 1] verifies all 5 sensitive operations are enumerated in rbac matrix', () => {
    expect(rbacData.sensitiveOperations).toHaveLength(5);
    expect(rbacData.sensitiveOperations).toContain('credential.reveal');
    expect(rbacData.sensitiveOperations).toContain('account.export');
    expect(rbacData.sensitiveOperations).toContain('permission.change');
    expect(rbacData.sensitiveOperations).toContain('device.delete');
    expect(rbacData.sensitiveOperations).toContain('google_workspace.sync');
  });

  it('[Tier 1] verifies audit trail deletion is universally forbidden for all roles', () => {
    for (const role of rbacData.roles) {
      expect(hasPermission(role, 'audit', 'delete')).toBe(false);
    }
  });

  // ============================================================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ============================================================================

  it('[Tier 2] rejects write operations when method is POST from Auditor', () => {
    const session = createMockSession('auditor');
    const res = evaluateRouteGuard({ path: '/api/devices', method: 'POST', session });
    expect(res.statusCode).toBe(403);
    expect(res.errorMessage).toContain('strictly read-only');
  });

  it('[Tier 2] rejects update operations when method is PUT from Auditor', () => {
    const session = createMockSession('auditor');
    const res = evaluateRouteGuard({ path: '/api/devices/dev-1', method: 'PUT', session });
    expect(res.statusCode).toBe(403);
  });

  it('[Tier 2] rejects update operations when method is PATCH from Auditor', () => {
    const session = createMockSession('auditor');
    const res = evaluateRouteGuard({ path: '/api/accounts/acc-1', method: 'PATCH', session });
    expect(res.statusCode).toBe(403);
  });

  it('[Tier 2] rejects delete operations when method is DELETE from Auditor', () => {
    const session = createMockSession('auditor');
    const res = evaluateRouteGuard({ path: '/api/applications/app-1', method: 'DELETE', session });
    expect(res.statusCode).toBe(403);
  });

  it('[Tier 2] blocks Asset Admin from accessing Google Groups API', () => {
    const session = createMockSession('asset_admin');
    const res = evaluateRouteGuard({ path: '/api/groups', method: 'GET', session });
    expect(res.statusCode).toBe(403);
  });

  it('[Tier 2] blocks Software Admin from accessing Google Groups API', () => {
    const session = createMockSession('software_admin');
    const res = evaluateRouteGuard({ path: '/api/groups', method: 'GET', session });
    expect(res.statusCode).toBe(403);
  });

  it('[Tier 2] blocks Asset Admin from revealing device PINs', () => {
    const session = createMockSession('asset_admin');
    const res = evaluateRouteGuard({ path: '/api/assets/dev-1/credentials/reveal', method: 'POST', session });
    expect(res.statusCode).toBe(403);
    expect(res.errorMessage).toContain('requires Super Admin or IT Admin privileges');
  });

  it('[Tier 2] blocks Auditor from revealing device PINs', () => {
    const session = createMockSession('auditor');
    const res = evaluateRouteGuard({ path: '/api/assets/dev-1/credentials/reveal', method: 'POST', session });
    expect(res.statusCode).toBe(403);
  });

  // ============================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // ============================================================================

  it('[Tier 3] pairwise check: IT Admin vs Auditor access to /audit', () => {
    const itSession = createMockSession('it_admin');
    const auditorSession = createMockSession('auditor');

    expect(evaluateRouteGuard({ path: '/audit', method: 'GET', session: itSession }).allowed).toBe(false);
    expect(evaluateRouteGuard({ path: '/audit', method: 'GET', session: auditorSession }).allowed).toBe(true);
  });

  it('[Tier 3] pairwise check: Asset Admin vs Software Admin cross-domain mutability', () => {
    const assetSession = createMockSession('asset_admin');
    const softSession = createMockSession('software_admin');

    expect(evaluateRouteGuard({ path: '/api/assets', method: 'POST', session: assetSession }).allowed).toBe(true);
    expect(evaluateRouteGuard({ path: '/api/software', method: 'POST', session: assetSession }).allowed).toBe(false);

    expect(evaluateRouteGuard({ path: '/api/software', method: 'POST', session: softSession }).allowed).toBe(true);
    expect(evaluateRouteGuard({ path: '/api/assets', method: 'POST', session: softSession }).allowed).toBe(false);
  });

  it('[Tier 3] pairwise check: Super Admin vs IT Admin on credential reveal', () => {
    const superSession = createMockSession('super_admin');
    const itSession = createMockSession('it_admin');

    expect(evaluateRouteGuard({ path: '/api/assets/dev-1/credentials/reveal', method: 'POST', session: superSession }).allowed).toBe(true);
    expect(evaluateRouteGuard({ path: '/api/assets/dev-1/credentials/reveal', method: 'POST', session: itSession }).allowed).toBe(true);
  });

  it('[Tier 3] checks account export permission matrix', () => {
    expect(hasPermission('super_admin', 'identity', 'export')).toBe(true);
    expect(hasPermission('it_admin', 'identity', 'export')).toBe(true);
    expect(hasPermission('asset_admin', 'identity', 'export')).toBe(false);
    expect(hasPermission('software_admin', 'identity', 'export')).toBe(false);
    expect(hasPermission('auditor', 'identity', 'export')).toBe(false);
  });

  it('[Tier 3] checks Google Workspace synchronization permission matrix', () => {
    expect(hasPermission('super_admin', 'groups', 'sync')).toBe(true);
    expect(hasPermission('it_admin', 'groups', 'sync')).toBe(true);
    expect(hasPermission('asset_admin', 'groups', 'sync')).toBe(false);
    expect(hasPermission('software_admin', 'groups', 'sync')).toBe(false);
    expect(hasPermission('auditor', 'groups', 'sync')).toBe(false);
  });

  // ============================================================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS
  // ============================================================================

  it('[Tier 4] Scenario 1: Compliance audit inspection workflow', () => {
    const auditor = createMockSession('auditor');

    expect(evaluateRouteGuard({ path: '/', method: 'GET', session: auditor }).allowed).toBe(true);
    expect(evaluateRouteGuard({ path: '/accounts', method: 'GET', session: auditor }).allowed).toBe(true);
    expect(evaluateRouteGuard({ path: '/groups/matrix', method: 'GET', session: auditor }).allowed).toBe(true);
    expect(evaluateRouteGuard({ path: '/audit', method: 'GET', session: auditor }).allowed).toBe(true);

    const deleteAttempt = evaluateRouteGuard({ path: '/api/assets/LGI-CD-2024-001', method: 'DELETE', session: auditor });
    expect(deleteAttempt.statusCode).toBe(403);
  });

  it('[Tier 4] Scenario 2: Department-scoped administrative delegation', () => {
    const assetAdmin = createMockSession('asset_admin');

    expect(evaluateRouteGuard({ path: '/assets', method: 'GET', session: assetAdmin }).allowed).toBe(true);
    expect(evaluateRouteGuard({ path: '/api/assets', method: 'POST', session: assetAdmin }).allowed).toBe(true);

    expect(evaluateRouteGuard({ path: '/audit', method: 'GET', session: assetAdmin }).statusCode).toBe(403);
    expect(evaluateRouteGuard({ path: '/api/groups', method: 'GET', session: assetAdmin }).statusCode).toBe(403);
  });

  it('[Tier 4] Scenario 3: Privilege escalation containment', () => {
    const softAdmin = createMockSession('software_admin');

    const escalateRes = evaluateRouteGuard({
      path: '/api/assets/LGI-CD-2024-001/credentials/reveal',
      method: 'POST',
      session: softAdmin
    });
    expect(escalateRes.statusCode).toBe(403);
  });
});
