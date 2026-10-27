import { db } from './db';
import { isOpfsSupported } from './opfs';
import { Project, Workspace, ProjectDefaults } from '../model/types';
import { validateWorkspace } from '../model/migrations';
import { permanentlyPurgeProject } from './projectStorage';

export interface StorageEstimate {
  usageBytes: number;
  quotaBytes: number;
  percentageUsed: number;
  isPersistent: boolean;
  usingOpfs: boolean;
}

export const DEFAULT_WORKSPACE_ID = 'default';

export const DEFAULT_PROJECT_DEFAULTS: ProjectDefaults = {
  canvas: '16:9',
  height: 1080,
  fps: 30,
  animation: { id: 'none', params: {} },
  transition: { id: 'cut', durationMs: 0 },
};

/**
 * Calculates current storage estimate and persistence status.
 */
export async function getStorageEstimate(): Promise<StorageEstimate> {
  let usageBytes = 0;
  let quotaBytes = 0;
  let isPersistent = false;

  if (typeof navigator !== 'undefined' && navigator.storage) {
    if (navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        usageBytes = estimate.usage || 0;
        quotaBytes = estimate.quota || 0;
      } catch {
        // Fall back to 0
      }
    }
    if (navigator.storage.persisted) {
      try {
        isPersistent = await navigator.storage.persisted();
      } catch {
        // Ignore
      }
    }
  }

  const percentageUsed = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;

  return {
    usageBytes,
    quotaBytes,
    percentageUsed,
    isPersistent,
    usingOpfs: isOpfsSupported(),
  };
}

/**
 * Requests persistent storage from the browser.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Confirmed destructive action: clears all data from IndexedDB and OPFS.
 */
export async function clearAllData(): Promise<void> {
  await db.workspaces.clear();
  await db.projects.clear();
  await db.blobs.clear();

  if (isOpfsSupported()) {
    try {
      const root = await navigator.storage.getDirectory();
      // Remove entries from OPFS root
      // @ts-expect-error values() iterator is part of FileSystemDirectoryHandle spec
      for await (const entry of root.values()) {
        await root.removeEntry(entry.name, { recursive: true });
      }
    } catch (err) {
      console.warn('Failed to completely clear OPFS root:', err);
    }
  }
}

/**
 * Ensures a default workspace exists in storage, creating one if not present.
 */
export async function ensureDefaultWorkspace(): Promise<Workspace> {
  const existing = await db.workspaces.get(DEFAULT_WORKSPACE_ID);
  let defaultWs: Workspace;

  if (existing) {
    const valid = validateWorkspace(existing);
    if (valid.ok) {
      defaultWs = valid.data;
      if (defaultWs.name === 'Default Channel') {
        defaultWs.name = 'Default Workspace';
        await db.workspaces.put(defaultWs);
      }
    } else {
      defaultWs = {
        id: DEFAULT_WORKSPACE_ID,
        name: 'Default Workspace',
        color: '#0071E3',
        defaults: { ...DEFAULT_PROJECT_DEFAULTS },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.workspaces.put(defaultWs);
    }
  } else {
    defaultWs = {
      id: DEFAULT_WORKSPACE_ID,
      name: 'Default Workspace',
      color: '#0071E3',
      defaults: { ...DEFAULT_PROJECT_DEFAULTS },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.workspaces.put(defaultWs);
  }

  // Ensure default demo project exists for initial onboarding
  const existingDemo = await db.projects.get('demo-1');
  if (!existingDemo) {
    const demoProj: Project = {
      id: 'demo-1',
      schemaVersion: 1,
      workspaceId: DEFAULT_WORKSPACE_ID,
      name: 'Demo Project',
      settings: { ...DEFAULT_PROJECT_DEFAULTS },
      assets: [],
      script: { raw: '', parse: null },
      timeline: {
        clips: [],
        audio: [],
        gain: 1,
        muted: false,
      },
      updatedAt: Date.now(),
    };
    await db.projects.put(demoProj);
  }

  return defaultWs;
}

/**
 * Loads and validates all active workspaces.
 */
export async function loadWorkspaces(): Promise<Workspace[]> {
  const records = await db.workspaces.toArray();
  const valid: Workspace[] = [];
  for (const record of records) {
    const res = validateWorkspace(record);
    if (res.ok) {
      valid.push(res.data);
    }
  }
  valid.sort((a, b) => a.createdAt - b.createdAt);
  return valid;
}

/**
 * Saves a validated workspace.
 */
export async function saveWorkspace(workspace: Workspace): Promise<void> {
  const res = validateWorkspace(workspace);
  if (!res.ok) {
    throw new Error(`Cannot save invalid workspace: ${res.error}`);
  }
  await db.workspaces.put({
    ...res.data,
    updatedAt: Date.now(),
  });
}

/**
 * Deletes a workspace and purges all of its associated projects and media.
 */
export async function deleteWorkspace(id: string): Promise<void> {
  const projects = await db.projects.where('workspaceId').equals(id).toArray();
  for (const proj of projects) {
    await permanentlyPurgeProject(proj.id);
  }
  await db.workspaces.delete(id);
}

// Re-export project storage operations
export {
  loadProjectsForWorkspace,
  loadProject,
  saveProject,
  softDeleteProject,
  restoreProject,
  permanentlyPurgeProject,
  purgeExpiredDeletedProjects,
} from './projectStorage';
