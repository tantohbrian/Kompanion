import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Dialog, Button } from '../../ui';
import { CanvasRatio, VideoHeight, VideoFps } from '../../core/model/types';
import { WORKSPACE_COLOR_SWATCHES } from './workspaceStore';

interface CreateWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, color: string, defaults?: { canvas: CanvasRatio; height: VideoHeight; fps: VideoFps }) => Promise<void>;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  open,
  onOpenChange,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(WORKSPACE_COLOR_SWATCHES[0]);
  const [canvas, setCanvas] = useState<CanvasRatio>('16:9');
  const [height, setHeight] = useState<VideoHeight>(1080);
  const [fps, setFps] = useState<VideoFps>(30);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      await onCreate(name.trim(), color, { canvas, height, fps });
      setName('');
      onOpenChange(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create New Channel"
      description="Add a dedicated channel workspace with its own projects and presets."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div>
          <label htmlFor="create-ws-name" className="block text-xs font-semibold text-text-primary mb-1">
            Channel Name
          </label>
          <input
            id="create-ws-name"
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-surface-elevated border border-border rounded-control px-3 py-1.5 text-xs text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            placeholder="e.g. Daily Stoic, Mystery Files"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1.5">
            Channel Swatch Color
          </label>
          <div className="flex items-center gap-2" role="radiogroup" aria-label="Channel Swatch Color">
            {WORKSPACE_COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => setColor(swatch)}
                role="radio"
                aria-checked={color === swatch}
                aria-label={`Select color ${swatch}`}
                style={{ backgroundColor: swatch }}
                className={`w-6 h-6 rounded-full transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  color === swatch ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-3 bg-surface-elevated rounded-panel border border-border">
          <p className="text-2xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
            Initial Channel Defaults
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label htmlFor="create-ws-aspect" className="block text-text-secondary mb-1">Aspect Ratio</label>
              <select
                id="create-ws-aspect"
                value={canvas}
                onChange={(e) => setCanvas(e.target.value as CanvasRatio)}
                className="w-full bg-surface border border-border rounded-control px-2 py-1 text-xs text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Shorts / Vertical)</option>
              </select>
            </div>
            <div>
              <label htmlFor="create-ws-res" className="block text-text-secondary mb-1">Resolution & FPS</label>
              <div className="flex gap-1.5">
                <select
                  id="create-ws-res"
                  aria-label="Resolution Height"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value) as VideoHeight)}
                  className="flex-1 bg-surface border border-border rounded-control px-2 py-1 text-xs text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <option value={1080}>1080p</option>
                  <option value={720}>720p</option>
                </select>
                <select
                  value={fps}
                  aria-label="Framerate FPS"
                  onChange={(e) => setFps(Number(e.target.value) as VideoFps)}
                  className="flex-1 bg-surface border border-border rounded-control px-2 py-1 text-xs text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <option value={24}>24 fps</option>
                  <option value={30}>30 fps</option>
                  <option value={60}>60 fps</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isCreating}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            {isCreating ? 'Creating…' : 'Create Channel'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
