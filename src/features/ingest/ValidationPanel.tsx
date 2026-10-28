import React from 'react';
import { AlertTriangle, CheckCircle, Wrench, AlertCircle } from 'lucide-react';
import { Button } from '../../ui';
import { IngestedImage, IngestedAudio } from './types';
import { ParseResult } from '../../core/parser/types';
import { formatMsToTimecode } from '../../core/parser/timestampUtils';

interface ValidationPanelProps {
  images: IngestedImage[];
  audioFiles: IngestedAudio[];
  parseResult: ParseResult | null;
  onFixRemoveCorrupt: () => void;
  onFixExtendLastClip: (audioDurationMs: number) => void;
  onFixDeduplicateNames: () => void;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  images,
  audioFiles,
  parseResult,
  onFixRemoveCorrupt,
  onFixExtendLastClip,
  onFixDeduplicateNames,
}) => {
  const issues: {
    id: string;
    type: 'error' | 'warning' | 'info';
    title: string;
    description: string;
    actionLabel?: string;
    onFix?: () => void;
  }[] = [];

  // 1. Corrupt files & quota errors detection
  const corruptImages = images.filter((img) => img.isCorrupt);
  const corruptAudio = audioFiles.filter((aud) => aud.isCorrupt);
  const totalCorrupt = corruptImages.length + corruptAudio.length;

  const quotaError =
    images.find((img) => img.error?.toLowerCase().includes('quota')) ||
    audioFiles.find((aud) => aud.error?.toLowerCase().includes('quota'));

  if (quotaError) {
    issues.push({
      id: 'quota-exceeded',
      type: 'error',
      title: 'Storage Quota Exceeded',
      description: 'Browser storage quota is full. Remove unneeded files or clean up storage in Settings.',
      actionLabel: 'Remove Failed Files',
      onFix: onFixRemoveCorrupt,
    });
  } else if (totalCorrupt > 0) {
    issues.push({
      id: 'corrupt-files',
      type: 'error',
      title: `${totalCorrupt} unreadable / corrupt file${totalCorrupt === 1 ? '' : 's'}`,
      description: 'Some uploaded assets could not be decoded. Remove them to prevent render failures.',
      actionLabel: 'Remove Corrupt Files',
      onFix: onFixRemoveCorrupt,
    });
  }

  // 2. Duplicate filenames
  const imageNames = images.map((i) => i.name.toLowerCase());
  const hasDuplicateImages = new Set(imageNames).size !== imageNames.length;
  if (hasDuplicateImages) {
    issues.push({
      id: 'duplicate-names',
      type: 'warning',
      title: 'Duplicate image filenames detected',
      description: 'Multiple images share identical filenames, which may cause confusion when referencing prompts.',
      actionLabel: 'Auto-Deduplicate Names',
      onFix: onFixDeduplicateNames,
    });
  }

  // 3. Image count vs segment count mismatch
  const segmentCount = parseResult?.segments.length || 0;
  if (images.length > 0 && segmentCount > 0 && images.length !== segmentCount) {
    issues.push({
      id: 'count-mismatch',
      type: 'warning',
      title: `Asset count mismatch (${images.length} images vs ${segmentCount} script beats)`,
      description: `The number of images does not match the script. You can resolve this in the Mismatch Resolver on the Review screen.`,
    });
  }

  // 4. Last timestamp vs total audio length mismatch
  const totalAudioMs = audioFiles.reduce((sum, a) => sum + (a.durationMs || 0), 0);
  const lastSegment = parseResult?.segments[parseResult.segments.length - 1];
  if (totalAudioMs > 0 && lastSegment && Math.abs(totalAudioMs - lastSegment.endMs) > 1000) {
    const diffSec = Math.round(Math.abs(totalAudioMs - lastSegment.endMs) / 1000);
    issues.push({
      id: 'audio-mismatch',
      type: 'warning',
      title: `Timeline ends ${diffSec}s before audio track`,
      description: `Final script beat ends at ${formatMsToTimecode(lastSegment.endMs)}, but total audio is ${formatMsToTimecode(totalAudioMs)}.`,
      actionLabel: 'Extend Last Clip to Audio End',
      onFix: () => onFixExtendLastClip(totalAudioMs),
    });
  }

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-surface border border-success/30 rounded-panel text-xs text-text-secondary">
        <CheckCircle className="w-4 h-4 text-success shrink-0" />
        <span>All assets and script timings match cleanly with zero validation errors.</span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-surface-elevated border border-border rounded-panel space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <AlertTriangle className="w-4 h-4 text-warning" />
        <h3 className="text-xs font-semibold text-text-primary">
          Validation Panel ({issues.length} item{issues.length === 1 ? '' : 's'})
        </h3>
      </div>

      <div className="space-y-2.5">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-surface rounded border border-border text-xs gap-2"
          >
            <div className="flex items-start gap-2 min-w-0">
              {issue.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold text-text-primary">{issue.title}</p>
                <p className="text-2xs text-text-secondary mt-0.5">{issue.description}</p>
              </div>
            </div>

            {issue.actionLabel && issue.onFix && (
              <Button
                variant="secondary"
                size="sm"
                onClick={issue.onFix}
                className="shrink-0 self-start sm:self-auto text-xs"
                aria-label={issue.actionLabel}
              >
                <Wrench className="w-3 h-3 mr-1" />
                {issue.actionLabel}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
