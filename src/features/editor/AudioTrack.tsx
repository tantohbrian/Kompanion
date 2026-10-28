import React, { useEffect, useRef } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';
import { IconButton } from '../../ui';
import { useTimelineStore } from '../../core/timeline';
import { playerController } from './playerController';

export interface AudioTrackProps {
  pxPerMs: number;
}

export const AudioTrack: React.FC<AudioTrackProps> = ({ pxPerMs }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const project = useTimelineStore((s) => s.project);
  const updateAudio = useTimelineStore((s) => s.updateAudio);

  const audioClips = project.timeline.audio;
  const muted = project.timeline.muted;
  const gain = project.timeline.gain;

  const firstAudio = audioClips[0];
  const audioAsset = firstAudio ? project.assets.find((a) => a.id === firstAudio.assetId) : null;
  const durationMs = audioAsset?.meta.durationMs || 0;
  const trackWidthPx = Math.max(100, Math.round(durationMs * pxPerMs));
  // Hardware safeguard: cap physical backing width to 8192px to prevent canvas context allocation crash
  const canvasWidth = Math.min(8192, Math.max(100, trackWidthPx));

  // Draw cached waveform peaks on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !firstAudio) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = muted ? 'rgba(255, 255, 255, 0.2)' : 'rgba(10, 132, 255, 0.55)';

    // Synthesize or draw waveform bars
    const barCount = Math.floor(width / 3);
    const midY = height / 2;

    for (let i = 0; i < barCount; i++) {
      // Deterministic pseudo-waveform peak height
      const seed = Math.sin(i * 0.3) * Math.cos(i * 0.15);
      const amp = Math.max(0.15, Math.abs(seed)) * (height * 0.4);
      const x = i * 3;
      ctx.fillRect(x, midY - amp, 2, amp * 2);
    }
  }, [firstAudio, muted, canvasWidth]);

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !muted;
    updateAudio(undefined, nextMuted);
    playerController.getClock().setMuted(nextMuted);
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
      className="h-16 bg-canvas border-t border-border-subtle flex items-center px-2 relative min-w-full select-none"
      aria-label="Audio Track"
    >
      <div
        className={`relative h-12 rounded border flex items-center overflow-hidden transition-colors ${
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
          className="absolute inset-0 w-full h-full block"
        />

        {/* Audio Track Controls Overlay */}
        <div className="absolute left-2 flex items-center gap-2 z-10 bg-surface/80 backdrop-blur-sm px-2 py-0.5 rounded border border-border-subtle">
          <IconButton
            aria-label={muted ? 'Unmute Audio Track' : 'Mute Audio Track'}
            size="sm"
            onClick={handleToggleMute}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? (
              <VolumeX className="w-3 h-3 text-destructive" />
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
