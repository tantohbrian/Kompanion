import { create } from 'zustand';
import { Workspace, ProjectDefaults } from '../../core/model/types';
import {
  loadWorkspaces,
  saveWorkspace,
  deleteWorkspace as deleteWorkspaceFromStorage,
  ensureDefaultWorkspace,
  DEFAULT_PROJECT_DEFAULTS,
  DEFAULT_WORKSPACE_ID,
} from '../../core/storage/storage';

export interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchWorkspaces: () => Promise<void>;
  setActiveWorkspace: (id: string) => void;
  createWorkspace: (
    name: string,
    color: string,
    defaults?: Partial<ProjectDefaults>
  ) => Promise<Workspace>;
  updateWorkspace: (
    id: string,
    updates: Partial<Omit<Workspace, 'id' | 'createdAt'>>
  ) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
}

export const WORKSPACE_COLOR_SWATCHES = [
  '#0071E3', // Apple Blue
  '#AF52DE', // Apple Purple
  '#5856D6', // Apple Indigo
  '#FF9500', // Apple Orange
  '#34C759', // Apple Green
  '#FF3B30', // Apple Red
  '#8E8E93', // Apple Neutral Gray
] as const;

const STORAGE_KEY_ACTIVE_WS = 'kompanion:activeWorkspaceId';

function getInitialActiveWorkspaceId(): string {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_WS) || DEFAULT_WORKSPACE_ID;
  }
  return DEFAULT_WORKSPACE_ID;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: getInitialActiveWorkspaceId(),
  isLoading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      await ensureDefaultWorkspace();
      const list = await loadWorkspaces();
      const savedActive = typeof localStorage !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY_ACTIVE_WS)
        : null;
      const currentActive = savedActive || get().activeWorkspaceId;
      const activeExists = list.some((w) => w.id === currentActive);
      const newActive = activeExists ? currentActive : (list[0]?.id || DEFAULT_WORKSPACE_ID);

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_ACTIVE_WS, newActive);
      }

      set({
        workspaces: list,
        activeWorkspaceId: newActive,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load workspaces',
        isLoading: false,
      });
    }
  },

  setActiveWorkspace: (id: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ACTIVE_WS, id);
    }
    set({ activeWorkspaceId: id });
  },

  createWorkspace: async (
    name: string,
    color: string,
    customDefaults?: Partial<ProjectDefaults>
  ) => {
    const id = `ws-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();
    const defaults: ProjectDefaults = {
      ...DEFAULT_PROJECT_DEFAULTS,
      ...(customDefaults || {}),
    };

    const newWorkspace: Workspace = {
      id,
      name: name.trim() || 'New Channel',
      color: color || WORKSPACE_COLOR_SWATCHES[0],
      defaults,
      createdAt: now,
      updatedAt: now,
    };

    await saveWorkspace(newWorkspace);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ACTIVE_WS, newWorkspace.id);
    }
    set((state) => ({
      workspaces: [...state.workspaces, newWorkspace],
      activeWorkspaceId: newWorkspace.id,
    }));

    return newWorkspace;
  },

  updateWorkspace: async (id: string, updates) => {
    const existing = get().workspaces.find((w) => w.id === id);
    if (!existing) return;

    const updated: Workspace = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    await saveWorkspace(updated);
    set((state) => ({
      workspaces: state.workspaces.map((w) => (w.id === id ? updated : w)),
    }));
  },

  deleteWorkspace: async (id: string) => {
    await deleteWorkspaceFromStorage(id);
    const remaining = get().workspaces.filter((w) => w.id !== id);
    const fallbackActive = remaining[0]?.id || DEFAULT_WORKSPACE_ID;

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ACTIVE_WS, fallbackActive);
    }

    set({
      workspaces: remaining,
      activeWorkspaceId: fallbackActive,
    });
  },
}));
