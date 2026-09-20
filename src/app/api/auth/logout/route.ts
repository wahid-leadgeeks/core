import { NextResponse, type NextRequest } from 'next/server';
import { clearSessionCookie, getSession } from '@/lib/auth/session';
import { logAuditEvent } from '@/domains/audit/service';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    clearSessionCookie(response);
    response.cookies.set('core_google_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });

    if (session) {
      await logAuditEvent({
        actorId: session.id,
        action: 'auth.logout',
        entityType: 'account',
        entityId: session.id,
        metadata: { email: session.email },
        ipAddress,
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
