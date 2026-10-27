import React, { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../../ui';
import { IngestedImage, IngestedAudio } from './types';
import { ImageDropzone } from './ImageDropzone';
import { AudioDropzone } from './AudioDropzone';
import { ScriptDropzone } from './ScriptDropzone';
import { ValidationPanel } from './ValidationPanel';
import { ParseResult } from '../../core/parser/types';
import { extendLastSegmentTo } from '../../core/parser/diagnostics';

interface IngestViewProps {
  projectId: string;
  initialImages?: IngestedImage[];
  initialAudio?: IngestedAudio[];
  initialRawScript?: string;
  initialParseResult?: ParseResult | null;
  onProceedToReview: (payload: {
    images: IngestedImage[];
    audio: IngestedAudio[];
    rawScript: string;
    parseResult: ParseResult;
  }) => void;
}

export const IngestView: React.FC<IngestViewProps> = ({
  projectId,
  initialImages = [],
  initialAudio = [],
  initialRawScript = '',
  initialParseResult = null,
  onProceedToReview,
}) => {
  const [images, setImages] = useState<IngestedImage[]>(initialImages);
  const [audioFiles, setAudioFiles] = useState<IngestedAudio[]>(initialAudio);
  const [rawScript, setRawScript] = useState<string>(initialRawScript);
  const [parseResult, setParseResult] = useState<ParseResult | null>(initialParseResult);

  const totalAudioMs = audioFiles.reduce((sum, a) => sum + (a.durationMs || 0), 0);

  const handleScriptChange = (raw: string, parse: ParseResult) => {
    setRawScript(raw);
    setParseResult(parse);
  };

  const handleFixRemoveCorrupt = () => {
    setImages((prev) => prev.filter((img) => !img.isCorrupt).map((img, idx) => ({ ...img, order: idx + 1 })));
    setAudioFiles((prev) => prev.filter((aud) => !aud.isCorrupt));
  };

  const handleFixExtendLastClip = (audioDurationMs: number) => {
    if (!parseResult) return;
    const updated = extendLastSegmentTo(parseResult.segments, audioDurationMs);
    setParseResult({
      ...parseResult,
      segments: updated,
    });
  };

  const handleFixDeduplicateNames = () => {
    const seen = new Map<string, number>();
    const updated = images.map((img) => {
      const lower = img.name.toLowerCase();
      const count = seen.get(lower) || 0;
      seen.set(lower, count + 1);
      if (count === 0) return img;

      const dotIdx = img.name.lastIndexOf('.');
      const base = dotIdx > 0 ? img.name.slice(0, dotIdx) : img.name;
      const ext = dotIdx > 0 ? img.name.slice(dotIdx) : '';
      return {
        ...img,
        name: `${base} (${count + 1})${ext}`,
      };
    });
    setImages(updated);
  };

  const canProceed = parseResult && parseResult.segments.length > 0;

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            Ingest Assets & Script
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Import images, voiceover audio, and prompt scripts before assembling the timeline.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          disabled={!canProceed}
          onClick={() => {
            if (parseResult) {
              onProceedToReview({
                images,
                audio: audioFiles,
                rawScript,
                parseResult,
              });
            }
          }}
          aria-label="Proceed to Script Review"
        >
          Review Timestamps
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>

      {/* Validation Panel */}
      <ValidationPanel
        images={images}
        audioFiles={audioFiles}
        parseResult={parseResult}
        onFixRemoveCorrupt={handleFixRemoveCorrupt}
        onFixExtendLastClip={handleFixExtendLastClip}
        onFixDeduplicateNames={handleFixDeduplicateNames}
      />

      {/* Media Ingest Sections */}
      <div className="space-y-8">
        {/* Images Dropzone */}
        <section aria-label="Images Section" className="p-5 bg-surface-elevated/40 border border-border rounded-panel">
          <ImageDropzone
            projectId={projectId}
            images={images}
            onImagesChange={setImages}
          />
        </section>

        {/* Audio Dropzone */}
        <section aria-label="Audio Section" className="p-5 bg-surface-elevated/40 border border-border rounded-panel">
          <AudioDropzone
            projectId={projectId}
            audioFiles={audioFiles}
            onAudioChange={setAudioFiles}
          />
        </section>

        {/* Script Ingest Section */}
        <section aria-label="Script Section" className="p-5 bg-surface-elevated/40 border border-border rounded-panel">
          <ScriptDropzone
            rawScript={rawScript}
            parseResult={parseResult}
            audioDurationMs={totalAudioMs}
            onScriptChange={handleScriptChange}
          />
        </section>
      </div>

      {/* Footer Proceed Button */}
      <div className="flex justify-end pt-4 border-t border-border">
        <Button
          variant="primary"
          size="md"
          disabled={!canProceed}
          onClick={() => {
            if (parseResult) {
              onProceedToReview({
                images,
                audio: audioFiles,
                rawScript,
                parseResult,
              });
            }
          }}
          aria-label="Proceed to Script Review"
        >
          Review Timestamps
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
};
