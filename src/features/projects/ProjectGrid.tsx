import React from 'react';
import { Film, Plus, AlertCircle, Download, X } from 'lucide-react';
import { Project } from '../../core/model/types';
import { Button } from '../../ui';
import { ProjectCard } from './ProjectCard';
import { CorruptProjectInfo } from './projectStore';
import { downloadCorruptProjectJson } from './recovery';

interface ProjectGridProps {
  projects: Project[];
  corruptProjects: CorruptProjectInfo[];
  isLoading: boolean;
  onOpenProject: (projectId: string) => void;
  onOpenCreate: () => void;
  onRename: (id: string, newName: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onDismissCorrupt: (id: string) => void;
}

export const ProjectGrid: React.FC<ProjectGridProps> = ({
  projects,
  corruptProjects,
  isLoading,
  onOpenProject,
  onOpenCreate,
  onRename,
  onDuplicate,
  onDelete,
  onDismissCorrupt,
}) => {
  return (
    <div className="space-y-6">
      {/* Corrupt Projects Recovery Banner */}
      {corruptProjects.map((c) => (
        <div
          key={c.id}
          role="alert"
          className="p-4 bg-surface-elevated border border-status-error/40 rounded-panel flex items-center justify-between gap-4 animate-in fade-in-0 duration-fast"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-status-error/15 text-status-error flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-primary">
                Corrupt project detected: <span className="font-mono">{c.id}</span>
              </p>
              <p className="text-2xs text-text-secondary truncate mt-0.5">
                {c.error || 'Failed schema validation. Download raw JSON for manual recovery.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onDismissCorrupt(c.id)}
              aria-label={`Dismiss recovery banner for ${c.id}`}
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Dismiss
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => downloadCorruptProjectJson(c.raw, c.id)}
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Download Raw JSON
            </Button>
          </div>
        </div>
      ))}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-56 bg-surface border border-border rounded-panel animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && projects.length === 0 && (
        <div className="p-12 text-center bg-surface/50 border border-border-subtle rounded-panel max-w-lg mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center text-text-tertiary mx-auto mb-3">
            <Film className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary mb-1">
            No projects in this channel yet
          </h3>
          <p className="text-xs text-text-secondary mb-5 max-w-sm mx-auto leading-relaxed">
            Create your first video project to assemble script segments, image assets, and voiceover audio.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenCreate}
            aria-label="Create your first project"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Project
          </Button>
        </div>
      )}

      {/* Active Projects Grid */}
      {!isLoading && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => onOpenProject(project.id)}
              onRename={onRename}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
