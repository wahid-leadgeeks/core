// src/app/api/sheets/logs/route.ts
import { NextResponse } from 'next/server';
import { getSheetsSyncLogs } from '@/domains/automation/service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const spreadsheetId = searchParams.get('spreadsheetId') || undefined;
    const action = searchParams.get('action') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

    const logs = await getSheetsSyncLogs({
      spreadsheetId,
      action,
      status,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      logs,
      total: logs.length,
    });
  } catch (error: any) {
    console.error('Failed to fetch sheets sync logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve sync logs' },
      { status: 500 }
    );
  }
}
