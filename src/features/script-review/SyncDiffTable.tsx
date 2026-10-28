import React from 'react';
import { Check, X, Sparkles } from 'lucide-react';
import { Button } from '../../ui';
import { AlignedSegmentDiff } from '../../core/sync/types';
import { formatTimecode } from '../../core/timeline/timecode';

export interface SyncDiffTableProps {
  diffs: AlignedSegmentDiff[];
  thumbnails?: Record<number, string>;
  onToggleStatus: (index: number) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
}

export const SyncDiffTable: React.FC<SyncDiffTableProps> = ({
  diffs,
  thumbnails = {},
  onToggleStatus,
  onAcceptAll,
  onRejectAll,
}) => {
  const acceptedCount = diffs.filter((d) => d.status === 'accepted').length;

  return (
    <div className="space-y-4">
      {/* Table Action Controls */}
      <div className="flex items-center justify-between text-xs pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="font-semibold text-text-primary">
            Proposed Word Alignments ({diffs.length} beats)
          </span>
          <span className="text-text-secondary text-2xs">
            ({acceptedCount} accepted)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onAcceptAll}>
            Accept All
          </Button>
          <Button variant="secondary" size="sm" onClick={onRejectAll}>
            Reject All
          </Button>
        </div>
      </div>

      {/* Diff Table */}
      <div className="max-h-[360px] overflow-y-auto border border-border rounded-panel bg-surface">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-elevated text-text-secondary font-medium text-2xs uppercase tracking-wider sticky top-0 z-10">
              <th className="py-2 px-3 w-12 text-center">Beat</th>
              <th className="py-2 px-3 w-14">Media</th>
              <th className="py-2 px-3">Narration & Phrase</th>
              <th className="py-2 px-3 w-28">Current</th>
              <th className="py-2 px-3 w-28">Proposed</th>
              <th className="py-2 px-3 w-24 text-right">Shift</th>
              <th className="py-2 px-3 w-20 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {diffs.map((diff) => {
              const isAccepted = diff.status === 'accepted';
              const sign = diff.deltaMs > 0 ? '+' : '';
              const thumbUrl = thumbnails[diff.index];

              return (
                <tr
                  key={diff.index}
                  className={`hover:bg-surface-hover transition-colors ${
                    !isAccepted ? 'opacity-60 bg-surface-elevated/20' : ''
                  }`}
                >
                  {/* Beat Index */}
                  <td className="py-2 px-3 text-center font-mono text-2xs text-text-secondary">
                    #{diff.index}
                  </td>

                  {/* Media Thumbnail */}
                  <td className="py-2 px-3">
                    <div className="w-10 h-7 rounded bg-surface-elevated border border-border overflow-hidden flex items-center justify-center">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={`Beat ${diff.index}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xs text-text-tertiary font-mono">
                          {diff.index}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Narration */}
                  <td className="py-2 px-3 text-text-primary text-xs">
                    <div className="line-clamp-2 max-w-sm" title={diff.narrationText}>
                      {diff.narrationText || (
                        <span className="italic text-text-tertiary">
                          No narration text
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Current Timing */}
                  <td className="py-2 px-3 font-mono text-2xs tabular-nums text-text-secondary whitespace-nowrap">
                    {formatTimecode(diff.originalStartMs)} –{' '}
                    {formatTimecode(diff.originalEndMs)}
                    <div className="text-2xs text-text-secondary font-medium">
                      {(diff.originalDurationMs / 1000).toFixed(1)}s
                    </div>
                  </td>

                  {/* Proposed Timing */}
                  <td className="py-2 px-3 font-mono text-2xs tabular-nums text-text-primary whitespace-nowrap">
                    {formatTimecode(diff.proposedStartMs)} –{' '}
                    {formatTimecode(diff.proposedEndMs)}
                    <div className="text-2xs text-sky-400 font-medium">
                      {(diff.proposedDurationMs / 1000).toFixed(1)}s
                    </div>
                  </td>

                  {/* Shift Badge */}
                  <td className="py-2 px-3 text-right whitespace-nowrap">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded font-mono text-2xs tabular-nums ${
                        diff.deltaMs === 0
                          ? 'bg-surface-elevated text-text-secondary'
                          : diff.deltaMs > 0
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                          : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                      }`}
                    >
                      {sign}
                      {diff.deltaMs}ms
                    </span>
                  </td>

                  {/* Toggle Status Button */}
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onToggleStatus(diff.index)}
                      className={`inline-flex items-center justify-center w-7 h-7 rounded border transition-colors ${
                        isAccepted
                          ? 'bg-sky-500/20 border-sky-500/50 text-sky-400 hover:bg-sky-500/30'
                          : 'bg-surface-elevated border-border text-text-secondary hover:text-text-primary'
                      }`}
                      aria-label={`Toggle accept for beat ${diff.index}`}
                      title={isAccepted ? 'Accepted (click to reject)' : 'Rejected (click to accept)'}
                    >
                      {isAccepted ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
