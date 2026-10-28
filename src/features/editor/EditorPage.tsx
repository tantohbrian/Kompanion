import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { EditorTopBar } from './EditorTopBar';
import { LeftPanel } from './LeftPanel';
import { CanvasPreview } from './CanvasPreview';
import { TransportBar } from './TransportBar';
import { Inspector } from './Inspector';
import { Timeline } from './Timeline';
import { useTimelineStore } from '../../core/timeline';
import { useShortcuts } from '../../app/shortcuts';
import { registerEditorShortcuts } from './editorShortcuts';
import { useAutosave } from './useAutosave';

export interface EditorPageProps {
  onNavigateStep?: (step: 'ingest' | 'review' | 'timeline') => void;
  onOpenSettings?: () => void;
  onExport?: () => void;
  onSmartSync?: () => void;
}

export const EditorPage: React.FC<EditorPageProps> = ({
  onNavigateStep,
  onOpenSettings,
  onExport,
  onSmartSync,
}) => {
  const { workspaceId = 'default', projectId = 'new' } = useParams<{
    workspaceId: string;
    projectId: string;
  }>();

  const project = useTimelineStore((s) => s.project);
  const fps = project?.settings.fps || 30;

  // Initialize debounced autosave
  useAutosave(500);

  // Initialize global shortcuts listener hook
  useShortcuts();

  // Register P0 shortcuts for the editor session
  useEffect(() => {
    return registerEditorShortcuts(fps);
  }, [fps]);

  return (
    <div className="flex flex-col h-full bg-canvas text-text-primary select-none overflow-hidden">
      {/* Top Bar */}
      <EditorTopBar
        workspaceId={workspaceId}
        projectName={project?.name || projectId}
        onNavigateStep={onNavigateStep}
        onOpenSettings={onOpenSettings}
        onExport={onExport}
        onSmartSync={onSmartSync}
      />

      {/* Main 3-Pane Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Media & Script */}
        <LeftPanel />

        {/* Center Panel: Canvas Preview & Transport */}
        <div className="flex-1 flex flex-col min-w-0 bg-canvas-subtle overflow-hidden">
          <CanvasPreview />
          <TransportBar />
        </div>

        {/* Right Panel: Contextual Inspector */}
        <Inspector />
      </div>

      {/* Bottom Panel: Magnetic Timeline */}
      <Timeline />
    </div>
  );
};
