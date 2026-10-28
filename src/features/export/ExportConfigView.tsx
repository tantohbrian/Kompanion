import React from 'react';
import { Film, Music, Sliders } from 'lucide-react';
import { Button } from '../../ui';
import { Project } from '../../core/model/types';
import { getExportPresets } from './presets';

interface Props {
  project: Project;
  height: number;
  fps: number;
  includeAudio: boolean;
  onHeightChange: (h: number) => void;
  onFpsChange: (f: number) => void;
  onAudioChange: (a: boolean) => void;
  onStartExport: () => void;
  onCancel: () => void;
}

export const ExportConfigView: React.FC<Props> = ({
  project,
  height,
  fps,
  includeAudio,
  onHeightChange,
  onFpsChange,
  onAudioChange,
  onStartExport,
  onCancel,
}) => {
  const isVertical = project.settings.canvas === '9:16';
  const width = isVertical
    ? Math.round((height * 9) / 16)
    : Math.round((height * 16) / 9);

  const presets = getExportPresets();

  return (
    <div className="space-y-4 py-2">
      {/* Quick Presets */}
      <div>
        <label className="text-xs font-medium text-text-primary mb-1.5 block">
          Quality Preset
        </label>
        <div className="grid grid-cols-3 gap-2">
          {presets.map((p) => {
            const active = height === p.height && fps === p.fps;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onHeightChange(p.height);
                  onFpsChange(p.fps);
                }}
                className={`px-2.5 py-2 text-left rounded-lg border text-xs transition-colors ${
                  active
                    ? 'border-accent bg-accent/15'
                    : 'border-border bg-surface-raised hover:border-border-hover'
                }`}
              >
                <div className="font-semibold text-xs truncate text-text-primary">
                  {p.height}p{p.fps}
                </div>
                <div className="text-[11px] text-text-secondary mt-0.5 truncate">
                  {p.fps} fps
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Configuration */}
      <div className="p-3 bg-surface-raised border border-border rounded-lg space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" />
            Resolution Height
          </span>
          <div className="flex gap-1.5">
            {[1080, 720].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => onHeightChange(h)}
                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                  height === h
                    ? 'bg-accent text-white font-medium'
                    : 'bg-surface text-text-secondary hover:text-text-primary'
                }`}
              >
                {h}p
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5" />
            Frame Rate
          </span>
          <div className="flex gap-1.5">
            {[24, 30, 60].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onFpsChange(f)}
                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                  fps === f
                    ? 'bg-accent text-white font-medium'
                    : 'bg-surface text-text-secondary hover:text-text-primary'
                }`}
              >
                {f} fps
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
          <span className="text-text-secondary flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5" />
            Audio Track
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onAudioChange(true)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                includeAudio
                  ? 'bg-accent text-white font-medium'
                  : 'bg-surface text-text-secondary hover:text-text-primary'
              }`}
            >
              With audio
            </button>
            <button
              type="button"
              onClick={() => onAudioChange(false)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                !includeAudio
                  ? 'bg-accent text-white font-medium'
                  : 'bg-surface text-text-secondary hover:text-text-primary'
              }`}
            >
              Visuals only
            </button>
          </div>
        </div>
      </div>

      {/* Storage & Resolution preview */}
      <div className="space-y-1.5 px-1 text-[11px] text-text-muted">
        <div className="flex justify-between">
          <span>Canvas Dimensions:</span>
          <span className="font-mono text-text-secondary">
            {width} x {height} ({project.settings.canvas})
          </span>
        </div>
        <div className="flex justify-between items-center text-[10px]">
          <span>Destination:</span>
          <span className="text-text-secondary">
            {typeof window !== 'undefined' && 'showSaveFilePicker' in window
              ? 'File System Access API (Direct Stream)'
              : 'In-Memory Buffer (RAM fallback)'}
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={onStartExport}>
          Start Export
        </Button>
      </div>
    </div>
  );
};
