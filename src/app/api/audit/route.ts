import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getAuditEvents } from '@/domains/audit/service';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Restricted exclusively to Super Admin and Auditor
    if (session.role !== 'super_admin' && session.role !== 'auditor') {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Forbidden: Audit log is restricted to Super Admin and Auditor',
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType') || undefined;
    const action = searchParams.get('action') || undefined;
    const actorId = searchParams.get('actorId') || undefined;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : 100;
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!, 10)
      : 0;

    const events = await getAuditEvents({
      entityType,
      action,
      actorId,
      limit,
      offset,
    });

    return NextResponse.json({
      events,
      total: events.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
