import React from 'react';
import { Trash2, Image as ImageIcon } from 'lucide-react';
import { IconButton } from '../../ui';
import { ParsedSegment } from '../../core/parser/types';
import { formatMsToTimecode, parseSingleTimestampToMs } from '../../core/parser/timestampUtils';

export interface MappedAsset {
  id: string;
  name: string;
  thumbnailUrl?: string;
}

interface ScriptReviewTableProps {
  segments: ParsedSegment[];
  mappedAssets: MappedAsset[];
  onUpdateSegment: (index: number, updates: Partial<ParsedSegment>) => void;
  onRemoveSegment: (index: number) => void;
}

export const ScriptReviewTable: React.FC<ScriptReviewTableProps> = ({
  segments,
  mappedAssets,
  onUpdateSegment,
  onRemoveSegment,
}) => {
  const handleTimeChange = (
    index: number,
    field: 'startMs' | 'endMs',
    rawStr: string
  ) => {
    const ms = parseSingleTimestampToMs(rawStr);
    if (ms !== null) {
      onUpdateSegment(index, { [field]: ms });
    }
  };

  return (
    <div className="border border-border rounded-panel overflow-hidden bg-surface">
      <div className="overflow-x-auto">
        <table aria-label="Script Review Segments" className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-elevated text-text-secondary font-medium select-none">
              <th className="py-2.5 px-3 w-12 text-center">Beat</th>
              <th className="py-2.5 px-3 w-28">Mapped Image</th>
              <th className="py-2.5 px-3 w-28">Start (MM:SS)</th>
              <th className="py-2.5 px-3 w-28">End (MM:SS)</th>
              <th className="py-2.5 px-3 w-20 text-center">Duration</th>
              <th className="py-2.5 px-3 min-w-[200px]">Prompt & Narration</th>
              <th className="py-2.5 px-3 w-12 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {segments.map((seg, idx) => {
              const asset = mappedAssets[idx];
              const durSec = Math.max(0, (seg.endMs - seg.startMs) / 1000).toFixed(1);

              return (
                <tr
                  key={seg.index || idx}
                  className="hover:bg-surface-elevated/40 transition-colors group"
                >
                  {/* Beat Number */}
                  <td className="py-2 px-3 text-center font-mono font-bold text-text-primary">
                    <span className="w-6 h-6 rounded-full bg-surface-elevated inline-flex items-center justify-center text-2xs">
                      {seg.index}
                    </span>
                  </td>

                  {/* Mapped Image Thumbnail */}
                  <td className="py-2 px-3">
                    {asset ? (
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-8 rounded bg-canvas overflow-hidden border border-border shrink-0 flex items-center justify-center">
                          {asset.thumbnailUrl ? (
                            <img
                              src={asset.thumbnailUrl}
                              alt={asset.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-3.5 h-3.5 text-text-tertiary" />
                          )}
                        </div>
                        <span className="text-2xs text-text-secondary truncate max-w-[70px]" title={asset.name}>
                          {asset.name}
                        </span>
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-warning/15 text-warning text-2xs font-mono">
                        Placeholder
                      </span>
                    )}
                  </td>

                  {/* Start Timecode */}
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      defaultValue={formatMsToTimecode(seg.startMs)}
                      onBlur={(e) => handleTimeChange(seg.index, 'startMs', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleTimeChange(seg.index, 'startMs', e.currentTarget.value);
                          e.currentTarget.blur();
                        }
                      }}
                      className="w-20 bg-surface-elevated border border-border rounded px-2 py-1 text-xs font-mono tabular-nums text-text-primary focus:outline-none focus:border-accent"
                      aria-label={`Start time for beat ${seg.index}`}
                    />
                  </td>

                  {/* End Timecode */}
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      defaultValue={formatMsToTimecode(seg.endMs)}
                      onBlur={(e) => handleTimeChange(seg.index, 'endMs', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleTimeChange(seg.index, 'endMs', e.currentTarget.value);
                          e.currentTarget.blur();
                        }
                      }}
                      className="w-20 bg-surface-elevated border border-border rounded px-2 py-1 text-xs font-mono tabular-nums text-text-primary focus:outline-none focus:border-accent"
                      aria-label={`End time for beat ${seg.index}`}
                    />
                  </td>

                  {/* Duration */}
                  <td className="py-2 px-3 text-center">
                    <span className="font-mono text-2xs text-text-tertiary tabular-nums">
                      {durSec}s
                    </span>
                  </td>

                  {/* Prompt & Narration */}
                  <td className="py-2 px-3 space-y-1">
                    {seg.narrationText !== undefined && (
                      <div className="flex items-start gap-1.5">
                        <span className="text-2xs uppercase text-text-secondary font-semibold tracking-wider shrink-0 mt-0.5">
                          Voice:
                        </span>
                        <input
                          type="text"
                          value={seg.narrationText}
                          onChange={(e) => onUpdateSegment(seg.index, { narrationText: e.target.value })}
                          className="flex-1 bg-transparent border-b border-transparent hover:border-border focus:border-accent text-xs text-text-secondary focus:outline-none py-0.5"
                          placeholder="Narration text..."
                          aria-label={`Narration for beat ${seg.index}`}
                        />
                      </div>
                    )}
                    <textarea
                      value={seg.promptText}
                      onChange={(e) => onUpdateSegment(seg.index, { promptText: e.target.value })}
                      rows={2}
                      className="w-full bg-surface-elevated/60 border border-border-subtle hover:border-border focus:border-accent rounded p-1.5 text-xs text-text-primary focus:outline-none resize-y"
                      placeholder="Image prompt description..."
                      aria-label={`Prompt text for beat ${seg.index}`}
                    />
                  </td>

                  {/* Action */}
                  <td className="py-2 px-3 text-center">
                    <IconButton
                      size="sm"
                      aria-label={`Delete beat ${seg.index}`}
                      className="text-text-tertiary hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onRemoveSegment(seg.index)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </IconButton>
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
