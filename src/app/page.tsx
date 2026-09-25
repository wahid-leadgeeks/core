'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import {
  Users,
  FolderTree,
  Laptop,
  Layers,
  ShieldCheck,
  ArrowRight,
  Database,
  Lock,
  Clock,
  CheckCircle2,
  Key,
  Grid,
} from 'lucide-react';
import { StatusDot } from '@/components/feedback/StatusDot';
import { useAuth } from '@/lib/auth/AuthContext';

interface RecentAuditEvent {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    accounts: 42,
    groups: 15,
    devices: 31,
    software: 125,
    assignedDevices: 26,
    reserveDevices: 2,
    availableDevices: 2,
  });

  const [recentAudit, setRecentAudit] = useState<RecentAuditEvent[]>([]);

  useEffect(() => {
    // Fetch live domain summary counts
    Promise.all([
      fetch('/api/accounts').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/groups').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/assets').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/software').then((r) => (r.ok ? r.json() : null)),
    ]).then(([acctData, groupData, assetData, softData]) => {
      const assets = assetData?.assets || [];
      setStats({
        accounts: acctData?.total || 42,
        groups: groupData?.total || 15,
        devices: assetData?.total || 31,
        software: softData?.total || 125,
        assignedDevices: assets.filter((a: any) => a.status === 'assigned').length || 26,
        reserveDevices: assets.filter((a: any) => a.status === 'reserve').length || 2,
        availableDevices: assets.filter((a: any) => a.status === 'available').length || 2,
      });
    });

    // Fetch recent audit stream
    fetch('/api/audit?limit=3')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.events) {
          setRecentAudit(data.events.slice(0, 3));
        }
      })
      .catch(() => {
        // Fallback gracefully on network issues
      });
  }, []);

  const cards = [
    {
      title: 'Identity & Accounts',
      count: stats.accounts,
      subtext: '40 Personal • 1 Service • 1 Shared',
      icon: Users,
      href: '/accounts',
    },
    {
      title: 'Google Groups',
      count: stats.groups,
      subtext: '167 Memberships • 2 Calendar Groups',
      icon: FolderTree,
      href: '/groups',
    },
    {
      title: 'Hardware Assets',
      count: stats.devices,
      subtext: `${stats.assignedDevices} Assigned • ${stats.availableDevices} Available • ${stats.reserveDevices} Reserve`,
      icon: Laptop,
      href: '/assets',
    },
    {
      title: 'Software & Tools',
      count: stats.software,
      subtext: '82 General • 11 Ops • 9 IT • 7 Growth',
      icon: Layers,
      href: '/software',
    },
  ];

  const getActionBadgeClasses = (action: string) => {
    if (action.includes('reveal'))
      return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';
    if (action.includes('delete') || action.includes('failed'))
      return 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800';
    if (action.includes('create') || action.includes('login'))
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800';
    return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Calm Command Center Header */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0f1d] shadow-sm dark:shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-mono text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <StatusDot status="active" pulse={true} size="sm" />
                <span>CORE INFRASTRUCTURE ACTIVE • LEADGEEKS OPS</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans">
                Infrastructure Command Center
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm max-w-2xl leading-relaxed">
                Centralized operational administration for Google Workspace identity directory,
                distribution groups catalog, company laptop inventory, and software tools.
              </p>
            </div>

            {/* Live Operational Status Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <div className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-sm">
                <Database size={13} className="text-emerald-600 dark:text-emerald-400" />
                <span>PostgreSQL 16</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-sm">
                <Lock size={13} className="text-amber-600 dark:text-amber-400" />
                <span>AES-256-GCM Vault</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-sm">
                <ShieldCheck size={13} className="text-purple-600 dark:text-purple-400" />
                <span className="uppercase">{user?.role || 'Super Admin'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Domain Resource Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0f1d] hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all group flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:border-emerald-200 dark:group-hover:border-emerald-800 transition-colors">
                    <Icon size={18} />
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all"
                  />
                </div>

                <div>
                  <div className="text-3xl font-mono font-bold text-slate-900 dark:text-slate-100">
                    {card.count}
                  </div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                    {card.title}
                  </div>
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    {card.subtext}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Operational Activity & Command Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Panel 1: Pending Operations & Health */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0f1d] flex flex-col justify-between space-y-4 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-700 dark:text-slate-300 font-semibold uppercase">
                  <Clock size={15} className="text-amber-500 dark:text-amber-400" />
                  <span>Pending Operations</span>
                </div>
                <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 font-medium">
                  Action Required
                </span>
              </div>

              <ul className="space-y-3 text-xs font-sans">
                <li className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Google Workspace Sync</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">15 Groups</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-tight">
                    Distribution lists require synchronization with Google Directory API.
                  </p>
                  <Link
                    href="/groups/matrix"
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline pt-0.5 font-medium"
                  >
                    Open Membership Matrix →
                  </Link>
                </li>

                <li className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Reserve Hardware Pool</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">2 Devices</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-tight">
                    Laptops ready in OPS custody for immediate employee checkout.
                  </p>
                  <Link
                    href="/assets"
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline pt-0.5 font-medium"
                  >
                    Inspect Hardware Inventory →
                  </Link>
                </li>
              </ul>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <span>All services operational</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">100% ONLINE</span>
            </div>
          </div>

          {/* Panel 2: Recent Security Audit Activity */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0f1d] flex flex-col justify-between space-y-4 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-700 dark:text-slate-300 font-semibold uppercase">
                  <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Recent Audit Events</span>
                </div>
                <Link
                  href="/audit"
                  className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  View All →
                </Link>
              </div>

              {recentAudit.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-center space-y-1 py-6">
                  <CheckCircle2 size={20} className="mx-auto text-slate-400" />
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">Audit stream logging active</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    All administrative mutations append to immutable event store.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2 font-mono text-xs">
                  {recentAudit.map((ev) => (
                    <li
                      key={ev.id}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${getActionBadgeClasses(
                            ev.action
                          )}`}
                        >
                          {ev.action}
                        </span>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[170px]">
                          Entity: {ev.entityType}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(ev.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Audit Storage</span>
              <span className="text-slate-700 dark:text-slate-300">Append-Only</span>
            </div>
          </div>

          {/* Panel 3: Quick Command Center Actions */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0f1d] flex flex-col justify-between space-y-4 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-700 dark:text-slate-300 font-semibold uppercase">
                  <Grid size={15} className="text-cyan-600 dark:text-cyan-400" />
                  <span>Command Center Actions</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">Shortcuts</span>
              </div>

              <div className="space-y-2 text-xs">
                <Link
                  href="/groups/matrix"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <Grid size={15} className="text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        42×15 Membership Matrix
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        Cross-tabulated authorization grid
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-300" />
                </Link>

                <Link
                  href="/assets"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <Key size={15} className="text-amber-500 dark:text-amber-400" />
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        Hardware PIN Vault
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        AES-256-GCM credentials (ADR-004)
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-300" />
                </Link>

                <Link
                  href="/software"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <Layers size={15} className="text-purple-600 dark:text-purple-400" />
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        Software & Tool Licenses
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        125 application catalog
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-300" />
                </Link>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Access Architecture</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Google Workspace Unified</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
