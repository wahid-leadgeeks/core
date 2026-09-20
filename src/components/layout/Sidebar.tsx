// src/components/layout/Sidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FolderTree,
  Grid,
  Laptop,
  Layers,
  ShieldCheck,
  Lock,
  X,
  Database,
  FileSpreadsheet,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { StatusDot } from '@/components/feedback/StatusDot';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const NAV_ITEMS = [
  { href: '/', label: 'Command Center', icon: LayoutDashboard, domain: 'root' },
  { href: '/accounts', label: 'Identity & Accounts', icon: Users, domain: 'identity' },
  { href: '/groups', label: 'Google Groups', icon: FolderTree, domain: 'groups' },
  { href: '/groups/matrix', label: 'Membership Matrix', icon: Grid, domain: 'groups' },
  { href: '/assets', label: 'Assets & Hardware', icon: Laptop, domain: 'assets' },
  { href: '/software', label: 'Software & Tools', icon: Layers, domain: 'software' },
  { href: '/sheets', label: 'Spreadsheet Sync', icon: FileSpreadsheet, domain: 'automation' },
  { href: '/audit', label: 'Audit Trail', icon: ShieldCheck, domain: 'audit' },
];

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role || 'super_admin';

  // Permission checks for navigation items
  const isNavRestricted = (item: typeof NAV_ITEMS[0]) => {
    if (item.domain === 'audit') {
      return role !== 'super_admin' && role !== 'auditor';
    }
    if (item.domain === 'groups') {
      return role === 'asset_admin' || role === 'software_admin';
    }
    return false;
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0a0f1d] flex flex-col justify-between transition-all duration-200 ease-in-out lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}
    >
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Command Center Logo Header */}
        <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group" onClick={onCloseMobile}>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <StatusDot status="active" pulse={true} size="md" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold tracking-wider text-base text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  CORE
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60">
                  MVP
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 tracking-tight leading-none mt-0.5">
                Command Center
              </p>
            </div>
          </Link>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="p-4 space-y-6 flex-1">
          <div>
            <div className="px-3 pb-2 text-[10px] font-mono tracking-wider text-slate-400 dark:text-slate-500 uppercase">
              Infrastructure Domains
            </div>
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                const restricted = isNavRestricted(item);

                if (restricted) {
                  return (
                    <li key={item.href}>
                      <div
                        className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-400/80 dark:text-slate-400/60 cursor-not-allowed select-none bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/50"
                        title="Restricted for current role"
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={16} className="text-slate-400 dark:text-slate-500" />
                          <span>{item.label}</span>
                        </div>
                        <Lock size={12} className="text-slate-400" />
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onCloseMobile}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                        isActive
                          ? 'bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-white font-medium shadow-sm border-l-2 border-emerald-500 dark:border-emerald-400 pl-2.5'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/80 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon
                        size={16}
                        className={isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-400'}
                      />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Linked Google Spreadsheet & Telemetry Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-[#070b14]/50 space-y-2">
          <Link
            href="/sheets"
            onClick={onCloseMobile}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-mono text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-emerald-500/40 transition-all group"
            title="Open Spreadsheets Sync & Live Data Log"
          >
            <span className="flex items-center gap-1.5 truncate">
              <FileSpreadsheet size={13} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="truncate">Connected Sheets (3)</span>
            </span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              LIVE
            </span>
          </Link>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <Database size={12} className="text-emerald-600 dark:text-emerald-400" />
              PGlite Embedded
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              HEALTHY
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
