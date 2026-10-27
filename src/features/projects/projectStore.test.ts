import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore } from './projectStore';
import { db } from '../../core/storage/db';
import { ProjectDefaults } from '../../core/model/types';
import { purgeExpiredDeletedProjects } from '../../core/storage/storage';

describe('Project Store & Soft-Delete (M1)', () => {
  const customDefaults: ProjectDefaults = {
    canvas: '9:16',
    height: 720,
    fps: 60,
    animation: { id: 'zoom-in', params: { scale: 1.1 } },
    transition: { id: 'crossfade', durationMs: 400 },
  };

  beforeEach(async () => {
    vi.useRealTimers();
    await db.projects.clear();
    useProjectStore.setState({
      projects: [],
      corruptProjects: [],
      isLoading: false,
      error: null,
    });
  });

  it('creates a project that inherits workspace defaults', async () => {
    const store = useProjectStore.getState();
    const proj = await store.createProject('ws-test', 'My First Video', customDefaults);

    expect(proj.name).toBe('My First Video');
    expect(proj.workspaceId).toBe('ws-test');
    expect(proj.schemaVersion).toBe(1);
    expect(proj.settings.canvas).toBe('9:16');
    expect(proj.settings.height).toBe(720);
    expect(proj.settings.fps).toBe(60);
    expect(proj.settings.animation.id).toBe('zoom-in');
    expect(proj.settings.transition.durationMs).toBe(400);

    // Verify stored in Dexie
    const inDb = await db.projects.get(proj.id);
    expect(inDb?.name).toBe('My First Video');
    expect(inDb?.settings.canvas).toBe('9:16');
  });

  it('renames and duplicates a project', async () => {
    const store = useProjectStore.getState();
    const proj = await store.createProject('ws-test', 'Original Project', customDefaults);

    await store.renameProject(proj.id, 'Renamed Project');
    expect(useProjectStore.getState().projects[0]?.name).toBe('Renamed Project');

    const copy = await store.duplicateProject(proj.id);
    expect(copy?.name).toBe('Renamed Project (Copy)');
    expect(copy?.settings).toEqual(proj.settings);
    expect(useProjectStore.getState().projects.length).toBe(2);
  });

  it('soft-deletes a project and restores it on undo', async () => {
    const store = useProjectStore.getState();
    const proj = await store.createProject('ws-test', 'Project to Undo', customDefaults);

    let undoCallback: (() => void) | null = null;
    await store.deleteProjectWithUndo(proj.id, (_msg, onUndo) => {
      undoCallback = onUndo;
    });

    // Immediately removed from store list
    expect(useProjectStore.getState().projects.some((p) => p.id === proj.id)).toBe(false);

    // Marked with deletedAt in database
    const inDb = await db.projects.get(proj.id);
    expect(inDb?.deletedAt).toBeDefined();

    // Trigger undo callback
    expect(undoCallback).not.toBeNull();
    if (undoCallback) {
      await (undoCallback as () => Promise<void>)();
    }

    // Restored in store and deletedAt cleared
    const restored = await db.projects.get(proj.id);
    expect(restored?.deletedAt).toBeUndefined();
    expect(useProjectStore.getState().projects.some((p) => p.id === proj.id)).toBe(true);
  });

  it('purges expired deleted projects during startup check', async () => {
    const store = useProjectStore.getState();
    const proj = await store.createProject('ws-test', 'Expired Project', customDefaults);

    // Simulate a project deleted 15 seconds ago
    const pastTimestamp = Date.now() - 15000;
    await db.projects.update(proj.id, { deletedAt: pastTimestamp });

    // Startup check with 10s threshold
    const purgedCount = await purgeExpiredDeletedProjects(10000);
    expect(purgedCount).toBe(1);

    const inDb = await db.projects.get(proj.id);
    expect(inDb).toBeUndefined();
  });
});
