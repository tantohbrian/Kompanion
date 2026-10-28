import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { EditorTopBar } from './EditorTopBar';
import { LeftPanel } from './LeftPanel';
import { CanvasPreview } from './CanvasPreview';
import { TransportBar } from './TransportBar';
import { Inspector } from './Inspector';
import { Timeline } from './Timeline';
import { useTimelineStore } from '../../core/timeline';
import { registerShortcut, useShortcuts } from '../../app/shortcuts';
import { playerController } from './playerController';
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
    const unregisterList: (() => void)[] = [];

    // Space: Play / Pause
    unregisterList.push(
      registerShortcut({
        id: 'editor-play-pause',
        key: 'Space',
        description: 'Play/Pause Timeline',
        action: () => playerController.togglePlay(),
      })
    );

    // Left: Step back 1 frame
    unregisterList.push(
      registerShortcut({
        id: 'editor-step-back-frame',
        key: 'ArrowLeft',
        description: 'Step Back 1 Frame',
        action: () => playerController.stepFrame(-1, fps),
      })
    );

    // Right: Step forward 1 frame
    unregisterList.push(
      registerShortcut({
        id: 'editor-step-fwd-frame',
        key: 'ArrowRight',
        description: 'Step Forward 1 Frame',
        action: () => playerController.stepFrame(1, fps),
      })
    );

    // Shift + Left: Step back 1 second
    unregisterList.push(
      registerShortcut({
        id: 'editor-step-back-sec',
        key: 'ArrowLeft',
        shift: true,
        description: 'Step Back 1 Second',
        action: () => playerController.seek(useTimelineStore.getState().playheadMs - 1000),
      })
    );

    // Shift + Right: Step forward 1 second
    unregisterList.push(
      registerShortcut({
        id: 'editor-step-fwd-sec',
        key: 'ArrowRight',
        shift: true,
        description: 'Step Forward 1 Second',
        action: () => playerController.seek(useTimelineStore.getState().playheadMs + 1000),
      })
    );

    // Home: Jump to start
    unregisterList.push(
      registerShortcut({
        id: 'editor-jump-start',
        key: 'Home',
        description: 'Jump to Timeline Start',
        action: () => playerController.seek(0),
      })
    );

    // End: Jump to end
    unregisterList.push(
      registerShortcut({
        id: 'editor-jump-end',
        key: 'End',
        description: 'Jump to Timeline End',
        action: () => {
          const totalMs = playerController.getClock().getTimeMs();
          playerController.seek(totalMs);
        },
      })
    );

    // S: Split clip at playhead
    unregisterList.push(
      registerShortcut({
        id: 'editor-split',
        key: 's',
        description: 'Split Selected Clip at Playhead',
        action: () => {
          const state = useTimelineStore.getState();
          if (state.selectedClipId) {
            state.splitClip(state.selectedClipId, state.playheadMs);
          }
        },
      })
    );

    // Delete / Backspace: Ripple delete clip
    unregisterList.push(
      registerShortcut({
        id: 'editor-delete',
        key: 'Delete',
        description: 'Delete Selected Clip',
        action: () => {
          const state = useTimelineStore.getState();
          if (state.selectedClipId) {
            state.deleteClip(state.selectedClipId);
          }
        },
      }),
      registerShortcut({
        id: 'editor-backspace',
        key: 'Backspace',
        description: 'Delete Selected Clip',
        action: () => {
          const state = useTimelineStore.getState();
          if (state.selectedClipId) {
            state.deleteClip(state.selectedClipId);
          }
        },
      })
    );

    // Cmd/Ctrl + D: Duplicate clip
    unregisterList.push(
      registerShortcut({
        id: 'editor-duplicate',
        key: 'd',
        ctrlOrCmd: true,
        description: 'Duplicate Selected Clip',
        action: () => {
          const state = useTimelineStore.getState();
          if (state.selectedClipId) {
            state.duplicateClip(state.selectedClipId);
          }
        },
      })
    );

    // Cmd/Ctrl + Z: Undo
    unregisterList.push(
      registerShortcut({
        id: 'editor-undo',
        key: 'z',
        ctrlOrCmd: true,
        description: 'Undo',
        action: () => {
          useTimelineStore.temporal.getState().undo();
        },
      })
    );

    // Shift + Cmd/Ctrl + Z: Redo
    unregisterList.push(
      registerShortcut({
        id: 'editor-redo-shift',
        key: 'z',
        ctrlOrCmd: true,
        shift: true,
        description: 'Redo',
        action: () => {
          useTimelineStore.temporal.getState().redo();
        },
      }),
      registerShortcut({
        id: 'editor-redo-y',
        key: 'y',
        ctrlOrCmd: true,
        description: 'Redo',
        action: () => {
          useTimelineStore.temporal.getState().redo();
        },
      })
    );

    // Zoom +/-/0
    unregisterList.push(
      registerShortcut({
        id: 'editor-zoom-in',
        key: '+',
        description: 'Zoom In Timeline',
        action: () => {
          const z = useTimelineStore.getState().zoom;
          useTimelineStore.getState().setZoom(z * 1.25);
        },
      }),
      registerShortcut({
        id: 'editor-zoom-out',
        key: '-',
        description: 'Zoom Out Timeline',
        action: () => {
          const z = useTimelineStore.getState().zoom;
          useTimelineStore.getState().setZoom(z / 1.25);
        },
      }),
      registerShortcut({
        id: 'editor-zoom-fit',
        key: '0',
        description: 'Reset Timeline Zoom',
        action: () => {
          useTimelineStore.getState().setZoom(1.0);
        },
      })
    );

    return () => {
      for (const unregister of unregisterList) {
        unregister();
      }
    };
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
