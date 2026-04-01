# Proposal: UI Refresh with shadcn/ui

## Intent

The current frontend UI relies on scattered global Tailwind component classes and a small set of custom wrappers, which makes the design inconsistent and harder to evolve. This change introduces shadcn/ui as the shared design-system foundation so buttons, inputs, alerts, dialogs, badges, and forms follow one consistent pattern.

## Scope

### In Scope

- Initialize shadcn/ui against the existing React + Tailwind setup
- Define shared design tokens for core UI states and destructive/popover surfaces
- Replace current `.elegant-*` control classes with reusable shadcn-based components
- Standardize button, input, badge, alert, dialog, dropdown, card, and form usage
- Preserve project-specific layout primitives such as `.paper-*`
- Migrate priority feature surfaces to the new components incrementally

### Out of Scope

- Full visual redesign of every application screen in one pass
- Replacing app-specific page layout classes with a third-party layout system
- Rewriting product flows or business logic
- Introducing paid UI kits or non-open-source assets
- Building marketing-only animated sections with Aceternity UI

## Approach

The migration will be incremental and component-first.

**Phase 1 — Foundation**
Initialize shadcn/ui, add missing semantic CSS tokens, and install the base components required by the current app.

**Phase 2 — Shared Controls**
Replace global `.elegant-button-*`, `.elegant-input`, `.elegant-chip`, and modal/status wrappers with shadcn-based React components in `src/components/ui/`.

**Phase 3 — Feature Adoption**
Refactor high-usage screens and flows to consume the shared components, starting with dropdown-heavy and form-heavy surfaces.

**Phase 4 — Cleanup**
Delete retired global control classes and document the new UI usage rules.

## Affected Areas

| Area                                                | Impact   | Description                                                         |
| --------------------------------------------------- | -------- | ------------------------------------------------------------------- |
| `frontend/src/index.css`                            | Modified | Add missing shadcn tokens and retire old control classes gradually  |
| `frontend/tailwind.config.js`                       | Reviewed | Confirm existing compatibility with shadcn expectations             |
| `frontend/src/lib/utils.ts`                         | Reused   | Keep existing `cn()` helper                                         |
| `frontend/src/components/ui/`                       | Modified | Add shadcn-based Button/Input/Badge/Alert/Dialog/Card/Form wrappers |
| `frontend/src/features/canvas/header-dropdowns.tsx` | Modified | Replace raw Radix dropdown composition with shadcn `DropdownMenu`   |
| `frontend/src/features/**`                          | Modified | Adopt shared controls incrementally in forms and actions            |
| `frontend/src/app/theme.tsx`                        | Reviewed | Preserve current class-based dark mode unless a blocker appears     |

## Risks

| Risk                                                                 | Likelihood | Mitigation                                                                      |
| -------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| Large JSX churn in dropdown/form screens                             | Medium     | Refactor by feature slice, not big-bang                                         |
| Temporary coexistence of old and new controls                        | Medium     | Track migration by phases and delete old classes only after replacement         |
| shadcn token expectations diverge from custom semantic status tokens | Low        | Preserve `--status-*` and map them into component variants                      |
| Form migration grows scope due to `react-hook-form` adoption         | Medium     | Limit Phase 1 to base controls; move full form abstraction to a dedicated phase |

## Rollback Plan

- Revert the added shadcn components and restore usage of current `.elegant-*` classes
- Remove any newly added tokens that are no longer referenced
- Keep layout classes untouched so rollback remains narrow and reversible

## Success Criteria

- [ ] Shared buttons, inputs, badges, alerts, dialogs, cards, and dropdowns come from `src/components/ui/`
- [ ] No new feature code introduces `.elegant-button-*`, `.elegant-input`, or `.elegant-chip`
- [ ] Priority screens render with consistent spacing, borders, focus states, and dark-mode behavior
- [ ] Existing project-specific layout primitives remain intact
- [ ] The UI foundation is ready for later form standardization with shadcn form components
