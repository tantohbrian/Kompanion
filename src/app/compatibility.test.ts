import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkBrowserCompatibility } from './compatibility';

describe('Browser Compatibility Checker', () => {
  const originalVideoEncoder = (window as unknown as { VideoEncoder?: unknown }).VideoEncoder;
  const originalOffscreenCanvas = (window as unknown as { OffscreenCanvas?: unknown }).OffscreenCanvas;
  const originalAudioContext = (window as unknown as { AudioContext?: unknown }).AudioContext;
  const originalStorage = navigator.storage;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // Restore window / navigator globals
    if (originalVideoEncoder !== undefined) {
      (window as unknown as { VideoEncoder: unknown }).VideoEncoder = originalVideoEncoder;
    } else {
      delete (window as unknown as { VideoEncoder?: unknown }).VideoEncoder;
    }

    if (originalOffscreenCanvas !== undefined) {
      (window as unknown as { OffscreenCanvas: unknown }).OffscreenCanvas = originalOffscreenCanvas;
    } else {
      delete (window as unknown as { OffscreenCanvas?: unknown }).OffscreenCanvas;
    }

    if (originalAudioContext !== undefined) {
      (window as unknown as { AudioContext: unknown }).AudioContext = originalAudioContext;
    } else {
      delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    }

    Object.defineProperty(navigator, 'storage', {
      value: originalStorage,
      configurable: true,
      writable: true,
    });
  });

  it('reports compatible when VideoEncoder, OffscreenCanvas, and WebAudio are present', () => {
    (window as unknown as { VideoEncoder: unknown }).VideoEncoder = class MockVideoEncoder {};
    (window as unknown as { OffscreenCanvas: unknown }).OffscreenCanvas = class MockOffscreenCanvas {};
    (window as unknown as { AudioContext: unknown }).AudioContext = class MockAudioContext {};
    Object.defineProperty(navigator, 'storage', {
      value: { getDirectory: vi.fn() },
      configurable: true,
      writable: true,
    });

    const report = checkBrowserCompatibility();
    expect(report.isCompatible).toBe(true);
    expect(report.videoEncoder).toBe(true);
    expect(report.offscreenCanvas).toBe(true);
    expect(report.opfs).toBe(true);
    expect(report.webAudio).toBe(true);
    expect(report.missingFeatures).toHaveLength(0);
  });

  it('detects missing VideoEncoder and flags compatibility failure', () => {
    delete (window as unknown as { VideoEncoder?: unknown }).VideoEncoder;
    (window as unknown as { OffscreenCanvas: unknown }).OffscreenCanvas = class MockOffscreenCanvas {};
    (window as unknown as { AudioContext: unknown }).AudioContext = class MockAudioContext {};

    const report = checkBrowserCompatibility();
    expect(report.isCompatible).toBe(false);
    expect(report.videoEncoder).toBe(false);
    expect(report.missingFeatures.some((f) => f.includes('VideoEncoder'))).toBe(true);
  });

  it('detects missing OffscreenCanvas and flags compatibility failure', () => {
    (window as unknown as { VideoEncoder: unknown }).VideoEncoder = class MockVideoEncoder {};
    delete (window as unknown as { OffscreenCanvas?: unknown }).OffscreenCanvas;
    (window as unknown as { AudioContext: unknown }).AudioContext = class MockAudioContext {};

    const report = checkBrowserCompatibility();
    expect(report.isCompatible).toBe(false);
    expect(report.offscreenCanvas).toBe(false);
    expect(report.missingFeatures.some((f) => f.includes('OffscreenCanvas'))).toBe(true);
  });

  it('detects missing OPFS without failing hard compatibility (falls back to IndexedDB)', () => {
    (window as unknown as { VideoEncoder: unknown }).VideoEncoder = class MockVideoEncoder {};
    (window as unknown as { OffscreenCanvas: unknown }).OffscreenCanvas = class MockOffscreenCanvas {};
    (window as unknown as { AudioContext: unknown }).AudioContext = class MockAudioContext {};
    Object.defineProperty(navigator, 'storage', {
      value: {},
      configurable: true,
      writable: true,
    });

    const report = checkBrowserCompatibility();
    expect(report.isCompatible).toBe(true);
    expect(report.opfs).toBe(false);
  });
});
