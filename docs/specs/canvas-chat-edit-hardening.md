# Canvas Chat Edit Hardening Specification

## Purpose

Define the requirements needed to make the existing canvas chat editing flow deterministic, resilient to imperfect model output, and safe under streamed updates and rapid editor interaction.

## Requirements

### Requirement: Deterministic New Slide Creation

The system MUST create a new slide deterministically when generation output targets an occupied slide index but the user did not explicitly select an existing slide for update.

#### Scenario: Empty canvas creates slide zero

- GIVEN the canvas has no slides
- WHEN a build response yields one HTML block for `slide_index = 0`
- THEN the system creates slide index `0`

#### Scenario: Occupied index without selection creates next available slide

- GIVEN the canvas already contains slides `0`, `1`, and `2`
- AND no slides are currently selected
- WHEN a build response yields one HTML block for `slide_index = 1`
- THEN the system creates a new slide at index `3`
- AND no existing slide is overwritten

#### Scenario: Explicit selection updates existing slide

- GIVEN the canvas contains slide `1`
- AND that slide is currently selected
- WHEN a build response yields one HTML block for `slide_index = 1`
- THEN the system updates the selected existing slide
- AND does not create a new slide

### Requirement: Live-State Chat Routing

The system MUST make chat-to-canvas routing decisions using current store state at event time.

#### Scenario: Stream routing sees latest slide map

- GIVEN streamed `html_block` events arrive after the slide map changed
- WHEN the system decides whether to update or create
- THEN it reads the current store state
- AND produces the same routing outcome as if the event were processed from a fresh render

#### Scenario: Next index uses current max slide index

- GIVEN additional slides are added before a streamed event is processed
- WHEN the system calculates the next available index
- THEN it uses the current max slide index from the store
- AND not a stale captured value

### Requirement: Resilient Element Patch Parsing

The system MUST tolerate light provider formatting noise around an `element_patch` payload while still rejecting structurally invalid patches.

#### Scenario: Raw JSON patch is accepted

- GIVEN the model returns a valid raw JSON object with `type`, `slideIndex`, `cssPath`, and `updatedOuterHtml`
- WHEN the backend parses the response
- THEN it emits an `element_patch` event

#### Scenario: Fenced JSON patch is accepted

- GIVEN the model returns the valid patch inside a fenced JSON block
- WHEN the backend parses the response
- THEN it emits an `element_patch` event

#### Scenario: Light wrapper noise still allows extraction

- GIVEN the model returns a short explanatory line followed by a valid JSON patch
- WHEN the backend parses the response
- THEN it extracts the valid patch payload
- AND emits an `element_patch` event

#### Scenario: Invalid patch shape is rejected

- GIVEN the model response is missing required patch fields
- WHEN the backend parses the response
- THEN it does not emit an `element_patch` event
- AND falls back to the existing non-patch behavior

### Requirement: Safe Element Patch Application

The system MUST fail safely when an `element_patch` cannot be applied to the targeted slide variant.

#### Scenario: Valid selector updates only target element

- GIVEN a valid slide HTML fragment and valid `cssPath`
- WHEN the patch is applied
- THEN only the targeted element is replaced
- AND surrounding HTML remains unchanged

#### Scenario: Missing selector does not break the chat flow

- GIVEN the patch references a selector that does not exist in the current slide HTML
- WHEN the patch is applied
- THEN the system does not throw an uncaught error
- AND the assistant message reflects that the targeted change could not be applied safely

#### Scenario: Invalid replacement HTML does not corrupt the slide

- GIVEN the patch contains invalid replacement markup
- WHEN the patch is applied
- THEN the original slide HTML remains unchanged
- AND the edit flow completes without crashing

### Requirement: Immediate Selected-Slide Synchronization

The system MUST keep selected-slide state synchronized closely enough that a prompt sent immediately after selection uses the correct scope.

#### Scenario: Immediate send after selection uses selected slide context

- GIVEN the user selects one or more slides in the canvas
- WHEN they send a prompt immediately after the selection change
- THEN the chat request includes only the selected slides in `current_html`

#### Scenario: Immediate send after deselection uses unscoped behavior

- GIVEN the user deselects all slides
- WHEN they send a prompt immediately after deselection
- THEN the chat request is not constrained by stale selected-slide state

### Requirement: Regression Coverage for Hardened Paths

The system MUST include automated regression coverage for the hardened create/update and patch paths.

#### Scenario: Backend hardening is covered

- GIVEN the backend parsing code
- WHEN the test suite runs
- THEN slide extraction fallback and element patch parsing edge cases are covered

#### Scenario: Frontend routing hardening is covered

- GIVEN the frontend canvas chat routing code
- WHEN the test suite runs
- THEN update-vs-create behavior and patch failure behavior are covered
