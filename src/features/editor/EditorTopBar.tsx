import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Undo2, Redo2, RefreshCw, AlertCircle, Film, Settings, Wand2 } from 'lucide-react';
import { IconButton } from '../../ui';
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
    <header className="h-12 bg-[#0d0d10]/95 backdrop-blur-md border-b border-white/[0.08] px-3 flex items-center justify-between shrink-0 select-none">
      {/* Left: Brand + Breadcrumbs & Navigation + Autosave Badge */}
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-md bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
          <Film className="w-3.5 h-3.5" />
        </div>
        <IconButton
          aria-label="Back to projects"
          size="sm"
          onClick={() => navigate(`/w/${workspaceId}`)}
          className="hover:bg-white/[0.06] text-text-secondary hover:text-text-primary rounded-md p-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </IconButton>
        <span className="text-white/20 text-xs font-light">/</span>
        <span className="font-semibold text-[13px] text-text-primary tracking-tight truncate max-w-[180px]">
          {projectName}
        </span>

        {/* Autosave Status Badge */}
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5 ml-1"
        >
          {autosaveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-[11px] text-text-secondary bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full" title="Saving changes…">
              <RefreshCw className="w-2.5 h-2.5 animate-spin text-accent" />
              <span>Saving</span>
            </span>
          )}
          {autosaveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-[11px] text-text-secondary bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full" title="All changes saved to local storage">
              <span className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_6px_rgba(48,209,88,0.6)]" />
              <span>Saved</span>
            </span>
          )}
          {autosaveStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-[11px] text-destructive bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded-full" title="Autosave error">
              <AlertCircle className="w-2.5 h-2.5 text-destructive" />
              <span>Error</span>
            </span>
          )}
        </div>
      </div>

      {/* Center: Workflow Steps & Undo / Redo */}
      <div className="flex items-center gap-2">
        {/* Step Tabs / Stepper */}
        <nav aria-label="Workflow Steps" className="bg-[#141418] p-0.5 rounded-lg border border-white/[0.07] flex items-center gap-0.5 shadow-inner">
          <button
            type="button"
            onClick={() => onNavigateStep?.('ingest')}
            className="text-xs px-3 py-1 rounded-md text-text-secondary hover:text-text-primary font-medium transition-all"
          >
            1. Ingest
          </button>
          <button
            type="button"
            onClick={() => onNavigateStep?.('review')}
            className="text-xs px-3 py-1 rounded-md text-text-secondary hover:text-text-primary font-medium transition-all"
          >
            2. Script Review
          </button>
          <button
            type="button"
            className="text-xs px-3 py-1 rounded-md bg-accent text-white shadow-sm font-semibold"
          >
            3. Timeline
          </button>
        </nav>

        <div className="h-4 w-px bg-white/[0.08] mx-1.5" />

        <div className="bg-[#141418] border border-white/[0.06] rounded-md p-0.5 flex items-center gap-0.5">
          <IconButton
            aria-label="Undo"
            size="sm"
            disabled={!canUndo}
            onClick={handleUndo}
            title="Undo (Ctrl+Z / Cmd+Z)"
            className="w-7 h-7 hover:bg-white/[0.08] rounded text-text-secondary hover:text-text-primary disabled:opacity-30"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton
            aria-label="Redo"
            size="sm"
            disabled={!canRedo}
            onClick={handleRedo}
            title="Redo (Ctrl+Y / Shift+Cmd+Z)"
            className="w-7 h-7 hover:bg-white/[0.08] rounded text-text-secondary hover:text-text-primary disabled:opacity-30"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </IconButton>
        </div>
      </div>

      {/* Right: Project Settings, Smart Sync & Export */}
      <div className="flex items-center gap-2">
        {onSmartSync && (
          <button
            type="button"
            onClick={onSmartSync}
            aria-label="Smart Sync Speech-to-Text Alignment"
            className="bg-accent/15 hover:bg-accent/25 text-[#4da3ff] border border-accent/30 hover:border-accent/50 text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Wand2 className="w-3.5 h-3.5 text-[#4da3ff]" />
            <span>Smart Sync</span>
          </button>
        )}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open application settings"
            title="Settings"
            className="bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-text-primary border border-white/[0.06] text-xs font-medium px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        )}
        <button
          type="button"
          onClick={onExport}
          aria-label="Export Video"
          className="bg-accent hover:bg-accent-hover text-white font-medium text-xs shadow-sm px-3.5 py-1.5 rounded-md flex items-center gap-1.5 transition-all active:scale-[0.98]"
        >
          <Film className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
