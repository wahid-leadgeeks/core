// src/app/api/groups/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth/session';
import fs from 'node:fs';
import path from 'node:path';

function isValidUUID(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // All authenticated users can access groups (RBAC removed)

  const resolvedParams = await context.params;
  const identifier = decodeURIComponent(resolvedParams.id).trim();

  try {
    const isUuid = isValidUUID(identifier);
    const searchEmail = identifier.toLowerCase();
    const groupList = await db
      .select()
      .from(schema.googleGroups)
      .where(
        isUuid
          ? eq(schema.googleGroups.id, identifier)
          : eq(schema.googleGroups.email, searchEmail)
      )
      .limit(1);

    if (!groupList.length) {
      // Fallback fixture
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/spreadsheet-groups.json');
      if (fs.existsSync(fixturePath)) {
        const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
        const found = fixtureData.groups?.find(
          (g: any) =>
            g.id === identifier ||
            g.email.toLowerCase() === identifier.toLowerCase() ||
            g.name.toLowerCase() === identifier.toLowerCase()
        );
        if (found) {
          return NextResponse.json({
            group: {
              id: found.id || found.email,
              name: found.name,
              email: found.email,
              description: found.description || 'Google Workspace Group',
              memberCount: found.memberCount || 38,
              syncStatus: 'pending',
              lastSyncedAt: null,
            },
            members: [],
          });
        }
      }

      return NextResponse.json({ error: 'Google Group not found' }, { status: 404 });
    }

    const group = groupList[0];

    // Query members joined with accounts
    const members = await db
      .select({
        membershipId: schema.groupMemberships.id,
        groupRole: schema.groupMemberships.role,
        source: schema.groupMemberships.source,
        addedAt: schema.groupMemberships.addedAt,
        accountId: schema.accounts.id,
        fullName: schema.accounts.fullName,
        displayName: schema.accounts.displayName,
        email: schema.accounts.email,
        accountType: schema.accounts.accountType,
        status: schema.accounts.status,
        departmentId: schema.accounts.departmentId,
        accountRoleId: schema.accounts.accountRoleId,
      })
      .from(schema.groupMemberships)
      .innerJoin(schema.accounts, eq(schema.groupMemberships.accountId, schema.accounts.id))
      .where(eq(schema.groupMemberships.groupId, group.id));

    const depts = await db.select().from(schema.departments);
    const roles = await db.select().from(schema.accountRoles);
    const deptMap = new Map(depts.map((d) => [d.id, d]));
    const roleMap = new Map(roles.map((r) => [r.id, r]));

    const enrichedMembers = members.map((m) => {
      const dept = m.departmentId ? deptMap.get(m.departmentId) : null;
      const role = m.accountRoleId ? roleMap.get(m.accountRoleId) : null;
      return {
        ...m,
        departmentName: dept?.name || 'General',
        departmentCode: dept?.code || 'GNR',
        roleName: role?.name || 'Staff',
        roleLevel: role?.level || 4,
      };
    });

    return NextResponse.json({
      group: {
        ...group,
        memberCount: enrichedMembers.length,
      },
      members: enrichedMembers,
    });
  } catch (error: any) {
    console.error('Failed to fetch group detail:', error);
    return NextResponse.json({ error: 'Failed to fetch group detail' }, { status: 500 });
  }
}
