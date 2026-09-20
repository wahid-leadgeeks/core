// src/app/assets/[id]/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import {
  ArrowLeft,
  Laptop,
  Cpu,
  HardDrive,
  User,
  Shield,
  Key,
  RefreshCw,
  Copy,
  Check,
  Building,
  Edit3,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { DetailSkeleton } from '@/components/feedback/Skeleton';
import PinRevealModal from '@/components/assets/PinRevealModal';
import EditDeviceModal from '@/components/assets/EditDeviceModal';
import AssignDeviceModal from '@/components/assets/AssignDeviceModal';
import RotatePinModal from '@/components/assets/RotatePinModal';
import DecommissionModal from '@/components/assets/DecommissionModal';

export default function AssetDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { user } = useAuth();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'assignment' | 'access' | 'history'>('overview');
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [rotatePinModalOpen, setRotatePinModalOpen] = useState(false);
  const [decommissionModalOpen, setDecommissionModalOpen] = useState(false);
  const [copiedAsset, setCopiedAsset] = useState(false);
  const [copiedHost, setCopiedHost] = useState(false);
  const [copiedAssignee, setCopiedAssignee] = useState(false);

  const copyText = (text: string, type: 'asset' | 'host' | 'assignee') => {
    navigator.clipboard.writeText(text);
    if (type === 'asset') {
      setCopiedAsset(true);
      setTimeout(() => setCopiedAsset(false), 2000);
    } else if (type === 'host') {
      setCopiedHost(true);
      setTimeout(() => setCopiedHost(false), 2000);
    } else {
      setCopiedAssignee(true);
      setTimeout(() => setCopiedAssignee(false), 2000);
    }
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

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${encodeURIComponent(id)}`);
      if (!res.ok) {
        throw new Error(`Failed to load device (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading device detail');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <AppShell>
        <DetailSkeleton />
      </AppShell>
    );
  }

  if (error || !data?.device) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Link
            href="/assets"
            className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft size={14} /> Back to Assets Catalog
          </Link>
          <div className="p-6 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 font-mono text-sm">
            {error || 'Hardware device not found'}
          </div>
        </div>
      </AppShell>
    );
  }

  const { device, specifications, assignment, credential, auditHistory = [] } = data;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'specs', label: 'Specifications' },
    { id: 'assignment', label: 'Assignment & Custody' },
    { id: 'access', label: 'Credentials & Access' },
    { id: 'history', label: 'Audit History', count: auditHistory.length },
  ];

  const canRevealPin = user?.role === 'super_admin' || user?.role === 'it_admin';
  const canUpdate = user?.role === 'super_admin' || user?.role === 'it_admin' || user?.role === 'asset_admin';
  const canAssign = user?.role === 'super_admin' || user?.role === 'it_admin' || user?.role === 'asset_admin';
  const canRotatePin = user?.role === 'super_admin' || user?.role === 'it_admin' || user?.role === 'asset_admin';
  const canDecommission = user?.role === 'super_admin' || user?.role === 'it_admin';

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs
          items={[
            { label: 'Command Center', href: '/' },
            { label: 'Hardware Devices', href: '/assets' },
            { label: device.assetNumber, current: true },
          ]}
        />

        {/* Resource Header Summary */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0f1d] shadow-sm dark:shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-cyan-600 dark:text-cyan-400">
                  <Laptop size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                      {device.assetNumber}
                    </h1>
                    <button
                      onClick={() => copyText(device.assetNumber, 'asset')}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                      title="Copy Asset Tag"
                      aria-label="Copy Asset Tag"
                    >
                      {copiedAsset ? <Check size={13} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={13} />}
                    </button>
                    <StatusBadge status={device.status} size="sm" />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span>{device.brand} {device.model}</span>
                    <span>•</span>
                    <span className="font-mono">Host: {device.computerName || 'Not configured'}</span>
                    {device.computerName && (
                      <button
                        onClick={() => copyText(device.computerName, 'host')}
                        className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors inline-flex items-center"
                        title="Copy Hostname"
                        aria-label="Copy Hostname"
                      >
                        {copiedHost ? <Check size={11} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={11} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400 pt-1 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <User size={13} className="text-slate-400" />
                  <span className="text-slate-800 dark:text-slate-200">PIC: {assignment?.assigneeName || 'Unassigned'}</span>
                  {assignment?.assigneeEmail && (
                    <button
                      onClick={() => copyText(assignment.assigneeEmail, 'assignee')}
                      className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors inline-flex items-center"
                      title={`Copy email: ${assignment.assigneeEmail}`}
                      aria-label="Copy Assignee Email"
                    >
                      {copiedAssignee ? <Check size={11} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={11} />}
                    </button>
                  )}
                </div>
                {assignment?.departmentName && (
                  <div className="flex items-center gap-1.5">
                    <Building size={13} className="text-slate-400" />
                    <span>{assignment.departmentName} ({assignment.departmentCode})</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Shield size={13} className={device.hasAntivirus ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'} />
                  <span>{device.hasAntivirus ? 'Antivirus Active' : 'No Antivirus'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {canUpdate && (
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                >
                  <Edit3 size={13} className="text-blue-500 dark:text-blue-400" />
                  <span>Edit Specs</span>
                </button>
              )}

              {canAssign && (
                <button
                  onClick={() => setAssignModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                >
                  <UserCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
                  <span>{assignment?.assigneeName ? 'Reassign / Return' : 'Assign Custody'}</span>
                </button>
              )}

              {canRotatePin && (
                <button
                  onClick={() => setRotatePinModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                >
                  <Key size={13} className="text-amber-500 dark:text-amber-400" />
                  <span>Rotate PIN</span>
                </button>
              )}

              {canDecommission && device.status !== 'decommissioned' && (
                <button
                  onClick={() => setDecommissionModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors shadow-sm"
                >
                  <AlertTriangle size={13} className="text-rose-600 dark:text-rose-400" />
                  <span>Decommission</span>
                </button>
              )}

              <button
                onClick={() => setPinModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/80 dark:border-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors text-xs font-mono font-medium shadow-sm"
                title={canRevealPin ? 'Reveal Encrypted PIN' : 'Restricted to Super Admin & IT Admin'}
              >
                <Key size={13} /> Reveal Credentials
              </button>
              <button
                onClick={fetchDetail}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm"
              >
                <RefreshCw size={13} />
                Refresh
              </button>
            </div>
          </div>

          {device.notes && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-600 dark:text-slate-400 font-sans">
              <span className="font-mono text-slate-400 uppercase mr-2 font-medium">Notes:</span>
              {device.notes}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div role="tablist" aria-label="Device details tabs" className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-px overflow-x-auto">
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
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono transition-colors border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50/50 dark:bg-slate-900/40'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
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
                Hardware Identification
              </h3>
              <dl className="space-y-3 text-xs font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <dt className="text-slate-400 dark:text-slate-500">Asset Tag ID</dt>
                  <dd className="text-slate-900 dark:text-slate-200 font-bold">{device.assetNumber}</dd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <dt className="text-slate-400 dark:text-slate-500">Brand</dt>
                  <dd className="text-slate-700 dark:text-slate-300">{device.brand || 'N/A'}</dd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <dt className="text-slate-400 dark:text-slate-500">Model Name</dt>
                  <dd className="text-slate-800 dark:text-slate-200">{device.model}</dd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <dt className="text-slate-400 dark:text-slate-500">Computer Hostname</dt>
                  <dd className="text-slate-700 dark:text-slate-300">{device.computerName || 'N/A'}</dd>
                </div>
                <div className="flex justify-between py-1.5">
                  <dt className="text-slate-400 dark:text-slate-500">System Status</dt>
                  <dd className="text-emerald-600 dark:text-emerald-400 capitalize font-medium">{device.status}</dd>
                </div>
              </dl>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0f1d] space-y-4 shadow-sm">
              <h3 className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Lifecycle & Protection
              </h3>
              <dl className="space-y-3 text-xs font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <dt className="text-slate-400 dark:text-slate-500">Purchase Date</dt>
                  <dd className="text-slate-700 dark:text-slate-300">{device.purchasedAt || 'N/A'}</dd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <dt className="text-slate-400 dark:text-slate-500">Antivirus Software</dt>
                  <dd className={device.hasAntivirus ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-amber-600 dark:text-amber-400 font-medium'}>
                    {device.hasAntivirus ? 'Installed & Active' : 'Not Installed'}
                  </dd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <dt className="text-slate-400 dark:text-slate-500">Internal ID</dt>
                  <dd className="text-slate-600 dark:text-slate-400 text-[11px] select-all">{device.id}</dd>
                </div>
                <div className="flex justify-between py-1.5">
                  <dt className="text-slate-400 dark:text-slate-500">Credential Vault</dt>
                  <dd className="text-emerald-600 dark:text-emerald-400 font-medium">AES-256-GCM Encrypted</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* Tab 2: Specifications */}
        {activeTab === 'specs' && (
          <div role="tabpanel" id="panel-specs" aria-labelledby="tab-specs" className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0f1d] space-y-6 shadow-sm">
            <h3 className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Component Specifications
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 space-y-2">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-mono">
                  <Cpu size={16} className="text-cyan-600 dark:text-cyan-400" />
                  <span>PROCESSOR</span>
                </div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100 font-mono">
                  {specifications?.processor || 'Unspecified'}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 space-y-2">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-mono">
                  <HardDrive size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <span>MEMORY (RAM)</span>
                </div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100 font-mono">
                  {specifications?.ram || 'Unspecified'}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 space-y-2">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-mono">
                  <HardDrive size={16} className="text-purple-600 dark:text-purple-400" />
                  <span>STORAGE</span>
                </div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100 font-mono">
                  {specifications?.storage || 'Unspecified'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Assignment */}
        {activeTab === 'assignment' && (
          <div role="tabpanel" id="panel-assignment" aria-labelledby="tab-assignment" className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0f1d] space-y-6 shadow-sm">
            <h3 className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Personnel Assignment & Custody
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-mono">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Primary PIC (Assignee)</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {assignment?.assigneeName || 'Unassigned'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Assignee Email</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {assignment?.assigneeEmail || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500 dark:text-slate-400">Department</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {assignment?.departmentName
                      ? `${assignment.departmentName} (${assignment.departmentCode})`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Secondary PIC (Custodian)</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {assignment?.custodianName || 'None'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Assignment Date</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {assignment?.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500 dark:text-slate-400">Return Status</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active Checked Out</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Access & Credentials */}
        {activeTab === 'access' && (
          <div role="tabpanel" id="panel-access" aria-labelledby="tab-access" className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0f1d] space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Device Access & Encrypted Credentials
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Stored securely with AES-256-GCM cipher (ADR-004). Plaintext secrets are never exposed in bulk endpoints.
                </p>
              </div>

              <button
                onClick={() => setPinModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs font-mono transition-colors shadow-sm"
              >
                <Key size={13} /> Reveal PIN Secret
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-mono">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Local Login Email</span>
                  <span className="text-slate-800 dark:text-slate-200">{credential?.loginEmail || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500 dark:text-slate-400">PIN Password Status</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono tracking-widest">
                    {credential?.pinMasked || '••••••••'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Cipher Algorithm</span>
                  <span className="text-slate-700 dark:text-slate-300">AES-256-GCM</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500 dark:text-slate-400">Audit Compliance</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Strict Append-Only Logging</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: History */}
        {activeTab === 'history' && (
          <div role="tabpanel" id="panel-history" aria-labelledby="tab-history" className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0a0f1d] shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200">
                Asset Audit Events ({auditHistory.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity Type</th>
                    <th className="py-3 px-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {auditHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-slate-400 font-mono text-xs">
                        No audit events recorded for this device.
                      </td>
                    </tr>
                  ) : (
                    auditHistory.map((ev: any) => (
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
                        <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">
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

        {/* Dedicated PinRevealModal */}
        <PinRevealModal
          isOpen={pinModalOpen}
          onClose={() => setPinModalOpen(false)}
          assetId={device.id}
          assetNumber={device.assetNumber}
          userRole={user?.role}
        />

        {/* Operational Lifecycle Modals */}
        <EditDeviceModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={fetchDetail}
          device={{ ...device, specifications }}
        />

        <AssignDeviceModal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          onSuccess={fetchDetail}
          deviceId={device.id}
          assetNumber={device.assetNumber}
          currentAssignee={assignment}
        />

        <RotatePinModal
          isOpen={rotatePinModalOpen}
          onClose={() => setRotatePinModalOpen(false)}
          onSuccess={fetchDetail}
          deviceId={device.id}
          assetNumber={device.assetNumber}
          currentLoginEmail={credential?.loginEmail}
        />

        <DecommissionModal
          isOpen={decommissionModalOpen}
          onClose={() => setDecommissionModalOpen(false)}
          onSuccess={fetchDetail}
          deviceId={device.id}
          assetNumber={device.assetNumber}
        />
      </div>
    </AppShell>
  );
}
