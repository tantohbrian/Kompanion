export interface FeatureManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  status: 'stable' | 'beta' | 'placeholder';
}

export const feature: FeatureManifest = {
  id: 'workspaces',
  name: 'Workspaces',
  version: '0.1.0',
  description: 'Channel/workspace management and project defaults',
  status: 'placeholder',
};
