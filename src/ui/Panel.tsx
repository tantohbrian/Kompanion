import React from 'react';
import { cn } from './utils';

export interface PanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ title, headerAction, children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col bg-surface border border-border rounded-panel overflow-hidden',
          className
        )}
        {...props}
      >
        {(title || headerAction) && (
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-border bg-surface-elevated/50 shrink-0">
            {typeof title === 'string' ? (
              <h2 className="text-xs font-semibold text-text-primary tracking-tight">
                {title}
              </h2>
            ) : (
              title
            )}
            {headerAction && <div>{headerAction}</div>}
          </div>
        )}
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    );
  }
);

Panel.displayName = 'Panel';
