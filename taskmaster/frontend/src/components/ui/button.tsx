import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[var(--theme-primary)] text-white hover:opacity-90 shadow-[0_0_15px_var(--theme-glow1)]',
        destructive: 'bg-status-error text-white hover:bg-status-error/90',
        outline: 'border border-glass-border bg-glass-light/30 backdrop-blur-sm text-foreground hover:bg-glass-light/50 hover:border-[var(--theme-primary)]/50',
        secondary: 'bg-glass-light/40 backdrop-blur-sm text-foreground hover:bg-glass-light/60',
        ghost: 'hover:bg-glass-light/50 text-foreground',
        link: 'text-[var(--theme-primary)] underline-offset-4 hover:underline',
        glass: 'glass hover:bg-glass-medium',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-12 rounded-xl px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
