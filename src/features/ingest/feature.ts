export interface FeatureManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  status: 'stable' | 'beta' | 'placeholder';
}

export const feature: FeatureManifest = {
  id: 'ingest',
  name: 'Asset Ingest',
  version: '0.1.0',
  description: 'Image and audio drag-and-drop ingestion with natural sorting',
  status: 'placeholder',
};
