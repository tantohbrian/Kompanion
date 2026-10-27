import { db } from './db';
import { deleteMediaFile } from './opfs';
import { Project } from '../model/types';
import { migrateAndValidateProject } from '../model/migrations';

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
export async function loadProject(
  id: string
): Promise<{ ok: true; data: Project } | { ok: false; error: string; rawData: unknown }> {
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
