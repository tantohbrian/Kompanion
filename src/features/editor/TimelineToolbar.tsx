import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Magnet,
  Scissors,
  Trash2,
  Copy,
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
    <div className="h-9 px-3 border-b border-border-subtle bg-surface flex items-center justify-between shrink-0 select-none">
      {/* Left Editing Tools */}
      <div className="flex items-center gap-1">
        <IconButton
          aria-label="Split clip at playhead (S)"
          size="sm"
          disabled={!selectedClipId}
          onClick={handleSplit}
          title="Split clip at playhead (S)"
        >
          <Scissors className="w-3.5 h-3.5" />
        </IconButton>

        <IconButton
          aria-label="Duplicate clip (Ctrl+D / Cmd+D)"
          size="sm"
          disabled={!selectedClipId}
          onClick={handleDuplicate}
          title="Duplicate clip (Ctrl+D / Cmd+D)"
        >
          <Copy className="w-3.5 h-3.5" />
        </IconButton>

        <IconButton
          aria-label="Delete clip (Delete / Backspace)"
          size="sm"
          disabled={!selectedClipId}
          variant="destructive"
          onClick={handleDelete}
          title="Delete clip (Delete / Backspace)"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </IconButton>

        <div className="h-4 w-px bg-border mx-1" />

        <button
          onClick={toggleSnap}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
            snap
              ? 'bg-accent text-white font-semibold'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
          title="Toggle Magnetic Snap"
          aria-pressed={snap}
        >
          <Magnet className="w-3.5 h-3.5" />
          <span>Snap</span>
        </button>
      </div>

      {/* Right Zoom Controls */}
      <div className="flex items-center gap-1">
        <IconButton
          aria-label="Zoom out timeline (-)"
          size="sm"
          onClick={handleZoomOut}
          title="Zoom out (-)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </IconButton>

        <span className="text-[11px] font-mono text-text-tertiary px-1 tabular-nums">
          {Math.round(zoom * 100)}%
        </span>

        <IconButton
          aria-label="Zoom in timeline (+)"
          size="sm"
          onClick={handleZoomIn}
          title="Zoom in (+)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </IconButton>

        <IconButton
          aria-label="Zoom to fit (0)"
          size="sm"
          onClick={handleZoomFit}
          title="Reset zoom to 100% (0)"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </IconButton>
      </div>
    </div>
  );
};
