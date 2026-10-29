import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { IconButton } from '../../ui';
import { playerController } from './playerController';
import { useTimelineStore } from '../../core/timeline';
import { prefetchClips } from '../../core/render';

export interface CanvasPreviewProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const CanvasPreview: React.FC<CanvasPreviewProps> = ({
  isFullscreen: externalIsFullscreen,
  onToggleFullscreen,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [internalIsFullscreen, setInternalIsFullscreen] = useState(false);
  const isFullscreen = externalIsFullscreen ?? internalIsFullscreen;

  const project = useTimelineStore((s) => s.project);
  const canvasAspect = project?.settings.canvas || '16:9';
  const canvasHeight = project?.settings.height || 1080;
  const canvasWidth = canvasAspect === '16:9' ? Math.round((canvasHeight * 16) / 9) : Math.round((canvasHeight * 9) / 16);

  useEffect(() => {
    playerController.attachCanvas(canvasRef.current);
    return () => {
      playerController.attachCanvas(null);
    };
  }, []);

  // Redraw current frame whenever fullscreen mode changes
  useEffect(() => {
    playerController.renderCurrentFrame(playerController.getCurrentTimeMs());
  }, [isFullscreen]);

  // Background asset prefetching on time changes & immediate redraw on decode
  useEffect(() => {
    if (!project || project.timeline.clips.length === 0) return;

    const getStorageKey = (assetId: string) =>
      project.assets.find((a) => a.id === assetId)?.storageKey;

    let currentStart = 0;
    const spans = project.timeline.clips.map((c) => {
      const start = currentStart;
      currentStart += c.durationMs;
      return { assetId: c.assetId, startMs: start, endMs: currentStart };
    });

    const triggerPrefetch = (tMs: number) => {
      void prefetchClips(spans, tMs, getStorageKey, undefined, 5).then((prefetched) => {
        if (prefetched.length > 0) {
          playerController.renderCurrentFrame(tMs);
        }
      });
    };

    // Prefetch for current playhead on project load
    triggerPrefetch(useTimelineStore.getState().playheadMs);

    const unsubscribe = playerController.subscribeTime((tMs) => {
      triggerPrefetch(tMs);
    });

    return () => {
      unsubscribe();
    };
  }, [project]);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setInternalIsFullscreen(true);
      } catch {
        // Fallback
        setInternalIsFullscreen((prev) => !prev);
      }
    } else {
      try {
        await document.exitFullscreen();
      } catch {
        // Ignore
      }
      setInternalIsFullscreen(false);
    }
  };

  const handleToggleFullscreen = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
    } else {
      void toggleFullscreen();
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setInternalIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 w-full h-full flex items-center justify-center p-4 overflow-hidden select-none group transition-colors ${
        isFullscreen ? 'bg-black p-6' : 'bg-[#09090c]'
      }`}
    >
      {/* Aspect-Correct Canvas Container */}
      <div
        className={`relative max-h-full max-w-full flex items-center justify-center bg-black rounded-panel border shadow-2xl overflow-hidden transition-all ${
          isFullscreen ? 'border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.9)]' : 'border-white/[0.08]'
        } ${canvasAspect === '9:16' ? 'aspect-[9/16]' : 'aspect-video'}`}
        style={{
          height: canvasAspect === '9:16' ? '100%' : 'auto',
          width: canvasAspect === '16:9' ? '100%' : 'auto',
          maxWidth: isFullscreen ? '100%' : canvasAspect === '9:16' ? '420px' : '960px',
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="w-full h-full object-contain block bg-black"
          aria-label="Timeline Canvas Preview"
        />

        {/* Overlay hover controls */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-md border border-white/10 rounded-md p-1 shadow-lg">
          <IconButton
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Preview'}
            size="sm"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen (Esc / F)' : 'Fullscreen Preview (F)'}
            className="hover:bg-white/[0.1] text-text-secondary hover:text-text-primary rounded w-7 h-7"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </IconButton>
        </div>
      </div>
    </div>
  );
};
