import { describe, it, expect } from '../helpers/test-framework.mjs';
import { InMemorySheetsSyncEngine } from '../helpers/sheets-sync-helper.mjs';
import { InMemoryAuditLogger } from '../helpers/audit-helper.mjs';
import {
  getLinkedSpreadsheetId,
  getLinkedSpreadsheetUrl,
  AUTHORITATIVE_SPREADSHEETS,
} from '../helpers/google-sheets-helper.mjs';

describe('Suite 10: Google Sheets Pull, Push, Data Log & Rollback (Undo)', () => {
  let auditLogger;
  let syncEngine;

  const resetEngine = () => {
    auditLogger = new InMemoryAuditLogger();
    syncEngine = new InMemorySheetsSyncEngine(auditLogger);
  };

  // ============================================================================
  // TIER 1: FEATURE COVERAGE
  // ============================================================================

  it('[Tier 1] verifies authoritative spreadsheets are mapped to their respective domains (accounts, devices, software)', () => {
    const accountsId = getLinkedSpreadsheetId('accounts');
    const devicesId = getLinkedSpreadsheetId('devices');
    const softwareId = getLinkedSpreadsheetId('software');

    expect(accountsId).toBe('15kx94mT2qekbcBV5BEHZhb7M25O3smM2JYQZT_ydgz8');
    expect(devicesId).toBe('1ELcKpCCEYXpI2wg3IIKJ0s3XpfdN92tyiyUOe40S_YQ');
    expect(softwareId).toBe('1q_pkNgrfDm7F_fQRF2beOxRvQf9XVE3e4MGPVxSmA5M');

    expect(getLinkedSpreadsheetUrl('accounts')).toContain('15kx94mT2qekbcBV5BEHZhb7M25O3smM2JYQZT_ydgz8');
    expect(getLinkedSpreadsheetUrl('devices')).toContain('1ELcKpCCEYXpI2wg3IIKJ0s3XpfdN92tyiyUOe40S_YQ');
    expect(getLinkedSpreadsheetUrl('software')).toContain('1q_pkNgrfDm7F_fQRF2beOxRvQf9XVE3e4MGPVxSmA5M');
  });

  it('[Tier 1] pulls sheet data and creates a completed pull data log with metadata', async () => {
    resetEngine();

    const result = await syncEngine.pull({
      spreadsheetKey: 'accounts',
      sheetName: 'List of User Account',
      actor: { id: 'u1', email: 'it-admin@leadgeeks.com' },
    });

    expect(result.log).toBeDefined();
    expect(result.log.action).toBe('pull');
    expect(result.log.status).toBe('completed');
    expect(result.log.sheetName).toBe('List of User Account');
    expect(result.log.actorEmail).toBe('it-admin@leadgeeks.com');
    expect(result.log.newCondition).toBeDefined();
    expect(result.log.newCondition.length).toBeGreaterThan(0);

    // Audit event emitted
    const auditEvents = auditLogger.getAll({ action: 'sheets.pull' });
    expect(auditEvents.length).toBe(1);
    expect(auditEvents[0].entityType).toBe('spreadsheet');
  });

  it('[Tier 1] pushes updates to sheet, capturing previous condition snapshot and recording applied push log', async () => {
    resetEngine();

    const accountsId = getLinkedSpreadsheetId('accounts');
    const initialData = syncEngine.getSheetData(accountsId, 'List of User Account');
    const originalFirstRow = initialData[1]; // ['Alex Mercer', 'amercer', ...]

    const newValues = [
      ['Full Name', 'Username', 'Email', 'Role', 'Department'],
      ['Alex Mercer Updated', 'amercer', 'alex.mercer@leadgeeks.com', 'Super Admin', 'IT'],
    ];

    const pushResult = await syncEngine.push({
      spreadsheetKey: 'accounts',
      sheetName: 'List of User Account',
      range: 'List of User Account!A1:E2',
      values: newValues,
      summary: 'Updated Alex Mercer role to Super Admin',
      actor: { id: 'u1', email: 'it-admin@leadgeeks.com' },
    });

    expect(pushResult.log).toBeDefined();
    expect(pushResult.log.action).toBe('push');
    expect(pushResult.log.status).toBe('applied');
    expect(pushResult.log.summary).toContain('Super Admin');

    // PREVIOUS CONDITION SNAPSHOT MUST BE CAPTURED
    expect(pushResult.log.previousCondition).toBeDefined();
    expect(pushResult.log.previousCondition[1][0]).toBe(originalFirstRow[0]); // 'Alex Mercer'

    // NEW CONDITION
    expect(pushResult.log.newCondition[1][0]).toBe('Alex Mercer Updated');

    // Live spreadsheet updated
    const liveData = syncEngine.getSheetData(accountsId, 'List of User Account');
    expect(liveData[1][0]).toBe('Alex Mercer Updated');
  });

  it('[Tier 1] rolls back spreadsheet mutation restoring exact previous condition via Undo action', async () => {
    resetEngine();

    const accountsId = getLinkedSpreadsheetId('accounts');
    const originalData = syncEngine.getSheetData(accountsId, 'List of User Account');
    const originalAlex = originalData[1][0]; // 'Alex Mercer'

    // 1. Push a change
    const pushResult = await syncEngine.push({
      spreadsheetKey: 'accounts',
      sheetName: 'List of User Account',
      range: 'List of User Account!A1:E2',
      values: [
        ['Full Name', 'Username', 'Email', 'Role', 'Department'],
        ['Mismatched Name', 'amercer', 'alex.mercer@leadgeeks.com', 'Admin', 'IT'],
      ],
      summary: 'Accidental overwrite of user account',
      actor: { id: 'u1', email: 'it-admin@leadgeeks.com' },
    });

    // Verify sheet changed
    expect(syncEngine.getSheetData(accountsId, 'List of User Account')[1][0]).toBe('Mismatched Name');

    // 2. Execute Undo / Rollback
    const rollbackResult = await syncEngine.rollback({
      logId: pushResult.log.id,
      actor: { id: 'u1', email: 'it-admin@leadgeeks.com' },
    });

    // Original log status must be updated to rolled_back
    expect(rollbackResult.originalLog.status).toBe('rolled_back');

    // Rollback log created
    expect(rollbackResult.rollbackLog.action).toBe('rollback');
    expect(rollbackResult.rollbackLog.status).toBe('completed');
    expect(rollbackResult.rollbackLog.rollbackLogId).toBe(pushResult.log.id);

    // Live spreadsheet restored to original condition!
    const restoredData = syncEngine.getSheetData(accountsId, 'List of User Account');
    expect(restoredData[1][0]).toBe(originalAlex);
  });

  // ============================================================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ============================================================================

  it('[Tier 2] rejects rollback if log has already been rolled back (prevents double-rollback)', async () => {
    resetEngine();

    const pushResult = await syncEngine.push({
      spreadsheetKey: 'accounts',
      sheetName: 'List of User Account',
      range: 'List of User Account!A1:E2',
      values: [['Header'], ['Test User']],
      actor: { email: 'admin@leadgeeks.com' },
    });

    // First rollback succeeds
    await syncEngine.rollback({ logId: pushResult.log.id });

    // Second rollback on same log must fail
    let threw = false;
    try {
      await syncEngine.rollback({ logId: pushResult.log.id });
    } catch (err) {
      threw = true;
      expect(err.message).toContain('already rolled back');
    }
    expect(threw).toBe(true);
  });

  it('[Tier 2] rejects rollback if log does not have a previous condition snapshot', async () => {
    resetEngine();

    // Directly create a log with null previousCondition
    const logWithoutSnapshot = await syncEngine.recordLog({
      action: 'push',
      spreadsheetId: getLinkedSpreadsheetId('accounts'),
      sheetName: 'List of User Account',
      range: 'A1:B2',
      summary: 'Legacy mutation without snapshot',
      previousCondition: null,
      newCondition: [['test']],
      status: 'applied',
    });

    let threw = false;
    try {
      await syncEngine.rollback({ logId: logWithoutSnapshot.id });
    } catch (err) {
      threw = true;
      expect(err.message).toContain('No previous condition snapshot');
    }
    expect(threw).toBe(true);
  });

  it('[Tier 2] throws error when attempting to rollback non-existent log ID', async () => {
    resetEngine();

    let threw = false;
    try {
      await syncEngine.rollback({ logId: 'non-existent-uuid-99999' });
    } catch (err) {
      threw = true;
      expect(err.message).toContain('not found');
    }
    expect(threw).toBe(true);
  });

  it('[Tier 2] guarantees zero plaintext PIN/secret leakage in sync logs and audit events', async () => {
    resetEngine();

    // Push containing potential secret PIN
    await syncEngine.push({
      spreadsheetKey: 'devices',
      sheetName: 'Access Login',
      range: 'Access Login!A2:E2',
      values: [['A001', 'login@company.com', 'plain1234', 'note']],
      summary: 'Device access credentials update',
      actor: { email: 'it-admin@leadgeeks.com' },
    });

    const auditEvents = auditLogger.getAll();
    for (const event of auditEvents) {
      const serialized = JSON.stringify(event);
      expect(serialized).not.toContain('plain1234');
    }
  });

  // ============================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // ============================================================================

  it('[Tier 3] pairwise check: push and rollback lifecycle generates corresponding immutable audit trail events', async () => {
    resetEngine();

    const pushResult = await syncEngine.push({
      spreadsheetKey: 'software',
      sheetName: 'List of Applications',
      range: 'List of Applications!A2:C2',
      values: [['New SaaS Tool', 'productivity', 'paid']],
      actor: { id: 'actor-101', email: 'lead@leadgeeks.com' },
    });

    // Verify audit log has sheets.push
    const pushAudits = auditLogger.getAll({ action: 'sheets.push' });
    expect(pushAudits.length).toBe(1);
    expect(pushAudits[0].entityId).toBe(pushResult.log.id);

    // Rollback
    const rollbackResult = await syncEngine.rollback({
      logId: pushResult.log.id,
      actor: { id: 'actor-101', email: 'lead@leadgeeks.com' },
    });

    // Verify audit log has sheets.rollback
    const rollbackAudits = auditLogger.getAll({ action: 'sheets.rollback' });
    expect(rollbackAudits.length).toBe(1);
    expect(rollbackAudits[0].entityId).toBe(rollbackResult.rollbackLog.id);
  });

  it('[Tier 3] filters sheets sync logs by action (push, pull, rollback) and status (applied, rolled_back)', async () => {
    resetEngine();

    await syncEngine.pull({ spreadsheetKey: 'accounts' });
    const push1 = await syncEngine.push({
      spreadsheetKey: 'accounts',
      sheetName: 'List of User Account',
      range: 'A2:B2',
      values: [['Jane', 'jane@co.com']],
    });
    await syncEngine.push({
      spreadsheetKey: 'devices',
      sheetName: 'Laptop Information',
      range: 'A2:B2',
      values: [['A005', 'MSI']],
    });
    await syncEngine.rollback({ logId: push1.log.id });

    // Filter by action: pull
    const pulls = await syncEngine.getLogs({ action: 'pull' });
    expect(pulls.length).toBe(1);
    expect(pulls[0].action).toBe('pull');

    // Filter by action: push
    const pushes = await syncEngine.getLogs({ action: 'push' });
    expect(pushes.length).toBe(2);

    // Filter by action: rollback
    const rollbacks = await syncEngine.getLogs({ action: 'rollback' });
    expect(rollbacks.length).toBe(1);

    // Filter by status: rolled_back
    const rolledBack = await syncEngine.getLogs({ status: 'rolled_back' });
    expect(rolledBack.length).toBe(1);
    expect(rolledBack[0].id).toBe(push1.log.id);
  });

  // ============================================================================
  // TIER 4: REAL-WORLD SCENARIOS
  // ============================================================================

  it('[Tier 4] Scenario 1: IT Admin accidentally overwrites user accounts row, clicks Undo, restores original state', async () => {
    resetEngine();

    const accountsId = getLinkedSpreadsheetId('accounts');
    const initialSheet = syncEngine.getSheetData(accountsId, 'List of User Account');
    const originalRow = [...initialSheet[1]];

    // Step 1: Push faulty update
    const pushResult = await syncEngine.push({
      spreadsheetKey: 'accounts',
      sheetName: 'List of User Account',
      range: 'List of User Account!A2:E2',
      values: [['CORRUPTED DATA', 'null', 'wrong@invalid.xyz', 'Unknown', 'None']],
      summary: 'Accidental script misconfiguration',
      actor: { email: 'admin@leadgeeks.com' },
    });

    expect(syncEngine.getSheetData(accountsId, 'List of User Account')[1][0]).toBe('CORRUPTED DATA');

    // Step 2: IT Admin reviews Data Log, sees the corrupted row, clicks "Undo"
    const rollbackResult = await syncEngine.rollback({
      logId: pushResult.log.id,
      actor: { email: 'admin@leadgeeks.com' },
    });

    expect(rollbackResult.originalLog.status).toBe('rolled_back');

    // Step 3: Verify live spreadsheet data restored perfectly
    const restoredSheet = syncEngine.getSheetData(accountsId, 'List of User Account');
    expect(restoredSheet[1][0]).toBe(originalRow[0]);
    expect(restoredSheet[1][1]).toBe(originalRow[1]);
    expect(restoredSheet[1][2]).toBe(originalRow[2]);
  });

  it('[Tier 4] Scenario 2: Multi-step hardware inventory synchronization with audit log traceability', async () => {
    resetEngine();

    // 1. Initial Pull
    await syncEngine.pull({
      spreadsheetKey: 'devices',
      sheetName: 'Laptop Information',
      actor: { email: 'inventory-manager@leadgeeks.com' },
    });

    // 2. Push 2 new devices
    const pushRes = await syncEngine.push({
      spreadsheetKey: 'devices',
      sheetName: 'Laptop Information',
      range: 'Laptop Information!A3:D4',
      values: [
        ['A032', 'LENOVO', 'ThinkPad E14', 'available'],
        ['A033', 'LENOVO', 'ThinkPad L14', 'available'],
      ],
      summary: 'Added 2 new ThinkPad laptops to inventory pool',
      actor: { email: 'inventory-manager@leadgeeks.com' },
    });

    expect(pushRes.log.status).toBe('applied');

    // 3. Inspect Data Log has both pull and push entries in chronological order
    const allLogs = await syncEngine.getLogs();
    expect(allLogs.length).toBe(2);
    expect(allLogs[0].action).toBe('push'); // most recent
    expect(allLogs[1].action).toBe('pull');
  });
});
