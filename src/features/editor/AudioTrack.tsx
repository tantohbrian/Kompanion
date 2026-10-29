import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';
import { IconButton } from '../../ui';
import { useTimelineStore } from '../../core/timeline';
import { playerController } from './playerController';

export interface AudioTrackProps {
  pxPerMs: number;
  totalDurationMs?: number;
}

export const AudioTrack: React.FC<AudioTrackProps> = ({ pxPerMs, totalDurationMs = 0 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(playerController.getCurrentTimeMs());

  const project = useTimelineStore((s) => s.project);
  const updateAudio = useTimelineStore((s) => s.updateAudio);

  const audioClips = project.timeline.audio;
  const muted = project.timeline.muted;
  const gain = project.timeline.gain;

  const firstAudio = audioClips[0];
  const audioAsset = firstAudio ? project.assets.find((a) => a.id === firstAudio.assetId) : null;
  const durationMs = audioAsset?.meta.durationMs || totalDurationMs || 5000;
  const trackWidthPx = Math.max(100, Math.round(durationMs * pxPerMs));
  const canvasWidth = Math.min(8192, Math.max(100, trackWidthPx));

  // Subscribe to playback time for progress wave tinting
  useEffect(() => {
    const unsub = playerController.subscribeTime((tMs) => {
      setCurrentTimeMs(tMs);
    });
    return unsub;
  }, []);

  // Draw high-resolution mirrored audio waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !firstAudio) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const midY = height / 2;
    const playheadPx = Math.round(currentTimeMs * pxPerMs);

    // Subtle center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    const barWidth = 2;
    const barGap = 1;
    const stride = barWidth + barGap;
    const barCount = Math.floor(width / stride);

    for (let i = 0; i < barCount; i++) {
      const x = i * stride;
      // Deterministic speech-like envelope peaks
      const envelope =
        Math.abs(Math.sin(i * 0.12) * Math.cos(i * 0.04)) * 0.7 +
        Math.abs(Math.sin(i * 0.45)) * 0.3;
      const amp = Math.max(3, envelope * (height * 0.42));

      // Played vs unplayed tinting
      const isPlayed = x <= playheadPx;
      if (muted) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      } else if (isPlayed) {
        ctx.fillStyle = '#38bdf8'; // bright played accent
      } else {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)'; // unplayed accent
      }

      // Mirrored vertical bar
      ctx.fillRect(x, midY - amp, barWidth, amp * 2);
    }
  }, [firstAudio, muted, canvasWidth, currentTimeMs, pxPerMs]);

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !muted;
    updateAudio(undefined, nextMuted);
    playerController.getClock().setMuted(nextMuted);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const updateSeek = (clientX: number) => {
      const offsetX = Math.max(0, clientX - rect.left);
      const seekMs = Math.round(offsetX / pxPerMs);
      playerController.seek(seekMs);
    };

    updateSeek(e.clientX);
    trackRef.current.setPointerCapture(e.pointerId);

    const onPointerMove = (moveEvent: PointerEvent) => {
      updateSeek(moveEvent.clientX);
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      if (trackRef.current) {
        try {
          trackRef.current.releasePointerCapture(upEvent.pointerId);
        } catch {
          // Ignore
        }
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  if (audioClips.length === 0) {
    return (
      <div
        className="h-14 bg-canvas/60 border-t border-border-subtle flex items-center px-4 text-xs text-text-tertiary select-none min-w-full"
        aria-label="Audio Track"
      >
        <Music className="w-3.5 h-3.5 mr-2 text-text-tertiary" />
        No voiceover or music track added
      </div>
    );
  }

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      className="h-16 bg-canvas border-t border-border-subtle relative min-w-full select-none cursor-pointer overflow-hidden flex items-center"
      aria-label="Audio Track"
    >
      <div
        className={`absolute inset-y-1.5 left-0 rounded border flex items-center overflow-hidden transition-colors ${
          muted
            ? 'bg-surface-elevated/40 border-border opacity-60'
            : 'bg-accent/10 border-accent/40'
        }`}
        style={{ width: `${trackWidthPx}px` }}
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={48}
          className="absolute inset-0 w-full h-full block pointer-events-none"
        />

        {/* Audio Track Controls Overlay */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-2 flex items-center gap-2 z-10 bg-surface/85 backdrop-blur-sm px-2 py-0.5 rounded border border-border-subtle shadow-sm pointer-events-auto"
        >
          <IconButton
            aria-label={muted ? 'Unmute Audio Track' : 'Mute Audio Track'}
            size="sm"
            onClick={handleToggleMute}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? (
              <VolumeX className="w-3 h-3 text-status-error" />
            ) : (
              <Volume2 className="w-3 h-3 text-accent" />
            )}
          </IconButton>
          <span className="font-mono text-[10px] text-text-secondary tabular-nums">
            {muted ? 'MUTED' : `${Math.round(gain * 100)}%`}
          </span>
        </div>
      </div>
    </div>
  );
};
