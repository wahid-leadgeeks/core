// src/app/accounts/[id]/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import {
  ArrowLeft,
  Mail,
  Building,
  Shield,
  Laptop,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { DetailSkeleton } from '@/components/feedback/Skeleton';

export default function AccountDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'groups' | 'devices' | 'history'>('overview');
  const [copiedEmail, setCopiedEmail] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounts/${encodeURIComponent(id)}`);
      if (!res.ok) {
        throw new Error(`Failed to load account (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error fetching account');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, currentId: string) => {
    const tabIds = tabs.map((t) => t.id);
    const currentIndex = tabIds.indexOf(currentId);
    let nextIndex = currentIndex;

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabIds.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabIds.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    const nextTabId = tabIds[nextIndex] as any;
    setActiveTab(nextTabId);
    const nextButton = document.getElementById(`tab-${nextTabId}`);
    nextButton?.focus();
  };

  if (loading) {
    return (
      <AppShell>
        <DetailSkeleton />
      </AppShell>
    );
  }

  if (error || !data?.account) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Link
            href="/accounts"
            className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft size={14} /> Back to Accounts
          </Link>
          <div className="p-6 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 font-mono text-sm">
            {error || 'Account not found'}
          </div>
        </div>
      </AppShell>
    );
  }

  const { account, groups = [], devices = [], history = [] } = data;

  const tabs = [
    { id: 'overview', label: 'Overview', count: null },
    { id: 'groups', label: 'Google Groups', count: groups.length },
    { id: 'devices', label: 'Hardware & Devices', count: devices.length },
    { id: 'history', label: 'Audit History', count: history.length },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs
          items={[
            { label: 'Command Center', href: '/' },
            { label: 'Identity & Accounts', href: '/accounts' },
            { label: account.fullName, current: true },
          ]}
        />

        {/* Resource Header Summary (per DESIGN.md Resource Page Pattern) */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0f1d] shadow-sm dark:shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold font-sans text-slate-900 dark:text-slate-100">
                  {account.fullName}
                </h1>
                <span className="font-mono text-sm text-slate-500 dark:text-slate-400">
                  (@{account.displayName})
                </span>
                <StatusBadge status={account.status} size="sm" />
                <span className="px-2 py-0.5 rounded text-xs font-mono uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
                  {account.accountType}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Mail size={13} className="text-slate-400" />
                  <span className="text-slate-800 dark:text-slate-200">{account.email}</span>
                  <button
                    onClick={() => copyToClipboard(account.email)}
                    className="p-1 hover:text-slate-900 dark:hover:text-white transition-colors"
                    title="Copy Email"
                  >
                    {copiedEmail ? <Check size={12} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>

                {account.previousEmail && (
                  <span className="text-slate-400">
                    Legacy: {account.previousEmail}
                  </span>
                )}

                <div className="flex items-center gap-1.5">
                  <Building size={13} className="text-slate-400" />
                  <span>{account.departmentName} ({account.departmentCode})</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Shield size={13} className="text-slate-400" />
                  <span>{account.roleName} (Level {account.roleLevel})</span>
                </div>
              </div>
            </div>

            <button
              onClick={fetchDetail}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors self-start shadow-sm"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>

          {account.notes && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-600 dark:text-slate-400 font-sans">
              <span className="font-mono text-slate-400 uppercase mr-2 font-medium">Notes:</span>
              {account.notes}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div role="tablist" aria-label="Account details tabs" className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id as any)}
              onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50/50 dark:bg-slate-900/40'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview" className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0f1d] space-y-4 shadow-sm">
              <h3 className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Identity Profile
              </h3>
              <dl className="space-y-3 text-xs font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <dt className="text-slate-400 dark:text-slate-500">Account ID</dt>
                  <dd className="text-slate-700 dark:text-slate-300 font-mono text-[11px] select-all">{account.id}</dd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <dt className="text-slate-400 dark:text-slate-500">Full Legal Name</dt>
                  <dd className="text-slate-900 dark:text-slate-200 font-sans font-medium">{account.fullName}</dd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <dt className="text-slate-400 dark:text-slate-500">Display Handle</dt>
                  <dd className="text-slate-800 dark:text-slate-300 font-medium">@{account.displayName}</dd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <dt className="text-slate-400 dark:text-slate-500">Account Status</dt>
                  <dd className="text-emerald-600 dark:text-emerald-400 capitalize font-medium">{account.status}</dd>
                </div>
                <div className="flex justify-between py-1.5">
                  <dt className="text-slate-400 dark:text-slate-500">Account Type</dt>
                  <dd className="text-slate-700 dark:text-slate-300 capitalize">{account.accountType}</dd>
                </div>
              </dl>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0f1d] space-y-4 shadow-sm">
              <h3 className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Department & Domains
              </h3>
              <dl className="space-y-3 text-xs font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <dt className="text-slate-400 dark:text-slate-500">Department</dt>
                  <dd className="text-slate-800 dark:text-slate-200">{account.departmentName} ({account.departmentCode})</dd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <dt className="text-slate-400 dark:text-slate-500">Hierarchical Role</dt>
                  <dd className="text-slate-800 dark:text-slate-200">{account.roleName} (Level {account.roleLevel})</dd>
                </div>
                <div className="py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <dt className="text-slate-400 dark:text-slate-500 mb-2">Corporate Domains</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {account.domains?.map((dom: string) => (
                      <span
                        key={dom}
                        className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium"
                      >
                        {dom}
                      </span>
                    ))}
                  </dd>
                </div>
                <div className="flex justify-between py-1.5">
                  <dt className="text-slate-400 dark:text-slate-500">Created At</dt>
                  <dd className="text-slate-600 dark:text-slate-400">{new Date(account.createdAt).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* Tab 2: Google Groups */}
        {activeTab === 'groups' && (
          <div role="tabpanel" id="panel-groups" aria-labelledby="tab-groups" className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0a0f1d] shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200">
                  Google Groups Memberships ({groups.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Distribution lists, calendar access clusters, and department group associations.
                </p>
              </div>
              <Link
                href="/groups/matrix"
                className="text-xs font-mono text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline font-medium"
              >
                Open Matrix View →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase">
                  <tr>
                    <th className="py-3 px-4">Group Name</th>
                    <th className="py-3 px-4">Group Email</th>
                    <th className="py-3 px-4">Role in Group</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Sync Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                  {groups.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400 font-mono text-xs">
                        This account is not a member of any Google Groups.
                      </td>
                    </tr>
                  ) : (
                    groups.map((grp: any) => (
                      <tr key={grp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {grp.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {grp.email}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 capitalize font-medium">
                            {grp.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {grp.source}
                        </td>
                        <td className="py-3 px-4 font-mono text-amber-600 dark:text-amber-400 font-medium">
                          Pending
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/groups/${grp.id}`}
                            className="text-emerald-600 dark:text-emerald-400 hover:underline font-mono text-xs font-medium"
                          >
                            View Group →
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Assigned Devices */}
        {activeTab === 'devices' && (
          <div role="tabpanel" id="panel-devices" aria-labelledby="tab-devices" className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0a0f1d] shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200">
                Assigned Company Hardware Laptops ({devices.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Physical IT assets currently checked out or assigned to this user from device inventory.
              </p>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {devices.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 font-mono text-xs">
                  No company hardware devices assigned to this account.
                </div>
              ) : (
                devices.map((dev: any) => (
                  <div
                    key={dev.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#070b14] space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-cyan-600 dark:text-cyan-400">
                          <Laptop size={18} />
                        </div>
                        <div>
                          <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-sm">
                            {dev.assetNumber}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                            {dev.brand} {dev.model}
                          </div>
                        </div>
                      </div>

                      <StatusBadge status={dev.status} size="sm" />
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/60 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-400 block">CPU</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate block">{dev.processor || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">RAM</span>
                        <span className="text-slate-700 dark:text-slate-300 block">{dev.ram || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Storage</span>
                        <span className="text-slate-700 dark:text-slate-300 block">{dev.storage || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500 dark:text-slate-400">
                        Host: {dev.computerName || 'N/A'}
                      </span>
                      <Link
                        href={`/assets/${dev.assetNumber || dev.id}`}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        Inspect in Assets →
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 4: History */}
        {activeTab === 'history' && (
          <div role="tabpanel" id="panel-history" aria-labelledby="tab-history" className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0a0f1d] shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200">
                Audit Trail & History ({history.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                Immutable security and lifecycle audit log events recorded for this account.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-slate-500 font-mono text-xs">
                        No audit events recorded for this account.
                      </td>
                    </tr>
                  ) : (
                    history.map((ev: any) => (
                      <tr key={ev.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">
                          {new Date(ev.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                          {ev.action}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                          {ev.entityType}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">
                          {ev.ipAddress || 'internal'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
