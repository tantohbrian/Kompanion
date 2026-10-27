import React from 'react';
import { cn } from './utils';

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  'aria-label': string; // Mandatory for accessibility per kompanion-ui skill
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = 'ghost',
      size = 'md',
      disabled,
      children,
      type = 'button',
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center transition-colors select-none rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:opacity-40 disabled:pointer-events-none cursor-pointer';

    const variants = {
      primary: 'bg-accent text-white hover:bg-accent-hover active:bg-accent-active',
      secondary:
        'bg-surface-elevated text-text-primary border border-border hover:bg-surface-hover active:bg-surface',
      ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover active:bg-surface-elevated',
      destructive:
        'bg-transparent text-status-error hover:bg-status-error/10 active:bg-status-error/20',
    };

    const sizes = {
      sm: 'w-7 h-7',
      md: 'w-8 h-8',
      lg: 'w-10 h-10',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
