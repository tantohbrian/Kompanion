import React, { useRef } from 'react';
import { Copy, Trash2, ImagePlus } from 'lucide-react';
import { Button, IconButton } from '../../ui';
import { useTimelineStore } from '../../core/timeline';
import { Clip } from '../../core/model/types';
import { saveMediaFile } from '../../core/storage/opfs';

export interface ClipInspectorProps {
  clip: Clip;
  index: number;
  totalClips: number;
}

export const ClipInspector: React.FC<ClipInspectorProps> = ({ clip, index, totalClips }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const setClipDuration = useTimelineStore((s) => s.setClipDuration);
  const updateClip = useTimelineStore((s) => s.updateClip);
  const applyToAllClips = useTimelineStore((s) => s.applyToAllClips);
  const deleteClip = useTimelineStore((s) => s.deleteClip);
  const replaceAsset = useTimelineStore((s) => s.replaceAsset);
  const project = useTimelineStore((s) => s.project);

  const asset = project?.assets.find((a) => a.id === clip.assetId);

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valMs = Math.round(parseFloat(e.target.value || '1') * 1000);
    if (!isNaN(valMs) && valMs >= 100) {
      setClipDuration(clip.id, valMs);
    }
  };

  const handleFitChange = (fit: 'cover' | 'contain') => {
    updateClip(clip.id, { fit });
  };

  const handleAnimationTypeChange = (animType: string) => {
    if (animType === 'inherit') {
      updateClip(clip.id, { animation: 'inherit' });
    } else if (animType === 'none') {
      updateClip(clip.id, { animation: { id: 'none', params: {} } });
    } else if (animType === 'ken-burns') {
      updateClip(clip.id, {
        animation: { id: 'ken-burns', params: { direction: 'alternate', intensity: 8 } },
      });
    } else if (animType === 'pan') {
      updateClip(clip.id, {
        animation: { id: 'pan', params: { direction: 'left', distance: 10 } },
      });
    } else if (animType === 'pop') {
      updateClip(clip.id, {
        animation: { id: 'pop', params: { overshoot: 1.1 } },
      });
    }
  };

  const handleTransitionTypeChange = (transType: string) => {
    if (transType === 'inherit') {
      updateClip(clip.id, { transitionIn: 'inherit' });
    } else if (transType === 'cut') {
      updateClip(clip.id, { transitionIn: { id: 'cut', durationMs: 0 } });
    } else if (transType === 'crossfade') {
      const maxTransMs = Math.floor(clip.durationMs * 0.5);
      updateClip(clip.id, {
        transitionIn: { id: 'crossfade', durationMs: Math.min(500, maxTransMs) },
      });
    } else if (transType === 'dip-to-black') {
      const maxTransMs = Math.floor(clip.durationMs * 0.5);
      updateClip(clip.id, {
        transitionIn: { id: 'dip-to-black', durationMs: Math.min(500, maxTransMs) },
      });
    } else if (transType === 'slide') {
      const maxTransMs = Math.floor(clip.durationMs * 0.5);
      updateClip(clip.id, {
        transitionIn: { id: 'slide', durationMs: Math.min(500, maxTransMs) },
      });
    }
  };

  const handleTransitionDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const durMs = parseInt(e.target.value, 10);
    if (!isNaN(durMs) && clip.transitionIn !== 'inherit') {
      const maxTransMs = Math.floor(clip.durationMs * 0.5);
      updateClip(clip.id, {
        transitionIn: {
          ...clip.transitionIn,
          durationMs: Math.min(durMs, maxTransMs),
        },
      });
    }
  };

  const handleApplyToAll = () => {
    applyToAllClips({
      fit: clip.fit,
      animation: clip.animation,
      transitionIn: clip.transitionIn,
    });
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;

    const newAssetId = `asset-${Date.now()}`;
    const storageKey = `projects/${project.id}/assets/${newAssetId}-${file.name}`;
    await saveMediaFile(storageKey, file, file.type);

    // Add to project assets
    const newAsset = {
      id: newAssetId,
      kind: 'image' as const,
      name: file.name,
      storageKey,
      order: project.assets.length + 1,
      meta: { bytes: file.size },
    };
    useTimelineStore.setState((state) => ({
      project: { ...state.project, assets: [...state.project.assets, newAsset] },
    }));

    replaceAsset(clip.id, newAssetId);
  };

  const currentAnimId = clip.animation === 'inherit' ? 'inherit' : clip.animation.id;
  const currentTransId = clip.transitionIn === 'inherit' ? 'inherit' : clip.transitionIn.id;
  const transDuration = clip.transitionIn === 'inherit' ? 500 : clip.transitionIn.durationMs;

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 text-xs text-text-primary select-none">
      {/* Header Info */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <span className="font-semibold text-text-primary">Clip #{index + 1}</span>
          <span className="text-text-tertiary ml-1.5">of {totalClips}</span>
        </div>
        <IconButton
          aria-label="Delete clip"
          size="sm"
          variant="destructive"
          onClick={() => deleteClip(clip.id)}
          title="Delete clip (Delete / Backspace)"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </IconButton>
      </div>

      {/* Asset Preview & Replace */}
      <div className="flex flex-col gap-2">
        <label className="text-text-secondary font-medium">Source Image</label>
        <div className="flex items-center gap-3 bg-surface-elevated/40 p-2.5 rounded-control border border-border-subtle">
          <div className="w-12 h-12 bg-black rounded flex items-center justify-center text-text-tertiary font-mono text-[10px] overflow-hidden shrink-0">
            {asset?.name ? asset.name.slice(0, 8) : 'IMG'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-text-primary font-medium">{asset?.name || 'Asset ' + clip.assetId}</p>
            <p className="text-text-tertiary text-[11px]">ID: {clip.assetId.slice(0, 10)}…</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Replace Image"
          >
            <ImagePlus className="w-3.5 h-3.5 mr-1" />
            Replace
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelected}
          />
        </div>
      </div>

      {/* Duration */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="clip-duration-input" className="text-text-secondary font-medium">
          Duration (seconds)
        </label>
        <div className="flex items-center gap-2">
          <input
            id="clip-duration-input"
            type="number"
            step="0.1"
            min="0.1"
            max="120"
            value={(clip.durationMs / 1000).toFixed(2)}
            onChange={handleDurationChange}
            className="w-full bg-surface-elevated border border-border rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent font-mono tabular-nums"
          />
          <span className="text-text-tertiary font-mono">{clip.durationMs}ms</span>
        </div>
      </div>

      {/* Fit Mode */}
      <div className="flex flex-col gap-1.5">
        <label className="text-text-secondary font-medium">Image Fit</label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant={clip.fit === 'cover' ? 'primary' : 'secondary'}
            onClick={() => handleFitChange('cover')}
          >
            Cover (Overscan)
          </Button>
          <Button
            size="sm"
            variant={clip.fit === 'contain' ? 'primary' : 'secondary'}
            onClick={() => handleFitChange('contain')}
          >
            Contain (Letterbox)
          </Button>
        </div>
      </div>

      {/* Animation Preset */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="anim-preset-select" className="text-text-secondary font-medium">
          Motion / Animation
        </label>
        <select
          id="anim-preset-select"
          value={currentAnimId}
          onChange={(e) => handleAnimationTypeChange(e.target.value)}
          className="w-full bg-surface-elevated border border-border rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="inherit">Inherit (Workspace Default)</option>
          <option value="none">None (Static)</option>
          <option value="ken-burns">Ken Burns (Pan & Zoom)</option>
          <option value="pan">Pan</option>
          <option value="pop">Pop</option>
        </select>
      </div>

      {/* Transition-In Preset */}
      <div className="flex flex-col gap-2">
        <label htmlFor="trans-preset-select" className="text-text-secondary font-medium">
          Transition In
        </label>
        <select
          id="trans-preset-select"
          value={currentTransId}
          onChange={(e) => handleTransitionTypeChange(e.target.value)}
          className="w-full bg-surface-elevated border border-border rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="inherit">Inherit (Workspace Default)</option>
          <option value="cut">Cut (0ms)</option>
          <option value="crossfade">Crossfade</option>
          <option value="dip-to-black">Dip to Black</option>
          <option value="slide">Slide</option>
        </select>

        {currentTransId !== 'cut' && currentTransId !== 'inherit' && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-text-tertiary">Duration:</span>
            <input
              type="range"
              aria-label="Transition duration slider"
              min="100"
              max={Math.floor(clip.durationMs * 0.5)}
              step="50"
              value={transDuration}
              onChange={handleTransitionDurationChange}
              className="flex-1 accent-accent"
            />
            <span className="font-mono text-text-secondary tabular-nums">{transDuration}ms</span>
          </div>
        )}
      </div>

      {/* Apply to All Clips Button */}
      <div className="pt-3 border-t border-border mt-auto">
        <Button
          size="sm"
          variant="secondary"
          className="w-full justify-center"
          onClick={handleApplyToAll}
          aria-label="Apply to all clips"
        >
          <Copy className="w-3.5 h-3.5 mr-1.5" />
          Apply to All Clips
        </Button>
      </div>
    </div>
  );
};
