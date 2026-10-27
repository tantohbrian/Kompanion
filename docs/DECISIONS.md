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
