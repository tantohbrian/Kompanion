import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStorageEstimate,
  requestPersistentStorage,
  clearAllData,
  formatBytesToMb,
  calculateStoragePercentage,
} from './storageManager';
import { db } from '../../core/storage/db';

describe('Settings Storage Manager (M1)', () => {
  beforeEach(async () => {
    await db.workspaces.clear();
    await db.projects.clear();
  });

  it('formats bytes to megabytes with 1 decimal precision', () => {
    expect(formatBytesToMb(1048576)).toBe('1.0');
    expect(formatBytesToMb(5242880)).toBe('5.0');
    expect(formatBytesToMb(1572864)).toBe('1.5');
  });

  it('calculates storage percentage within 0-100 bounds', () => {
    expect(calculateStoragePercentage(50, 100)).toBe(50);
    expect(calculateStoragePercentage(150, 100)).toBe(100);
    expect(calculateStoragePercentage(0, 0)).toBe(0);
  });

  it('retrieves storage estimate with persistence flag', async () => {
    const estimate = await getStorageEstimate();
    expect(typeof estimate.usageBytes).toBe('number');
    expect(typeof estimate.quotaBytes).toBe('number');
    expect(typeof estimate.percentageUsed).toBe('number');
    expect(typeof estimate.isPersistent).toBe('boolean');
  });

  it('handles persistent storage request without throwing', async () => {
    const result = await requestPersistentStorage();
    expect(typeof result).toBe('boolean');
  });

  it('clears all IndexedDB data cleanly on clearAllData', async () => {
    // Populate dummy records
    await db.workspaces.put({
      id: 'ws-wipe-me',
      name: 'To Wipe',
      color: '#0071E3',
      defaults: {
        canvas: '16:9',
        height: 1080,
        fps: 30,
        animation: { id: 'none', params: {} },
        transition: { id: 'cut', durationMs: 0 },
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    expect(await db.workspaces.count()).toBe(1);

    await clearAllData();

    expect(await db.workspaces.count()).toBe(0);
    expect(await db.projects.count()).toBe(0);
  });
});
