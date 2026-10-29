import React, { useState } from 'react';
import { Sparkles, Zap, Cpu, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../../ui';
import {
  SyncConfig,
  SyncProvider,
  saveSyncConfig,
  DEFAULT_GEMINI_KEY,
} from '../../core/sync/syncConfig';

interface SyncProviderSelectorProps {
  config: SyncConfig;
  onChange: (updated: SyncConfig) => void;
  onFallbackToLocal: () => void;
}

export const SyncProviderSelector: React.FC<SyncProviderSelectorProps> = ({
  config,
  onChange,
  onFallbackToLocal,
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleProviderSelect = (provider: SyncProvider) => {
    const updated = saveSyncConfig({ provider });
    onChange(updated);
    setTestResult(null);
  };

  const handleKeyChange = (key: string) => {
    const field = config.provider === 'gemini' ? 'geminiApiKey' : 'groqApiKey';
    const updated = saveSyncConfig({ [field]: key });
    onChange(updated);
    setTestResult(null);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      if (config.provider === 'gemini') {
        const key = config.geminiApiKey || DEFAULT_GEMINI_KEY;
        // Try ?key= first (works for standard AIza... and AQ... keys)
        let res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
        );
        if (!res.ok && (key.startsWith('ya29.') || key.startsWith('AQ.'))) {
          const bearerRes = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models',
            { headers: { Authorization: `Bearer ${key}` } }
          );
          if (bearerRes.ok) res = bearerRes;
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        setTestResult({ ok: true, message: 'Gemini connected successfully!' });
      } else if (config.provider === 'groq') {
        if (!config.groqApiKey) throw new Error('Please enter a Groq API key.');
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${config.groqApiKey.trim()}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        setTestResult({ ok: true, message: 'Groq Whisper Large-v3-Turbo connected!' });
      } else {
        setTestResult({ ok: true, message: 'In-Browser Local Whisper WASM ready.' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setTestResult({ ok: false, message: msg });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-surface-elevated/70 border border-border rounded-panel p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          Sync Engine Provider
        </span>
        {testResult && (
          <span
            className={`text-2xs flex items-center gap-1 font-medium ${
              testResult.ok ? 'text-status-success' : 'text-status-error'
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <AlertCircle className="w-3 h-3" />
            )}
            {testResult.message}
          </span>
        )}
      </div>

      {/* Provider Selector Tabs */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => handleProviderSelect('gemini')}
          className={`flex items-center justify-center gap-1.5 p-2 rounded border text-left transition-colors text-2xs ${
            config.provider === 'gemini'
              ? 'bg-accent/20 border-accent text-text-primary font-semibold shadow-sm'
              : 'bg-surface border-border text-text-primary hover:border-text-tertiary'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0 text-accent" />
          <div className="truncate">
            <div className="truncate font-semibold text-text-primary">Gemini 2.5 Flash</div>
            <div className="text-[10px] text-text-secondary">Cloud · Fast & Smart</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleProviderSelect('groq')}
          className={`flex items-center justify-center gap-1.5 p-2 rounded border text-left transition-colors text-2xs ${
            config.provider === 'groq'
              ? 'bg-accent/20 border-accent text-text-primary font-semibold shadow-sm'
              : 'bg-surface border-border text-text-primary hover:border-text-tertiary'
          }`}
        >
          <Zap className="w-3.5 h-3.5 shrink-0 text-accent" />
          <div className="truncate">
            <div className="truncate font-semibold text-text-primary">Groq Whisper</div>
            <div className="text-[10px] text-text-secondary">Large-v3-Turbo</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleProviderSelect('local-whisper')}
          className={`flex items-center justify-center gap-1.5 p-2 rounded border text-left transition-colors text-2xs ${
            config.provider === 'local-whisper'
              ? 'bg-accent/20 border-accent text-text-primary font-semibold shadow-sm'
              : 'bg-surface border-border text-text-primary hover:border-text-tertiary'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 shrink-0 text-accent" />
          <div className="truncate">
            <div className="truncate font-semibold text-text-primary">Local Whisper</div>
            <div className="text-[10px] text-text-secondary">WASM · Offline</div>
          </div>
        </button>
      </div>

      {/* API Key Input & Action Bar */}
      {config.provider !== 'local-whisper' && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="password"
            placeholder={
              config.provider === 'gemini'
                ? 'Pre-configured Gemini key (or paste AIzaSy...)'
                : 'Enter Groq API Key (gsk_...)'
            }
            value={config.provider === 'gemini' ? config.geminiApiKey : config.groqApiKey}
            onChange={(e) => handleKeyChange(e.target.value)}
            className="flex-1 px-2.5 py-1 text-2xs font-mono bg-canvas border border-border rounded text-text-primary focus:outline-none focus:border-accent"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={testConnection}
            disabled={testing}
            className="text-2xs h-7 shrink-0"
          >
            {testing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            Test Connection
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onFallbackToLocal}
            className="text-2xs h-7 text-text-tertiary hover:text-text-primary shrink-0"
            title="Use Offline In-Browser Whisper"
          >
            Local Fallback
          </Button>
        </div>
      )}
    </div>
  );
};
