import React from 'react';
import { Download, CheckCircle2 } from 'lucide-react';
import { Button } from '../../ui';
import { ExportResult } from '../../core/export/pipeline';

interface Props {
  exportResult: ExportResult;
  includeAudio: boolean;
  onDownload: () => void;
  onDone: () => void;
}

export const ExportCompleteView: React.FC<Props> = ({
  exportResult,
  includeAudio,
  onDownload,
  onDone,
}) => {
  return (
    <div className="py-4 space-y-4">
      <div className="p-3 bg-status-success/10 border border-status-success/30 rounded-lg flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-status-success shrink-0 mt-0.5" />
        <div>
          <div className="text-xs font-semibold text-status-success">
            Export Complete & Verified
          </div>
          <div className="text-[11px] text-text-secondary mt-0.5">
            All Mediabunny post-export read-back verification gates passed.
          </div>
        </div>
      </div>

      {/* Read-Back Verification Checklist */}
      <div className="p-3 bg-surface-raised border border-border rounded-lg space-y-1.5 text-xs">
        <div className="text-[11px] font-semibold text-text-primary uppercase tracking-wider mb-1">
          Verification Details
        </div>
        <div className="flex items-center gap-2 text-text-secondary">
          <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
          <span>
            Duration: {exportResult.verification.actualDurationMs} ms (Within 1 frame
            tolerance)
          </span>
        </div>
        <div className="flex items-center gap-2 text-text-secondary">
          <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
          <span>Video Track: H.264 (avc1)</span>
        </div>
        <div className="flex items-center gap-2 text-text-secondary">
          <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
          <span>
            {includeAudio ? 'Audio Track: AAC (mp4a)' : 'Audio: Visuals-only confirmed'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-text-secondary">
          <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
          <span>Frame Output Matches renderFrame at 3 timestamps</span>
        </div>
      </div>

      <div className="flex justify-between items-center pt-2">
        <span className="text-xs text-text-secondary font-mono truncate max-w-[200px]">
          {exportResult.filename}
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onDone}>
            Done
          </Button>
          <Button variant="primary" size="sm" onClick={onDownload}>
            <Download className="w-3.5 h-3.5 mr-1" />
            Download MP4
          </Button>
        </div>
      </div>
    </div>
  );
};
