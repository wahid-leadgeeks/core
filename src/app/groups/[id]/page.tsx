// src/app/groups/[id]/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import {
  ArrowLeft,
  Mail,
  Users,
  Grid,
  RefreshCw,
  Search,
  Clock,
  ChevronRight,
  Crown,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { DetailSkeleton } from '@/components/feedback/Skeleton';

export default function GroupDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${encodeURIComponent(id)}`);
      if (!res.ok) {
        throw new Error(`Failed to load group (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading group detail');
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

  if (error || !data?.group) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Link
            href="/groups"
            className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white"
          >
            <ArrowLeft size={14} /> Back to Google Groups
          </Link>
          <div className="p-6 rounded-xl border border-rose-900/60 bg-rose-950/20 text-rose-300 font-mono text-sm">
            {error || 'Group not found'}
          </div>
        </div>
      </AppShell>
    );
  }

  const { group, members = [] } = data;

  const filteredMembers = members.filter((m: any) => {
    const q = query.toLowerCase().trim();
    return (
      !q ||
      m.fullName?.toLowerCase().includes(q) ||
      m.displayName?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.departmentCode?.toLowerCase().includes(q)
    );
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown size={12} className="text-purple-400" />;
      case 'manager':
        return <ShieldCheck size={12} className="text-blue-400" />;
      default:
        return <Users size={12} className="text-slate-500" />;
    }
  };

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs
          items={[
            { label: 'Command Center', href: '/' },
            { label: 'Google Groups', href: '/groups' },
            { label: group.name, current: true },
          ]}
        />

        {/* Group Header Summary */}
        <div className="p-6 rounded-xl border border-slate-800 bg-[#0a0f1d] shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold font-sans text-slate-100">
                  {group.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {members.length} Members
                </span>
                <span className="flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  <Clock size={11} className="text-amber-400" />
                  Pending Sync
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-slate-400 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Mail size={13} className="text-slate-400" />
                  <span className="text-slate-200">{group.email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span>Source: Spreadsheet</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/groups/matrix?filterGroup=${encodeURIComponent(group.name)}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-xs font-mono text-emerald-300 hover:bg-emerald-900 transition-colors"
              >
                <Grid size={13} /> View in Matrix
              </Link>
              <button
                onClick={fetchDetail}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white transition-colors"
              >
                <RefreshCw size={13} />
                Refresh
              </button>
            </div>
          </div>

          {group.description && (
            <p className="pt-2 border-t border-slate-800/60 text-xs text-slate-400 font-sans">
              {group.description}
            </p>
          )}
        </div>

        {/* Member Roster Search */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={15} />
            <input
              type="text"
              placeholder="Search member accounts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-10 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700 font-sans"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-2 p-0.5 rounded text-slate-400 hover:text-white transition-colors"
                title="Clear search"
                aria-label="Clear search input"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <span className="text-xs font-mono text-slate-500">
            Showing {filteredMembers.length} of {members.length} members
          </span>
        </div>

        {/* Members Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0a0f1d]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Account Role</th>
                  <th className="py-3 px-4">Group Role</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-mono text-xs">
                      No members match search query &quot;{query}&quot;.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m: any) => (
                    <tr key={m.membershipId || m.accountId} className="hover:bg-slate-800/40 group">
                      <td className="py-3 px-4">
                        <Link href={`/accounts/${m.accountId}`} className="block">
                          <div className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">
                            {m.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            @{m.displayName}
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {m.email}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
                          {m.departmentCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {m.roleName}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-800 border border-slate-700 text-slate-200 capitalize">
                          {getRoleIcon(m.groupRole)}
                          {m.groupRole}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/accounts/${m.accountId}`}
                          className="text-emerald-400 hover:underline font-mono text-xs inline-flex items-center gap-0.5"
                        >
                          View Account <ChevronRight size={12} />
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
