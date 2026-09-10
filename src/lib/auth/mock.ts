import type { SystemRole, UserSession } from './types';

export const MOCK_USERS: Record<SystemRole, UserSession> = {
  super_admin: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'amanda@leadgeeksinc.com',
    displayName: 'Amanda (Super Admin)',
    role: 'super_admin',
    departmentCode: 'MNG',
  },
  it_admin: {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'adit@leadgeeksinc.com',
    displayName: 'Aditya (IT Admin)',
    role: 'it_admin',
    departmentCode: 'ITE',
  },
  asset_admin: {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'devi@leadgeeksinc.com',
    displayName: 'Devi (Asset Admin)',
    role: 'asset_admin',
    departmentCode: 'OPS',
  },
  software_admin: {
    id: '44444444-4444-4444-8444-444444444444',
    email: 'rian@leadgeeksinc.com',
    displayName: 'Rian (Software Admin)',
    role: 'software_admin',
    departmentCode: 'GRW',
  },
  auditor: {
    id: '55555555-5555-4555-8555-555555555555',
    email: 'auditor@leadgeeksinc.com',
    displayName: 'Auditor (Read-Only)',
    role: 'auditor',
    departmentCode: 'GNR',
  },
};

export const VALID_ROLES: SystemRole[] = [
  'super_admin',
  'it_admin',
  'asset_admin',
  'software_admin',
  'auditor',
];

/**
 * Normalizes input role string to canonical SystemRole.
 */
export function normalizeRole(role: string): SystemRole | null {
  if (!role || typeof role !== 'string') return null;
  const cleaned = role.toLowerCase().trim().replace(/[-\s]+/g, '_');
  if (VALID_ROLES.includes(cleaned as SystemRole)) {
    return cleaned as SystemRole;
  }
  return null;
}

/**
 * Checks if mock authentication mode is currently enabled.
 */
export function isMockAuthEnabled(): boolean {
  return (
    process.env.AUTH_MOCK_ENABLED === 'true' ||
    process.env.MOCK_AUTH_ENABLED === 'true' ||
    process.env.NODE_ENV !== 'production'
  );
}

/**
 * Creates a mock session for a specific role. Throws if the role is invalid.
 */
export function createMockSession(role: string): UserSession {
  const normalized = normalizeRole(role);
  if (!normalized || !MOCK_USERS[normalized]) {
    throw new Error(
      `Invalid role: ${role}. Expected one of: ${VALID_ROLES.join(', ')}`
    );
  }
  return { ...MOCK_USERS[normalized] };
}

/**
 * Finds a mock user by role or email.
 */
export function getMockUser(identifier: string): UserSession | null {
  if (!identifier) return null;
  const role = normalizeRole(identifier);
  if (role && MOCK_USERS[role]) {
    return { ...MOCK_USERS[role] };
  }

  const email = identifier.toLowerCase().trim();
  for (const user of Object.values(MOCK_USERS)) {
    if (user.email.toLowerCase() === email) {
      return { ...user };
    }
  }

  return null;
}

/**
 * Foundation configuration for Google OAuth 2.0 / OIDC.
 */
export function getGoogleOAuthConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/google`,
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scopes: ['openid', 'email', 'profile'],
  };
}

/**
 * Generates the Google OAuth authorization URL.
 */
export function getGoogleAuthUrl(state?: string): string {
  const config = getGoogleOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    access_type: 'offline',
    prompt: 'select_account',
    state: state || 'default',
  });
  return `${config.authUrl}?${params.toString()}`;
}
