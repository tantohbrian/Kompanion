import { db } from './db';
import { isOpfsSupported, deleteMediaFile } from './opfs';
import { Project, Workspace, ProjectDefaults } from '../model/types';
import { migrateAndValidateProject, validateWorkspace } from '../model/migrations';

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

/**
 * Loads projects for a given workspace, separating valid projects from corrupt records.
 * Ignores soft-deleted projects.
 */
export async function loadProjectsForWorkspace(workspaceId: string): Promise<{
  valid: Project[];
  corrupt: Array<{ raw: unknown; error: string; id: string }>;
}> {
  const records = await db.projects.where('workspaceId').equals(workspaceId).toArray();
  const valid: Project[] = [];
  const corrupt: Array<{ raw: unknown; error: string; id: string }> = [];

  for (const record of records) {
    if (record.deletedAt !== undefined && record.deletedAt !== null) {
      continue;
    }
    const res = migrateAndValidateProject(record);
    if (res.ok) {
      valid.push(res.data);
    } else {
      corrupt.push({
        raw: res.rawData,
        error: res.error,
        id: (record as { id?: string })?.id || 'unknown',
      });
    }
  }

  valid.sort((a, b) => b.updatedAt - a.updatedAt);
  return { valid, corrupt };
}

/**
 * Loads a project by ID and validates/migrates it.
 */
export async function loadProject(id: string): Promise<{ ok: true; data: Project } | { ok: false; error: string; rawData: unknown }> {
  const record = await db.projects.get(id);
  if (!record) {
    return { ok: false, error: `Project not found with id ${id}`, rawData: null };
  }
  return migrateAndValidateProject(record);
}

/**
 * Saves a project.
 */
export async function saveProject(project: Project): Promise<void> {
  const res = migrateAndValidateProject(project);
  if (!res.ok) {
    throw new Error(`Cannot save invalid project: ${res.error}`);
  }
  await db.projects.put({
    ...res.data,
    updatedAt: Date.now(),
  });
}

/**
 * Marks a project as soft-deleted with a timestamp.
 */
export async function softDeleteProject(id: string): Promise<void> {
  await db.projects.update(id, { deletedAt: Date.now() });
}

/**
 * Restores a soft-deleted project.
 */
export async function restoreProject(id: string): Promise<void> {
  const proj = await db.projects.get(id);
  if (proj) {
    const updated = { ...proj };
    delete updated.deletedAt;
    await db.projects.put(updated);
  }
}

/**
 * Permanently removes a project and purges its media assets from OPFS and IndexedDB.
 */
export async function permanentlyPurgeProject(id: string): Promise<void> {
  const project = await db.projects.get(id);
  if (project?.assets) {
    for (const asset of project.assets) {
      if (asset.storageKey) {
        await deleteMediaFile(asset.storageKey);
      }
    }
  }
  await db.projects.delete(id);
}

/**
 * Purges any soft-deleted projects that have exceeded the expiry window (e.g., 10 seconds).
 * Call on startup to clean up projects abandoned mid-undo.
 */
export async function purgeExpiredDeletedProjects(expiryWindowMs = 10000): Promise<number> {
  const now = Date.now();
  const cutoff = now - expiryWindowMs;
  const expired = await db.projects
    .where('deletedAt')
    .belowOrEqual(cutoff)
    .toArray();

  for (const proj of expired) {
    await permanentlyPurgeProject(proj.id);
  }
  return expired.length;
}
