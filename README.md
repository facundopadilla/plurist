# Plurist

**Create and edit AI-generated content through code or visual tools—no coding required.**

> *Creá contenido a partir de código, o trabajá 100% desde el canvas y el chat: no hace falta programar.*

Plurist is an **AI-first** workspace for building social and marketing content: a canvas grounded in real HTML/CSS, with chat-assisted generation, optional code editing (Monaco), and workspace-scoped AI providers—use whichever surface fits you.

---

## Stack

| Layer | Technology |
| --- | --- |
| Backend | Django 4.2, Django Ninja, Celery, Redis, PostgreSQL 16, MinIO (S3), Python 3.12, uv |
| Frontend | React 18, Vite, TanStack Query, Zustand, tldraw, Tailwind 3, shadcn/ui, pnpm 9 |
| Local infra | Docker Compose (Postgres, Redis, MinIO, Mailpit, backend, worker, beat, frontend) |
| Quality | pre-commit, Husky, Ruff, Bandit, ESLint, Prettier, Vitest, pytest, Playwright |

---

## Quick start

```bash
cp .env.example .env
make up
```

Then open the frontend URL from your compose setup (commonly `http://localhost:5173`).

```bash
make lint            # ruff + TypeScript + ESLint (Docker)
make test-backend    # pytest
make test-frontend   # Vitest
make test-e2e        # Playwright — run `make up` first
make down            # see Makefile for flags (e.g. volumes)
```

---

## Documentation

Additional specs, proposals, and verification notes live under [`docs/`](docs/). SonarQube / Semgrep: [`docs/static-analysis.md`](docs/static-analysis.md).
