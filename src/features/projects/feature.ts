export interface FeatureManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  status: 'stable' | 'beta' | 'placeholder';
}

export const feature: FeatureManifest = {
  id: 'projects',
  name: 'Projects',
  version: '0.1.0',
  description: 'Project listing, project card management, and corrupt data recovery',
  status: 'placeholder',
};
