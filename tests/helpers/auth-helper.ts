import { MOCK_USERS, type SystemRole, type UserSession } from '../fixtures/index.js';
import rbacData from '../fixtures/rbac-matrix.json' with { type: 'json' };

export interface RequestContext {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  session?: UserSession | null;
  headers?: Record<string, string>;
  ip?: string;
}

export interface RouteGuardResult {
  allowed: boolean;
  statusCode: 200 | 302 | 401 | 403;
  redirectUrl?: string;
  errorMessage?: string;
}

export function createMockSession(role: SystemRole): UserSession {
  const user = MOCK_USERS[role];
  if (!user) {
    throw new Error(`Invalid role: ${role}. Expected one of: ${rbacData.roles.join(', ')}`);
  }
  return { ...user };
}

export function hasPermission(
  role: SystemRole,
  domain: 'identity' | 'groups' | 'assets' | 'credentials' | 'software' | 'audit',
  action: 'read' | 'create' | 'update' | 'delete' | 'export' | 'sync' | 'assign' | 'reveal' | 'rotate'
): boolean {
  const rolePerms = (rbacData.permissions as any)[role];
  if (!rolePerms) return false;
  const domainPerms = rolePerms[domain];
  if (!domainPerms) return false;
  return Boolean(domainPerms[action]);
}

export const VALID_ROLES: SystemRole[] = [
  'super_admin',
  'it_admin',
  'asset_admin',
  'software_admin',
  'auditor',
];

export function evaluateRouteGuard(req: RequestContext): RouteGuardResult {
  const pathname = req.path.split('?')[0];
  const isPublic =
    pathname === '/login' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico';
  if (isPublic) {
    return { allowed: true, statusCode: 200 };
  }

  // Unauthenticated check
  if (!req.session) {
    if (pathname.startsWith('/api/')) {
      return { allowed: false, statusCode: 401, errorMessage: 'Unauthorized: Authentication required' };
    }
    const callbackUrl = encodeURIComponent(req.path);
    return { allowed: false, statusCode: 302, redirectUrl: `/login?callbackUrl=${callbackUrl}` };
  }

  const role = req.session.role;

  // Enforce role whitelisting against VALID_ROLES
  if (!VALID_ROLES.includes(role as any)) {
    return {
      allowed: false,
      statusCode: 403,
      errorMessage: 'Forbidden: Invalid or unrecognized role',
    };
  }

  // Credential reveal endpoint access control
  if (pathname.includes('/credentials') && pathname.includes('/reveal')) {
    if (role === 'super_admin' || role === 'it_admin') {
      return { allowed: true, statusCode: 200 };
    }
    return { allowed: false, statusCode: 403, errorMessage: 'Forbidden: Credential reveal requires Super Admin or IT Admin privileges' };
  }

  // Auditor write restriction invariant (Strictly read-only across all modules)
  if (role === 'auditor' && req.method !== 'GET') {
    return { allowed: false, statusCode: 403, errorMessage: 'Forbidden: Auditor role is strictly read-only' };
  }

  // Audit Viewer access control: strictly super_admin and auditor
  if (pathname.startsWith('/audit') || pathname.startsWith('/api/audit')) {
    if (role === 'super_admin' || role === 'auditor') {
      return { allowed: true, statusCode: 200 };
    }
    return { allowed: false, statusCode: 403, errorMessage: 'Forbidden: Audit log is restricted to Super Admin and Auditor' };
  }

  // Asset Admin domain boundaries
  if (role === 'asset_admin') {
    if (pathname.startsWith('/groups') || pathname.startsWith('/api/groups')) {
      return { allowed: false, statusCode: 403, errorMessage: 'Forbidden: Asset Admin cannot access groups' };
    }
    if ((pathname.startsWith('/accounts') || pathname.startsWith('/api/accounts')) && req.method !== 'GET') {
      return { allowed: false, statusCode: 403, errorMessage: 'Forbidden: Asset Admin is read-only on accounts' };
    }
    if ((pathname.startsWith('/software') || pathname.startsWith('/api/software')) && req.method !== 'GET') {
      return { allowed: false, statusCode: 403, errorMessage: 'Forbidden: Asset Admin cannot modify software' };
    }
  }

  // Software Admin domain boundaries
  if (role === 'software_admin') {
    if (pathname.startsWith('/groups') || pathname.startsWith('/api/groups')) {
      return { allowed: false, statusCode: 403, errorMessage: 'Forbidden: Software Admin cannot access groups' };
    }
    if ((pathname.startsWith('/assets') || pathname.startsWith('/api/assets')) && req.method !== 'GET') {
      return { allowed: false, statusCode: 403, errorMessage: 'Forbidden: Software Admin cannot modify assets' };
    }
    if ((pathname.startsWith('/accounts') || pathname.startsWith('/api/accounts')) && req.method !== 'GET') {
      return { allowed: false, statusCode: 403, errorMessage: 'Forbidden: Software Admin is read-only on accounts' };
    }
  }

  return { allowed: true, statusCode: 200 };
}
