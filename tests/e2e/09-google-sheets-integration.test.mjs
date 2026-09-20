import { describe, it, expect } from '../helpers/test-framework.mjs';
import {
  getGoogleOAuthConfig,
  isGoogleAuthConfigured,
  getLinkedSpreadsheetId,
  getLinkedSpreadsheetUrl,
  GOOGLE_OAUTH_SCOPES,
  resolveRedirectUri,
  getGoogleAuthUrl,
  encryptGoogleSession,
  decryptGoogleSession,
  resolveActiveGoogleSession,
  CORE_GOOGLE_SESSION_COOKIE,
} from '../helpers/google-sheets-helper.mjs';
import { evaluateRouteGuard } from '../helpers/auth-helper.mjs';

describe('Suite 09: Google Workspace & Sheets Integration (onboarding-copilot spec)', () => {

  // ============================================================================
  // TIER 1: FEATURE COVERAGE
  // ============================================================================

  it('[Tier 1] resolves Google OAuth configuration with required credentials and scopes', () => {
    const config = getGoogleOAuthConfig();
    expect(config).toBeDefined();
    expect(config.clientId).toContain('googleusercontent.com');
    expect(config.clientSecret).toBeDefined();
    expect(config.scopes).toContain('https://www.googleapis.com/auth/spreadsheets');
    expect(config.scopes).toContain('email');
    expect(config.scopes).toContain('profile');
    expect(isGoogleAuthConfigured()).toBe(true);
  });

  it('[Tier 1] verifies linked Google Spreadsheet IDs for accounts, devices, and software', () => {
    const accountsId = getLinkedSpreadsheetId('accounts');
    expect(accountsId).toBe('15kx94mT2qekbcBV5BEHZhb7M25O3smM2JYQZT_ydgz8');

    const devicesId = getLinkedSpreadsheetId('devices');
    expect(devicesId).toBe('1ELcKpCCEYXpI2wg3IIKJ0s3XpfdN92tyiyUOe40S_YQ');

    const softwareId = getLinkedSpreadsheetId('software');
    expect(softwareId).toBe('1q_pkNgrfDm7F_fQRF2beOxRvQf9XVE3e4MGPVxSmA5M');

    const url = getLinkedSpreadsheetUrl('accounts');
    expect(url).toBe('https://docs.google.com/spreadsheets/d/15kx94mT2qekbcBV5BEHZhb7M25O3smM2JYQZT_ydgz8');
  });

  it('[Tier 1] generates Google OAuth consent URL containing required parameters', () => {
    const state = 'test-csrf-token-12345';
    const config = getGoogleOAuthConfig();
    const authUrl = getGoogleAuthUrl(state, 'http://localhost:3000/api/auth/callback/google');

    expect(authUrl).toBeDefined();
    expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(authUrl).toContain(`client_id=${config.clientId}`);
    expect(authUrl).toContain('access_type=offline');
    expect(authUrl).toContain('prompt=consent');
    expect(authUrl).toContain(`state=${state}`);
    expect(authUrl).toContain('spreadsheets');
  });

  it('[Tier 1] encrypts and decrypts GoogleAuthSession using AES-256-GCM without data loss', () => {
    const session = {
      user: {
        id: 'google-sub-999',
        email: 'it-admin@leadgeeksinc.com',
        name: 'IT Administrator',
        picture: 'https://example.com/avatar.jpg',
      },
      tokens: {
        accessToken: 'ya29.sample_mock_access_token_123',
        refreshToken: '1//sample_mock_refresh_token_456',
        expiresAt: Date.now() + 3600 * 1000,
        scope: GOOGLE_OAUTH_SCOPES.join(' '),
      },
      createdAt: new Date().toISOString(),
    };

    const encrypted = encryptGoogleSession(session);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toContain('ya29.sample_mock_access_token_123');

    // Expected 3 dot-separated segments (iv.tag.ciphertext)
    const parts = encrypted.split('.');
    expect(parts).toHaveLength(3);

    const decrypted = decryptGoogleSession(encrypted);
    expect(decrypted).toBeDefined();
    expect(decrypted.user.email).toBe('it-admin@leadgeeksinc.com');
    expect(decrypted.tokens.accessToken).toBe('ya29.sample_mock_access_token_123');
    expect(decrypted.tokens.refreshToken).toBe('1//sample_mock_refresh_token_456');
  });

  // ============================================================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ============================================================================

  it('[Tier 2] safely returns null when decrypting corrupted or tampered session token', () => {
    expect(decryptGoogleSession(null)).toBe(null);
    expect(decryptGoogleSession('')).toBe(null);
    expect(decryptGoogleSession('not-a-valid-token')).toBe(null);
    expect(decryptGoogleSession('part1.part2')).toBe(null);

    // Tampered payload
    const session = {
      user: { id: '1', email: 'test@leadgeeksinc.com', name: 'Test' },
      tokens: { accessToken: 'token', expiresAt: Date.now() + 10000, scope: 'email' },
      createdAt: new Date().toISOString(),
    };
    const valid = encryptGoogleSession(session);
    const tampered = valid.slice(0, -4) + 'AAAA';
    expect(decryptGoogleSession(tampered)).toBe(null);
  });

  it('[Tier 2] dynamically resolves redirect URI with priority to explicit parameter', () => {
    const customUri = 'https://custom-core.company.com/api/auth/callback/google';
    const resolved = resolveRedirectUri(undefined, customUri);
    expect(resolved).toBe(customUri);
  });

  // ============================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // ============================================================================

  it('[Tier 3] route guard permits unauthenticated access to Google OAuth routes (/api/auth/...)', () => {
    const googleInitGuard = evaluateRouteGuard({
      path: '/api/auth/google',
      method: 'GET',
      session: null,
    });
    expect(googleInitGuard.allowed).toBe(true);

    const googleCallbackGuard = evaluateRouteGuard({
      path: '/api/auth/callback/google',
      method: 'GET',
      session: null,
    });
    expect(googleCallbackGuard.allowed).toBe(true);
  });

  it('[Tier 3] resolveActiveGoogleSession returns active session without refresh when token is fresh', async () => {
    const session = {
      user: { id: 'u1', email: 'test@leadgeeksinc.com', name: 'Tester' },
      tokens: {
        accessToken: 'fresh_token_abc',
        expiresAt: Date.now() + 300_000, // 5 minutes in future
        scope: 'email',
      },
      createdAt: new Date().toISOString(),
    };

    const cookie = encryptGoogleSession(session);
    const { session: active, refreshed } = await resolveActiveGoogleSession(cookie);

    expect(active).toBeDefined();
    expect(active.tokens.accessToken).toBe('fresh_token_abc');
    expect(refreshed).toBe(false);
  });

  // ============================================================================
  // TIER 4: REAL-WORLD SCENARIOS
  // ============================================================================

  it('[Tier 4] Scenario 1: Complete Google OAuth state & session lifecycle simulation', async () => {
    // 1. Generate CSRF state
    const state = 'simulated-state-token';
    const authUrl = getGoogleAuthUrl(state);
    expect(authUrl).toContain(state);

    // 2. Mock token exchange result
    const mockTokens = {
      accessToken: 'ya29.simulated_google_access_token',
      refreshToken: '1//simulated_refresh_token',
      expiresAt: Date.now() + 3600_000,
      scope: GOOGLE_OAUTH_SCOPES.join(' '),
    };

    const mockGoogleUser = {
      id: 'google-user-12345',
      email: 'admin@leadgeeksinc.com',
      name: 'System Admin',
    };

    const googleSession = {
      user: mockGoogleUser,
      tokens: mockTokens,
      createdAt: new Date().toISOString(),
    };

    // 3. Serialize cookie
    const cookie = encryptGoogleSession(googleSession);

    // 4. Resolve active session from cookie
    const { session: resolved, refreshed } = await resolveActiveGoogleSession(cookie);
    expect(resolved).toBeDefined();
    expect(resolved.user.email).toBe('admin@leadgeeksinc.com');
    expect(resolved.tokens.accessToken).toBe('ya29.simulated_google_access_token');
    expect(refreshed).toBe(false);
  });
});
