// src/components/layout/Topbar.tsx
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { RoleSwitcher } from './RoleSwitcher';
import { ThemeToggle } from './ThemeToggle';

interface TopbarProps {
  onOpenMobile: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobile }) => {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const getDomainLabel = () => {
    if (pathname.startsWith('/accounts')) return 'Identity & Accounts';
    if (pathname.startsWith('/groups/matrix')) return 'Membership Matrix';
    if (pathname.startsWith('/groups')) return 'Google Groups';
    if (pathname.startsWith('/assets')) return 'Hardware Assets';
    if (pathname.startsWith('/software')) return 'Software Tools';
    if (pathname.startsWith('/audit')) return 'Audit Trail';
    return 'Command Center';
  };

  // Create monogram initials
  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'CA';

  return (
    <header className="h-16 sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800/80 bg-white/85 dark:bg-[#0a0f1d]/85 backdrop-blur-md px-4 sm:px-6 md:px-8 flex items-center justify-between transition-colors duration-150">
      {/* Left section: mobile hamburger & breadcrumb/status */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          aria-label="Open navigation drawer"
        >
          <Menu size={18} />
        </button>

        {/* Mobile current domain orientation indicator */}
        <span className="lg:hidden text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
          {getDomainLabel()}
        </span>

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 hidden md:inline">SYSTEM STATUS:</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ONLINE
          </span>
        </div>
      </div>

      {/* Right section: Theme toggle + Role switcher + user pill + logout */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <ThemeToggle />
        <RoleSwitcher />

        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div
              className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-slate-700 dark:text-slate-200"
              title={user.email}
            >
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                {user.displayName.split(' ')[0]}
              </div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                {user.email}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="p-2 rounded-lg text-slate-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-900/80 transition-colors ml-1"
          title="Sign out of CORE"
          aria-label="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};
