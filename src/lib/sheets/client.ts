// src/lib/sheets/client.ts
import { extractGoogleSpreadsheet, type ExtractedSpreadsheetContent } from './extractor';
import {
  getLinkedSpreadsheetId,
  getLinkedSpreadsheetUrl,
  getAllLinkedSpreadsheets,
  isGoogleAuthConfigured,
  type SpreadsheetDomainKey,
} from '@/lib/auth/google-config';

/**
 * Returns general connectivity and metadata info about the linked Google Spreadsheets.
 */
export function getLinkedSpreadsheetMetadata(domainKey?: SpreadsheetDomainKey | string) {
  const spreadsheetId = getLinkedSpreadsheetId(domainKey);
  const spreadsheetUrl = getLinkedSpreadsheetUrl(domainKey);
  const oauthConfigured = isGoogleAuthConfigured();

  return {
    spreadsheetId,
    spreadsheetUrl,
    oauthConfigured,
    defaultSpreadsheetId: '15kx94mT2qekbcBV5BEHZhb7M25O3smM2JYQZT_ydgz8',
    connected: Boolean(spreadsheetId),
  };
}

/**
 * Returns all configured authoritative spreadsheets.
 */
export function getAllSpreadsheetsMetadata() {
  const all = getAllLinkedSpreadsheets();
  const oauthConfigured = isGoogleAuthConfigured();
  return {
    oauthConfigured,
    spreadsheets: all,
  };
}

/**
 * Reads all worksheets from a specified linked Google Spreadsheet (defaults to accounts).
 */
export async function readLinkedSpreadsheet(
  accessToken?: string,
  domainKeyOrId?: string
): Promise<ExtractedSpreadsheetContent | null> {
  const spreadsheetId =
    domainKeyOrId && domainKeyOrId.length > 30
      ? domainKeyOrId
      : getLinkedSpreadsheetId(domainKeyOrId);

  if (!spreadsheetId || !accessToken) {
    return null;
  }

  try {
    return await extractGoogleSpreadsheet(spreadsheetId, { accessToken });
  } catch (error) {
    console.error('Failed to read linked Google Spreadsheet:', error);
    throw error;
  }
}

