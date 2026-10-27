import React, { useState, useEffect } from 'react';
import { Settings2, Trash2 } from 'lucide-react';
import { Dialog, Button } from '../../ui';
import { Workspace, CanvasRatio, VideoHeight, VideoFps } from '../../core/model/types';
import { WORKSPACE_COLOR_SWATCHES } from './workspaceStore';
import { DeleteWorkspaceDialog } from './DeleteWorkspaceDialog';

interface WorkspaceSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: Workspace | null;
  onSave: (id: string, updates: Partial<Workspace>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const WorkspaceSettingsModal: React.FC<WorkspaceSettingsModalProps> = ({
  open,
  onOpenChange,
  workspace,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(WORKSPACE_COLOR_SWATCHES[0]);
  const [canvas, setCanvas] = useState<CanvasRatio>('16:9');
  const [height, setHeight] = useState<VideoHeight>(1080);
  const [fps, setFps] = useState<VideoFps>(30);
  const [animId, setAnimId] = useState('none');
  const [transId, setTransId] = useState('cut');
  const [transDurationMs, setTransDurationMs] = useState(500);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (workspace && open) {
      setName(workspace.name);
      setColor(workspace.color);
      setCanvas(workspace.defaults.canvas);
      setHeight(workspace.defaults.height);
      setFps(workspace.defaults.fps);
      setAnimId(workspace.defaults.animation.id);
      setTransId(workspace.defaults.transition.id);
      setTransDurationMs(workspace.defaults.transition.durationMs || 500);
    }
  }, [workspace, open]);

  if (!workspace) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSave(workspace.id, {
        name: name.trim(),
        color,
        defaults: {
          canvas,
          height,
          fps,
          animation: { id: animId, params: {} },
          transition: {
            id: transId,
            durationMs: transId === 'cut' ? 0 : Math.round(transDurationMs),
          },
        },
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title="Channel Settings"
        description="Configure channel identity and default settings for new projects."
      >
        <form onSubmit={handleSave} className="space-y-5 pt-2">
          {/* Channel Name */}
          <div>
            <label htmlFor="ws-name-input" className="block text-xs font-semibold text-text-primary mb-1">
              Channel Name
            </label>
            <input
              id="ws-name-input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-elevated border border-border rounded-control px-3 py-1.5 text-xs text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              placeholder="e.g. History Uncovered"
            />
          </div>

          {/* Color Swatches */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Channel Color
            </label>
            <div className="flex items-center gap-2" role="radiogroup" aria-label="Channel Color">
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

          {/* Defaults Section */}
          <div className="p-3 bg-surface-elevated rounded-panel border border-border space-y-3">
            <div className="flex items-center gap-1.5 pb-2 border-b border-border-subtle">
              <Settings2 className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-semibold text-text-primary">
                Default Project Settings
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label htmlFor="ws-aspect-select" className="block text-text-secondary mb-1">Aspect Ratio</label>
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
                <label htmlFor="ws-fps-select" className="block text-text-secondary mb-1">Framerate & Height</label>
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
                <label htmlFor="ws-anim-select" className="block text-text-secondary mb-1">Default Animation</label>
                <select
                  id="ws-anim-select"
                  value={animId}
                  onChange={(e) => setAnimId(e.target.value)}
                  className="w-full bg-surface border border-border rounded-control px-2 py-1 text-xs text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <option value="none">None (Static)</option>
                  <option value="zoom-in">Ken Burns: Zoom In</option>
                  <option value="zoom-out">Ken Burns: Zoom Out</option>
                  <option value="pan-left">Ken Burns: Pan Left</option>
                  <option value="pan-right">Ken Burns: Pan Right</option>
                </select>
              </div>

              <div>
                <label htmlFor="ws-trans-select" className="block text-text-secondary mb-1">Default Transition</label>
                <select
                  id="ws-trans-select"
                  value={transId}
                  onChange={(e) => setTransId(e.target.value)}
                  className="w-full bg-surface border border-border rounded-control px-2 py-1 text-xs text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <option value="cut">Cut (0 ms)</option>
                  <option value="crossfade">Crossfade (Dissolve)</option>
                  <option value="dip-to-black">Dip to Black</option>
                </select>
              </div>
            </div>

            {transId !== 'cut' && (
              <div className="pt-2">
                <div className="flex justify-between text-xs text-text-secondary mb-1">
                  <span>Transition Duration</span>
                  <span className="font-mono tabular-nums">{transDurationMs} ms</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={2000}
                  step={50}
                  value={transDurationMs}
                  onChange={(e) => setTransDurationMs(Number(e.target.value))}
                  className="w-full accent-accent cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Delete Channel
            </Button>

            <div className="flex items-center gap-2">
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
                disabled={isSaving}
              >
                {isSaving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </Dialog>

      <DeleteWorkspaceDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        workspaceName={workspace.name}
        onConfirmDelete={async () => {
          await onDelete(workspace.id);
          onOpenChange(false);
        }}
      />
    </>
  );
};
