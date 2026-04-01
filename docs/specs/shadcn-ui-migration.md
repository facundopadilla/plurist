# UI System Specification

## Purpose

Establish a consistent, reusable UI foundation for the frontend using shadcn/ui so core controls share styling, accessibility behavior, and theming rules without changing business logic.

## Requirements

### Requirement: Shared Component Foundation

The system MUST provide shared React UI components for primary controls from `frontend/src/components/ui/` instead of relying on repeated global `.elegant-*` control classes.

#### Scenario: Feature uses shared button

- GIVEN a feature needs a primary or secondary action
- WHEN the screen renders the action control
- THEN the control is implemented with the shared button component
- AND the feature does not depend on `.elegant-button-primary` or `.elegant-button-secondary`

#### Scenario: Feature uses shared input

- GIVEN a feature needs free-text user input
- WHEN the input is rendered
- THEN the field uses the shared input component
- AND focus, border, and dark-mode behavior come from the shared UI foundation

### Requirement: Theme Tokens Compatibility

The system MUST define the CSS tokens required by shadcn/ui while preserving existing project-specific semantic tokens used by the product.

#### Scenario: Standard shadcn surfaces render correctly

- GIVEN a shadcn dialog, alert, dropdown, or destructive action is rendered
- WHEN the component reads theme variables
- THEN required tokens such as destructive and popover values are available

#### Scenario: Existing semantic statuses remain supported

- GIVEN the product renders success, warning, error, or info messaging
- WHEN badge or alert variants are selected
- THEN the components may map to existing `--status-*` tokens
- AND the semantic meaning remains unchanged

### Requirement: Incremental Feature Migration

The system SHALL allow features to migrate to shadcn/ui incrementally without requiring a full-app rewrite.

#### Scenario: Old and new UI coexist temporarily

- GIVEN only some screens have been migrated
- WHEN the application is rendered during the transition period
- THEN migrated screens use shared shadcn-based controls
- AND untouched screens continue working until scheduled for replacement

#### Scenario: Layout primitives stay app-specific

- GIVEN a page uses `.paper-*` layout classes
- WHEN shared controls are migrated
- THEN page layout classes remain in place
- AND only reusable controls are standardized

### Requirement: Dialog and Dropdown Standardization

The system MUST standardize modal and dropdown behavior on shared shadcn-compatible wrappers built on the existing Radix primitives.

#### Scenario: Dialog replaces custom modal wrapper

- GIVEN a feature opens a modal interaction
- WHEN the modal component is rendered
- THEN it uses the shared dialog abstraction
- AND overlay, focus trapping, and close behavior are consistent across the app

#### Scenario: Canvas header uses standardized dropdowns

- GIVEN the canvas header exposes project, network, format, or provider menus
- WHEN a user opens those menus
- THEN each menu uses the shared dropdown pattern
- AND trigger/content styling is consistent with the rest of the app

### Requirement: Form Foundation Readiness

The system SHOULD prepare form screens for later standardization with shadcn form primitives and the existing `react-hook-form` dependency.

#### Scenario: Form controls are ready for future form wrappers

- GIVEN a form screen is migrated in the first UI pass
- WHEN fields and actions are refactored
- THEN the screen uses shared input, label, and button controls
- AND the resulting structure supports later migration to full shadcn form wrappers
