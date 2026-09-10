// src/components/feedback/Skeleton.tsx
'use client';

import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 6, cols = 6 }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={`skel-row-${rIdx}`} className="animate-pulse border-b border-slate-800/40">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={`skel-cell-${rIdx}-${cIdx}`} className="py-3.5 px-4">
              <div
                className="h-3.5 bg-slate-800/70 rounded"
                style={{
                  width: cIdx === 0 ? '75%' : cIdx === 1 ? '90%' : cIdx === cols - 1 ? '40%' : '60%',
                }}
              />
              {cIdx === 0 && (
                <div className="h-2.5 bg-slate-800/40 rounded w-1/2 mt-1.5" />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

interface CardSkeletonProps {
  count?: number;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ count = 6 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={`skel-card-${idx}`}
          className="p-5 rounded-xl border border-slate-800/80 bg-[#0a0f1d] animate-pulse flex flex-col justify-between space-y-4 shadow-sm"
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-slate-800/80" />
                <div className="space-y-1.5">
                  <div className="w-24 h-4 bg-slate-800 rounded" />
                  <div className="w-32 h-3 bg-slate-800/60 rounded" />
                </div>
              </div>
              <div className="w-16 h-5 rounded-full bg-slate-800/60" />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/40">
              <div className="h-6 bg-slate-800/40 rounded" />
              <div className="h-6 bg-slate-800/40 rounded" />
              <div className="h-6 bg-slate-800/40 rounded" />
            </div>

            <div className="pt-2 border-t border-slate-800/40 flex items-center justify-between">
              <div className="w-20 h-3 bg-slate-800/50 rounded" />
              <div className="w-16 h-3 bg-slate-800/50 rounded" />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/40 flex items-center justify-between">
            <div className="w-16 h-6 bg-slate-800/60 rounded" />
            <div className="w-14 h-4 bg-slate-800/60 rounded" />
          </div>
        </div>
      ))}
    </>
  );
};

export const DetailSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2 w-48 h-3 bg-slate-800/60 rounded" />

      {/* Header Summary Card skeleton */}
      <div className="p-6 rounded-xl border border-slate-800 bg-[#0a0f1d] space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800/80" />
              <div className="space-y-1.5">
                <div className="w-48 h-6 bg-slate-800 rounded" />
                <div className="w-32 h-3 bg-slate-800/60 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-4 pt-1">
              <div className="w-28 h-3.5 bg-slate-800/50 rounded" />
              <div className="w-36 h-3.5 bg-slate-800/50 rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-24 h-8 bg-slate-800 rounded-lg" />
            <div className="w-20 h-8 bg-slate-800 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Tab bar skeleton */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-px">
        <div className="w-24 h-8 bg-slate-800/70 rounded-t" />
        <div className="w-28 h-8 bg-slate-800/40 rounded-t" />
        <div className="w-32 h-8 bg-slate-800/40 rounded-t" />
      </div>

      {/* Content panel skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded-xl border border-slate-800 bg-[#0a0f1d] h-64" />
        <div className="p-5 rounded-xl border border-slate-800 bg-[#0a0f1d] h-64" />
      </div>
    </div>
  );
};
