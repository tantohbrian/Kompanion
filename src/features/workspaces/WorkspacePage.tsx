import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Plus, Settings } from 'lucide-react';
import { Button, IconButton, Panel } from '../../ui';
import { useWorkspaceStore } from './workspaceStore';
import { Workspace } from '../../core/model/types';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import { WorkspaceSettingsModal } from './WorkspaceSettingsModal';

export const WorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    workspaces,
    isLoading,
    fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  } = useWorkspaceStore();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  return (
    <div className="flex flex-col h-full bg-canvas text-text-primary">
      <main className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">Workspaces</h1>
            <p className="text-xs text-text-secondary mt-1">
              Select or configure a YouTube channel workspace to manage projects and defaults.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateOpen(true)}
            aria-label="Create new channel"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Channel
          </Button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 bg-surface border border-border rounded-panel animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Workspaces Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((ws) => (
              <Panel
                key={ws.id}
                className="p-5 flex flex-col justify-between hover:border-border-strong transition-colors duration-fast group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="w-8 h-8 rounded-panel flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: ws.color }}
                    >
                      <Folder className="w-4 h-4" />
                    </div>
                    <IconButton
                      size="sm"
                      aria-label={`Edit settings for ${ws.name}`}
                      onClick={() => setEditingWorkspace(ws)}
                      className="text-text-tertiary hover:text-text-primary"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </IconButton>
                  </div>

                  <h2 className="text-sm font-semibold text-text-primary mb-1 truncate">
                    {ws.name}
                  </h2>
                  <p className="text-xs text-text-secondary">
                    {ws.defaults.canvas} • {ws.defaults.height}p @ {ws.defaults.fps}fps
                  </p>
                  <p className="text-2xs text-text-tertiary mt-1">
                    Transition: {ws.defaults.transition.id} {ws.defaults.transition.durationMs > 0 ? `(${ws.defaults.transition.durationMs}ms)` : ''}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-border-subtle flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/w/${ws.id}`)}
                    aria-label={`Enter ${ws.name}`}
                  >
                    Enter Channel
                  </Button>
                </div>
              </Panel>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && workspaces.length === 0 && (
          <div className="p-12 text-center bg-surface border border-border-subtle rounded-panel max-w-md mx-auto my-8">
            <Folder className="w-10 h-10 text-text-tertiary mx-auto mb-3 opacity-60" />
            <h2 className="text-sm font-semibold text-text-primary mb-1">No channels yet</h2>
            <p className="text-xs text-text-secondary mb-4 leading-relaxed">
              Create your first YouTube channel workspace to start organizing video projects.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Create Channel
            </Button>
          </div>
        )}

        {/* Modals */}
        <CreateWorkspaceModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreate={async (name, color, defaults) => {
            const created = await createWorkspace(name, color, defaults);
            navigate(`/w/${created.id}`);
          }}
        />

        <WorkspaceSettingsModal
          open={Boolean(editingWorkspace)}
          onOpenChange={(open) => !open && setEditingWorkspace(null)}
          workspace={editingWorkspace}
          onSave={async (id, updates) => {
            await updateWorkspace(id, updates);
          }}
          onDelete={async (id) => {
            await deleteWorkspace(id);
          }}
        />
      </main>
    </div>
  );
};
