// src/app/groups/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { Grid, RefreshCw, Mail, Users, Clock, Search, ChevronRight, X, RotateCcw } from 'lucide-react';
import { CardSkeleton } from '@/components/feedback/Skeleton';

interface GroupItem {
  id: string;
  name: string;
  email: string;
  description?: string;
  memberCount: number;
  syncStatus: string;
  lastSyncedAt?: string;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGroups();
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

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = groups.filter((g) => {
    const q = query.toLowerCase().trim();
    return !q || g.name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q);
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-mono font-bold text-slate-100 tracking-tight">
                Google Groups Catalog
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                {groups.length} Groups
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Google Workspace distribution lists, team groups, and calendar access clusters.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/groups/matrix"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-xs font-mono text-emerald-300 hover:bg-emerald-900 transition-colors"
            >
              <Grid size={14} />
              Open 42×15 Membership Matrix
            </Link>
            <button
              onClick={fetchGroups}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white transition-colors"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={15} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search groups by name or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-16 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-emerald-500 font-sans"
          />
          <div className="absolute right-2.5 top-2 flex items-center gap-1">
            {query ? (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                title="Clear search"
                aria-label="Clear search input"
              >
                <X size={14} />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400 select-none">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <CardSkeleton count={6} />
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 font-mono text-xs">
              <div className="max-w-sm mx-auto space-y-3">
                <p>No Google Groups matching query &quot;{query}&quot;.</p>
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:border-slate-600 transition-colors font-mono text-xs"
                  >
                    <RotateCcw size={12} />
                    <span>Clear Search Filter</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            filtered.map((group) => (
              <div
                key={group.id}
                className="p-5 rounded-xl border border-slate-800 bg-[#0a0f1d] hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/groups/${group.id}`}
                      className="font-semibold text-slate-200 text-base group-hover:text-emerald-400 transition-colors"
                    >
                      {group.name}
                    </Link>
                    <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 shrink-0">
                      <Clock size={11} className="text-amber-400" />
                      Pending Sync
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 font-mono text-xs text-slate-400">
                    <Mail size={12} className="text-slate-400" />
                    <span>{group.email}</span>
                  </div>

                  {group.description && (
                    <p className="mt-2 text-xs text-slate-400 line-clamp-2 font-sans">
                      {group.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Users size={13} className="text-emerald-400" />
                    <span className="font-medium text-slate-200">{group.memberCount}</span> members
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/groups/matrix?filterGroup=${encodeURIComponent(group.name)}`}
                      className="text-slate-400 hover:text-slate-200 hover:underline"
                    >
                      Matrix
                    </Link>
                    <Link
                      href={`/groups/${group.id}`}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 hover:underline"
                    >
                      Details <ChevronRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
