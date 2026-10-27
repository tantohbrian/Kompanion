---
name: smart-sync
description: Smart Sync speech-to-text alignment and Whisper integration for Kompanion M5. Use when implementing or debugging in-browser Whisper word timestamping, audio-script alignment, consent flow, or worker pipeline.
---

# Smart Sync (M5 Optional Feature)

Architecture, alignment logic, and researched pitfalls for in-browser Whisper word timestamping and script alignment.

## 1. Feature Overview & Scope

- **Milestone**: M5 only. Optional feature, turned OFF by default.
- **Purpose**: Transcribes voiceover audio locally to obtain word-level timestamps and aligns them with script narration text. This snaps image transitions to spoken phrase boundaries.
- **Workflow**:
  1. User clicks "Smart Sync" in the script review or editor panel.
  2. Consent modal displays model download size (~90 MB) and explains local execution.
  3. Whisper worker transcribes and generates word timestamps.
  4. Dynamic Time Warping (DTW) or sequence alignment matches words to script narration.
  5. UI displays a before/after diff table with confidence indicators.
  6. User accepts or rejects the proposed alignment adjustments.

## 2. Researched Pitfalls & Technical Constraints

These lessons learned prevent broken timestamps and browser crashes:

1. **Word-Level ONNX Model**:
   - Standard Whisper ONNX exports do not reliably output word timestamps in Transformers.js.
   - Use an explicitly timestamped model: `onnx-community/whisper-base_timestamped`.
   - Pass parameter: `{ return_timestamps: 'word' }`.
2. **Chunk Length Constraint**:
   - **Must use**: `chunk_length_s: 29`.
   - A chunk length of 30 seconds triggers edge-case timestamp collapse/corruption in the ONNX runtime.
3. **Transformers.js Version Pinning**:
   - Pin `@huggingface/transformers` to a known-stable 3.x release (e.g. `3.8.1`).
   - Do NOT use v4 preview builds: v4 has been observed collapsing output into a single huge segment.
   - Any dependency upgrade must be gated by regression tests on known audio fixtures.
4. **WASM Fallback over WebGPU**:
   - WebGPU word timestamp kernels have known driver/browser bugs across platforms.
   - Fall back to the WASM backend for reliable, cross-browser word timestamp extraction.
5. **Dedicated Web Worker**:
   - Whisper inference is CPU-intensive. Always run the entire transcription pipeline in a dedicated Web Worker (`src/core/sync/worker.ts`).
   - Post progress messages (`{ type: 'download_progress' | 'transcribe_progress', pct: number }`) to keep UI interactive.
6. **No Narration Fallback**:
   - If the ingested script contains only visual image prompts without spoken narration lines, report this diagnostic immediately to the user and halt alignment gracefully.
