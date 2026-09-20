// src/components/assets/EditDeviceModal.tsx
'use client';

import React, { useState } from 'react';
import { Edit3, X, Cpu, Shield, AlertCircle, Loader2 } from 'lucide-react';

interface EditDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  device: {
    id: string;
    assetNumber: string;
    brand: string | null;
    model: string;
    computerName: string | null;
    status: string;
    purchasedAt: string | null;
    hasAntivirus: boolean;
    notes: string | null;
    specifications?: {
      processor: string | null;
      ram: string | null;
      storage: string | null;
    } | null;
  };
}

export default function EditDeviceModal({
  isOpen,
  onClose,
  onSuccess,
  device,
}: EditDeviceModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [brand, setBrand] = useState(device.brand || 'LENOVO');
  const [model, setModel] = useState(device.model || '');
  const [computerName, setComputerName] = useState(device.computerName || '');
  const [purchasedAt, setPurchasedAt] = useState(device.purchasedAt || '');
  const [hasAntivirus, setHasAntivirus] = useState(Boolean(device.hasAntivirus));
  const [notes, setNotes] = useState(device.notes || '');

  // Specifications
  const [processor, setProcessor] = useState(device.specifications?.processor || '');
  const [ram, setRam] = useState(device.specifications?.ram || '');
  const [storage, setStorage] = useState(device.specifications?.storage || '');

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!model.trim()) {
      setError('Model name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        brand: brand.trim() || null,
        model: model.trim(),
        computerName: computerName.trim() || null,
        purchasedAt: purchasedAt || null,
        hasAntivirus,
        notes: notes.trim() || null,
        specifications: {
          processor: processor.trim() || null,
          ram: ram.trim() || null,
          storage: storage.trim() || null,
        },
      };

      const res = await fetch(`/api/assets/${encodeURIComponent(device.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update device');
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
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Edit Asset Details</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{device.assetNumber}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Brand</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Model Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Computer / Hostname</label>
              <input
                type="text"
                value={computerName}
                onChange={(e) => setComputerName(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Purchase Date</label>
              <input
                type="date"
                value={purchasedAt}
                onChange={(e) => setPurchasedAt(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2 flex items-center pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={hasAntivirus}
                  onChange={(e) => setHasAntivirus(e.target.checked)}
                  className="rounded bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-blue-500 focus:ring-0"
                />
                <Shield className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                <span>Endpoint Antivirus Configured</span>
              </label>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-lg space-y-3">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
              <span>Hardware Specifications</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <input
                  type="text"
                  placeholder="Processor"
                  value={processor}
                  onChange={(e) => setProcessor(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="RAM"
                  value={ram}
                  onChange={(e) => setRam(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Storage"
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Administrative Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg flex items-center gap-1.5 shadow-sm transition"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
