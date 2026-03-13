'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-x-2.5 rounded-tremor-full bg-background px-2.5 py-1.5 text-tremor-label',
  {
    variants: {
      status: {
        success: '',
        error: '',
        default: '',
      },
    },
    defaultVariants: {
      status: 'default',
    },
  }
);

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  leftLabel: string;
  rightLabel?: string;
}

export function StatusBadge({
  className,
  status,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  leftLabel,
  rightLabel,
  ...props
}: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ status }), className)} {...props}>
      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
        {LeftIcon && (
          <LeftIcon
            className={cn(
              '-ml-0.5 size-4 shrink-0',
              status === 'success' && 'text-[var(--color-success)]',
              status === 'error' && 'text-[var(--color-error)]'
            )}
            aria-hidden={true}
          />
        )}
        {leftLabel}
      </span>
      {rightLabel != null && rightLabel !== '' && (
        <>
          <span className="h-4 w-px bg-border" />
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            {RightIcon && (
              <RightIcon className="-ml-0.5 size-4 shrink-0" aria-hidden={true} />
            )}
            {rightLabel}
          </span>
        </>
      )}
    </span>
  );
}
