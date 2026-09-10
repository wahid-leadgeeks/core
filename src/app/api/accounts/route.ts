import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rawAccounts = await db
      .select({
        id: schema.accounts.id,
        fullName: schema.accounts.fullName,
        displayName: schema.accounts.displayName,
        email: schema.accounts.email,
        previousEmail: schema.accounts.previousEmail,
        accountType: schema.accounts.accountType,
        status: schema.accounts.status,
        notes: schema.accounts.notes,
        migrationNotes: schema.accounts.migrationNotes,
        departmentId: schema.accounts.departmentId,
        accountRoleId: schema.accounts.accountRoleId,
        createdAt: schema.accounts.createdAt,
      })
      .from(schema.accounts)
      .orderBy(desc(schema.accounts.createdAt));

    const depts = await db.select().from(schema.departments);
    const roles = await db.select().from(schema.accountRoles);
    const domains = await db.select().from(schema.domains);
    const accountDomainLinks = await db.select().from(schema.accountDomains);

    const deptMap = new Map(depts.map((d) => [d.id, d]));
    const roleMap = new Map(roles.map((r) => [r.id, r]));
    const domainMap = new Map(domains.map((dom) => [dom.id, dom]));

    // Group domain links by accountId
    const domainLinksByAccount = new Map<string, string[]>();
    for (const link of accountDomainLinks) {
      const dom = domainMap.get(link.domainId);
      if (dom) {
        const existing = domainLinksByAccount.get(link.accountId) || [];
        existing.push(dom.name);
        domainLinksByAccount.set(link.accountId, existing);
      }
    }

    const accounts = rawAccounts.map((a) => {
      const dept = a.departmentId ? deptMap.get(a.departmentId) : null;
      const role = a.accountRoleId ? roleMap.get(a.accountRoleId) : null;
      return {
        ...a,
        departmentName: dept?.name || 'General',
        departmentCode: dept?.code || 'GNR',
        roleName: role?.name || 'Staff',
        roleLevel: role?.level || 4,
        domains: domainLinksByAccount.get(a.id) || ['leadgeeksinc.com'],
      };
    });

    return NextResponse.json({ accounts, total: accounts.length });
  } catch (error) {
    console.error('Failed to fetch accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}
