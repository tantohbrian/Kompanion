import React, { useState, useEffect, useRef } from 'react';
import {
  Wand2,
  AlertCircle,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { Button } from '../../ui';
import {
  RawSegmentInput,
  AlignedSegmentDiff,
  AlignmentResult,
} from '../../core/sync/types';
import { checkScriptHasNarration, alignSegmentsToWords } from '../../core/sync/aligner';
import { WhisperClient } from '../../core/sync/whisperClient';
import { SyncDiffTable } from './SyncDiffTable';
import { SmartSyncConsentView } from './SmartSyncConsentView';

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
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [diffs, setDiffs] = useState<AlignedSegmentDiff[]>([]);
  const whisperClientRef = useRef<WhisperClient | null>(null);

  // Check narration on open
  useEffect(() => {
    if (!isOpen) return;

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
    setProgressPercent(10);
    setProgressStatus('Preparing voiceover audio…');

    try {
      whisperClientRef.current = new WhisperClient();

      // Extract raw audio data
      let channelData: Float32Array;
      let sampleRate = 16000;

      if (audioBlobOrBuffer instanceof AudioBuffer) {
        channelData = audioBlobOrBuffer.getChannelData(0);
        sampleRate = audioBlobOrBuffer.sampleRate;
      } else if (audioBlobOrBuffer instanceof Blob) {
        const arrayBuf = await audioBlobOrBuffer.arrayBuffer();
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const decoded = await audioCtx.decodeAudioData(arrayBuf);
        channelData = decoded.getChannelData(0);
        sampleRate = decoded.sampleRate;
        await audioCtx.close();
      } else {
        // Fallback synthetic mono buffer if audio missing in mock/preview
        channelData = new Float32Array(16000);
      }

      setProgressPercent(20);
      setProgressStatus('Checking local model cache…');

      const transcription = await whisperClientRef.current.transcribe(
        channelData,
        sampleRate,
        {
          onModelProgress: (pct, status) => {
            setProgressPercent(Math.round(20 + pct * 0.4));
            setProgressStatus(status);
          },
          onInferenceProgress: (pct) => {
            setProgressPercent(Math.round(60 + pct * 0.35));
            setProgressStatus('Aligning speech word timestamps…');
          },
          onFallbackWasm: (reason) => {
            setProgressStatus(`WebGPU unavailable (${reason}), using WASM…`);
          },
        }
      );

      // Perform sequence alignment
      const alignResult: AlignmentResult = alignSegmentsToWords(
        segments,
        transcription.words
      );

      setDiffs(alignResult.diffs);
      setProgressPercent(100);
      setStep('diff');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('cancelled')) {
        onClose();
      } else {
        setErrorMessage(msg);
        setStep('error');
      }
    }
  };

  const handleCancelSync = () => {
    if (whisperClientRef.current) {
      whisperClientRef.current.cancel();
      whisperClientRef.current = null;
    }
    onClose();
  };

  const handleToggleDiffStatus = (index: number) => {
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

  const handleConfirmApply = () => {
    onApplyAlignment(diffs);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="smart-sync-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none"
    >
      <div className="bg-surface border border-border rounded-panel shadow-2xl max-w-2xl w-full p-6 text-text-primary space-y-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h2 id="smart-sync-title" className="text-sm font-semibold text-text-primary">
                Smart Sync (Speech-to-Text Alignment)
              </h2>
              <p className="text-2xs text-text-secondary">
                Locally transcribe voiceover and align image cuts to spoken phrases.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancelSync}
            className="text-text-secondary hover:text-text-primary p-1 rounded transition-colors"
            aria-label="Close Smart Sync Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. No Narration State */}
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

        {/* 2. Consent State */}
        {step === 'consent' && (
          <SmartSyncConsentView onConfirm={handleStartSync} onCancel={onClose} />
        )}

        {/* 3. Progress State */}
        {step === 'progress' && (
          <div className="space-y-5 py-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-primary font-medium flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                {progressStatus || 'Processing audio…'}
              </span>
              <span className="font-mono text-text-secondary tabular-nums">
                {progressPercent}%
              </span>
            </div>

            <div className="w-full bg-surface-elevated h-2 rounded-full overflow-hidden border border-border">
              <div
                className="bg-accent h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={handleCancelSync}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* 4. Diff Review State */}
        {step === 'diff' && (
          <div className="space-y-4">
            <SyncDiffTable
              diffs={diffs}
              thumbnails={thumbnails}
              onToggleStatus={handleToggleDiffStatus}
              onAcceptAll={handleAcceptAll}
              onRejectAll={handleRejectAll}
            />

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button variant="secondary" size="md" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" size="md" onClick={handleConfirmApply}>
                <Check className="w-4 h-4 mr-1.5" />
                Apply Changes to Timeline
              </Button>
            </div>
          </div>
        )}

        {/* 5. Error State */}
        {step === 'error' && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-panel bg-destructive/10 border border-destructive/30 text-destructive text-xs space-y-1">
              <div className="font-semibold text-text-primary text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                Smart Sync Failed
              </div>
              <p className="text-text-secondary">{errorMessage}</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" size="md" onClick={onClose}>
                Close
              </Button>
              <Button variant="primary" size="md" onClick={handleStartSync}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
