import React, { useEffect, useRef, useState, useCallback } from 'react';
import { playerController } from './playerController';

export interface PlayheadProps {
  pxPerMs: number;
  totalDurationMs?: number;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export const Playhead: React.FC<PlayheadProps> = ({
  pxPerMs,
  totalDurationMs = 0,
  containerRef,
}) => {
  const lineRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(playerController.getCurrentTimeMs());

  const setVisualPosition = useCallback(
    (timeMs: number) => {
      if (lineRef.current) {
        const xPx = Math.round(timeMs * pxPerMs);
        lineRef.current.style.transform = `translate3d(${xPx}px, 0, 0)`;
      }
    },
    [pxPerMs]
  );

  useEffect(() => {
    const initialMs = playerController.getCurrentTimeMs();
    setCurrentTimeMs(initialMs);
    setVisualPosition(initialMs);

    const unsubscribe = playerController.subscribeTime((tMs) => {
      if (!isDraggingRef.current) {
        setCurrentTimeMs(tMs);
        setVisualPosition(tMs);

        // Smooth auto-scroll during playback when reaching viewport boundaries
        if (playerController.getIsPlaying() && containerRef?.current) {
          const container = containerRef.current;
          const xPx = Math.round(tMs * pxPerMs);
          const scrollLeft = container.scrollLeft;
          const viewWidth = container.clientWidth;
          if (xPx > scrollLeft + viewWidth - 80) {
            container.scrollLeft = xPx - 100;
          } else if (xPx < scrollLeft) {
            container.scrollLeft = Math.max(0, xPx - 40);
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [pxPerMs, containerRef, setVisualPosition]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingRef.current = true;
    const targetEl = e.currentTarget as HTMLElement;
    targetEl.setPointerCapture(e.pointerId);

    const parentContainer = lineRef.current?.parentElement;
    if (!parentContainer) return;
    const parentRect = parentContainer.getBoundingClientRect();

    const updateScrub = (clientX: number) => {
      const offsetX = Math.max(0, clientX - parentRect.left);
      const timeMs = Math.round(offsetX / pxPerMs);
      const clampedMs = totalDurationMs > 0 ? Math.min(totalDurationMs, timeMs) : timeMs;
      setCurrentTimeMs(clampedMs);
      setVisualPosition(clampedMs);
      playerController.seek(clampedMs);
    };

    updateScrub(e.clientX);

    const onPointerMove = (moveEvt: PointerEvent) => {
      if (isDraggingRef.current) {
        updateScrub(moveEvt.clientX);
      }
    };

    const onPointerUp = (upEvt: PointerEvent) => {
      isDraggingRef.current = false;
      try {
        targetEl.releasePointerCapture(upEvt.pointerId);
      } catch {
        // Ignore
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div
      ref={lineRef}
      className="absolute top-0 bottom-0 left-0 w-0.5 bg-status-error pointer-events-none z-40 will-change-transform shadow-[0_0_8px_rgba(239,68,68,0.7)]"
      style={{ transform: `translate3d(${Math.round(currentTimeMs * pxPerMs)}px, 0, 0)` }}
    >
      {/* High-visibility grab handle on top of TimeRuler */}
      <div
        onPointerDown={handlePointerDown}
        className="pointer-events-auto cursor-ew-resize absolute top-0 -left-2 w-4 h-6 flex flex-col items-center group -translate-y-0.5"
        title="Drag to scrub timeline"
      >
        <div className="w-3.5 h-3.5 bg-status-error group-hover:scale-110 group-hover:brightness-110 transition-transform shadow-md rotate-45 rounded-[2px]" />
        <div className="w-0.5 h-2.5 bg-status-error -mt-1" />
      </div>
    </div>
  );
};
