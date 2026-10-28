import React, { useRef, useState } from 'react';
import { Upload, X, RefreshCw, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Button, IconButton } from '../../ui';
import { IngestedImage } from './types';
import { naturalSort } from '../../core/utils/naturalSort';
import { createDownscaledThumbnail } from '../../core/utils/thumbnailGenerator';
import { saveMediaFile } from '../../core/storage/opfs';

interface ImageDropzoneProps {
  projectId: string;
  images: IngestedImage[];
  onImagesChange: (images: IngestedImage[]) => void;
}

export const ImageDropzone: React.FC<ImageDropzoneProps> = ({
  projectId,
  images,
  onImagesChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replacingImageId, setReplacingImageId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const processFiles = async (files: FileList | File[]) => {
    setIsProcessing(true);
    const fileArray = Array.from(files).filter((f) =>
      /\.(png|jpe?g|webp)$/i.test(f.name)
    );

    const sortedFiles = naturalSort(fileArray, (f) => f.name);
    const newItems: IngestedImage[] = [];

    for (let i = 0; i < sortedFiles.length; i++) {
      const file = sortedFiles[i]!;
      const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const storageKey = `proj-${projectId}-img-${id}`;

      try {
        await saveMediaFile(storageKey, file, file.type || 'image/png');
        const thumb = await createDownscaledThumbnail(file, 320, 180);

        newItems.push({
          id,
          name: file.name,
          file,
          storageKey,
          order: images.length + i + 1,
          width: thumb.width,
          height: thumb.height,
          bytes: file.size,
          thumbnailUrl: thumb.thumbnailUrl,
        });
      } catch (err) {
        const isQuota =
          err instanceof Error &&
          (err.name === 'QuotaExceededError' || err.message.toLowerCase().includes('quota'));
        newItems.push({
          id,
          name: file.name,
          file,
          storageKey,
          order: images.length + i + 1,
          bytes: file.size,
          thumbnailUrl: '',
          isCorrupt: true,
          error: isQuota
            ? 'Storage quota exceeded. Clean up storage in Settings or free up disk space.'
            : err instanceof Error ? err.message : 'Corrupt image',
        });
      }
    }

    const merged = naturalSort([...images, ...newItems], (item) => item.name);
    const reindexed = merged.map((img, idx) => ({ ...img, order: idx + 1 }));
    onImagesChange(reindexed);
    setIsProcessing(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = (id: string) => {
    const filtered = images.filter((img) => img.id !== id);
    onImagesChange(filtered.map((img, idx) => ({ ...img, order: idx + 1 })));
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingImageId) return;

    const targetIdx = images.findIndex((img) => img.id === replacingImageId);
    if (targetIdx < 0) return;

    const storageKey = `proj-${projectId}-img-${replacingImageId}`;
    try {
      await saveMediaFile(storageKey, file, file.type || 'image/png');
      const thumb = await createDownscaledThumbnail(file, 320, 180);

      const updated = [...images];
      updated[targetIdx] = {
        ...updated[targetIdx]!,
        name: file.name,
        file,
        bytes: file.size,
        width: thumb.width,
        height: thumb.height,
        thumbnailUrl: thumb.thumbnailUrl,
        isCorrupt: false,
        error: undefined,
      };
      onImagesChange(updated);
    } catch (err) {
      console.error('Failed to replace image:', err);
    } finally {
      setReplacingImageId(null);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  const handleReorder = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= images.length || toIdx >= images.length) return;
    const reordered = [...images];
    const [moved] = reordered.splice(fromIdx, 1);
    if (moved) {
      reordered.splice(toIdx, 0, moved);
      onImagesChange(reordered.map((img, idx) => ({ ...img, order: idx + 1 })));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-accent" />
            Image Assets ({images.length})
          </h2>
          <p className="text-2xs text-text-secondary mt-0.5">
            Naturally sorted by filename. Drag cards to adjust beat order.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Upload Images"
        >
          <Upload className="w-3.5 h-3.5 mr-1" />
          Add Images
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => e.target.files && processFiles(e.target.files)}
      />

      <input
        ref={replaceInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleReplaceFile}
      />

      {/* Drop area / empty state */}
      {images.length === 0 ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border hover:border-accent rounded-panel p-8 text-center cursor-pointer transition-colors bg-surface/50"
          role="button"
          tabIndex={0}
          aria-label="Dropzone for image assets"
        >
          <ImageIcon className="w-8 h-8 text-text-tertiary mx-auto mb-2 opacity-60" />
          <p className="text-xs font-semibold text-text-primary">
            {isProcessing ? 'Processing images…' : 'Drop numbered images here, or browse'}
          </p>
          <p className="text-2xs text-text-secondary mt-1">
            Supports PNG, JPG, and WebP. Automatically sorts naturally (1, 2, 10).
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-96 overflow-y-auto p-1"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {images.map((img, idx) => (
            <div
              key={img.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', String(idx))}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverIdx(idx);
              }}
              onDragLeave={() => setDragOverIdx(null)}
              onDrop={(e) => {
                e.preventDefault();
                const fromStr = e.dataTransfer.getData('text/plain');
                if (fromStr) {
                  handleReorder(parseInt(fromStr, 10), idx);
                }
                setDragOverIdx(null);
              }}
              className={`group relative bg-surface border rounded-panel overflow-hidden transition-all ${
                dragOverIdx === idx ? 'border-accent ring-2 ring-accent/30' : 'border-border hover:border-border-strong'
              }`}
            >
              {/* Thumbnail Container */}
              <div className="aspect-video bg-canvas flex items-center justify-center relative overflow-hidden">
                {img.isCorrupt ? (
                  <div className="flex flex-col items-center justify-center p-2 text-center text-error">
                    <AlertCircle className="w-5 h-5 mb-1" />
                    <span className="text-2xs">Corrupt File</span>
                  </div>
                ) : img.thumbnailUrl ? (
                  <img
                    src={img.thumbnailUrl}
                    alt={img.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-text-tertiary opacity-40" />
                )}

                {/* Order Badge */}
                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-2xs font-mono font-bold text-text-primary">
                  {img.order}
                </span>

                {/* Hover Quick Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity">
                  <IconButton
                    size="sm"
                    aria-label={`Replace ${img.name}`}
                    className="w-7 h-7 text-white hover:text-accent bg-surface/80"
                    onClick={() => {
                      setReplacingImageId(img.id);
                      replaceInputRef.current?.click();
                    }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </IconButton>
                  <IconButton
                    size="sm"
                    aria-label={`Remove ${img.name}`}
                    className="w-7 h-7 text-white hover:text-error bg-surface/80"
                    onClick={() => handleRemove(img.id)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </IconButton>
                </div>
              </div>

              {/* Caption */}
              <div className="p-1.5 bg-surface-elevated truncate">
                <p className="text-2xs font-medium text-text-secondary truncate" title={img.name}>
                  {img.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
