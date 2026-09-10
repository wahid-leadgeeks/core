import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rbacData = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/rbac-matrix.json'), 'utf8'));

export const MOCK_USERS = {
  super_admin: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'amanda@leadgeeksinc.com',
    displayName: 'Amanda (Super Admin)',
    role: 'super_admin',
    departmentCode: 'MNG'
  },
  it_admin: {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'adit@leadgeeksinc.com',
    displayName: 'Aditya (IT Admin)',
    role: 'it_admin',
    departmentCode: 'ITE'
  },
  asset_admin: {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'devi@leadgeeksinc.com',
    displayName: 'Devi (Asset Admin)',
    role: 'asset_admin',
    departmentCode: 'OPS'
  },
  software_admin: {
    id: '44444444-4444-4444-8444-444444444444',
    email: 'rian@leadgeeksinc.com',
    displayName: 'Rian (Software Admin)',
    role: 'software_admin',
    departmentCode: 'GRW'
  },
  auditor: {
    id: '55555555-5555-4555-8555-555555555555',
    email: 'auditor@leadgeeksinc.com',
    displayName: 'Auditor (Read-Only)',
    role: 'auditor',
    departmentCode: 'GNR'
  }
};

export function createMockSession(role) {
  const user = MOCK_USERS[role];
  if (!user) {
    throw new Error(`Invalid role: ${role}. Expected one of: ${rbacData.roles.join(', ')}`);
  }
  return { ...user };
}

export function hasPermission(role, domain, action) {
  const rolePerms = rbacData.permissions[role];
  if (!rolePerms) return false;
  const domainPerms = rolePerms[domain];
  if (!domainPerms) return false;
  return Boolean(domainPerms[action]);
}

export const VALID_ROLES = ['super_admin', 'it_admin', 'asset_admin', 'software_admin', 'auditor'];

export function evaluateRouteGuard(req) {
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
  if (!VALID_ROLES.includes(role)) {
    return {
      allowed: false,
      statusCode: 403,
      errorMessage: 'Forbidden: Invalid or unrecognized role'
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
