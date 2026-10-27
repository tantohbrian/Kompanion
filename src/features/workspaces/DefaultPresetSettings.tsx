import React from 'react';
import { Settings2 } from 'lucide-react';
import {
  CanvasRatio,
  VideoHeight,
  VideoFps,
  AnimationPresetId,
  TransitionPresetId,
} from '../../core/model/types';

export interface DefaultPresetSettingsProps {
  canvas: CanvasRatio;
  setCanvas: (c: CanvasRatio) => void;
  height: VideoHeight;
  setHeight: (h: VideoHeight) => void;
  fps: VideoFps;
  setFps: (f: VideoFps) => void;
  animId: AnimationPresetId;
  setAnimId: (a: AnimationPresetId) => void;
  kbDirection: 'in' | 'out' | 'alternate';
  setKbDirection: (d: 'in' | 'out' | 'alternate') => void;
  kbIntensity: number;
  setKbIntensity: (i: number) => void;
  panDirection: 'left' | 'right' | 'up' | 'down';
  setPanDirection: (d: 'left' | 'right' | 'up' | 'down') => void;
  transId: TransitionPresetId;
  setTransId: (t: TransitionPresetId) => void;
  transDurationMs: number;
  setTransDurationMs: (ms: number) => void;
}

export const DefaultPresetSettings: React.FC<DefaultPresetSettingsProps> = ({
  canvas,
  setCanvas,
  height,
  setHeight,
  fps,
  setFps,
  animId,
  setAnimId,
  kbDirection,
  setKbDirection,
  kbIntensity,
  setKbIntensity,
  panDirection,
  setPanDirection,
  transId,
  setTransId,
  transDurationMs,
  setTransDurationMs,
}) => {
  return (
    <div className="p-3 bg-surface-elevated rounded-panel border border-border space-y-3">
      <div className="flex items-center gap-1.5 pb-2 border-b border-border-subtle">
        <Settings2 className="w-3.5 h-3.5 text-accent" />
        <span className="text-xs font-semibold text-text-primary">
          Default Project Settings
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <label htmlFor="ws-aspect-select" className="block text-text-secondary mb-1">
            Aspect Ratio
          </label>
          <select
            id="ws-aspect-select"
            value={canvas}
            onChange={(e) => setCanvas(e.target.value as CanvasRatio)}
            className="w-full bg-surface border border-border rounded-control px-2 py-1 text-xs text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="16:9">16:9 (Landscape)</option>
            <option value="9:16">9:16 (Shorts / Vertical)</option>
          </select>
        </div>

        <div>
          <label htmlFor="ws-fps-select" className="block text-text-secondary mb-1">
            Framerate & Height
          </label>
          <div className="flex gap-1.5">
            <select
              id="ws-fps-select"
              value={fps}
              onChange={(e) => setFps(Number(e.target.value) as VideoFps)}
              className="flex-1 bg-surface border border-border rounded-control px-2 py-1 text-xs text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value={24}>24 fps</option>
              <option value={30}>30 fps</option>
              <option value={60}>60 fps</option>
            </select>
            <select
              id="ws-height-select"
              value={height}
              aria-label="Resolution height"
              onChange={(e) => setHeight(Number(e.target.value) as VideoHeight)}
              className="flex-1 bg-surface border border-border rounded-control px-2 py-1 text-xs text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value={1080}>1080p</option>
              <option value={720}>720p</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="ws-anim-select" className="block text-text-secondary mb-1">
            Default Animation
          </label>
          <select
            id="ws-anim-select"
            value={animId}
            onChange={(e) => setAnimId(e.target.value as AnimationPresetId)}
            className="w-full bg-surface border border-border rounded-control px-2 py-1 text-xs text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="none">None</option>
            <option value="ken-burns">Ken Burns</option>
            <option value="pan">Pan</option>
            <option value="pop">Pop</option>
          </select>
        </div>

        <div>
          <label htmlFor="ws-trans-select" className="block text-text-secondary mb-1">
            Default Transition
          </label>
          <select
            id="ws-trans-select"
            value={transId}
            onChange={(e) => setTransId(e.target.value as TransitionPresetId)}
            className="w-full bg-surface border border-border rounded-control px-2 py-1 text-xs text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="cut">Cut (0 ms)</option>
            <option value="crossfade">Crossfade</option>
            <option value="dip-to-black">Dip to Black</option>
          </select>
        </div>
      </div>

      {animId === 'ken-burns' && (
        <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
          <div>
            <label htmlFor="ws-kb-dir" className="block text-text-secondary mb-1">
              Direction
            </label>
            <select
              id="ws-kb-dir"
              value={kbDirection}
              onChange={(e) => setKbDirection(e.target.value as 'in' | 'out' | 'alternate')}
              className="w-full bg-surface border border-border rounded-control px-2 py-1 text-xs text-text-primary focus:outline-none"
            >
              <option value="in">Zoom In</option>
              <option value="out">Zoom Out</option>
              <option value="alternate">Alternate</option>
            </select>
          </div>
          <div>
            <div className="flex justify-between text-text-secondary mb-1">
              <span>Intensity</span>
              <span className="font-mono">{kbIntensity}</span>
            </div>
            <input
              type="range"
              min={4}
              max={10}
              value={kbIntensity}
              onChange={(e) => setKbIntensity(Number(e.target.value))}
              className="w-full accent-accent cursor-pointer"
            />
          </div>
        </div>
      )}

      {animId === 'pan' && (
        <div className="pt-2 text-xs">
          <label htmlFor="ws-pan-dir" className="block text-text-secondary mb-1">
            Pan Direction
          </label>
          <select
            id="ws-pan-dir"
            value={panDirection}
            onChange={(e) => setPanDirection(e.target.value as 'left' | 'right' | 'up' | 'down')}
            className="w-full bg-surface border border-border rounded-control px-2 py-1 text-xs text-text-primary focus:outline-none"
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="up">Up</option>
            <option value="down">Down</option>
          </select>
        </div>
      )}

      {transId !== 'cut' && (
        <div className="pt-2">
          <div className="flex justify-between text-xs text-text-secondary mb-1">
            <span>Transition Duration</span>
            <span className="font-mono tabular-nums">{transDurationMs} ms</span>
          </div>
          <input
            type="range"
            min={100}
            max={1000}
            step={50}
            value={transDurationMs}
            onChange={(e) => setTransDurationMs(Number(e.target.value))}
            className="w-full accent-accent cursor-pointer"
          />
        </div>
      )}
    </div>
  );
};
