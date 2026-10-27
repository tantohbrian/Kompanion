import React, { useRef } from 'react';
import { FileText, Upload, Sparkles } from 'lucide-react';
import { Button } from '../../ui';
import { ParseResult } from '../../core/parser/types';
import { parseScript } from '../../core/parser/registry';

interface ScriptDropzoneProps {
  rawScript: string;
  parseResult: ParseResult | null;
  audioDurationMs?: number;
  onScriptChange: (raw: string, parse: ParseResult) => void;
}

export const ScriptDropzone: React.FC<ScriptDropzoneProps> = ({
  rawScript,
  parseResult,
  audioDurationMs,
  onScriptChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (text: string) => {
    const parse = parseScript(text, undefined, { audioDurationMs });
    onScriptChange(text, parse);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    handleTextChange(text);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-accent" />
            Narration & Prompt Script
          </h2>
          <p className="text-2xs text-text-secondary mt-0.5">
            Paste script or upload Markdown / text file with timestamps or prompt markers.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Upload Script File"
        >
          <Upload className="w-3.5 h-3.5 mr-1" />
          Upload Script
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.srt"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div className="space-y-2">
        <textarea
          value={rawScript}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Paste your image prompt script or narration text here...&#10;e.g.&#10;## Image 1 — 00:00–00:05&#10;**Script segment:** Once upon a time...&#10;**Image prompt:** Clean hand-drawn illustration..."
          rows={8}
          className="w-full bg-surface border border-border rounded-panel p-3 text-xs text-text-primary font-mono placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent leading-relaxed resize-y"
          aria-label="Raw script text input"
        />

        {parseResult && parseResult.segments.length > 0 && (
          <div className="flex items-center justify-between p-2.5 bg-surface-elevated border border-border rounded-panel text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="font-semibold text-text-primary">
                {parseResult.segments.length} visual beats detected
              </span>
              <span className="text-2xs px-2 py-0.5 rounded bg-surface border border-border text-text-secondary">
                Strategy: {parseResult.strategyLabel}
              </span>
            </div>
            {parseResult.diagnostics.length > 0 && (
              <span className="text-2xs text-warning font-medium">
                {parseResult.diagnostics.length} diagnostic notice{parseResult.diagnostics.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
