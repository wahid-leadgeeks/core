// src/app/api/sheets/extract/route.ts
import { NextResponse } from 'next/server';
import { getSessionAccessToken } from '@/lib/auth/google-session';
import { extractGoogleSpreadsheet } from '@/lib/sheets/extractor';
import { getLinkedSpreadsheetId, getLinkedSpreadsheetUrl } from '@/lib/auth/google-config';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const spreadsheetId = url.searchParams.get('id') || getLinkedSpreadsheetId();

  if (!spreadsheetId) {
    return NextResponse.json(
      { error: 'GOOGLE_SHEETS_ID is not configured and no id param was provided' },
      { status: 400 }
    );
  }

  // Retrieve authenticated Google access token from session
  const accessToken = await getSessionAccessToken(request);

  if (!accessToken) {
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        spreadsheetId,
        spreadsheetUrl: getLinkedSpreadsheetUrl(),
        loginUrl: '/api/auth/google',
        message:
          'Google OAuth authentication with spreadsheets scope is required. Sign in with Google at /api/auth/google.',
      },
      { status: 401 }
    );
  }

  try {
    const data = await extractGoogleSpreadsheet(spreadsheetId, {
      accessToken,
    });

    return NextResponse.json({
      success: true,
      source: 'google_sheets_api',
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      data,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to extract Google Sheet';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      },
      { status: 502 }
    );
  }
}
