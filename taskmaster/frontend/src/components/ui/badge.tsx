'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-cosmic-purple/20 text-cosmic-purple',
        success: 'bg-status-success/20 text-status-success',
        warning: 'bg-status-warning/20 text-status-warning',
        error: 'bg-status-error/20 text-status-error',
        info: 'bg-cosmic-blue/20 text-cosmic-blue',
        gray: 'bg-gray-500/20 text-gray-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
