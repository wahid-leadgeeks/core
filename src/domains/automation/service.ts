// src/domains/automation/service.ts
import crypto from 'node:crypto';
import { db } from '../../lib/db/client';
import { sheetsSyncLogs } from './schema';
import { desc, eq, and } from 'drizzle-orm';
import { logAuditEvent } from '../audit/service';
import {
  extractGoogleSpreadsheet,
  getSheetRange,
  updateSheetRange,
  type ExtractedSpreadsheetContent,
  type UpdateCellResult,
} from '../../lib/sheets/extractor';
import {
  getSpreadsheetIdForDomain,
  AUTHORITATIVE_SPREADSHEETS,
  type SpreadsheetDomainKey,
} from '../../lib/auth/google-config';

export interface SheetsSyncLogRecord {
  id: string;
  action: 'pull' | 'push' | 'cell_update' | 'rollback';
  spreadsheetId: string;
  spreadsheetTitle: string | null;
  sheetName: string;
  range: string;
  summary: string;
  previousCondition: string[][] | null;
  newCondition: string[][] | null;
  status: 'applied' | 'rolled_back' | 'failed' | 'completed';
  actorId: string | null;
  actorEmail: string | null;
  rollbackLogId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSheetsSyncLogInput {
  action: 'pull' | 'push' | 'cell_update' | 'rollback';
  spreadsheetId: string;
  spreadsheetTitle?: string | null;
  sheetName: string;
  range: string;
  summary: string;
  previousCondition?: string[][] | null;
  newCondition?: string[][] | null;
  status?: 'applied' | 'rolled_back' | 'failed' | 'completed';
  actorId?: string | null;
  actorEmail?: string | null;
  rollbackLogId?: string | null;
  errorMessage?: string | null;
}

export interface SyncLogsFilter {
  spreadsheetId?: string;
  action?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

function isValidUUID(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

// In-memory fallback log store for local tests and offline dev
const inMemorySyncLogStore: SheetsSyncLogRecord[] = [];

/**
 * Persists a sheets synchronization/mutation log record.
 */
export async function recordSheetsSyncLog(
  input: CreateSheetsSyncLogInput
): Promise<SheetsSyncLogRecord> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const record: SheetsSyncLogRecord = {
    id,
    action: input.action,
    spreadsheetId: input.spreadsheetId,
    spreadsheetTitle: input.spreadsheetTitle || null,
    sheetName: input.sheetName,
    range: input.range,
    summary: input.summary,
    previousCondition: input.previousCondition || null,
    newCondition: input.newCondition || null,
    status: input.status || (input.action === 'pull' ? 'completed' : 'applied'),
    actorId: input.actorId || null,
    actorEmail: input.actorEmail || null,
    rollbackLogId: input.rollbackLogId || null,
    errorMessage: input.errorMessage || null,
    createdAt: now,
    updatedAt: now,
  };

  inMemorySyncLogStore.push(record);

  // Attempt database insertion
  try {
    const validActorUuid = isValidUUID(input.actorId) ? input.actorId! : null;

    await db.insert(sheetsSyncLogs).values({
      id,
      action: record.action,
      spreadsheetId: record.spreadsheetId,
      spreadsheetTitle: record.spreadsheetTitle,
      sheetName: record.sheetName,
      range: record.range,
      summary: record.summary,
      previousCondition: record.previousCondition,
      newCondition: record.newCondition,
      status: record.status,
      actorId: validActorUuid,
      actorEmail: record.actorEmail,
      rollbackLogId: isValidUUID(record.rollbackLogId) ? record.rollbackLogId : null,
      errorMessage: record.errorMessage,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('Failed to write sheets_sync_log to DB:', error);
      throw error;
    }
  }

  // Record corresponding immutable audit event
  try {
    await logAuditEvent({
      actorId: input.actorId,
      action: `sheets.${input.action}`,
      entityType: 'spreadsheet',
      entityId: id,
      metadata: {
        spreadsheetId: input.spreadsheetId,
        sheetName: input.sheetName,
        range: input.range,
        summary: input.summary,
        status: record.status,
        actorEmail: input.actorEmail,
        rollbackLogId: input.rollbackLogId,
        hasPreviousCondition: Boolean(input.previousCondition?.length),
      },
    });
  } catch (err) {
    console.error('Failed to record audit event for sheets operation:', err);
  }

  return record;
}

/**
 * Retrieves sheets sync logs with optional filtering.
 */
export async function getSheetsSyncLogs(
  filters?: SyncLogsFilter
): Promise<SheetsSyncLogRecord[]> {
  try {
    const conditions = [];
    if (filters?.spreadsheetId) {
      conditions.push(eq(sheetsSyncLogs.spreadsheetId, filters.spreadsheetId));
    }
    if (filters?.action) {
      conditions.push(eq(sheetsSyncLogs.action, filters.action));
    }
    if (filters?.status) {
      conditions.push(eq(sheetsSyncLogs.status, filters.status));
    }

    const whereCondition =
      conditions.length > 1
        ? and(...conditions)
        : conditions.length === 1
        ? conditions[0]
        : undefined;

    const baseQuery = db.select().from(sheetsSyncLogs);
    const query = whereCondition ? baseQuery.where(whereCondition) : baseQuery;
    const rows = await query
      .orderBy(desc(sheetsSyncLogs.createdAt))
      .limit(filters?.limit || 100)
      .offset(filters?.offset || 0);

    if (rows && rows.length > 0) {
      return rows.map((r) => ({
        id: r.id,
        action: r.action as any,
        spreadsheetId: r.spreadsheetId,
        spreadsheetTitle: r.spreadsheetTitle,
        sheetName: r.sheetName,
        range: r.range,
        summary: r.summary,
        previousCondition: r.previousCondition as string[][] | null,
        newCondition: r.newCondition as string[][] | null,
        status: r.status as any,
        actorId: r.actorId,
        actorEmail: r.actorEmail,
        rollbackLogId: r.rollbackLogId,
        errorMessage: r.errorMessage,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    }
  } catch {
    // Fall back to in-memory store
  }

  let result = [...inMemorySyncLogStore].reverse();
  if (filters?.spreadsheetId) {
    result = result.filter((l) => l.spreadsheetId === filters.spreadsheetId);
  }
  if (filters?.action) {
    result = result.filter((l) => l.action === filters.action);
  }
  if (filters?.status) {
    result = result.filter((l) => l.status === filters.status);
  }

  const offset = filters?.offset || 0;
  const limit = filters?.limit || 100;
  return result.slice(offset, offset + limit);
}

/**
 * Retrieves a single sheets sync log by ID.
 */
export async function getSheetsSyncLogById(
  id: string
): Promise<SheetsSyncLogRecord | null> {
  if (isValidUUID(id)) {
    try {
      const rows = await db
        .select()
        .from(sheetsSyncLogs)
        .where(eq(sheetsSyncLogs.id, id))
        .limit(1);

      if (rows && rows[0]) {
        const r = rows[0];
        return {
          id: r.id,
          action: r.action as any,
          spreadsheetId: r.spreadsheetId,
          spreadsheetTitle: r.spreadsheetTitle,
          sheetName: r.sheetName,
          range: r.range,
          summary: r.summary,
          previousCondition: r.previousCondition as string[][] | null,
          newCondition: r.newCondition as string[][] | null,
          status: r.status as any,
          actorId: r.actorId,
          actorEmail: r.actorEmail,
          rollbackLogId: r.rollbackLogId,
          errorMessage: r.errorMessage,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        };
      }
    } catch {
      // Fallback
    }
  }

  return inMemorySyncLogStore.find((l) => l.id === id) || null;
}

/**
 * Updates an existing log status (e.g. marking as rolled_back).
 */
export async function updateSheetsSyncLogStatus(
  id: string,
  status: 'applied' | 'rolled_back' | 'failed' | 'completed',
  errorMessage?: string
): Promise<void> {
  const inMem = inMemorySyncLogStore.find((l) => l.id === id);
  if (inMem) {
    inMem.status = status;
    if (errorMessage) inMem.errorMessage = errorMessage;
    inMem.updatedAt = new Date().toISOString();
  }

  if (isValidUUID(id)) {
    try {
      await db
        .update(sheetsSyncLogs)
        .set({
          status,
          ...(errorMessage ? { errorMessage } : {}),
          updatedAt: new Date(),
        })
        .where(eq(sheetsSyncLogs.id, id));
    } catch (err) {
      console.warn('Failed to update sheets sync log status in DB:', err);
    }
  }
}

/**
 * Resolves spreadsheet ID and title given either domain key ('accounts' | 'devices' | 'software') or direct ID.
 */
export function resolveSpreadsheetInfo(keyOrId?: string): { id: string; title: string; defaultSheet: string } {
  if (keyOrId === 'devices') {
    return {
      id: getSpreadsheetIdForDomain('devices'),
      title: AUTHORITATIVE_SPREADSHEETS.devices.name,
      defaultSheet: 'Laptop Information',
    };
  }
  if (keyOrId === 'software') {
    return {
      id: getSpreadsheetIdForDomain('software'),
      title: AUTHORITATIVE_SPREADSHEETS.software.name,
      defaultSheet: 'List of Applications',
    };
  }
  if (keyOrId === 'accounts' || !keyOrId) {
    return {
      id: getSpreadsheetIdForDomain('accounts'),
      title: AUTHORITATIVE_SPREADSHEETS.accounts.name,
      defaultSheet: 'List of User Account',
    };
  }

  // Direct ID
  return {
    id: keyOrId,
    title: 'Custom Google Spreadsheet',
    defaultSheet: 'Sheet1',
  };
}

/**
 * Pulls data from a linked Google Spreadsheet and records the operation in the data log.
 */
export async function pullFromSpreadsheet(params: {
  spreadsheetKey?: SpreadsheetDomainKey | string;
  spreadsheetId?: string;
  sheetName?: string;
  accessToken: string;
  actor?: { id?: string; email?: string };
}): Promise<{ content: ExtractedSpreadsheetContent; log: SheetsSyncLogRecord }> {
  const { id: targetId, title: defaultTitle, defaultSheet } = resolveSpreadsheetInfo(
    params.spreadsheetId || params.spreadsheetKey
  );
  const targetSheet = params.sheetName || defaultSheet;

  let content: ExtractedSpreadsheetContent;
  try {
    content = await extractGoogleSpreadsheet(targetId, { accessToken: params.accessToken });
  } catch (err: any) {
    // Record failed pull in data log
    await recordSheetsSyncLog({
      action: 'pull',
      spreadsheetId: targetId,
      spreadsheetTitle: defaultTitle,
      sheetName: targetSheet,
      range: `${targetSheet}!A:Z`,
      summary: `Pull failed: ${err.message || 'Unknown error'}`,
      status: 'failed',
      errorMessage: err.message,
      actorId: params.actor?.id,
      actorEmail: params.actor?.email,
    });
    throw err;
  }

  const sheetSummaries = content.sheets
    .map((s) => `${s.title} (${s.rowCount} rows, ${s.columnCount} cols)`)
    .join('; ');

  const targetMatrix = content.rawMatrices[targetSheet] || [];
  const preview = targetMatrix.slice(0, 10);

  const log = await recordSheetsSyncLog({
    action: 'pull',
    spreadsheetId: targetId,
    spreadsheetTitle: content.title || defaultTitle,
    sheetName: targetSheet,
    range: `${targetSheet}!1:${targetMatrix.length || 1}`,
    summary: `Successfully pulled from spreadsheet. Sheets: ${sheetSummaries}`,
    newCondition: preview,
    status: 'completed',
    actorId: params.actor?.id,
    actorEmail: params.actor?.email,
  });

  return { content, log };
}

/**
 * Pushes data to a linked Google Spreadsheet.
 * Automatically captures PREVIOUS CONDITION before updating to enable instant Rollback/Undo.
 */
export async function pushToSpreadsheet(params: {
  spreadsheetKey?: SpreadsheetDomainKey | string;
  spreadsheetId?: string;
  sheetName: string;
  range: string;
  values: string[][];
  accessToken: string;
  summary?: string;
  actor?: { id?: string; email?: string };
}): Promise<{ updateResult: UpdateCellResult; log: SheetsSyncLogRecord }> {
  const { id: targetId, title: defaultTitle } = resolveSpreadsheetInfo(
    params.spreadsheetId || params.spreadsheetKey
  );

  // Normalize range format, ensuring sheet name is prefixed if omitted
  let fullRange = params.range.trim();
  if (!fullRange.includes('!')) {
    fullRange = `'${params.sheetName}'!${fullRange}`;
  }

  // 1. CAPTURE PREVIOUS CONDITION (Snapshot for Undo / Rollback)
  let previousCondition: string[][] | null = null;
  try {
    previousCondition = await getSheetRange(targetId, fullRange, { accessToken: params.accessToken });
  } catch (captureErr) {
    console.warn(`Could not pre-capture range ${fullRange} before push:`, captureErr);
    previousCondition = [];
  }

  // 2. APPLY UPDATE TO GOOGLE SPREADSHEET
  let updateResult: UpdateCellResult;
  try {
    updateResult = await updateSheetRange(
      targetId,
      fullRange,
      params.values,
      { accessToken: params.accessToken }
    );
  } catch (updateErr: any) {
    // Record failure in log
    await recordSheetsSyncLog({
      action: 'push',
      spreadsheetId: targetId,
      spreadsheetTitle: defaultTitle,
      sheetName: params.sheetName,
      range: fullRange,
      summary: `Push failed: ${updateErr.message || 'Mutation rejected'}`,
      previousCondition,
      newCondition: params.values,
      status: 'failed',
      errorMessage: updateErr.message,
      actorId: params.actor?.id,
      actorEmail: params.actor?.email,
    });
    throw updateErr;
  }

  // 3. RECORD MUTATION IN DATA LOG WITH PREVIOUS AND NEW CONDITIONS
  const rowCount = params.values.length;
  const colCount = params.values[0]?.length || 0;
  const summary =
    params.summary ||
    `Pushed ${rowCount} rows (${colCount} columns) to '${params.sheetName}' at ${fullRange}`;

  const log = await recordSheetsSyncLog({
    action: 'push',
    spreadsheetId: targetId,
    spreadsheetTitle: defaultTitle,
    sheetName: params.sheetName,
    range: fullRange,
    summary,
    previousCondition,
    newCondition: params.values,
    status: 'applied',
    actorId: params.actor?.id,
    actorEmail: params.actor?.email,
  });

  return { updateResult, log };
}

/**
 * Rolls back a previous spreadsheet update back to its previous condition (Undo).
 */
export async function rollbackSpreadsheetMutation(params: {
  logId: string;
  accessToken: string;
  actor?: { id?: string; email?: string };
}): Promise<{
  updateResult: UpdateCellResult;
  rollbackLog: SheetsSyncLogRecord;
  originalLog: SheetsSyncLogRecord;
}> {
  const originalLog = await getSheetsSyncLogById(params.logId);
  if (!originalLog) {
    throw new Error(`Sync log with ID '${params.logId}' not found`);
  }

  if (originalLog.status === 'rolled_back') {
    throw new Error(`Operation was already rolled back previously.`);
  }

  if (!originalLog.previousCondition || !Array.isArray(originalLog.previousCondition)) {
    throw new Error(
      `Cannot rollback this log: No previous condition snapshot is stored for this mutation.`
    );
  }

  // 1. REVERT ON GOOGLE SHEETS USING PREVIOUS CONDITION
  let updateResult: UpdateCellResult;
  try {
    updateResult = await updateSheetRange(
      originalLog.spreadsheetId,
      originalLog.range,
      originalLog.previousCondition,
      { accessToken: params.accessToken }
    );
  } catch (rollbackErr: any) {
    await logAuditEvent({
      actorId: params.actor?.id,
      action: 'sheets.rollback_failed',
      entityType: 'spreadsheet',
      entityId: originalLog.id,
      metadata: {
        error: rollbackErr.message,
        range: originalLog.range,
      },
    });
    throw new Error(`Google Sheets rollback failed: ${rollbackErr.message}`);
  }

  // 2. UPDATE ORIGINAL LOG STATUS TO 'rolled_back'
  await updateSheetsSyncLogStatus(originalLog.id, 'rolled_back');
  originalLog.status = 'rolled_back';

  // 3. RECORD NEW ROLLBACK AUDIT / DATA LOG
  const rollbackLog = await recordSheetsSyncLog({
    action: 'rollback',
    spreadsheetId: originalLog.spreadsheetId,
    spreadsheetTitle: originalLog.spreadsheetTitle,
    sheetName: originalLog.sheetName,
    range: originalLog.range,
    summary: `Undo/Rollback executed: Restored previous condition for '${originalLog.sheetName}' range ${originalLog.range} (reverting log ${originalLog.id.slice(0, 8)})`,
    previousCondition: originalLog.newCondition,
    newCondition: originalLog.previousCondition,
    status: 'completed',
    rollbackLogId: originalLog.id,
    actorId: params.actor?.id,
    actorEmail: params.actor?.email,
  });

  return { updateResult, rollbackLog, originalLog };
}
