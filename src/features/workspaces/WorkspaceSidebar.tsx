import React, { useState } from 'react';
import { Plus, Settings, Folder } from 'lucide-react';
import { IconButton, Button } from '../../ui';
import { useWorkspaceStore } from './workspaceStore';
import { Workspace } from '../../core/model/types';
import { WorkspaceSettingsModal } from './WorkspaceSettingsModal';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';

interface WorkspaceSidebarProps {
  onSelectWorkspace?: (workspaceId: string) => void;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  onSelectWorkspace,
}) => {
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  } = useWorkspaceStore();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);

  const handleSelect = (id: string) => {
    setActiveWorkspace(id);
    onSelectWorkspace?.(id);
  };

  return (
    <aside
      className="w-60 bg-surface border-r border-border flex flex-col h-full shrink-0 select-none"
      aria-label="Channels and Workspaces"
    >
      {/* Sidebar Header */}
      <div className="h-10 px-3.5 border-b border-border flex items-center justify-between shrink-0">
        <span className="text-2xs font-semibold text-text-tertiary uppercase tracking-wider">
          Channels
        </span>
        <IconButton
          size="sm"
          aria-label="Add new channel"
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" />
        </IconButton>
      </div>

      {/* Workspaces List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {workspaces.map((ws) => {
          const isActive = ws.id === activeWorkspaceId;
          return (
            <div
              key={ws.id}
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-control transition-colors cursor-pointer ${
                isActive
                  ? 'bg-accent/15 text-accent font-medium'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
              onClick={() => handleSelect(ws.id)}
              role="button"
              tabIndex={0}
              aria-current={isActive ? 'page' : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(ws.id);
                }
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: ws.color }}
                  aria-hidden="true"
                />
                <span className="text-xs truncate">{ws.name}</span>
              </div>

              <div
                className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                  isActive ? 'opacity-100' : ''
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <IconButton
                  size="sm"
                  aria-label={`Settings for ${ws.name}`}
                  onClick={() => setEditingWorkspace(ws)}
                  className="w-6 h-6 hover:bg-surface-elevated"
                >
                  <Settings className="w-3 h-3" />
                </IconButton>
              </div>
            </div>
          );
        })}

        {workspaces.length === 0 && (
          <div className="p-4 text-center">
            <Folder className="w-8 h-8 text-text-tertiary mx-auto mb-2 opacity-50" />
            <p className="text-xs text-text-secondary mb-3">No channels yet.</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="w-full text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Create Channel
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateWorkspaceModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreate={async (name, color, defaults) => {
          const created = await createWorkspace(name, color, defaults);
          handleSelect(created.id);
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
          const fallback = useWorkspaceStore.getState().activeWorkspaceId;
          handleSelect(fallback);
        }}
      />
    </aside>
  );
};
