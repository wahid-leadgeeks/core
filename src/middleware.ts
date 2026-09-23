import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, deserializeSession } from './lib/auth/session';
import type { UserSession, RouteGuardResult } from './lib/auth/types';
import { VALID_ROLES } from './lib/auth/mock';

/**
 * Evaluates route guard rules for an authenticated or unauthenticated request.
 */
export function evaluateRouteGuard(req: {
  path: string;
  method: string;
  session?: UserSession | null;
}): RouteGuardResult {
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
      return {
        allowed: false,
        statusCode: 401,
        errorMessage: 'Unauthorized: Authentication required',
      };
    }
    const callbackUrl = encodeURIComponent(req.path);
    return {
      allowed: false,
      statusCode: 302,
      redirectUrl: `/login?callbackUrl=${callbackUrl}`,
    };
  }

  // All authenticated users have full operational access across the application (RBAC removed)
  return { allowed: true, statusCode: 200 };
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const fullPath = `${pathname}${search}`;

  // Public static assets bypass middleware immediately
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Extract session token from cookie
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = deserializeSession(sessionCookie);

  // Evaluate route guard
  const guard = evaluateRouteGuard({
    path: fullPath,
    method: req.method,
    session,
  });

  if (!guard.allowed) {
    if (guard.statusCode === 302 && guard.redirectUrl) {
      return NextResponse.redirect(new URL(guard.redirectUrl, req.url));
    }

    if (guard.statusCode === 401) {
      return NextResponse.json(
        { error: 'Unauthorized', message: guard.errorMessage || 'Authentication required' },
        { status: 401 }
      );
    }

    if (guard.statusCode === 403) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Forbidden', message: guard.errorMessage || 'Forbidden' },
          { status: 403 }
        );
      }
      return new NextResponse(guard.errorMessage || 'Forbidden', { status: 403 });
    }
  }

  // Sanitize incoming client headers to prevent identity header spoofing
  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete('x-user-id');
  requestHeaders.delete('x-user-email');
  requestHeaders.delete('x-user-role');
  requestHeaders.delete('x-user-dept');

  // Attach authenticated identity headers for downstream Route Handlers & Server Components
  if (session) {
    requestHeaders.set('x-user-id', session.id);
    requestHeaders.set('x-user-email', session.email);
    requestHeaders.set('x-user-role', session.role);
    if (session.departmentCode) {
      requestHeaders.set('x-user-dept', session.departmentCode);
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
