# Tasks: Collaborative UI Studio

## Phase 1: Realtime Collaboration

- [ ] 1.1 Explore and choose the collaboration transport/sync strategy compatible with the current canvas state and permission model.
- [ ] 1.2 Backend: Add collaboration session primitives for presence, membership checks, and active project attachment.
- [ ] 1.3 Frontend: Surface collaborator presence, active-user indicators, and live cursor awareness in the canvas shell.
- [ ] 1.4 Backend + Frontend: Add anchored comment threads with reply/resolve flows for project artifacts.
- [ ] 1.5 Verification: Prove that two collaborators can join the same project, see presence updates, and persist review comments.

## Phase 2: Canvas-to-Dev Handoff

- [ ] 2.1 Frontend: Add a dev-mode entry point from the canvas for the active artifact.
- [ ] 2.2 Frontend: Show artifact structure, relevant tokens, and provenance metadata in dev mode.
- [ ] 2.3 Backend + Frontend: Define and implement a stable export contract for approved artifact revisions.
- [ ] 2.4 Verification: Add tests that prove exports and metadata remain stable for the same approved revision.

## Phase 3: Guided UI Generation

- [ ] 3.1 Product/Frontend: Define the minimum structured generation brief for first-time users.
- [ ] 3.2 Frontend: Build guided generation entry flows with simple and advanced modes.
- [ ] 3.3 Frontend + Backend: Support starter templates and format-specific defaults for initial generation.
- [ ] 3.4 Verification: Prove a user can create an artifact through the guided flow without free-form prompting.

## Phase 4: Provider Marketplace & Model Routing

- [ ] 4.1 Backend: Extend provider/model defaults from workspace settings to project/session-aware routing.
- [ ] 4.2 Frontend: Redesign AI provider settings into a visible marketplace/routing experience with defaults and overrides.
- [ ] 4.3 Backend + Frontend: Record provider/model provenance and expose cost/latency metadata where available.
- [ ] 4.4 Verification: Add tests for routing precedence (workspace -> project -> session override) and provenance visibility.

## Phase 5: Brand-Aware Generation

- [ ] 5.1 Backend: Define persistence for brand rules, design tokens, and approved generation constraints.
- [ ] 5.2 Backend + Frontend: Enrich generation requests with active brand-aware context and show which rules were applied.
- [ ] 5.3 Frontend: Allow authorized users to bypass brand rules intentionally while marking the output as unapproved.
- [ ] 5.4 Verification: Add tests proving constrained generation and explicit bypass states are distinguishable.
