import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { IconButton } from '../../ui';
import { playerController } from './playerController';
import { useTimelineStore } from '../../core/timeline';
import { prefetchClips } from '../../core/render';

export const CanvasPreview: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
        setIsFullscreen(true);
      } catch {
        // Ignore fullscreen error
      }
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full bg-canvas-subtle flex items-center justify-center p-4 overflow-hidden select-none"
    >
      {/* Aspect-Correct Canvas Container */}
      <div
        className={`relative max-h-full max-w-full flex items-center justify-center bg-black rounded-panel border border-border shadow-2xl overflow-hidden ${
          canvasAspect === '9:16' ? 'aspect-[9/16]' : 'aspect-video'
        }`}
        style={{
          height: canvasAspect === '9:16' ? '100%' : 'auto',
          width: canvasAspect === '16:9' ? '100%' : 'auto',
          maxWidth: canvasAspect === '9:16' ? '420px' : '960px',
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="w-full h-full object-contain block bg-black"
          aria-label="Timeline Canvas Preview"
        />

        {/* Overlay controls */}
        <div className="absolute top-2 right-2 opacity-0 hover:opacity-100 transition-opacity bg-surface/80 backdrop-blur-sm rounded-control p-1">
          <IconButton
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            size="sm"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </IconButton>
        </div>
      </div>
    </div>
  );
};
