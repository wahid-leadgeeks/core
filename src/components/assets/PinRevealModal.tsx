// src/components/assets/PinRevealModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Key, Copy, Check, EyeOff, AlertTriangle, Clock, X } from 'lucide-react';

interface PinRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: string;
  assetNumber: string;
  userRole?: string;
}

export default function PinRevealModal({
  isOpen,
  onClose,
  assetId,
  assetNumber,
  userRole,
}: PinRevealModalProps) {
  const [loading, setLoading] = useState(false);
  const [revealedPin, setRevealedPin] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(30);

  const isAuthorized = userRole === 'super_admin' || userRole === 'it_admin';

  useEffect(() => {
    if (!isOpen) {
      setRevealedPin(null);
      setLoginEmail(null);
      setErrorMessage(null);
      setCopied(false);
      setSecondsRemaining(30);
    }
  }, [isOpen]);

  // Auto-mask countdown timer: decrements cleanly without side-effects
  useEffect(() => {
    if (!revealedPin) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [revealedPin]);

  // Handle auto-close on timer expiration
  useEffect(() => {
    if (revealedPin && secondsRemaining === 0) {
      setRevealedPin(null);
      onClose();
    }
  }, [revealedPin, secondsRemaining, onClose]);

  if (!isOpen) return null;

  const handleReveal = async () => {
    if (!isAuthorized) {
      setErrorMessage(
        'Access denied: Credential reveal requires Super Admin or IT Admin privileges (ADR-004).'
      );
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/assets/${encodeURIComponent(assetId)}/credentials/reveal`, {
        method: 'POST',
      });

      if (!res.ok) {
        const err = await res.json();
        setErrorMessage(err.message || 'Failed to reveal credentials');
        return;
      }

      const data = await res.json();
      setSecondsRemaining(30);
      setRevealedPin(data.pin || '(No PIN set)');
      setLoginEmail(data.loginEmail || null);
    } catch {
      setErrorMessage('Network or server error during credential decryption.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!revealedPin) return;
    await navigator.clipboard.writeText(revealedPin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0f1d] p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100">
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-600 dark:text-amber-400">
              <Key size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Secure PIN Reveal
              </h2>
              <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 tracking-wider">
                {assetNumber}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Audit Warning */}
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-medium">
            <AlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Sensitive Operation (ADR-004)</span>
          </div>
          <p className="text-[11px] text-amber-700/90 dark:text-amber-400/80 leading-relaxed pl-5">
            Decrypting credentials triggers an immutable <span className="font-mono font-semibold">credential.reveal</span> event with your identity and IP address.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert size={14} className="shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Revealed Credentials State */}
        {revealedPin ? (
          <div className="space-y-4">
            {loginEmail && (
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Login Account
                </span>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-300">
                  {loginEmail}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Decrypted PIN Password
                </span>
                <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                  <Clock size={11} /> Auto-mask in {secondsRemaining}s
                </span>
              </div>
              <div className="relative flex items-center">
                <div className="w-full p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400 font-mono text-xl font-bold tracking-widest text-center select-all">
                  {revealedPin}
                </div>
                <button
                  onClick={handleCopy}
                  className="absolute right-3 px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Countdown Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-900 h-1 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-1000 ease-linear"
                style={{ width: `${(secondsRemaining / 30) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="py-4 text-center space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The device credentials are encrypted at rest with AES-256-GCM.
            </p>
            {!isAuthorized && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-mono">
                Your role does not have authorization to decrypt secrets.
              </p>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/80">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            Close
          </button>
          {!revealedPin ? (
            <button
              onClick={handleReveal}
              disabled={loading || !isAuthorized}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white font-semibold text-xs font-mono transition-colors shadow-sm flex items-center gap-2"
            >
              {loading ? 'Decrypting AES-256...' : 'Decrypt & Reveal PIN'}
            </button>
          ) : (
            <button
              onClick={() => {
                setRevealedPin(null);
                onClose();
              }}
              className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-mono transition-colors flex items-center gap-1.5"
            >
              <EyeOff size={13} />
              Mask Secret
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
