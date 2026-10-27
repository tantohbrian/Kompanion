import React, { useRef, useState } from 'react';
import { Music, Upload, X, AlertCircle } from 'lucide-react';
import { Button, IconButton } from '../../ui';
import { IngestedAudio } from './types';
import { naturalSort } from '../../core/utils/naturalSort';
import { decodeAudioBuffer, generateWaveform } from '../../core/audio';
import { saveMediaFile } from '../../core/storage/opfs';
import { formatMsToTimecode } from '../../core/parser/timestampUtils';

interface AudioDropzoneProps {
  projectId: string;
  audioFiles: IngestedAudio[];
  onAudioChange: (audio: IngestedAudio[]) => void;
}

export const AudioDropzone: React.FC<AudioDropzoneProps> = ({
  projectId,
  audioFiles,
  onAudioChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processAudioFiles = async (files: FileList | File[]) => {
    setIsProcessing(true);
    const fileArray = Array.from(files).filter((f) =>
      /\.(mp3|wav|m4a|aac|ogg)$/i.test(f.name)
    );

    const sortedFiles = naturalSort(fileArray, (f) => f.name);
    const newItems: IngestedAudio[] = [];

    for (const file of sortedFiles) {
      const id = `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const storageKey = `proj-${projectId}-audio-${id}`;

      try {
        await saveMediaFile(storageKey, file, file.type || 'audio/mpeg');
        const decoded = await decodeAudioBuffer(file);
        const waveform = await generateWaveform(decoded.channelData, 200);

        newItems.push({
          id,
          name: file.name,
          file,
          storageKey,
          durationMs: decoded.durationMs,
          bytes: file.size,
          waveform,
        });
      } catch (err) {
        newItems.push({
          id,
          name: file.name,
          file,
          storageKey,
          durationMs: 0,
          bytes: file.size,
          isCorrupt: true,
          error: err instanceof Error ? err.message : 'Corrupt audio file',
        });
      }
    }

    const merged = naturalSort([...audioFiles, ...newItems], (f) => f.name);
    onAudioChange(merged);
    setIsProcessing(false);
  };

  const handleRemove = (id: string) => {
    onAudioChange(audioFiles.filter((a) => a.id !== id));
  };

  const totalDurationMs = audioFiles.reduce((sum, a) => sum + (a.durationMs || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
            <Music className="w-4 h-4 text-accent" />
            Voiceover Audio ({audioFiles.length})
          </h2>
          <p className="text-2xs text-text-secondary mt-0.5">
            Total duration: <span className="font-mono text-text-primary font-bold">{formatMsToTimecode(totalDurationMs)}</span>
            {' '}({totalDurationMs.toLocaleString()} ms)
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Upload Audio Files"
        >
          <Upload className="w-3.5 h-3.5 mr-1" />
          Add Audio
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/mp3,audio/wav,audio/m4a,audio/aac,audio/*"
        className="hidden"
        onChange={(e) => e.target.files && processAudioFiles(e.target.files)}
      />

      {audioFiles.length === 0 ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files) processAudioFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border hover:border-accent rounded-panel p-6 text-center cursor-pointer transition-colors bg-surface/50"
          role="button"
          tabIndex={0}
          aria-label="Dropzone for voiceover audio"
        >
          <Music className="w-8 h-8 text-text-tertiary mx-auto mb-2 opacity-60" />
          <p className="text-xs font-semibold text-text-primary">
            {isProcessing ? 'Decoding audio & generating waveform…' : 'Drop voiceover audio here, or browse'}
          </p>
          <p className="text-2xs text-text-secondary mt-1">
            Supports MP3, WAV, M4A. Multiple files are concatenated naturally.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {audioFiles.map((aud, idx) => (
            <div
              key={aud.id}
              className="flex items-center justify-between p-3 bg-surface border border-border rounded-panel text-xs gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-full bg-accent/20 text-accent font-mono text-2xs flex items-center justify-center font-bold">
                  {idx + 1}
                </span>
                <div className="truncate">
                  <p className="font-medium text-text-primary truncate" title={aud.name}>
                    {aud.name}
                  </p>
                  <p className="text-2xs text-text-tertiary font-mono mt-0.5">
                    {aud.isCorrupt ? 'Failed to decode' : formatMsToTimecode(aud.durationMs)}
                  </p>
                </div>
              </div>

              {/* Mini Waveform Visualization */}
              {!aud.isCorrupt && aud.waveform && (
                <div className="flex-1 max-w-xs h-6 flex items-center gap-0.5 px-2 bg-canvas-subtle rounded border border-border-subtle overflow-hidden">
                  {aud.waveform.max.slice(0, 48).map((val, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-accent/70 rounded-full min-w-[2px]"
                      style={{ height: `${Math.max(10, Math.round(val * 100))}%` }}
                    />
                  ))}
                </div>
              )}

              {aud.isCorrupt && (
                <div className="flex items-center gap-1 text-error text-2xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Unreadable format</span>
                </div>
              )}

              <IconButton
                size="sm"
                aria-label={`Remove ${aud.name}`}
                className="text-text-tertiary hover:text-error"
                onClick={() => handleRemove(aud.id)}
              >
                <X className="w-3.5 h-3.5" />
              </IconButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
