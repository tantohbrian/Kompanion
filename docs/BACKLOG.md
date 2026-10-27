# Kompanion Feature Backlog

This backlog records non-goals, P2 features, and future ideas deferred from the current scope per `docs/PRD.md` and `docs/AGENTS.md`.

---

## Explicit Non-Goals (Do Not Build)
- Image or voice generation (use pre-generated assets)
- Burned-in captions
- Music or sound effects (SFX) multi-track mixer
- Text, sticker, or emoji overlays
- Complex visual filters and video effects
- Video clips as source media (image + audio only)
- Cloud sync, user accounts, and authentication
- Multi-user collaboration
- CapCut project archive (`.capcut`) exporter
- Mobile / tablet responsive layout (desktop pro tool)
- Template marketplace
- Features requiring third-party API keys or remote servers

---

## P2 Deferred Features
- **WebM Fallback**: Fallback encoding pipeline when H.264 WebCodecs hardware encoding is unavailable on legacy platforms.
- **Dip to Black custom durations**: Extended transition customization beyond fixed duration presets.
- **CapCut XML Interchange**: Exporting FCPXML / Premiere XML for round-tripping into CapCut Desktop.
- **Audio Slip & Ripple Trimming**: Advanced multi-point audio cutting (v1 only supports volume, mute, and offset nudging).
- **Multi-Track Audio Overlays**: Layering background audio underneath voiceover.
