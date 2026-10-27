import {
  getStorageEstimate,
  requestPersistentStorage,
  clearAllData,
  StorageEstimate,
} from '../../core/storage/storage';

export { getStorageEstimate, requestPersistentStorage, clearAllData };
export type { StorageEstimate };

export function formatBytesToMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export function calculateStoragePercentage(usage: number, quota: number): number {
  if (quota <= 0) return 0;
  return Math.min(100, Math.max(0, (usage / quota) * 100));
}
