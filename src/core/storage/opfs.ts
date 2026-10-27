import { db } from './db';

let opfsRootPromise: Promise<FileSystemDirectoryHandle | null> | null = null;

export function isOpfsSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.storage !== 'undefined' &&
    typeof navigator.storage.getDirectory === 'function'
  );
}

async function getOpfsRoot(): Promise<FileSystemDirectoryHandle | null> {
  if (!isOpfsSupported()) {
    return null;
  }
  if (!opfsRootPromise) {
    opfsRootPromise = navigator.storage.getDirectory().catch((err) => {
      console.warn('OPFS initialization failed; falling back to IndexedDB blobs:', err);
      return null;
    });
  }
  return opfsRootPromise;
}

/**
 * Safely converts a Blob to an ArrayBuffer across both real browsers and test environments.
 */
export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return await blob.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Saves binary media data into OPFS, or falls back to IndexedDB.
 */
export async function saveMediaFile(
  storageKey: string,
  data: Blob | ArrayBuffer,
  defaultMimeType = 'application/octet-stream'
): Promise<void> {
  const root = await getOpfsRoot();
  const buffer = data instanceof ArrayBuffer ? data : await blobToArrayBuffer(data);
  const mimeType = data instanceof Blob ? data.type || defaultMimeType : defaultMimeType;

  if (root) {
    try {
      const fileHandle = await root.getFileHandle(storageKey, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(buffer);
      await writable.close();
      return;
    } catch (err) {
      console.warn(`OPFS write failed for ${storageKey}, falling back to IndexedDB:`, err);
    }
  }

  // Fallback to IndexedDB blobs table
  await db.blobs.put({
    key: storageKey,
    buffer,
    mimeType,
    size: buffer.byteLength,
    updatedAt: Date.now(),
  });
}

/**
 * Retrieves binary media from OPFS, or from IndexedDB fallback.
 */
export async function getMediaFile(storageKey: string): Promise<Blob | null> {
  const root = await getOpfsRoot();

  if (root) {
    try {
      const fileHandle = await root.getFileHandle(storageKey);
      return await fileHandle.getFile();
    } catch {
      // File may not exist in OPFS or OPFS failed, try fallback
    }
  }

  const record = await db.blobs.get(storageKey);
  return record ? new Blob([record.buffer], { type: record.mimeType }) : null;
}

/**
 * Deletes binary media from OPFS and IndexedDB.
 */
export async function deleteMediaFile(storageKey: string): Promise<void> {
  const root = await getOpfsRoot();

  if (root) {
    try {
      await root.removeEntry(storageKey);
    } catch {
      // Ignore if not in OPFS
    }
  }

  await db.blobs.delete(storageKey);
}
