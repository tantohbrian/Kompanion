import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from './workspaceStore';
import { db } from '../../core/storage/db';

describe('Workspace Store (M1)', () => {
  beforeEach(async () => {
    await db.workspaces.clear();
    await db.projects.clear();
    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: 'default',
      isLoading: false,
      error: null,
    });
  });

  it('fetches workspaces and ensures a default channel exists', async () => {
    const store = useWorkspaceStore.getState();
    await store.fetchWorkspaces();

    const state = useWorkspaceStore.getState();
    expect(state.workspaces.length).toBeGreaterThanOrEqual(1);
    expect(state.workspaces[0]?.name).toBe('Default Workspace');
    expect(state.activeWorkspaceId).toBe('default');
  });

  it('creates a workspace with custom defaults', async () => {
    const store = useWorkspaceStore.getState();
    await store.fetchWorkspaces();

    const newWs = await store.createWorkspace('Tech Explanations', '#AF52DE', {
      canvas: '9:16',
      height: 720,
      fps: 60,
      animation: { id: 'zoom-in', params: {} },
    });

    expect(newWs.name).toBe('Tech Explanations');
    expect(newWs.color).toBe('#AF52DE');
    expect(newWs.defaults.canvas).toBe('9:16');
    expect(newWs.defaults.height).toBe(720);
    expect(newWs.defaults.fps).toBe(60);
    expect(newWs.defaults.animation.id).toBe('zoom-in');

    const state = useWorkspaceStore.getState();
    expect(state.workspaces.some((w) => w.id === newWs.id)).toBe(true);
    expect(state.activeWorkspaceId).toBe(newWs.id);
  });

  it('updates workspace name, color, and defaults', async () => {
    const store = useWorkspaceStore.getState();
    const ws = await store.createWorkspace('Original Name', '#0071E3');

    await store.updateWorkspace(ws.id, {
      name: 'Renamed Channel',
      color: '#FF9500',
      defaults: {
        ...ws.defaults,
        fps: 24,
      },
    });

    const state = useWorkspaceStore.getState();
    const updated = state.workspaces.find((w) => w.id === ws.id);
    expect(updated?.name).toBe('Renamed Channel');
    expect(updated?.color).toBe('#FF9500');
    expect(updated?.defaults.fps).toBe(24);
  });

  it('deletes a workspace and switches active channel', async () => {
    const store = useWorkspaceStore.getState();
    await store.fetchWorkspaces();
    const ws = await store.createWorkspace('Channel To Delete', '#FF3B30');

    expect(useWorkspaceStore.getState().workspaces.some((w) => w.id === ws.id)).toBe(true);

    await store.deleteWorkspace(ws.id);

    const state = useWorkspaceStore.getState();
    expect(state.workspaces.some((w) => w.id === ws.id)).toBe(false);
    expect(state.activeWorkspaceId).toBe('default');
  });

  it('persists activeWorkspaceId to localStorage and restores it across reloads', async () => {
    const store = useWorkspaceStore.getState();
    await store.fetchWorkspaces();
    const ws = await store.createWorkspace('Persistent Channel', '#34C759');

    expect(localStorage.getItem('kompanion:activeWorkspaceId')).toBe(ws.id);

    // Simulate page reload by clearing in-memory store state
    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: 'default',
    });

    await useWorkspaceStore.getState().fetchWorkspaces();
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(ws.id);
  });
});
