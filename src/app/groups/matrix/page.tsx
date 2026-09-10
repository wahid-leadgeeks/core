// src/app/groups/matrix/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import {
  ArrowLeft,
  Check,
  Search,
  RefreshCw,
  Crown,
  ShieldCheck,
  Building,
  X,
  RotateCcw,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { TableSkeleton } from '@/components/feedback/Skeleton';

interface MatrixMembership {
  groupId: string;
  groupName: string;
  groupEmail: string;
  isMember: boolean;
  role?: 'member' | 'manager' | 'owner' | null;
}

interface MatrixAccount {
  accountId: string;
  displayName: string;
  fullName: string;
  email: string;
  departmentCode?: string;
  departmentName?: string;
  memberships: MatrixMembership[];
}

interface GroupHeader {
  id: string;
  name: string;
  email: string;
}

export default function MembershipMatrixPage() {
  const [matrix, setMatrix] = useState<MatrixAccount[]>([]);
  const [groups, setGroups] = useState<GroupHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [hoveredCell, setHoveredCell] = useState<{ accountId: string; groupId: string } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMatrix();
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

  const isFiltered = query !== '' || selectedDept !== 'ALL';

  const resetFilters = () => {
    setQuery('');
    setSelectedDept('ALL');
  };

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/groups?matrix=true');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
        setMatrix(data.matrix || []);
      }
    } catch (err) {
      console.error('Failed to load matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  const departments = ['ALL', 'MNG', 'OPS', 'GRW', 'EXP', 'HRD', 'ITE', 'FAC', 'GNR'];

  const filteredMatrix = matrix.filter((row) => {
    const matchesDept = selectedDept === 'ALL' || row.departmentCode === selectedDept;
    const q = query.toLowerCase().trim();
    const matchesQuery =
      !q ||
      row.displayName?.toLowerCase().includes(q) ||
      row.fullName?.toLowerCase().includes(q) ||
      row.email?.toLowerCase().includes(q);
    return matchesDept && matchesQuery;
  });

  const renderCellIndicator = (m: MatrixMembership) => {
    if (!m.isMember) {
      return <span className="text-slate-600 block select-none">—</span>;
    }
    if (m.role === 'owner') {
      return (
        <span
          className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-purple-950/90 text-purple-400 border border-purple-700/60 shadow-sm mx-auto"
          title="Group Owner"
        >
          <Crown size={11} />
        </span>
      );
    }
    if (m.role === 'manager') {
      return (
        <span
          className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-950/90 text-blue-400 border border-blue-700/60 shadow-sm mx-auto"
          title="Group Manager"
        >
          <ShieldCheck size={11} />
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-950/90 text-emerald-400 border border-emerald-700/60 shadow-sm mx-auto"
        title="Member"
      >
        <Check size={12} strokeWidth={2.5} />
      </span>
    );
  };

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs
          items={[
            { label: 'Command Center', href: '/' },
            { label: 'Google Groups', href: '/groups' },
            { label: '42×15 Membership Matrix', current: true },
          ]}
        />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/groups"
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Back to Groups"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-mono font-bold text-slate-100 tracking-tight">
                  Google Groups Membership Matrix
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {filteredMatrix.length} Users × {groups.length} Groups
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                42×15 cross-tabulated authorization grid showing every user account across all 15 Google Groups.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64 sm:w-72">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Filter by account name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-14 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-emerald-500 font-sans"
              />
              <div className="absolute right-2 top-1.5 flex items-center gap-1">
                {query ? (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                    title="Clear filter"
                    aria-label="Clear filter input"
                  >
                    <X size={13} />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400 select-none">
                    /
                  </kbd>
                )}
              </div>
            </div>
            <button
              onClick={fetchMatrix}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Refresh Matrix"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Department Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
          <span className="text-slate-400 flex items-center gap-1 mr-1 shrink-0">
            <Building size={13} /> Dept:
          </span>
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-2.5 py-1 rounded-md transition-colors border shrink-0 ${
                selectedDept === dept
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-700 font-semibold'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              {dept}
            </button>
          ))}

          {isFiltered && (
            <button
              onClick={resetFilters}
              className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono text-amber-400 hover:text-amber-300 hover:bg-slate-800/80 transition-colors shrink-0"
              title="Reset all search filters"
            >
              <RotateCcw size={11} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Matrix Table */}
        <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-[#0a0f1d] shadow-lg">
          <div className="overflow-x-auto max-h-[72vh]">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead className="bg-slate-900/95 sticky top-0 z-20 border-b border-slate-800 shadow-md">
                <tr>
                  <th className="py-3.5 px-4 font-semibold text-slate-200 sticky left-0 z-30 bg-slate-900 min-w-[220px] border-r border-slate-800">
                    Account User ({filteredMatrix.length})
                  </th>
                  {groups.map((grp) => {
                    const isColHovered = hoveredCell?.groupId === grp.id;
                    return (
                      <th
                        key={grp.id}
                        className={`py-3.5 px-2 text-center text-[11px] font-mono min-w-[120px] max-w-[140px] truncate border-r border-slate-800/50 transition-colors ${
                          isColHovered
                            ? 'bg-slate-800 text-emerald-400 font-semibold shadow-inner'
                            : 'text-slate-400 hover:bg-slate-800/50'
                        }`}
                        title={`${grp.name} (${grp.email})`}
                      >
                        <Link href={`/groups/${grp.id}`} className="block hover:text-emerald-400 transition-colors">
                          <div className="truncate font-medium text-slate-300">{grp.name.replace('LeadGeeks ', '')}</div>
                          <div className="text-[9px] text-slate-500 truncate">{grp.email.split('@')[0]}</div>
                        </Link>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {loading ? (
                  <TableSkeleton rows={10} cols={groups.length + 1} />
                ) : filteredMatrix.length === 0 ? (
                  <tr>
                    <td
                      colSpan={groups.length + 1}
                      className="py-16 text-center text-slate-500 font-mono text-xs"
                    >
                      <div className="max-w-sm mx-auto space-y-3">
                        <p>No accounts found matching current filters.</p>
                        {isFiltered && (
                          <button
                            onClick={resetFilters}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:border-slate-600 transition-colors font-mono text-xs"
                          >
                            <RotateCcw size={12} />
                            <span>Reset All Filters</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMatrix.map((row) => {
                    const isRowHovered = hoveredCell?.accountId === row.accountId;
                    return (
                      <tr
                        key={row.accountId}
                        className={`transition-colors group ${
                          isRowHovered ? 'bg-slate-800/50' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td
                          className={`py-2.5 px-4 font-mono sticky left-0 z-10 border-r border-slate-800 transition-colors ${
                            isRowHovered
                              ? 'bg-slate-800 text-white'
                              : 'bg-[#070b14]/95 group-hover:bg-slate-900'
                          }`}
                        >
                          <Link href={`/accounts/${row.accountId}`} className="block">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-200 text-xs truncate group-hover:text-emerald-400 transition-colors">
                                {row.displayName}
                              </span>
                              {row.departmentCode && (
                                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                                  {row.departmentCode}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">{row.email}</div>
                          </Link>
                        </td>
                        {row.memberships.map((m) => {
                          const isCurrentCol = hoveredCell?.groupId === m.groupId;
                          return (
                            <td
                              key={m.groupId}
                              onMouseEnter={() =>
                                setHoveredCell({ accountId: row.accountId, groupId: m.groupId })
                              }
                              onMouseLeave={() => setHoveredCell(null)}
                              className={`py-2.5 px-2 text-center border-r border-slate-800/40 transition-colors ${
                                isCurrentCol ? 'bg-slate-800/40' : ''
                              }`}
                            >
                              {renderCellIndicator(m)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
