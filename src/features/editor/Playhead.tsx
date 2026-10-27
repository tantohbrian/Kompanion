import React, { useEffect, useRef } from 'react';
import { playerController } from './playerController';

export interface PlayheadProps {
  pxPerMs: number;
}

export const Playhead: React.FC<PlayheadProps> = ({ pxPerMs }) => {
  const lineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubscribe = playerController.subscribeTime((tMs) => {
      if (lineRef.current) {
        const xPx = Math.round(tMs * pxPerMs);
        lineRef.current.style.transform = `translateX(${xPx}px)`;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [pxPerMs]);

  return (
    <div
      ref={lineRef}
      className="absolute top-0 bottom-0 left-0 w-px bg-destructive pointer-events-none z-30 will-change-transform"
      style={{ transform: 'translateX(0px)' }}
    >
      {/* Playhead Head Marker */}
      <div className="absolute top-0 -left-1.5 w-3 h-3 bg-destructive rounded-b-sm shadow-sm" />
    </div>
  );
};
