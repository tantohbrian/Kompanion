# Architectural Decision Records (ADRs)

This file records all architectural decisions, deviations or amendments to `docs/PRD.md`, and dependency evaluations for Kompanion.

---

## ADR-0001: Project Rebrand from Cutline to Kompanion

- **Date**: 2026-10-27
- **Status**: Accepted
- **Deciders**: User, Agent

### Context
The project was originally designated "Cutline" in `docs/PRD.md` and `docs/AGENTS.md`. The user requested a formal rebrand of the application to "Kompanion". Under Agent Rule #1 ("docs/PRD.md wins. To change it, propose the change and log it in docs/DECISIONS.md"), any amendment to the product name, core documentation, or skill identifiers must be formally recorded.

### Decision
1. Rebrand the product from **Cutline** to **Kompanion**.
2. Rename project skills:
   - `cutline-architecture` -> `kompanion-architecture`
   - `cutline-ui` -> `kompanion-ui`
3. Update package metadata (`"name": "kompanion"`), HTML title (`<title>Kompanion</title>`), application storage namespaces (e.g., IndexedDB `kompanion-db`), and all references in `docs/PRD.md` and `docs/AGENTS.md`.

### Consequences
- All documentation, skills, codebase namespaces, and upcoming scaffolding align consistently under the "Kompanion" name.
- Project skills live in `.agent/skills/kompanion-architecture` and `.agent/skills/kompanion-ui`.

---

## ADR-0002: Core Technology Stack and Foundation Dependencies

- **Date**: 2026-10-27
- **Status**: Accepted
- **Deciders**: Agent, User

### Context
Per `docs/PRD.md` (Sections 7, 8, 9, 10) and `docs/AGENTS.md` (Rules #3, #4, #6, #7, #9, #10, #13), the project requires client-only libraries for UI, state management, storage, schema validation, icons, testing, and boundary enforcement. Every dependency must be documented with rationale, exact version, license, size, and alternatives considered.

### Decision & Dependency Ledger

| Package | Exact Version | License | Bundle Impact | Rationale | Alternatives Considered |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `react` | `18.3.1` | MIT | ~2.5 KB (core) | Core declarative UI library. React 18.3.1 is stable and proven with Radix headless primitives. | Vanilla DOM (too high maintenance for complex state); Svelte/Vue (violates PRD React spec). |
| `react-dom` | `18.3.1` | MIT | ~40 KB (gzipped) | DOM renderer for React. | Preact (potential subtle incompatibilities with third-party headless components). |
| `react-router-dom` | `6.28.0` | MIT | ~15 KB (gzipped) | Client-side routing for `/`, `/w/:workspaceId`, `/w/:workspaceId/p/:projectId`. | Wouter (minimalist but lacks nested route error boundaries); TanStack Router (overkill for simple SPA). |
| `zustand` | `5.0.1` | MIT | ~1.2 KB (gzipped) | State management with selector-based subscriptions outside React rendering loop (Rule #13). | Redux Toolkit (heavy, boilerplate); Jotai/Recoil (atom model less suited for command history). |
| `zundo` | `2.3.0` | MIT | ~1.5 KB (gzipped) | History (undo/redo) middleware for Zustand with `partialize` to track only timeline (Rule #6). | Custom history stack (hand-rolled undo/redo error-prone with branch tracking). |
| `dexie` | `4.0.10` | Apache-2.0 | ~22 KB (gzipped) | IndexedDB wrapper for project metadata, workspace configuration, and fallback blobs. | Raw IndexedDB API (cumbersome, lack of promise ergonomics); idb (low-level, lacks index querying). |
| `zod` | `3.23.8` | MIT | ~12 KB (gzipped) | Runtime schema validation and data migration assertions (Rule #7). | Yup, Joi (older, weaker TS inference); Valibot (good but Zod is specified in PRD Section 10). |
| `lucide-react` | `0.460.0` | ISC | Tree-shaken (~1 KB/icon) | Clean, Apple-like icons at 16px and 20px with stroke 1.75 (PRD Section 7). | Heroicons, Feather (PRD explicitly specifies Lucide icons). |
| `@radix-ui/react-*` | `1.1.x / 1.2.x` | MIT | Tree-shaken (~3-6 KB per primitive) | Unstyled, accessible primitives (`Dialog`, `Menu`, `Tooltip`, `Tabs`, `Slider`) meeting WCAG 2.2 AA. | Floating UI / custom (accessible keyboard traps and ARIA roles are difficult to build from scratch). |
| `clsx` & `tailwind-merge` | `2.1.1` / `2.5.4` | MIT | ~2 KB combined | Safe merging of conditional Tailwind utility classes without specificity conflicts. | Custom class join (fails on conflicting Tailwind class overrides). |

### Development & CI Tooling
- `vite` (`6.0.1`) & `@vitejs/plugin-react` (`4.3.4`): Modern ESM dev server and production builder.
- `typescript` (`5.6.3`): TypeScript strict mode (no untyped `any`).
- `tailwindcss` (`3.4.15`), `postcss` (`8.4.49`), `autoprefixer` (`10.4.20`): Design-token utility styling.
- `vitest` (`2.1.5`), `@testing-library/react` (`16.0.1`), `jsdom` (`25.0.1`): Unit & integration testing.
- `fake-indexeddb` (`6.0.0`): IndexedDB mock for Node/JSDOM test environment (0 bundle impact, dev only).
- `eslint` (`9.15.0`) & `typescript-eslint` (`8.15.0`): Static analysis.
- `dependency-cruiser` (`16.5.0`): Automated import boundary enforcement (`npm run check:boundaries`).
- `axe-core` (`4.10.2`): Automated accessibility verification.
- `@playwright/test` (`1.49.0`): End-to-end browser automation.

### Consequences
- All packages are strictly pinned (exact versions, no carets or tildes).
- Lockfile (`package-lock.json`) will be committed.
- Initial bundle size remains well within the $\le 250\text{ KB}$ gzipped budget.

---

## ADR-0003: Upgrade dependency-cruiser to 18.7.0 for Node 24 Compatibility

- **Status**: Accepted
- **Date**: 2026-10-27
- **Deciders**: Development Team

### Context
In Node.js v24.14.0, the unofficial `R_OK` re-export from `node:fs` ESM was removed in favor of `fs.constants.R_OK`. Running `dependency-cruiser@16.5.0` caused `SyntaxError: The requested module 'node:fs' does not provide an export named 'R_OK'` during `npm run check:boundaries`.

### Decision
Upgrade `dependency-cruiser` to `18.7.0` (devDependency only). Update `.dependency-cruiser.cjs` to remove the deprecated `enhancedResolveOptions` block while maintaining all three architectural boundary rules (`core-is-pure`, `features-never-import-each-other`, and `ui-is-agnostic`).

### Consequences
- Zero production bundle size impact (devDependency only).
- `npm run check:boundaries` executes cleanly under Node v24+.
- Pinned to exact version `18.7.0`.

---

## ADR-0004: Mediabunny and AAC Encoder for MP4 Export and Post-Export Read-Back

- **Status**: Accepted
- **Date**: 2026-10-27
- **Deciders**: Development Team

### Context
Per `docs/PRD.md` Section 4.6, 6, 9, 10, and `.agent/skills/render-and-export/SKILL.md`, Milestone 4 requires an in-browser MP4 export pipeline using WebCodecs with H.264 video and AAC audio muxing, with post-export read-back verification. `ffmpeg.wasm` is strictly disallowed. When native AAC encoding is not available in the browser runtime, the `@mediabunny/aac-encoder` WebAssembly polyfill must be registered dynamically.

### Decision
1. Add `mediabunny` pinned to exact version `1.62.1` (`MPL-2.0`).
2. Add `@mediabunny/aac-encoder` pinned to exact version `1.62.1` (`MPL-2.0`).
3. Ensure Mediabunny and the export pipeline are isolated in the dedicated Web Worker and dynamic imports so the initial bundle size stays well within the $\le 250\text{ KB}$ gzipped budget.

### Consequences
- Native MP4 muxing and encoding with `Mp4OutputFormat`, `CanvasSource` (H.264), and `AudioBufferSource` (AAC).
- Capability to read back exported MP4 files via Mediabunny's demuxer to verify video/audio tracks and timestamps.
- Zero `ffmpeg.wasm` dependency.


