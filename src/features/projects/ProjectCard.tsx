import React, { useState } from 'react';
import { Film, MoreVertical, Copy, Edit2, Trash2 } from 'lucide-react';
import { Project } from '../../core/model/types';
import { IconButton, Menu } from '../../ui';
import { formatDurationMs, formatDateRelative } from './formatters';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onRename: (id: string, newName: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onClick,
  onRename,
  onDuplicate,
  onDelete,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(project.name);

  // Compute total duration from timeline clips
  const totalDurationMs = project.timeline.clips.reduce(
    (acc, clip) => acc + (clip.durationMs || 0),
    0
  );

  const handleFinishRename = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== project.name) {
      onRename(project.id, trimmed);
    } else {
      setNameInput(project.name);
    }
    setIsRenaming(false);
  };

  return (
    <div
      role="article"
      aria-label={`Project: ${project.name}`}
      className="group flex flex-col bg-surface border border-border rounded-panel overflow-hidden transition-all duration-fast hover:border-border-strong hover:shadow-lg focus-within:ring-2 focus-within:ring-accent"
    >
      {/* Thumbnail Area */}
      <div
        className="aspect-video w-full bg-canvas-subtle flex items-center justify-center relative cursor-pointer overflow-hidden"
        onClick={onClick}
        tabIndex={0}
        role="button"
        aria-label={`Open project ${project.name}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <div className="w-12 h-12 rounded-full bg-surface-elevated/80 flex items-center justify-center text-text-tertiary group-hover:text-accent group-hover:scale-105 transition-all">
          <Film className="w-6 h-6" />
        </div>

        {/* Aspect & Height Badge */}
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-2xs font-mono text-text-secondary">
          {project.settings.canvas} • {project.settings.height}p
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-xs font-mono tabular-nums text-text-primary">
          {formatDurationMs(totalDurationMs)}
        </div>
      </div>

      {/* Info & Actions */}
      <div className="p-3.5 flex items-center justify-between gap-2 border-t border-border-subtle">
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <form onSubmit={handleFinishRename}>
              <input
                type="text"
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={() => handleFinishRename()}
                className="w-full bg-surface-elevated border border-accent rounded px-1.5 py-0.5 text-xs text-text-primary focus:outline-none"
              />
            </form>
          ) : (
            <h3
              className="text-xs font-semibold text-text-primary truncate cursor-pointer hover:text-accent"
              onClick={onClick}
              title={project.name}
            >
              {project.name}
            </h3>
          )}
          <p className="text-2xs text-text-tertiary mt-0.5">
            {formatDateRelative(project.updatedAt)}
          </p>
        </div>

        {/* Card Context Menu */}
        <div onClick={(e) => e.stopPropagation()}>
          <Menu
            trigger={
              <IconButton
                size="sm"
                aria-label={`Options for ${project.name}`}
                className="w-7 h-7 text-text-tertiary hover:text-text-primary"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </IconButton>
            }
            items={[
              {
                id: 'rename',
                label: 'Rename',
                icon: <Edit2 className="w-3.5 h-3.5" />,
                onSelect: () => setIsRenaming(true),
              },
              {
                id: 'duplicate',
                label: 'Duplicate',
                icon: <Copy className="w-3.5 h-3.5" />,
                onSelect: () => onDuplicate(project.id),
              },
              {
                id: 'delete',
                label: 'Delete Project',
                icon: <Trash2 className="w-3.5 h-3.5" />,
                destructive: true,
                onSelect: () => onDelete(project.id),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
};
