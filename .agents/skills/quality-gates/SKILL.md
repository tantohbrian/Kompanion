---
name: quality-gates
description: Verification quality gates, exit criteria, testing commands, and reporting requirements for Kompanion. Use before declaring any milestone or task complete to run typecheck, lint, tests, build, boundary checks, and audits.
---

# Quality Gates and Exit Verification

Checklists and verification procedures required before declaring any task or milestone complete.

## 1. Automated Verification Commands

Before marking any task done, run the complete suite:

```bash
npm run typecheck         # Zero TypeScript errors (strict mode, no untyped any)
npm run lint              # ESLint with typescript-eslint; zero errors or warnings
npm run test              # Vitest unit & invariant tests
npm run test:e2e          # Playwright end-to-end user flows
npm run build             # Production Vite build (checks bundle output and assets)
npm run check:boundaries  # dependency-cruiser boundary enforcement
npm run check:bundle      # Verify initial JS bundle is under 250 KB gzipped
```

*Rule: If any command cannot run, state why explicitly. Never claim something passes without running it.*

## 2. Gate Criteria by Task Type

- **UI / Frontend Changes**:
  1. Run axe-core accessibility audit: Zero critical or serious issues.
  2. Run `web-design-guidelines` review.
  3. Verify keyboard operation and visible focus outlines.
  4. Capture and attach screenshot evidence of the rendered interface using Playwright or built-in browser.
- **Export Pipeline Changes**:
  1. Trigger an actual MP4 export.
  2. Read the resulting MP4 back with Mediabunny.
  3. Verify video track (H.264), audio track (AAC), and duration equals timeline duration within 1 frame.
  4. Compare rendered frames against `renderFrame` output at three distinct timestamps.
- **Parser Changes**:
  1. Run parser against all script fixtures in `fixtures/scripts/`.
  2. Run synthetic stress cases (overlapping times, missing stamps, unparsed markdown lines).
  3. Ensure parser never throws and returns well-formed diagnostics.
- **Timeline Engine Changes**:
  1. Run randomized property/invariant tests (minimum 50 iterations).
  2. Verify: image track is contiguous, total duration equals sum of clips, undo/redo restores exact state.
  3. Verify drag performance holds 60 fps with 300 clips.

## 3. Performance & Reliability Budgets

- Initial bundle size: <= 250 KB gzipped (export worker and Smart Sync lazy-loaded).
- Timeline interactivity: Under 2 seconds on a mid-range laptop; drag operations hold 60 fps.
- Memory usage: Under 1.5 GB with 100 images loaded.
- A/V drift during playback: Under 40 ms.
- Autosave: Debounced 500 ms to storage, never blocks UI thread.

## 4. End-of-Task Report Format

Every task completion must conclude with a structured report:
1. **What changed**: Bulleted list of modified modules and new capabilities.
2. **How it was verified**: Exact commands executed, test results, and quantitative metrics.
3. **Artifacts & Evidence**: Screenshots, terminal logs, or MP4 read-back details.
4. **Next steps**: Upcoming milestone deliverable or tasks.
5. **Open questions / blockers**: Issues requiring user input (logged in `docs/DECISIONS.md`).
