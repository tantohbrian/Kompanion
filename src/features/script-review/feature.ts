export interface FeatureManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  status: 'stable' | 'beta' | 'placeholder';
}

export const feature: FeatureManifest = {
  id: 'script-review',
  name: 'Script Review',
  version: '0.1.0',
  description: 'Script ingestion review table, timestamp diagnostics, and asset resolution',
  status: 'placeholder',
};
