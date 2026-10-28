import React, { useState } from 'react';
import { ArrowLeft, Check, Sparkles, AlertTriangle, Wand2 } from 'lucide-react';
import { Button } from '../../ui';
import { ScriptReviewTable, MappedAsset } from './ScriptReviewTable';
import { MismatchResolver } from './MismatchResolver';
import { ParsedSegment, ParseResult } from '../../core/parser/types';
import { getRegisteredParsers, parseScript } from '../../core/parser/registry';
import { Clip, AudioClip } from '../../core/model/types';
import { autoFixOverlaps, autoCloseGaps, extendLastSegmentTo } from '../../core/parser/diagnostics';
import { SmartSyncModal } from './SmartSyncModal';
import { SmartSyncErrorBoundary } from './SmartSyncErrorBoundary';
import { AlignedSegmentDiff } from '../../core/sync/types';
import { checkScriptHasNarration } from '../../core/sync/aligner';

interface ScriptReviewViewProps {
  projectId: string;
  rawScript: string;
  initialParseResult: ParseResult;
  assets: { id: string; name: string; kind: 'image' | 'audio'; thumbnailUrl?: string }[];
  audioBlob?: Blob | null;
  totalAudioMs?: number;
  onBackToIngest: () => void;
  onAcceptTimeline: (timeline: { clips: Clip[]; audio: AudioClip[] }) => void;
}

export const ScriptReviewView: React.FC<ScriptReviewViewProps> = ({
  rawScript,
  initialParseResult,
  assets,
  audioBlob,
  totalAudioMs = 0,
  onBackToIngest,
  onAcceptTimeline,
}) => {
  const [parseResult, setParseResult] = useState<ParseResult>(initialParseResult);
  const [selectedStrategy, setSelectedStrategy] = useState<string>(initialParseResult.strategyName);
  const [segments, setSegments] = useState<ParsedSegment[]>(initialParseResult.segments);
  const [isSmartSyncOpen, setIsSmartSyncOpen] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);

  const imageAssets = assets.filter((a) => a.kind === 'image');
  const audioAssets = assets.filter((a) => a.kind === 'audio');
  const registeredStrategies = getRegisteredParsers();
  const hasAudioAndNarration = audioAssets.length > 0 && checkScriptHasNarration(segments);

  const handleStrategyChange = (newStrategy: string) => {
    setSelectedStrategy(newStrategy);
    const newParse = parseScript(rawScript, newStrategy, { audioDurationMs: totalAudioMs });
    setParseResult(newParse);
    setSegments(newParse.segments);
  };

  const handleUpdateSegment = (index: number, updates: Partial<ParsedSegment>) => {
    setSegments((prev) =>
      prev.map((s) => (s.index === index ? { ...s, ...updates } : s))
    );
  };

  const handleRemoveSegment = (index: number) => {
    setSegments((prev) =>
      prev.filter((s) => s.index !== index).map((s, idx) => ({ ...s, index: idx + 1 }))
    );
  };

  const handleExtendLast = () => {
    if (totalAudioMs > 0) {
      setSegments((prev) => extendLastSegmentTo(prev, totalAudioMs));
    } else {
      setSegments((prev) => {
        if (prev.length === 0) return prev;
        const copy = [...prev];
        const last = copy[copy.length - 1]!;
        last.endMs = last.startMs + 8000;
        return copy;
      });
    }
  };

  const handleApplyAlignment = (diffs: AlignedSegmentDiff[]) => {
    setHasSynced(true);
    const diffMap = new Map(diffs.map((d) => [d.index, d]));
    setSegments((prev) => {
      let currentStart = 0;
      return prev.map((seg) => {
        const diff = diffMap.get(seg.index);
        const duration =
          diff && diff.status === 'accepted'
            ? diff.proposedDurationMs
            : seg.endMs - seg.startMs;
        const newSeg = {
          ...seg,
          startMs: currentStart,
          endMs: currentStart + duration,
        };
        currentStart += duration;
        return newSeg;
      });
    });
  };

  const handleAccept = () => {
    const sanitized = autoCloseGaps(autoFixOverlaps(segments));
    const clips: Clip[] = sanitized.map((seg, idx) => ({
      id: `clip-${seg.index}`,
      assetId: imageAssets[idx]?.id || imageAssets[0]?.id || `asset-placeholder-${seg.index}`,
      durationMs: Math.max(500, seg.endMs - seg.startMs),
      fit: 'cover',
      animation: 'inherit',
      transitionIn: 'inherit',
      sourceSegment: seg.index,
    }));

    const audioClips: AudioClip[] = audioAssets.map((aud) => ({
      id: `audio-${aud.id}`,
      assetId: aud.id,
      offsetMs: 0,
    }));

    onAcceptTimeline({ clips, audio: audioClips });
  };

  const mappedAssets: MappedAsset[] = segments.map((_, idx) => ({
    id: imageAssets[idx]?.id || `placeholder-${idx + 1}`,
    name: imageAssets[idx]?.name || `Placeholder Image ${idx + 1}`,
    thumbnailUrl: imageAssets[idx]?.thumbnailUrl,
  }));

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onBackToIngest} aria-label="Back to Ingest">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Ingest
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              Script Review & Timestamps
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Review and adjust beat timings, prompts, and image mappings before entering the timeline.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsSmartSyncOpen(true)}
            aria-label="Smart Sync Speech-to-Text Alignment"
          >
            <Wand2 className="w-3.5 h-3.5 mr-1.5 text-accent" />
            Smart Sync
          </Button>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-secondary whitespace-nowrap">Strategy:</span>
            <select
              value={selectedStrategy}
              onChange={(e) => handleStrategyChange(e.target.value)}
              className="bg-surface border border-border rounded px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:border-accent"
              aria-label="Parser Strategy Selector"
            >
              {registeredStrategies.map((strat) => (
                <option key={strat.name} value={strat.name}>{strat.label}</option>
              ))}
            </select>
          </div>

          {!hasSynced && hasAudioAndNarration && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsSmartSyncOpen(true)}
              title="Snap image cuts to audio words before building timeline"
            >
              <Wand2 className="w-3.5 h-3.5 mr-1 text-accent" />
              Sync to Audio First
            </Button>
          )}

          <Button variant="primary" size="md" onClick={handleAccept} aria-label="Accept and Build Timeline">
            <Check className="w-4 h-4 mr-1.5" />
            Accept Timeline
          </Button>
        </div>
      </div>

      {/* Prominent Smart Sync Callout Banner */}
      {!hasSynced && hasAudioAndNarration && (
        <div className="p-4 rounded-panel bg-accent/15 border border-accent/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center text-accent shrink-0">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-text-primary block text-sm">
                Voiceover audio & spoken script segments detected
              </span>
              <p className="text-text-secondary text-2xs mt-0.5 leading-relaxed">
                Run Smart Sync to snap image cuts to the exact spoken words instead of estimated script timestamps.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsSmartSyncOpen(true)}
            className="shrink-0 font-semibold"
          >
            <Wand2 className="w-3.5 h-3.5 mr-1.5" />
            Sync Cuts to Audio (Smart Sync)
          </Button>
        </div>
      )}

      {/* Diagnostics / Warnings */}
      {parseResult.diagnostics.length > 0 && (
        <div className="p-3 bg-surface-elevated border border-border rounded-panel text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-warning font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Parser Diagnostics ({parseResult.diagnostics.length})</span>
          </div>
          <ul className="list-disc pl-5 text-2xs text-text-secondary space-y-0.5">
            {parseResult.diagnostics.map((d, i) => (
              <li key={i}>{d.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Mismatch Resolver */}
      <MismatchResolver
        imageCount={imageAssets.length}
        segmentCount={segments.length}
        totalAudioMs={totalAudioMs}
        onAssign={() => {}}
        onSkip={() => setSegments((prev) => prev.slice(0, imageAssets.length))}
        onPlaceholder={() => {}}
        onExtendLast={handleExtendLast}
      />

      {/* Editable Table */}
      <ScriptReviewTable
        segments={segments}
        mappedAssets={mappedAssets}
        onUpdateSegment={handleUpdateSegment}
        onRemoveSegment={handleRemoveSegment}
      />

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="secondary" size="sm" onClick={onBackToIngest} aria-label="Back to Ingest">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Ingest
        </Button>

        <div className="flex items-center gap-3">
          {!hasSynced && hasAudioAndNarration && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsSmartSyncOpen(true)}
              title="Snap image cuts to audio words before building timeline"
            >
              <Wand2 className="w-3.5 h-3.5 mr-1 text-accent" />
              Sync to Audio First
            </Button>
          )}

          <Button variant="primary" size="md" onClick={handleAccept} aria-label="Accept and Build Timeline">
            <Check className="w-4 h-4 mr-1.5" />
            Accept Timeline
          </Button>
        </div>
      </div>

      <SmartSyncErrorBoundary onReset={() => setIsSmartSyncOpen(false)}>
        <SmartSyncModal
          isOpen={isSmartSyncOpen}
          onClose={() => setIsSmartSyncOpen(false)}
          segments={segments}
          audioBlobOrBuffer={audioBlob}
          thumbnails={Object.fromEntries(
            mappedAssets.map((m, idx) => [idx + 1, m.thumbnailUrl || ''])
          )}
          onApplyAlignment={handleApplyAlignment}
        />
      </SmartSyncErrorBoundary>
    </div>
  );
};
