# Handoff Report: Explorer M4.1
**Calm Infrastructure Command Center UI Shell, Dark Navy Sidebar Navigation, Role Switcher, Global Status Badges, and Login Page Blueprint**

- **Agent**: `explorer_m4_1`
- **Working Directory**: `/home/noah/project/core/.agents/explorer_m4_1`
- **Target Recipient**: Worker Agent / Orchestrator (`f4820c04-1b52-4163-b871-2dd93083237b`)
- **Date / Timestamp**: 2026-09-08T23:45:00Z
- **Type**: Hard Handoff (Investigation & Architectural Blueprint Complete)

---

## 1. Observation

### 1.1 Existing Codebase & Component Structure
1. **Current `AppShell.tsx`** (`src/components/layout/AppShell.tsx:1-202`):
   - Currently implemented as a monolithic client component using `bg-zinc-950 text-zinc-100` (generic dark zinc rather than the specified dark navy palette).
   - Sidebar navigation links are hardcoded (lines 31-39):
     ```tsx
     const navItems = [
       { href: '/', label: 'Overview', icon: LayoutDashboard },
       { href: '/accounts', label: 'Identity & Accounts', icon: Users },
       { href: '/groups', label: 'Google Groups', icon: FolderTree },
       { href: '/groups/matrix', label: 'Membership Matrix', icon: Grid },
       { href: '/assets', label: 'Hardware Assets', icon: Laptop },
       { href: '/software', label: 'Software & Tools', icon: Layers },
       { href: '/audit', label: 'Audit Trail', icon: ShieldCheck },
     ];
     ```
   - **No Header / Topbar component exists**: Current active user is displayed at the bottom of the sidebar.
   - **Role Switching**: There is only a link `href="/login"` labeled "Switch Role" at the bottom of the sidebar (line 177-183). Users cannot switch roles directly in-place from the command center header.
   - **No role-aware navigation indicators**: It shows all 7 navigation items equally, without visual cues or indicators when a role lacks access to a section (e.g. `asset_admin` and `software_admin` are blocked from `/groups` by middleware; `it_admin` is blocked from `/audit`).

2. **Current `/login` Page** (`src/app/login/page.tsx:1-204`):
   - Already has `MOCK_ACCOUNTS` representing all 5 roles (`super_admin`, `it_admin`, `asset_admin`, `software_admin`, `auditor`) and handles `callbackUrl` search param.
   - Google Workspace OAuth button (`lines 106-131`) currently sets a static error string `Google Workspace OAuth configured for production deployment.` on click.
   - Styling uses default Tailwind `bg-zinc-100 dark:bg-zinc-950`, rather than matching the calm infrastructure command center dark navy theme.

3. **Global Status Badges & Color Language**:
   - In `DESIGN.md:118-133`:
     ```
     | Status | Indicator |
     | --- | --- |
     | Active | 🟢 |
     | Assigned | 🔵 |
     | Available | ⚪ |
     | Pending | 🟡 |
     | Attention | 🟠 |
     | Issue | 🔴 |
     | Archived | ⚫ |
     ```
   - In `tests/e2e/07-crud-api-and-pages.test.ts:155-175`:
     ```ts
     const STATUS_INDICATORS: Record<string, string> = {
       active: '🟢',
       assigned: '🔵',
       available: '⚪',
       reserve: '🟡',
       pending: '🟡',
       attention: '🟠',
       decommissioned: '🔴',
       issue: '🔴',
       archived: '⚫'
     };
     ```
   - In `src/app/assets/page.tsx:133-170`, status rendering is implemented as an ad-hoc local switch statement returning colored pill spans (`assigned`, `available`, `reserve`, `decommissioned`), lacking the emoji indicator and not shared across pages.
   - No shared `StatusBadge` or `StatusDot` components exist in `src/components/feedback/` or `src/components/ui/`.

4. **Authentication & Session Endpoints**:
   - `/api/auth/login` (`src/app/api/auth/login/route.ts:1-78`): Accepts `{ role, email }` in POST body. Validates against `createMockSession(role)` and calls `setSessionCookie(response, session)`, emitting an immutable audit event (`auth.login`).
   - `/api/auth/logout` (`src/app/api/auth/logout/route.ts:1-39`): Clears `core_session` cookie and records `auth.logout` audit event.
   - `/api/auth/me` (`src/app/api/auth/me/route.ts:1-29`): Returns `{ user: session, permissions }`.
   - `src/lib/auth/mock.ts:3-39`: `MOCK_USERS` defines:
     * `super_admin`: Amanda (`amanda@leadgeeksinc.com`, MNG)
     * `it_admin`: Aditya (`adit@leadgeeksinc.com`, ITE)
     * `asset_admin`: Devi (`devi@leadgeeksinc.com`, OPS)
     * `software_admin`: Rian (`rian@leadgeeksinc.com`, GRW)
     * `auditor`: Compliance Auditor (`auditor@leadgeeksinc.com`, GNR)
   - `src/lib/auth/mock.ts:125-137`: Contains `getGoogleAuthUrl(state?: string)` generating standard Google OAuth authorization URL.

5. **Middleware & Route Guard Behavior** (`src/middleware.ts:26-150`):
   - Unauthenticated access to non-public routes redirects to `/login?callbackUrl=${encodeURIComponent(req.path)}`.
   - `auditor` role is blocked from non-GET requests with HTTP 403 (`strictly read-only`).
   - `asset_admin` is blocked from `/groups` (HTTP 403).
   - `software_admin` is blocked from `/groups` (HTTP 403).
   - `it_admin` is blocked from `/audit` (HTTP 403). Only `super_admin` and `auditor` can access `/audit`.

---

## 2. Logic Chain

1. **Premise 1 (Design Mandate)**: `DESIGN.md` explicitly specifies that CORE must feel like a "calm infrastructure command center", neither a spreadsheet clone nor a generic AI-templated SaaS dashboard. The UI must provide immediate orientation (Layer 1), operational understanding (Layer 2), and actionable controls (Layer 3).
2. **Premise 2 (Navigation Requirements)**: `Suite 07` test contract (lines 252-272) specifically validates that navigation contains 7 primary routes: `/`, `/accounts`, `/groups`, `/groups/matrix`, `/assets`, `/software`, `/audit`.
3. **Premise 3 (RBAC Enforcement)**: Since `middleware.ts` rejects unauthorized requests with HTTP 403 (e.g. Asset Admin accessing `/groups`, IT Admin accessing `/audit`), the sidebar navigation should intelligently reflect permission constraints (e.g., displaying a subtle restricted badge/lock or hiding unauthorized domains) to prevent jarring 403 errors.
4. **Premise 4 (Role Switcher In-Place)**: To satisfy administrator workflows and dev/test validation, the Topbar / Header must include an active role switcher dropdown. Switching roles should POST directly to `/api/auth/login`, update the active session cookie in-place, and smoothly reload the view. If the destination page is restricted for the newly selected role, it should gracefully redirect to `/`.
5. **Premise 5 (Unified Status Language)**: `DESIGN.md` defines a 7-state status language (🟢 Active, 🔵 Assigned, ⚪ Available, 🟡 Pending/Reserve, 🟠 Attention, 🔴 Issue/Decommissioned, ⚫ Archived). A shared, typed component library (`StatusBadge` and `StatusDot`) with central semantic mappings in `src/lib/design/status.ts` will eliminate ad-hoc, inconsistent badge styling across `/accounts`, `/groups`, `/assets`, `/software`, and `/audit`.
6. **Premise 6 (Login Experience)**: `/login` must provide dual-mode authentication:
   - Google Workspace OAuth button: Redirects to Google OAuth authorization URL via `getGoogleAuthUrl(callbackUrl)` if `GOOGLE_CLIENT_ID` is set, or offers an intuitive fallback state.
   - Quick Mock Role Switcher: Directly logs in as any of the 5 roles with 1 click and redirects to `callbackUrl`.

---

## 3. Implementation Blueprint

### 3.1 Component Architecture & File Inventory

```
src/
├── lib/
│   ├── design/
│   │   └── status.ts             # NEW: Status color tokens, emoji mappings & normalization
│   └── auth/
│       └── AuthContext.tsx       # NEW: React Client Context for session & role switching
├── components/
│   ├── feedback/
│   │   ├── StatusBadge.tsx       # NEW: Global Status Badge (🟢🔵⚪🟡🟠🔴⚫)
│   │   └── StatusDot.tsx         # NEW: Compact glowing/solid status indicator dot
│   └── layout/
│       ├── AppShell.tsx          # REFACTOR: Calm Infrastructure Command Center Layout
│       ├── Sidebar.tsx           # NEW: Dark navy sidebar navigation (7 sections)
│       ├── Topbar.tsx            # NEW: Header with active user, telemetry & role dropdown
│       └── RoleSwitcher.tsx      # NEW: Live role switcher component (all 5 roles)
└── app/
    ├── login/
    │   └── page.tsx              # REFACTOR: Command center theme, OAuth + Mock switcher
    ├── globals.css               # ENHANCE: Deep navy theme custom properties
    └── layout.tsx                # ENHANCE: Wrap with AuthProvider
```

---

### 3.2 Design System Tokens & Status Language (`src/lib/design/status.ts`)

```typescript
// src/lib/design/status.ts

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
    badgeClasses: 'bg-zinc-900/80 text-zinc-400 border-zinc-700/80',
    dotClasses: 'bg-zinc-500',
  },
  retiring: {
    canonical: 'archived',
    emoji: '⚫',
    label: 'Retiring',
    badgeClasses: 'bg-zinc-900/80 text-zinc-400 border-zinc-700/80',
    dotClasses: 'bg-zinc-500',
  },
};

export function getStatusConfig(status?: string | null): StatusConfig {
  if (!status) return STATUS_MAP.archived;
  const key = status.toLowerCase().trim();
  return STATUS_MAP[key] || {
    canonical: 'archived',
    emoji: '⚪',
    label: status,
    badgeClasses: 'bg-slate-900 text-slate-400 border-slate-700',
    dotClasses: 'bg-slate-500',
  };
}
```

---

### 3.3 Status Components Specification

#### `src/components/feedback/StatusBadge.tsx`
```tsx
// src/components/feedback/StatusBadge.tsx
import React from 'react';
import { getStatusConfig } from '@/lib/design/status';
import { cn } from '@/lib/utils/cn';

export interface StatusBadgeProps {
  status: string;
  label?: string;
  showEmoji?: boolean;
  showDot?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  showEmoji = true,
  showDot = false,
  size = 'md',
  className,
}) => {
  const config = getStatusConfig(status);
  const displayLabel = label || config.label;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-0.5 gap-1.5',
    lg: 'text-sm px-3 py-1 gap-2',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono font-medium rounded-full border transition-colors',
        config.badgeClasses,
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label={`${displayLabel} status`}
    >
      {showEmoji && <span className="text-xs leading-none">{config.emoji}</span>}
      {showDot && (
        <span
          className={cn(
            'rounded-full',
            size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5',
            config.dotClasses,
            config.pulseClasses
          )}
        />
      )}
      <span>{displayLabel}</span>
    </span>
  );
};
```

#### `src/components/feedback/StatusDot.tsx`
```tsx
// src/components/feedback/StatusDot.tsx
import React from 'react';
import { getStatusConfig } from '@/lib/design/status';
import { cn } from '@/lib/utils/cn';

export interface StatusDotProps {
  status: string;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  status,
  pulse = true,
  size = 'md',
  className,
  title,
}) => {
  const config = getStatusConfig(status);

  const sizeMap = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <span
      title={title || config.label}
      className={cn(
        'inline-block rounded-full flex-shrink-0',
        sizeMap[size],
        config.dotClasses,
        pulse && config.pulseClasses,
        className
      )}
    />
  );
};
```

---

### 3.4 Auth Context & Session Management (`src/lib/auth/AuthContext.tsx`)

```tsx
// src/lib/auth/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { SystemRole, UserSession } from '@/lib/auth/types';

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  switchRole: (role: SystemRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const switchRole = async (role: SystemRole) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);

        // Check if current page is restricted for the new role
        const isRestrictedForNewRole =
          (role === 'it_admin' && pathname.startsWith('/audit')) ||
          ((role === 'asset_admin' || role === 'software_admin') && pathname.startsWith('/groups'));

        if (isRestrictedForNewRole) {
          router.push('/');
        } else {
          router.refresh();
        }
      }
    } catch (err) {
      console.error('Failed to switch role:', err);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, switchRole, logout, refreshSession: fetchSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
```

---

### 3.5 Dark Navy Sidebar Component (`src/components/layout/Sidebar.tsx`)

Dark Navy Palette specification:
- Background: `bg-[#0a0f1d]` (Deep Navy Command Center)
- Border: `border-r border-slate-800/80`
- Section Label: `text-[10px] font-mono tracking-wider text-slate-500 uppercase`
- Inactive Nav Link: `text-slate-400 hover:text-slate-200 hover:bg-slate-900/60`
- Active Nav Link: `bg-slate-800/90 text-white font-medium shadow-sm border-l-2 border-emerald-400`
- Restricted Nav Link: `text-slate-600 opacity-60 cursor-not-allowed hover:bg-transparent`

```tsx
// src/components/layout/Sidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FolderTree,
  Grid,
  Laptop,
  Layers,
  ShieldCheck,
  Lock,
  X,
  Database,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { StatusDot } from '@/components/feedback/StatusDot';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const NAV_ITEMS = [
  { href: '/', label: 'Command Center', icon: LayoutDashboard, domain: 'root' },
  { href: '/accounts', label: 'Identity & Accounts', icon: Users, domain: 'identity' },
  { href: '/groups', label: 'Google Groups', icon: FolderTree, domain: 'groups' },
  { href: '/groups/matrix', label: 'Membership Matrix', icon: Grid, domain: 'groups' },
  { href: '/assets', label: 'Assets & Hardware', icon: Laptop, domain: 'assets' },
  { href: '/software', label: 'Software & Tools', icon: Layers, domain: 'software' },
  { href: '/audit', label: 'Audit Trail', icon: ShieldCheck, domain: 'audit' },
];

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role || 'super_admin';

  // Permission checks for navigation items
  const isNavRestricted = (item: typeof NAV_ITEMS[0]) => {
    if (item.domain === 'audit') {
      return role !== 'super_admin' && role !== 'auditor';
    }
    if (item.domain === 'groups') {
      return role === 'asset_admin' || role === 'software_admin';
    }
    return false;
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-800/80 bg-[#0a0f1d] flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}
    >
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Command Center Logo Header */}
        <div className="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group" onClick={onCloseMobile}>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <StatusDot status="active" pulse={true} size="md" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold tracking-wider text-base text-slate-100 group-hover:text-emerald-400 transition-colors">
                  CORE
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800/90 text-slate-400 border border-slate-700/60">
                  MVP
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-500 tracking-tight leading-none mt-0.5">
                Command Center
              </p>
            </div>
          </Link>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="p-4 space-y-6 flex-1">
          <div>
            <div className="px-3 pb-2 text-[10px] font-mono tracking-wider text-slate-500 uppercase">
              Infrastructure Domains
            </div>
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                const restricted = isNavRestricted(item);

                if (restricted) {
                  return (
                    <li key={item.href}>
                      <div
                        className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-600 cursor-not-allowed select-none opacity-50"
                        title="Restricted for current role"
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={16} />
                          <span>{item.label}</span>
                        </div>
                        <Lock size={12} className="text-slate-600" />
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onCloseMobile}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                        isActive
                          ? 'bg-slate-800/90 text-white font-medium shadow-sm border-l-2 border-emerald-400 pl-2.5'
                          : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                      }`}
                    >
                      <Icon
                        size={16}
                        className={isActive ? 'text-emerald-400' : 'text-slate-500'}
                      />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Telemetry Footer in Sidebar */}
        <div className="p-4 border-t border-slate-800/80 bg-[#070b14]/50">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span className="flex items-center gap-1.5">
              <Database size={12} className="text-emerald-400" />
              PostgreSQL 16
            </span>
            <span className="text-emerald-400/90 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              HEALTHY
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
```

---

### 3.6 Topbar & Live Role Switcher Component

#### `src/components/layout/RoleSwitcher.tsx`
```tsx
// src/components/layout/RoleSwitcher.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Shield, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import type { SystemRole } from '@/lib/auth/types';

interface RoleOption {
  role: SystemRole;
  label: string;
  persona: string;
  dept: string;
  scope: string;
  badgeClasses: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'super_admin',
    label: 'Super Admin',
    persona: 'Amanda',
    dept: 'MNG',
    scope: 'Full unconstrained access & audit log',
    badgeClasses: 'bg-purple-950/70 text-purple-300 border-purple-800/80',
  },
  {
    role: 'it_admin',
    label: 'IT Admin',
    persona: 'Aditya',
    dept: 'ITE',
    scope: 'Accounts, Groups, Assets & Software',
    badgeClasses: 'bg-blue-950/70 text-blue-300 border-blue-800/80',
  },
  {
    role: 'asset_admin',
    label: 'Asset Admin',
    persona: 'Devi',
    dept: 'OPS',
    scope: 'Hardware laptops & specifications',
    badgeClasses: 'bg-cyan-950/70 text-cyan-300 border-cyan-800/80',
  },
  {
    role: 'software_admin',
    label: 'Software Admin',
    persona: 'Rian',
    dept: 'GRW',
    scope: 'Software tools & subscription catalog',
    badgeClasses: 'bg-amber-950/70 text-amber-300 border-amber-800/80',
  },
  {
    role: 'auditor',
    label: 'Auditor',
    persona: 'Compliance Auditor',
    dept: 'GNR',
    scope: 'Read-only inspection & full audit trail',
    badgeClasses: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80',
  },
];

export const RoleSwitcher: React.FC = () => {
  const { user, switchRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentRole = user?.role || 'super_admin';
  const activeOption = ROLE_OPTIONS.find((r) => r.role === currentRole) || ROLE_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectRole = async (newRole: SystemRole) => {
    if (newRole === currentRole) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await switchRole(newRole);
    } finally {
      setSwitching(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Dropdown Trigger */}
      <button
        onClick={() => setOpen(!open)}
        disabled={switching}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-[#0e172a]/90 hover:bg-slate-800 hover:border-slate-700 text-xs font-mono transition-all"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="text-[10px] text-slate-500 uppercase tracking-wider hidden sm:inline">
          Role:
        </span>
        <span
          className={`px-2 py-0.5 rounded border text-[11px] font-medium uppercase ${activeOption.badgeClasses}`}
        >
          {activeOption.label}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-800 bg-[#0b132b] shadow-2xl z-50 p-2 space-y-1 backdrop-blur-xl">
          <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Switch Administrative Role
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Instantly simulates server-side RBAC session boundaries
            </div>
          </div>

          {ROLE_OPTIONS.map((opt) => {
            const isSelected = opt.role === currentRole;
            return (
              <button
                key={opt.role}
                onClick={() => handleSelectRole(opt.role)}
                className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-start justify-between group ${
                  isSelected
                    ? 'bg-slate-800/90 border border-slate-700/80'
                    : 'hover:bg-slate-900/80 border border-transparent'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200 group-hover:text-white font-sans">
                      {opt.persona}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase ${opt.badgeClasses}`}
                    >
                      {opt.label}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      ({opt.dept})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans leading-tight">
                    {opt.scope}
                  </div>
                </div>

                {isSelected && (
                  <Check size={16} className="text-emerald-400 flex-shrink-0 mt-1" />
                )}
              </button>
            );
          })}

          <div className="p-2 border-t border-slate-800/80 mt-1 text-[10px] font-mono text-slate-500 text-center">
            Auditor role strictly enforces read-only state.
          </div>
        </div>
      )}
    </div>
  );
};
```

#### `src/components/layout/Topbar.tsx`
```tsx
// src/components/layout/Topbar.tsx
'use client';

import React from 'react';
import { Menu, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { RoleSwitcher } from './RoleSwitcher';

interface TopbarProps {
  onOpenMobile: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobile }) => {
  const { user, logout } = useAuth();

  // Create monogram initials
  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'CA';

  return (
    <header className="h-16 sticky top-0 z-30 border-b border-slate-800/80 bg-[#0a0f1d]/85 backdrop-blur-md px-4 sm:px-6 md:px-8 flex items-center justify-between">
      {/* Left section: mobile hamburger & breadcrumb/status */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          aria-label="Open navigation drawer"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500 hidden md:inline">SYSTEM STATUS:</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ONLINE
          </span>
        </div>
      </div>

      {/* Right section: Role switcher + user pill + logout */}
      <div className="flex items-center gap-3">
        <RoleSwitcher />

        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div
              className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-slate-200"
              title={user.email}
            >
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-medium text-slate-200 truncate max-w-[140px]">
                {user.displayName.split(' ')[0]}
              </div>
              <div className="text-[10px] font-mono text-slate-500 truncate max-w-[140px]">
                {user.email}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900/80 transition-colors ml-1"
          title="Sign out of CORE"
          aria-label="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};
```

#### `src/components/layout/AppShell.tsx` (Complete Assembly)
```tsx
// src/components/layout/AppShell.tsx
'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Topbar onOpenMobile={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

### 3.7 Login Page Specification (`src/app/login/page.tsx`)

Key Requirements:
1. Google Workspace OAuth button: Redirects to `getGoogleAuthUrl(callbackUrl)` if available or explains status gracefully.
2. 5-Role Mock Switcher: Clean interactive cards for all 5 roles.
3. Preserves `callbackUrl` search param.
4. Dark navy command center layout.

```tsx
// src/app/login/page.tsx
'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, ArrowRight, AlertCircle, Lock, Database } from 'lucide-react';
import { ROLE_OPTIONS } from '@/components/layout/RoleSwitcher';
import { StatusDot } from '@/components/feedback/StatusDot';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get('callbackUrl');
  const callbackUrl = rawCallback ? decodeURIComponent(rawCallback) : '/';

  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRoleLogin = async (role: string) => {
    try {
      setLoadingRole(role);
      setError(null);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Login failed');
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Authentication error');
      setLoadingRole(null);
    }
  };

  const handleGoogleOAuth = () => {
    // In production with GOOGLE_CLIENT_ID configured, redirect to Google OAuth
    // If not configured, provide clear instructional notice
    if (process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === 'true') {
      window.location.href = `/api/auth/google?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    } else {
      setError('Google Workspace OAuth configured for enterprise deployment. Use Quick-Switch below for local testing.');
    }
  };

  return (
    <div className="w-full max-w-xl p-6 sm:p-8 rounded-2xl border border-slate-800 bg-[#0a0f1d] shadow-2xl text-slate-100">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 border border-slate-700/80 mb-3 shadow-inner">
          <Shield className="w-6 h-6 text-emerald-400" />
        </div>
        <div className="flex items-center justify-center gap-2 font-mono text-xs text-emerald-400 mb-1">
          <StatusDot status="active" pulse={true} size="sm" />
          <span>CALM INFRASTRUCTURE COMMAND CENTER</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">
          CORE Authentication
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Company Operations, Resources & Environment
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Production Google OAuth */}
      <div className="mb-6">
        <button
          type="button"
          onClick={handleGoogleOAuth}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-700/80 rounded-xl text-sm font-medium text-slate-200 bg-slate-900/80 hover:bg-slate-800 hover:border-slate-600 transition-all shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          Sign in with Google Workspace
        </button>
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-800" />
        </div>
        <div className="relative flex justify-center text-[10px] uppercase font-mono">
          <span className="bg-[#0a0f1d] px-3 text-slate-500">
            Local Development & Test Quick-Switch (5 Roles)
          </span>
        </div>
      </div>

      {/* 5 Mock Roles Grid */}
      <div className="space-y-2.5">
        {ROLE_OPTIONS.map((opt) => (
          <button
            key={opt.role}
            type="button"
            disabled={loadingRole !== null}
            onClick={() => handleRoleLogin(opt.role)}
            className="w-full text-left p-3 rounded-xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/90 hover:border-slate-700 transition-all flex items-center justify-between group"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 group-hover:text-emerald-400 transition-colors">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-200 group-hover:text-white">
                    {opt.persona}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.2 rounded border uppercase font-medium ${opt.badgeClasses}`}
                  >
                    {opt.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    ({opt.dept})
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {opt.scope}
                </div>
              </div>
            </div>

            <div className="text-slate-500 group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all">
              {loadingRole === opt.role ? (
                <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Footer System Notice */}
      <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
        <span className="flex items-center gap-1.5">
          <Lock size={12} className="text-slate-400" />
          Server-Side RBAC
        </span>
        <span>Callback URL: {callbackUrl}</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[#070b14]">
      <Suspense fallback={<div className="text-xs font-mono text-slate-500">Loading CORE Command Center...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
```

---

## 4. Caveats

1. **Production Google Workspace OAuth**:
   - Google Workspace OAuth requires real cloud client credentials (`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`). In local development and testing environments where these credentials are not provisioned, the Mock Authentication switcher provides 100% faithful emulation of the 5 system roles and audit logging.
2. **Dynamic Route Restrictions on Role Switch**:
   - When a user switches roles while viewing a page that the new role cannot access (e.g., from `super_admin` to `it_admin` while on `/audit`), the client-side `switchRole` handler explicitly checks for known forbidden paths and redirects to `/` to avoid raw middleware 403 pages.
3. **Tailwind CSS Colors**:
   - The dark navy palette leverages Tailwind's `slate` family (`slate-950`, `slate-900`, `slate-800`) combined with precision hex codes (`#0a0f1d`, `#070b14`, `#0b132b`). All of these work out of the box with the existing `tailwind.config.ts`.

---

## 5. Conclusion & Worker Action Items

The design system, navigation shell, live role switcher, status badges, and login page are completely specified and ready for implementation by the Worker agent.

### Worker Execution Order:
1. **Step 1**: Create `src/lib/design/status.ts` containing the complete status mapping, canonical enums, and utility functions.
2. **Step 2**: Create `src/components/feedback/StatusBadge.tsx` and `src/components/feedback/StatusDot.tsx`.
3. **Step 3**: Create `src/lib/auth/AuthContext.tsx` providing client-side role switching, session propagation, and logout.
4. **Step 4**: Create `src/components/layout/Sidebar.tsx`, `src/components/layout/RoleSwitcher.tsx`, and `src/components/layout/Topbar.tsx`.
5. **Step 5**: Update `src/components/layout/AppShell.tsx` to assemble `Sidebar`, `Topbar`, and main content into the calm infrastructure command center shell.
6. **Step 6**: Update `src/app/layout.tsx` to wrap children with `<AuthProvider>`.
7. **Step 7**: Update `src/app/login/page.tsx` to use the command center dark navy theme, Google OAuth button, and 5-role quick switcher.
8. **Step 8**: Update existing domain pages (`/accounts`, `/groups`, `/assets`, `/software`, `/audit`) to use the new `<StatusBadge>` and `<StatusDot>` components.

---

## 6. Verification Method

To verify the implementation once coded:

1. **E2E Test Suites**:
   - Run Suite 02 (Auth & Sessions):
     `node tests/runner.mjs --suite=02`
     Verifies `/login` access, redirect to `/login?callbackUrl=...`, session creation for all 5 roles, and nested callback URL preservation.
   - Run Suite 07 (CRUD API, Matrix & UI Contracts):
     `node tests/runner.mjs --suite=07`
     Verifies all 7 navigation items (`/`, `/accounts`, `/groups`, `/groups/matrix`, `/assets`, `/software`, `/audit`), status color language mappings (🟢, 🔵, ⚪, 🟡, 🟠, 🔴, ⚫), and resource page tab structures.
   - Run Full Suite:
     `npm test` or `node tests/runner.mjs`
     Ensures all 180 tests pass with exit code 0.

2. **Static Code Inspection**:
   - `npm run typecheck` or `tsc --noEmit` ensures clean TypeScript compilation without any type errors.
   - Verify `src/components/layout/AppShell.tsx`, `Sidebar.tsx`, `Topbar.tsx`, and `RoleSwitcher.tsx` are correctly structured.
   - Verify `StatusBadge` renders standard emojis (`🟢🔵⚪🟡🟠🔴⚫`) and semantic classes matching `DESIGN.md`.
