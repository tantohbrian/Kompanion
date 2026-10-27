import React, { useState } from 'react';
import { Plus, Info } from 'lucide-react';
import { Dialog, Button } from '../../ui';
import { ProjectDefaults } from '../../core/model/types';

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceName: string;
  workspaceDefaults: ProjectDefaults;
  onCreate: (name: string) => Promise<void>;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  open,
  onOpenChange,
  workspaceName,
  workspaceDefaults,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      await onCreate(name.trim());
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
      title="Create New Project"
      description={`Add a video timeline project in ${workspaceName}.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div>
          <label htmlFor="proj-name-input" className="block text-xs font-semibold text-text-primary mb-1">
            Project Name
          </label>
          <input
            id="proj-name-input"
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-surface-elevated border border-border rounded-control px-3 py-1.5 text-xs text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            placeholder="e.g. 5 Habit Hacks of Stoics"
          />
        </div>

        {/* Inherited Defaults Notice */}
        <div className="flex items-start gap-2.5 p-3 bg-surface-elevated border border-border rounded-panel text-xs">
          <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <div className="text-text-secondary leading-relaxed">
            <p className="font-medium text-text-primary">Inheriting Channel Defaults</p>
            <p className="text-2xs text-text-tertiary mt-0.5">
              Resolution: <span className="text-text-secondary font-mono">{workspaceDefaults.canvas} ({workspaceDefaults.height}p @ {workspaceDefaults.fps}fps)</span>
            </p>
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
            {isCreating ? 'Creating…' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
