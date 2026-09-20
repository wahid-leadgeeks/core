// src/app/api/sheets/drive-files/route.ts
import { NextResponse } from 'next/server';
import { getSessionAccessToken } from '@/lib/auth/google-session';
import { listGoogleDriveSpreadsheets } from '@/lib/sheets/extractor';

export async function GET(request: Request) {
  const accessToken = await getSessionAccessToken(request);

  if (!accessToken) {
    return NextResponse.json(
      {
        authenticated: false,
        files: [],
        message: 'Google OAuth authentication is required to browse Google Drive files.',
        loginUrl: '/api/auth/google',
      },
      { status: 401 }
    );
  }

  try {
    const files = await listGoogleDriveSpreadsheets(accessToken);
    return NextResponse.json({
      authenticated: true,
      files,
      count: files.length,
    });
  } catch (err: any) {
    console.error('Failed to list Google Drive files:', err);
    return NextResponse.json(
      {
        authenticated: true,
        files: [],
        error: err.message || 'Failed to list Google Drive spreadsheets',
      },
      { status: 500 }
    );
  }
}
