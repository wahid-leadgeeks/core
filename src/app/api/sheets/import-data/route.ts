// src/app/api/sheets/import-data/route.ts
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getSessionAccessToken } from '@/lib/auth/google-session';
import { db } from '@/lib/db/client';
import { importSpreadsheets } from '../../../../../scripts/import-spreadsheets';
import { logAuditEvent } from '@/domains/audit/service';
import { recordSheetsSyncLog } from '@/domains/automation/service';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: authentication required' }, { status: 401 });
    }

    // All authenticated users can trigger spreadsheet ingestion (RBAC removed)

    const body = await request.json().catch(() => ({}));
    const targetDomain = body.domain || 'all'; // 'all' | 'accounts' | 'devices' | 'software'
    const spreadsheetTitle = body.spreadsheetTitle || 'Authoritative Spreadsheets';
    const spreadsheetId = body.spreadsheetId || 'authoritative_set';

    console.log(`🚀 Triggering spreadsheet import for domain: ${targetDomain} by ${user.email} (${user.role})`);

    const summary = await importSpreadsheets(db, {
      verbose: false,
    });

    // Record immutable audit event
    await logAuditEvent({
      actorId: user.id,
      action: 'sheets.import_database',
      entityType: 'database',
      entityId: user.id,
      metadata: {
        domain: targetDomain,
        spreadsheetTitle,
        spreadsheetId,
        actorEmail: user.email,
        actorRole: user.role,
        summary,
      },
    }).catch((err) => console.warn('Audit logging error:', err));

    // Record sheets sync log
    await recordSheetsSyncLog({
      action: 'pull',
      spreadsheetId,
      spreadsheetTitle,
      sheetName: 'All Domains Ingestion',
      range: 'Database Sync',
      summary: `Imported ${summary.accounts} accounts, ${summary.googleGroups} groups, ${summary.devices} devices, ${summary.applications} software apps into PostgreSQL`,
      status: 'completed',
      actorId: user.id,
      actorEmail: user.email,
    }).catch((err) => console.warn('Sheets sync logging error:', err));

    return NextResponse.json({
      success: true,
      message: 'Successfully imported spreadsheet data into PostgreSQL database',
      summary,
    });
  } catch (error: any) {
    console.error('Import spreadsheet data error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to import spreadsheet data into database',
      },
      { status: 500 }
    );
  }
}
