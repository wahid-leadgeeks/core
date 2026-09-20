// src/app/api/sheets/push/route.ts
import { NextResponse } from 'next/server';
import { getSessionAccessToken, getGoogleSessionFromCookie } from '@/lib/auth/google-session';
import { pushToSpreadsheet } from '@/domains/automation/service';

export async function POST(request: Request) {
  try {
    const accessToken = await getSessionAccessToken(request);
    if (!accessToken) {
      return NextResponse.json(
        {
          error: 'Google OAuth authentication is required to push updates to Google Sheets.',
          loginUrl: '/api/auth/google',
        },
        { status: 401 }
      );
    }

    const session = await getGoogleSessionFromCookie(request);
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid JSON request payload' },
        { status: 400 }
      );
    }

    const { spreadsheetKey, spreadsheetId, sheetName, range, values, summary } = body;

    if (!sheetName || typeof sheetName !== 'string') {
      return NextResponse.json(
        { error: 'sheetName is required (e.g. "List of User Account")' },
        { status: 400 }
      );
    }

    if (!range || typeof range !== 'string') {
      return NextResponse.json(
        { error: 'range is required (e.g. "A2:M2" or "List of User Account!A2:M2")' },
        { status: 400 }
      );
    }

    if (!Array.isArray(values) || values.length === 0 || !Array.isArray(values[0])) {
      return NextResponse.json(
        { error: 'values must be a non-empty 2D array of strings (string[][])' },
        { status: 400 }
      );
    }

    const actor = {
      id: session?.user?.id,
      email: session?.user?.email,
    };

    const { updateResult, log } = await pushToSpreadsheet({
      spreadsheetKey,
      spreadsheetId,
      sheetName,
      range,
      values,
      summary,
      accessToken,
      actor,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully pushed update to Google Sheets. Snapshot recorded for rollback.`,
      log,
      updateResult,
    });
  } catch (error: any) {
    console.error('Error during spreadsheet push:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to push data to Google Sheets' },
      { status: 500 }
    );
  }
}
