import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, Button } from '../../ui';
import { Project } from '../../core/model/types';
import { ExportConfig, ExportProgress } from '../../core/export/types';
import { ExportPipeline, ExportResult } from '../../core/export/pipeline';
import { ExportConfigView } from './ExportConfigView';
import { ExportProgressView } from './ExportProgressView';
import { ExportCompleteView } from './ExportCompleteView';

interface Props {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

type ExportState = 'idle' | 'exporting' | 'complete' | 'error';

export const ExportModal: React.FC<Props> = ({ project, isOpen, onClose }) => {
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [includeAudio, setIncludeAudio] = useState(true);
  const [height, setHeight] = useState<number>(project.settings.height ?? 1080);
  const [fps, setFps] = useState<number>(project.settings.fps ?? 30);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pipelineRef = useRef<ExportPipeline | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (pipelineRef.current) {
        pipelineRef.current.cancel();
        pipelineRef.current = null;
      }
      setExportState('idle');
      setProgress(null);
      setExportResult(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  const isVertical = project.settings.canvas === '9:16';
  const width = isVertical
    ? Math.round((height * 9) / 16)
    : Math.round((height * 16) / 9);

  const handleStartExport = async () => {
    setExportState('exporting');
    setErrorMessage(null);
    setProgress({ frame: 0, totalFrames: 1, percentage: 0, fps: 0, etaSeconds: 0 });

    const config: ExportConfig = {
      width,
      height,
      fps,
      includeAudio,
    };

    const pipeline = new ExportPipeline();
    pipelineRef.current = pipeline;

    try {
      const result = await pipeline.run(project, config, {
        onProgress: (p) => {
          if (pipelineRef.current === pipeline) {
            setProgress(p);
          }
        },
      });

      if (pipelineRef.current === pipeline) {
        setExportResult(result);
        setExportState('complete');
      }
    } catch (err) {
      console.error('[EXPORT_DEBUG] pipeline error:', err);
      if (pipelineRef.current === pipeline) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('cancelled')) {
          setExportState('idle');
        } else {
          setErrorMessage(msg);
          setExportState('error');
        }
      }
    } finally {
      if (pipelineRef.current === pipeline) {
        pipelineRef.current = null;
      }
    }
  };

  const handleCancelExport = () => {
    if (pipelineRef.current) {
      pipelineRef.current.cancel();
      pipelineRef.current = null;
    }
    setExportState('idle');
  };

  const handleDownload = async () => {
    if (!exportResult) return;

    // Support File System Access API on Chrome/Chromium when available
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const pickerOpts = {
          suggestedName: exportResult.filename,
          types: [
            {
              description: 'MP4 Video',
              accept: { 'video/mp4': ['.mp4'] },
            },
          ],
        };
        const handle = await (window as unknown as {
          showSaveFilePicker: (opts: typeof pickerOpts) => Promise<FileSystemFileHandle>;
        }).showSaveFilePicker(pickerOpts);
        const writable = await handle.createWritable();
        await writable.write(exportResult.blob);
        await writable.close();
        return;
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          return; // User cancelled save picker
        }
        // Fall through to blob download if picker failed
      }
    }

    const url = URL.createObjectURL(exportResult.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Export Project Video"
      description="Render and encode timeline into a verified MP4 container using Mediabunny."
    >
      {exportState === 'idle' && (
        <ExportConfigView
          project={project}
          height={height}
          fps={fps}
          includeAudio={includeAudio}
          onHeightChange={setHeight}
          onFpsChange={setFps}
          onAudioChange={setIncludeAudio}
          onStartExport={handleStartExport}
          onCancel={onClose}
        />
      )}

      {exportState === 'exporting' && progress && (
        <ExportProgressView progress={progress} onCancel={handleCancelExport} />
      )}

      {exportState === 'complete' && exportResult && (
        <ExportCompleteView
          exportResult={exportResult}
          includeAudio={includeAudio}
          onDownload={handleDownload}
          onDone={onClose}
        />
      )}

      {exportState === 'error' && (
        <div className="py-4 space-y-4">
          <div className="p-3 bg-status-error/10 border border-status-error/30 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-status-error shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-status-error">
                Export Failed
              </div>
              <div className="text-[11px] text-text-secondary mt-0.5">
                {errorMessage || 'Unknown error occurred during export.'}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button variant="primary" size="sm" onClick={handleStartExport}>
              Try Again
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
};
