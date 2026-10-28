import { registerShortcut } from '../../app/shortcuts';
import { useTimelineStore } from '../../core/timeline';
import { playerController } from './playerController';

export function registerEditorShortcuts(fps = 30): () => void {
  const unregisterList: (() => void)[] = [];

  // Space: Play / Pause
  unregisterList.push(
    registerShortcut({
      id: 'editor-play-pause',
      key: ' ',
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

  // Alt + Left: Reorder clip left
  unregisterList.push(
    registerShortcut({
      id: 'editor-reorder-clip-prev',
      key: 'ArrowLeft',
      alt: true,
      description: 'Reorder Clip Left',
      action: () => {
        const state = useTimelineStore.getState();
        if (!state.selectedClipId || !state.project) return;
        const clips = state.project.timeline.clips;
        const idx = clips.findIndex((c) => c.id === state.selectedClipId);
        if (idx > 0) {
          state.reorderClip(state.selectedClipId, idx - 1);
        }
      },
    })
  );

  // Alt + Right: Reorder clip right
  unregisterList.push(
    registerShortcut({
      id: 'editor-reorder-clip-next',
      key: 'ArrowRight',
      alt: true,
      description: 'Reorder Clip Right',
      action: () => {
        const state = useTimelineStore.getState();
        if (!state.selectedClipId || !state.project) return;
        const clips = state.project.timeline.clips;
        const idx = clips.findIndex((c) => c.id === state.selectedClipId);
        if (idx >= 0 && idx < clips.length - 1) {
          state.reorderClip(state.selectedClipId, idx + 1);
        }
      },
    })
  );

  // Home / End
  unregisterList.push(
    registerShortcut({
      id: 'editor-jump-start',
      key: 'Home',
      description: 'Jump to Timeline Start',
      action: () => playerController.seek(0),
    }),
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

  // Shift + Cmd/Ctrl + Z / Cmd/Ctrl + Y: Redo
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
}
