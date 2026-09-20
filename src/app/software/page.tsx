// src/app/software/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import {
  Layers,
  Search,
  RefreshCw,
  Building,
  ExternalLink,
  ChevronRight,
  Tag,
  X,
  RotateCcw,
} from 'lucide-react';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { CardSkeleton } from '@/components/feedback/Skeleton';

interface ApplicationItem {
  id: string;
  name: string;
  description: string | null;
  departmentId: string | null;
  departmentName: string;
  departmentCode: string;
  category: string | null;
  subscriptionType: string | null;
  status: 'active' | 'deprecated' | 'evaluating';
  websiteUrl: string | null;
}

export default function SoftwarePage() {
  const [apps, setApps] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [subTypeFilter, setSubTypeFilter] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSoftware();
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
    query !== '' ||
    selectedDept !== 'ALL' ||
    subTypeFilter !== 'ALL' ||
    selectedCategory !== 'ALL';

  const resetFilters = () => {
    setQuery('');
    setSelectedDept('ALL');
    setSubTypeFilter('ALL');
    setSelectedCategory('ALL');
  };

  const fetchSoftware = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/software');
      if (res.ok) {
        const data = await res.json();
        setApps(data.applications || []);
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const departments = ['ALL', 'MNG', 'OPS', 'GRW', 'EXP', 'HRD', 'ITE', 'FAC', 'GNR'];
  const subscriptions = ['ALL', 'free', 'paid', 'freemium'];
  const categories = [
    'ALL',
    'communication',
    'productivity',
    'development',
    'design',
    'marketing',
    'security',
    'finance',
    'operations',
    'other',
  ];

  const filtered = apps.filter((app) => {
    const matchesDept =
      selectedDept === 'ALL' ||
      app.departmentCode === selectedDept ||
      app.departmentName === selectedDept;

    const matchesSub =
      subTypeFilter === 'ALL' ||
      (app.subscriptionType && app.subscriptionType.toLowerCase() === subTypeFilter.toLowerCase());

    const matchesCategory =
      selectedCategory === 'ALL' ||
      (app.category && app.category.toLowerCase() === selectedCategory.toLowerCase());

    const q = query.toLowerCase().trim();
    const matchesQuery =
      !q ||
      app.name.toLowerCase().includes(q) ||
      (app.description && app.description.toLowerCase().includes(q)) ||
      (app.category && app.category.toLowerCase().includes(q)) ||
      app.departmentName.toLowerCase().includes(q);

    return matchesDept && matchesSub && matchesCategory && matchesQuery;
  });

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Software & Tools Catalog
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                {apps.length} Applications
              </span>
              {filtered.length !== apps.length && (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                  {filtered.length} filtered
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Company authorized applications, subscription tiers, cost centers, and software licenses.
            </p>
          </div>

          <button
            onClick={fetchSoftware}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-xs transition-colors self-start md:self-auto"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="space-y-3 bg-white dark:bg-[#0a0f1d] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={16} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search tools by name, description, or category..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-16 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-sans transition-colors"
              />
              <div className="absolute right-2.5 top-2 flex items-center gap-1">
                {query ? (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                    title="Clear search"
                    aria-label="Clear search input"
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-500 dark:text-slate-400 select-none">
                    /
                  </kbd>
                )}
              </div>
            </div>

            {/* Subscription Type Filter (Free, Paid, Freemium) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Plan:</span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/80 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                {subscriptions.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setSubTypeFilter(sub)}
                    className={`px-2.5 py-0.5 rounded text-xs font-mono capitalize transition-colors ${
                      subTypeFilter === sub
                        ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Department Filter Row */}
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
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-700 font-semibold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 dark:hover:border-slate-700'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
                <Tag size={12} /> Category:
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded transition-colors border capitalize ${
                    selectedCategory === cat
                      ? 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-700 font-semibold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 dark:hover:border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {isFiltered && (
              <button
                onClick={resetFilters}
                className="ml-auto flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-slate-800/80 transition-colors"
                title="Reset all search filters"
              >
                <RotateCcw size={11} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Applications Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <CardSkeleton count={6} />
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 dark:text-slate-400 font-mono text-xs">
              <div className="max-w-sm mx-auto space-y-3">
                <p>No software applications matching current search criteria.</p>
                {isFiltered && (
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 shadow-xs transition-colors font-mono text-xs"
                  >
                    <RotateCcw size={12} />
                    <span>Reset All Filters</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            filtered.map((app) => (
              <div
                key={app.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0f1d] hover:border-slate-300 dark:hover:border-slate-700 shadow-sm dark:shadow-none hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/software/${app.id}`}
                      className="font-semibold text-slate-900 dark:text-slate-200 text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors"
                    >
                      {app.name}
                    </Link>
                    <StatusBadge status={app.status} size="sm" />
                  </div>

                  <div className="flex items-center gap-2 mt-2 flex-wrap text-xs font-mono">
                    <span
                      className={`px-2 py-0.5 rounded border capitalize ${getSubBadgeClasses(
                        app.subscriptionType
                      )}`}
                    >
                      {app.subscriptionType || 'Free'}
                    </span>
                    {app.category && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 capitalize">
                        {app.category}
                      </span>
                    )}
                  </div>

                  {app.description && (
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 font-sans">
                      {app.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500 dark:text-slate-400">
                    Dept: <span className="text-slate-800 dark:text-slate-200 font-medium">{app.departmentCode || 'GNR'}</span>
                  </span>

                  <div className="flex items-center gap-3">
                    {app.websiteUrl && (
                      <a
                        href={app.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                        title="Open external website"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                    <Link
                      href={`/software/${app.id}`}
                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-0.5 hover:underline font-medium"
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
