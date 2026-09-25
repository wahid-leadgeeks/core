// src/app/assets/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import {
  Laptop,
  Search,
  User,
  Key,
  RefreshCw,
  ChevronRight,
  Building,
  X,
  RotateCcw,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { CardSkeleton } from '@/components/feedback/Skeleton';
import PinRevealModal from '@/components/assets/PinRevealModal';
import ProvisionDeviceModal from '@/components/assets/ProvisionDeviceModal';
import { Pagination } from '@/components/navigation/Pagination';

interface AssetItem {
  id: string;
  assetNumber: string;
  brand: string | null;
  model: string;
  computerName: string | null;
  status: 'assigned' | 'available' | 'reserve' | 'decommissioned';
  purchasedAt: string | null;
  hasAntivirus: boolean;
  notes: string | null;
  specifications: {
    processor: string | null;
    ram: string | null;
    storage: string | null;
  } | null;
  assignment: {
    assignedAt: string;
    assigneeId: string | null;
    assigneeName: string | null;
    assigneeEmail: string | null;
    custodianName: string | null;
    departmentName?: string | null;
    departmentCode?: string | null;
  } | null;
  credential: {
    id: string;
    loginEmail: string | null;
    hasEncryptedPin: boolean;
    pinMasked: string | null;
    pinLastRotatedAt: string | null;
  } | null;
}

export default function AssetsPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;
  const searchInputRef = useRef<HTMLInputElement>(null);

  // PIN Reveal modal state
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [selectedAssetForPin, setSelectedAssetForPin] = useState<{ id: string; assetNumber: string } | null>(null);
  const [provisionModalOpen, setProvisionModalOpen] = useState(false);

  // All authenticated users are administrators
  const canProvision = true;

  useEffect(() => {
    fetchAssets();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, brandFilter, deptFilter]);

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
    query !== '' || statusFilter !== 'ALL' || brandFilter !== 'ALL' || deptFilter !== 'ALL';

  const resetFilters = () => {
    setQuery('');
    setStatusFilter('ALL');
    setBrandFilter('ALL');
    setDeptFilter('ALL');
    setCurrentPage(1);
  };

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assets');
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
      }
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = ['ALL', 'assigned', 'available', 'reserve', 'decommissioned'];
  const brandOptions = ['ALL', 'LENOVO', 'MSI', 'ASUS'];
  const deptOptions = ['ALL', 'OPS', 'GRW', 'EXP', 'HRD', 'ITE', 'FAC', 'MNG'];

  const filtered = assets.filter((a) => {
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const matchesBrand =
      brandFilter === 'ALL' || (a.brand && a.brand.toUpperCase() === brandFilter);
    const matchesDept =
      deptFilter === 'ALL' ||
      (a.assignment?.departmentCode && a.assignment.departmentCode === deptFilter);

    const q = query.toLowerCase().trim();
    const matchesQuery =
      !q ||
      a.assetNumber.toLowerCase().includes(q) ||
      a.model.toLowerCase().includes(q) ||
      (a.brand && a.brand.toLowerCase().includes(q)) ||
      (a.computerName && a.computerName.toLowerCase().includes(q)) ||
      (a.assignment?.assigneeName && a.assignment.assigneeName.toLowerCase().includes(q));

    return matchesStatus && matchesBrand && matchesDept && matchesQuery;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedAssets = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleOpenPinModal = (assetId: string, assetNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedAssetForPin({ id: assetId, assetNumber });
    setPinModalOpen(true);
  };

  const canRevealPin = true;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Hardware Device Assets
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 font-medium">
                {assets.length} Devices
              </span>
              {filtered.length !== assets.length && (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 font-medium">
                  {filtered.length} filtered
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Company-owned laptops, hardware specifications, assignments, and encrypted credential vault.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {canProvision && (
              <button
                onClick={() => setProvisionModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white shadow-sm transition-colors"
              >
                <Plus size={14} />
                <span>Provision Device</span>
              </button>
            )}
            <button
              onClick={fetchAssets}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="space-y-3 bg-white dark:bg-[#0a0f1d] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={16} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search asset tag, brand, model, or PIC..."
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
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-500 dark:text-slate-400 select-none">
                    /
                  </kbd>
                )}
              </div>
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
              <span className="text-slate-500 dark:text-slate-400 mr-1 hidden sm:inline">Status:</span>
              {statusOptions.map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md transition-colors border capitalize font-medium ${
                    statusFilter === st
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-600'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Secondary Filter Row: Brand & Department */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs font-mono">
            {/* Brand Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500 dark:text-slate-400 mr-1">Brand:</span>
              {brandOptions.map((brand) => (
                <button
                  key={brand}
                  onClick={() => setBrandFilter(brand)}
                  className={`px-2 py-0.5 rounded transition-colors border font-medium ${
                    brandFilter === brand
                      ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {brand}
                </button>
              ))}
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
                <Building size={12} /> Assignee Dept:
              </span>
              {deptOptions.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setDeptFilter(dept)}
                  className={`px-2 py-0.5 rounded transition-colors border font-medium ${
                    deptFilter === dept
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-700'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {dept}
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

        {/* Asset Cards Grid per List Page Pattern */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <CardSkeleton count={6} />
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 dark:text-slate-400 font-mono text-xs">
              <div className="max-w-sm mx-auto space-y-3">
                <p>No devices found matching current search criteria.</p>
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
            </div>
          ) : (
            paginatedAssets.map((dev) => (
              <div
                key={dev.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0f1d] hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 group shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-cyan-600 dark:text-cyan-400">
                        <Laptop size={18} />
                      </div>
                      <div>
                        <Link
                          href={`/assets/${dev.assetNumber || dev.id}`}
                          className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors"
                        >
                          {dev.assetNumber}
                        </Link>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                          {dev.brand} {dev.model}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={dev.status} size="sm" />
                  </div>

                  {/* Hardware specs */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-400 block">CPU</span>
                      <span className="text-slate-700 dark:text-slate-300 truncate block font-medium">
                        {dev.specifications?.processor || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">RAM</span>
                      <span className="text-slate-700 dark:text-slate-300 block font-medium">
                        {dev.specifications?.ram || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Storage</span>
                      <span className="text-slate-700 dark:text-slate-300 block font-medium">
                        {dev.specifications?.storage || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Assignment info */}
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <User size={12} className="text-slate-400" />
                        PIC:
                      </span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">
                        {dev.assignment?.assigneeName || 'Unassigned'}
                      </span>
                    </div>
                    {dev.assignment?.departmentCode && (
                      <div className="text-[10px] text-slate-400 text-right mt-0.5">
                        Dept: {dev.assignment.departmentCode}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-mono">
                  {/* PIN Reveal Button */}
                  <button
                    onClick={(e) => handleOpenPinModal(dev.id, dev.assetNumber, e)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-amber-700 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-800 text-[11px] font-medium transition-colors shadow-sm"
                    title="Reveal Encrypted PIN"
                  >
                    <Key size={12} />
                    <span>PIN Vault</span>
                  </button>

                  <Link
                    href={`/assets/${dev.assetNumber || dev.id}`}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 font-medium"
                  >
                    Details <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Assets Pagination */}
        {filtered.length > 0 && (
          <div className="border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden bg-white dark:bg-[#0a0f1d] shadow-sm">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemName="hardware devices"
            />
          </div>
        )}

        {/* Dedicated Secure PIN Reveal Modal */}
        {selectedAssetForPin && (
          <PinRevealModal
            isOpen={pinModalOpen}
            onClose={() => {
              setPinModalOpen(false);
              setSelectedAssetForPin(null);
            }}
            assetId={selectedAssetForPin.id}
            assetNumber={selectedAssetForPin.assetNumber}
            userRole={user?.role}
          />
        )}

        {/* Provision Hardware Asset Modal */}
        <ProvisionDeviceModal
          isOpen={provisionModalOpen}
          onClose={() => setProvisionModalOpen(false)}
          onSuccess={fetchAssets}
        />
      </div>
    </AppShell>
  );
}
