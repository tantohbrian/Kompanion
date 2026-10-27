import React, { useRef } from 'react';
import { useTimelineStore } from '../../core/timeline';
import { ImageClipItem } from './ImageClipItem';

export interface ImageTrackProps {
  pxPerMs: number;
}

export const ImageTrack: React.FC<ImageTrackProps> = ({ pxPerMs }) => {
  const project = useTimelineStore((s) => s.project);
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);
  const selectClip = useTimelineStore((s) => s.selectClip);
  const reorderClip = useTimelineStore((s) => s.reorderClip);

  const dragSourceIndexRef = useRef<number | null>(null);

  if (!project) return null;

  const clips = project.timeline.clips;
  const assets = project.assets;

  const handleDragStartReorder = (sourceIndex: number) => {
    dragSourceIndexRef.current = sourceIndex;
  };

  const handleDropReorder = (targetIndex: number) => {
    if (dragSourceIndexRef.current === null || dragSourceIndexRef.current === targetIndex) {
      dragSourceIndexRef.current = null;
      return;
    }

    const sourceClip = clips[dragSourceIndexRef.current];
    if (sourceClip) {
      reorderClip(sourceClip.id, targetIndex);
    }
    dragSourceIndexRef.current = null;
  };

  let cumulativeStartMs = 0;

  return (
    <div
      onClick={() => selectClip(null)}
      className="h-20 bg-canvas flex items-center px-2 relative min-w-full"
      aria-label="Image Track"
    >
      <div className="flex items-center gap-0">
        {clips.map((clip, index) => {
          const startMs = cumulativeStartMs;
          cumulativeStartMs += clip.durationMs;
          const asset = assets.find((a) => a.id === clip.assetId);

          return (
            <ImageClipItem
              key={clip.id}
              clip={clip}
              index={index}
              startMs={startMs}
              isSelected={clip.id === selectedClipId}
              pxPerMs={pxPerMs}
              assetName={asset?.name}
              onSelect={() => selectClip(clip.id)}
              onDragStartReorder={handleDragStartReorder}
              onDropReorder={handleDropReorder}
            />
          );
        })}
      </div>
    </div>
  );
};
