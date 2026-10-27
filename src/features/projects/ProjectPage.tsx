import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button, useToast } from '../../ui';
import { db } from '../../core/storage/db';
import {
  DEFAULT_PROJECT_DEFAULTS,
  DEFAULT_WORKSPACE_ID,
  ensureDefaultWorkspace,
} from '../../core/storage/storage';
import { Workspace, ProjectDefaults } from '../../core/model/types';
import { useProjectStore } from './projectStore';
import { ProjectGrid } from './ProjectGrid';
import { CreateProjectModal } from './CreateProjectModal';

export const ProjectPage: React.FC = () => {
  const { workspaceId = DEFAULT_WORKSPACE_ID } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const {
    projects,
    corruptProjects,
    isLoading,
    fetchProjects,
    createProject,
    deleteProjectWithUndo,
    renameProject,
    duplicateProject,
    dismissCorruptProject,
  } = useProjectStore();

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      let ws: Workspace | undefined;
      if (workspaceId === DEFAULT_WORKSPACE_ID) {
        ws = await ensureDefaultWorkspace();
      } else {
        ws = await db.workspaces.get(workspaceId);
      }
      if (!cancelled && ws) {
        setWorkspace(ws);
      }
      if (!cancelled) {
        await fetchProjects(workspaceId);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, fetchProjects]);

  const handleCreateProject = async (name: string) => {
    const defaults: ProjectDefaults = workspace?.defaults || DEFAULT_PROJECT_DEFAULTS;
    const newProj = await createProject(workspaceId, name, defaults);
    navigate(`/w/${workspaceId}/p/${newProj.id}`);
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProjectWithUndo(projectId, (message, onUndo) => {
      showToast({
        title: message,
        description: 'You can restore this project within 10 seconds.',
        durationMs: 10000,
        action: {
          label: 'Undo',
          onClick: onUndo,
        },
      });
    });
  };

  return (
    <div className="flex flex-col h-full bg-canvas text-text-primary">
      <main className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            aria-label="Back to channels"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Channels
          </Button>
          <span className="text-text-tertiary">/</span>
          <div className="flex items-center gap-2">
            {workspace?.color && (
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: workspace.color }}
                aria-hidden="true"
              />
            )}
            <span className="text-xs font-medium text-text-secondary">
              {workspace?.name || 'Default Workspace'}
            </span>
          </div>
        </div>

        {/* View Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">Projects</h1>
            <p className="text-xs text-text-secondary mt-1">
              Assemble image timelines and voiceover scripts for this channel.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            aria-label="Create new project"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Project
          </Button>
        </div>

        {/* Projects Grid */}
        <ProjectGrid
          projects={projects}
          corruptProjects={corruptProjects}
          isLoading={isLoading}
          onOpenProject={(id) => navigate(`/w/${workspaceId}/p/${id}`)}
          onOpenCreate={() => setCreateModalOpen(true)}
          onRename={renameProject}
          onDuplicate={duplicateProject}
          onDelete={handleDeleteProject}
          onDismissCorrupt={dismissCorruptProject}
        />

        {/* Create Modal */}
        <CreateProjectModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          workspaceName={workspace?.name || 'Default Workspace'}
          workspaceDefaults={workspace?.defaults || DEFAULT_PROJECT_DEFAULTS}
          onCreate={handleCreateProject}
        />
      </main>
    </div>
  );
};
