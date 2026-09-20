// src/app/software/[id]/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import {
  ArrowLeft,
  Layers,
  Building,
  Tag,
  CreditCard,
  ExternalLink,
  RefreshCw,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { DetailSkeleton } from '@/components/feedback/Skeleton';

export default function SoftwareDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'subscription' | 'department'>('overview');

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/software/${encodeURIComponent(id)}`);
      if (!res.ok) {
        throw new Error(`Failed to load software (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading application detail');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

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

  if (error || !data?.application) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Link
            href="/software"
            className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Back to Software Catalog
          </Link>
          <div className="p-6 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 font-mono text-sm">
            {error || 'Software application not found'}
          </div>
        </div>
      </AppShell>
    );
  }

  const { application } = data;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'subscription', label: 'Subscription & Licensing' },
    { id: 'department', label: 'Department & Ownership' },
  ];

  const getSubBadgeClasses = (type?: string | null) => {
    switch (type?.toLowerCase()) {
      case 'paid':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800';
      case 'freemium':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/70 dark:text-cyan-300 dark:border-cyan-800';
      case 'free':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  };

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs
          items={[
            { label: 'Command Center', href: '/' },
            { label: 'Software & Tools', href: '/software' },
            { label: application.name, current: true },
          ]}
        />

        {/* Resource Header Summary */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0f1d] shadow-sm dark:shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400">
                  <Layers size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-2xl font-bold font-sans text-slate-900 dark:text-slate-100">
                      {application.name}
                    </h1>
                    <StatusBadge status={application.status} size="sm" />
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded border capitalize ${getSubBadgeClasses(
                        application.subscriptionType
                      )}`}
                    >
                      {application.subscriptionType || 'Free'} Tier
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                    Category: {application.category || 'General'} • Dept: {application.departmentName} ({application.departmentCode})
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {application.websiteUrl && (
                <a
                  href={application.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-xs transition-colors"
                >
                  <Globe size={13} />
                  <span>Visit Website</span>
                  <ExternalLink size={12} className="text-slate-400" />
                </a>
              )}
              <button
                onClick={fetchDetail}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-xs transition-colors"
              >
                <RefreshCw size={13} />
                Refresh
              </button>
            </div>
          </div>

          {application.description && (
            <p className="pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
              {application.description}
            </p>
          )}
        </div>

        {/* Tab Navigation */}
        <div role="tablist" aria-label="Software details tabs" className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-px">
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
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50/50 dark:bg-slate-900/40'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview" className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0f1d] shadow-sm dark:shadow-none space-y-4">
              <h3 className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
                Application Profile
              </h3>
              <dl className="space-y-3 text-xs font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <dt className="text-slate-500 dark:text-slate-400">Official Name</dt>
                  <dd className="text-slate-800 dark:text-slate-200 font-medium">{application.name}</dd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <dt className="text-slate-500 dark:text-slate-400">Operational Category</dt>
                  <dd className="text-slate-700 dark:text-slate-300 capitalize">{application.category || 'General'}</dd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <dt className="text-slate-500 dark:text-slate-400">Lifecycle Status</dt>
                  <dd className="text-emerald-600 dark:text-emerald-400 font-medium capitalize">{application.status}</dd>
                </div>
                <div className="flex justify-between py-1.5">
                  <dt className="text-slate-500 dark:text-slate-400">Unique Resource ID</dt>
                  <dd className="text-slate-500 dark:text-slate-400 text-[11px] select-all">{application.id}</dd>
                </div>
              </dl>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0f1d] shadow-sm dark:shadow-none space-y-4">
              <h3 className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
                Connectivity & Access
              </h3>
              <dl className="space-y-3 text-xs font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <dt className="text-slate-500 dark:text-slate-400">Application Website</dt>
                  <dd className="text-slate-700 dark:text-slate-300 truncate max-w-[240px]">
                    {application.websiteUrl || 'Not specified'}
                  </dd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <dt className="text-slate-500 dark:text-slate-400">Authorization Model</dt>
                  <dd className="text-slate-700 dark:text-slate-300">Department / Role-gated</dd>
                </div>
                <div className="flex justify-between py-1.5">
                  <dt className="text-slate-500 dark:text-slate-400">SSO / OAuth Integration</dt>
                  <dd className="text-emerald-600 dark:text-emerald-400 font-medium">Google Workspace OIDC</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* Tab 2: Subscription & Licensing */}
        {activeTab === 'subscription' && (
          <div role="tabpanel" id="panel-subscription" aria-labelledby="tab-subscription" className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0f1d] shadow-sm dark:shadow-none space-y-5">
            <h3 className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
              Subscription Model & Cost Center
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-1.5">
                <div className="text-slate-500 dark:text-slate-400 text-[11px] uppercase">Plan Tier</div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100 capitalize">
                  {application.subscriptionType || 'Free'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {application.subscriptionType === 'paid'
                    ? 'Recurring commercial license'
                    : application.subscriptionType === 'freemium'
                    ? 'Tiered freemium utility'
                    : 'Zero-cost software plan'}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-1.5">
                <div className="text-slate-500 dark:text-slate-400 text-[11px] uppercase">Cost Allocation</div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {application.departmentCode || 'GNR'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Allocated to {application.departmentName || 'General'}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-1.5">
                <div className="text-slate-500 dark:text-slate-400 text-[11px] uppercase">Compliance State</div>
                <div className="text-base font-semibold text-emerald-600 dark:text-emerald-400">Active Approved</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Authorized in company software inventory</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Department & Ownership */}
        {activeTab === 'department' && (
          <div role="tabpanel" id="panel-department" aria-labelledby="tab-department" className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0f1d] shadow-sm dark:shadow-none space-y-5">
            <h3 className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
              Departmental Ownership
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-mono">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Department Name</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{application.departmentName}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500 dark:text-slate-400">Department Code</span>
                  <span className="text-slate-700 dark:text-slate-300 font-bold">{application.departmentCode}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Primary Administrator</span>
                  <span className="text-slate-700 dark:text-slate-300">Software Admin (GRW)</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500 dark:text-slate-400">Security Review</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Approved</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
