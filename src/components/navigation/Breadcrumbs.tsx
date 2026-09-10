// src/components/navigation/Breadcrumbs.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center ${className}`}>
      <ol className="flex items-center gap-1.5 text-xs font-mono flex-wrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1 || item.current;
          const isFirst = index === 0;

          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight
                  size={12}
                  className="text-slate-600 shrink-0 select-none"
                  aria-hidden="true"
                />
              )}

              {isLast ? (
                <span
                  className="text-slate-200 font-semibold truncate max-w-[200px] sm:max-w-xs"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 rounded px-1 -mx-1"
                >
                  {isFirst && <Home size={12} className="text-slate-500 hover:text-emerald-400 transition-colors" />}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span className="text-slate-400">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
