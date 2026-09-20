// src/app/api/sheets/open/route.ts
import { NextResponse } from 'next/server';
import { getSessionAccessToken } from '@/lib/auth/google-session';
import {
  openGoogleSpreadsheetOrExcel,
  extractExcelBuffer,
  parseSpreadsheetIdFromUrl,
} from '@/lib/sheets/extractor';
import { getLinkedSpreadsheetId } from '@/lib/auth/google-config';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle multipart/form-data for direct Excel / CSV file upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const extracted = await extractExcelBuffer(Buffer.from(arrayBuffer), file.name);

      return NextResponse.json({
        success: true,
        source: 'local_upload',
        data: extracted,
      });
    }

    // Handle JSON payload for Google Sheets / Google Drive URL or ID
    const body = await request.json().catch(() => ({}));
    const targetUrlOrId = body.url || body.fileId || body.spreadsheetId || getLinkedSpreadsheetId();

    if (!targetUrlOrId) {
      return NextResponse.json(
        { error: 'Missing target Google Spreadsheet or Google Drive file URL or ID' },
        { status: 400 }
      );
    }

    const fileId = parseSpreadsheetIdFromUrl(targetUrlOrId);
    const accessToken = await getSessionAccessToken(request);

    if (!accessToken) {
      return NextResponse.json(
        {
          error: 'Google OAuth authentication is required to open files from Google.',
          loginUrl: '/api/auth/google',
          fileId,
        },
        { status: 401 }
      );
    }

    const extracted = await openGoogleSpreadsheetOrExcel(fileId, { accessToken });

    return NextResponse.json({
      success: true,
      source: 'google_workspace',
      fileId,
      url: `https://docs.google.com/spreadsheets/d/${fileId}`,
      data: extracted,
    });
  } catch (error: any) {
    console.error('Failed to open spreadsheet:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to open spreadsheet file from Google',
      },
      { status: 500 }
    );
  }
}
