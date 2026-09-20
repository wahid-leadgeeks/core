// src/app/api/sheets/rollback/route.ts
import { NextResponse } from 'next/server';
import { getSessionAccessToken, getGoogleSessionFromCookie } from '@/lib/auth/google-session';
import { rollbackSpreadsheetMutation } from '@/domains/automation/service';

export async function POST(request: Request) {
  try {
    const accessToken = await getSessionAccessToken(request);
    if (!accessToken) {
      return NextResponse.json(
        {
          error: 'Google OAuth authentication is required to rollback Google Sheets changes.',
          loginUrl: '/api/auth/google',
        },
        { status: 401 }
      );
    }

    const session = await getGoogleSessionFromCookie(request);
    const body = await request.json().catch(() => null);

    if (!body || !body.logId || typeof body.logId !== 'string') {
      return NextResponse.json(
        { error: 'Valid logId string is required to perform rollback' },
        { status: 400 }
      );
    }

    const actor = {
      id: session?.user?.id,
      email: session?.user?.email,
    };

    const { updateResult, rollbackLog, originalLog } = await rollbackSpreadsheetMutation({
      logId: body.logId,
      accessToken,
      actor,
    });

    return NextResponse.json({
      success: true,
      message: `Rollback successful! Reverted range ${originalLog.range} on '${originalLog.sheetName}' back to previous condition.`,
      rollbackLog,
      originalLog,
      updateResult,
    });
  } catch (error: any) {
    console.error('Error during spreadsheet rollback:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to rollback spreadsheet changes' },
      { status: 500 }
    );
  }
}
