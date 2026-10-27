import { create } from 'zustand';
import { Project, ProjectDefaults, Id } from '../../core/model/types';
import { CURRENT_SCHEMA_VERSION } from '../../core/model/schemas';
import {
  loadProjectsForWorkspace,
  saveProject,
  softDeleteProject,
  restoreProject,
  permanentlyPurgeProject,
  purgeExpiredDeletedProjects,
  loadProject,
} from '../../core/storage/storage';

export interface CorruptProjectInfo {
  id: string;
  error: string;
  raw: unknown;
}

export interface ProjectState {
  projects: Project[];
  corruptProjects: CorruptProjectInfo[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProjects: (workspaceId: string) => Promise<void>;
  createProject: (
    workspaceId: string,
    name: string,
    workspaceDefaults: ProjectDefaults
  ) => Promise<Project>;
  deleteProjectWithUndo: (
    projectId: string,
    onShowToast: (message: string, onUndo: () => void) => void
  ) => Promise<void>;
  undoDeleteProject: (projectId: string, workspaceId: string) => Promise<void>;
  renameProject: (projectId: string, newName: string) => Promise<void>;
  duplicateProject: (projectId: string) => Promise<Project | null>;
  dismissCorruptProject: (projectId: string) => void;
}

// Active deletion timers for 10-second undo window
const pendingPurgeTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  corruptProjects: [],
  isLoading: false,
  error: null,

  fetchProjects: async (workspaceId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Purge any expired soft-deleted projects on load
      await purgeExpiredDeletedProjects(10000);

      const { valid, corrupt } = await loadProjectsForWorkspace(workspaceId);
      set({
        projects: valid,
        corruptProjects: corrupt,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load projects',
        isLoading: false,
      });
    }
  },

  createProject: async (
    workspaceId: string,
    name: string,
    workspaceDefaults: ProjectDefaults
  ) => {
    const id: Id = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    // Deep clone workspace defaults so project settings are independent
    const settings: ProjectDefaults = JSON.parse(JSON.stringify(workspaceDefaults));

    const newProject: Project = {
      id,
      workspaceId,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      name: name.trim() || 'Untitled Project',
      settings,
      assets: [],
      script: { raw: '', parse: null },
      timeline: { clips: [], audio: [], gain: 1, muted: false },
      updatedAt: now,
    };

    await saveProject(newProject);

    set((state) => ({
      projects: [newProject, ...state.projects],
    }));

    return newProject;
  },

  deleteProjectWithUndo: async (projectId: string, onShowToast) => {
    const project = get().projects.find((p) => p.id === projectId);
    const projectName = project ? project.name : 'Project';

    // 1. Mark soft-deleted in storage
    await softDeleteProject(projectId);

    // 2. Remove immediately from visible state
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
    }));

    // 3. Clear existing timer if any
    const existingTimer = pendingPurgeTimers.get(projectId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 4. Start 10-second permanent purge timer
    const timer = setTimeout(async () => {
      pendingPurgeTimers.delete(projectId);
      await permanentlyPurgeProject(projectId);
    }, 10000);

    pendingPurgeTimers.set(projectId, timer);

    // 5. Fire undo toast notification
    onShowToast(`Project “${projectName}” deleted`, async () => {
      // User clicked Undo
      const activeTimer = pendingPurgeTimers.get(projectId);
      if (activeTimer) {
        clearTimeout(activeTimer);
        pendingPurgeTimers.delete(projectId);
      }
      await restoreProject(projectId);
      if (project) {
        await get().fetchProjects(project.workspaceId);
      }
    });
  },

  undoDeleteProject: async (projectId: string, workspaceId: string) => {
    const activeTimer = pendingPurgeTimers.get(projectId);
    if (activeTimer) {
      clearTimeout(activeTimer);
      pendingPurgeTimers.delete(projectId);
    }
    await restoreProject(projectId);
    await get().fetchProjects(workspaceId);
  },

  renameProject: async (projectId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    const existing = get().projects.find((p) => p.id === projectId);
    if (!existing) return;

    const updated: Project = {
      ...existing,
      name: trimmed,
      updatedAt: Date.now(),
    };

    await saveProject(updated);
    set((state) => ({
      projects: state.projects.map((p) => (p.id === projectId ? updated : p)),
    }));
  },

  duplicateProject: async (projectId: string) => {
    const res = await loadProject(projectId);
    if (!res.ok) return null;

    const source = res.data;
    const newId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    const duplicated: Project = {
      ...source,
      id: newId,
      name: `${source.name} (Copy)`,
      updatedAt: now,
    };

    await saveProject(duplicated);
    set((state) => ({
      projects: [duplicated, ...state.projects],
    }));

    return duplicated;
  },

  dismissCorruptProject: (projectId: string) => {
    set((state) => ({
      corruptProjects: state.corruptProjects.filter((c) => c.id !== projectId),
    }));
  },
}));
