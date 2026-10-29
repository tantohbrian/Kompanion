/**
 * Configuration and persistent settings for Option C Smart Sync providers.
 * Pure TypeScript, zero DOM or React dependencies.
 */

export type SyncProvider = 'gemini' | 'groq' | 'local-whisper';

export interface SyncConfig {
  provider: SyncProvider;
  geminiApiKey: string;
  geminiModel: 'gemini-2.5-flash' | 'gemini-2.0-flash';
  groqApiKey: string;
}

const STORAGE_KEY = 'kompanion:syncConfig';

export const DEFAULT_GEMINI_KEY =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) || '';

export const DEFAULT_GROQ_KEY =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GROQ_API_KEY) || '';

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  provider: 'gemini',
  geminiApiKey: DEFAULT_GEMINI_KEY,
  geminiModel: 'gemini-2.5-flash',
  groqApiKey: DEFAULT_GROQ_KEY,
};

export function getSyncConfig(): SyncConfig {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_SYNC_CONFIG };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SYNC_CONFIG };
    const parsed = JSON.parse(raw) as Partial<SyncConfig>;
    return {
      provider: parsed.provider === 'groq' || parsed.provider === 'local-whisper' ? parsed.provider : 'gemini',
      geminiApiKey:
        typeof parsed.geminiApiKey === 'string' && parsed.geminiApiKey.trim()
          ? parsed.geminiApiKey.trim()
          : DEFAULT_GEMINI_KEY,
      groqApiKey:
        typeof parsed.groqApiKey === 'string' && parsed.groqApiKey.trim()
          ? parsed.groqApiKey.trim()
          : DEFAULT_GROQ_KEY,
    };
  } catch {
    return { ...DEFAULT_SYNC_CONFIG };
  }
}

export function saveSyncConfig(updates: Partial<SyncConfig>): SyncConfig {
  const current = getSyncConfig();
  const next: SyncConfig = {
    ...current,
    ...updates,
  };
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota errors
    }
  }
  return next;
}

export function resetSyncConfig(): SyncConfig {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
  return { ...DEFAULT_SYNC_CONFIG };
}
