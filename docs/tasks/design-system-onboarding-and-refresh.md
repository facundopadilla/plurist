# Tasks: Design System Onboarding And Refresh

## 1. SDD And Data Shape

- [x] 1.1 Define compacted project artifacts in Design Bank storage:
  - `design_system`
  - `reference_brief` stored as markdown artifact metadata
- [x] 1.2 Define revision tracking fields stored in `resource_data`
- [x] 1.3 Define relevant source filtering for V1 textual/structured inputs

## 2. Backend Project Artifact Status

- [x] 2.1 Add helpers to resolve project artifact records and relevant source revision
- [x] 2.2 Add a read endpoint returning project design-system status
- [x] 2.3 Add backend tests for onboarding and outdated status conditions

## 3. Backend Artifact Generation

- [x] 3.1 Add a synthesis service that gathers relevant source text safely
- [x] 3.2 Generate compacted `design_system` and `reference_brief` artifacts
- [x] 3.3 Use provider-backed synthesis when available and deterministic fallback otherwise
- [x] 3.4 Add tests for artifact creation/update and revision tracking

## 4. Prompt Builder Integration

- [x] 4.1 Update prompt context gathering to prefer compacted artifacts over raw Design Bank content
- [x] 4.2 Preserve raw Design Bank fallback when artifacts do not exist
- [x] 4.3 Add tests for compacted-context priority

## 5. Chat Onboarding And Refresh UX

- [x] 5.1 Fetch project design-system status in the chat sidebar
- [x] 5.2 Show first-run onboarding prompt in the empty chat state
- [x] 5.3 Show revision-aware refresh prompt when artifacts become outdated
- [x] 5.4 Persist dismissal locally per project + revision

## 6. Chat Wizard

- [x] 6.1 Add a lightweight wizard for create/update actions
- [x] 6.2 Submit provider/model preferences plus optional user guidance
- [x] 6.3 Show success/failure states and refresh status after completion

## 7. Verification

- [x] 7.1 Run focused backend tests for design-bank and prompt-builder changes
- [x] 7.2 Run focused frontend tests for onboarding and refresh rendering
- [x] 7.3 Run frontend typecheck and lint
- [x] 7.4 Summarize changed files, behavior changes, and remaining risks
