// src/app/api/sheets/pull/route.ts
import { NextResponse } from 'next/server';
import { getSessionAccessToken, getGoogleSessionFromCookie } from '@/lib/auth/google-session';
import { pullFromSpreadsheet } from '@/domains/automation/service';

export async function POST(request: Request) {
  try {
    const accessToken = await getSessionAccessToken(request);
    if (!accessToken) {
      return NextResponse.json(
        {
          error: 'Google OAuth authentication is required to pull data from Google Sheets.',
          loginUrl: '/api/auth/google',
        },
        { status: 401 }
      );
    }

    const session = await getGoogleSessionFromCookie(request);
    const body = await request.json().catch(() => ({}));
    const { spreadsheetKey, spreadsheetId, sheetName } = body;

    const actor = {
      id: session?.user?.id,
      email: session?.user?.email,
    };

    const { content, log } = await pullFromSpreadsheet({
      spreadsheetKey,
      spreadsheetId,
      sheetName,
      accessToken,
      actor,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully pulled spreadsheet data.`,
      log,
      summary: {
        documentTitle: content.title,
        sheets: content.sheets,
        extractedAt: content.extractedAt,
      },
    });
  } catch (error: any) {
    console.error('Error during spreadsheet pull:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to pull data from Google Sheets' },
      { status: 500 }
    );
  }
}
