import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../../ui';
import { ExportProgress } from '../../core/export/types';

interface Props {
  progress: ExportProgress;
  onCancel: () => void;
}

export const ExportProgressView: React.FC<Props> = ({ progress, onCancel }) => {
  return (
    <div className="py-6 space-y-4">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary flex items-center gap-1.5 font-medium">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
          Rendering frames...
        </span>
        <span className="font-mono text-accent font-semibold">
          {progress.percentage}%
        </span>
      </div>

      {/* Accessible Progress Bar */}
      <div
        role="progressbar"
        aria-valuenow={progress.percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Export rendering progress"
        className="w-full bg-surface-raised h-2.5 rounded-full overflow-hidden border border-border"
      >
        <div
          className="bg-accent h-full transition-all duration-150 rounded-full"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 p-3 bg-surface-raised border border-border rounded-lg text-center text-xs">
        <div>
          <div className="text-[11px] text-text-secondary font-medium uppercase tracking-wider">
            Frame
          </div>
          <div className="font-mono font-medium text-text-primary mt-0.5">
            {progress.frame} / {progress.totalFrames}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-text-secondary font-medium uppercase tracking-wider">
            Speed
          </div>
          <div className="font-mono font-medium text-text-primary mt-0.5">
            {progress.fps} fps
          </div>
        </div>
        <div>
          <div className="text-[11px] text-text-secondary font-medium uppercase tracking-wider">
            ETA
          </div>
          <div className="font-mono font-medium text-text-primary mt-0.5">
            {progress.etaSeconds}s
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel Export
        </Button>
      </div>
    </div>
  );
};
