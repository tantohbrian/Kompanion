import { Project } from '../model/types';
import { SerializedAudio } from './types';

/**
 * Mixes project audio clips into a single offline-rendered AudioBuffer respecting track gain and mute.
 */
export async function mixProjectAudio(
  project: Project,
  totalDurationMs: number,
  audioBuffers: Map<string, AudioBuffer>
): Promise<SerializedAudio | null> {
  const { audio, gain, muted } = project.timeline;
  if (muted || gain <= 0 || audio.length === 0) {
    return null;
  }

  const sampleRate = 48000;
  const totalLength = Math.max(1, Math.ceil((totalDurationMs / 1000) * sampleRate));

  // Check for OfflineAudioContext (browser vs node)
  const OfflineContextClass =
    typeof OfflineAudioContext !== 'undefined'
      ? OfflineAudioContext
      : (globalThis as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
          .webkitOfflineAudioContext;

  if (!OfflineContextClass) {
    return null;
  }

  const offlineCtx = new OfflineContextClass(2, totalLength, sampleRate);

  for (const clip of audio) {
    const buffer = audioBuffers.get(clip.assetId);
    if (!buffer) continue;

    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;

    const gainNode = offlineCtx.createGain();
    gainNode.gain.value = gain;

    source.connect(gainNode);
    gainNode.connect(offlineCtx.destination);

    const startSec = Math.max(0, (clip.offsetMs || 0) / 1000);
    const asset = project.assets.find((a) => a.id === clip.assetId);
    const durationSec = asset?.meta.durationMs ? asset.meta.durationMs / 1000 : buffer.duration;

    source.start(startSec, 0, durationSec);
  }

  const renderedBuffer = await offlineCtx.startRendering();

  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < renderedBuffer.numberOfChannels; ch++) {
    channelData.push(new Float32Array(renderedBuffer.getChannelData(ch)));
  }

  return {
    sampleRate: renderedBuffer.sampleRate,
    numberOfChannels: renderedBuffer.numberOfChannels,
    channelData,
  };
}
