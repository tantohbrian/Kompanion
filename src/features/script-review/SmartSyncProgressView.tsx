import React from 'react';
import { Loader2 } from 'lucide-react';

export interface SmartSyncProgressViewProps {
  status: string;
  percent: number;
}

export const SmartSyncProgressView: React.FC<SmartSyncProgressViewProps> = ({
  status,
  percent,
}) => {
  return (
    <div className="text-center py-12 space-y-4">
      <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
      <div>
        <p className="text-xs font-semibold text-text-primary">{status}</p>
        <p className="text-2xs text-text-tertiary mt-1">{percent}% complete</p>
      </div>
      <div className="w-64 h-1.5 bg-surface-elevated rounded-full mx-auto overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-300 rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
