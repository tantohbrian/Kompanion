import React from 'react';
import { Volume2, VolumeX, Sliders } from 'lucide-react';
import { Button, IconButton } from '../../ui';
import { useTimelineStore, formatTimecode, calculateTotalVisualDuration } from '../../core/timeline';
import { playerController } from './playerController';

export const ProjectInspector: React.FC = () => {
  const project = useTimelineStore((s) => s.project);
  const updateAudio = useTimelineStore((s) => s.updateAudio);
  const updateProjectSettings = useTimelineStore((s) => s.updateProjectSettings);

  const { settings, timeline } = project;
  const clips = timeline.clips;
  const audio = timeline.audio;
  const visualDuration = calculateTotalVisualDuration(clips);
  const audioDuration = audio.reduce((max, a) => {
    const asset = project.assets.find((as) => as.id === a.assetId);
    return Math.max(max, a.offsetMs + (asset?.meta.durationMs || 0));
  }, 0);
  const totalDurationMs = Math.max(visualDuration, audioDuration);

  const handleAspectChange = (canvas: '16:9' | '9:16') => {
    updateProjectSettings({ canvas });
  };

  const handleHeightChange = (height: 1080 | 720) => {
    updateProjectSettings({ height });
  };

  const handleFpsChange = (fps: 24 | 30 | 60) => {
    updateProjectSettings({ fps });
  };

  const handleGainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const gain = parseFloat(e.target.value);
    updateAudio(gain, undefined);
    playerController.getClock().setGain(gain);
  };

  const handleToggleMute = () => {
    const nextMuted = !timeline.muted;
    updateAudio(undefined, nextMuted);
    playerController.getClock().setMuted(nextMuted);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 text-xs text-text-primary select-none">
      {/* Header Info */}
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <Sliders className="w-4 h-4 text-accent" />
        <span className="font-semibold text-text-primary">Project Settings</span>
      </div>

      {/* Canvas Aspect Ratio */}
      <div className="flex flex-col gap-1.5">
        <label className="text-text-secondary font-medium">Canvas Aspect</label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant={settings.canvas === '16:9' ? 'primary' : 'secondary'}
            onClick={() => handleAspectChange('16:9')}
          >
            16:9 Landscape
          </Button>
          <Button
            size="sm"
            variant={settings.canvas === '9:16' ? 'primary' : 'secondary'}
            onClick={() => handleAspectChange('9:16')}
          >
            9:16 Shorts / Reels
          </Button>
        </div>
      </div>

      {/* Resolution */}
      <div className="flex flex-col gap-1.5">
        <label className="text-text-secondary font-medium">Resolution</label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant={settings.height === 1080 ? 'primary' : 'secondary'}
            onClick={() => handleHeightChange(1080)}
          >
            1080p (Full HD)
          </Button>
          <Button
            size="sm"
            variant={settings.height === 720 ? 'primary' : 'secondary'}
            onClick={() => handleHeightChange(720)}
          >
            720p (HD)
          </Button>
        </div>
      </div>

      {/* Frame Rate */}
      <div className="flex flex-col gap-1.5">
        <label className="text-text-secondary font-medium">Frame Rate</label>
        <div className="grid grid-cols-3 gap-1.5">
          {([24, 30, 60] as const).map((rate) => (
            <Button
              key={rate}
              size="sm"
              variant={settings.fps === rate ? 'primary' : 'secondary'}
              onClick={() => handleFpsChange(rate)}
            >
              {rate} fps
            </Button>
          ))}
        </div>
      </div>

      {/* Master Audio Track Volume & Mute */}
      <div className="flex flex-col gap-2 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-text-secondary font-medium">Master Audio Volume</span>
          <IconButton
            aria-label={timeline.muted ? 'Unmute Audio' : 'Mute Audio'}
            size="sm"
            onClick={handleToggleMute}
            title={timeline.muted ? 'Unmute' : 'Mute'}
          >
            {timeline.muted ? (
              <VolumeX className="w-3.5 h-3.5 text-destructive" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </IconButton>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            aria-label="Master audio volume slider"
            min="0"
            max="2"
            step="0.05"
            value={timeline.muted ? 0 : timeline.gain}
            disabled={timeline.muted}
            onChange={handleGainChange}
            className="flex-1 accent-accent"
          />
          <span className="font-mono text-text-secondary w-10 text-right tabular-nums">
            {timeline.muted ? '0%' : `${Math.round(timeline.gain * 100)}%`}
          </span>
        </div>
      </div>

      {/* Timeline Summary */}
      <div className="bg-surface-elevated/40 p-3 rounded-control border border-border-subtle flex flex-col gap-1.5 text-text-tertiary mt-auto">
        <div className="flex justify-between">
          <span>Clips:</span>
          <span className="font-mono text-text-primary font-medium">{clips.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Total Duration:</span>
          <span className="font-mono text-text-primary font-medium">
            {formatTimecode(totalDurationMs, settings.fps)}
          </span>
        </div>
      </div>
    </div>
  );
};
