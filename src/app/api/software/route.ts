// src/app/api/software/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { asc } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth/session';
import fs from 'node:fs';
import path from 'node:path';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let rawApps = await db
      .select()
      .from(schema.applications)
      .orderBy(asc(schema.applications.name));

    // Fallback if unseeded
    if (rawApps.length === 0) {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/spreadsheet-software.json');
      if (fs.existsSync(fixturePath)) {
        const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
        const applications = (fixtureData.sampleApplications || []).map((a: any, idx: number) => ({
          id: a.id || `app-${idx + 1}`,
          name: a.name,
          description: a.description || null,
          category: a.category || 'other',
          subscriptionType: a.subscriptionType || 'free',
          status: a.status || 'active',
          websiteUrl: a.websiteUrl || null,
          departmentName: a.department || 'General',
          departmentCode: a.departmentCode || 'GNR',
        }));
        return NextResponse.json({ applications, total: applications.length });
      }
    }

    const depts = await db.select().from(schema.departments);
    const deptMap = new Map(depts.map((d) => [d.id, d]));

    const applications = rawApps.map((app) => {
      const dept = app.departmentId ? deptMap.get(app.departmentId) : null;
      return {
        ...app,
        departmentName: dept?.name || 'General',
        departmentCode: dept?.code || 'GNR',
      };
    });

    return NextResponse.json({ applications, total: applications.length });
  } catch (error) {
    console.error('Failed to fetch applications:', error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}
