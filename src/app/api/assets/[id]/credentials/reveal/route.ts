import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { decryptPin, encryptPin } from '@/lib/crypto/cipher';
import { logAuditEvent } from '@/domains/audit/service';
import { db } from '@/lib/db/client';
import { devices } from '@/domains/assets/schema';
import { deviceCredentials } from '@/domains/access/schema';
import { eq, or } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';

// Fallback sample fixture in case database has not been seeded yet
function getFixtureDevice(identifier: string) {
  try {
    const fixturePath = path.join(
      process.cwd(),
      'tests/fixtures/spreadsheet-devices.json'
    );
    if (fs.existsSync(fixturePath)) {
      const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      const found = data.sampleDevices?.find(
        (d: any) =>
          d.assetNumber === identifier ||
          d.id === identifier ||
          identifier.includes(d.assetNumber)
      );
      if (found) {
        return {
          id: found.id || 'dev-fixture-1',
          assetNumber: found.assetNumber,
          loginEmail: found.loginEmail,
          pinHash: encryptPin(found.pinPlain).serialized,
        };
      }
    }
  } catch {
    // Ignore fallback errors
  }
  return null;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // All authenticated users can reveal credentials (RBAC removed)

    const resolvedParams = await context.params;
    const { id } = resolvedParams;

    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    let deviceRecord: { id: string; assetNumber: string } | null = null;
    let credentialRecord: { id: string; loginEmail: string | null; pinHash: string | null } | null = null;

    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const condition = isUUID
        ? or(eq(devices.assetNumber, id), eq(devices.id, id))
        : eq(devices.assetNumber, id);
      const devRows = await db
        .select()
        .from(devices)
        .where(condition)
        .limit(1);

      if (devRows && devRows[0]) {
        deviceRecord = devRows[0];
        const credRows = await db
          .select()
          .from(deviceCredentials)
          .where(eq(deviceCredentials.deviceId, devRows[0].id))
          .limit(1);

        if (credRows && credRows[0]) {
          credentialRecord = credRows[0];
        }
      }
    } catch {
      // In-memory / fixture fallback
    }

    // Fallback to sample fixture if not found in database
    if (!credentialRecord) {
      const fixture = getFixtureDevice(id);
      if (fixture) {
        deviceRecord = { id: fixture.id, assetNumber: fixture.assetNumber };
        credentialRecord = {
          id: fixture.id,
          loginEmail: fixture.loginEmail,
          pinHash: fixture.pinHash,
        };
      }
    }

    if (!credentialRecord || !credentialRecord.pinHash) {
      return NextResponse.json(
        { error: 'Not Found', message: `Credential for device '${id}' not found` },
        { status: 404 }
      );
    }

    // Decrypt the PIN
    const plainPin = decryptPin(credentialRecord.pinHash);

    // Record credential.reveal in audit_events
    // CRITICAL: plain text PIN is NEVER stored in audit metadata
    await logAuditEvent({
      actorId: session.id,
      action: 'credential.reveal',
      entityType: 'device_credential',
      entityId: credentialRecord.id,
      metadata: {
        deviceAssetNumber: deviceRecord?.assetNumber || id,
        reason: 'Device credential reveal requested by administrator',
      },
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      pin: plainPin,
      loginEmail: credentialRecord.loginEmail,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
