# Proposal: Design System Onboarding And Refresh

## Intent

The canvas chat currently pulls raw Design Bank assets directly into generation prompts. That works for simple project context, but it does not scale well: token usage grows with every uploaded source, the prompt context becomes noisy, and the AI has to repeatedly reconstruct the same visual and editorial rules.

This change introduces two compact project artifacts derived from the Design Bank:

- a project `design_system` artifact for visual rules and reusable design guidance
- a project `reference_brief` artifact for editorial and strategic context

The chat should proactively guide the user to create these artifacts when a project has no design system yet, and later prompt the user to refresh them when new relevant Design Bank content is added.

## Scope

### In Scope

- Add backend support for project design-system status, stale detection, and artifact generation/update
- Store compacted project artifacts in Design Bank records
- Make chat prompts prefer compacted design-system artifacts over raw Design Bank context
- Show first-run design-system onboarding in the canvas chat
- Show refresh prompts when relevant Design Bank sources change after the last artifact generation
- Provide a lightweight chat-driven wizard to create/update the artifacts

### Out of Scope

- Vision analysis of images or videos
- Full PDF text extraction
- Rich multi-screen design-system management UI outside the canvas chat
- Replacing the Design Bank itself

## Approach

### 1. Derived Project Artifacts

Persist two project-scoped Design Bank artifacts:

- `design_system` for compact visual rules
- `markdown` with `artifact_kind=reference_brief` for compact editorial guidance

Both artifacts should track the Design Bank source IDs and source revision timestamp used to generate them.

### 2. Relevant Source Filtering

Only use low-cost textual/structured Design Bank inputs in V1:

- text resources
- markdown uploads
- html uploads
- css uploads
- url ingests with extracted text snippets
- compatible plain-text uploads when decodable

Images, videos, and PDFs without extracted text should not block artifact creation, but they should not drive the synthesis in V1.

### 3. Synthesis Pipeline

Generate both artifacts from the relevant Design Bank inputs, using the selected provider when available and falling back to a deterministic local synthesis when provider output is unavailable or mocked.

### 4. Chat Onboarding And Refresh

When a project has no design system artifact yet, the empty chat should offer:

- `Yes, let's start`
- `Not now`

When a project already has artifacts but relevant sources changed since the last generation, the chat should offer:

- `Update now`
- `Later`

Dismissals should be project-scoped and temporary so the prompt returns when the source revision changes.

### 5. Prompt Context Prioritization

The generation prompt builder should prefer:

1. design-system artifact
2. reference brief artifact
3. fallback raw Design Bank context only when compacted artifacts do not exist

## Success Criteria

- [ ] The empty chat detects when a project lacks a design system and shows a creation prompt
- [ ] The chat detects when relevant Design Bank inputs changed and shows an update prompt
- [ ] Creating/updating artifacts persists them in the Design Bank and marks them up to date
- [ ] Generation prompts use compacted design-system artifacts instead of raw Design Bank context when available
- [ ] The implementation ignores image/video-heavy analysis for now without breaking the flow
