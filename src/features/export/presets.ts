export interface ExportPreset {
  id: string;
  name: string;
  description: string;
  height: number;
  fps: number;
  bitrate: number;
  isDefault?: boolean;
}

const presets: ExportPreset[] = [];

export function registerExportPreset(preset: ExportPreset): void {
  const existing = presets.findIndex((p) => p.id === preset.id);
  if (existing >= 0) {
    presets[existing] = preset;
  } else {
    presets.push(preset);
  }
}

export function getExportPresets(): ExportPreset[] {
  return [...presets];
}

// Built-in presets
registerExportPreset({
  id: '1080p30',
  name: '1080p Full HD (30 fps)',
  description: 'Standard YouTube upload quality (Recommended)',
  height: 1080,
  fps: 30,
  bitrate: 8_000_000,
  isDefault: true,
});

registerExportPreset({
  id: '1080p60',
  name: '1080p Full HD (60 fps)',
  description: 'Smooth 60 fps for fast motion',
  height: 1080,
  fps: 60,
  bitrate: 12_000_000,
});

registerExportPreset({
  id: '720p30',
  name: '720p HD (30 fps)',
  description: 'Fast rendering for quick previews and drafts',
  height: 720,
  fps: 30,
  bitrate: 4_500_000,
});
