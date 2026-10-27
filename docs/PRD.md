1. Summary
   Kompanion takes numbered images, a timestamped image-prompt script and voiceover audio, and builds an editable timeline automatically. The creator reviews it in a CapCut-style editor, previews it, and exports an MP4 with or without audio. Final polish (captions, music, effects) stays in CapCut.
   Success criteria
   • A 60-image, 8-minute project goes from upload to exported MP4 in under 10 minutes of the creator's time, mostly review.
   • Placement matches script timestamps to within one frame before any manual edit.
   • Preview plays at project fps with audio drift under 40 ms on a mid-range laptop.
   • Export is frame-accurate: output duration equals timeline duration within one frame.
   • Zero running cost, no account, no server. Files never leave the device.
   Non-goals (do not build): image or voice generation, burned-in captions, music or SFX tracks, text or sticker overlays, filters and effects, video clips as sources, cloud sync, accounts, collaboration, CapCut project export, mobile layout, template marketplace, any feature that needs an API key.
2. Core workflow
   Pick workspace, new project, add audio, add images, paste script, review parse, adjust in editor, export, finish in CapCut.
3. Information architecture
   Workspace = a channel. Project = a video.
   • Home: sidebar lists workspaces. Main area shows the selected workspace's project cards (thumbnail from first image, name, duration, last edited). Every empty state points to the next action.
   • Workspace: name, color, and defaults for new projects: canvas (16:9 default, 9:16), height (1080 default, 720), fps (30 default, 24, 60), animation preset, transition, transition duration. Changing defaults affects only new projects and clips left on inherit.
   • Project: assets, script, timeline, export settings. Belongs to exactly one workspace. Duplicate and move-to-workspace are P1.
   • Deleting a workspace or project asks for confirmation and states what goes. Project delete is soft with a 10 second undo toast, then purged.
   • Routes: /, /w/:workspaceId, /w/:workspaceId/p/:projectId.
4. Functional requirements
   P0 = ships in v1. P1 = named by a milestone. P2 = backlog.
   4.1 Ingest (P0)
   • Drop or pick many images at once (png, jpg, webp). Natural sort (1, 2, 10, not 1, 10, 2). Thumbnail grid with order numbers; drag to reorder, remove, replace.
   • Audio: one or many files (mp3, wav, m4a). Multiple files are joined in natural order. Show total duration.
   • Script: paste text or upload .txt/.md.
   • Every file is copied into app storage on import, not referenced from disk, so projects survive reloads and moved files.
   • Validation panel with a fix action per issue: image count vs segment count, last timestamp vs audio length, unreadable files, duplicate names.
   4.2 Script parser (P0)
   • Strategy registry. Each strategy has canParse(text) returning confidence and parse(text) returning a ParseResult. Highest confidence wins; the user can switch strategy on the review screen.
   • Must handle at least: 0:00-0:05, 00:00 - 00:05, [00:05], (0:05), SRT 00:00:05,000 --> 00:00:09,000, 5s, Image 3 (0:12-0:18), decimal seconds. Separators may be hyphen, en dash, em dash or arrow.
   • Start-only stamps: end = next start, last end = audio end. No stamps: split evenly across the audio and warn.
   • Segment fields: index, start, end, prompt text, narration text if present, confidence, source line numbers.
   • Never throws. Returns diagnostics: unparsed lines, overlaps, out-of-order stamps, gaps.
   • Review screen: editable table (times editable inline) with the mapped image thumbnail beside each row. Accept builds the timeline.
   • Mapping: image N maps to segment N. A mismatch opens a resolver: assign, skip, placeholder, or extend the last clip.
   4.3 Timeline editing (modeled on CapCut)
   • Layout (P0): ruler, image track, audio track directly beneath with waveform.
   • Image track is magnetic: clips are contiguous, no gaps. Start times are derived from durations.
   • Clip operations (P0): select, drag to reorder, trim by dragging an edge (ripples following clips), split at playhead, delete (ripple), duplicate, replace image, set duration numerically. Multi-select and marquee are P1.
   • Playhead (P0): scrub, click ruler, snap to clip edges (toggle), frame step, zoom in/out/fit, scroll, Ctrl+wheel zoom.
   • Audio (P0): waveform, volume, mute. Nudge whole-track offset is P1. No audio cutting in v1.
   • Undo/redo (P0): every user-facing change is undoable, including animation and setting changes. A drag is one history entry. Cap 200 entries. Buttons show disabled state. Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z, Ctrl+Y.
   • Autosave (P0): debounced 500 ms to local storage, visible Saved / Saving / Error indicator, recovers after a crash or tab close.
   • Shortcuts (P0): Space play/pause, Left/Right one frame (Shift = one second), Home/End, S split, Delete, Cmd/Ctrl+D duplicate, plus and minus zoom. Central shortcut registry; help sheet on ? is P1.
   • Inspector (P0): clip duration, animation preset and parameters, transition-in and duration, fit (cover default, contain), replace image, 'apply to all clips'. Project panel: canvas, audio volume.
   4.4 Preview (P0) Canvas player synced to audio, play/pause, seek, current time over total, fullscreen. Audio is the master clock; drop video frames, never audio.
   4.5 Animations and transitions (P0)
   • Registry-based. Presets: None (hard cut), Ken Burns (in, out, alternate; intensity 4 to 10 percent), Pan (direction), Pop (quick scale-in with small overshoot). Transitions: Cut, Crossfade (0.1 to 1.0 s). Dip to black is P1.
   • Defaults per workspace, overrides per clip. 'Alternate' is deterministic from clip index, so re-renders are identical.
   • Every image is cover-cropped with overscan so motion never exposes edges.
   • Transition-in on clip i blends from clip i-1 during the first d ms of clip i. It never changes timing or total length. d is clamped to 50 percent of clip i's duration.
   4.6 Export (P0)
   • MP4, H.264 video, AAC audio. Choices: with audio or visuals only, height, fps. Progress, ETA, cancel.
   • Runs in a Web Worker with OffscreenCanvas. Frame-stepped and deterministic, not real-time.
   • On Chrome, stream to a chosen file via the File System Access API; otherwise buffer in memory with a size warning.
   • Filename {project}-{YYYY-MM-DD}.mp4.
   • After export, read the file back and verify duration within one frame, expected tracks, and codec.
   • WebM fallback when H.264 encoding is unavailable is P2.
   4.7 Smart Sync (M5, optional, off by default) In-browser Whisper word timestamps aligned to the script's narration text, to snap each image change to the actual spoken word. Shows a before/after diff; the user accepts or rejects. Requires explicit consent before downloading the model.
   4.8 Settings (P0, minimal) Storage used, request persistent storage, clear all data (confirmed). Light/dark follows system, dark is the design default.
5. Data model (TypeScript sketch)
   type Id = string; // uuid v7
   // Time is integer milliseconds. Never accumulate floats.
   interface Workspace { id: Id; name: string; color: string; defaults: ProjectDefaults; createdAt: number; updatedAt: number }
   interface ProjectDefaults { canvas: '16:9' | '9:16'; height: 720 | 1080; fps: 24 | 30 | 60; animation: AnimationRef; transition: TransitionRef }
   interface Project { id: Id; workspaceId: Id; schemaVersion: number; name: string; settings: ProjectDefaults; assets: Asset[]; script: { raw: string; parse: ParseResult | null }; timeline: Timeline; updatedAt: number; deletedAt?: number }
   interface Asset { id: Id; kind: 'image' | 'audio'; name: string; storageKey: string; order: number; meta: { bytes: number; width?: number; height?: number; durationMs?: number } }
   interface Timeline { clips: Clip[]; audio: AudioClip[]; gain: number; muted: boolean }
   interface Clip { id: Id; assetId: Id; durationMs: number; fit: 'cover' | 'contain'; animation: AnimationRef | 'inherit'; transitionIn: TransitionRef | 'inherit'; sourceSegment?: number }
   interface AudioClip { id: Id; assetId: Id; offsetMs: number }
   type AnimationRef = { id: string; params: Record<string, number | string> }
   type TransitionRef = { id: string; durationMs: number }
   Start of clip i = sum of durations before i. Total length = max(sum of clip durations, audio end); the validation panel flags a mismatch and offers 'extend last clip to audio end'. Every persisted object has schemaVersion, a Zod schema, and a tested migration.
6. Rendering and export architecture
   • resolveTimeline(project) -> ResolvedScene is a pure function that computes start times and resolves inherit values.
   • renderFrame(ctx, scene, tMs, cache) is the only code that draws. Preview and export both call it. No React, no DOM access beyond the passed canvas context. This is what guarantees that what you preview is what you export.
   • Image cache: ImageBitmap LRU keyed by asset and resolution, prefetching about 5 clips ahead and behind. Preview uses downscaled proxies (about 1280 px wide); export decodes full resolution.
   • Audio: decode with Web Audio, compute waveform peaks in a worker and cache them. Export mixes the timeline with OfflineAudioContext.
   • Export: Mediabunny Output with Mp4OutputFormat, a CanvasSource for video and an AudioBufferSource for audio. Check canEncodeVideo and canEncodeAudio first. If AAC is unavailable, register @mediabunny/aac-encoder. No ffmpeg.wasm.
   • Preview playback loop runs outside React. The playhead lives in an external store that components subscribe to by selector; React never re-renders per frame.
7. UI and UX specification
   Goal: feels like a native Apple pro app. Calm, dense, no decoration.
   • Theme: dark default, light supported, both defined as tokens. Neutral grays in three elevations. One accent, system blue (#0A84FF dark, #007AFF light). Success, warning and error colors used sparingly. Image clips are neutral with a thumbnail; audio uses an accent-tinted waveform.
   • Type: -apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, sans-serif. Scale 11/12/13/15/17/22/28, weights 400/500/600. Tabular numerals for timecodes.
   • Shape and space: 4 pt grid. Radius 6 for controls, 10 for panels, 14 for modals. Hairline 1 px borders at low contrast. Shadows only on floating elements. Blur only on popovers and toolbars.
   • Icons: Lucide, 16 and 20 px, stroke 1.75.
   • Motion: 120 to 220 ms, ease-out, no bounce. Honor prefers-reduced-motion.
   • Editor layout: top bar (breadcrumb, undo, redo, save status, primary Export button). Left panel tabs: Media, Script. Center: preview with transport and timecode. Right: contextual inspector. Bottom: resizable timeline with toolbar (zoom, snap), ruler, image track, audio track. Panels resizable and collapsible.
   • States: every view has designed empty, loading (skeleton), error and success states. Destructive actions confirm or offer undo.
   • Copy: short, plain, sentence case. No onboarding tours, marketing blocks, gradients or illustrations beyond a subtle empty-state glyph.
   • Accessibility: WCAG 2.2 AA contrast, visible focus rings, full keyboard operation including the timeline (arrow keys to select, Alt+arrows to move), proper ARIA roles and labels, axe reporting zero serious or critical issues.
8. Non-functional requirements
   • Performance budgets: initial JS 250 KB gzipped or less (export and Smart Sync are lazy chunks). Interactive in under 2 s on a mid-range laptop. Timeline drag stays at 60 fps with 300 clips. Preview holds project fps at 1080p. Memory under 1.5 GB with 100 images loaded. Export of an 8-minute 1080p30 video: measure and report, target 1.5x real time or better with hardware encoding. Autosave never blocks the UI.
   • Reliability: Zod validation on load, migrations with tests, an error boundary per feature, a corrupt project never crashes the app (offer to export its raw JSON). Handle storage quota errors with a clear message. Request persistent storage. All long operations are cancellable. No unhandled promise rejections.
   • Privacy and security: no analytics or telemetry. No runtime network calls except the optional, consented model download in M5. Strict CSP. No eval. Sanitize filenames.
   • Dependencies: exact-pinned versions, committed lockfile, prefer releases at least 14 days old, audit every package before adding, and review any install scripts. Record each in docs/DECISIONS.md.
   • Browsers: latest Chrome and Edge are primary and tested. Safari and Firefox are best effort. Feature-detect VideoEncoder, OffscreenCanvas and OPFS at startup; if something essential is missing, show a clear compatibility screen instead of failing.
9. Architecture and modularity
   src/
   core/ pure TypeScript, no React
   model/ timeline/ render/ animation/ transition/ parser/ audio/ export/ storage/ sync/
   features/ React UI, one folder per feature, each with a feature.ts manifest
   workspaces/ projects/ ingest/ script-review/ editor/ export/ settings/
   app/ shell, routing, providers, shortcut registry, theme
   ui/ design-system primitives (Button, IconButton, Slider, Tooltip, Dialog, Menu, Toast, Tabs, Panel)
   • core never imports from features, ui or app. Features import core and ui but never each other; they communicate through store slices or typed events. Enforce with dependency-cruiser in CI.
   • Extension points, each a registry: registerParser, registerAnimation, registerTransition, registerExportPreset, registerInspectorPanel, registerShortcut. Adding a new animation is one file, one registration and one test, with no edits elsewhere.
   • Edit operations are pure functions (timeline, args) -> timeline wrapped as named commands. History tracks only the timeline and clip-level settings, not transient UI state.
   • Workers are entry points at core/\*\*/worker.ts with typed message contracts.
10. Stack ($0)
    Vite, React, TypeScript (strict), Tailwind CSS, Radix UI primitives, Lucide, React Router, Zustand with zundo for undo/redo (use partialize to track only the timeline, and pause tracking during drags), Dexie for IndexedDB metadata, OPFS for media files (IndexedDB blob fallback), Zod, Mediabunny for muxing and encoding, Vitest, Playwright, axe-core, ESLint with typescript-eslint, Prettier, dependency-cruiser, GitHub Actions CI. Static hosting on Cloudflare Pages or Vercel free tier. M5 only: @huggingface/transformers.
11. Milestones and exit gates
    M0 Foundation. Scaffold, tooling, CI, design tokens and ui primitives, shell and routing, storage layer, schema and migrations, compatibility screen, skills installed and authored, docs/DECISIONS.md. Gate: CI green (typecheck, lint, unit, build, boundary check), axe smoke test passes.
    M1 Workspaces and projects. CRUD, workspace defaults, project cards, soft delete with undo toast. Gate: e2e creates a workspace and project, reloads, and finds both; deleting then undoing restores.
    M2 Ingest and parse. Import images and audio, natural sort, waveform, parser with fixtures, review table, validation panel. Gate: parser tests pass on every file in fixtures/scripts/ plus synthetic messy cases; e2e imports 60 images and a long audio file; mismatch resolver works.
    M3 Editor and preview. resolveTimeline, renderFrame, timeline UI and all P0 operations, undo/redo, autosave, inspector basics, shortcuts. Gate: randomized tests prove timeline invariants (no gaps, total equals sum, undo then redo returns identical state); 300-clip drag holds 60 fps; measured A/V drift under 40 ms.
    M4 Export and animations. Mediabunny export, presets, transitions, workspace defaults and per-clip overrides. Gate: exported MP4 read back with Mediabunny (duration within one frame, H.264 and AAC present); frames pulled from the MP4 match renderFrame output at three timestamps; modularity proof: add a slide transition touching only core/transition in under 40 lines.
    M5 Smart Sync (optional). Whisper worker, alignment, review diff, consent flow. Gate: on a fixture with known ground truth, boundary error drops versus raw timestamps; automatic fallback to WASM and to unsynced timing; if the user's scripts include no narration text, report that and stop.
    M6 Hardening. Performance pass against every budget, accessibility audit, error injection (quota full, corrupt file, killed tab mid-export), cross-browser smoke, README, ARCHITECTURE.md, short user guide, deploy to free hosting. Gate: every budget in section 8 measured and reported in docs/QUALITY_REPORT.md.
12. Project skills to author (with the skill-creator skill)
    Each lives in .agent/skills/<name>/SKILL.md with name and a trigger-focused description. Keep each under about 150 lines, link out to detail files rather than bloating.
13. kompanion-architecture. Use when adding any file, module, dependency or registry entry. Contains the folder map, import boundaries, registry pattern, ADR process for docs/DECISIONS.md, naming rules.
14. timeline-engine. Use when touching timeline, clips, history or undo. Contains integer-millisecond rule, magnetic-track and ripple semantics, pure-operation pattern, history grouping for drags, invariants and how to test them.
15. script-parser. Use when touching parsing or fixtures. Contains the strategy interface, supported formats, diagnostics, never-throw rule, how to add a fixture and a strategy, confidence scoring.
16. render-and-export. Use when touching rendering, audio or export. Contains the single-renderFrame rule, determinism, cache and proxy rules, the Mediabunny pipeline, codec checks and AAC polyfill, read-back verification, worker contracts.
17. kompanion-ui. Use for any UI work. Contains the section 7 tokens, layout, states, motion and accessibility checklist. Explicitly overrides the frontend-design skill's push toward bold, unexpected aesthetics: this product is restrained and Apple-clean. After each UI milestone, run the web-design-guidelines audit and fix findings.
18. quality-gates. Use before declaring any task done. Contains the commands, required evidence and checklist from AGENTS.md.
19. smart-sync (M5 only). Contains these researched pitfalls: word timestamps need an \_timestamped ONNX export such as onnx-community/whisper-base_timestamped with return_timestamps: 'word'; use chunk_length_s 29, because 30 has produced broken timestamps; pin a known-good 3.x release (3.8.1 was reported working) because v4 preview builds were reported to collapse output into one segment, and re-test before any upgrade; WebGPU word timestamps have had bugs, so fall back to WASM; always run in a Worker; the base model is about 90 MB, downloaded once and cached.
