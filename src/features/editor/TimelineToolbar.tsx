import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Magnet,
  ScissorsLineDashed,
  Trash2,
  CopyPlus,
} from 'lucide-react';
import { IconButton } from '../../ui';
import { useTimelineStore } from '../../core/timeline';

export const TimelineToolbar: React.FC = () => {
  const zoom = useTimelineStore((s) => s.zoom);
  const setZoom = useTimelineStore((s) => s.setZoom);
  const snap = useTimelineStore((s) => s.snap);
  const setSnap = useTimelineStore((s) => s.setSnap);
  const toggleSnap = () => setSnap(!snap);
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);
  const playheadMs = useTimelineStore((s) => s.playheadMs);
  const splitClip = useTimelineStore((s) => s.splitClip);
  const deleteClip = useTimelineStore((s) => s.deleteClip);
  const duplicateClip = useTimelineStore((s) => s.duplicateClip);

  const handleZoomIn = () => {
    setZoom(zoom * 1.25);
  };

  const handleZoomOut = () => {
    setZoom(zoom / 1.25);
  };

  const handleZoomFit = () => {
    setZoom(1.0);
  };

  const handleSplit = () => {
    if (selectedClipId) {
      splitClip(selectedClipId, playheadMs);
    }
  };

  const handleDelete = () => {
    if (selectedClipId) {
      deleteClip(selectedClipId);
    }
  };

  const handleDuplicate = () => {
    if (selectedClipId) {
      duplicateClip(selectedClipId);
    }
  };

  return (
    <div className="h-9 px-3 border-b border-white/[0.06] bg-[#121216] flex items-center justify-between shrink-0 select-none">
      {/* Left Editing Tools */}
      <div className="flex items-center gap-1.5">
        <IconButton
          aria-label="Split clip at playhead (S)"
          size="sm"
          disabled={!selectedClipId}
          onClick={handleSplit}
          title="Split Clip at Playhead (S)"
          className="hover:bg-white/[0.08] text-text-secondary hover:text-text-primary rounded disabled:opacity-30"
        >
          <ScissorsLineDashed className="w-3.5 h-3.5" />
        </IconButton>

        <IconButton
          aria-label="Duplicate clip (Ctrl+D / Cmd+D)"
          size="sm"
          disabled={!selectedClipId}
          onClick={handleDuplicate}
          title="Duplicate Selected Clip (Ctrl+D)"
          className="hover:bg-white/[0.08] text-text-secondary hover:text-text-primary rounded disabled:opacity-30"
        >
          <CopyPlus className="w-3.5 h-3.5" />
        </IconButton>

        <IconButton
          aria-label="Delete clip (Delete / Backspace)"
          size="sm"
          disabled={!selectedClipId}
          variant="destructive"
          onClick={handleDelete}
          title="Delete Selected Clip (Delete / Backspace)"
          className="hover:text-status-error hover:bg-status-error/10 text-text-secondary rounded disabled:opacity-30"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </IconButton>

        <div className="h-4 w-px bg-white/[0.08] mx-1" />

        <button
          onClick={toggleSnap}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs transition-all border ${
            snap
              ? 'bg-accent border-accent text-white font-semibold shadow-sm'
              : 'border-white/[0.06] text-text-secondary hover:text-text-primary bg-white/[0.02]'
          }`}
          title="Toggle Magnetic Snap (N)"
          aria-pressed={snap}
        >
          <Magnet className="w-3.5 h-3.5" />
          <span>Snap</span>
          <span
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              snap ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]' : 'bg-white/30'
            }`}
          />
        </button>
      </div>

      {/* Right Zoom Controls */}
      <div className="flex items-center gap-1">
        <IconButton
          aria-label="Zoom out timeline (-)"
          size="sm"
          onClick={handleZoomOut}
          title="Zoom out (-)"
          className="hover:bg-white/[0.08] text-text-secondary hover:text-text-primary rounded"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </IconButton>

        <span className="text-[11px] font-mono text-text-tertiary px-1.5 tabular-nums select-none">
          {Math.round(zoom * 100)}%
        </span>

        <IconButton
          aria-label="Zoom in timeline (+)"
          size="sm"
          onClick={handleZoomIn}
          title="Zoom in (+)"
          className="hover:bg-white/[0.08] text-text-secondary hover:text-text-primary rounded"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </IconButton>

        <IconButton
          aria-label="Zoom to fit (0)"
          size="sm"
          onClick={handleZoomFit}
          title="Fit Timeline to View (0)"
          className="hover:bg-white/[0.08] text-text-secondary hover:text-text-primary rounded"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </IconButton>
      </div>
    </div>
  );
};
