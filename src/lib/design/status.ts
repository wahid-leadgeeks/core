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
    badgeClasses: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80',
    dotClasses: 'bg-emerald-400',
    pulseClasses: 'shadow-[0_0_8px_rgba(16,185,129,0.5)]',
  },
  assigned: {
    canonical: 'assigned',
    emoji: '🔵',
    label: 'Assigned',
    badgeClasses: 'bg-sky-950/60 text-sky-300 border-sky-800/80',
    dotClasses: 'bg-sky-400',
    pulseClasses: 'shadow-[0_0_8px_rgba(14,165,233,0.5)]',
  },
  available: {
    canonical: 'available',
    emoji: '⚪',
    label: 'Available',
    badgeClasses: 'bg-slate-900/80 text-slate-300 border-slate-700/80',
    dotClasses: 'bg-slate-300',
    pulseClasses: 'shadow-[0_0_8px_rgba(203,213,225,0.4)]',
  },
  pending: {
    canonical: 'pending',
    emoji: '🟡',
    label: 'Pending',
    badgeClasses: 'bg-amber-950/60 text-amber-300 border-amber-800/80',
    dotClasses: 'bg-amber-400',
    pulseClasses: 'shadow-[0_0_8px_rgba(245,158,11,0.5)]',
  },
  reserve: {
    canonical: 'reserve',
    emoji: '🟡',
    label: 'Reserve',
    badgeClasses: 'bg-amber-950/60 text-amber-300 border-amber-800/80',
    dotClasses: 'bg-amber-400',
    pulseClasses: 'shadow-[0_0_8px_rgba(245,158,11,0.5)]',
  },
  evaluating: {
    canonical: 'pending',
    emoji: '🟡',
    label: 'Evaluating',
    badgeClasses: 'bg-amber-950/60 text-amber-300 border-amber-800/80',
    dotClasses: 'bg-amber-400',
  },
  attention: {
    canonical: 'attention',
    emoji: '🟠',
    label: 'Attention',
    badgeClasses: 'bg-orange-950/60 text-orange-300 border-orange-800/80',
    dotClasses: 'bg-orange-400',
    pulseClasses: 'shadow-[0_0_8px_rgba(249,115,22,0.5)]',
  },
  suspended: {
    canonical: 'attention',
    emoji: '🟠',
    label: 'Suspended',
    badgeClasses: 'bg-orange-950/60 text-orange-300 border-orange-800/80',
    dotClasses: 'bg-orange-400',
  },
  deprecated: {
    canonical: 'attention',
    emoji: '🟠',
    label: 'Deprecated',
    badgeClasses: 'bg-orange-950/60 text-orange-300 border-orange-800/80',
    dotClasses: 'bg-orange-400',
  },
  issue: {
    canonical: 'issue',
    emoji: '🔴',
    label: 'Issue',
    badgeClasses: 'bg-rose-950/60 text-rose-300 border-rose-800/80',
    dotClasses: 'bg-rose-400',
    pulseClasses: 'shadow-[0_0_8px_rgba(244,63,94,0.5)]',
  },
  decommissioned: {
    canonical: 'decommissioned',
    emoji: '🔴',
    label: 'Decommissioned',
    badgeClasses: 'bg-rose-950/60 text-rose-300 border-rose-800/80',
    dotClasses: 'bg-rose-400',
    pulseClasses: 'shadow-[0_0_8px_rgba(244,63,94,0.5)]',
  },
  failed: {
    canonical: 'issue',
    emoji: '🔴',
    label: 'Failed',
    badgeClasses: 'bg-rose-950/60 text-rose-300 border-rose-800/80',
    dotClasses: 'bg-rose-400',
  },
  archived: {
    canonical: 'archived',
    emoji: '⚫',
    label: 'Archived',
    badgeClasses: 'bg-slate-900/80 text-slate-400 border-slate-700/80',
    dotClasses: 'bg-slate-500',
  },
  retiring: {
    canonical: 'archived',
    emoji: '⚫',
    label: 'Retiring',
    badgeClasses: 'bg-slate-900/80 text-slate-400 border-slate-700/80',
    dotClasses: 'bg-slate-500',
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
      badgeClasses: 'bg-slate-900 text-slate-400 border-slate-700',
      dotClasses: 'bg-slate-500',
    }
  );
}
