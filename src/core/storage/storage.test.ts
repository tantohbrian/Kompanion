import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { saveMediaFile, getMediaFile, deleteMediaFile } from './opfs';
import { getStorageEstimate, clearAllData } from './storage';

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe('Storage Layer', () => {
  beforeEach(async () => {
    await db.workspaces.clear();
    await db.projects.clear();
    await db.blobs.clear();
  });

  it('estimates storage without throwing', async () => {
    const est = await getStorageEstimate();
    expect(est).toBeDefined();
    expect(typeof est.usageBytes).toBe('number');
    expect(typeof est.quotaBytes).toBe('number');
    expect(typeof est.isPersistent).toBe('boolean');
  });

  it('saves, retrieves, and deletes binary data using fallback mechanism', async () => {
    const key = 'test-asset-123';
    const testData = new Blob(['hello kompanion audio'], { type: 'audio/wav' });

    await saveMediaFile(key, testData);
    const retrieved = await getMediaFile(key);
    expect(retrieved).not.toBeNull();

    if (retrieved) {
      const text = await readBlobAsText(retrieved);
      expect(text).toBe('hello kompanion audio');
    }

    await deleteMediaFile(key);
    const afterDelete = await getMediaFile(key);
    expect(afterDelete).toBeNull();
  });

  it('clears all data cleanly', async () => {
    await saveMediaFile('temp-key', new Blob(['data']));
    await clearAllData();
    const result = await getMediaFile('temp-key');
    expect(result).toBeNull();
  });
});
