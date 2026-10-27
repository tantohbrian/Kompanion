---
name: kompanion-architecture
description: Architectural conventions, module boundaries, registry patterns, naming rules, and ADR process for Kompanion. Use when adding any file, module, dependency, or registry entry, organizing code under src/, or recording architectural decisions in docs/DECISIONS.md.
---

# Kompanion Architecture

Architectural guidelines, import boundaries, and extensibility patterns for Kompanion.

## 1. Directory Structure

```
src/
├── core/                  # Pure TypeScript, zero React/DOM imports
│   ├── model/             # Domain types, Zod schemas, migrations
│   ├── timeline/          # Pure timeline operations & invariants
│   ├── render/            # renderFrame, resolveTimeline, cache
│   ├── animation/         # Animation registry & implementations
│   ├── transition/        # Transition registry & implementations
│   ├── parser/            # Script parser registry & strategies
│   ├── audio/             # Web Audio decoding, waveform worker
│   ├── export/            # Mediabunny pipeline & export worker
│   ├── storage/           # OPFS & Dexie IndexedDB persistence
│   └── sync/              # Whisper Smart Sync worker (M5)
├── features/              # Feature UI slices (feature.ts manifest + ErrorBoundary)
│   ├── workspaces/        # Channel/workspace CRUD & defaults
│   ├── projects/          # Project list, cards, soft delete
│   ├── ingest/            # Image/audio drag-drop & natural sort
│   ├── script-review/     # Script parsing review table & resolver
│   ├── editor/            # CapCut-style timeline, inspector, transport
│   ├── export/            # Export modal, progress, format settings
│   └── settings/          # Storage quota, theme, clear data
├── ui/                    # Design tokens & design-system primitives
│   └── (Button, IconButton, Slider, Tooltip, Dialog, Menu, Toast, Tabs, Panel)
└── app/                   # Shell, routing, providers, shortcuts, theme
```

## 2. Import Boundaries & Feature Isolation

- **core is pure**: Never import React, DOM nodes, `features/`, `ui/`, or `app/` from `core/`.
- **features are isolated**: Features never import each other; communicate strictly via store slices or typed events. Features import `core/` and `ui/`.
- **ui is agnostic**: `ui/` components do not import `features/` or `app/`.
- **Enforcement**: Run `npm run check:boundaries` (dependency-cruiser) in CI.

## 3. Web Worker Entry Points

- Web Workers live at `src/core/**/worker.ts` (specifically `audio/worker.ts`, `export/worker.ts`, `sync/worker.ts`).
- Every worker is an isolated entry point communicating via strictly typed message contracts (`RequestMessage` / `ResponseMessage`).
- Heavy off-thread computations (waveform peak generation, Mediabunny muxing/encoding, Whisper inference) never block the UI thread.

## 4. Pure Commands & Integer Millisecond Time

- **Integer time rule**: All time values (clip start, duration, offset, playhead) are integer milliseconds (`number`). Never accumulate floating-point seconds.
- **Pure command architecture**: Edit operations are pure functions `(timeline, args) -> timeline` wrapped as named commands passing through history.
- **History scope**: History tracks only the timeline and clip-level settings via `zundo`. Transient UI states (hover, playhead scrub, zoom) are excluded via `partialize`.
- Drags are grouped into a single history entry on mouse-up.

## 5. Naming Rules

- **React Components**: `PascalCase.tsx` (e.g., `ProjectCard.tsx`, `Timeline.tsx`).
- **Core Modules & Utilities**: Consistent per folder (`camelCase.ts` or `kebab-case.ts`).
- **Feature Manifests**: `feature.ts` for each slice in `src/features/*`.
- **Web Workers**: `worker.ts` inside their corresponding core domain folder.
- **Test Files**: `<name>.test.ts` or `<name>.test.tsx` colocated with source.

## 6. Error Handling & Feature Error Boundaries

- **Never swallow errors**: Log unexpected errors with full contextual details.
- **Typed result objects**: Expected failures (script parse errors, file ingest issues, codec unsupport) return typed result objects (`{ ok: true, data } | { ok: false, error }`) instead of throwing unhandled exceptions.
- **Feature boundaries**: Every feature slice in `src/features/` must export an `ErrorBoundary` wrapping its UI to prevent cascading app crashes.

## 7. Registry Pattern & ADR Process

- **Registries**: `registerParser`, `registerAnimation`, `registerTransition`, `registerExportPreset`, `registerInspectorPanel`, `registerShortcut`. Adding a preset requires 1 new file, 1 registration, and 1 test, with no edits elsewhere.
- **ADR Process**: No new dependency without an entry in `docs/DECISIONS.md`: exact pinned version, rationale, gzipped size impact, license, 14+ days maturity, and alternatives considered.
