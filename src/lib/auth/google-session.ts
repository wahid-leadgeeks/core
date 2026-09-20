// src/lib/auth/google-session.ts
import crypto from 'node:crypto';
import { refreshGoogleAccessToken } from './google';
import type { GoogleAuthSession, GoogleTokens, GoogleUser } from './types';

export const CORE_GOOGLE_SESSION_COOKIE = 'core_google_session';
export const CORE_GOOGLE_STATE_COOKIE = 'core_google_state';
export const LEGACY_NOVA_SESSION_COOKIE = 'nova_session';
export const LEGACY_NOVA_STATE_COOKIE = 'nova_oauth_state';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM

export const GOOGLE_SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60, // 30 days
};

export const GOOGLE_STATE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 10 * 60, // 10 minutes
};

function deriveEncryptionKey(secret?: string): Buffer {
  const seed =
    secret ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.CREDENTIAL_ENCRYPTION_KEY ||
    process.env.GOOGLE_CLIENT_SECRET ||
    'core-dev-google-session-fallback-secret-key-32-chars!';
  return crypto.createHash('sha256').update(seed).digest();
}

/**
 * Encrypts a GoogleAuthSession object into an AES-256-GCM string (iv.tag.ciphertext in base64url).
 */
export function encryptGoogleSession(session: GoogleAuthSession, secret?: string): string {
  const key = deriveEncryptionKey(secret);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const payload = JSON.stringify(session);
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

/**
 * Decrypts an AES-256-GCM encrypted GoogleAuthSession string.
 */
export function decryptGoogleSession(
  cipherText: string | null | undefined,
  secret?: string
): GoogleAuthSession | null {
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
    const parsed = JSON.parse(decrypted.toString('utf8')) as unknown;

    if (!parsed || typeof parsed !== 'object') return null;
    const session = parsed as Record<string, unknown>;

    if (!session.user || typeof session.user !== 'object') return null;
    if (!session.tokens || typeof session.tokens !== 'object') return null;

    return parsed as GoogleAuthSession;
  } catch {
    return null;
  }
}

/**
 * Validates and resolves a Google session, automatically refreshing the access token if expired.
 */
export async function resolveActiveGoogleSession(
  cookieValue: string | undefined | null
): Promise<{ session: GoogleAuthSession | null; refreshed: boolean }> {
  const session = decryptGoogleSession(cookieValue);
  if (!session) {
    return { session: null, refreshed: false };
  }

  // If token is still valid (with 60s buffer), return as-is
  if (Date.now() < session.tokens.expiresAt - 60_000) {
    return { session, refreshed: false };
  }

  // If token is expired but we have a refresh token, refresh it
  if (session.tokens.refreshToken) {
    const refreshedTokens = await refreshGoogleAccessToken(session.tokens.refreshToken);
    if (refreshedTokens) {
      const updatedSession: GoogleAuthSession = {
        ...session,
        tokens: refreshedTokens,
      };
      return { session: updatedSession, refreshed: true };
    }
  }

  // Token expired and could not be refreshed
  return { session: null, refreshed: false };
}

/**
 * Extracts the active GoogleAuthSession from an incoming Request's cookies.
 */
export async function getGoogleSessionFromCookie(
  request: Request
): Promise<GoogleAuthSession | null> {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = new Map(
    cookieHeader.split(';').map((pair) => {
      const [k, ...v] = pair.trim().split('=');
      return [k, decodeURIComponent(v.join('='))] as const;
    })
  );

  const sessionCookie =
    cookies.get(CORE_GOOGLE_SESSION_COOKIE) ||
    cookies.get(LEGACY_NOVA_SESSION_COOKIE);

  const { session } = await resolveActiveGoogleSession(sessionCookie);
  return session;
}

/**
 * Extracts the Google OAuth access token from an incoming Request's cookies.
 */
export async function getSessionAccessToken(request: Request): Promise<string | undefined> {
  const session = await getGoogleSessionFromCookie(request);
  return session?.tokens?.accessToken;
}

