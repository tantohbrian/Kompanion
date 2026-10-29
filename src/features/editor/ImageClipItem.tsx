import React, { useState } from 'react';
import { GripVertical } from 'lucide-react';
import { Clip } from '../../core/model/types';
import { useTimelineStore, formatDurationSec } from '../../core/timeline';
import { useAssetThumbnailUrl } from './useAssetThumbnailUrl';

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
  startMs,
  isSelected,
  pxPerMs,
  assetName,
  onSelect,
  onDragStartReorder,
  onDropReorder,
}) => {
  const leftPx = Math.round(startMs * pxPerMs);
  const widthPx = Math.max(8, Math.round(clip.durationMs * pxPerMs));

  const trimClip = useTimelineStore((s) => s.trimClip);
  const startDrag = useTimelineStore((s) => s.startDrag);
  const commitDrag = useTimelineStore((s) => s.commitDrag);
  const assets = useTimelineStore((s) => s.project.assets);

  const asset = assets.find((a) => a.id === clip.assetId);
  const thumbUrl = useAssetThumbnailUrl(asset);

  const [isTrimming, setIsTrimming] = useState(false);
  const [trimDurationPreview, setTrimDurationPreview] = useState<number | null>(null);

  const handleTrimPointerDown = (e: React.PointerEvent, edge: 'start' | 'end') => {
    e.stopPropagation();
    e.preventDefault();
    setIsTrimming(true);

    const targetEl = e.currentTarget as HTMLElement;
    targetEl.setPointerCapture(e.pointerId);

    const initialX = e.clientX;
    const initialDurationMs = clip.durationMs;
    startDrag();
    setTrimDurationPreview(initialDurationMs);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const displacementPx = moveEvent.clientX - initialX;
      const displacementMs = Math.round(displacementPx / pxPerMs);
      const effectiveDeltaMs = edge === 'end' ? displacementMs : -displacementMs;
      const targetDurationMs = Math.max(200, initialDurationMs + effectiveDeltaMs);

      // Get current duration from store to apply exact step delta
      const currentClips = useTimelineStore.getState().project.timeline.clips;
      const current = currentClips.find((c) => c.id === clip.id);
      const curDur = current ? current.durationMs : clip.durationMs;
      const stepDelta = targetDurationMs - curDur;

      if (stepDelta !== 0) {
        trimClip(clip.id, stepDelta, edge);
        setTrimDurationPreview(targetDurationMs);
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      commitDrag();
      setIsTrimming(false);
      setTrimDurationPreview(null);
      try {
        targetEl.releasePointerCapture(upEvent.pointerId);
      } catch {
        // Ignore
      }
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
      draggable={!isTrimming}
      onDragStart={() => onDragStartReorder(index)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDropReorder(index)}
      className={`group absolute top-0 bottom-0 rounded border flex flex-col justify-between p-1 select-none transition-shadow overflow-hidden cursor-pointer ${
        isSelected
          ? 'bg-accent/25 border-accent shadow-md z-20 ring-1 ring-accent'
          : 'bg-surface-elevated/80 border-border hover:border-text-tertiary z-10'
      }`}
      style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
      data-clip-id={clip.id}
    >
      {/* Floating Trim Tooltip */}
      {isTrimming && trimDurationPreview !== null && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/90 text-white font-mono text-[10px] whitespace-nowrap shadow-md z-30 pointer-events-none">
          {formatDurationSec(trimDurationPreview)}
        </div>
      )}

      {/* Background Thumbnail preview */}
      {thumbUrl && (
        <img
          src={thumbUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-40 transition-opacity pointer-events-none rounded"
        />
      )}

      {/* Left Trim Handle */}
      <div
        onPointerDown={(e) => handleTrimPointerDown(e, 'start')}
        className={`absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize transition-opacity z-20 flex items-center justify-center rounded-l ${
          isSelected
            ? 'opacity-100 bg-accent/40'
            : 'opacity-0 group-hover:opacity-100 bg-accent/30 hover:bg-accent'
        }`}
        title="Drag to trim start edge"
      >
        <div className="w-0.5 h-4 bg-white/90 rounded" />
      </div>

      {/* Clip Content Header */}
      <div className="flex items-center justify-between pointer-events-none z-10">
        <span className="font-mono text-[10px] bg-black/75 px-1 py-0.2 rounded text-white font-semibold flex items-center gap-0.5">
          <GripVertical className="w-2.5 h-2.5 opacity-60" />
          #{index + 1}
        </span>
        {widthPx > 50 && (
          <span className="font-mono text-[10px] text-white/90 tabular-nums bg-black/60 px-1 rounded">
            {formatDurationSec(clip.durationMs)}
          </span>
        )}
      </div>

      {/* Asset Name Label */}
      {widthPx > 40 && (
        <div className="pointer-events-none truncate text-[11px] text-text-primary font-medium px-0.5 z-10 drop-shadow-sm">
          {assetName || clip.assetId}
        </div>
      )}

      {/* Right Trim Handle */}
      <div
        onPointerDown={(e) => handleTrimPointerDown(e, 'end')}
        className={`absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize transition-opacity z-20 flex items-center justify-center rounded-r ${
          isSelected
            ? 'opacity-100 bg-accent/40'
            : 'opacity-0 group-hover:opacity-100 bg-accent/30 hover:bg-accent'
        }`}
        title="Drag to trim end edge"
      >
        <div className="w-0.5 h-4 bg-white/90 rounded" />
      </div>
    </div>
  );
};
