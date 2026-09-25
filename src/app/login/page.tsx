// src/app/login/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Shield,
  ArrowRight,
  AlertCircle,
  FileSpreadsheet,
  Laptop,
  Users,
  Layers,
  Lock,
  ExternalLink,
  ChevronDown,
  Terminal,
} from 'lucide-react';
import { StatusDot } from '@/components/feedback/StatusDot';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get('callbackUrl');
  const callbackUrl = rawCallback ? decodeURIComponent(rawCallback) : '/';
  const urlError = searchParams.get('error');

  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOfflineFallback, setShowOfflineFallback] = useState(false);

  useEffect(() => {
    if (urlError) {
      if (urlError === 'access_denied') {
        setError('Google sign-in was cancelled or access was denied.');
      } else if (urlError === 'token_exchange_failed') {
        setError('Authentication token exchange failed. Please try signing in again.');
      } else if (urlError === 'profile_fetch_failed') {
        setError('Could not retrieve your Google user profile. Verify your internet connection.');
      } else {
        setError(`Authentication notice: ${urlError}`);
      }
    }
  }, [urlError]);

  const handleGoogleOAuth = () => {
    setLoadingGoogle(true);
    setError(null);
    window.location.href = `/api/auth/google?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };

  const handleOfflineDirectLogin = async () => {
    try {
      setOfflineLoading(true);
      setError(null);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'super_admin' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Direct sign-in failed');
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Authentication error');
      setOfflineLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-[#0c1222] border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-xl dark:shadow-2xl overflow-hidden transition-all duration-200">
      {/* Top telemetry accent stripe */}
      <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

      <div className="p-6 sm:p-8">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-4 shadow-inner ring-1 ring-slate-900/5 dark:ring-white/5">
            <Shield className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] mb-2 font-medium">
            <StatusDot status="active" pulse={true} size="sm" />
            <span>OPERATIONAL INFRASTRUCTURE</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans">
            CORE Platform
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            Company Operations, Resources & Environment
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-sans">{error}</div>
          </div>
        )}

        {/* Primary Action: Google Workspace Sign-In */}
        <div className="space-y-4">
          <button
            type="button"
            disabled={loadingGoogle}
            onClick={handleGoogleOAuth}
            className="w-full relative group flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-850 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 transition-all shadow-sm hover:shadow"
          >
            {loadingGoogle ? (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <div className="w-4 h-4 border-2 border-emerald-600 dark:border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <span>Connecting to Google...</span>
              </div>
            ) : (
              <>
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google Workspace</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all ml-auto" />
              </>
            )}
          </button>

          <p className="text-center text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Sign in with your <span className="font-semibold text-slate-700 dark:text-slate-300">@leadgeeksinc.com</span> account
          </p>
        </div>

        {/* Synced Resources Overview */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
            Synchronized Modules
          </div>

          <div className="grid grid-cols-2 gap-2 text-left">
            <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">
                Google Sheets
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
              <div className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">
                Hardware Vault
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">
                Accounts & Groups
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              <div className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">
                Software Tools
              </div>
            </div>
          </div>
        </div>

        {/* Offline / Developer Direct Access (Collapsible) */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60">
          <button
            type="button"
            onClick={() => setShowOfflineFallback(!showOfflineFallback)}
            className="w-full flex items-center justify-between text-[11px] font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Terminal size={12} />
              <span>Offline / Direct Access</span>
            </span>
            <ChevronDown
              size={12}
              className={`transform transition-transform ${showOfflineFallback ? 'rotate-180' : ''}`}
            />
          </button>

          {showOfflineFallback && (
            <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 animate-in fade-in duration-150">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5 leading-relaxed font-sans">
                Direct entry bypasses external OAuth for local testing or network troubleshooting.
              </p>
              <button
                type="button"
                disabled={offlineLoading}
                onClick={handleOfflineDirectLogin}
                className="w-full py-2 px-3 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                {offlineLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Enter Directly</span>
                    <ArrowRight size={12} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Security Notice */}
      <div className="px-6 py-3.5 bg-slate-50/80 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
        <span className="flex items-center gap-1.5">
          <Lock size={12} className="text-slate-400" />
          OAuth 2.0 Encrypted
        </span>
        <span className="truncate max-w-[180px]">LeadGeeks Inc.</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-[#070b14] relative transition-colors duration-150">
      {/* Top utility row */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      {/* Main card */}
      <Suspense fallback={<div className="text-xs font-mono text-slate-500">Initializing CORE...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
