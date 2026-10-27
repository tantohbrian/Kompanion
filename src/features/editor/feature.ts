export interface FeatureManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  status: 'stable' | 'beta' | 'placeholder';
}

export const feature: FeatureManifest = {
  id: 'editor',
  name: 'Editor',
  version: '0.1.0',
  description: 'CapCut-style timeline, inspector panel, and canvas preview editor',
  status: 'placeholder',
};
