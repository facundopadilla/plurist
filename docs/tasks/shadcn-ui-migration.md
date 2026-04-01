# Tasks: shadcn/ui Migration

## Phase 1: Foundation

- [x] 1.1 Frontend: initialize shadcn/ui in `frontend/` and align generated config with `tailwind.config.js`, `components.json`, and `src/lib/utils.ts`.
- [x] 1.2 Frontend: update `frontend/src/index.css` with missing shadcn tokens (`--destructive`, `--destructive-foreground`, `--popover`, `--popover-foreground`) while preserving `--status-*` and `.paper-*` rules.
- [x] 1.3 Frontend: add base components in `frontend/src/components/ui/` for `button.tsx`, `input.tsx`, `badge.tsx`, `alert.tsx`, `card.tsx`, `dialog.tsx`, and `dropdown-menu.tsx`.

## Phase 2: Shared Control Migration

- [x] 2.1 Frontend: replace `frontend/src/components/ui/elegant-modal.tsx` with the shared dialog pattern or remove it after migrating its consumers.
- [x] 2.2 Frontend: refactor `frontend/src/components/ui/status-badge.tsx` to use shared badge variants backed by existing semantic status tokens.
- [x] 2.3 Frontend: refactor `frontend/src/components/ui/status-message.tsx` to use the shared alert component with tone variants.
- [x] 2.4 Frontend: replace `.elegant-button-*`, `.elegant-input`, and `.elegant-chip` usages across `frontend/src/features/**` with imported shared components.

## Phase 3: Feature Adoption

- [x] 3.1 Frontend: refactor `frontend/src/features/canvas/header-dropdowns.tsx` to use the shared `DropdownMenu` abstraction for all header menus.
- [x] 3.2 Frontend: migrate the highest-traffic forms in `frontend/src/features/**` to shared `Input`, `Label`, and `Button` controls without changing submission logic.
- [x] 3.3 Frontend: normalize cards, empty states, and inline status surfaces in priority screens to use shared `Card`, `Badge`, and `Alert` components.

## Phase 4: Verification

- [x] 4.1 Frontend: add or update component tests for shared button, dialog, status badge/alert, and dropdown behaviors in `frontend/src/components/ui/**` or related feature test files.
- [x] 4.2 Frontend: add or update feature tests covering migrated canvas dropdowns and at least one migrated form flow.
- [x] 4.3 Verification: run `pnpm --dir frontend lint`, `pnpm --dir frontend typecheck`, and `pnpm --dir frontend test` and fix all regressions before closing the change.

## Phase 5: Cleanup

- [x] 5.1 Frontend: delete retired `.elegant-button-*`, `.elegant-input`, `.elegant-chip`, and unused modal helper styles from `frontend/src/index.css` once replacements are complete.
- [x] 5.2 Docs: document the new UI usage rule in project docs so future work imports shared components from `frontend/src/components/ui/` instead of creating new global control classes.
