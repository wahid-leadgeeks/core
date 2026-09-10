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
