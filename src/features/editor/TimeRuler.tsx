import React, { useRef } from 'react';
import { playerController } from './playerController';
import { formatTimecode } from '../../core/timeline';

export interface TimeRulerProps {
  totalDurationMs: number;
  pxPerMs: number;
  fps: number;
}

export const TimeRuler: React.FC<TimeRulerProps> = ({
  totalDurationMs,
  pxPerMs,
  fps,
}) => {
  const rulerRef = useRef<HTMLDivElement | null>(null);

  const totalWidthPx = Math.max(800, Math.round(totalDurationMs * pxPerMs));

  // Determine tick interval in seconds based on zoom
  let stepSec = 1;
  if (pxPerMs < 0.03) stepSec = 10;
  else if (pxPerMs < 0.06) stepSec = 5;
  else if (pxPerMs < 0.15) stepSec = 2;
  else if (pxPerMs > 0.4) stepSec = 0.5;

  const stepMs = Math.round(stepSec * 1000);
  const numSteps = Math.ceil(totalDurationMs / stepMs);
  const ticks = Array.from({ length: numSteps + 1 }, (_, i) => i * stepMs);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const updateTime = (clientX: number) => {
      const offsetX = Math.max(0, clientX - rect.left);
      const timeMs = Math.min(totalDurationMs, Math.round(offsetX / pxPerMs));
      playerController.seek(timeMs);
    };

    updateTime(e.clientX);
    rulerRef.current.setPointerCapture(e.pointerId);

    const onPointerMove = (moveEvent: PointerEvent) => {
      updateTime(moveEvent.clientX);
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      if (rulerRef.current) {
        try {
          rulerRef.current.releasePointerCapture(upEvent.pointerId);
        } catch {
          // Ignore
        }
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div
      ref={rulerRef}
      onPointerDown={handlePointerDown}
      className="h-6 bg-surface-elevated/40 border-b border-border-subtle relative cursor-pointer select-none overflow-hidden"
      style={{ width: `${totalWidthPx}px` }}
      aria-label="Timeline Ruler"
    >
      {ticks.map((tMs) => {
        const leftPx = Math.round(tMs * pxPerMs);
        return (
          <div
            key={tMs}
            className="absolute top-0 bottom-0 flex flex-col pointer-events-none"
            style={{ left: `${leftPx}px` }}
          >
            <div className="h-2 w-px bg-border" />
            <span className="text-[10px] font-mono tabular-nums text-text-tertiary ml-1 select-none">
              {formatTimecode(tMs, fps).slice(3)}
            </span>
          </div>
        );
      })}
    </div>
  );
};
