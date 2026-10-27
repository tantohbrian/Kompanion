import { Project, Workspace } from './types';
import { ProjectSchema, WorkspaceSchema, CURRENT_SCHEMA_VERSION } from './schemas';

export type MigrationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; rawData: unknown };

/**
 * Migration registry mapping version N -> N+1
 */
export type ProjectMigrationStep = (raw: Record<string, unknown>) => Record<string, unknown>;

const PROJECT_MIGRATIONS: Record<number, ProjectMigrationStep> = {
  // Future schema migrations: 1 -> 2, 2 -> 3, etc.
};

export function registerProjectMigration(fromVersion: number, step: ProjectMigrationStep): void {
  PROJECT_MIGRATIONS[fromVersion] = step;
}

/**
 * Validates and migrates a project object to the latest schema version.
 * Never throws; returns typed MigrationResult.
 */
export function migrateAndValidateProject(raw: unknown): MigrationResult<Project> {
  if (!raw || typeof raw !== 'object') {
    return {
      ok: false,
      error: 'Invalid project payload: expected an object.',
      rawData: raw,
    };
  }

  try {
    let current = { ...(raw as Record<string, unknown>) };
    const version = typeof current.schemaVersion === 'number' ? current.schemaVersion : 0;

    if (version < 1) {
      return {
        ok: false,
        error: `Invalid or missing schemaVersion: ${version}.`,
        rawData: raw,
      };
    }

    // Sequentially apply migrations up to CURRENT_SCHEMA_VERSION
    for (let v = version; v < CURRENT_SCHEMA_VERSION; v++) {
      const step = PROJECT_MIGRATIONS[v];
      if (!step) {
        return {
          ok: false,
          error: `Missing migration step from version ${v} to ${v + 1}.`,
          rawData: raw,
        };
      }
      current = step(current);
      current.schemaVersion = v + 1;
    }

    const parseResult = ProjectSchema.safeParse(current);
    if (!parseResult.success) {
      return {
        ok: false,
        error: `Schema validation failed: ${parseResult.error.message}`,
        rawData: raw,
      };
    }

    return {
      ok: true,
      data: parseResult.data as Project,
    };
  } catch (err) {
    return {
      ok: false,
      error: `Unexpected error during project migration: ${err instanceof Error ? err.message : String(err)}`,
      rawData: raw,
    };
  }
}

/**
 * Validates a workspace object.
 */
export function validateWorkspace(raw: unknown): MigrationResult<Workspace> {
  const parseResult = WorkspaceSchema.safeParse(raw);
  if (!parseResult.success) {
    return {
      ok: false,
      error: `Workspace validation failed: ${parseResult.error.message}`,
      rawData: raw,
    };
  }
  return {
    ok: true,
    data: parseResult.data as Workspace,
  };
}
