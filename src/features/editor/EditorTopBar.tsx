import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Undo2, Redo2, Check, RefreshCw, AlertCircle, Film, Settings, Wand2 } from 'lucide-react';
import { Button, IconButton } from '../../ui';
import { useStore } from 'zustand';
import { useTimelineStore } from '../../core/timeline';

export interface EditorTopBarProps {
  workspaceId: string;
  projectName: string;
  onNavigateStep?: (step: 'ingest' | 'review' | 'timeline') => void;
  onOpenSettings?: () => void;
  onExport?: () => void;
  onSmartSync?: () => void;
}

export const EditorTopBar: React.FC<EditorTopBarProps> = ({
  workspaceId,
  projectName,
  onNavigateStep,
  onOpenSettings,
  onExport,
  onSmartSync,
}) => {
  const navigate = useNavigate();
  const autosaveStatus = useTimelineStore((s) => s.autosaveStatus);

  // Zundo temporal history state
  const canUndo = useStore(useTimelineStore.temporal, (s) => s.pastStates.length > 0);
  const canRedo = useStore(useTimelineStore.temporal, (s) => s.futureStates.length > 0);

  const handleUndo = () => {
    if (canUndo) {
      useTimelineStore.temporal.getState().undo();
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      useTimelineStore.temporal.getState().redo();
    }
  };

  return (
    <header className="h-12 border-b border-border bg-surface px-4 flex items-center justify-between shrink-0 select-none">
      {/* Left: Breadcrumbs & Navigation */}
      <div className="flex items-center gap-3">
        <IconButton
          aria-label="Back to projects"
          size="sm"
          onClick={() => navigate(`/w/${workspaceId}`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </IconButton>
        <span className="text-xs text-text-tertiary">/</span>
        <span className="text-xs font-semibold text-text-primary truncate max-w-xs">
          {projectName}
        </span>
      </div>

      {/* Center: Workflow Steps & Undo / Redo & Autosave Badge */}
      <div className="flex items-center gap-4">
        {/* Step Tabs / Stepper */}
        <nav aria-label="Workflow Steps" className="flex items-center gap-1 bg-surface-elevated p-1 rounded-control border border-border">
          <button
            type="button"
            onClick={() => onNavigateStep?.('ingest')}
            className="px-2.5 py-0.5 rounded text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            1. Ingest
          </button>
          <button
            type="button"
            onClick={() => onNavigateStep?.('review')}
            className="px-2.5 py-0.5 rounded text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            2. Script Review
          </button>
          <button
            type="button"
            className="px-2.5 py-0.5 rounded text-xs font-semibold bg-accent text-white shadow-sm"
          >
            3. Timeline
          </button>
        </nav>

        <div className="flex items-center gap-1 bg-surface-elevated/50 p-0.5 rounded-control border border-border-subtle">
          <IconButton
            aria-label="Undo"
            size="sm"
            disabled={!canUndo}
            onClick={handleUndo}
            title="Undo (Ctrl+Z / Cmd+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton
            aria-label="Redo"
            size="sm"
            disabled={!canRedo}
            onClick={handleRedo}
            title="Redo (Ctrl+Y / Shift+Cmd+Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </IconButton>
        </div>

        {/* Autosave Status Badge */}
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5 text-xs font-mono"
        >
          {autosaveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-text-tertiary animate-pulse" title="Saving changes…">
              <RefreshCw className="w-3 h-3 animate-spin text-accent" />
              <span>Saving</span>
            </span>
          )}
          {autosaveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-success" title="All changes saved to local storage">
              <Check className="w-3 h-3 text-success" />
              <span>Saved</span>
            </span>
          )}
          {autosaveStatus === 'error' && (
            <span className="flex items-center gap-1 text-destructive" title="Autosave error">
              <AlertCircle className="w-3 h-3 text-destructive" />
              <span>Error</span>
            </span>
          )}
        </div>
      </div>

      {/* Right: Project Settings, Smart Sync & Export */}
      <div className="flex items-center gap-2">
        {onSmartSync && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onSmartSync}
            aria-label="Smart Sync Speech-to-Text Alignment"
          >
            <Wand2 className="w-3.5 h-3.5 mr-1 text-accent" />
            Smart Sync
          </Button>
        )}
        {onOpenSettings && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenSettings}
            aria-label="Project Settings"
          >
            <Settings className="w-3.5 h-3.5 mr-1" />
            Settings
          </Button>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={onExport}
          aria-label="Export Video"
        >
          <Film className="w-3.5 h-3.5 mr-1" />
          Export
        </Button>
      </div>
    </header>
  );
};
