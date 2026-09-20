// src/components/assets/ProvisionDeviceModal.tsx
'use client';

import React, { useState } from 'react';
import { Laptop, X, Shield, Cpu, Key, AlertCircle, Loader2 } from 'lucide-react';

interface ProvisionDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProvisionDeviceModal({
  isOpen,
  onClose,
  onSuccess,
}: ProvisionDeviceModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [assetNumber, setAssetNumber] = useState('');
  const [brand, setBrand] = useState('LENOVO');
  const [model, setModel] = useState('');
  const [computerName, setComputerName] = useState('');
  const [status, setStatus] = useState<'available' | 'reserve'>('available');
  const [purchasedAt, setPurchasedAt] = useState('');
  const [hasAntivirus, setHasAntivirus] = useState(true);
  const [notes, setNotes] = useState('');

  // Specifications
  const [processor, setProcessor] = useState('');
  const [ram, setRam] = useState('16 GB');
  const [storage, setStorage] = useState('SSD 512 GB');

  // Credential
  const [loginEmail, setLoginEmail] = useState('');
  const [pinPlain, setPinPlain] = useState('');

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!assetNumber.trim()) {
      setError('Asset Tag number is required.');
      return;
    }
    if (!model.trim()) {
      setError('Device model is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        assetNumber: assetNumber.trim().toUpperCase(),
        brand: brand.trim() || null,
        model: model.trim(),
        computerName: computerName.trim() || null,
        status,
        purchasedAt: purchasedAt || null,
        hasAntivirus,
        notes: notes.trim() || null,
        specifications: {
          processor: processor.trim() || null,
          ram: ram.trim() || null,
          storage: storage.trim() || null,
        },
        credential: (loginEmail.trim() || pinPlain.trim()) ? {
          loginEmail: loginEmail.trim() || null,
          pinPlain: pinPlain.trim() || null,
        } : null,
      };

      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to provision device');
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-xl w-full p-6 shadow-2xl my-8 text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
              <Laptop className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Provision Hardware Asset</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Onboard a new laptop into active infrastructure inventory</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Identity Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Asset Tag <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. LGI-CD-2026-032"
                value={assetNumber}
                onChange={(e) => setAssetNumber(e.target.value)}
                required
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Brand</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="LENOVO">LENOVO</option>
                <option value="MSI">MSI</option>
                <option value="ASUS">ASUS</option>
                <option value="APPLE">APPLE</option>
                <option value="DELL">DELL</option>
                <option value="HP">HP</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Model Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. IdeaPad Slim 3 14AMN8"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Computer / Hostname</label>
              <input
                type="text"
                placeholder="e.g. LeadGeeks-032"
                value={computerName}
                onChange={(e) => setComputerName(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'available' | 'reserve')}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="available">Available (Ready to deploy)</option>
                <option value="reserve">Reserve (Buffer / backup inventory)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Purchase Date</label>
              <input
                type="date"
                value={purchasedAt}
                onChange={(e) => setPurchasedAt(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={hasAntivirus}
                  onChange={(e) => setHasAntivirus(e.target.checked)}
                  className="rounded bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-emerald-600 focus:ring-0 focus:ring-offset-0"
                />
                <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Endpoint Antivirus Configured</span>
              </label>
            </div>
          </div>

          {/* Specifications Group */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-lg space-y-3">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
              <span>Hardware Specifications</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <input
                  type="text"
                  placeholder="Processor (e.g. Ryzen 5)"
                  value={processor}
                  onChange={(e) => setProcessor(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="RAM (e.g. 16 GB)"
                  value={ram}
                  onChange={(e) => setRam(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Storage (e.g. SSD 512 GB)"
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Optional Credential Group */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-lg space-y-3">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                <span>OS Login Credential (Optional - AES-256 Encrypted)</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <input
                  type="email"
                  placeholder="Login Email / Account"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Initial PIN / Password"
                  value={pinPlain}
                  onChange={(e) => setPinPlain(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Administrative Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Purchased with 3-year warranty from official distributor."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
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
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg flex items-center gap-1.5 shadow-sm transition"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Provision Device</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
