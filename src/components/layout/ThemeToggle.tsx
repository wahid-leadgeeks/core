// src/components/layout/ThemeToggle.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check, ChevronDown } from 'lucide-react';
import { useTheme, type ThemeMode } from '@/lib/theme/ThemeContext';

export interface ThemeToggleProps {
  variant?: 'dropdown' | 'icon-only';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'dropdown', className = '' }) => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const options: { mode: ThemeMode; label: string; icon: React.ElementType; description: string }[] = [
    {
      mode: 'light',
      label: 'Light',
      icon: Sun,
      description: 'High-contrast calm daylight mode',
    },
    {
      mode: 'dark',
      label: 'Dark',
      icon: Moon,
      description: 'Obsidian command center mode',
    },
    {
      mode: 'system',
      label: 'System',
      icon: Laptop,
      description: 'Synchronize with OS appearance',
    },
  ];

  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun;

  if (variant === 'icon-only') {
    return (
      <button
        onClick={toggleTheme}
        className={`p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${className}`}
        title={`Current mode: ${resolvedTheme}. Click to switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode.`}
        aria-label={`Toggle color theme (currently ${resolvedTheme})`}
      >
        <CurrentIcon size={16} className="transition-transform duration-200" />
      </button>
    );
  }

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e172a]/90 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-sm"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Theme selector (current: ${theme}, resolved: ${resolvedTheme})`}
        title={`Theme: ${theme.toUpperCase()} (${resolvedTheme} mode)`}
      >
        <CurrentIcon size={14} className="text-emerald-600 dark:text-emerald-400" />
        <span className="capitalize hidden sm:inline">{theme}</span>
        <ChevronDown
          size={12}
          className={`text-slate-400 dark:text-slate-500 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b132b] shadow-xl z-50 p-1.5 space-y-0.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800/80 mb-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
              Interface Appearance
            </div>
          </div>

          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.mode;

            return (
              <button
                key={opt.mode}
                onClick={() => {
                  setTheme(opt.mode);
                  setOpen(false);
                }}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all flex items-center justify-between group ${
                  isSelected
                    ? 'bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-white font-medium'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/80 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    size={15}
                    className={
                      isSelected
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    }
                  />
                  <div>
                    <div className="leading-tight font-medium">{opt.label}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal leading-tight mt-0.5">
                      {opt.description}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <Check size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
