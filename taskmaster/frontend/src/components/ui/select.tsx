'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'flex h-11 w-full appearance-none rounded-xl border border-glass-border bg-glass-light px-4 py-2 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cosmic-purple/50 focus:border-cosmic-purple disabled:cursor-not-allowed disabled:opacity-50 transition-all cursor-pointer',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="bg-cosmic-dark text-gray-400">
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-cosmic-dark text-white"
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    );
  }
);
Select.displayName = 'Select';

export { Select };
