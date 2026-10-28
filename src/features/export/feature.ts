export interface FeatureManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  status: 'stable' | 'beta' | 'placeholder';
}

export const feature: FeatureManifest = {
  id: 'export',
  name: 'Export & Mediabunny Pipeline',
  version: '0.1.0',
  description:
    'Frame-accurate Mediabunny MP4 export in a Web Worker, resolution/fps presets, offline audio mixing, and post-export read-back verification.',
  status: 'stable',
};
