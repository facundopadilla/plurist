# Collaborative UI Studio Specification

## Purpose

Define the requirements that evolve Plurist from a single-user HTML generation tool into a collaborative, easy-first, model-agnostic UI studio for designers and developers.

## Requirements

### Requirement: Guided UI Generation

The system MUST provide a guided generation flow that helps non-expert users create usable UI artifacts without relying on free-form prompting skill.

#### Scenario: User starts from a guided flow

- GIVEN a user opens the create flow without an existing project
- WHEN they choose a format, style direction, and task goal from guided inputs
- THEN the system generates an initial artifact using those structured inputs
- AND shows the user which inputs influenced the result.

#### Scenario: User switches to advanced mode

- GIVEN a user has started from the guided flow
- WHEN they choose advanced mode
- THEN the system exposes free-form prompt controls and advanced provider/model controls
- AND preserves the structured inputs as editable generation context.

### Requirement: Live Collaboration

The system MUST support multi-user collaboration on the same project with shared presence and synchronized changes.

#### Scenario: Two users edit the same project

- GIVEN two authenticated users with edit access are viewing the same project
- WHEN one user changes the active artifact or project state
- THEN the second user sees the change in near real time
- AND both users can see who is currently present in the workspace.

#### Scenario: User sees collaborator presence

- GIVEN a project has multiple active collaborators
- WHEN a user enters the project
- THEN the system shows collaborator names, cursor/presence indicators, and active focus context.

### Requirement: Collaboration Comments and Review

The system MUST support comment threads tied to artifacts or selections so designers and developers can review work asynchronously or during live sessions.

#### Scenario: Reviewer leaves a comment on an artifact

- GIVEN a reviewer has access to a project artifact
- WHEN they attach a comment to a specific artifact or selection
- THEN the comment is persisted with author, timestamp, and anchor metadata
- AND other collaborators can reply or resolve the thread.

### Requirement: Designer-to-Developer Handoff

The system MUST expose a developer-oriented handoff surface from the same project state used by designers.

#### Scenario: Developer inspects an active artifact

- GIVEN a project artifact is selected in the canvas
- WHEN a developer opens dev mode
- THEN the system displays structure, relevant design tokens, and generation metadata for the selected artifact
- AND the developer can copy or export the artifact without losing source context.

#### Scenario: Team exports an artifact for implementation

- GIVEN an artifact has been reviewed and approved for handoff
- WHEN a collaborator exports it
- THEN the export includes the rendered artifact plus enough metadata to understand provider/model/prompt provenance
- AND the export remains stable across repeated downloads of the same approved revision.

### Requirement: Provider-Neutral Model Routing

The system MUST allow workspace/project-level AI provider and model defaults while preserving per-session overrides and BYOK.

#### Scenario: Workspace owner defines defaults

- GIVEN a workspace owner has configured multiple providers
- WHEN they set a default provider and model for a project or workspace
- THEN subsequent generation sessions use those defaults unless the active user overrides them.

#### Scenario: User overrides the active model

- GIVEN a project has default provider/model settings
- WHEN a user selects a different provider or model for a generation task
- THEN the system applies the override to that task
- AND records which provider/model produced the output.

### Requirement: Brand-Aware Generation

The system MUST support reusable workspace/project constraints that improve output consistency.

#### Scenario: Generation uses brand constraints

- GIVEN a workspace has saved design tokens, style rules, or approved component constraints
- WHEN a user generates a new artifact in that workspace
- THEN the system includes those constraints in the generation context
- AND the output reflects the defined brand direction more consistently than an unconstrained generation.

#### Scenario: User bypasses brand constraints intentionally

- GIVEN a user has permission to experiment outside the current brand rules
- WHEN they explicitly disable brand-aware generation for a task
- THEN the system generates without those constraints
- AND marks the output as outside the approved brand context.
