---
name: kompanion-ui
description: UI design system, Apple-pro design tokens, CapCut-style editor layout, component states, and accessibility standards for Kompanion. Use for all UI components, styling, layout, theme tokens, and accessibility reviews. Overrides generic styling.
---

# Kompanion UI Design System

Design tokens, layout specifications, component states, and accessibility guidelines for Kompanion.

## 1. Aesthetic Direction (Apple Pro App)

- **Philosophy**: Calm, dense, precise, and utilitarian. Modeled on Apple pro tools (Final Cut Pro, Logic Pro).
- **CRITICAL OVERRIDE**: This rule explicitly **overrides** the `frontend-design` skill's push toward bold, theatrical, or unexpected aesthetics. Do not use decorative gradients, novelty fonts, oversized hero cards, or whimsical micro-interactions.
- **Copy**: Terse, plain, sentence case. No marketing copy or onboarding tours.

## 2. Design Tokens

- **Theme**: Dark theme is the default; light theme is supported via CSS variables.
  - Backgrounds: Neutral dark grays across 3 elevations (Canvas: `#121214`, Surface: `#18181B`, Elevated: `#27272A`).
  - Accent: System Blue (`#0A84FF` dark, `#007AFF` light).
  - Semantic: Success (`#30D158`), Warning (`#FF9F0A`), Error (`#FF453A`) used sparingly for status only.
- **Typography**:
  - System font stack: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, sans-serif`.
  - Type scale: `11px`, `12px`, `13px`, `15px`, `17px`, `22px`, `28px`.
  - Font weights: `400` (regular), `500` (medium), `600` (semibold).
  - Timecodes: Monospace tabular numbers (`font-variant-numeric: tabular-nums`).
- **Spacing & Radii**:
  - 4pt baseline grid (4, 8, 12, 16, 20, 24, 32px).
  - Radii: `6px` for buttons and inputs, `10px` for panels and cards, `14px` for dialog modals.
  - Borders: 1px hairline borders with subtle contrast (`rgba(255, 255, 255, 0.08)` in dark mode).
  - Shadows: Subtle drop shadows only on floating popovers and modals.
- **Icons**: Lucide icons, 16px (compact controls) and 20px (toolbars), stroke width `1.75`.

## 3. Editor Workspace Layout

```
+--------------------------------------------------------------------------+
| Top Bar: Breadcrumb | Project Name | Undo/Redo | Save Status | [Export] |
+-----------------------+----------------------------------+---------------+
| Left Panel:           | Center Stage:                    | Right Panel:  |
| [Media] [Script] tabs | Canvas Preview Player            | Contextual    |
| - Asset grid / sort   | Transport Controls (Play, Scrub) | Inspector     |
| - Parse review table  | Timecode Display (00:00:00:00)   | (Clip, Trans) |
+-----------------------+----------------------------------+---------------+
| Bottom Panel: Timeline Editor (Collapsible & Resizable)                  |
| [Timeline Toolbar: Zoom +/- | Snap Toggle | Split | Fit]                 |
| Ruler (timecode ticks)                                                   |
| Image Track: Magnetic contiguous clip blocks with thumbnails             |
| Audio Track: Waveform visualization with volume & mute controls          |
+--------------------------------------------------------------------------+
```

## 4. Interaction, Motion & React Rendering Rules

- **Zero React render loop**: Playback and playhead scrub **must never** trigger React re-renders on every animation frame. Playhead position is updated via refs and direct canvas/DOM transforms, or an external Zustand subscriber without broad component re-renders.
- **Motion**: Transitions between 120ms and 220ms, ease-out. No bounce or spring overshoot on panels. Honor `@media (prefers-reduced-motion: reduce)`.
- **States**: Every view must explicitly design 4 states: Empty, Loading (skeleton), Error, and Success.

## 5. Accessibility & Quality Checklist

- **Contrast**: WCAG 2.2 AA compliant contrast across all text and icons.
- **Focus**: Clear, visible focus ring (`outline: 2px solid var(--accent)` with offset).
- **Keyboard navigation**: Entire timeline and transport operable via keyboard (Space play, Left/Right frame step, S split, Delete remove, Cmd+Z undo).
- **ARIA**: Explicit `aria-label`, `role`, and live regions for save states.
- **Post-milestone audit**: Run `web-design-guidelines` and `axe-core` checks after each UI milestone. Axe must report zero serious or critical issues.
