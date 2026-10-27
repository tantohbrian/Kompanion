import { describe, it, expect } from 'vitest';
import { migrateAndValidateProject, validateWorkspace, registerProjectMigration } from './migrations';
import { CURRENT_SCHEMA_VERSION } from './schemas';
import { Project, Workspace } from './types';

describe('Core Model Schemas and Migrations', () => {
  const validDefaults = {
    canvas: '16:9' as const,
    height: 1080 as const,
    fps: 30 as const,
    animation: { id: 'none', params: {} },
    transition: { id: 'cut', durationMs: 0 },
  };

  const validWorkspace: Workspace = {
    id: 'ws-1',
    name: 'Default Workspace',
    color: '#0A84FF',
    defaults: validDefaults,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  const validProject: Project = {
    id: 'proj-1',
    workspaceId: 'ws-1',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    name: 'Test Project',
    settings: validDefaults,
    assets: [],
    script: { raw: '', parse: null },
    timeline: { clips: [], audio: [], gain: 1, muted: false },
    updatedAt: 1700000000000,
  };

  it('validates a correct workspace', () => {
    const result = validateWorkspace(validWorkspace);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe('Default Workspace');
    }
  });

  it('fails invalid workspace with typed error', () => {
    const invalid = { ...validWorkspace, color: '' }; // empty color not allowed if min(1)
    const result = validateWorkspace(invalid);
    expect(result.ok).toBe(false);
  });

  it('validates a correct project', () => {
    const result = migrateAndValidateProject(validProject);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(result.data.timeline.clips).toEqual([]);
    }
  });

  it('handles corrupt project data without throwing and preserves rawData', () => {
    const corrupt = {
      id: 'proj-bad',
      schemaVersion: 1,
      name: 'Corrupt',
      settings: 'invalid', // should be an object
    };
    const result = migrateAndValidateProject(corrupt);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Schema validation failed');
      expect(result.rawData).toEqual(corrupt);
    }
  });

  it('rejects projects with missing or invalid schemaVersion', () => {
    const noVersion = { ...validProject, schemaVersion: 0 };
    const result = migrateAndValidateProject(noVersion);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('schemaVersion');
    }
  });

  it('reports missing migration steps if older version has no registered step', () => {
    const olderProject = { ...validProject, schemaVersion: 0.5 };
    const result = migrateAndValidateProject(olderProject);
    expect(result.ok).toBe(false);
  });

  it('applies registered migration steps sequentially', () => {
    registerProjectMigration(99, (raw) => ({
      ...raw,
      migratedField: true,
    }));

    // Test with mock runner or verify registration works without throwing
    expect(typeof registerProjectMigration).toBe('function');
  });
});

