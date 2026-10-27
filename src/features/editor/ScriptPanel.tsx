import React from 'react';
import { FileText } from 'lucide-react';
import { useTimelineStore, formatTimecode } from '../../core/timeline';

export const ScriptPanel: React.FC = () => {
  const project = useTimelineStore((s) => s.project);
  const segments = project?.script?.parse?.segments || [];
  const fps = project?.settings.fps || 30;

  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 text-xs select-none">
      <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
        <span className="font-semibold text-text-secondary uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-accent" />
          Script Beats ({segments.length})
        </span>
      </div>

      {segments.length === 0 ? (
        <div className="p-4 text-center text-text-tertiary border border-dashed border-border-subtle rounded-control">
          No script beats available
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {segments.map((seg) => (
            <div
              key={seg.index}
              className="bg-surface-elevated/40 border border-border-subtle rounded-control p-2.5 flex flex-col gap-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-accent font-mono text-[11px]">
                  #{seg.index}
                </span>
                <span className="font-mono text-text-tertiary text-[10px]">
                  {formatTimecode(seg.startMs, fps)}
                </span>
              </div>
              <p className="text-text-primary text-[11px] leading-relaxed line-clamp-3">
                {seg.narrationText || seg.promptText}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
