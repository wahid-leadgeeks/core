import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import type { SystemRole, UserSession } from './types';
import { normalizeRole } from './mock';

export const SESSION_COOKIE_NAME = 'core_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

/**
 * Serializes a UserSession into a cookie-safe base64 string.
 */
export function serializeSession(session: UserSession): string {
  const payload = {
    id: session.id,
    email: session.email,
    displayName: session.displayName,
    role: session.role,
    departmentId: session.departmentId,
    departmentCode: session.departmentCode,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Deserializes a session cookie string into a UserSession object.
 * Safely returns null if the string is invalid, malformed, or missing required fields.
 */
export function deserializeSession(token?: string | null): UserSession | null {
  if (!token || typeof token !== 'string') return null;

  try {
    let jsonStr = token;

    // Handle URI-encoded tokens
    if (token.includes('%')) {
      jsonStr = decodeURIComponent(token);
    }

    // Try decoding base64 first
    if (!jsonStr.startsWith('{')) {
      try {
        jsonStr = Buffer.from(jsonStr, 'base64').toString('utf8');
      } catch {
        // Not valid base64, keep original
      }
    }

    const data = JSON.parse(jsonStr);
    if (!data || typeof data !== 'object') return null;

    const normalizedRole = normalizeRole(data.role);
    // Validate required fields and ensure role is in VALID_ROLES upon deserialization
    if (!data.id || !data.email || !normalizedRole) {
      return null;
    }

    return {
      id: String(data.id),
      email: String(data.email),
      displayName: String(data.displayName || data.email),
      role: normalizedRole,
      departmentId: data.departmentId ? String(data.departmentId) : undefined,
      departmentCode: data.departmentCode ? String(data.departmentCode) : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts a UserSession from a generic cookie header or cookie getter.
 */
export function getSessionFromCookies(
  cookieJar:
    | { get: (name: string) => { value: string } | undefined }
    | string
    | null
    | undefined
): UserSession | null {
  if (!cookieJar) return null;

  if (typeof cookieJar === 'string') {
    // Parse cookie string
    const match = cookieJar
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
    if (!match) return null;
    return deserializeSession(match.slice(SESSION_COOKIE_NAME.length + 1));
  }

  if (typeof cookieJar.get === 'function') {
    const cookie = cookieJar.get(SESSION_COOKIE_NAME);
    return deserializeSession(cookie?.value);
  }

  return null;
}

/**
 * Extracts session from NextRequest or standard Request, falling back to x-user headers.
 */
export async function getSession(
  req?: Request | NextRequest
): Promise<UserSession | null> {
  if (req) {
    // Check NextRequest.cookies
    if ('cookies' in req && typeof req.cookies?.get === 'function') {
      const cookie = req.cookies.get(SESSION_COOKIE_NAME);
      const session = deserializeSession(cookie?.value);
      if (session) return session;
    }

    // Check headers cookie string
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const session = getSessionFromCookies(cookieHeader);
      if (session) return session;
    }

    // Check forwarded headers from middleware
    const userId = req.headers.get('x-user-id');
    const userEmail = req.headers.get('x-user-email');
    const userRole = req.headers.get('x-user-role');
    if (userId && userEmail && userRole) {
      const normalizedRole = normalizeRole(userRole);
      if (normalizedRole) {
        return {
          id: userId,
          email: userEmail,
          displayName: userEmail,
          role: normalizedRole,
          departmentCode: req.headers.get('x-user-dept') || undefined,
        };
      }
      return null;
    }
  }

  // Next.js Server Components / Route Handler context
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    return deserializeSession(cookie?.value);
  } catch {
    return null;
  }
}

/**
 * Gets the current authenticated user in Server Components.
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  return getSession();
}

/**
 * Sets the core_session cookie on a NextResponse object.
 */
export function setSessionCookie(
  response: NextResponse,
  session: UserSession
): void {
  const serialized = serializeSession(session);
  response.cookies.set(SESSION_COOKIE_NAME, serialized, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * Clears the core_session cookie on a NextResponse object.
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
}

export const getSessionUser = getSession;
