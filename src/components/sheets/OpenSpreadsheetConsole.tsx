// src/components/sheets/OpenSpreadsheetConsole.tsx
'use client';

import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Search,
  UploadCloud,
  FolderOpen,
  Database,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  ArrowRight,
  Shield,
  Table,
} from 'lucide-react';
import type { ExtractedSpreadsheetContent } from '@/lib/sheets/extractor';

interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  isExcel: boolean;
  webViewLink?: string;
}

interface OpenSpreadsheetConsoleProps {
  authenticated: boolean;
  loginUrl?: string;
  onImportComplete?: () => void;
}

export function OpenSpreadsheetConsole({
  authenticated,
  loginUrl,
  onImportComplete,
}: OpenSpreadsheetConsoleProps) {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Drive Picker Modal
  const [driveModalOpen, setDriveModalOpen] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [driveLoading, setDriveLoading] = useState(false);

  // Active Opened Spreadsheet
  const [activeWorkbook, setActiveWorkbook] = useState<ExtractedSpreadsheetContent | null>(null);
  const [activeSource, setActiveSource] = useState<'google' | 'upload'>('google');
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
  const [searchFilter, setSearchFilter] = useState('');

  // Database Import
  const [importing, setImporting] = useState(false);
  const [importDomain, setImportDomain] = useState<'all' | 'accounts' | 'devices' | 'software'>('all');
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Open from URL or ID
  const handleOpenSpreadsheet = async (target?: string) => {
    const toOpen = target || urlInput.trim();
    if (!toOpen) {
      setErrorMessage('Please enter a Google Sheets URL, Google Drive link, or file ID.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setImportSuccess(null);

    try {
      const res = await fetch('/api/sheets/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: toOpen }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to open spreadsheet');
      }

      setActiveWorkbook(data.data);
      setActiveSource('google');
      setSelectedSheetIndex(0);
      setSearchFilter('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error opening spreadsheet');
    } finally {
      setLoading(false);
    }
  };

  // Browse Google Drive
  const handleBrowseDrive = async () => {
    setDriveModalOpen(true);
    setDriveLoading(true);
    try {
      const res = await fetch('/api/sheets/drive-files');
      if (res.ok) {
        const data = await res.json();
        setDriveFiles(data.files || []);
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to list Drive files');
      }
    } catch (err: any) {
      console.warn('Failed to load drive files:', err);
    } finally {
      setDriveLoading(false);
    }
  };

  // Upload Local Excel
  const handleLocalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMessage(null);
    setImportSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/sheets/open', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse Excel file');
      }

      setActiveWorkbook(data.data);
      setActiveSource('upload');
      setSelectedSheetIndex(0);
      setSearchFilter('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing uploaded file');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Import into PostgreSQL Database
  const handleImportToDatabase = async () => {
    if (!activeWorkbook) return;
    setImporting(true);
    setErrorMessage(null);
    setImportSuccess(null);

    try {
      const res = await fetch('/api/sheets/import-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: importDomain,
          spreadsheetTitle: activeWorkbook.title,
          spreadsheetId: activeWorkbook.spreadsheetId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Database import failed');
      }

      setImportSummary(data.summary);
      setImportSuccess(
        `Successfully imported into PostgreSQL: ${data.summary.accounts} accounts, ${data.summary.googleGroups} groups, ${data.summary.devices} devices, ${data.summary.applications} software apps.`
      );
      onImportComplete?.();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to import into database');
    } finally {
      setImporting(false);
    }
  };

  // Active worksheet rows
  const currentSheet = activeWorkbook?.sheets[selectedSheetIndex];
  const rawMatrix = currentSheet ? activeWorkbook?.rawMatrices[currentSheet.title] || [] : [];
  const headerRow = rawMatrix[0] || [];
  const bodyRows = rawMatrix.slice(1);

  // Filtered rows
  const filteredRows = searchFilter.trim()
    ? bodyRows.filter((row) =>
        row.some((cell) => cell.toLowerCase().includes(searchFilter.toLowerCase().trim()))
      )
    : bodyRows;

  return (
    <div className="rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Top Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-mono text-xs uppercase font-medium">
              <FileSpreadsheet size={16} />
              <span>Universal Spreadsheet Engine</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              Open & Import Spreadsheet / Excel from Google
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Open any Google Spreadsheet or Google Drive Excel (.xlsx) file by link/ID, browse Drive, or import into CORE database.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {authenticated ? (
              <button
                type="button"
                onClick={handleBrowseDrive}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-xs font-medium transition-colors shadow-xs"
              >
                <FolderOpen size={14} className="text-amber-500" />
                <span>Browse Google Drive</span>
              </button>
            ) : (
              <a
                href={loginUrl || '/api/auth/google'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-xs"
              >
                <Shield size={14} />
                <span>Connect Google Drive</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-xs font-medium transition-colors shadow-xs"
            >
              <UploadCloud size={14} className="text-sky-500" />
              <span>Upload .xlsx / .csv</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLocalFileUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
          </div>
        </div>

        {/* Input Bar */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleOpenSpreadsheet()}
              placeholder="Paste Google Spreadsheet URL, Google Drive link, or File ID (e.g. 15kx94mT2qekbcBV5BEHZhb7M25O3smM2JYQZT_ydgz8)..."
              className="w-full pl-3.5 pr-10 py-2 rounded-lg text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {urlInput && (
              <button
                type="button"
                onClick={() => setUrlInput('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleOpenSpreadsheet()}
            disabled={loading || !urlInput.trim()}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-colors disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Opening...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet size={14} />
                <span>Open File</span>
              </>
            )}
          </button>
        </div>

        {/* Preset Quick Links */}
        <div className="mt-3 flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
          <span className="font-mono text-[11px] text-slate-400">Authoritative Presets:</span>
          <button
            type="button"
            onClick={() => {
              setUrlInput('15kx94mT2qekbcBV5BEHZhb7M25O3smM2JYQZT_ydgz8');
              handleOpenSpreadsheet('15kx94mT2qekbcBV5BEHZhb7M25O3smM2JYQZT_ydgz8');
            }}
            className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-mono hover:bg-emerald-500/20 transition-colors"
          >
            Accounts & Groups
          </button>
          <button
            type="button"
            onClick={() => {
              setUrlInput('1ELcKpCCEYXpI2wg3IIKJ0s3XpfdN92tyiyUOe40S_YQ');
              handleOpenSpreadsheet('1ELcKpCCEYXpI2wg3IIKJ0s3XpfdN92tyiyUOe40S_YQ');
            }}
            className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-[11px] font-mono hover:bg-sky-500/20 transition-colors"
          >
            Hardware (Laptop)
          </button>
          <button
            type="button"
            onClick={() => {
              setUrlInput('1q_pkNgrfDm7F_fQRF2beOxRvQf9XVE3e4MGPVxSmA5M');
              handleOpenSpreadsheet('1q_pkNgrfDm7F_fQRF2beOxRvQf9XVE3e4MGPVxSmA5M');
            }}
            className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[11px] font-mono hover:bg-purple-500/20 transition-colors"
          >
            Software Tools
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Import Success Banner */}
        {importSuccess && (
          <div className="mt-3 p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>{importSuccess}</span>
            </div>
            <button onClick={() => setImportSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* OPENED WORKBOOK VIEWER */}
      {activeWorkbook && (
        <div className="p-5 space-y-4 animate-in fade-in duration-200">
          {/* Document Overview Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Table size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {activeWorkbook.title}
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {activeSource === 'google' ? 'Google Cloud' : 'Local File'}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  Extracted {activeWorkbook.sheets.length} worksheet(s) • Total cells:{' '}
                  {activeWorkbook.sheets.reduce((acc, s) => acc + s.rowCount * s.columnCount, 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Database Ingestion Button */}
            <div className="flex items-center gap-2">
              <select
                value={importDomain}
                onChange={(e: any) => setImportDomain(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">Full Ingestion (All Domains)</option>
                <option value="accounts">Identity (Accounts & Groups)</option>
                <option value="devices">Assets (Hardware Laptops)</option>
                <option value="software">Software (Apps & Subscriptions)</option>
              </select>

              <button
                type="button"
                onClick={handleImportToDatabase}
                disabled={importing}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors"
                title="Import data into PostgreSQL database"
              >
                {importing ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Importing into PostgreSQL...</span>
                  </>
                ) : (
                  <>
                    <Database size={13} />
                    <span>Import into PostgreSQL</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Worksheet Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 dark:border-slate-800/60">
            {activeWorkbook.sheets.map((sheet, idx) => (
              <button
                key={sheet.title}
                type="button"
                onClick={() => {
                  setSelectedSheetIndex(idx);
                  setSearchFilter('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  selectedSheetIndex === idx
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{sheet.title}</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {sheet.rowCount} rows
                </span>
              </button>
            ))}
          </div>

          {/* Search filter within worksheet */}
          <div className="flex items-center justify-between gap-4 text-xs">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder={`Search ${currentSheet?.title || 'sheet'}...`}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="font-mono text-[11px] text-slate-400">
              Showing {filteredRows.length} of {bodyRows.length} rows • {headerRow.length} columns
            </div>
          </div>

          {/* Data Grid Table */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto max-h-[420px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800/90 sticky top-0 z-10">
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                  <th className="py-2 px-3 text-slate-400 w-12 text-center">#</th>
                  {headerRow.map((col, cIdx) => (
                    <th key={cIdx} className="py-2 px-3 whitespace-nowrap font-semibold">
                      {col || `Col ${cIdx + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={Math.max(headerRow.length + 1, 1)}
                      className="py-8 text-center text-slate-400"
                    >
                      {searchFilter ? 'No rows match the search query.' : 'This worksheet is empty.'}
                    </td>
                  </tr>
                ) : (
                  filteredRows.slice(0, 100).map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2 px-3 text-slate-400 text-center select-none bg-slate-50/50 dark:bg-slate-900/30">
                        {rIdx + 1}
                      </td>
                      {headerRow.map((_, cIdx) => {
                        const cellVal = row[cIdx] || '';
                        return (
                          <td key={cIdx} className="py-2 px-3 whitespace-nowrap text-slate-800 dark:text-slate-200 max-w-xs truncate" title={cellVal}>
                            {cellVal || <span className="text-slate-400/40 select-none">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredRows.length > 100 && (
            <div className="text-center text-[11px] font-mono text-slate-400">
              Displaying first 100 rows of {filteredRows.length} matches.
            </div>
          )}
        </div>
      )}

      {/* GOOGLE DRIVE BROWSE MODAL */}
      {driveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FolderOpen size={18} className="text-amber-500" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Select File from Google Drive
                </h3>
              </div>
              <button
                onClick={() => setDriveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Recent Google Spreadsheets and Excel (.xlsx) files found in your connected Google Drive:
            </p>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
              {driveLoading ? (
                <div className="p-8 text-center text-xs font-mono text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Loading files from Google Drive API...</span>
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-mono">
                  No spreadsheet or Excel files found in your Google Drive.
                </div>
              ) : (
                driveFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileSpreadsheet
                        size={16}
                        className={file.isExcel ? 'text-emerald-500' : 'text-green-600'}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {file.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {file.isExcel ? 'Excel (.xlsx)' : 'Google Sheet'} • ID: {file.id.slice(0, 10)}...
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded text-slate-400 hover:text-slate-600"
                          title="Open in Google Drive"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setDriveModalOpen(false);
                          setUrlInput(file.id);
                          handleOpenSpreadsheet(file.id);
                        }}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] shadow-xs transition-colors"
                      >
                        Open File
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setDriveModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
