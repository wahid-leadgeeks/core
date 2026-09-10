import { describe, it, expect } from '../helpers/test-framework.js';
import { createMockSession, evaluateRouteGuard } from '../helpers/auth-helper.js';
import { MOCK_USERS, type SystemRole } from '../fixtures/index.js';

describe('Suite 02: Authentication, Route Protection & Session Management', () => {

  // ============================================================================
  // TIER 1: FEATURE COVERAGE
  // ============================================================================

  it('[Tier 1] allows public access to /login without credentials', () => {
    const res = evaluateRouteGuard({ path: '/login', method: 'GET' });
    expect(res.allowed).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it('[Tier 1] allows public access to /login with callbackUrl query string', () => {
    const res = evaluateRouteGuard({ path: '/login?callbackUrl=%2Faccounts', method: 'GET' });
    expect(res.allowed).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it('[Tier 1] redirects unauthenticated web page requests to /login with callbackUrl', () => {
    const res = evaluateRouteGuard({ path: '/accounts', method: 'GET' });
    expect(res.allowed).toBe(false);
    expect(res.statusCode).toBe(302);
    expect(res.redirectUrl).toBe('/login?callbackUrl=%2Faccounts');
  });

  it('[Tier 1] returns HTTP 401 Unauthorized for unauthenticated API requests', () => {
    const res = evaluateRouteGuard({ path: '/api/accounts', method: 'GET' });
    expect(res.allowed).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.errorMessage).toContain('Unauthorized');
  });

  it('[Tier 1] allows authenticated Super Admin session to access protected root /', () => {
    const session = createMockSession('super_admin');
    const res = evaluateRouteGuard({ path: '/', method: 'GET', session });
    expect(res.allowed).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it('[Tier 1] creates valid mock session for IT Admin with required identity fields', () => {
    const session = createMockSession('it_admin');
    expect(session.id).toBeDefined();
    expect(session.email).toBe('adit@leadgeeksinc.com');
    expect(session.role).toBe('it_admin');
    expect(session.departmentCode).toBe('ITE');
  });

  it('[Tier 1] creates valid mock session for Asset Admin', () => {
    const session = createMockSession('asset_admin');
    expect(session.email).toBe('devi@leadgeeksinc.com');
    expect(session.role).toBe('asset_admin');
    expect(session.departmentCode).toBe('OPS');
  });

  it('[Tier 1] creates valid mock session for Software Admin', () => {
    const session = createMockSession('software_admin');
    expect(session.email).toBe('rian@leadgeeksinc.com');
    expect(session.role).toBe('software_admin');
    expect(session.departmentCode).toBe('GRW');
  });

  it('[Tier 1] creates valid mock session for Auditor', () => {
    const session = createMockSession('auditor');
    expect(session.email).toBe('auditor@leadgeeksinc.com');
    expect(session.role).toBe('auditor');
    expect(session.departmentCode).toBe('GNR');
  });

  it('[Tier 1] allows authenticated users to access static assets and next internal routes', () => {
    const res = evaluateRouteGuard({ path: '/_next/static/chunks/app.js', method: 'GET' });
    expect(res.allowed).toBe(true);
  });

  it('[Tier 1] verifies all 5 mock roles are fully populated in MOCK_USERS dictionary', () => {
    const roles: SystemRole[] = ['super_admin', 'it_admin', 'asset_admin', 'software_admin', 'auditor'];
    for (const r of roles) {
      expect(MOCK_USERS[r]).toBeDefined();
      expect(MOCK_USERS[r].role).toBe(r);
    }
  });

  // ============================================================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ============================================================================

  it('[Tier 2] rejects invalid role identifier when attempting to generate mock session', () => {
    expect(() => createMockSession('superuser' as any)).toThrow('Invalid role');
  });

  it('[Tier 2] preserves deeply nested callback URL during unauthenticated redirect', () => {
    const res = evaluateRouteGuard({
      path: '/assets/devices/LGI-CD-2024-001?tab=specifications&highlight=ram',
      method: 'GET'
    });
    expect(res.statusCode).toBe(302);
    expect(res.redirectUrl).toBe('/login?callbackUrl=%2Fassets%2Fdevices%2FLGI-CD-2024-001%3Ftab%3Dspecifications%26highlight%3Dram');
  });

  it('[Tier 2] blocks unauthenticated POST mutation to API endpoint with 401', () => {
    const res = evaluateRouteGuard({ path: '/api/devices', method: 'POST' });
    expect(res.statusCode).toBe(401);
  });

  it('[Tier 2] blocks unauthenticated DELETE to API endpoint with 401', () => {
    const res = evaluateRouteGuard({ path: '/api/applications/app-123', method: 'DELETE' });
    expect(res.statusCode).toBe(401);
  });

  it('[Tier 2] rejects session with empty role string', () => {
    const malformedSession = { id: 'test-1', email: 'test@example.com', displayName: 'Test', role: '' as any };
    const res = evaluateRouteGuard({ path: '/accounts', method: 'GET', session: malformedSession });
    expect(res.allowed).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.errorMessage).toContain('Invalid or unrecognized role');
  });

  it('[Tier 2] rejects session with unrecognized or invalid role', () => {
    const invalidSession = { id: 'test-2', email: 'test@example.com', displayName: 'Test', role: 'guest' as any };
    const res = evaluateRouteGuard({ path: '/accounts', method: 'GET', session: invalidSession });
    expect(res.allowed).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.errorMessage).toContain('Invalid or unrecognized role');
  });

  it('[Tier 2] handles root path redirect when unauthenticated', () => {
    const res = evaluateRouteGuard({ path: '/', method: 'GET' });
    expect(res.statusCode).toBe(302);
    expect(res.redirectUrl).toBe('/login?callbackUrl=%2F');
  });

  // ============================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // ============================================================================

  it('[Tier 3] combines session role with domain route protection: Auditor gets read access but write blocked', () => {
    const session = createMockSession('auditor');
    const readRes = evaluateRouteGuard({ path: '/accounts', method: 'GET', session });
    expect(readRes.allowed).toBe(true);

    const writeRes = evaluateRouteGuard({ path: '/api/accounts', method: 'POST', session });
    expect(writeRes.allowed).toBe(false);
    expect(writeRes.statusCode).toBe(403);
  });

  it('[Tier 3] verifies IT Admin session allows infrastructure routes but blocks audit viewer', () => {
    const session = createMockSession('it_admin');
    const acctRes = evaluateRouteGuard({ path: '/accounts', method: 'GET', session });
    expect(acctRes.allowed).toBe(true);

    const auditRes = evaluateRouteGuard({ path: '/audit', method: 'GET', session });
    expect(auditRes.allowed).toBe(false);
    expect(auditRes.statusCode).toBe(403);
  });

  it('[Tier 3] verifies Asset Admin session is restricted to asset domain', () => {
    const session = createMockSession('asset_admin');
    const assetRes = evaluateRouteGuard({ path: '/assets', method: 'GET', session });
    expect(assetRes.allowed).toBe(true);

    const groupRes = evaluateRouteGuard({ path: '/groups', method: 'GET', session });
    expect(groupRes.allowed).toBe(false);
    expect(groupRes.statusCode).toBe(403);
  });

  it('[Tier 3] verifies Software Admin session is restricted from modifying hardware assets', () => {
    const session = createMockSession('software_admin');
    const softRes = evaluateRouteGuard({ path: '/software', method: 'GET', session });
    expect(softRes.allowed).toBe(true);

    const devWrite = evaluateRouteGuard({ path: '/api/assets', method: 'POST', session });
    expect(devWrite.allowed).toBe(false);
    expect(devWrite.statusCode).toBe(403);
  });

  // ============================================================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS
  // ============================================================================

  it('[Tier 4] Scenario 1: Unauthenticated user accesses direct deep-link -> redirected to login -> authenticates as Super Admin -> reaches page', () => {
    // Step 1: User hits /assets/LGI-CD-2024-042 without cookie
    const step1 = evaluateRouteGuard({ path: '/assets/LGI-CD-2024-042', method: 'GET' });
    expect(step1.statusCode).toBe(302);
    expect(step1.redirectUrl).toContain('callbackUrl=%2Fassets%2FLGI-CD-2024-042');

    // Step 2: Access redirected login page with callbackUrl parameter without infinite redirect
    const step2 = evaluateRouteGuard({ path: step1.redirectUrl!, method: 'GET' });
    expect(step2.allowed).toBe(true);
    expect(step2.statusCode).toBe(200);

    // Step 3: Login simulates mock auth login as super_admin
    const session = createMockSession('super_admin');

    // Step 4: User redirected back with valid session
    const step4 = evaluateRouteGuard({ path: '/assets/LGI-CD-2024-042', method: 'GET', session });
    expect(step4.allowed).toBe(true);
    expect(step4.statusCode).toBe(200);
  });

  it('[Tier 4] Scenario 2: Role switching workflow in development/testing environment', () => {
    // Switch to Auditor
    const auditorSession = createMockSession('auditor');
    expect(evaluateRouteGuard({ path: '/audit', method: 'GET', session: auditorSession }).allowed).toBe(true);

    // Switch to IT Admin
    const itSession = createMockSession('it_admin');
    expect(evaluateRouteGuard({ path: '/audit', method: 'GET', session: itSession }).allowed).toBe(false);
    expect(evaluateRouteGuard({ path: '/assets', method: 'GET', session: itSession }).allowed).toBe(true);
  });
});
