// src/components/assets/RotatePinModal.tsx
'use client';

import React, { useState } from 'react';
import { Key, X, Shield, AlertCircle, Loader2 } from 'lucide-react';

interface RotatePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  deviceId: string;
  assetNumber: string;
  currentLoginEmail?: string | null;
}

export default function RotatePinModal({
  isOpen,
  onClose,
  onSuccess,
  deviceId,
  assetNumber,
  currentLoginEmail,
}: RotatePinModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState(currentLoginEmail || '');
  const [pinPlain, setPinPlain] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!pinPlain.trim()) {
      setError('New PIN / Password is required');
      return;
    }
    if (pinPlain !== confirmPin) {
      setError('PIN and confirmation PIN do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/assets/${encodeURIComponent(deviceId)}/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginEmail: loginEmail.trim() || null,
          pinPlain: pinPlain.trim(),
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to rotate credential');
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
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Rotate Device Credential</h2>
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

        <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 flex items-start gap-2">
          <Shield className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Complies with <strong className="text-slate-200">ADR-004</strong>. The secret is immediately encrypted using <strong className="text-slate-200">AES-256-GCM</strong>. Plain text is never stored in database or audit logs.
          </span>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              OS Login Email / Account
            </label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="e.g. leadgeeksindonesia@gmail.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              New PIN / Password <span className="text-rose-400">*</span>
            </label>
            <input
              type="password"
              value={pinPlain}
              onChange={(e) => setPinPlain(e.target.value)}
              required
              placeholder="Enter new PIN or passphrase"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Confirm New PIN <span className="text-rose-400">*</span>
            </label>
            <input
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              required
              placeholder="Re-enter to confirm"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Rotation Reason / Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Scheduled quarterly credential rotation"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

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
              className="px-4 py-2 text-xs font-medium text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg flex items-center gap-1.5 shadow-sm transition"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Encrypt & Rotate</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
