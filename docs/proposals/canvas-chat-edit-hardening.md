# Proposal: Canvas Chat Edit Hardening

## Intent

Recent canvas/chat work fixed the inline floating toolbar and improved selected-slide chat scope, element-targeted AI edits, and multi-slide generation. The remaining risk is not missing product capability, but pipeline fragility: slide creation still relies on model obedience in edge cases, `element_patch` handling is brittle outside the happy path, slide routing decisions depend on potentially stale state, and selected-slide sync is still polled from the editor.

This change hardens the existing canvas chat editing flow so generation and edit operations behave deterministically under imperfect model output and real user interaction speed.

## Scope

### In Scope

- Harden backend slide block extraction fallback behavior and verify it with focused tests
- Harden backend `element_patch` parsing so provider output with light formatting noise is still usable
- Harden frontend slide update/create routing to use live store state during streamed chat events
- Harden frontend element patch application to fail safely instead of breaking the edit flow
- Replace polling-based selected-slide synchronization with event-driven synchronization if supported by the current tldraw integration
- Add focused regression coverage for the hardened paths

### Out of Scope

- New canvas editing features
- New chat modes or AI capabilities
- Code editor, annotations, variants, or export redesign
- New provider integrations
- Large canvas architecture refactors

## Approach

This change should be delivered in four small steps:

**Step 1 - Lock Current Risky Behavior with Tests**
Add targeted backend and frontend regression tests for slide creation fallback, selected-slide update behavior, and element patch application edge cases.

**Step 2 - Harden the Parsing and Patch Path**
Improve backend parsing tolerance for `element_patch` responses and make frontend patch application fail safely with user-visible fallback behavior.

**Step 3 - Remove Stale-State Routing Hazards**
Update chat-to-canvas routing so streamed `html_block` decisions always use live Zustand state instead of relying on render-time snapshots.

**Step 4 - Replace Selection Polling**
If the current tldraw surface supports a stable event subscription for selection changes, switch selected-slide synchronization from polling to event-driven updates and verify immediate prompt correctness.

## Affected Areas

| Area                                                       | Impact   | Description                                                      |
| ---------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| `backend/apps/generation/chat_service.py`                  | Modified | Safer parsing of HTML blocks and element patch responses         |
| `backend/tests/generation/test_chat_service.py`            | Modified | Regression tests for fallback extraction and patch parsing       |
| `frontend/src/features/canvas/hooks/use-chat-to-canvas.ts` | Modified | Live-state routing for streamed chat events                      |
| `frontend/src/features/canvas/chat/apply-element-patch.ts` | Modified | Safe patch application behavior                                  |
| `frontend/src/features/canvas/chat/chat-sidebar.tsx`       | Modified | User-facing fallback behavior if element patch cannot be applied |
| `frontend/src/features/canvas/canvas-compose-page.tsx`     | Modified | Event-driven selected-slide synchronization                      |
| `frontend/src/__tests__/chat-sidebar.test.tsx`             | Modified | Regression tests for patch fallback and slide context behavior   |
| `frontend/src/__tests__/apply-element-patch.test.ts`       | Modified | Patch failure-mode coverage                                      |
| `frontend/src/__tests__/use-chat-to-canvas.test.ts`        | New      | Routing coverage for create/update behavior                      |

## Risks

| Risk                                                                    | Likelihood | Mitigation                                                               |
| ----------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| More permissive patch parsing could accept malformed model output       | Med        | Keep strict required fields and fall back only for light wrapper noise   |
| Silent patch fallback could hide real bugs                              | Med        | Preserve clear assistant-side error text and test failure visibility     |
| Event-driven selection sync may behave differently from polling         | Med        | Verify selection-to-send flow with focused tests before removing polling |
| Live-state routing changes could affect current create/update semantics | Low        | Lock semantics first with regression tests                               |

## Rollback Plan

- Revert event-driven selection sync to the current polling mechanism
- Revert frontend routing changes while preserving test additions for diagnosis
- Revert tolerant patch parsing if it produces false positives
- Keep the regression tests to preserve visibility into the original failure modes

## Dependencies

- Existing canvas chat streaming pipeline
- Zustand canvas store
- Current tldraw editor selection APIs
- Existing selected-slide and element-reference state

## Success Criteria

- [ ] Creating a new slide does not overwrite an existing slide when the model omits markers
- [ ] Updating a selected slide still updates the selected slide instead of creating a new one
- [ ] Invalid or noisy `element_patch` responses do not break the editing flow
- [ ] Streamed chat routing uses current canvas state rather than stale render-time snapshots
- [ ] Slide selection state is synchronized without polling, or polling is retained only if event-driven sync is proven unsafe
