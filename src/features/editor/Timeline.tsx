import React, { useRef, useEffect } from 'react';
import { TimelineToolbar } from './TimelineToolbar';
import { TimeRuler } from './TimeRuler';
import { ImageTrack } from './ImageTrack';
import { AudioTrack } from './AudioTrack';
import { Playhead } from './Playhead';
import { useTimelineStore, calculateTotalVisualDuration } from '../../core/timeline';

export const Timeline: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const zoom = useTimelineStore((s) => s.zoom);
  const setZoom = useTimelineStore((s) => s.setZoom);
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);
  const selectClip = useTimelineStore((s) => s.selectClip);
  const reorderClip = useTimelineStore((s) => s.reorderClip);

  const fps = useTimelineStore((s) => s.project.settings.fps);
  const clips = useTimelineStore((s) => s.project.timeline.clips);
  const audio = useTimelineStore((s) => s.project.timeline.audio);
  const assets = useTimelineStore((s) => s.project.assets);

  const visualDuration = calculateTotalVisualDuration(clips);
  const audioDuration = audio.reduce((max, a) => {
    const asset = assets.find((as) => as.id === a.assetId);
    return Math.max(max, a.offsetMs + (asset?.meta.durationMs || 0));
  }, 0);
  const totalDurationMs = Math.max(visualDuration, audioDuration, 5000);

  // 1000ms = 100px at zoom 1.0 -> 0.1 px/ms
  const pxPerMs = 0.1 * zoom;
  const totalWidthPx = Math.max(800, Math.round(totalDurationMs * pxPerMs));

  // Ctrl + Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      setZoom(zoom * zoomFactor);
    }
  };

  // Keyboard navigation on clips
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedClipId || clips.length === 0) return;
      const currentIndex = clips.findIndex((c) => c.id === selectedClipId);
      if (currentIndex === -1) return;

      if (e.altKey) {
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          e.preventDefault();
          reorderClip(selectedClipId, currentIndex - 1);
        } else if (e.key === 'ArrowRight' && currentIndex < clips.length - 1) {
          e.preventDefault();
          reorderClip(selectedClipId, currentIndex + 1);
        }
      } else if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          e.preventDefault();
          selectClip(clips[currentIndex - 1]!.id);
        } else if (e.key === 'ArrowRight' && currentIndex < clips.length - 1) {
          e.preventDefault();
          selectClip(clips[currentIndex + 1]!.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedClipId, clips, selectClip, reorderClip]);

  return (
    <footer
      onWheel={handleWheel}
      className="h-64 border-t border-border bg-surface flex flex-col shrink-0 select-none overflow-hidden"
    >
      {/* Top Toolbar */}
      <TimelineToolbar />

      {/* Scrollable Tracks Area */}
      <div
        ref={containerRef}
        tabIndex={0}
        aria-label="Timeline Tracks Scroll Area"
        className="flex-1 overflow-x-auto overflow-y-hidden relative bg-canvas flex flex-col focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        <div className="relative min-h-full" style={{ width: `${totalWidthPx}px` }}>
          {/* Time Ruler */}
          <TimeRuler
            totalDurationMs={totalDurationMs}
            pxPerMs={pxPerMs}
            fps={fps}
          />

          {/* Magnetic Image Track */}
          <ImageTrack pxPerMs={pxPerMs} />

          {/* Audio Track */}
          <AudioTrack pxPerMs={pxPerMs} />

          {/* Playhead Marker */}
          <Playhead pxPerMs={pxPerMs} />
        </div>
      </div>
    </footer>
  );
};
