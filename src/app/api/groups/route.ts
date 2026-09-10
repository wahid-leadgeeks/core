// src/app/api/groups/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import fs from 'node:fs';
import path from 'node:path';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Asset Admin & Software Admin are forbidden from accessing groups per RBAC
  if (user.role === 'asset_admin' || user.role === 'software_admin') {
    return NextResponse.json(
      { error: 'Forbidden', message: `Forbidden: ${user.role} cannot access groups` },
      { status: 403 }
    );
  }

  try {
    let groups = await db.select().from(schema.googleGroups);
    let memberships = await db.select().from(schema.groupMemberships);
    let accounts = await db.select().from(schema.accounts);

    // Fallback if database is not seeded
    if (groups.length === 0) {
      const groupsFixturePath = path.join(process.cwd(), 'tests/fixtures/spreadsheet-groups.json');
      const accountsFixturePath = path.join(process.cwd(), 'tests/fixtures/spreadsheet-accounts.json');

      if (fs.existsSync(groupsFixturePath) && fs.existsSync(accountsFixturePath)) {
        const groupsFixture = JSON.parse(fs.readFileSync(groupsFixturePath, 'utf8'));
        const accountsFixture = JSON.parse(fs.readFileSync(accountsFixturePath, 'utf8'));

        groups = (groupsFixture.groups || []).map((g: any) => ({
          id: g.id || g.email,
          name: g.name,
          email: g.email,
          description: g.description || null,
          memberCount: g.memberCount || 0,
          syncStatus: 'pending',
          lastSyncedAt: null,
          googleId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })) as any;

        accounts = (accountsFixture.accounts || []).map((a: any) => ({
          id: a.id || a.email,
          fullName: a.fullName,
          displayName: a.displayName,
          email: a.email,
          previousEmail: a.previousEmail || null,
          accountType: a.accountType || 'personal',
          status: a.status || 'active',
          departmentId: null,
          accountRoleId: null,
          departmentCode: a.departmentCode || 'GNR',
          departmentName: a.department || 'General',
          roleName: a.role || 'Staff',
          roleLevel: a.roleLevel || 4,
          notes: a.notes || null,
          migrationNotes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })) as any;

        memberships = (groupsFixture.sampleMemberships || []).map((m: any, idx: number) => ({
          id: `mem-${idx}`,
          groupId: m.groupEmail,
          accountId: m.memberEmail,
          role: 'member',
          source: 'spreadsheet',
          addedAt: new Date(),
        })) as any;
      }
    }

    const isMatrix = req.nextUrl.searchParams.get('matrix') === 'true';

    if (isMatrix) {
      const depts = await db.select().from(schema.departments).catch(() => []);
      const roles = await db.select().from(schema.accountRoles).catch(() => []);
      const deptMap = new Map(depts.map((d) => [d.id, d]));
      const roleMap = new Map(roles.map((r) => [r.id, r]));

      const matrix = accounts.map((acct: any) => {
        const groupMembershipsForAcct = memberships.filter(
          (m) => m.accountId === acct.id || m.accountId === acct.email
        );
        const membershipMap = new Map(
          groupMembershipsForAcct.map((m) => [m.groupId, m])
        );
        const dept = acct.departmentId ? deptMap.get(acct.departmentId) : null;
        const role = acct.accountRoleId ? roleMap.get(acct.accountRoleId) : null;

        return {
          accountId: acct.id,
          displayName: acct.displayName,
          fullName: acct.fullName,
          email: acct.email,
          departmentCode: dept?.code || acct.departmentCode || 'GNR',
          departmentName: dept?.name || acct.departmentName || 'General',
          roleName: role?.name || acct.roleName || 'Staff',
          memberships: groups.map((g: any) => {
            const mem = membershipMap.get(g.id) || membershipMap.get(g.email);
            return {
              groupId: g.id,
              groupName: g.name,
              groupEmail: g.email,
              isMember: Boolean(mem),
              role: (mem as any)?.role || null,
            };
          }),
        };
      });

      return NextResponse.json({ groups, accounts, matrix });
    }

    // Attach member count and members
    const groupsWithDetails = groups.map((g: any) => {
      const groupMems = memberships.filter(
        (m) => m.groupId === g.id || m.groupId === g.email
      );
      return {
        ...g,
        memberCount: groupMems.length || g.memberCount || 0,
        memberAccountIds: groupMems.map((m) => m.accountId),
      };
    });

    return NextResponse.json({ groups: groupsWithDetails, total: groups.length });
  } catch (error) {
    console.error('Failed to fetch groups:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}
