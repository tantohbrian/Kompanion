import React, { useEffect, useRef, useState } from 'react';
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
import { playerController } from './playerController';

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

  const centerPanelRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const toggleFullscreen = async () => {
    if (!centerPanelRef.current) return;
    if (!document.fullscreenElement) {
      try {
        if (centerPanelRef.current.requestFullscreen) {
          await centerPanelRef.current.requestFullscreen();
          setIsFullscreen(true);
        } else {
          setIsFullscreen(true);
        }
      } catch {
        // Fallback CSS fullscreen
        setIsFullscreen((prev) => !prev);
      }
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch {
        // Ignore
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      playerController.renderCurrentFrame(playerController.getCurrentTimeMs());
    };
    document.addEventListener('fullscreenchange', handleFsChange);

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          void toggleFullscreen();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
        <div
          ref={centerPanelRef}
          className={`flex-1 flex flex-col min-w-0 bg-[#09090c] overflow-hidden ${
            isFullscreen ? 'fixed inset-0 z-50 bg-black flex flex-col w-screen h-screen' : ''
          }`}
        >
          <CanvasPreview
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
          <TransportBar
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        </div>

        {/* Right Panel: Contextual Inspector */}
        <Inspector />
      </div>

      {/* Bottom Panel: Magnetic Timeline */}
      <Timeline />
    </div>
  );
};
