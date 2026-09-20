// tests/helpers/sheets-sync-helper.mjs
import crypto from 'node:crypto';
import { AUTHORITATIVE_SPREADSHEETS, getLinkedSpreadsheetId } from './google-sheets-helper.mjs';

export class InMemorySheetsSyncEngine {
  constructor(auditLogger) {
    this.logs = [];
    this.auditLogger = auditLogger;
    // Mock spreadsheets state: map of spreadsheetId -> map of sheetName -> matrix
    this.spreadsheets = new Map();
    this.initDefaultSheets();
  }

  initDefaultSheets() {
    const accountsId = getLinkedSpreadsheetId('accounts');
    const devicesId = getLinkedSpreadsheetId('devices');
    const softwareId = getLinkedSpreadsheetId('software');

    // Default accounts sheet
    const accountsMap = new Map();
    accountsMap.set('List of User Account', [
      ['Full Name', 'Username', 'Email', 'Role', 'Department'],
      ['Alex Mercer', 'amercer', 'alex.mercer@leadgeeks.com', 'Admin', 'IT'],
      ['Sarah Connor', 'sconnor', 'sarah.connor@leadgeeks.com', 'Engineer', 'Growth'],
    ]);
    accountsMap.set('Google Group', [
      ['Engineering', 'Product', 'Leadership'],
      ['eng@leadgeeks.com', 'prod@leadgeeks.com', 'leads@leadgeeks.com'],
    ]);
    this.spreadsheets.set(accountsId, accountsMap);

    // Default devices sheet
    const devicesMap = new Map();
    devicesMap.set('Laptop Information', [
      ['Asset No', 'Brand', 'Model', 'Status'],
      ['A001', 'LENOVO', 'ThinkPad T14', 'assigned'],
      ['A002', 'MSI', 'Modern 14', 'available'],
    ]);
    this.spreadsheets.set(devicesId, devicesMap);

    // Default software sheet
    const softwareMap = new Map();
    softwareMap.set('List of Applications', [
      ['Application Name', 'Category', 'Subscription Type'],
      ['Google Workspace', 'productivity', 'paid'],
      ['Slack', 'communication', 'paid'],
    ]);
    this.spreadsheets.set(softwareId, softwareMap);
  }

  getSheetData(spreadsheetId, sheetName) {
    const sMap = this.spreadsheets.get(spreadsheetId);
    if (!sMap) return [];
    return sMap.get(sheetName) || [];
  }

  setSheetData(spreadsheetId, sheetName, matrix) {
    let sMap = this.spreadsheets.get(spreadsheetId);
    if (!sMap) {
      sMap = new Map();
      this.spreadsheets.set(spreadsheetId, sMap);
    }
    sMap.set(sheetName, matrix);
  }

  async recordLog(input) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const record = {
      id,
      action: input.action,
      spreadsheetId: input.spreadsheetId,
      spreadsheetTitle: input.spreadsheetTitle || 'Authoritative Spreadsheet',
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

    this.logs.push(record);

    if (this.auditLogger) {
      this.auditLogger.log({
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
          rollbackLogId: input.rollbackLogId,
        },
      });
    }

    return record;
  }

  async getLogs(filters = {}) {
    let res = [...this.logs].reverse();
    if (filters.spreadsheetId) {
      res = res.filter((l) => l.spreadsheetId === filters.spreadsheetId);
    }
    if (filters.action) {
      res = res.filter((l) => l.action === filters.action);
    }
    if (filters.status) {
      res = res.filter((l) => l.status === filters.status);
    }
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    return res.slice(offset, offset + limit);
  }

  async getLogById(id) {
    return this.logs.find((l) => l.id === id) || null;
  }

  async pull(params) {
    const { spreadsheetKey, spreadsheetId, sheetName, actor } = params;
    const targetId = spreadsheetId || getLinkedSpreadsheetId(spreadsheetKey);
    const targetSheet = sheetName || 'List of User Account';

    const matrix = this.getSheetData(targetId, targetSheet);

    const log = await this.recordLog({
      action: 'pull',
      spreadsheetId: targetId,
      sheetName: targetSheet,
      range: `${targetSheet}!A1:Z${matrix.length}`,
      summary: `Pulled ${matrix.length} rows from sheet '${targetSheet}'`,
      newCondition: matrix.slice(0, 10),
      status: 'completed',
      actorId: actor?.id,
      actorEmail: actor?.email,
    });

    return { content: { rawMatrices: { [targetSheet]: matrix } }, log };
  }

  async push(params) {
    const { spreadsheetKey, spreadsheetId, sheetName, range, values, summary, actor } = params;
    const targetId = spreadsheetId || getLinkedSpreadsheetId(spreadsheetKey);

    // 1. Snapshot previous condition
    const currentSheetMatrix = this.getSheetData(targetId, sheetName);
    const previousCondition = JSON.parse(JSON.stringify(currentSheetMatrix));

    // 2. Apply update to mock sheet (handle row-offset updates like A2:E2)
    let newMatrix;
    if (range && (range.includes('A2') || range.includes('2:')) && currentSheetMatrix.length > 1 && values.length === 1) {
      newMatrix = [...currentSheetMatrix];
      newMatrix[1] = values[0];
    } else {
      newMatrix = values;
    }
    this.setSheetData(targetId, sheetName, newMatrix);

    // 3. Record log with previousCondition snapshot
    const log = await this.recordLog({
      action: 'push',
      spreadsheetId: targetId,
      sheetName,
      range,
      summary: summary || `Pushed ${values.length} rows to ${range}`,
      previousCondition,
      newCondition: values,
      status: 'applied',
      actorId: actor?.id,
      actorEmail: actor?.email,
    });

    return { updateResult: { updatedCells: values.length * (values[0]?.length || 1) }, log };
  }

  async rollback(params) {
    const { logId, actor } = params;
    const originalLog = await this.getLogById(logId);

    if (!originalLog) {
      throw new Error(`Sync log with ID '${logId}' not found`);
    }

    if (originalLog.status === 'rolled_back') {
      throw new Error('Operation was already rolled back previously.');
    }

    if (!originalLog.previousCondition || !Array.isArray(originalLog.previousCondition)) {
      throw new Error('Cannot rollback this log: No previous condition snapshot is stored for this mutation.');
    }

    // 1. Revert sheet data back to previous condition
    this.setSheetData(originalLog.spreadsheetId, originalLog.sheetName, originalLog.previousCondition);

    // 2. Mark original log as rolled_back
    originalLog.status = 'rolled_back';
    originalLog.updatedAt = new Date().toISOString();

    // 3. Create new rollback log
    const rollbackLog = await this.recordLog({
      action: 'rollback',
      spreadsheetId: originalLog.spreadsheetId,
      sheetName: originalLog.sheetName,
      range: originalLog.range,
      summary: `Undo/Rollback executed: Restored previous condition for '${originalLog.sheetName}' range ${originalLog.range}`,
      previousCondition: originalLog.newCondition,
      newCondition: originalLog.previousCondition,
      status: 'completed',
      rollbackLogId: originalLog.id,
      actorId: actor?.id,
      actorEmail: actor?.email,
    });

    return {
      updateResult: { updatedCells: originalLog.previousCondition.length * (originalLog.previousCondition[0]?.length || 1) },
      rollbackLog,
      originalLog,
    };
  }
}
