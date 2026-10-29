import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { IconButton } from '../../ui';
import { playerController } from './playerController';
import { useTimelineStore, formatTimecode, calculateTotalVisualDuration } from '../../core/timeline';

export interface TransportBarProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  isFullscreen = false,
  onToggleFullscreen,
}) => {
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
    <div className="h-11 border-b border-white/[0.06] bg-[#0f0f13] px-4 flex items-center justify-between shrink-0 select-none">
      {/* Left spacer for symmetry */}
      <div className="w-28" />

      {/* Center: Playback Controls */}
      <div className="flex items-center gap-1.5">
        <IconButton
          aria-label="Jump to start (Home)"
          size="sm"
          onClick={handleJumpStart}
          title="Jump to start (Home)"
          className="hover:bg-white/[0.08] text-text-secondary hover:text-text-primary rounded w-8 h-8"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </IconButton>

        <IconButton
          aria-label="Step back 1 frame (Left Arrow)"
          size="sm"
          onClick={handleStepBackFrame}
          title="Step back 1 frame (Left Arrow)"
          className="hover:bg-white/[0.08] text-text-secondary hover:text-text-primary rounded w-8 h-8"
        >
          <StepBack className="w-3.5 h-3.5" />
        </IconButton>

        <button
          type="button"
          aria-label={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          onClick={handleTogglePlay}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          className="w-8 h-8 bg-accent hover:bg-accent-hover text-white rounded-lg shadow-sm flex items-center justify-center transition-all active:scale-95 mx-1"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        <IconButton
          aria-label="Step forward 1 frame (Right Arrow)"
          size="sm"
          onClick={handleStepForwardFrame}
          title="Step forward 1 frame (Right Arrow)"
          className="hover:bg-white/[0.08] text-text-secondary hover:text-text-primary rounded w-8 h-8"
        >
          <StepForward className="w-3.5 h-3.5" />
        </IconButton>

        <IconButton
          aria-label="Jump to end (End)"
          size="sm"
          onClick={handleJumpEnd}
          title="Jump to end (End)"
          className="hover:bg-white/[0.08] text-text-secondary hover:text-text-primary rounded w-8 h-8"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </IconButton>
      </div>

      {/* Right: Tabular Timecode Display & Fullscreen Button */}
      <div className="flex items-center gap-2 justify-end">
        <span
          ref={timecodeRef}
          className="text-xs font-mono tabular-nums text-text-secondary bg-white/[0.04] px-2.5 py-1 rounded border border-white/[0.06]"
          aria-label="Current timecode"
        >
          {formatTimecode(0, fps)} / {formatTimecode(totalDurationMs, fps)}
        </span>

        {onToggleFullscreen && (
          <IconButton
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Preview'}
            size="sm"
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen (Esc / F)' : 'Fullscreen Preview (F)'}
            className="hover:bg-white/[0.08] text-text-secondary hover:text-text-primary rounded ml-1 w-8 h-8"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </IconButton>
        )}
      </div>
    </div>
  );
};
