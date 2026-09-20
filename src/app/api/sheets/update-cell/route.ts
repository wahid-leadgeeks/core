import { NextResponse } from 'next/server';
import { getSessionAccessToken } from '@/lib/auth/google-session';
import { updateSheetCell, updateSheetRange, getSheetRange } from '@/lib/sheets/extractor';
import { getLinkedSpreadsheetId } from '@/lib/auth/google-config';
import { pushToSpreadsheet } from '@/domains/automation/service';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const spreadsheetId = url.searchParams.get('id') || getLinkedSpreadsheetId();
  const range = url.searchParams.get('range');

  if (!spreadsheetId) {
    return NextResponse.json({ error: 'GOOGLE_SHEETS_ID is not configured' }, { status: 400 });
  }

  if (!range) {
    return NextResponse.json({ error: 'range parameter is required (e.g. "Sheet1!A1:C10")' }, { status: 400 });
  }

  const accessToken = await getSessionAccessToken(request);
  if (!accessToken) {
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        loginUrl: '/api/auth/google',
        message: 'Google OAuth authentication is required to read spreadsheet cells.',
      },
      { status: 401 }
    );
  }

  try {
    const values = await getSheetRange(spreadsheetId, range, { accessToken });
    return NextResponse.json({
      success: true,
      range,
      values,
      value: values[0]?.[0] || '',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to read cell';
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    range?: string;
    value?: string;
    values?: string[][];
    spreadsheetId?: string;
  } | null;

  const spreadsheetId = body?.spreadsheetId || getLinkedSpreadsheetId();

  if (!spreadsheetId) {
    return NextResponse.json({ error: 'GOOGLE_SHEETS_ID is not configured' }, { status: 400 });
  }

  const accessToken = await getSessionAccessToken(request);
  if (!accessToken) {
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        loginUrl: '/api/auth/google',
        message: 'Google OAuth authentication is required to update spreadsheet cells.',
      },
      { status: 401 }
    );
  }

  try {
    const sheetName = body?.range?.includes('!')
      ? body.range.split('!')[0].replace(/^'|'$/g, '')
      : 'Sheet1';

    const valuesToPush = Array.isArray(body?.values)
      ? body.values
      : typeof body?.value === 'string' && typeof body?.range === 'string'
      ? [[body.value]]
      : null;

    if (!valuesToPush || !body?.range) {
      return NextResponse.json(
        { error: 'range and value (or values 2D array) are required' },
        { status: 400 }
      );
    }

    const { updateResult, log } = await pushToSpreadsheet({
      spreadsheetId,
      sheetName,
      range: body.range,
      values: valuesToPush,
      summary: `Cell update at ${body.range}`,
      accessToken,
    });

    return NextResponse.json({
      success: true,
      ...updateResult,
      values: valuesToPush,
      log,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update cell';
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
