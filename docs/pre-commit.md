# Pre-commit y quality gates

Este repo ahora usa una estrategia en dos capas:

- `pre-commit` para orquestar checks de backend y frontend.
- `husky` para enganchar esos checks al flujo de Git sin tocar `git config`.

## Qué corre en cada etapa

### Pre-commit (rápido, sobre archivos staged)

- hygiene checks (`trailing-whitespace`, `end-of-file-fixer`, `mixed-line-ending`)
- validación de JSON / YAML / TOML
- detección de conflictos de merge
- `detect-private-key`
- `detect-secrets`
- naming de tests Python (`name-tests-test --pytest-test-first`)
- `ruff check`
- `ruff format --check`
- `eslint`
- `prettier --check`

### Pre-push (full scan del repo)

- `ruff check backend --select F63,F7,F82,E9`
- `bandit` sobre `backend/apps` y `backend/config`
- `mypy` sobre providers de generación ya tipados y versionados con `django-stubs`
- `eslint` completo del frontend
- `tsc --noEmit` en frontend

## Setup local

1. Sincronizar dependencias Python de desarrollo:

   ```bash
   uv sync --project backend --extra dev
   ```

2. Instalar dependencias del frontend:

   ```bash
   pnpm install --dir frontend
   ```

3. Instalar dependencias del root para husky:

   ```bash
   pnpm install
   ```

Listo: `husky` crea los hooks y delega a `pre-commit`.

## Comandos útiles

```bash
uv run --project backend --extra dev pre-commit run --all-files
uv run --project backend --extra dev pre-commit run --hook-stage pre-push --all-files
pnpm run hooks:precommit
pnpm run hooks:prepush
```

## Criterio de diseño

No mandamos TODO al `pre-commit` de Git porque sería una locura cósmica para el feedback loop.
Lo rápido corre al commitear; lo pesado corre al pushear. Así tenés calidad alta sin destruir la ergonomía del equipo.

## Nota sobre type checking Python

Se eligió `mypy` por encima de `pyright` como primera capa de type checking para backend porque este repo es bastante Django-heavy y `django-stubs` encaja mejor para una adopción gradual.

La estrategia actual NO intenta tipar todo el backend de una: empieza por los providers de generación que ya pasan, y después se puede expandir módulo por módulo sin romper el flujo del equipo.
