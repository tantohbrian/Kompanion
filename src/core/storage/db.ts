import Dexie, { type Table } from 'dexie';
import { Project, Workspace } from '../model/types';

export interface FallbackBlobRecord {
  key: string;
  buffer: ArrayBuffer;
  mimeType: string;
  size: number;
  updatedAt: number;
}

export class KompanionDatabase extends Dexie {
  workspaces!: Table<Workspace, string>;
  projects!: Table<Project, string>;
  blobs!: Table<FallbackBlobRecord, string>;

  constructor() {
    super('kompanion-db');

    this.version(1).stores({
      workspaces: 'id, name, createdAt, updatedAt',
      projects: 'id, workspaceId, name, updatedAt, deletedAt',
      blobs: 'key, updatedAt',
    });
  }
}

export const db = new KompanionDatabase();
