export interface FeatureManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  status: 'stable' | 'beta' | 'placeholder';
}

export const feature: FeatureManifest = {
  id: 'export',
  name: 'Export',
  version: '0.1.0',
  description: 'Mediabunny-based hardware-accelerated MP4 export pipeline and progress modal',
  status: 'placeholder',
};
