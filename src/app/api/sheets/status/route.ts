// src/app/api/sheets/status/route.ts
import { NextResponse } from 'next/server';
import { getSessionAccessToken, getGoogleSessionFromCookie } from '@/lib/auth/google-session';
import {
  getLinkedSpreadsheetId,
  getLinkedSpreadsheetUrl,
  getAllLinkedSpreadsheets,
  isGoogleAuthConfigured,
} from '@/lib/auth/google-config';
import { extractGoogleSpreadsheet } from '@/lib/sheets/extractor';

export async function GET(request: Request) {
  const spreadsheetId = getLinkedSpreadsheetId();
  const spreadsheetUrl = getLinkedSpreadsheetUrl();
  const oauthConfigured = isGoogleAuthConfigured();
  const accessToken = await getSessionAccessToken(request);
  const session = await getGoogleSessionFromCookie(request);
  const spreadsheets = getAllLinkedSpreadsheets();

  const status: Record<string, any> = {
    connected: Boolean(spreadsheetId),
    spreadsheetId,
    spreadsheetUrl,
    oauthConfigured,
    authenticated: Boolean(accessToken),
    user: session?.user || null,
    spreadsheets,
    loginUrl: '/api/auth/google',
  };

  if (accessToken && spreadsheetId) {
    try {
      const data = await extractGoogleSpreadsheet(spreadsheetId, { accessToken });
      status.documentTitle = data.title;
      status.sheetsCount = data.sheets.length;
      status.sheets = data.sheets.map((s) => ({
        title: s.title,
        rows: s.rowCount,
        columns: s.columnCount,
      }));
      status.liveSyncReady = true;
    } catch (err: unknown) {
      status.liveSyncReady = false;
      status.syncError = err instanceof Error ? err.message : 'Failed to reach spreadsheet with token';
    }
  }

  return NextResponse.json(status);
}

