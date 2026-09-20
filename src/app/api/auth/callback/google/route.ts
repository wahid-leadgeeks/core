// src/app/api/auth/callback/google/route.ts
import { NextResponse } from 'next/server';
import { exchangeCodeForTokens, fetchGoogleUserProfile } from '@/lib/auth/google';
import { DEFAULT_GOOGLE_REDIRECT_URI, resolveRedirectUri } from '@/lib/auth/google-config';
import {
  CORE_GOOGLE_SESSION_COOKIE,
  CORE_GOOGLE_STATE_COOKIE,
  GOOGLE_SESSION_COOKIE_OPTIONS,
  encryptGoogleSession,
} from '@/lib/auth/google-session';
import { setSessionCookie } from '@/lib/auth/session';
import type { GoogleAuthSession, SystemRole, UserSession } from '@/lib/auth/types';
import { logAuditEvent } from '@/domains/audit/service';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const loginRedirect = new URL('/login', request.url);

  // If Google returned an error
  if (error) {
    loginRedirect.searchParams.set('error', error);
    return NextResponse.redirect(loginRedirect);
  }

  if (!code || !state) {
    loginRedirect.searchParams.set('error', 'missing_code_or_state');
    return NextResponse.redirect(loginRedirect);
  }

  // Validate state from cookie for CSRF protection
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = new Map(
    cookieHeader.split(';').map((pair) => {
      const [k, ...v] = pair.trim().split('=');
      return [k, decodeURIComponent(v.join('='))] as const;
    })
  );

  const storedState = cookies.get(CORE_GOOGLE_STATE_COOKIE);
  if (!storedState || storedState !== state) {
    loginRedirect.searchParams.set('error', 'state_mismatch');
    return NextResponse.redirect(loginRedirect);
  }

  // Decode state payload to retrieve callbackUrl and original redirectUri
  let targetCallbackUrl = '/';
  let stateRedirectUri: string | undefined = undefined;
  try {
    const parsedState = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    if (parsedState?.callbackUrl && typeof parsedState.callbackUrl === 'string') {
      targetCallbackUrl = parsedState.callbackUrl;
    }
    if (parsedState?.redirectUri && typeof parsedState.redirectUri === 'string') {
      stateRedirectUri = parsedState.redirectUri;
    }
  } catch {
    // Keep default '/'
  }

  // Exchange code for tokens using the exact redirectUri that initiated the authorization flow
  const redirectUri = stateRedirectUri || resolveRedirectUri(request);
  let tokens = await exchangeCodeForTokens(code, redirectUri);
  if (!tokens && redirectUri !== DEFAULT_GOOGLE_REDIRECT_URI) {
    tokens = await exchangeCodeForTokens(code, DEFAULT_GOOGLE_REDIRECT_URI);
  }

  if (!tokens) {
    loginRedirect.searchParams.set('error', 'token_exchange_failed');
    return NextResponse.redirect(loginRedirect);
  }

  // Fetch Google user profile
  const googleUser = await fetchGoogleUserProfile(tokens.accessToken);
  if (!googleUser) {
    loginRedirect.searchParams.set('error', 'profile_fetch_failed');
    return NextResponse.redirect(loginRedirect);
  }

  // Match or create CORE user account session
  let matchedUser: UserSession | null = null;
  try {
    const [account] = await db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.email, googleUser.email.toLowerCase().trim()))
      .limit(1);

    if (account) {
      matchedUser = {
        id: account.id,
        email: account.email,
        displayName: account.displayName || account.fullName || googleUser.name,
        role: 'it_admin', // Standard admin access for authenticated organization accounts
        departmentId: account.departmentId || undefined,
      };
    }
  } catch (dbErr) {
    console.warn('DB lookup failed during Google OAuth login:', dbErr);
  }

  if (!matchedUser) {
    matchedUser = {
      id: googleUser.id,
      email: googleUser.email,
      displayName: googleUser.name,
      role: 'it_admin',
    };
  }

  const googleSession: GoogleAuthSession = {
    user: googleUser,
    tokens,
    createdAt: new Date().toISOString(),
  };

  const finalRedirect = new URL(targetCallbackUrl, request.url);
  finalRedirect.searchParams.set('auth', 'google_success');
  const response = NextResponse.redirect(finalRedirect);

  // 1. Set CORE RBAC session cookie
  setSessionCookie(response, matchedUser);

  // 2. Set encrypted Google OAuth tokens session cookie
  const encryptedGoogleSession = encryptGoogleSession(googleSession);
  response.cookies.set(CORE_GOOGLE_SESSION_COOKIE, encryptedGoogleSession, GOOGLE_SESSION_COOKIE_OPTIONS);

  // 3. Clear the state cookie
  response.cookies.delete(CORE_GOOGLE_STATE_COOKIE);

  // 4. Log audit event
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  await logAuditEvent({
    actorId: matchedUser.id,
    action: 'auth.login.google',
    entityType: 'account',
    entityId: matchedUser.id,
    metadata: {
      authMode: 'google_oauth',
      email: googleUser.email,
      name: googleUser.name,
      hasRefreshToken: Boolean(tokens.refreshToken),
    },
    ipAddress,
  }).catch(() => {});

  return response;
}
