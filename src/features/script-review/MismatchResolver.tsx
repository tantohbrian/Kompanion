import React from 'react';
import { AlertCircle, Layers, SkipForward, PlusCircle, Maximize2 } from 'lucide-react';
import { Button } from '../../ui';

interface MismatchResolverProps {
  imageCount: number;
  segmentCount: number;
  totalAudioMs?: number;
  onAssign: () => void;
  onSkip: () => void;
  onPlaceholder: () => void;
  onExtendLast: () => void;
}

export const MismatchResolver: React.FC<MismatchResolverProps> = ({
  imageCount,
  segmentCount,
  onAssign,
  onSkip,
  onPlaceholder,
  onExtendLast,
}) => {
  if (imageCount === segmentCount) return null;

  const diff = Math.abs(imageCount - segmentCount);
  const isFewerImages = imageCount < segmentCount;

  return (
    <div
      role="region"
      aria-label="Mismatch Resolver"
      className="p-4 bg-surface-elevated border border-warning/40 rounded-panel space-y-3"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <div>
          <h3 className="text-xs font-semibold text-text-primary">
            Image vs. Script Beat Count Mismatch ({imageCount} images, {segmentCount} beats)
          </h3>
          <p className="text-2xs text-text-secondary mt-0.5">
            {isFewerImages
              ? `You have ${diff} fewer image${diff === 1 ? '' : 's'} than script beats. Choose how to map unassigned segments:`
              : `You have ${diff} extra image${diff === 1 ? '' : 's'} that are not mapped to script beats.`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          variant="secondary"
          size="sm"
          onClick={onAssign}
          aria-label="Assign Available Images"
        >
          <Layers className="w-3.5 h-3.5 mr-1" />
          Assign Available
        </Button>

        {isFewerImages && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={onPlaceholder}
              aria-label="Insert Placeholders"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1" />
              Insert Placeholders
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={onSkip}
              aria-label="Skip Unmapped Beats"
            >
              <SkipForward className="w-3.5 h-3.5 mr-1" />
              Skip Unmapped Beats
            </Button>
          </>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={onExtendLast}
          aria-label="Extend Last Clip"
        >
          <Maximize2 className="w-3.5 h-3.5 mr-1" />
          Extend Last Clip
        </Button>
      </div>
    </div>
  );
};
