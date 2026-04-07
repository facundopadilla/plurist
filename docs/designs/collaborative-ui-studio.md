# Design: Collaborative UI Studio

## Technical Approach

Build on Socialclaw's existing HTML-native canvas and workspace-scoped AI provider infrastructure rather than replacing them. The change adds a collaboration layer, a dual-surface UX (design mode + dev mode), structured generation inputs, and reusable brand context. The design goal is to keep one canonical project state that powers generation, collaboration, inspection, and export.

## Architecture Decisions

| Decision            | Choice                                                                             | Alternatives                                          | Rationale                                                                                |
| ------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Collaboration model | Add realtime sync/presence on top of the current project/canvas state              | Keep polling or single-user state only                | True differentiation against Penpot/Figma-style workflows requires shared live state     |
| UX entry strategy   | Guided mode + advanced mode                                                        | Single prompt box only; fully wizard-driven flow only | Balances Stitch-like accessibility with power-user depth                                 |
| Handoff surface     | Keep design and dev views on the same artifact/state                               | Separate export-only handoff portal                   | Prevents drift between what design sees and what dev receives                            |
| Provider neutrality | Use current BYOK stack as the foundation and add visible routing defaults/metadata | Hide provider/model selection behind backend defaults | The differentiation is strategic only if users can see and trust the model-routing layer |
| Brand memory        | Persist explicit, inspectable constraints and tokens                               | Opaque AI memory only                                 | Teams need predictable, explainable consistency rather than magic state                  |

## System Model

### Core Concepts

- **Workspace defaults**: provider/model defaults, brand rules, reusable templates
- **Project session**: active collaborators, active artifact, active provider/model overrides
- **Artifact revision**: HTML-native output with provenance metadata and approval/export status
- **Comment thread**: anchored discussion attached to an artifact or selection
- **Guided generation brief**: structured user intent transformed into generation context

## Data Flow

### Guided generation

```text
Guided inputs (format, audience, style, goals)
  -> generation brief builder
  -> provider/model resolution (workspace/project/session)
  -> generation service
  -> artifact revision with provenance metadata
  -> canvas render + dev-mode inspection
```

### Collaboration session

```text
User joins project
  -> auth + role check
  -> collaboration session attach
  -> presence broadcast (user, cursor, active artifact)
  -> synced project updates
  -> comments / review events persisted separately from transient presence
```

### Brand-aware generation

```text
Workspace/project brand rules
  -> context assembler
  -> generation request enrichment
  -> output tagged with applied constraints
  -> review/export surfaces expose which constraints were active
```

## File Changes

| File / Area                                         | Action | Description                                                                        |
| --------------------------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| `frontend/src/features/canvas/`                     | Modify | Add presence UI, comments entry points, dev-mode toggle, collaboration-aware state |
| `frontend/src/features/canvas/canvas-store.ts`      | Modify | Track collaboration/presence state and active session metadata                     |
| `frontend/src/features/canvas/header-dropdowns.tsx` | Modify | Project/session-level provider/model routing controls                              |
| `frontend/src/features/generation/`                 | Modify | Guided generation brief builder and richer request contracts                       |
| `frontend/src/features/templates/`                  | Create | Starter gallery and template selection surfaces                                    |
| `frontend/src/features/comments/`                   | Create | Comment threads, replies, resolution UI                                            |
| `frontend/src/features/dev-handoff/`                | Create | Dev mode panels for inspection/export                                              |
| `backend/apps/workspace/`                           | Modify | Workspace defaults, brand constraints, collaboration settings                      |
| `backend/apps/projects/`                            | Modify | Project-level defaults, active collaborators, revision metadata                    |
| `backend/apps/generation/`                          | Modify | Provenance, brand-aware context assembly, provider resolution                      |
| `backend/apps/comments/`                            | Create | Comments API and persistence                                                       |
| `backend/apps/collaboration/`                       | Create | Presence/session transport and membership checks                                   |

## Interfaces / Contracts

```ts
type GuidedGenerationBrief = {
  format: "landing" | "dashboard" | "hero" | "slide" | "social_post";
  audience: string;
  goal: string;
  styleDirection: string;
  constraints: string[];
  referenceIds: string[];
};
```

```ts
type ArtifactProvenance = {
  provider: string;
  modelId: string;
  promptVersion: string;
  briefSnapshot: Record<string, unknown>;
  appliedBrandRules: string[];
  generatedAt: string;
};
```

```ts
type CollaborationPresence = {
  userId: number;
  displayName: string;
  color: string;
  activeArtifactId: string | null;
  cursor: { x: number; y: number } | null;
  role: "editor" | "developer" | "reviewer" | "viewer";
};
```

```ts
type CommentThread = {
  id: string;
  artifactId: string;
  anchor: Record<string, unknown>;
  status: "open" | "resolved";
  messages: Array<{ authorId: number; body: string; createdAt: string }>;
};
```

## Testing Strategy

| Layer       | What to Test                                       | Approach                                                 |
| ----------- | -------------------------------------------------- | -------------------------------------------------------- |
| Unit        | Guided brief assembly and brand-rule enrichment    | Frontend/backend pure function tests                     |
| Unit        | Provider/model resolution precedence               | Existing workspace/project settings patterns             |
| Integration | Collaboration auth and presence lifecycle          | WebSocket/session tests with role checks                 |
| Integration | Comment thread create/reply/resolve flows          | API tests with artifact anchors                          |
| Integration | Dev-mode export contract stability                 | Snapshot or contract tests over representative artifacts |
| E2E         | Guided generation -> collaboration -> handoff flow | Playwright across two user roles if feasible             |

## Migration / Rollout

- **Phase 1**: ship presence + comment infrastructure behind a feature flag if needed
- **Phase 2**: add dev mode using current artifact data before introducing advanced export formats
- **Phase 3**: release guided generation on selected formats first (landing, hero, slide)
- **Phase 4**: expose provider marketplace UI on top of the already-implemented BYOK foundations
- **Phase 5**: roll out brand-aware generation as opt-in workspace/project rules

## Open Questions

- [ ] Should collaboration use an in-house sync layer or a managed sync service?
- [ ] What is the minimal clean export contract that developers will actually trust?
- [ ] Should project defaults override workspace defaults globally or only for specific artifact formats?
- [ ] Does the current product name block adoption once non-social formats become first-class?
