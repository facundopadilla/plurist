# Design System Onboarding And Refresh Specification

## Purpose

Compact project Design Bank inputs into reusable project context so the canvas chat can generate slides with less prompt noise, lower token usage, and more consistent outputs.

## Requirements

### Requirement: Project Artifact Status

The system MUST expose project-scoped status for compacted design artifacts.

#### Scenario: Project without artifacts reports onboarding state

- GIVEN a project with no persisted design-system artifact
- WHEN the chat requests project design-system status
- THEN the status reports no design system exists
- AND the UI can show a first-run onboarding prompt

#### Scenario: Project with outdated artifacts reports refresh state

- GIVEN a project with existing compacted artifacts
- AND relevant Design Bank sources were added or updated afterward
- WHEN the chat requests project design-system status
- THEN the status reports that the artifacts are outdated
- AND includes the latest relevant source revision timestamp

### Requirement: Relevant Source Filtering

The system MUST derive compacted artifacts only from V1-relevant textual/structured sources.

#### Scenario: Relevant textual sources are included

- GIVEN a project has text, markdown, html, css, and url-based textual sources
- WHEN artifact generation runs
- THEN those sources are eligible as synthesis input

#### Scenario: Image and video sources do not drive V1 synthesis

- GIVEN a project has image or video sources
- WHEN artifact generation runs
- THEN those sources are ignored for V1 synthesis
- AND artifact generation still succeeds if enough textual context exists

### Requirement: Compacted Artifact Persistence

The system MUST persist a project design system and a project reference brief.

#### Scenario: Initial generation creates both artifacts

- GIVEN a project with relevant Design Bank sources and no compacted artifacts
- WHEN the user confirms creation
- THEN the backend creates a `design_system` artifact
- AND creates a `reference_brief` artifact
- AND both artifacts record the source revision used to generate them

#### Scenario: Refresh updates existing artifacts

- GIVEN a project with existing compacted artifacts
- WHEN the user confirms refresh after new relevant content was added
- THEN the existing artifacts are updated in place
- AND their recorded source revision matches the latest relevant source revision

### Requirement: Prompt Context Prioritization

The system MUST prefer compacted artifacts over raw Design Bank inputs when available.

#### Scenario: Prompt builder uses compacted context first

- GIVEN a project has a design-system artifact and a reference brief
- WHEN a chat generation prompt is built
- THEN the prompt includes the compacted design-system context
- AND includes the compacted reference brief
- AND does not append the full raw Design Bank content fallback

#### Scenario: Prompt builder falls back when compacted artifacts are missing

- GIVEN a project has no compacted artifacts
- WHEN a chat generation prompt is built
- THEN the prompt uses the existing raw Design Bank fallback behavior

### Requirement: Chat Onboarding And Refresh UX

The chat MUST guide users to create or refresh the project design system at the right time.

#### Scenario: First empty chat shows onboarding prompt

- GIVEN the chat is opened for a project
- AND there are no chat messages yet
- AND the project has no design-system artifact
- WHEN the composer renders
- THEN the chat shows a prompt asking whether to create the design system now

#### Scenario: Outdated artifacts show refresh prompt

- GIVEN the chat is opened for a project with outdated compacted artifacts
- WHEN the composer renders
- THEN the chat shows a refresh prompt referring to newly added Design Bank content

#### Scenario: Dismissal is revision-aware

- GIVEN the user dismisses the onboarding or refresh prompt
- WHEN the same project revision remains unchanged
- THEN the prompt stays hidden
- WHEN a newer relevant source revision appears
- THEN the prompt becomes eligible again

### Requirement: Chat Wizard Submission

The chat MUST provide a lightweight wizard to create or refresh compacted artifacts.

#### Scenario: Wizard submission generates artifacts

- GIVEN the user accepts onboarding or refresh
- WHEN they submit the wizard
- THEN the backend generates or updates the project artifacts
- AND the chat receives success state and updated status

#### Scenario: Generation failure is surfaced safely

- GIVEN artifact generation fails
- WHEN the wizard submission completes
- THEN the user sees a clear failure message
- AND no stale partial success state is shown
