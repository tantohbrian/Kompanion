import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { IconButton } from '../../ui';
import { playerController } from './playerController';
import { useTimelineStore, formatTimecode, calculateTotalVisualDuration } from '../../core/timeline';

export const TransportBar: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const timecodeRef = useRef<HTMLSpanElement | null>(null);

  const project = useTimelineStore((s) => s.project);
  const fps = project?.settings.fps || 30;
  const clips = project?.timeline.clips || [];
  const audio = project?.timeline.audio || [];
  const visualDuration = calculateTotalVisualDuration(clips);
  const audioDuration = audio.reduce((max, a) => {
    const asset = project?.assets.find((as) => as.id === a.assetId);
    return Math.max(max, a.offsetMs + (asset?.meta.durationMs || 0));
  }, 0);
  const totalDurationMs = Math.max(visualDuration, audioDuration);

  useEffect(() => {
    const unsubscribe = playerController.subscribeTime((tMs) => {
      setIsPlaying(playerController.isPlaying());
      if (timecodeRef.current) {
        timecodeRef.current.textContent = `${formatTimecode(tMs, fps)} / ${formatTimecode(totalDurationMs, fps)}`;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [fps, totalDurationMs]);

  const handleTogglePlay = () => {
    playerController.togglePlay();
    setIsPlaying(playerController.isPlaying());
  };

  const handleJumpStart = () => {
    playerController.seek(0);
  };

  const handleJumpEnd = () => {
    playerController.seek(totalDurationMs);
  };

  const handleStepBackFrame = () => {
    playerController.stepFrame(-1, fps);
  };

  const handleStepForwardFrame = () => {
    playerController.stepFrame(1, fps);
  };

  return (
    <div className="h-10 border-b border-border bg-surface px-4 flex items-center justify-between shrink-0 select-none">
      {/* Left spacer */}
      <div className="w-32" />

      {/* Center: Playback Controls */}
      <div className="flex items-center gap-1.5">
        <IconButton
          aria-label="Jump to start (Home)"
          size="sm"
          onClick={handleJumpStart}
          title="Jump to start (Home)"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </IconButton>

        <IconButton
          aria-label="Step back 1 frame (Left Arrow)"
          size="sm"
          onClick={handleStepBackFrame}
          title="Step back 1 frame (Left Arrow)"
        >
          <ChevronLeft className="w-4 h-4" />
        </IconButton>

        <IconButton
          aria-label={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          size="sm"
          variant="primary"
          onClick={handleTogglePlay}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </IconButton>

        <IconButton
          aria-label="Step forward 1 frame (Right Arrow)"
          size="sm"
          onClick={handleStepForwardFrame}
          title="Step forward 1 frame (Right Arrow)"
        >
          <ChevronRight className="w-4 h-4" />
        </IconButton>

        <IconButton
          aria-label="Jump to end (End)"
          size="sm"
          onClick={handleJumpEnd}
          title="Jump to end (End)"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </IconButton>
      </div>

      {/* Right: Tabular Timecode Display */}
      <div className="w-36 flex justify-end">
        <span
          ref={timecodeRef}
          className="text-xs font-mono tabular-nums text-text-secondary bg-surface-elevated/60 px-2 py-0.5 rounded border border-border-subtle"
          aria-label="Current timecode"
        >
          {formatTimecode(0, fps)} / {formatTimecode(totalDurationMs, fps)}
        </span>
      </div>
    </div>
  );
};
