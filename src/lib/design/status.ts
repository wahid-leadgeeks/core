// src/lib/design/status.ts
// Central Status Language tokens and mapping per DESIGN.md

export type CanonicalStatus =
  | 'active'
  | 'assigned'
  | 'available'
  | 'pending'
  | 'reserve'
  | 'attention'
  | 'issue'
  | 'decommissioned'
  | 'archived';

export interface StatusConfig {
  canonical: CanonicalStatus;
  emoji: string;
  label: string;
  badgeClasses: string;
  dotClasses: string;
  pulseClasses?: string;
}

export const STATUS_MAP: Record<string, StatusConfig> = {
  active: {
    canonical: 'active',
    emoji: '🟢',
    label: 'Active',
    badgeClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80',
    dotClasses: 'bg-emerald-500 dark:bg-emerald-400',
    pulseClasses: 'shadow-[0_0_8px_rgba(16,185,129,0.5)]',
  },
  assigned: {
    canonical: 'assigned',
    emoji: '🔵',
    label: 'Assigned',
    badgeClasses: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/80',
    dotClasses: 'bg-sky-500 dark:bg-sky-400',
    pulseClasses: 'shadow-[0_0_8px_rgba(14,165,233,0.5)]',
  },
  available: {
    canonical: 'available',
    emoji: '⚪',
    label: 'Available',
    badgeClasses: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900/80 dark:text-slate-300 dark:border-slate-700/80',
    dotClasses: 'bg-slate-500 dark:bg-slate-300',
    pulseClasses: 'shadow-[0_0_8px_rgba(203,213,225,0.4)]',
  },
  pending: {
    canonical: 'pending',
    emoji: '🟡',
    label: 'Pending',
    badgeClasses: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80',
    dotClasses: 'bg-amber-500 dark:bg-amber-400',
    pulseClasses: 'shadow-[0_0_8px_rgba(245,158,11,0.5)]',
  },
  reserve: {
    canonical: 'reserve',
    emoji: '🟡',
    label: 'Reserve',
    badgeClasses: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80',
    dotClasses: 'bg-amber-500 dark:bg-amber-400',
    pulseClasses: 'shadow-[0_0_8px_rgba(245,158,11,0.5)]',
  },
  evaluating: {
    canonical: 'pending',
    emoji: '🟡',
    label: 'Evaluating',
    badgeClasses: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80',
    dotClasses: 'bg-amber-500 dark:bg-amber-400',
  },
  attention: {
    canonical: 'attention',
    emoji: '🟠',
    label: 'Attention',
    badgeClasses: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/80',
    dotClasses: 'bg-orange-500 dark:bg-orange-400',
    pulseClasses: 'shadow-[0_0_8px_rgba(249,115,22,0.5)]',
  },
  suspended: {
    canonical: 'attention',
    emoji: '🟠',
    label: 'Suspended',
    badgeClasses: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/80',
    dotClasses: 'bg-orange-500 dark:bg-orange-400',
  },
  deprecated: {
    canonical: 'attention',
    emoji: '🟠',
    label: 'Deprecated',
    badgeClasses: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/80',
    dotClasses: 'bg-orange-500 dark:bg-orange-400',
  },
  issue: {
    canonical: 'issue',
    emoji: '🔴',
    label: 'Issue',
    badgeClasses: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/80',
    dotClasses: 'bg-rose-500 dark:bg-rose-400',
    pulseClasses: 'shadow-[0_0_8px_rgba(244,63,94,0.5)]',
  },
  decommissioned: {
    canonical: 'decommissioned',
    emoji: '🔴',
    label: 'Decommissioned',
    badgeClasses: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/80',
    dotClasses: 'bg-rose-500 dark:bg-rose-400',
    pulseClasses: 'shadow-[0_0_8px_rgba(244,63,94,0.5)]',
  },
  failed: {
    canonical: 'issue',
    emoji: '🔴',
    label: 'Failed',
    badgeClasses: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/80',
    dotClasses: 'bg-rose-500 dark:bg-rose-400',
  },
  archived: {
    canonical: 'archived',
    emoji: '⚫',
    label: 'Archived',
    badgeClasses: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900/80 dark:text-slate-400 dark:border-slate-700/80',
    dotClasses: 'bg-slate-400 dark:bg-slate-500',
  },
  retiring: {
    canonical: 'archived',
    emoji: '⚫',
    label: 'Retiring',
    badgeClasses: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900/80 dark:text-slate-400 dark:border-slate-700/80',
    dotClasses: 'bg-slate-400 dark:bg-slate-500',
  },
};

export function getStatusConfig(status?: string | null): StatusConfig {
  if (!status) return STATUS_MAP.archived;
  const key = status.toLowerCase().trim();
  return (
    STATUS_MAP[key] || {
      canonical: 'archived',
      emoji: '⚪',
      label: status,
      badgeClasses: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700',
      dotClasses: 'bg-slate-400 dark:bg-slate-500',
    }
  );
}
