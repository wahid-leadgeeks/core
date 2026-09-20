import crypto from 'node:crypto';

export const DEFAULT_GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/callback/google';

export const GOOGLE_OAUTH_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
];

export const CORE_GOOGLE_SESSION_COOKIE = 'core_google_session';
export const CORE_GOOGLE_STATE_COOKIE = 'core_google_state';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

export function resolveRedirectUri(request, customRedirectUri) {
  if (customRedirectUri && customRedirectUri.trim()) {
    return customRedirectUri.trim();
  }

  if (process.env.GOOGLE_REDIRECT_URI && process.env.GOOGLE_REDIRECT_URI.trim()) {
    return process.env.GOOGLE_REDIRECT_URI.trim();
  }

  if (request) {
    try {
      const url = new URL(request.url);
      const host =
        request.headers.get('x-forwarded-host') ||
        request.headers.get('host') ||
        url.host;
      const proto =
        request.headers.get('x-forwarded-proto') ||
        (url.protocol ? url.protocol.replace(':', '') : 'http');

      if (host) {
        return `${proto}://${host}/api/auth/callback/google`;
      }
    } catch {
      // Fall through
    }
  }

  return DEFAULT_GOOGLE_REDIRECT_URI;
}

export function getGoogleOAuthConfig(customRedirectUri) {
  const clientId = process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id.apps.googleusercontent.com';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || 'mock-google-client-secret';
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID || '1vWFuIU_LxCqyQ7Bn5N2K4gBDcIcnmogYA_ALiucWxbo';

  const redirectUri = resolveRedirectUri(undefined, customRedirectUri);

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: GOOGLE_OAUTH_SCOPES,
    spreadsheetId,
  };
}

export function isGoogleAuthConfigured() {
  const config = getGoogleOAuthConfig();
  return Boolean(config.clientId && config.clientSecret);
}

export const AUTHORITATIVE_SPREADSHEETS = {
  accounts: {
    key: 'accounts',
    defaultId: '15kx94mT2qekbcBV5BEHZhb7M25O3smM2JYQZT_ydgz8',
  },
  devices: {
    key: 'devices',
    defaultId: '1ELcKpCCEYXpI2wg3IIKJ0s3XpfdN92tyiyUOe40S_YQ',
  },
  software: {
    key: 'software',
    defaultId: '1q_pkNgrfDm7F_fQRF2beOxRvQf9XVE3e4MGPVxSmA5M',
  },
};

export function getLinkedSpreadsheetId(domainKey) {
  if (domainKey === 'devices') {
    return process.env.GOOGLE_SHEETS_DEVICES_ID || AUTHORITATIVE_SPREADSHEETS.devices.defaultId;
  }
  if (domainKey === 'software') {
    return process.env.GOOGLE_SHEETS_SOFTWARE_ID || AUTHORITATIVE_SPREADSHEETS.software.defaultId;
  }
  return (
    process.env.GOOGLE_SHEETS_ACCOUNTS_ID ||
    process.env.GOOGLE_SHEETS_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID ||
    AUTHORITATIVE_SPREADSHEETS.accounts.defaultId
  );
}

export function getLinkedSpreadsheetUrl(domainKey) {
  const id = getLinkedSpreadsheetId(domainKey);
  return `https://docs.google.com/spreadsheets/d/${id}`;
}

export function getGoogleAuthUrl(state, redirectUri) {
  const config = getGoogleOAuthConfig(redirectUri);
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function deriveEncryptionKey(secret) {
  const seed =
    secret ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.CREDENTIAL_ENCRYPTION_KEY ||
    process.env.GOOGLE_CLIENT_SECRET ||
    'core-dev-google-session-fallback-secret-key-32-chars!';
  return crypto.createHash('sha256').update(seed).digest();
}

export function encryptGoogleSession(session, secret) {
  const key = deriveEncryptionKey(secret);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const payload = JSON.stringify(session);
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptGoogleSession(cipherText, secret) {
  if (!cipherText || typeof cipherText !== 'string') return null;

  const parts = cipherText.split('.');
  if (parts.length !== 3) return null;

  try {
    const [ivB64, tagB64, encryptedB64] = parts;
    const key = deriveEncryptionKey(secret);
    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const encrypted = Buffer.from(encryptedB64, 'base64url');

    if (iv.length !== IV_LENGTH || tag.length !== 16) return null;

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const parsed = JSON.parse(decrypted.toString('utf8'));

    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.user || typeof parsed.user !== 'object') return null;
    if (!parsed.tokens || typeof parsed.tokens !== 'object') return null;

    return parsed;
  } catch {
    return null;
  }
}

export async function resolveActiveGoogleSession(cookieValue) {
  const session = decryptGoogleSession(cookieValue);
  if (!session) {
    return { session: null, refreshed: false };
  }

  if (Date.now() < session.tokens.expiresAt - 60_000) {
    return { session, refreshed: false };
  }

  // Token expired
  return { session: null, refreshed: false };
}
