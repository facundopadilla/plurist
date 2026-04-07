# Proposal: Collaborative UI Studio

## Intent

Plurist already supports HTML-native generation, workspace-scoped BYOK, provider/model selection, and content workflows. What it does not yet provide is the product shape that would clearly differentiate it from Google Stitch, Banani, v0, Pencil, and Penpot-style collaboration. This change reframes Plurist as a collaborative UI studio: easy-first generation for non-designers, live multiplayer collaboration for design/dev teams, provider-neutral AI orchestration, and developer-grade handoff from the same canvas.

## Scope

### In Scope

- Guided generation flows that reduce prompt friction for first-time users
- Real-time collaboration on the canvas with presence, live cursors, and comment threads
- Shared designer/developer handoff surfaces (inspectable structure, tokens, metadata, export)
- Provider-neutral model routing that makes BYOK and model choice visible at project/session level
- Brand-aware generation constraints so output stays consistent across iterations
- Incremental delivery through phased epics with each phase independently reviewable

### Out of Scope

- Replacing the existing canvas engine
- Building a full Figma/Penpot clone with arbitrary vector tooling
- Adding net-new publish adapters or analytics surfaces as part of this change
- Training proprietary foundation models
- Automatic conversion of arbitrary external design files into production-ready component systems

## Approach

This change should ship as five sequential-but-overlapping epics:

**Phase 1 — Realtime Collaboration**
Add multiplayer primitives to the existing canvas: presence, live cursors, active slide awareness, role-aware edit access, and comment threads. The goal is to make Plurist a shared workspace instead of a single-player generation tool.

**Phase 2 — Canvas-to-Dev Handoff**
Introduce a dev-facing inspection layer on top of the active canvas content so developers can inspect HTML structure, tokens, prompt/provider metadata, and export clean artifacts without leaving the workspace.

**Phase 3 — Guided UI Generation**
Add a Stitch-style onboarding path with structured prompts, starter templates, and simple/advanced generation modes so the product remains approachable for non-designers.

**Phase 4 — Provider Marketplace & Model Routing**
Promote the existing BYOK/multi-provider system into a visible product capability: compare providers, choose models per task/session, support custom OpenAI-compatible endpoints, and expose local-model flows prominently.

**Phase 5 — Brand-Aware Generation**
Add reusable design constraints and workspace memory so generated output is consistent with each team's brand, preferred layout patterns, and approved component rules.

## Affected Areas

| Area                                               | Impact   | Description                                                       |
| -------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| `frontend/src/features/canvas/`                    | Modified | Collaboration UX, presence, comments, guided generation, dev mode |
| `frontend/src/features/settings/ai-providers/`     | Modified | Provider marketplace, model routing, workspace defaults           |
| `frontend/src/features/generation/`                | Modified | Guided generation workflows and richer generation contracts       |
| `frontend/src/features/templates/`                 | New      | Starter gallery and reusable template entry points                |
| `backend/apps/workspace/`                          | Modified | Workspace preferences, collaboration session state, brand memory  |
| `backend/apps/generation/`                         | Modified | Provider routing, benchmarking metadata, brand-aware context      |
| `backend/apps/projects/`                           | Modified | Project-level collaboration and model defaults                    |
| `backend/apps/comments/` or equivalent new module  | New      | Comment threads, mentions, resolution state                       |
| Realtime transport layer (`ws` / sync integration) | New      | Presence, live updates, collaboration events                      |

## Risks

| Risk                                                           | Likelihood | Mitigation                                                                 |
| -------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| Collaboration adds major infra complexity before UX is proven  | Med        | Deliver presence/comments before full concurrent editing breadth           |
| Provider-neutral UX becomes too technical for first-time users | High       | Keep guided mode opinionated; hide advanced routing behind progressive UI  |
| “Plurist” branding still signals only social media tooling     | Med        | Treat positioning and messaging updates as a parallel product workstream   |
| Dev handoff exports become noisy/untrusted                     | Med        | Define clean export contracts and test against representative slide output |
| Brand-aware generation becomes brittle or overly restrictive   | Med        | Start with opt-in constraints and explainable rule application             |

## Rollback Plan

- **Phase 1**: Disable collaboration transport and fall back to single-editor sessions.
- **Phase 2**: Hide dev mode routes/panels while preserving current export behavior.
- **Phase 3**: Disable guided onboarding and fall back to existing prompt entry.
- **Phase 4**: Revert marketplace UI while preserving current BYOK/settings API.
- **Phase 5**: Disable brand-aware enrichment and return to current generation context.

Each phase must be deployable and reversible independently.

## Dependencies

- Existing canvas generation and provider infrastructure
- A realtime synchronization strategy compatible with current canvas state management
- Role-aware workspace/project permissions
- Persisted project/workspace metadata for defaults, comments, and brand constraints

## Success Criteria

- [ ] First-time users can generate a usable UI artifact through a guided flow without knowing prompt syntax
- [ ] Two or more users can collaborate on the same project with visible presence and synchronized edits/comments
- [ ] Developers can inspect/export the active artifact with structure, tokens, and prompt/provider metadata from the canvas
- [ ] Workspace/project owners can choose provider/model defaults without losing BYOK flexibility
- [ ] Generated output can reuse workspace brand constraints so repeated generations are more consistent than one-shot prompts
- [ ] Plurist can be positioned as a collaborative, model-agnostic UI studio rather than just another AI UI generator
