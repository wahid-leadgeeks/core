import { NextResponse, type NextRequest } from 'next/server';
import { getMockUser, createMockSession, isMockAuthEnabled } from '@/lib/auth/mock';
import { setSessionCookie } from '@/lib/auth/session';
import { logAuditEvent } from '@/domains/audit/service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { role, email } = body;
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    // Mock Authentication path (development / testing)
    if (isMockAuthEnabled() && (role || email)) {
      let session = null;
      try {
        if (role) {
          session = createMockSession(role);
        } else if (email) {
          session = getMockUser(email);
        }
      } catch {
        session = null;
      }

      if (session) {
        const response = NextResponse.json({
          success: true,
          user: session,
        });

        setSessionCookie(response, session);

        await logAuditEvent({
          actorId: session.id,
          action: 'auth.login',
          entityType: 'account',
          entityId: session.id,
          metadata: {
            authMode: 'mock',
            email: session.email,
            role: session.role,
          },
          ipAddress,
        });

        return response;
      }
    }

    // Unsuccessful authentication
    await logAuditEvent({
      actorId: null,
      action: 'auth.failed',
      entityType: 'auth',
      entityId: null,
      metadata: {
        attemptedRole: role || null,
        attemptedEmail: email || null,
        reason: 'Invalid credentials or unsupported role',
      },
      ipAddress,
    });

    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid credentials or role' },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
