---
name: render-and-export
description: Single-path canvas rendering, image caching, audio mixing, and Mediabunny MP4 export pipeline for Kompanion. Use when working on renderFrame, animations, transitions, canvas preview, audio synthesis, export worker, or MP4 verification.
---

# Render and Export Pipeline

Specifications for Kompanion's rendering engine, image caching, audio decoding, and Mediabunny export.

## 1. The Single Render Path Rule

- **Non-negotiable**: `renderFrame(ctx, scene, tMs, cache)` is the **ONLY** code that draws canvas frames in Kompanion.
- Both the interactive canvas preview and the headless export worker call `renderFrame`.
- `renderFrame` is a pure canvas function: zero React dependencies, zero DOM access beyond the passed `CanvasRenderingContext2D` or `OffscreenCanvasRenderingContext2D`.
- Guaranteed outcome: What you see in the preview player is pixel-for-pixel identical to what is exported.

## 2. Timeline Resolution & Determinism

- `resolveTimeline(project) -> ResolvedScene`: A pure function that calculates absolute clip start/end times and resolves `'inherit'` properties from project or workspace defaults.
- **Determinism**: Any time `tMs` maps to exactly one visual frame. Alternating Ken Burns motion is seeded deterministically from clip index (`index % 2 === 0 ? 'in' : 'out'`).
- **Overscan**: All images are drawn with cover-crop and overscan to ensure pan and zoom motion never reveals canvas background edges.
- **Transitions**: Transition-in on clip `i` blends from clip `i-1` during the first `d` ms of clip `i`. It never shifts clip start times or project duration. `d` is clamped to 50% of clip `i`'s duration.

## 3. Image Bitmap Cache & Downscaled Proxies

- `ImageCache`: LRU cache storing decoded `ImageBitmap` instances keyed by `[assetId, resolution]`.
- **Preview mode**: Decodes downscaled proxies (~1280px wide) to sustain 60 fps playback and keep memory under 1.5 GB with 100+ images.
- **Export mode**: Decodes full-resolution source assets.
- **Prefetching**: During playback, prefetch and decode bitmaps 5 clips ahead and behind the current playhead.

## 4. Audio Pipeline & Master Clock

- Decode audio with Web Audio API (`AudioContext.decodeAudioData`).
- Waveform peaks are computed off-thread in a dedicated Web Worker and cached.
- **Preview synchronization**: Audio playback is the master clock. If CPU/GPU lags, drop visual frames to maintain audio sync. Drift must remain under 40 ms.
- **Export mixing**: `OfflineAudioContext` renders the complete mixed audio track deterministically.

## 5. Export Architecture & Mediabunny Pipeline

- Runs in a dedicated Web Worker using `OffscreenCanvas`. Frame-stepped, independent of real-time clock.
- **Pipeline**:
  1. Feature check: test `VideoEncoder`, `OffscreenCanvas`, and OPFS.
  2. Setup Mediabunny `Output` with `Mp4OutputFormat`.
  3. Video source: `CanvasSource` (H.264).
  4. Audio source: `AudioBufferSource` (AAC).
  5. Check `canEncodeAudio()`. If native AAC encoding is unsupported, register `@mediabunny/aac-encoder`.
  6. File streaming: Use File System Access API on Chrome; buffer in memory with size warnings elsewhere.
- **Read-back verification**: Read back the exported MP4 using Mediabunny. Verify:
  - Duration matches timeline duration within 1 frame.
  - Video track exists (codec `avc1` / H.264).
  - Audio track exists (codec `mp4a` / AAC) if audio was included.
  - Pull sample frames at 3 timestamps and compare against `renderFrame`.
