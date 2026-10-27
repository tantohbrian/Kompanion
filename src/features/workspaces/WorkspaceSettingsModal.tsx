import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Dialog, Button } from '../../ui';
import { Workspace, CanvasRatio, VideoHeight, VideoFps, AnimationPresetId, TransitionPresetId } from '../../core/model/types';
import { WORKSPACE_COLOR_SWATCHES } from './workspaceStore';
import { DeleteWorkspaceDialog } from './DeleteWorkspaceDialog';
import { DefaultPresetSettings } from './DefaultPresetSettings';

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
  const [animId, setAnimId] = useState<AnimationPresetId>('none');
  const [kbDirection, setKbDirection] = useState<'in' | 'out' | 'alternate'>('in');
  const [kbIntensity, setKbIntensity] = useState<number>(5);
  const [panDirection, setPanDirection] = useState<'left' | 'right' | 'up' | 'down'>('left');
  const [transId, setTransId] = useState<TransitionPresetId>('cut');
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
      const aId = (workspace.defaults.animation.id as AnimationPresetId) || 'none';
      setAnimId(aId);
      if (workspace.defaults.animation.params) {
        const d = workspace.defaults.animation.params.direction;
        if (d === 'in' || d === 'out' || d === 'alternate') setKbDirection(d);
        if (d === 'left' || d === 'right' || d === 'up' || d === 'down') setPanDirection(d);
        if (workspace.defaults.animation.params.intensity) {
          setKbIntensity(Number(workspace.defaults.animation.params.intensity) || 5);
        }
      }
      const tId = (workspace.defaults.transition.id as TransitionPresetId) || 'cut';
      setTransId(tId);
      setTransDurationMs(workspace.defaults.transition.durationMs || 500);
    }
  }, [workspace, open]);

  if (!workspace) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const animParams: Record<string, number | string> = {};
      if (animId === 'ken-burns') {
        animParams.direction = kbDirection;
        animParams.intensity = kbIntensity;
      } else if (animId === 'pan') {
        animParams.direction = panDirection;
      }
      await onSave(workspace.id, {
        name: name.trim(),
        color,
        defaults: {
          canvas,
          height,
          fps,
          animation: { id: animId, params: animParams },
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
          <DefaultPresetSettings
            canvas={canvas}
            setCanvas={setCanvas}
            height={height}
            setHeight={setHeight}
            fps={fps}
            setFps={setFps}
            animId={animId}
            setAnimId={setAnimId}
            kbDirection={kbDirection}
            setKbDirection={setKbDirection}
            kbIntensity={kbIntensity}
            setKbIntensity={setKbIntensity}
            panDirection={panDirection}
            setPanDirection={setPanDirection}
            transId={transId}
            setTransId={setTransId}
            transDurationMs={transDurationMs}
            setTransDurationMs={setTransDurationMs}
          />

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
