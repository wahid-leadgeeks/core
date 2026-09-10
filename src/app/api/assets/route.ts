// src/app/api/assets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth/session';
import { can } from '@/lib/auth/rbac';
import { provisionDevice, getAllDevices } from '@/domains/assets/service';
import fs from 'node:fs';
import path from 'node:path';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let devicesList = await db
      .select()
      .from(schema.devices)
      .orderBy(desc(schema.devices.purchasedAt));

    const specsList = await db.select().from(schema.deviceSpecifications);
    const assignmentsList = await db.select().from(schema.deviceAssignments);
    const credentialsList = await db.select().from(schema.deviceCredentials);
    const accountsList = await db.select().from(schema.accounts);
    const deptsList = await db.select().from(schema.departments);

    const specMap = new Map(specsList.map((s) => [s.deviceId, s]));
    const credMap = new Map(credentialsList.map((c) => [c.deviceId, c]));
    const accountMap = new Map(accountsList.map((a) => [a.id, a]));
    const deptMap = new Map(deptsList.map((d) => [d.id, d]));

    // Fallback if database has no devices
    if (devicesList.length === 0) {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/spreadsheet-devices.json');
      if (fs.existsSync(fixturePath)) {
        const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
        const assets = (fixtureData.sampleDevices || []).map((d: any) => ({
          id: d.id || d.assetNumber,
          assetNumber: d.assetNumber,
          brand: d.brand,
          model: d.model,
          computerName: d.computerName,
          status: d.status,
          purchasedAt: '2024-01-15',
          hasAntivirus: d.hasAntivirus,
          notes: 'Hardware fixture asset',
          specifications: {
            processor: d.processor,
            ram: d.ram,
            storage: d.storage,
          },
          assignment: {
            assignedAt: '2024-01-20T00:00:00.000Z',
            assigneeId: 'acc-1',
            assigneeName: d.picName,
            assigneeEmail: d.loginEmail,
            custodianName: d.pic2Name,
            departmentName: 'Operations',
            departmentCode: 'OPS',
          },
          credential: {
            id: 'cred-1',
            loginEmail: d.loginEmail,
            hasEncryptedPin: true,
            pinMasked: '••••••••',
            pinLastRotatedAt: null,
          },
        }));
        return NextResponse.json({ assets, total: assets.length });
      }
    }

    const activeAssignments = new Map<string, typeof schema.deviceAssignments.$inferSelect>();
    for (const assign of assignmentsList) {
      if (!assign.returnedAt) {
        activeAssignments.set(assign.deviceId, assign);
      }
    }

    const assets = devicesList.map((d) => {
      const spec = specMap.get(d.id);
      const cred = credMap.get(d.id);
      const assign = activeAssignments.get(d.id);
      const assignee = assign?.accountId ? accountMap.get(assign.accountId) : null;
      const custodian = assign?.custodianId ? accountMap.get(assign.custodianId) : null;
      const dept = assignee?.departmentId ? deptMap.get(assignee.departmentId) : null;

      return {
        id: d.id,
        assetNumber: d.assetNumber,
        brand: d.brand,
        model: d.model,
        computerName: d.computerName,
        status: d.status,
        purchasedAt: d.purchasedAt,
        hasAntivirus: d.hasAntivirus,
        notes: d.notes,
        specifications: spec
          ? {
              processor: spec.processor,
              ram: spec.ram,
              storage: spec.storage,
            }
          : null,
        assignment: assign
          ? {
              assignedAt: assign.assignedAt,
              assigneeId: assign.accountId,
              assigneeName: assignee ? assignee.displayName || assignee.fullName : null,
              assigneeEmail: assignee?.email || null,
              custodianName: custodian ? custodian.displayName || custodian.fullName : null,
              departmentName: dept?.name || null,
              departmentCode: dept?.code || null,
            }
          : null,
        credential: cred
          ? {
              id: cred.id,
              loginEmail: cred.loginEmail,
              hasEncryptedPin: Boolean(cred.pinHash),
              pinMasked: cred.pinHash ? '••••••••' : null,
              pinLastRotatedAt: cred.pinLastRotatedAt,
            }
          : null,
      };
    });

    return NextResponse.json({ assets, total: assets.length });
  } catch (error) {
    console.error('Failed to fetch assets:', error);
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!can(user.role, 'create', 'assets')) {
    return NextResponse.json(
      { error: `Forbidden: Role '${user.role}' lacks permission to create assets` },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    const created = await provisionDevice(body, user, ip);
    return NextResponse.json({ asset: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to provision device' }, { status: 400 });
  }
}

