// src/app/login/page.tsx
'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, ArrowRight, AlertCircle, Lock } from 'lucide-react';
import { ROLE_OPTIONS } from '@/components/layout/RoleSwitcher';
import { StatusDot } from '@/components/feedback/StatusDot';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get('callbackUrl');
  const callbackUrl = rawCallback ? decodeURIComponent(rawCallback) : '/';

  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRoleLogin = async (role: string) => {
    try {
      setLoadingRole(role);
      setError(null);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Login failed');
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Authentication error');
      setLoadingRole(null);
    }
  };

  const handleGoogleOAuth = () => {
    if (process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === 'true') {
      window.location.href = `/api/auth/google?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    } else {
      setError('Google Workspace OAuth configured for enterprise deployment. Use Quick-Switch below for local testing.');
    }
  };

  return (
    <div className="w-full max-w-xl p-6 sm:p-8 rounded-2xl border border-slate-800 bg-[#0a0f1d] shadow-2xl text-slate-100">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 border border-slate-700/80 mb-3 shadow-inner">
          <Shield className="w-6 h-6 text-emerald-400" />
        </div>
        <div className="flex items-center justify-center gap-2 font-mono text-xs text-emerald-400 mb-1">
          <StatusDot status="active" pulse={true} size="sm" />
          <span>CALM INFRASTRUCTURE COMMAND CENTER</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">
          CORE Authentication
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Company Operations, Resources & Environment
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Production Google OAuth */}
      <div className="mb-6">
        <button
          type="button"
          onClick={handleGoogleOAuth}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-700/80 rounded-xl text-sm font-medium text-slate-200 bg-slate-900/80 hover:bg-slate-800 hover:border-slate-600 transition-all shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
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
          Sign in with Google Workspace
        </button>
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-800" />
        </div>
        <div className="relative flex justify-center text-[10px] uppercase font-mono">
          <span className="bg-[#0a0f1d] px-3 text-slate-500">
            Local Development & Test Quick-Switch (5 Roles)
          </span>
        </div>
      </div>

      {/* 5 Mock Roles Grid */}
      <div className="space-y-2.5">
        {ROLE_OPTIONS.map((opt) => (
          <button
            key={opt.role}
            type="button"
            disabled={loadingRole !== null}
            onClick={() => handleRoleLogin(opt.role)}
            className="w-full text-left p-3 rounded-xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/90 hover:border-slate-700 transition-all flex items-center justify-between group"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 group-hover:text-emerald-400 transition-colors">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-200 group-hover:text-white">
                    {opt.persona}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.2 rounded border uppercase font-medium ${opt.badgeClasses}`}
                  >
                    {opt.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    ({opt.dept})
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {opt.scope}
                </div>
              </div>
            </div>

            <div className="text-slate-500 group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all">
              {loadingRole === opt.role ? (
                <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Footer System Notice */}
      <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
        <span className="flex items-center gap-1.5">
          <Lock size={12} className="text-slate-400" />
          Server-Side RBAC
        </span>
        <span>Callback URL: {callbackUrl}</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[#070b14]">
      <Suspense fallback={<div className="text-xs font-mono text-slate-500">Loading CORE Command Center...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
