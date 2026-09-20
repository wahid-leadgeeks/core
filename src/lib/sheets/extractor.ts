// src/lib/sheets/extractor.ts
/**
 * CORE — Google Sheets API v4 Extractor & Mutation Client
 * Configured identically to onboarding-copilot for direct REST communication
 * with Google Sheets API without heavy external SDK overhead.
 */

export interface GoogleSheetsAuth {
  accessToken?: string;
  apiKey?: string;
}

export interface ExtractedSheetSummary {
  title: string;
  sheetId?: number;
  rowCount: number;
  columnCount: number;
}

export interface ExtractedSpreadsheetContent {
  spreadsheetId: string;
  title: string;
  extractedAt: string;
  sheets: ExtractedSheetSummary[];
  rawMatrices: Record<string, string[][]>;
}

export interface UpdateCellResult {
  updatedRange: string;
  updatedRows: number;
  updatedColumns: number;
  updatedCells: number;
}

/**
 * Calls Google Sheets API v4 to extract all sheets and cell matrices from a Google Spreadsheet.
 */
export async function extractGoogleSpreadsheet(
  spreadsheetId: string,
  auth: GoogleSheetsAuth,
  options: { includeRawMatrices?: boolean } = {}
): Promise<ExtractedSpreadsheetContent> {
  const headers: Record<string, string> = {};
  let keyQuery = '';

  if (auth.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  } else if (auth.apiKey) {
    keyQuery = `&key=${encodeURIComponent(auth.apiKey)}`;
  } else {
    throw new Error('Google authentication (OAuth access token or API key) is required to access Google Sheets API');
  }

  // 1. Fetch metadata (document title and worksheet properties)
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}?fields=properties.title,sheets.properties${keyQuery}`;

  const metaRes = await fetch(metaUrl, { headers, cache: 'no-store' });

  if (!metaRes.ok) {
    const errText = await metaRes.text().catch(() => '');
    let detail = errText;
    try {
      const parsed = JSON.parse(errText);
      if (parsed?.error?.message) detail = parsed.error.message;
    } catch {
      // Use raw text fallback
    }
    throw new Error(`Google Sheets API metadata request failed (${metaRes.status}): ${detail}`);
  }

  interface GoogleSheetMeta {
    properties?: { title?: string };
    sheets?: Array<{
      properties?: {
        sheetId?: number;
        title?: string;
        gridProperties?: { rowCount?: number; columnCount?: number };
      };
    }>;
  }

  const metaData = (await metaRes.json()) as GoogleSheetMeta;
  const docTitle = metaData.properties?.title || 'Google Spreadsheet';
  const sheetList = metaData.sheets || [];

  if (sheetList.length === 0) {
    throw new Error('No worksheets found in this Google Spreadsheet');
  }

  // 2. Fetch cell values for all sheets in a single batchGet
  const rangesQuery = sheetList
    .map((s) => s.properties?.title)
    .filter((t): t is string => Boolean(t))
    .map((t) => `ranges=${encodeURIComponent(t)}`)
    .join('&');

  const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values:batchGet?${rangesQuery}&valueRenderOption=FORMATTED_VALUE${keyQuery}`;

  const valuesRes = await fetch(valuesUrl, { headers, cache: 'no-store' });

  if (!valuesRes.ok) {
    const errText = await valuesRes.text().catch(() => '');
    let detail = errText;
    try {
      const parsed = JSON.parse(errText);
      if (parsed?.error?.message) detail = parsed.error.message;
    } catch {
      // Use raw
    }
    throw new Error(`Google Sheets API values request failed (${valuesRes.status}): ${detail}`);
  }

  interface ValueRange {
    range?: string;
    majorDimension?: string;
    values?: string[][];
  }

  interface BatchGetResponse {
    valueRanges?: ValueRange[];
  }

  const valuesData = (await valuesRes.json()) as BatchGetResponse;
  const rawMatrices: Record<string, string[][]> = {};
  const sheets: ExtractedSheetSummary[] = [];

  const valueRanges = valuesData.valueRanges || [];

  for (let i = 0; i < sheetList.length; i++) {
    const sheetMeta = sheetList[i].properties;
    const name = sheetMeta?.title || `Sheet${i + 1}`;
    const valueRange = valueRanges[i];
    const matrix = valueRange?.values || [];

    rawMatrices[name] = matrix;
    sheets.push({
      title: name,
      sheetId: sheetMeta?.sheetId,
      rowCount: matrix.length,
      columnCount: matrix.reduce((max, r) => Math.max(max, r.length), 0),
    });
  }

  return {
    spreadsheetId,
    title: docTitle,
    extractedAt: new Date().toISOString(),
    sheets,
    rawMatrices,
  };
}

/**
 * Updates a specific cell or range in a Google Spreadsheet via Google Sheets API v4.
 */
export async function updateSheetRange(
  spreadsheetId: string,
  range: string,
  values: string[][],
  auth: GoogleSheetsAuth
): Promise<UpdateCellResult> {
  if (!auth.accessToken && !auth.apiKey) {
    throw new Error('Google authentication is required to update spreadsheet cells');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  let keyQuery = '';

  if (auth.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  } else if (auth.apiKey) {
    keyQuery = `?key=${encodeURIComponent(auth.apiKey)}&valueInputOption=USER_ENTERED`;
  }

  const queryPrefix = keyQuery ? `${keyQuery}&` : '?valueInputOption=USER_ENTERED';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(range)}${queryPrefix}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    let detail = errText;
    try {
      const parsed = JSON.parse(errText);
      if (parsed?.error?.message) detail = parsed.error.message;
    } catch {
      // Use raw
    }
    throw new Error(`Google Sheets API update failed (${res.status}): ${detail}`);
  }

  interface GoogleUpdateResponse {
    updatedRange?: string;
    updatedRows?: number;
    updatedColumns?: number;
    updatedCells?: number;
  }

  const data = (await res.json()) as GoogleUpdateResponse;
  return {
    updatedRange: data.updatedRange || range,
    updatedRows: data.updatedRows || values.length,
    updatedColumns: data.updatedColumns || (values[0]?.length ?? 1),
    updatedCells: data.updatedCells || values.reduce((acc, row) => acc + row.length, 0),
  };
}

/**
 * Updates a single cell in a Google Spreadsheet via Google Sheets API v4.
 */
export async function updateSheetCell(
  spreadsheetId: string,
  range: string,
  value: string,
  auth: GoogleSheetsAuth
): Promise<UpdateCellResult> {
  return updateSheetRange(spreadsheetId, range, [[value]], auth);
}

/**
 * Reads a specific cell or range from a Google Spreadsheet via Google Sheets API v4.
 */
export async function getSheetRange(
  spreadsheetId: string,
  range: string,
  auth: GoogleSheetsAuth
): Promise<string[][]> {
  if (!auth.accessToken && !auth.apiKey) {
    throw new Error('Google authentication is required to read spreadsheet cells');
  }

  const headers: Record<string, string> = {};
  let keyQuery = '';

  if (auth.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  } else if (auth.apiKey) {
    keyQuery = `&key=${encodeURIComponent(auth.apiKey)}`;
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE${keyQuery}`;

  const res = await fetch(url, { headers, cache: 'no-store' });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Failed to read range ${range} (${res.status}): ${errText}`);
  }

  interface GoogleValuesResponse {
    values?: string[][];
  }

  const data = (await res.json()) as GoogleValuesResponse;
  return data.values || [];
}

/**
 * Extracts a Google Spreadsheet ID or Google Drive file ID from a URL or raw ID string.
 * Supports:
 * - https://docs.google.com/spreadsheets/d/{id}/edit...
 * - https://drive.google.com/file/d/{id}/view...
 * - https://drive.google.com/open?id={id}
 * - Direct ID string (e.g. 15kx94mT2qekbcBV5BEHZhb7M25O3smM2JYQZT_ydgz8)
 */
export function parseSpreadsheetIdFromUrl(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';

  // Google Sheets URL pattern: /spreadsheets/d/([a-zA-Z0-9-_]+)
  const sheetsMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetsMatch?.[1]) return sheetsMatch[1];

  // Google Drive file URL pattern: /file/d/([a-zA-Z0-9-_]+)
  const driveMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  if (driveMatch?.[1]) return driveMatch[1];

  // Google Drive query param pattern: id=([a-zA-Z0-9-_]+)
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (idParamMatch?.[1]) return idParamMatch[1];

  // Direct alphanumeric ID
  const cleanId = trimmed.split('/')[0].split('?')[0].split('#')[0];
  return cleanId;
}

/**
 * Extracts all worksheets and row matrices from an Excel buffer (.xlsx, .xls, .csv).
 */
export async function extractExcelBuffer(
  buffer: Buffer | ArrayBuffer | Uint8Array,
  title: string = 'Imported Excel File'
): Promise<ExtractedSpreadsheetContent> {
  const xlsxModule = await import('xlsx');
  const XLSX = xlsxModule.default || xlsxModule;

  const wb = XLSX.read(buffer, { type: 'buffer' });
  const rawMatrices: Record<string, string[][]> = {};
  const sheets: ExtractedSheetSummary[] = [];

  for (let idx = 0; idx < wb.SheetNames.length; idx++) {
    const sheetName = wb.SheetNames[idx];
    const worksheet = wb.Sheets[sheetName];
    if (!worksheet) continue;

    // Convert worksheet to 2D array of formatted strings
    const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
    const stringMatrix: string[][] = rows.map((row) =>
      Array.isArray(row) ? row.map((cell) => (cell === null || cell === undefined ? '' : String(cell))) : []
    );

    rawMatrices[sheetName] = stringMatrix;
    sheets.push({
      title: sheetName,
      sheetId: idx,
      rowCount: stringMatrix.length,
      columnCount: stringMatrix.reduce((max, r) => Math.max(max, r.length), 0),
    });
  }

  return {
    spreadsheetId: 'uploaded_excel_' + Date.now(),
    title,
    extractedAt: new Date().toISOString(),
    sheets,
    rawMatrices,
  };
}

/**
 * Lists spreadsheets and Excel files from the user's connected Google Drive.
 */
export async function listGoogleDriveSpreadsheets(accessToken: string): Promise<Array<{
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
  isExcel: boolean;
}>> {
  const query = encodeURIComponent(
    "trashed = false and (mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or name contains '.xlsx' or name contains '.csv')"
  );
  const fields = encodeURIComponent('files(id,name,mimeType,modifiedTime,webViewLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=30&orderBy=modifiedTime desc`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`Drive list files returned status ${res.status}: ${errText}`);
      return [];
    }

    const data = (await res.json()) as {
      files?: Array<{
        id: string;
        name: string;
        mimeType: string;
        modifiedTime: string;
        webViewLink?: string;
      }>;
    };

    return (data.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      modifiedTime: f.modifiedTime,
      webViewLink: f.webViewLink,
      isExcel: f.mimeType.includes('spreadsheetml') || f.name.toLowerCase().endsWith('.xlsx'),
    }));
  } catch (err) {
    console.warn('Failed to list Google Drive spreadsheets:', err);
    return [];
  }
}

/**
 * Fetches and extracts a Google Drive file or Google Sheet:
 * - If it's a native Google Spreadsheet, extracts via Google Sheets API v4.
 * - If it's an Excel file on Google Drive, downloads binary content via Drive API alt=media and parses with xlsx.
 */
export async function openGoogleSpreadsheetOrExcel(
  fileIdOrUrl: string,
  auth: GoogleSheetsAuth
): Promise<ExtractedSpreadsheetContent> {
  const fileId = parseSpreadsheetIdFromUrl(fileIdOrUrl);
  if (!fileId) {
    throw new Error('Invalid Google Spreadsheet or Google Drive file URL or ID.');
  }

  // 1. Try Google Sheets API v4 first (standard for native Google Sheets)
  try {
    const sheetData = await extractGoogleSpreadsheet(fileId, auth);
    return sheetData;
  } catch (sheetsErr: any) {
    // If it fails and access token is available, check if it's a Google Drive file / Excel
    if (!auth.accessToken) {
      throw sheetsErr;
    }

    // 2. Fetch metadata from Google Drive API to check if it's an Excel (.xlsx) file
    try {
      const metaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType`,
        {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
          cache: 'no-store',
        }
      );

      if (!metaRes.ok) {
        throw sheetsErr;
      }

      const meta = (await metaRes.json()) as { id: string; name: string; mimeType: string };

      // 3. Download binary content if it's an Excel file (.xlsx)
      const downloadRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
        {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
          cache: 'no-store',
        }
      );

      if (!downloadRes.ok) {
        throw new Error(`Failed to download Excel file from Google Drive (${downloadRes.status})`);
      }

      const arrayBuffer = await downloadRes.arrayBuffer();
      const extracted = await extractExcelBuffer(Buffer.from(arrayBuffer), meta.name || 'Google Drive Excel');
      extracted.spreadsheetId = fileId;
      return extracted;
    } catch (driveErr) {
      throw sheetsErr;
    }
  }
}
