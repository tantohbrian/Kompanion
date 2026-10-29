import React, { useState, useEffect, useRef } from 'react';
import { Wand2, AlertCircle, Check, X } from 'lucide-react';
import { Button } from '../../ui';
import { RawSegmentInput, AlignedSegmentDiff, AlignmentResult } from '../../core/sync/types';
import { checkScriptHasNarration, alignSegmentsToWords } from '../../core/sync/aligner';
import { WhisperClient } from '../../core/sync/whisperClient';
import {
  getSyncConfig,
  saveSyncConfig,
  DEFAULT_GEMINI_KEY,
  SyncConfig,
} from '../../core/sync/syncConfig';
import { alignWithGemini } from '../../core/sync/geminiSyncClient';
import { transcribeWithGroq } from '../../core/sync/groqWhisperClient';
import { extract16kMono } from './audioExtract';
import { SyncDiffTable } from './SyncDiffTable';
import { SmartSyncConsentView } from './SmartSyncConsentView';
import { SyncProviderSelector } from './SyncProviderSelector';
import { SmartSyncProgressView } from './SmartSyncProgressView';
import { SmartSyncErrorView } from './SmartSyncErrorView';

export interface SmartSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: RawSegmentInput[];
  audioBlobOrBuffer?: Blob | AudioBuffer | null;
  thumbnails?: Record<number, string>;
  onApplyAlignment: (diffs: AlignedSegmentDiff[]) => void;
}

type ModalStep = 'consent' | 'no_narration' | 'progress' | 'diff' | 'error';

export const SmartSyncModal: React.FC<SmartSyncModalProps> = ({
  isOpen,
  onClose,
  segments,
  audioBlobOrBuffer,
  thumbnails = {},
  onApplyAlignment,
}) => {
  const [step, setStep] = useState<ModalStep>('consent');
  const [config, setConfig] = useState<SyncConfig>(getSyncConfig());
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [diffs, setDiffs] = useState<AlignedSegmentDiff[]>([]);
  const whisperClientRef = useRef<WhisperClient | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setConfig(getSyncConfig());
    if (!checkScriptHasNarration(segments)) {
      setStep('no_narration');
    } else {
      setStep('consent');
    }
    setProgressPercent(0);
    setProgressStatus('');
    setErrorMessage('');
  }, [isOpen, segments]);

  if (!isOpen) return null;

  const handleStartSync = async () => {
    setStep('progress');
    setProgressPercent(15);
    setProgressStatus('Decoding and resampling audio to 16kHz mono…');

    try {
      const channelData = await extract16kMono(audioBlobOrBuffer);
      const totalAudioDurationMs = Math.round((channelData.length / 16000) * 1000);

      let alignmentResult: AlignmentResult;
      const hasMockWords =
        typeof window !== 'undefined' &&
        !!(window as unknown as { __MOCK_WHISPER_WORDS__?: unknown }).__MOCK_WHISPER_WORDS__;

      if (!hasMockWords && config.provider === 'gemini') {
        setProgressPercent(35);
        setProgressStatus('Aligning audio with Gemini 2.5 Flash…');
        const key = config.geminiApiKey || DEFAULT_GEMINI_KEY;
        alignmentResult = await alignWithGemini({
          apiKey: key,
          model: config.geminiModel,
          audioSamples: channelData,
          segments,
          totalAudioDurationMs,
        });
      } else if (!hasMockWords && config.provider === 'groq') {
        setProgressPercent(35);
        setProgressStatus('Transcribing with Groq Whisper Large-v3-Turbo…');
        const transcription = await transcribeWithGroq({
          apiKey: config.groqApiKey,
          audioSamples: channelData,
        });
        setProgressPercent(80);
        setProgressStatus('Aligning word timestamps across script beats…');
        alignmentResult = alignSegmentsToWords(segments, transcription.words, {
          totalDurationMs: totalAudioDurationMs,
        });
      } else {
        // Local In-Browser Whisper WASM
        whisperClientRef.current = new WhisperClient();
        setProgressPercent(25);
        setProgressStatus('Loading in-browser Whisper WASM model…');
        const transcription = await whisperClientRef.current.transcribe(
          channelData,
          16000,
          {
            onModelProgress: (pct, status) => {
              setProgressPercent(Math.round(25 + pct * 0.4));
              setProgressStatus(status);
            },
            onInferenceProgress: (pct) => {
              setProgressPercent(Math.round(65 + pct * 0.3));
              setProgressStatus(`Aligning audio… ${Math.round(pct)}%`);
            },
          }
        );
        alignmentResult = alignSegmentsToWords(segments, transcription.words, {
          totalDurationMs: totalAudioDurationMs,
        });
      }

      setProgressPercent(100);
      setDiffs(alignmentResult.diffs);
      setStep('diff');
    } catch (err) {
      console.error('Smart Sync failed:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Smart Sync encountered an unexpected error. You can retry or switch provider.'
      );
      setStep('error');
    }
  };

  const handleToggleStatus = (index: number) => {
    setDiffs((prev) =>
      prev.map((d) =>
        d.index === index
          ? { ...d, status: d.status === 'accepted' ? 'rejected' : 'accepted' }
          : d
      )
    );
  };

  const handleAcceptAll = () => {
    setDiffs((prev) => prev.map((d) => ({ ...d, status: 'accepted' })));
  };

  const handleRejectAll = () => {
    setDiffs((prev) => prev.map((d) => ({ ...d, status: 'rejected' })));
  };

  const handleApply = () => {
    onApplyAlignment(diffs);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="smart-sync-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
    >
      <div className="bg-surface border border-border rounded-modal shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-fast">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-elevated/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h2 id="smart-sync-title" className="text-sm font-bold text-text-primary">
                Smart Sync Audio Alignment
              </h2>
              <p className="text-2xs text-text-secondary">
                Align script beats to spoken voiceover audio with sub-second accuracy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary p-1.5 rounded transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {step === 'no_narration' && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-panel bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-text-primary text-sm">
                    No Narration Text in Script
                  </div>
                  <p className="text-text-secondary leading-relaxed">
                    This script contains visual image prompts without spoken narration lines.
                    Smart Sync matches voiceover words to narration text. Your visual prompts and
                    existing segment timings have been left intact.
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="secondary" size="md" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}

          {step === 'consent' && (
            <div className="space-y-4">
              <SyncProviderSelector
                config={config}
                onChange={setConfig}
                onFallbackToLocal={() => {
                  const updated = saveSyncConfig({ provider: 'local-whisper' });
                  setConfig(updated);
                }}
              />
              <SmartSyncConsentView onConfirm={handleStartSync} onCancel={onClose} />
            </div>
          )}

          {step === 'progress' && (
            <SmartSyncProgressView status={progressStatus} percent={progressPercent} />
          )}

          {step === 'error' && (
            <SmartSyncErrorView
              errorMessage={errorMessage}
              config={config}
              onConfigChange={setConfig}
              onFallbackToLocal={() => {
                const updated = saveSyncConfig({ provider: 'local-whisper' });
                setConfig(updated);
                void handleStartSync();
              }}
              onBack={() => setStep('consent')}
              onRetry={handleStartSync}
            />
          )}

          {step === 'diff' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary">
                  Proposed Timing Adjustments ({diffs.length} beats)
                </span>
                <span className="text-2xs text-status-success font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Ready to Apply
                </span>
              </div>
              <SyncDiffTable
                diffs={diffs}
                thumbnails={thumbnails}
                onToggleStatus={handleToggleStatus}
                onAcceptAll={handleAcceptAll}
                onRejectAll={handleRejectAll}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'diff' && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-border bg-surface-elevated/40">
            <Button variant="secondary" size="md" onClick={() => setStep('consent')}>
              Re-run
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" size="md" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" size="md" className="font-semibold" onClick={handleApply}>
                <Check className="w-4 h-4 mr-1.5" />
                Apply Changes to Timeline
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
