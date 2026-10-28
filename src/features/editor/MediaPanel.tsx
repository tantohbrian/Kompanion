import React from 'react';
import { Image as ImageIcon, Music } from 'lucide-react';
import { useTimelineStore } from '../../core/timeline';
import { Asset } from '../../core/model/types';
import { useAssetThumbnailUrl } from './useAssetThumbnailUrl';

const MediaImageCard: React.FC<{
  asset: Asset;
  isSelectedClip: boolean;
  onClick: () => void;
}> = ({ asset, isSelectedClip, onClick }) => {
  const thumbUrl = useAssetThumbnailUrl(asset);

  return (
    <div
      onClick={onClick}
      className="group relative bg-surface-elevated/40 hover:bg-surface-elevated border border-border-subtle hover:border-accent rounded-control p-2 cursor-pointer transition-colors flex flex-col gap-1.5"
      title={isSelectedClip ? 'Click to replace selected clip image' : asset.name}
    >
      <div className="aspect-video bg-black rounded flex items-center justify-center text-text-tertiary font-mono text-[10px] overflow-hidden relative">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={asset.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="truncate px-1">{asset.name.slice(0, 10)}</span>
        )}
      </div>
      <span className="truncate text-text-primary text-[11px] font-medium">
        {asset.name}
      </span>
    </div>
  );
};

export const MediaPanel: React.FC = () => {
  const project = useTimelineStore((s) => s.project);
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);
  const replaceAsset = useTimelineStore((s) => s.replaceAsset);

  if (!project) return null;

  const assets = project.assets;
  const imageAssets = assets.filter((a) => a.kind === 'image');
  const audioAssets = assets.filter((a) => a.kind === 'audio');

  const handleAssetClick = (assetId: string) => {
    if (selectedClipId) {
      replaceAsset(selectedClipId, assetId);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 text-xs select-none">
      {/* Images Section */}
      <div>
        <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle mb-2">
          <span className="font-semibold text-text-secondary uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-accent" />
            Images ({imageAssets.length})
          </span>
        </div>
        {imageAssets.length === 0 ? (
          <div className="p-4 text-center text-text-tertiary border border-dashed border-border-subtle rounded-control">
            No image assets ingested
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {imageAssets.map((asset) => (
              <MediaImageCard
                key={asset.id}
                asset={asset}
                isSelectedClip={Boolean(selectedClipId)}
                onClick={() => handleAssetClick(asset.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Audio Section */}
      <div>
        <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle mb-2">
          <span className="font-semibold text-text-secondary uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-accent" />
            Audio ({audioAssets.length})
          </span>
        </div>
        {audioAssets.length === 0 ? (
          <div className="p-3 text-center text-text-tertiary border border-dashed border-border-subtle rounded-control">
            No audio tracks
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {audioAssets.map((audio) => (
              <div
                key={audio.id}
                className="bg-surface-elevated/40 border border-border-subtle rounded-control p-2 flex items-center gap-2"
              >
                <Music className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="truncate text-text-primary font-medium">{audio.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
