# Kompanion: agent rules

Build exactly what docs/PRD.md describes. Nothing more.

## Non-negotiables

1. docs/PRD.md wins. To change it, propose the change and log it in docs/DECISIONS.md.
2. Scope: P0 items and the P1 items the current milestone names. New ideas go to docs/BACKLOG.md.
3. TypeScript strict. No `any`, no `@ts-ignore` without a comment explaining why.
4. Respect import boundaries: core is pure and never imports features, ui or app. Features never import each other.
5. One render path: preview and export both call renderFrame. Never draw anywhere else.
6. Every change to project state is a named command that passes through history. Time is integer milliseconds.
7. Persisted data has schemaVersion, a Zod schema and a migration test.
8. No runtime network calls except the consented model download in M5. No telemetry.
9. No new dependency without a docs/DECISIONS.md entry. Exact versions, lockfile committed, prefer releases 14+ days old, review install scripts.
10. UI uses design tokens only. No hard-coded colors, spacing or font sizes in components.
11. Everything is keyboard-operable and screen-reader labelled. Respect prefers-reduced-motion.
12. Never swallow errors. Expected failures (parse, import) return typed results. Each feature has an error boundary.
13. No React re-render per animation frame. Playback and playhead run through refs or an external store.
14. Small files (aim under 300 lines), small functions, comments explain why not what.
15. Conventional commits, small and frequent, if the folder is a git repo.

## Quality gates (run before saying a task is done)

npm run typecheck, lint, test, test:e2e, build, check:boundaries, check:bundle.
UI changes: run the web-design-guidelines audit, an axe check, and attach screenshots from the running app.
Export changes: read the output MP4 back and verify duration, tracks and codec.
Parser changes: run all fixtures.
If any gate cannot run, say so. Never claim something works that you did not run.

## Testing policy

Unit tests for core (parser, timeline operations, migrations, easing, renderer math). Randomized invariant tests for timeline operations. Playwright e2e for import, edit, undo, export. Bug fixes start with a failing test.

## How to report at the end of each task

What changed, how it was verified (with evidence), what is next, open questions. Short.
