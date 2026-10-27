import { describe, it, expect, beforeEach } from 'vitest';
import { useTimelineStore } from './timelineStore';
import { Project } from '../model/types';
import { DEFAULT_PROJECT_DEFAULTS } from '../storage/storage';

const mockProject: Project = {
  id: 'proj-test',
  workspaceId: 'default',
  schemaVersion: 1,
  name: 'Test Project',
  settings: { ...DEFAULT_PROJECT_DEFAULTS },
  assets: [],
  script: { raw: '', parse: null },
  timeline: {
    clips: [
      {
        id: 'clip-1',
        assetId: 'asset-1',
        durationMs: 2000,
        fit: 'cover',
        animation: 'inherit',
        transitionIn: 'inherit',
      },
      {
        id: 'clip-2',
        assetId: 'asset-2',
        durationMs: 3000,
        fit: 'cover',
        animation: 'inherit',
        transitionIn: 'inherit',
      },
    ],
    audio: [],
    gain: 1,
    muted: false,
  },
  updatedAt: Date.now(),
};

describe('TimelineStore with Zundo History', () => {
  beforeEach(() => {
    useTimelineStore.temporal.getState().clear();
    useTimelineStore.getState().setProject(mockProject);
  });

  it('excludes transient UI states (playhead, zoom, selection) from undo history', () => {
    const { temporal } = useTimelineStore;
    temporal.getState().clear();

    useTimelineStore.getState().setPlayheadMs(1500);
    useTimelineStore.getState().setZoom(200);
    useTimelineStore.getState().selectClip('clip-1');

    expect(temporal.getState().pastStates).toHaveLength(0);
    expect(temporal.getState().pastStates.length > 0).toBe(false);
  });

  it('records timeline mutation commands in undo history and reverts correctly', () => {
    const { temporal } = useTimelineStore;
    temporal.getState().clear();

    // 1. Trim clip-1 by +1000ms -> duration becomes 3000ms
    useTimelineStore.getState().trimClip('clip-1', 1000, 'end');
    expect(useTimelineStore.getState().project.timeline.clips[0]!.durationMs).toBe(3000);
    expect(temporal.getState().pastStates).toHaveLength(1);

    // 2. Undo -> duration reverts to 2000ms
    temporal.getState().undo();
    expect(useTimelineStore.getState().project.timeline.clips[0]!.durationMs).toBe(2000);
    expect(temporal.getState().futureStates).toHaveLength(1);

    // 3. Redo -> duration returns to 3000ms
    temporal.getState().redo();
    expect(useTimelineStore.getState().project.timeline.clips[0]!.durationMs).toBe(3000);
  });

  it('batches drag operations during pause/resume into a single history entry', () => {
    const { temporal } = useTimelineStore;
    temporal.getState().clear();

    // User starts dragging
    useTimelineStore.getState().startDrag();

    // Multiple micro-updates during scrub/drag
    useTimelineStore.getState().trimClip('clip-1', 100, 'end');
    useTimelineStore.getState().trimClip('clip-1', 100, 'end');
    useTimelineStore.getState().trimClip('clip-1', 100, 'end');
    useTimelineStore.getState().trimClip('clip-1', 100, 'end');

    // Pointer-up commits
    useTimelineStore.getState().commitDrag();

    // Should only have committed 1 single history step on pointer up!
    expect(temporal.getState().pastStates.length).toBeLessThanOrEqual(1);

    // Undo reverts back to initial 2000ms
    temporal.getState().undo();
    expect(useTimelineStore.getState().project.timeline.clips[0]!.durationMs).toBe(2000);
  });
});
