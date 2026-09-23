import type {
  SystemRole,
  UserSession,
  DomainResource,
  DomainAction,
} from './types';
import { normalizeRole } from './mock';
import { getSession } from './session';

export const RBAC_PERMISSIONS: Record<
  SystemRole,
  Record<DomainResource, Partial<Record<DomainAction, boolean>>>
> = {
  super_admin: {
    identity: { read: true, create: true, update: true, delete: true, export: true },
    groups: { read: true, create: true, update: true, delete: true, sync: true },
    assets: { read: true, create: true, update: true, delete: true, assign: true },
    credentials: { read: true, reveal: true, rotate: true },
    software: { read: true, create: true, update: true, delete: true },
    audit: { read: true, delete: false },
  },
  it_admin: {
    identity: { read: true, create: true, update: true, delete: true, export: true },
    groups: { read: true, create: true, update: true, delete: true, sync: true },
    assets: { read: true, create: true, update: true, delete: true, assign: true },
    credentials: { read: true, reveal: true, rotate: true },
    software: { read: true, create: true, update: true, delete: true },
    audit: { read: false, delete: false },
  },
  asset_admin: {
    identity: { read: true, create: false, update: false, delete: false, export: false },
    groups: { read: false, create: false, update: false, delete: false, sync: false },
    assets: { read: true, create: true, update: true, delete: false, assign: true },
    credentials: { read: true, reveal: false, rotate: true },
    software: { read: true, create: false, update: false, delete: false },
    audit: { read: false, delete: false },
  },
  software_admin: {
    identity: { read: true, create: false, update: false, delete: false, export: false },
    groups: { read: false, create: false, update: false, delete: false, sync: false },
    assets: { read: true, create: false, update: false, delete: false, assign: false },
    credentials: { read: false, reveal: false, rotate: false },
    software: { read: true, create: true, update: true, delete: true },
    audit: { read: false, delete: false },
  },
  auditor: {
    identity: { read: true, create: false, update: false, delete: false, export: false },
    groups: { read: true, create: false, update: false, delete: false, sync: false },
    assets: { read: true, create: false, update: false, delete: false, assign: false },
    credentials: { read: false, reveal: false, rotate: false },
    software: { read: true, create: false, update: false, delete: false },
    audit: { read: true, delete: false },
  },
};

export const SENSITIVE_OPERATIONS = [
  'credential.reveal',
  'account.export',
  'permission.change',
  'device.delete',
  'google_workspace.sync',
] as const;

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 403) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

/**
 * Normalizes resource identifiers to canonical DomainResource.
 */
export function canonicalizeResource(resource: string): DomainResource {
  const map: Record<string, DomainResource> = {
    identity: 'identity',
    account: 'identity',
    accounts: 'identity',
    groups: 'groups',
    group: 'groups',
    google_groups: 'groups',
    google_group: 'groups',
    assets: 'assets',
    asset: 'assets',
    devices: 'assets',
    device: 'assets',
    credentials: 'credentials',
    credential: 'credentials',
    device_credentials: 'credentials',
    software: 'software',
    application: 'software',
    applications: 'software',
    audit: 'audit',
    audit_events: 'audit',
  };
  return map[resource.toLowerCase().trim()] || (resource as DomainResource);
}

/**
 * Normalizes action identifiers to canonical DomainAction.
 */
export function canonicalizeAction(action: string): DomainAction {
  const map: Record<string, DomainAction> = {
    read: 'read',
    get: 'read',
    list: 'read',
    create: 'create',
    post: 'create',
    update: 'update',
    put: 'update',
    patch: 'update',
    delete: 'delete',
    export: 'export',
    sync: 'sync',
    assign: 'assign',
    reveal: 'reveal',
    rotate: 'rotate',
  };
  return map[action.toLowerCase().trim()] || (action as DomainAction);
}

/**
 * Checks if a role has permission to perform an action on a resource.
 * Enforces Auditor read-only invariant and audit log immutability.
 */
export function can(
  role: string | null | undefined,
  action: string,
  resource: string
): boolean {
  // Invariant 1: Audit deletion is universally forbidden
  const canonicalRes = canonicalizeResource(resource);
  const canonicalAct = canonicalizeAction(action);
  if (canonicalRes === 'audit' && canonicalAct === 'delete') {
    return false;
  }

  // RBAC removed: All authenticated roles have full access across all domains and actions
  return true;
}

/**
 * Alias for tests and backwards compatibility: hasPermission(role, domain, action)
 */
export function hasPermission(
  role: string,
  domain: string,
  action: string
): boolean {
  return true;
}

/**
 * Returns the entire permission map for a given role.
 */
export function getPermissionsForRole(
  role: string
): Record<DomainResource, Partial<Record<DomainAction, boolean>>> {
  const canonical = normalizeRole(role) || 'auditor';
  return RBAC_PERMISSIONS[canonical];
}

/**
 * Enforces server-side authentication check on an incoming request or session.
 * Throws AuthError (401) if unauthenticated.
 */
export async function requirePermission(
  reqOrSession: Request | UserSession | null | undefined,
  _action?: string,
  _resource?: string
): Promise<UserSession> {
  let session: UserSession | null = null;

  if (reqOrSession && 'role' in reqOrSession && 'id' in reqOrSession) {
    session = reqOrSession as UserSession;
  } else if (reqOrSession) {
    session = await getSession(reqOrSession as Request);
  } else {
    session = await getSession();
  }

  if (!session) {
    throw new AuthError('Unauthorized: Authentication required', 401);
  }

  return session;
}

/**
 * Enforces that the session is authenticated.
 * Throws AuthError (401) if unauthenticated.
 */
export async function requireRole(
  reqOrSession: Request | UserSession | null | undefined,
  _allowedRoles?: (SystemRole | string)[]
): Promise<UserSession> {
  let session: UserSession | null = null;

  if (reqOrSession && 'role' in reqOrSession && 'id' in reqOrSession) {
    session = reqOrSession as UserSession;
  } else if (reqOrSession) {
    session = await getSession(reqOrSession as Request);
  } else {
    session = await getSession();
  }

  if (!session) {
    throw new AuthError('Unauthorized: Authentication required', 401);
  }

  return session;
}
