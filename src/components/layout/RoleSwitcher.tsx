// src/components/layout/RoleSwitcher.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import type { SystemRole } from '@/lib/auth/types';

export interface RoleOption {
  role: SystemRole;
  label: string;
  persona: string;
  dept: string;
  scope: string;
  badgeClasses: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'super_admin',
    label: 'Super Admin',
    persona: 'Amanda',
    dept: 'MNG',
    scope: 'Full unconstrained access & audit log',
    badgeClasses: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800/80',
  },
  {
    role: 'it_admin',
    label: 'IT Admin',
    persona: 'Aditya',
    dept: 'ITE',
    scope: 'Accounts, Groups, Assets & Software',
    badgeClasses: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800/80',
  },
  {
    role: 'asset_admin',
    label: 'Asset Admin',
    persona: 'Devi',
    dept: 'OPS',
    scope: 'Hardware laptops & specifications',
    badgeClasses: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/70 dark:text-cyan-300 dark:border-cyan-800/80',
  },
  {
    role: 'software_admin',
    label: 'Software Admin',
    persona: 'Rian',
    dept: 'GRW',
    scope: 'Software tools & subscription catalog',
    badgeClasses: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/80',
  },
  {
    role: 'auditor',
    label: 'Auditor',
    persona: 'Compliance Auditor',
    dept: 'GNR',
    scope: 'Read-only inspection & full audit trail',
    badgeClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/80',
  },
];

export const RoleSwitcher: React.FC = () => {
  const { user, switchRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentRole = user?.role || 'super_admin';
  const activeOption = ROLE_OPTIONS.find((r) => r.role === currentRole) || ROLE_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectRole = async (newRole: SystemRole) => {
    if (newRole === currentRole) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await switchRole(newRole);
    } finally {
      setSwitching(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Dropdown Trigger */}
      <button
        onClick={() => setOpen(!open)}
        disabled={switching}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e172a]/90 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-xs font-mono transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-sm"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden sm:inline">
          Role:
        </span>
        <span
          className={`px-2 py-0.5 rounded border text-[11px] font-medium uppercase ${activeOption.badgeClasses}`}
        >
          {activeOption.label}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 dark:text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b132b] shadow-xl dark:shadow-2xl z-50 p-2 space-y-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
              Switch Administrative Role
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Instantly simulates server-side RBAC session boundaries
            </div>
          </div>

          {ROLE_OPTIONS.map((opt) => {
            const isSelected = opt.role === currentRole;
            return (
              <button
                key={opt.role}
                onClick={() => handleSelectRole(opt.role)}
                className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-start justify-between group ${
                  isSelected
                    ? 'bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-900/80 border border-transparent'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white font-sans">
                      {opt.persona}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-medium ${opt.badgeClasses}`}
                    >
                      {opt.label}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                      ({opt.dept})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans leading-tight">
                    {opt.scope}
                  </div>
                </div>

                {isSelected && (
                  <Check size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                )}
              </button>
            );
          })}

          <div className="p-2 border-t border-slate-100 dark:border-slate-800/80 mt-1 text-[10px] font-mono text-slate-400 dark:text-slate-500 text-center">
            Auditor role strictly enforces read-only state.
          </div>
        </div>
      )}
    </div>
  );
};
