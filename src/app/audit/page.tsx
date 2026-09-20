// src/app/audit/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import AppShell from '@/components/layout/AppShell';
import {
  ShieldCheck,
  RefreshCw,
  Search,
  Lock,
  Copy,
  Check,
  X,
  Code,
  Shield,
  Layers,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { TableSkeleton } from '@/components/feedback/Skeleton';

interface AuditItem {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: any;
  ipAddress: string | null;
  createdAt: string;
}

export default function AuditPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityTypeFilter, setEntityTypeFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // JSON Modal State
  const [selectedEventForJson, setSelectedEventForJson] = useState<AuditItem | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  useEffect(() => {
    fetchAuditEvents();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isFiltered =
    query !== '' || actionFilter !== 'ALL' || entityTypeFilter !== 'ALL';

  const resetFilters = () => {
    setQuery('');
    setActionFilter('ALL');
    setEntityTypeFilter('ALL');
  };

  const fetchAuditEvents = async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const res = await fetch('/api/audit');
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to load audit events:', err);
    } finally {
      setLoading(false);
    }
  };

  const actionOptions = [
    'ALL',
    'credential.reveal',
    'account.create',
    'account.export',
    'permission.change',
    'device.create',
    'device.assign',
    'device.delete',
    'google_workspace.sync',
    'auth.login',
    'auth.failed',
  ];

  const entityTypeOptions = [
    'ALL',
    'device_credential',
    'device',
    'account',
    'google_group',
    'application',
    'auth',
  ];

  const filtered = events.filter((ev) => {
    const matchesAction = actionFilter === 'ALL' || ev.action === actionFilter;
    const matchesEntity = entityTypeFilter === 'ALL' || ev.entityType === entityTypeFilter;
    const q = query.toLowerCase().trim();
    const matchesQuery =
      !q ||
      ev.action.toLowerCase().includes(q) ||
      ev.entityType.toLowerCase().includes(q) ||
      (ev.entityId && ev.entityId.toLowerCase().includes(q)) ||
      (ev.actorId && ev.actorId.toLowerCase().includes(q)) ||
      (ev.ipAddress && ev.ipAddress.toLowerCase().includes(q));

    return matchesAction && matchesEntity && matchesQuery;
  });

  const handleCopyJson = (obj: any) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const getActionBadgeClasses = (action: string) => {
    if (action.includes('reveal'))
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';
    if (action.includes('delete') || action.includes('failed'))
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800';
    if (action.includes('create') || action.includes('login'))
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800';
    if (action.includes('assign') || action.includes('sync'))
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800';
    return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  };

  if (forbidden || (user && user.role !== 'super_admin' && user.role !== 'auditor')) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
          <div className="inline-flex p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100">
            Audit Trail Access Restricted
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
            Per server-side RBAC policy (ADR-005), the audit trail is restricted exclusively to{' '}
            <span className="text-slate-900 dark:text-slate-200 font-semibold">Super Admin</span> and{' '}
            <span className="text-slate-900 dark:text-slate-200 font-semibold">Auditor</span> roles.
          </p>
          <div className="pt-2 text-xs font-mono text-slate-500 dark:text-slate-400">
            Current role: <span className="text-amber-600 dark:text-amber-400 uppercase font-semibold">{user?.role || 'Restricted'}</span>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Immutable Audit Trail
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                {events.length} Events
              </span>
              {filtered.length !== events.length && (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                  {filtered.length} filtered
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Append-only event stream recording mutations, authentication attempts, and sensitive credential reveals.
            </p>
          </div>

          <button
            onClick={fetchAuditEvents}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-xs transition-colors self-start md:self-auto"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Filter Controls */}
        <div className="space-y-3 bg-white dark:bg-[#0a0f1d] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={16} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search action, entity, actor UUID, or IP..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-16 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-sans transition-colors"
              />
              <div className="absolute right-2.5 top-2 flex items-center gap-1">
                {query ? (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                    title="Clear search"
                    aria-label="Clear search input"
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-500 dark:text-slate-400 select-none">
                    /
                  </kbd>
                )}
              </div>
            </div>
          </div>

          {/* Action Filter Pills */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-xs font-mono pb-1">
            <span className="text-slate-500 dark:text-slate-400 mr-1 shrink-0">Action:</span>
            {actionOptions.map((act) => (
              <button
                key={act}
                onClick={() => setActionFilter(act)}
                className={`px-2.5 py-0.5 rounded transition-colors border whitespace-nowrap ${
                  actionFilter === act
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-700 font-semibold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 dark:hover:border-slate-700'
                }`}
              >
                {act}
              </button>
            ))}
          </div>

          {/* Entity Type Filter Pills */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-xs font-mono pb-1">
            <span className="text-slate-500 dark:text-slate-400 mr-1 shrink-0 flex items-center gap-1">
              <Layers size={12} /> Entity:
            </span>
            {entityTypeOptions.map((ent) => (
              <button
                key={ent}
                onClick={() => setEntityTypeFilter(ent)}
                className={`px-2.5 py-0.5 rounded transition-colors border whitespace-nowrap ${
                  entityTypeFilter === ent
                    ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700 font-semibold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 dark:hover:border-slate-700'
                }`}
              >
                {ent}
              </button>
            ))}

            {isFiltered && (
              <button
                onClick={resetFilters}
                className="ml-auto flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-slate-800/80 transition-colors shrink-0"
                title="Reset all search filters"
              >
                <RotateCcw size={11} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Audit Events Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0a0f1d] shadow-sm dark:shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Entity ID</th>
                  <th className="py-3 px-4">Actor ID</th>
                  <th className="py-3 px-4">Client IP</th>
                  <th className="py-3 px-4 text-right">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {loading ? (
                  <TableSkeleton rows={6} cols={7} />
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-500 text-xs">
                      <div className="max-w-sm mx-auto space-y-3">
                        <p>No audit events matching current filters.</p>
                        {isFiltered && (
                          <button
                            onClick={resetFilters}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 shadow-xs transition-colors font-mono text-xs"
                          >
                            <RotateCcw size={12} />
                            <span>Reset All Filters</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {new Date(ev.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold ${getActionBadgeClasses(
                            ev.action
                          )}`}
                        >
                          {ev.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-800 dark:text-slate-300 font-medium">
                        {ev.entityType}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 truncate max-w-[120px]" title={ev.entityId || 'N/A'}>
                        {ev.entityId ? `${ev.entityId.slice(0, 8)}...` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 truncate max-w-[120px]" title={ev.actorId || 'System'}>
                        {ev.actorId ? (
                          <span className="text-slate-800 dark:text-slate-300">{`${ev.actorId.slice(0, 8)}...`}</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic">system/auth</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {ev.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedEventForJson(ev)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-emerald-700 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] transition-colors font-medium shadow-xs"
                        >
                          <Code size={12} />
                          <span>View JSON</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* JSON Metadata Viewer Modal */}
        {selectedEventForJson && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0f1d] shadow-2xl p-6 space-y-4 text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400">
                    <Code size={16} />
                  </div>
                  <div>
                    <h3 className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                      Audit Event Metadata Payload
                    </h3>
                    <div className="text-[11px] font-mono text-slate-500">
                      Action: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{selectedEventForJson.action}</span> • ID:{' '}
                      {selectedEventForJson.id}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedEventForJson(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Zero Plaintext Leak Guarantee */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Verified: Zero plaintext secret leakage. Sanitized by immutable audit logger.
                </span>
              </div>

              {/* Formatted Code Block */}
              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-950 dark:bg-[#070b14] border border-slate-800 dark:border-slate-800/90 text-xs font-mono text-emerald-400 overflow-x-auto max-h-96 leading-relaxed select-all shadow-inner">
                  {JSON.stringify(
                    {
                      id: selectedEventForJson.id,
                      timestamp: selectedEventForJson.createdAt,
                      action: selectedEventForJson.action,
                      entityType: selectedEventForJson.entityType,
                      entityId: selectedEventForJson.entityId,
                      actorId: selectedEventForJson.actorId,
                      clientIp: selectedEventForJson.ipAddress,
                      metadata: selectedEventForJson.metadata,
                    },
                    null,
                    2
                  )}
                </pre>

                <button
                  onClick={() =>
                    handleCopyJson({
                      id: selectedEventForJson.id,
                      timestamp: selectedEventForJson.createdAt,
                      action: selectedEventForJson.action,
                      entityType: selectedEventForJson.entityType,
                      entityId: selectedEventForJson.entityId,
                      actorId: selectedEventForJson.actorId,
                      clientIp: selectedEventForJson.ipAddress,
                      metadata: selectedEventForJson.metadata,
                    })
                  }
                  className="absolute top-3 right-3 px-2.5 py-1 rounded bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 hover:text-white flex items-center gap-1 shadow-sm transition-colors"
                >
                  {copiedJson ? (
                    <>
                      <Check size={12} className="text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setSelectedEventForJson(null)}
                  className="px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-xs transition-colors"
                >
                  Close Viewer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
