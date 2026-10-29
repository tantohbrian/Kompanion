import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '../../ui';
import { SyncConfig } from '../../core/sync/syncConfig';
import { SyncProviderSelector } from './SyncProviderSelector';

export interface SmartSyncErrorViewProps {
  errorMessage: string;
  config: SyncConfig;
  onConfigChange: (c: SyncConfig) => void;
  onFallbackToLocal: () => void;
  onBack: () => void;
  onRetry: () => void;
}

export const SmartSyncErrorView: React.FC<SmartSyncErrorViewProps> = ({
  errorMessage,
  config,
  onConfigChange,
  onFallbackToLocal,
  onBack,
  onRetry,
}) => {
  return (
    <div className="py-6 space-y-4">
      <div className="bg-status-error/10 border border-status-error/30 rounded-panel p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-status-error shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-text-primary">Alignment Failed</h4>
          <p className="text-2xs text-text-secondary">{errorMessage}</p>
        </div>
      </div>
      <SyncProviderSelector
        config={config}
        onChange={onConfigChange}
        onFallbackToLocal={onFallbackToLocal}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" size="sm" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" size="sm" onClick={onRetry}>
          Retry Alignment
        </Button>
      </div>
    </div>
  );
};
