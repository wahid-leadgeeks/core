// src/components/assets/AssignDeviceModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { UserCheck, X, UserX, AlertCircle, Loader2, User } from 'lucide-react';

interface AccountOption {
  id: string;
  email: string;
  displayName: string;
  departmentCode?: string | null;
}

interface AssignDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  deviceId: string;
  assetNumber: string;
  currentAssignee?: {
    assigneeName?: string | null;
    assigneeEmail?: string | null;
  } | null;
}

export default function AssignDeviceModal({
  isOpen,
  onClose,
  onSuccess,
  deviceId,
  assetNumber,
  currentAssignee,
}: AssignDeviceModalProps) {
  const [mode, setMode] = useState<'assign' | 'return'>(
    currentAssignee?.assigneeName ? 'return' : 'assign'
  );
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [fetchingAccounts, setFetchingAccounts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Assign form state
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCustodianId, setSelectedCustodianId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  // Return form state
  const [targetStatus, setTargetStatus] = useState<'available' | 'reserve'>('available');
  const [returnNotes, setReturnNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(currentAssignee?.assigneeName ? 'return' : 'assign');
      setError(null);
      fetchAccounts();
    }
  }, [isOpen, currentAssignee]);

  async function fetchAccounts() {
    setFetchingAccounts(true);
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch {
      // ignore
    } finally {
      setFetchingAccounts(false);
    }
  }

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    setLoading(true);
    try {
      let payload: any = {};
      if (mode === 'assign') {
        if (!selectedAccountId) {
          setError('Please select a primary account to assign this device');
          setLoading(false);
          return;
        }
        const acc = accounts.find((a) => a.id === selectedAccountId);
        payload = {
          accountId: selectedAccountId,
          assigneeName: acc?.displayName || acc?.email,
          assigneeEmail: acc?.email,
          custodianId: selectedCustodianId || null,
          notes: assignNotes.trim() || null,
        };
      } else {
        payload = {
          isReturn: true,
          targetStatus,
          notes: returnNotes.trim() || null,
        };
      }

      const res = await fetch(`/api/assets/${encodeURIComponent(deviceId)}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update device assignment');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${mode === 'assign' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'} border`}>
              {mode === 'assign' ? <UserCheck className="h-5 w-5" /> : <UserX className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                {mode === 'assign' ? 'Assign Hardware' : 'Return Hardware'}
              </h2>
              <p className="text-xs text-slate-400 font-mono">{assetNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="mt-4 grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setMode('assign')}
            className={`py-1.5 text-xs font-medium rounded-md transition ${
              mode === 'assign'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Assign Account
          </button>
          <button
            type="button"
            onClick={() => setMode('return')}
            className={`py-1.5 text-xs font-medium rounded-md transition ${
              mode === 'return'
                ? 'bg-slate-800 text-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Return to Pool
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {mode === 'assign' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Primary Assignee (PIC 1) <span className="text-rose-400">*</span>
                </label>
                {fetchingAccounts ? (
                  <div className="py-2 text-xs text-slate-400">Loading accounts...</div>
                ) : (
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">-- Select Company Member --</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.displayName || acc.email} {acc.departmentCode ? `(${acc.departmentCode})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Secondary Custodian (PIC 2 - Optional)
                </label>
                <select
                  value={selectedCustodianId}
                  onChange={(e) => setSelectedCustodianId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">-- None --</option>
                  {accounts
                    .filter((a) => a.id !== selectedAccountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.displayName || acc.email}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Assignment Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Deployed for Q1 engineering project"
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </>
          ) : (
            <>
              {currentAssignee?.assigneeName && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1">
                  <div className="text-slate-400">Currently Assigned to:</div>
                  <div className="text-slate-100 font-medium flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>{currentAssignee.assigneeName}</span>
                    {currentAssignee.assigneeEmail && (
                      <span className="text-slate-400 font-mono text-[11px]">
                        ({currentAssignee.assigneeEmail})
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Next Status for Device <span className="text-rose-400">*</span>
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as 'available' | 'reserve')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="available">Available (Ready for immediate redeployment)</option>
                  <option value="reserve">Reserve (Stored in IT inventory / buffer)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Return / Check-in Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Device returned upon team transfer; wiped and checked."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-xs font-medium text-white rounded-lg flex items-center gap-1.5 shadow-sm transition ${
                mode === 'assign'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-amber-600 hover:bg-amber-500'
              } disabled:opacity-50`}
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{mode === 'assign' ? 'Confirm Assignment' : 'Complete Return'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
