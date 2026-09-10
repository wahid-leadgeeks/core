// src/app/api/assets/[id]/decommission/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { can } from '@/lib/auth/rbac';
import { decommissionDevice } from '@/domains/assets/service';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Decommissioning is a destructive asset action, mapped to 'delete' permission on assets
  if (!can(user.role, 'delete', 'assets')) {
    return NextResponse.json(
      { error: `Forbidden: Role '${user.role}' lacks permission to decommission assets` },
      { status: 403 }
    );
  }

  const resolvedParams = await context.params;
  const identifier = decodeURIComponent(resolvedParams.id).trim();

  try {
    const body = await req.json();
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    const updated = await decommissionDevice(identifier, body, user, ip);
    return NextResponse.json({ device: updated }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to decommission device' }, { status: 400 });
  }
}
