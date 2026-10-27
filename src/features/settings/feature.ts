export interface FeatureManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  status: 'stable' | 'beta' | 'placeholder';
}

export const feature: FeatureManifest = {
  id: 'settings',
  name: 'Settings',
  version: '0.1.0',
  description: 'Global storage quota management, persistent storage requests, and theme customization',
  status: 'placeholder',
};
