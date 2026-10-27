import React, { useRef } from 'react';
import { Clip } from '../../core/model/types';
import { useTimelineStore, formatDurationSec } from '../../core/timeline';

export interface ImageClipItemProps {
  clip: Clip;
  index: number;
  startMs: number;
  isSelected: boolean;
  pxPerMs: number;
  assetName?: string;
  onSelect: () => void;
  onDragStartReorder: (sourceIndex: number) => void;
  onDropReorder: (targetIndex: number) => void;
}

export const ImageClipItem: React.FC<ImageClipItemProps> = ({
  clip,
  index,
  isSelected,
  pxPerMs,
  assetName,
  onSelect,
  onDragStartReorder,
  onDropReorder,
}) => {
  const widthPx = Math.max(30, Math.round(clip.durationMs * pxPerMs));
  const trimClip = useTimelineStore((s) => s.trimClip);
  const startDrag = useTimelineStore((s) => s.startDrag);
  const commitDrag = useTimelineStore((s) => s.commitDrag);

  const initialXRef = useRef(0);
  const initialDurationRef = useRef(clip.durationMs);

  const handleTrimPointerDown = (e: React.PointerEvent, edge: 'start' | 'end') => {
    e.stopPropagation();
    initialXRef.current = e.clientX;
    initialDurationRef.current = clip.durationMs;

    startDrag();

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaPx = moveEvent.clientX - initialXRef.current;
      const deltaMs = Math.round(deltaPx / pxPerMs);
      const effectiveDeltaMs = edge === 'end' ? deltaMs : -deltaMs;

      trimClip(clip.id, effectiveDeltaMs, edge);
    };

    const onPointerUp = () => {
      commitDrag();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      draggable
      onDragStart={() => onDragStartReorder(index)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDropReorder(index)}
      className={`group relative h-16 shrink-0 rounded border flex flex-col justify-between p-1.5 cursor-pointer select-none transition-shadow ${
        isSelected
          ? 'bg-accent/25 border-accent shadow-md z-10 ring-1 ring-accent'
          : 'bg-surface-elevated/80 border-border hover:border-text-tertiary'
      }`}
      style={{ width: `${widthPx}px` }}
      data-clip-id={clip.id}
    >
      {/* Left Trim Handle */}
      <div
        onPointerDown={(e) => handleTrimPointerDown(e, 'start')}
        className="absolute left-0 top-0 bottom-0 w-2.5 bg-border hover:bg-accent cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center rounded-l"
        title="Trim Start Edge"
      >
        <div className="w-0.5 h-4 bg-white/60 rounded" />
      </div>

      {/* Clip Content Header */}
      <div className="flex items-center justify-between pointer-events-none">
        <span className="font-mono text-[10px] bg-black/60 px-1 py-0.5 rounded text-white font-semibold">
          #{index + 1}
        </span>
        <span className="font-mono text-[10px] text-text-tertiary tabular-nums bg-black/40 px-1 rounded">
          {formatDurationSec(clip.durationMs)}
        </span>
      </div>

      {/* Asset Name Label */}
      <div className="pointer-events-none truncate text-[11px] text-text-primary font-medium px-0.5">
        {assetName || clip.assetId}
      </div>

      {/* Right Trim Handle */}
      <div
        onPointerDown={(e) => handleTrimPointerDown(e, 'end')}
        className="absolute right-0 top-0 bottom-0 w-2.5 bg-border hover:bg-accent cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center rounded-r"
        title="Trim End Edge"
      >
        <div className="w-0.5 h-4 bg-white/60 rounded" />
      </div>
    </div>
  );
};
