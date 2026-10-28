import React, { useRef } from 'react';
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
  const assets = useTimelineStore((s) => s.project.assets);

  const asset = assets.find((a) => a.id === clip.assetId);
  const thumbUrl = useAssetThumbnailUrl(asset);
  const lastXRef = useRef(0);

  const handleTrimPointerDown = (e: React.PointerEvent, edge: 'start' | 'end') => {
    e.stopPropagation();
    lastXRef.current = e.clientX;

    startDrag();

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaPx = moveEvent.clientX - lastXRef.current;
      if (deltaPx === 0) return;
      const deltaMs = Math.round(deltaPx / pxPerMs);
      if (deltaMs === 0) return;

      lastXRef.current = moveEvent.clientX;
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
      className={`group relative h-16 shrink-0 rounded border flex flex-col justify-between p-1.5 cursor-pointer select-none transition-shadow overflow-hidden ${
        isSelected
          ? 'bg-accent/25 border-accent shadow-md z-10 ring-1 ring-accent'
          : 'bg-surface-elevated/80 border-border hover:border-text-tertiary'
      }`}
      style={{ width: `${widthPx}px` }}
      data-clip-id={clip.id}
    >
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
          isSelected ? 'opacity-100 bg-accent/40' : 'opacity-0 group-hover:opacity-100 bg-accent/30 hover:bg-accent'
        }`}
        title="Drag to trim start edge"
      >
        <div className="w-0.5 h-5 bg-white/80 rounded" />
      </div>

      {/* Clip Content Header */}
      <div className="flex items-center justify-between pointer-events-none z-10">
        <span className="font-mono text-[10px] bg-black/75 px-1 py-0.5 rounded text-white font-semibold">
          #{index + 1}
        </span>
        <span className="font-mono text-[10px] text-white/90 tabular-nums bg-black/60 px-1 rounded">
          {formatDurationSec(clip.durationMs)}
        </span>
      </div>

      {/* Asset Name Label */}
      <div className="pointer-events-none truncate text-[11px] text-text-primary font-medium px-0.5 z-10 drop-shadow-sm">
        {assetName || clip.assetId}
      </div>

      {/* Right Trim Handle */}
      <div
        onPointerDown={(e) => handleTrimPointerDown(e, 'end')}
        className={`absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize transition-opacity z-20 flex items-center justify-center rounded-r ${
          isSelected ? 'opacity-100 bg-accent/40' : 'opacity-0 group-hover:opacity-100 bg-accent/30 hover:bg-accent'
        }`}
        title="Drag to trim end edge"
      >
        <div className="w-0.5 h-5 bg-white/80 rounded" />
      </div>
    </div>
  );
};
