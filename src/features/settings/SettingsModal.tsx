import React, { useState, useEffect } from 'react';
import { Database, ShieldCheck, Trash2, Sun, Moon, Monitor } from 'lucide-react';
import { Dialog, Button } from '../../ui';
import { getStorageEstimate, requestPersistentStorage, clearAllData, StorageEstimate } from '../../core/storage/storage';
import { getSyncConfig, saveSyncConfig, SyncConfig } from '../../core/sync/syncConfig';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme?: 'dark' | 'light' | 'system';
  onThemeChange?: (theme: 'dark' | 'light' | 'system') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onOpenChange,
  theme = 'dark',
  onThemeChange,
}) => {
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(getSyncConfig());

  useEffect(() => {
    if (open) {
      getStorageEstimate().then(setEstimate);
      setSyncConfig(getSyncConfig());
    } else {
      setConfirmClear(false);
    }
  }, [open]);

  const handleRequestPersist = async () => {
    const success = await requestPersistentStorage();
    if (success) {
      const updated = await getStorageEstimate();
      setEstimate(updated);
    }
  };

  const handleClearAll = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setIsClearing(true);
    try {
      await clearAllData();
      window.location.reload();
    } finally {
      setIsClearing(false);
    }
  };

  const formatMb = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Settings & Storage">
      <div className="space-y-6 pt-2">
          {/* Appearance / Theme */}
          <div>
            <h3 className="text-xs font-semibold text-text-primary mb-2">Appearance</h3>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={theme === 'dark' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onThemeChange?.('dark')}
                aria-pressed={theme === 'dark'}
              >
                <Moon className="w-3.5 h-3.5 mr-1" />
                Dark
              </Button>
              <Button
                variant={theme === 'light' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onThemeChange?.('light')}
                aria-pressed={theme === 'light'}
              >
                <Sun className="w-3.5 h-3.5 mr-1" />
                Light
              </Button>
              <Button
                variant={theme === 'system' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onThemeChange?.('system')}
                aria-pressed={theme === 'system'}
              >
                <Monitor className="w-3.5 h-3.5 mr-1" />
                System
              </Button>
            </div>
          </div>

          {/* Smart Sync Provider & API Keys */}
          <div className="p-3 bg-surface-elevated rounded-panel border border-border space-y-2.5">
            <h3 className="text-xs font-semibold text-text-primary">Smart Sync Provider</h3>
            <div className="grid grid-cols-3 gap-2 text-2xs">
              <Button
                variant={syncConfig.provider === 'gemini' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSyncConfig(saveSyncConfig({ provider: 'gemini' }))}
              >
                Gemini 2.5
              </Button>
              <Button
                variant={syncConfig.provider === 'groq' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSyncConfig(saveSyncConfig({ provider: 'groq' }))}
              >
                Groq Whisper
              </Button>
              <Button
                variant={syncConfig.provider === 'local-whisper' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSyncConfig(saveSyncConfig({ provider: 'local-whisper' }))}
              >
                Local WASM
              </Button>
            </div>
            {syncConfig.provider !== 'local-whisper' && (
              <div className="pt-1">
                <label className="text-[10px] text-text-secondary block mb-1">
                  {syncConfig.provider === 'gemini' ? 'Gemini API Key' : 'Groq API Key'}
                </label>
                <input
                  type="password"
                  placeholder={
                    syncConfig.provider === 'gemini'
                      ? 'Pre-configured (or paste AIzaSy...)'
                      : 'gsk_...'
                  }
                  value={
                    syncConfig.provider === 'gemini'
                      ? syncConfig.geminiApiKey
                      : syncConfig.groqApiKey
                  }
                  onChange={(e) => {
                    const field =
                      syncConfig.provider === 'gemini' ? 'geminiApiKey' : 'groqApiKey';
                    setSyncConfig(saveSyncConfig({ [field]: e.target.value }));
                  }}
                  className="w-full px-2 py-1 text-2xs font-mono bg-canvas border border-border rounded text-text-primary"
                />
              </div>
            )}
          </div>

          {/* Storage Quota */}
          <div className="p-3 bg-surface-elevated rounded-panel border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-accent" />
              <h3 className="text-xs font-semibold text-text-primary">Storage Quota</h3>
            </div>

            {estimate ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-text-secondary">
                  <span>Used: {formatMb(estimate.usageBytes)} MB</span>
                  <span>Total: {formatMb(estimate.quotaBytes)} MB</span>
                </div>
                <div className="w-full bg-canvas rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-accent h-full rounded-full transition-all duration-medium"
                    style={{ width: `${Math.min(estimate.percentageUsed, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-text-tertiary">
                    {estimate.isPersistent ? 'Storage is persistent' : 'Storage may be evicted by browser'}
                  </span>
                  {!estimate.isPersistent && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleRequestPersist}
                      className="text-xs h-7"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                      Request Persistent
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-secondary">Calculating storage estimate…</p>
            )}
          </div>

          {/* Danger Zone: Clear Data */}
          <div className="pt-2 border-t border-border">
            <h3 className="text-xs font-semibold text-status-error mb-1">Danger Zone</h3>
            <p className="text-xs text-text-secondary mb-3">
              Clear all IndexedDB records and OPFS files. This action cannot be undone.
            </p>
            <Button
              variant={confirmClear ? 'destructive' : 'secondary'}
              size="sm"
              disabled={isClearing}
              onClick={handleClearAll}
              className={confirmClear ? '' : 'text-status-error border-status-error/40 hover:bg-status-error/10'}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              {confirmClear ? 'Click again to confirm wipe' : 'Clear All Data'}
            </Button>
          </div>
        </div>
    </Dialog>
  );
};
