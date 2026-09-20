// src/app/sheets/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import {
  FileSpreadsheet,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  X,
  History,
  Shield,
  Layers,
  Laptop,
  Users,
  Eye,
  Info,
} from 'lucide-react';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { OpenSpreadsheetConsole } from '@/components/sheets/OpenSpreadsheetConsole';

interface LinkedSheetInfo {
  key: string;
  name: string;
  domain: string;
  spreadsheetId: string;
  url: string;
  sheets: Array<{ title: string; gid: string; description?: string }>;
}

interface SheetsSyncLog {
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
  actorEmail: string | null;
  rollbackLogId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function SheetsSyncPage() {
  const [loading, setLoading] = useState(true);
  const [spreadsheets, setSpreadsheets] = useState<LinkedSheetInfo[]>([]);
  const [authStatus, setAuthStatus] = useState<{
    authenticated: boolean;
    user?: { name?: string; email?: string; picture?: string } | null;
    loginUrl?: string;
  }>({ authenticated: false });

  // Data logs state
  const [logs, setLogs] = useState<SheetsSyncLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [filterAction, setFilterAction] = useState<'ALL' | 'push' | 'pull' | 'rollback'>('ALL');

  // Active Pull State
  const [pullTargetKey, setPullTargetKey] = useState<string>('accounts');
  const [pulling, setPulling] = useState(false);
  const [pullSuccessMessage, setPullSuccessMessage] = useState<string | null>(null);
  const [pullErrorMessage, setPullErrorMessage] = useState<string | null>(null);

  // Active Push State
  const [pushTargetKey, setPushTargetKey] = useState<string>('accounts');
  const [pushSheetName, setPushSheetName] = useState<string>('List of User Account');
  const [pushRange, setPushRange] = useState<string>('A2:C2');
  const [pushValuesText, setPushValuesText] = useState<string>('Demo User, demo_username, demo@leadgeeks.com');
  const [pushSummary, setPushSummary] = useState<string>('Manual test update from CORE app');
  const [pushing, setPushing] = useState(false);
  const [pushSuccessMessage, setPushSuccessMessage] = useState<string | null>(null);
  const [pushErrorMessage, setPushErrorMessage] = useState<string | null>(null);

  // Rollback Modal State
  const [rollbackModalLog, setRollbackModalLog] = useState<SheetsSyncLog | null>(null);
  const [rollingBack, setRollingBack] = useState(false);
  const [rollbackError, setRollbackError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // View Details Modal State
  const [viewDetailsLog, setViewDetailsLog] = useState<SheetsSyncLog | null>(null);

  useEffect(() => {
    loadStatus();
    loadLogs();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/sheets/status');
      if (res.ok) {
        const data = await res.json();
        setSpreadsheets(data.spreadsheets || []);
        setAuthStatus({
          authenticated: data.authenticated,
          user: data.user,
          loginUrl: data.loginUrl,
        });
      }
    } catch (err) {
      console.error('Failed to load sheets status:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/sheets/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load sync logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Handle Pull from Sheet
  const handleExecutePull = async () => {
    setPulling(true);
    setPullSuccessMessage(null);
    setPullErrorMessage(null);

    try {
      const res = await fetch('/api/sheets/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetKey: pullTargetKey }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Pull request failed');
      }

      setPullSuccessMessage(`Pull complete! Extracted ${data.summary?.sheets?.length || 0} sheets.`);
      showToast('Successfully pulled from Google Sheet', 'success');
      loadLogs();
    } catch (err: any) {
      setPullErrorMessage(err.message || 'Failed to pull from spreadsheet');
      showToast(err.message, 'error');
    } finally {
      setPulling(false);
    }
  };

  // Handle Push to Sheet
  const handleExecutePush = async () => {
    setPushing(true);
    setPushSuccessMessage(null);
    setPushErrorMessage(null);

    try {
      // Parse CSV/TSV input into 2D array
      const rows = pushValuesText
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean)
        .map((row) => {
          if (row.includes('\t')) return row.split('\t').map((c) => c.trim());
          return row.split(',').map((c) => c.trim());
        });

      if (rows.length === 0) {
        throw new Error('Please enter at least one row of values to push.');
      }

      const res = await fetch('/api/sheets/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetKey: pushTargetKey,
          sheetName: pushSheetName,
          range: pushRange,
          values: rows,
          summary: pushSummary || `Pushed ${rows.length} rows to ${pushRange}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Push request failed');
      }

      setPushSuccessMessage(`Push complete! Updated ${data.updateResult?.updatedCells ?? rows.length} cells. Previous snapshot saved for Undo.`);
      showToast('Successfully pushed update to Google Sheet with rollback snapshot', 'success');
      loadLogs();
    } catch (err: any) {
      setPushErrorMessage(err.message || 'Failed to push to spreadsheet');
      showToast(err.message, 'error');
    } finally {
      setPushing(false);
    }
  };

  // Handle Undo / Rollback
  const handleConfirmRollback = async () => {
    if (!rollbackModalLog) return;
    setRollingBack(true);
    setRollbackError(null);

    try {
      const res = await fetch('/api/sheets/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId: rollbackModalLog.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Rollback failed');
      }

      showToast(`Rollback successful! Restored previous condition for ${rollbackModalLog.range}.`, 'success');
      setRollbackModalLog(null);
      loadLogs();
    } catch (err: any) {
      setRollbackError(err.message || 'Failed to rollback spreadsheet mutation');
      showToast(err.message, 'error');
    } finally {
      setRollingBack(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (filterAction === 'ALL') return true;
    return l.action === filterAction;
  });

  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case 'identity':
        return <Users size={16} className="text-emerald-500" />;
      case 'assets':
        return <Laptop size={16} className="text-sky-500" />;
      case 'software':
        return <Layers size={16} className="text-purple-500" />;
      default:
        return <FileSpreadsheet size={16} className="text-emerald-500" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'push':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <ArrowUpFromLine size={12} />
            PUSH
          </span>
        );
      case 'pull':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ArrowDownToLine size={12} />
            PULL
          </span>
        );
      case 'rollback':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <RotateCcw size={12} />
            UNDO / ROLLBACK
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            UPDATE
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={12} />
            Applied
          </span>
        );
      case 'rolled_back':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <RotateCcw size={12} />
            Rolled Back
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <AlertCircle size={12} />
            Failed
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSeconds < 60) return 'just now';
      if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
      if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
      return date.toLocaleDateString();
    } catch {
      return isoString;
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-12 max-w-7xl mx-auto">
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-emerald-900/20'
                : 'bg-rose-950/90 border-rose-500/40 text-rose-200 shadow-rose-900/20'
            }`}
          >
            {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-2 text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <FileSpreadsheet size={22} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Google Spreadsheets & Sync Engine
                </h1>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  Bi-directional synchronization, real-time data log, and one-click rollback snapshotting.
                </p>
              </div>
            </div>
          </div>

          {/* OAuth Status Banner */}
          <div className="flex items-center gap-3">
            {authStatus.authenticated ? (
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-800 dark:text-emerald-300 font-medium">
                  OAuth Active
                </span>
                {authStatus.user?.email && (
                  <span className="font-mono text-slate-500 dark:text-slate-400 pl-1 border-l border-emerald-200 dark:border-emerald-800/60">
                    {authStatus.user.email}
                  </span>
                )}
              </div>
            ) : (
              <a
                href={authStatus.loginUrl || '/api/auth/google'}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-sm transition-colors"
              >
                <Shield size={14} />
                Connect Google Workspace
              </a>
            )}

            <button
              onClick={() => {
                loadStatus();
                loadLogs();
              }}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh status & logs"
            >
              <RefreshCw size={15} className={logsLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Universal Google Spreadsheet & Excel Importer Console */}
        <OpenSpreadsheetConsole
          authenticated={authStatus.authenticated}
          loginUrl={authStatus.loginUrl}
          onImportComplete={() => {
            loadLogs();
          }}
        />

        {/* 3 Authoritative Spreadsheets Cards */}
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center justify-between">
            <span>Authoritative Connected Spreadsheets (3)</span>
            <span className="text-[11px] normal-case text-slate-400">Direct Google Sheets API v4 REST</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {spreadsheets.map((s) => (
              <div
                key={s.key}
                className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between hover:border-emerald-500/40 transition-colors"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getDomainIcon(s.domain)}
                      <span className="text-xs font-mono font-medium text-slate-400 uppercase">
                        {s.domain}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {s.sheets.length} sheets
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1" title={s.name}>
                    {s.name}
                  </h3>

                  <div className="space-y-1">
                    {s.sheets.map((sheet) => (
                      <div
                        key={sheet.title}
                        className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600" />
                        <span className="truncate">{sheet.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400 truncate max-w-[150px]">
                    ID: {s.spreadsheetId.slice(0, 8)}...
                  </span>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <span>Open Sheet</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bi-Directional Operations Console */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PULL CONSOLE */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ArrowDownToLine size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Pull from Google Sheet
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Fetch raw worksheets from authoritative document.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-400">READ-ONLY SYNC</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target Spreadsheet
                </label>
                <select
                  value={pullTargetKey}
                  onChange={(e) => setPullTargetKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="accounts">List of Accounts and Google Group Management</option>
                  <option value="devices">List of Company Hardware Devices (Laptop)</option>
                  <option value="software">List of Softwares/Tools/Applications</option>
                </select>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-200">
                  <Info size={14} className="text-emerald-500" />
                  Operation Characteristics:
                </div>
                <p>
                  • Extracts all sheet tabs, row matrices, and grid counts via Google Sheets API v4.
                </p>
                <p>
                  • Automatically logs the pull operation in the Data Log with metadata preview.
                </p>
              </div>

              {pullSuccessMessage && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  <span>{pullSuccessMessage}</span>
                </div>
              )}

              {pullErrorMessage && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-xs text-red-800 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{pullErrorMessage}</span>
                </div>
              )}

              <button
                onClick={handleExecutePull}
                disabled={pulling || !authStatus.authenticated}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed"
              >
                {pulling ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Extracting from Google Sheets...</span>
                  </>
                ) : (
                  <>
                    <ArrowDownToLine size={14} />
                    <span>Execute Pull from Sheet</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* PUSH CONSOLE */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <ArrowUpFromLine size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Push Data to Sheet
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Write updates to target range with automatic snapshotting.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                UNDO READY
              </span>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Spreadsheet
                  </label>
                  <select
                    value={pushTargetKey}
                    onChange={(e) => {
                      const key = e.target.value;
                      setPushTargetKey(key);
                      if (key === 'accounts') setPushSheetName('List of User Account');
                      if (key === 'devices') setPushSheetName('Laptop Information');
                      if (key === 'software') setPushSheetName('List of Applications');
                    }}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="accounts">Accounts & Groups</option>
                    <option value="devices">Hardware (Laptop)</option>
                    <option value="software">Software Tools</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Target Range
                  </label>
                  <input
                    type="text"
                    value={pushRange}
                    onChange={(e) => setPushRange(e.target.value)}
                    placeholder="e.g. A2:C2"
                    className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Values Matrix (Comma or Tab Separated)</span>
                  <span className="text-[10px] text-slate-400 font-mono">1 row = 1 line</span>
                </label>
                <textarea
                  value={pushValuesText}
                  onChange={(e) => setPushValuesText(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Col1, Col2, Col3..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Summary / Change Rationale
                </label>
                <input
                  type="text"
                  value={pushSummary}
                  onChange={(e) => setPushSummary(e.target.value)}
                  placeholder="e.g. Added new onboarding user row"
                  className="w-full px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {pushSuccessMessage && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  <span>{pushSuccessMessage}</span>
                </div>
              )}

              {pushErrorMessage && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-xs text-red-800 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{pushErrorMessage}</span>
                </div>
              )}

              <button
                onClick={handleExecutePush}
                disabled={pushing || !authStatus.authenticated}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed"
              >
                {pushing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Snapshotting & Pushing...</span>
                  </>
                ) : (
                  <>
                    <ArrowUpFromLine size={14} />
                    <span>Push to Sheet (With Auto-Snapshot)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Update Data Log Table with Rollback / Undo Buttons */}
        <div className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm overflow-hidden space-y-3 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <History size={18} className="text-emerald-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Update Data Log & Rollback History
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authoritative record of all spreadsheet synchronizations, pushes, and rollbacks.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs">
              {(['ALL', 'push', 'pull', 'rollback'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterAction(tab)}
                  className={`px-2.5 py-1 rounded-md transition-all font-mono ${
                    filterAction === tab
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Sheet & Range</th>
                  <th className="py-2.5 px-3">Summary of Changes</th>
                  <th className="py-2.5 px-3">Modified By</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-mono text-xs">
                      {logsLoading ? 'Loading update data logs...' : 'No spreadsheet data logs recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const canUndo =
                      log.status === 'applied' &&
                      log.previousCondition &&
                      log.previousCondition.length > 0;

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Timestamp */}
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          <span title={new Date(log.createdAt).toLocaleString()}>
                            {formatRelativeTime(log.createdAt)}
                          </span>
                        </td>

                        {/* Action Badge */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {getActionBadge(log.action)}
                        </td>

                        {/* Target Sheet & Range */}
                        <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {log.sheetName}
                          </span>
                          <span className="text-slate-400 ml-1.5 font-normal">
                            ({log.range.includes('!') ? log.range.split('!')[1] : log.range})
                          </span>
                        </td>

                        {/* Summary */}
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={log.summary}>
                          {log.summary}
                        </td>

                        {/* Modified By */}
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                          {log.actorEmail || 'system'}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {getStatusBadge(log.status)}
                        </td>

                        {/* Action Buttons: Undo / Details */}
                        <td className="py-3 px-3 text-right whitespace-nowrap space-x-2">
                          <button
                            onClick={() => setViewDetailsLog(log)}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Inspect Log Conditions"
                          >
                            <Eye size={14} />
                          </button>

                          {canUndo ? (
                            <button
                              onClick={() => setRollbackModalLog(log)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-medium transition-all shadow-xs"
                              title="Roll back to previous condition before this update"
                            >
                              <RotateCcw size={12} />
                              <span>Undo</span>
                            </button>
                          ) : log.status === 'rolled_back' ? (
                            <span className="text-[11px] font-mono text-purple-400 select-none">
                              Reverted
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ROLLBACK CONFIRMATION MODAL */}
        {rollbackModalLog && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                    <RotateCcw size={18} />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Undo Spreadsheet Update
                  </h3>
                </div>
                <button
                  onClick={() => setRollbackModalLog(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-slate-600 dark:text-slate-300">
                  Are you sure you want to revert this update? This will write the recorded snapshot of the
                  previous condition directly back to Google Sheets.
                </p>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                  <div className="flex justify-between font-mono text-slate-500">
                    <span>Target Range:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {rollbackModalLog.range}
                    </span>
                  </div>
                  <div className="flex justify-between font-mono text-slate-500">
                    <span>Sheet Tab:</span>
                    <span className="text-slate-900 dark:text-slate-100">{rollbackModalLog.sheetName}</span>
                  </div>
                  <div className="flex justify-between font-mono text-slate-500">
                    <span>Applied Summary:</span>
                    <span className="text-slate-900 dark:text-slate-100 truncate max-w-[240px]">
                      {rollbackModalLog.summary}
                    </span>
                  </div>
                </div>

                {/* Diff Preview */}
                <div className="space-y-2">
                  <div className="font-medium text-slate-700 dark:text-slate-300">
                    Condition Diff:
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300">
                      <div className="font-bold mb-1">Current Condition (To Revert):</div>
                      <pre className="overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(rollbackModalLog.newCondition, null, 2)}
                      </pre>
                    </div>

                    <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      <div className="font-bold mb-1">Previous Condition (To Restore):</div>
                      <pre className="overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(rollbackModalLog.previousCondition, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>

                {rollbackError && (
                  <div className="p-2.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    <span>{rollbackError}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  onClick={() => setRollbackModalLog(null)}
                  disabled={rollingBack}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRollback}
                  disabled={rollingBack}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {rollingBack ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Reverting on Google Sheets...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw size={13} />
                      <span>Confirm Rollback (Undo)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* INSPECT LOG DETAILS MODAL */}
        {viewDetailsLog && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Log Snapshot Details
                </h3>
                <button
                  onClick={() => setViewDetailsLog(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Previous Condition Snapshot:</div>
                  <pre className="p-2.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] overflow-x-auto max-h-36">
                    {JSON.stringify(viewDetailsLog.previousCondition, null, 2) || 'None recorded'}
                  </pre>
                </div>

                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">New Condition Snapshot:</div>
                  <pre className="p-2.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] overflow-x-auto max-h-36">
                    {JSON.stringify(viewDetailsLog.newCondition, null, 2) || 'None recorded'}
                  </pre>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setViewDetailsLog(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
