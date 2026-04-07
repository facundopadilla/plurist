# Tasks: Canvas Chat Edit Hardening

## 1. Lock Behavior with Regression Tests

- [x] 1.1 Backend: Extend `backend/tests/generation/test_chat_service.py` to cover fallback indexing when existing slides are present and no slide markers are returned.
- [x] 1.2 Backend: Add tests for `element_patch` parsing with fenced JSON, light wrapper noise, and invalid payloads.
- [x] 1.3 Frontend: Extend `frontend/src/__tests__/apply-element-patch.test.ts` to cover missing selector and invalid replacement fallback behavior.
- [x] 1.4 Frontend: Add `frontend/src/__tests__/use-chat-to-canvas.test.ts` covering:
  - occupied index + no selection => create next slide
  - selected existing slide => update existing slide
  - routing uses live store state at event time
  - strict selected-slide scope enforcement
- [x] 1.5 Frontend: Extend `frontend/src/__tests__/chat-sidebar.test.tsx` to verify safe assistant fallback when an element patch cannot be applied.

## 2. Harden Backend Parsing

- [x] 2.1 Modify `backend/apps/generation/chat_service.py` so `element_patch` extraction tolerates light provider wrapper noise while still requiring the exact patch fields.
- [x] 2.2 Keep the current fallback behavior from patch mode to HTML block extraction when no valid patch can be extracted.
- [x] 2.3 Verification: run focused backend generation tests.

## 3. Harden Frontend Patch Application

- [x] 3.1 Modify `frontend/src/features/canvas/chat/apply-element-patch.ts` so failed patch application preserves the original HTML instead of breaking the flow.
- [x] 3.2 Modify `frontend/src/features/canvas/hooks/use-chat-to-canvas.ts` so patch application is wrapped in a safe fallback path.
- [x] 3.3 Modify `frontend/src/features/canvas/chat/chat-sidebar.tsx` so patch failure produces a clear assistant-side fallback message instead of silent failure or raw noise.
- [x] 3.4 Verification: run focused frontend tests for patch application and chat fallback behavior.

## 4. Remove Stale-State Routing Hazards

- [x] 4.1 Modify `frontend/src/features/canvas/hooks/use-chat-to-canvas.ts` so `onHtmlBlock` reads current slide and selection state from the live store at event time.
- [x] 4.2 Ensure next-slide index calculation uses current store state instead of captured render-time snapshots.
- [x] 4.3 Verification: run focused routing tests and confirm create/update semantics remain unchanged except for the intended hardening.

## 5. Replace Selection Polling If Safe

- [x] 5.1 Audit `frontend/src/features/canvas/canvas-compose-page.tsx` and current tldraw APIs to confirm the best event-driven selection subscription point.
- [x] 5.2 Replace polling-based selected-slide sync with event-driven sync using tldraw `react()` API.
- [x] 5.3 N/A — event-driven sync is stable via `react()`.
- [ ] 5.4 Verification: prove that immediate send after selection and immediate send after deselection both use the correct chat scope. _(covered by unit tests; no dedicated UI-level integration test yet)_

## 6. Final Verification

- [x] 6.1 Run focused backend tests for generation chat parsing.
- [x] 6.2 Run focused frontend tests for patch application, chat sidebar, and chat-to-canvas routing.
- [x] 6.3 Run frontend typecheck and lint.
- [x] 6.4 Summarize changed files, hardened behaviors, and any remaining risks.
