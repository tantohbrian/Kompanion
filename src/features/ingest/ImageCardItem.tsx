import React, { useState } from 'react';
import { X, RefreshCw, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { IconButton } from '../../ui';
import { IngestedImage } from './types';

export interface ImageCardItemProps {
  image: IngestedImage;
  index: number;
  onReorder: (fromIdx: number, toIdx: number) => void;
  onReplace: (id: string) => void;
  onRemove: (id: string) => void;
}

export const ImageCardItem: React.FC<ImageCardItemProps> = ({
  image,
  index,
  onReorder,
  onReplace,
  onRemove,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', String(index))}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const fromStr = e.dataTransfer.getData('text/plain');
        if (fromStr) {
          onReorder(parseInt(fromStr, 10), index);
        }
        setIsDragOver(false);
      }}
      className={`group relative bg-surface border rounded-panel overflow-hidden transition-all ${
        isDragOver
          ? 'border-accent ring-2 ring-accent/30'
          : 'border-border hover:border-border-strong'
      }`}
    >
      {/* Thumbnail Container */}
      <div className="aspect-video bg-canvas flex items-center justify-center relative overflow-hidden">
        {image.isCorrupt ? (
          <div className="flex flex-col items-center justify-center p-2 text-center text-status-error">
            <AlertCircle className="w-5 h-5 mb-1" />
            <span className="text-2xs">Corrupt File</span>
          </div>
        ) : image.thumbnailUrl ? (
          <img
            src={image.thumbnailUrl}
            alt={image.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <ImageIcon className="w-6 h-6 text-text-tertiary opacity-40" />
        )}

        {/* Order Badge */}
        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-2xs font-mono font-bold text-text-primary">
          {image.order}
        </span>

        {/* Hover Quick Actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity">
          <IconButton
            size="sm"
            aria-label={`Replace ${image.name}`}
            className="w-7 h-7 text-white hover:text-accent bg-surface/80"
            onClick={() => onReplace(image.id)}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton
            size="sm"
            aria-label={`Remove ${image.name}`}
            className="w-7 h-7 text-white hover:text-status-error bg-surface/80"
            onClick={() => onRemove(image.id)}
          >
            <X className="w-3.5 h-3.5" />
          </IconButton>
        </div>
      </div>

      {/* Caption */}
      <div className="p-1.5 bg-surface-elevated truncate">
        <p className="text-2xs font-medium text-text-secondary truncate" title={image.name}>
          {image.name}
        </p>
      </div>
    </div>
  );
};
