import { describe, it, expect } from 'vitest';
import { sanitizeExportFilename } from './filenameSanitizer';
import {
  Output,
  Mp4OutputFormat,
  BufferTarget,
  CanvasSource,
  AudioBufferSource,
} from 'mediabunny';
import { registerAacEncoder } from '@mediabunny/aac-encoder';
import { verifyExportedMp4 } from './readbackVerification';
import { ResolvedScene, RenderCache } from '../render/types';
import { renderFrame } from '../render/renderFrame';

class MockCache implements RenderCache {
  getBitmap(): ImageBitmap | null {
    return null;
  }
  hasBitmap(): boolean {
    return false;
  }
  setBitmap(): void {}
}

describe('Filename Sanitizer', () => {
  it('sanitizes illegal filesystem characters and formats date', () => {
    const fixedDate = new Date(2026, 9, 27); // 2026-10-27
    const result = sanitizeExportFilename('My: Cool * Video? <1> / Test\\', fixedDate);
    expect(result).toBe('My Cool  Video 1  Test-2026-10-27.mp4');
  });

  it('falls back to default project name if input consists only of illegal chars', () => {
    const fixedDate = new Date(2026, 0, 5); // 2026-01-05
    const result = sanitizeExportFilename('***:::???///', fixedDate);
    expect(result).toBe('project-2026-01-05.mp4');
  });

  it('handles spaces and trims properly', () => {
    const fixedDate = new Date(2026, 11, 31);
    const result = sanitizeExportFilename('   Clean Name   ', fixedDate);
    expect(result).toBe('Clean Name-2026-12-31.mp4');
  });
});

describe('Mediabunny Muxing & Read-Back Verification', () => {
  const hasBrowserCodecs =
    typeof OffscreenCanvas !== 'undefined' &&
    typeof (globalThis as unknown as { VideoEncoder?: unknown }).VideoEncoder !== 'undefined';

  it.runIf(hasBrowserCodecs)(
    'creates an MP4 and successfully passes read-back verification in browser environment',
    async () => {
      registerAacEncoder();

      const width = 320;
      const height = 180;
      const fps = 30;
      const durationMs = 1000;

      const scene: ResolvedScene = {
        canvas: '16:9',
        width,
        height,
        fps,
        durationMs,
        gain: 1.0,
        muted: false,
        audio: [],
        clips: [
          {
            index: 0,
            clip: {
              id: 'c1',
              assetId: 'a1',
              durationMs: 1000,
              fit: 'cover',
              animation: 'inherit',
              transitionIn: 'inherit',
            },
            startMs: 0,
            endMs: 1000,
            durationMs: 1000,
            resolvedAnimation: { id: 'none', params: {} },
            resolvedTransitionIn: { id: 'cut', durationMs: 0 },
          },
        ],
        assets: new Map(),
      };

      const target = new BufferTarget();
      const output = new Output({
        format: new Mp4OutputFormat(),
        target,
      });

      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d')!;

      const videoSource = new CanvasSource(canvas, {
        codec: 'avc',
        bitrate: 1_000_000,
      });
      output.addVideoTrack(videoSource);

      const audioSource = new AudioBufferSource({
        codec: 'aac',
        bitrate: 96_000,
      });
      output.addAudioTrack(audioSource);

      await output.start();

      const channelData = new Float32Array(48000);
      for (let i = 0; i < 48000; i++) {
        channelData[i] = Math.sin((i / 48000) * 440 * 2 * Math.PI) * 0.2;
      }

      const audioBuffer = {
        numberOfChannels: 2,
        length: 48000,
        sampleRate: 48000,
        duration: 1.0,
        getChannelData: () => channelData,
        copyFromChannel: (dst: Float32Array) => dst.set(channelData),
        copyToChannel: (src: Float32Array) => channelData.set(src),
      } as unknown as AudioBuffer;

      await audioSource.add(audioBuffer);

      const cache = new MockCache();
      const frameCount = 30;
      for (let f = 0; f < frameCount; f++) {
        const tMs = Math.round((f * 1000) / fps);
        renderFrame(ctx, scene, tMs, cache);
        await videoSource.add(f / fps, 1 / fps);
      }

      await output.finalize();

      const buffer = target.buffer;
      expect(buffer).toBeDefined();

      const verification = await verifyExportedMp4(
        buffer!,
        durationMs,
        fps,
        true,
        scene,
        cache
      );

      expect(verification.verified).toBe(true);
      expect(verification.durationMatch).toBe(true);
      expect(verification.videoTrackPresent).toBe(true);
      expect(verification.videoCodec).toBe('avc');
      expect(verification.audioTrackPresent).toBe(true);
      expect(verification.audioCodec).toBe('aac');
      expect(verification.errors).toHaveLength(0);
    }
  );

  it('reports verification failure when buffer is empty or corrupted', async () => {
    const invalidBuffer = new Uint8Array([0x00, 0x01, 0x02, 0x03]).buffer;
    const scene: ResolvedScene = {
      canvas: '16:9',
      width: 1920,
      height: 1080,
      fps: 30,
      durationMs: 3000,
      gain: 1.0,
      muted: false,
      audio: [],
      clips: [],
      assets: new Map(),
    };

    const result = await verifyExportedMp4(
      invalidBuffer,
      3000,
      30,
      true,
      scene,
      new MockCache()
    );

    expect(result.verified).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
