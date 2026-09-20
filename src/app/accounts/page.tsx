// src/app/accounts/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { Search, Mail, Building, Shield, RefreshCw, ChevronRight, X, RotateCcw } from 'lucide-react';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { TableSkeleton } from '@/components/feedback/Skeleton';

interface AccountItem {
  id: string;
  fullName: string;
  displayName: string;
  email: string;
  previousEmail?: string | null;
  accountType: 'personal' | 'service' | 'shared';
  status: 'active' | 'suspended' | 'archived';
  departmentName: string;
  departmentCode: string;
  roleName: string;
  roleLevel: number;
  domains: string[];
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAccounts();
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
    query !== '' || selectedDept !== 'ALL' || selectedRole !== 'ALL' || selectedType !== 'ALL';

  const resetFilters = () => {
    setQuery('');
    setSelectedDept('ALL');
    setSelectedRole('ALL');
    setSelectedType('ALL');
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const departments = ['ALL', 'MNG', 'OPS', 'GRW', 'EXP', 'HRD', 'ITE', 'FAC', 'GNR'];
  const roles = ['ALL', 'Top Management', 'Leaders', 'Commercial', 'Staff'];
  const types = ['ALL', 'personal', 'service', 'shared'];

  const filtered = accounts.filter((a) => {
    const matchesDept = selectedDept === 'ALL' || a.departmentCode === selectedDept;
    const matchesRole =
      selectedRole === 'ALL' || a.roleName.toLowerCase() === selectedRole.toLowerCase();
    const matchesType = selectedType === 'ALL' || a.accountType === selectedType;
    const q = query.toLowerCase().trim();
    const matchesQuery =
      !q ||
      a.fullName.toLowerCase().includes(q) ||
      a.displayName.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.previousEmail && a.previousEmail.toLowerCase().includes(q));
    return matchesDept && matchesRole && matchesType && matchesQuery;
  });

  const getRoleBadgeClasses = (roleName: string) => {
    const lower = roleName.toLowerCase();
    if (lower.includes('top management'))
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
    if (lower.includes('leader'))
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
    if (lower.includes('commercial'))
      return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
    return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700';
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Identity & User Accounts
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border-emerald-800 font-medium">
                {accounts.length} Total
              </span>
              {filtered.length !== accounts.length && (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 font-medium">
                  {filtered.length} filtered
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Authoritative directory of Google Workspace user accounts, departments, and roles.
            </p>
          </div>

          <button
            onClick={fetchAccounts}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition-colors self-start md:self-auto shadow-sm"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Filter Toolbar (3-Dimensional) */}
        <div className="space-y-3 bg-white dark:bg-[#0a0f1d] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={16} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by name, handle, or email..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-16 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-700 focus:ring-1 focus:ring-emerald-500 font-sans"
              />
              <div className="absolute right-2.5 top-2 flex items-center gap-1">
                {query ? (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                    title="Clear search"
                    aria-label="Clear search input"
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] font-mono text-slate-500 dark:text-slate-400 select-none">
                    /
                  </kbd>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Type:</span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/80 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                {types.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-2 py-0.5 rounded text-xs font-mono capitalize transition-colors ${
                      selectedType === type
                        ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Department and Role Filter Row */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs font-mono">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
                <Building size={12} /> Dept:
              </span>
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`px-2 py-0.5 rounded transition-colors border ${
                    selectedDept === dept
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-700 font-medium'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
                <Shield size={12} /> Role:
              </span>
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`px-2 py-0.5 rounded transition-colors border ${
                    selectedRole === role
                      ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700 font-medium'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            {isFiltered && (
              <button
                onClick={resetFilters}
                className="ml-auto flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-slate-800/80 transition-colors font-medium"
                title="Reset all search filters"
              >
                <RotateCcw size={11} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Accounts Table */}
        <div className="border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden bg-white dark:bg-[#0a0f1d] shadow-sm dark:shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-sans">
              <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Account User</th>
                  <th className="py-3 px-4">Primary Email</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Role / Type</th>
                  <th className="py-3 px-4">Domains</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <TableSkeleton rows={6} cols={7} />
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-500 dark:text-slate-400 font-mono text-xs">
                      <div className="max-w-sm mx-auto space-y-3">
                        <p>No matching accounts found matching current search criteria.</p>
                        {isFiltered && (
                          <button
                            onClick={resetFilters}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 transition-colors font-mono text-xs"
                          >
                            <RotateCcw size={12} />
                            <span>Reset All Filters</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((acct) => (
                    <tr
                      key={acct.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <Link href={`/accounts/${acct.id}`} className="block">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {acct.fullName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            @{acct.displayName}
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Mail size={12} className="text-slate-400" />
                          <span>{acct.email}</span>
                        </div>
                        {acct.previousEmail && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-400 mt-0.5">
                            was: {acct.previousEmail}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300">
                            {acct.departmentCode}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{acct.departmentName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span className={`inline-block text-[11px] font-mono px-2 py-0.5 rounded border ${getRoleBadgeClasses(acct.roleName)}`}>
                            {acct.roleName}
                          </span>
                          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 capitalize">
                            Type: {acct.accountType}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {acct.domains.map((dom) => (
                            <span
                              key={dom}
                              className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-[10px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60"
                            >
                              {dom}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={acct.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/accounts/${acct.id}`}
                          className="inline-flex items-center gap-1 text-xs font-mono text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 hover:underline"
                        >
                          View <ChevronRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
