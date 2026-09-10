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

  const role = req.session.role;

  // Enforce role whitelisting against VALID_ROLES
  if (!VALID_ROLES.includes(role as any)) {
    return {
      allowed: false,
      statusCode: 403,
      errorMessage: 'Forbidden: Invalid or unrecognized role',
    };
  }

  // Credential reveal endpoint access control (checked before generic method checks)
  if (pathname.includes('/credentials') && pathname.includes('/reveal')) {
    if (role === 'super_admin' || role === 'it_admin') {
      return { allowed: true, statusCode: 200 };
    }
    return {
      allowed: false,
      statusCode: 403,
      errorMessage:
        'Forbidden: Credential reveal requires Super Admin or IT Admin privileges',
    };
  }

  // Auditor write restriction invariant (Strictly read-only across all modules)
  if (role === 'auditor' && req.method !== 'GET') {
    return {
      allowed: false,
      statusCode: 403,
      errorMessage: 'Forbidden: Auditor role is strictly read-only',
    };
  }

  // Audit Viewer access control: strictly super_admin and auditor
  if (pathname.startsWith('/audit') || pathname.startsWith('/api/audit')) {
    if (role === 'super_admin' || role === 'auditor') {
      return { allowed: true, statusCode: 200 };
    }
    return {
      allowed: false,
      statusCode: 403,
      errorMessage: 'Forbidden: Audit log is restricted to Super Admin and Auditor',
    };
  }

  // Asset Admin domain boundaries
  if (role === 'asset_admin') {
    if (pathname.startsWith('/groups') || pathname.startsWith('/api/groups')) {
      return {
        allowed: false,
        statusCode: 403,
        errorMessage: 'Forbidden: Asset Admin cannot access groups',
      };
    }
    if (
      (pathname.startsWith('/accounts') || pathname.startsWith('/api/accounts')) &&
      req.method !== 'GET'
    ) {
      return {
        allowed: false,
        statusCode: 403,
        errorMessage: 'Forbidden: Asset Admin is read-only on accounts',
      };
    }
    if (
      (pathname.startsWith('/software') || pathname.startsWith('/api/software')) &&
      req.method !== 'GET'
    ) {
      return {
        allowed: false,
        statusCode: 403,
        errorMessage: 'Forbidden: Asset Admin cannot modify software',
      };
    }
  }

  // Software Admin domain boundaries
  if (role === 'software_admin') {
    if (pathname.startsWith('/groups') || pathname.startsWith('/api/groups')) {
      return {
        allowed: false,
        statusCode: 403,
        errorMessage: 'Forbidden: Software Admin cannot access groups',
      };
    }
    if (
      (pathname.startsWith('/assets') || pathname.startsWith('/api/assets')) &&
      req.method !== 'GET'
    ) {
      return {
        allowed: false,
        statusCode: 403,
        errorMessage: 'Forbidden: Software Admin cannot modify assets',
      };
    }
    if (
      (pathname.startsWith('/accounts') || pathname.startsWith('/api/accounts')) &&
      req.method !== 'GET'
    ) {
      return {
        allowed: false,
        statusCode: 403,
        errorMessage: 'Forbidden: Software Admin is read-only on accounts',
      };
    }
  }

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
