import React from 'react';
import { Wand2, AlertTriangle } from 'lucide-react';
import { Button } from '../../ui';
import { ParseDiagnostic } from '../../core/parser/types';

interface ScriptReviewHeaderAlertsProps {
  hasSynced: boolean;
  hasAudioAndNarration: boolean;
  onOpenSmartSync: () => void;
  diagnostics: ParseDiagnostic[];
}

export const ScriptReviewHeaderAlerts: React.FC<ScriptReviewHeaderAlertsProps> = ({
  hasSynced,
  hasAudioAndNarration,
  onOpenSmartSync,
  diagnostics,
}) => {
  return (
    <>
      {!hasSynced && hasAudioAndNarration && (
        <div className="p-4 rounded-panel bg-accent/15 border border-accent/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center text-accent shrink-0">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-text-primary block text-sm">
                Voiceover audio & spoken script segments detected
              </span>
              <p className="text-text-secondary text-2xs mt-0.5 leading-relaxed">
                Run Smart Sync to snap image cuts to the exact spoken words instead of estimated script timestamps.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenSmartSync}
            className="shrink-0 font-semibold"
          >
            <Wand2 className="w-3.5 h-3.5 mr-1.5" />
            Sync Cuts to Audio (Smart Sync)
          </Button>
        </div>
      )}

      {diagnostics.length > 0 && (
        <div className="p-3 bg-surface-elevated border border-border rounded-panel text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-status-warning font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Parser Diagnostics ({diagnostics.length})</span>
          </div>
          <ul className="list-disc pl-5 text-2xs text-text-secondary space-y-0.5">
            {diagnostics.map((d, i) => (
              <li key={i}>{d.message}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};
