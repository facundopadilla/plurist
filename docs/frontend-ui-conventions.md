# Frontend UI Conventions

## Component Library

All UI controls live in `frontend/src/components/ui/` and follow the [shadcn/ui](https://ui.shadcn.com/) pattern: unstyled Radix primitives composed with Tailwind CSS via `class-variance-authority` (CVA).

### Rules

1. **Import shared components** — never create ad-hoc global CSS classes for buttons, inputs, badges, alerts, cards, dialogs, or dropdowns. Use the components from `@/components/ui/`.

2. **Extend with CVA variants** — if a component needs a new visual variant, add it to the component's `cva()` definition instead of adding a one-off utility class.

3. **Preserve layout classes** — the `.paper-*` family (`.paper-page`, `.paper-panel`, `.paper-page-header`, etc.) handles page-level layout. These are intentional and do not have shadcn equivalents.

4. **Preserve semantic status tokens** — the `--status-*` CSS custom properties (`--status-success`, `--status-warning`, `--status-danger`, `--status-info`, `--status-neutral`) are wired into `Badge` and `Alert` CVA variants. Use those variants instead of raw token references.

5. **Use `cn()` for conditional classes** — the `cn()` helper from `@/lib/utils` merges Tailwind classes safely. Always prefer it over manual string concatenation.

### Available Components

| Component      | File                | Primary Use                                                                    |
| -------------- | ------------------- | ------------------------------------------------------------------------------ |
| `Button`       | `button.tsx`        | Actions — `default`, `outline`, `ghost`, `link`, `destructive` variants        |
| `Input`        | `input.tsx`         | Text inputs (note: login icon-group inputs keep their custom styling)          |
| `Label`        | `label.tsx`         | Form labels                                                                    |
| `Badge`        | `badge.tsx`         | Status indicators — `success`, `warning`, `danger`, `info`, `neutral` variants |
| `Alert`        | `alert.tsx`         | Feedback messages — `destructive`, `success`, `warning`, `info` variants       |
| `Card`         | `card.tsx`          | Content containers with header/footer/content slots                            |
| `Dialog`       | `dialog.tsx`        | Modals (replaces the old `ElegantModal`)                                       |
| `DropdownMenu` | `dropdown-menu.tsx` | Menus triggered by a button                                                    |

### Adding New shadcn Components

```bash
npx shadcn@latest add <component-name>
```

This will scaffold into `frontend/src/components/ui/` and respect the project's `components.json` config.

### What NOT To Do

- Do **not** add new `.elegant-*` classes — they have been retired.
- Do **not** import from deleted files (`elegant-modal`, `status-badge`, `status-message`).
- Do **not** use raw `text-red-500` for error messages — use `text-destructive` or `<Alert variant="destructive">`.
