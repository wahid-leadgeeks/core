// src/app/api/auth/google/route.ts
import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getGoogleAuthUrl } from '@/lib/auth/google';
import { resolveRedirectUri } from '@/lib/auth/google-config';
import { CORE_GOOGLE_STATE_COOKIE, GOOGLE_STATE_COOKIE_OPTIONS } from '@/lib/auth/google-session';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const customRedirect = url.searchParams.get('redirect_uri') || undefined;
  const callbackUrl = url.searchParams.get('callbackUrl') || '/';

  const redirectUri = resolveRedirectUri(request, customRedirect);
  const randomToken = crypto.randomBytes(20).toString('hex');
  const statePayload = Buffer.from(JSON.stringify({ token: randomToken, callbackUrl, redirectUri })).toString('base64url');

  const authUrl = getGoogleAuthUrl(statePayload, redirectUri);

  if (!authUrl) {
    return NextResponse.redirect(new URL('/login?error=google_oauth_unconfigured', request.url));
  }

  const response = NextResponse.redirect(authUrl);

  // Store state in secure HTTP-only temporary cookie
  response.cookies.set(CORE_GOOGLE_STATE_COOKIE, statePayload, GOOGLE_STATE_COOKIE_OPTIONS);

  return response;
}
