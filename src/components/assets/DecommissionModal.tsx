// src/components/assets/DecommissionModal.tsx
'use client';

import React, { useState } from 'react';
import { AlertTriangle, X, Archive, AlertCircle, Loader2 } from 'lucide-react';

interface DecommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  deviceId: string;
  assetNumber: string;
}

export default function DecommissionModal({
  isOpen,
  onClose,
  onSuccess,
  deviceId,
  assetNumber,
}: DecommissionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmTag, setConfirmTag] = useState('');
  const [reason, setReason] = useState('End of Hardware Support');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const isConfirmed = confirmTag.trim().toUpperCase() === assetNumber.toUpperCase();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isConfirmed) {
      setError(`Please type "${assetNumber}" exactly to confirm.`);
      return;
    }
    if (!reason.trim()) {
      setError('A decommission reason is mandatory.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/assets/${encodeURIComponent(deviceId)}/decommission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmTag: confirmTag.trim(),
          reason: reason.trim(),
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to decommission device');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-xl max-w-md w-full p-6 shadow-2xl my-8 text-slate-900 dark:text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Decommission Device</h2>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-mono">Retire asset {assetNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50 rounded-lg text-xs text-rose-800 dark:text-rose-200/90 leading-relaxed">
          Decommissioning moves this device out of active inventory. Any active employee assignments will be closed and an immutable audit event will be recorded.
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Decommission Reason <span className="text-rose-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value="End of Hardware Support">End of Hardware Support / Obsolescence</option>
              <option value="Damaged Beyond Repair">Damaged Beyond Repair / Motherboard Failure</option>
              <option value="Sold / Liquidated">Sold / Asset Liquidation</option>
              <option value="Lost / Stolen">Lost or Stolen</option>
              <option value="Recycled for Parts">Recycled for Parts</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Additional Context</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Asset inspected and certified ready for hardware disposal"
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Confirm Asset Tag: type <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">{assetNumber}</span> to confirm
            </label>
            <input
              type="text"
              value={confirmTag}
              onChange={(e) => setConfirmTag(e.target.value)}
              placeholder={assetNumber}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isConfirmed}
              className="px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center gap-1.5 shadow-sm transition"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Archive className="h-3.5 w-3.5" />
              <span>Confirm Decommission</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
