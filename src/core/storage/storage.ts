import { db } from './db';
import { isOpfsSupported } from './opfs';
import { Project, Workspace } from '../model/types';
import { migrateAndValidateProject, validateWorkspace } from '../model/migrations';

export interface StorageEstimate {
  usageBytes: number;
  quotaBytes: number;
  percentageUsed: number;
  isPersistent: boolean;
  usingOpfs: boolean;
}

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
  return valid;
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
