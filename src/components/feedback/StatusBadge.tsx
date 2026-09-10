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
  showEmoji = false,
  showDot = true,
  size = 'md',
  className,
}) => {
  const config = getStatusConfig(status);
  const displayLabel = label || config.label;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1.5',
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
      {showEmoji && <span className="text-xs leading-none" aria-hidden="true">{config.emoji}</span>}
      {showDot && (
        <span
          className={cn(
            'rounded-full shrink-0',
            size === 'sm' ? 'w-1.5 h-1.5' : size === 'lg' ? 'w-2.5 h-2.5' : 'w-2 h-2',
            config.dotClasses,
            config.pulseClasses
          )}
          aria-hidden="true"
        />
      )}
      <span>{displayLabel}</span>
    </span>
  );
};
