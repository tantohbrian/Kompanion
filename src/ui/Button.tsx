import React from 'react';
import { cn } from './utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors select-none rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

    const variants = {
      primary: 'bg-accent text-white hover:bg-accent-hover active:bg-accent-active',
      secondary:
        'bg-surface-elevated text-text-primary border border-border hover:bg-surface-hover active:bg-surface border-border-subtle',
      ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover',
      destructive:
        'bg-transparent text-status-error border border-status-error/30 hover:bg-status-error/10 active:bg-status-error/20',
    };

    const sizes = {
      sm: 'text-xs h-7 px-2.5 gap-1.5',
      md: 'text-sm h-8 px-3.5 gap-2',
      lg: 'text-base h-10 px-4 gap-2.5',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <span
            className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
