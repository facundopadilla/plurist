# Plurist

[![CI](https://github.com/facundopadilla/plurist/actions/workflows/ci.yml/badge.svg)](https://github.com/facundopadilla/plurist/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/python-3.12-3776AB?logo=python&logoColor=white)
![Node](https://img.shields.io/badge/node-22-339933?logo=nodedotjs&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-9-F69220?logo=pnpm&logoColor=white)
![Docker](https://img.shields.io/badge/docker%20compose-ready-2496ED?logo=docker&logoColor=white)

**Create and edit AI-generated content through code or visual tools—no coding required.**

Plurist is an **AI-first** workspace for building social and marketing content: an HTML/CSS canvas with chat-assisted generation, optional Monaco editing, workspace-scoped AI providers, and design-bank workflows. Use the visual surface, the chat, or code—whichever fits your workflow.

---

## Features

- **Canvas-first editing** — tldraw-based compose experience with HTML shapes and live preview
- **AI chat** — stream-assisted edits and generation against configurable providers (OpenAI, Anthropic, Gemini, OpenRouter, Ollama, etc.)
- **Code panel** — Monaco-based editing when you want direct control over markup and styles
- **Workspace & roles** — accounts, invites, and scoped resources
- **Design bank & rendering** — asset ingestion and render pipeline integration (see API and `docs/`)

---

## Prerequisites

| Requirement | Notes |
| --- | --- |
| **Docker** & **Docker Compose** | Used for Postgres, Redis, MinIO, Mailpit, backend, Celery, and frontend |
| **GNU Make** | `Makefile` wraps compose commands |
| **uv** (optional) | Python toolchain for running backend tools locally outside Docker |
| **pnpm** (optional) | For frontend scripts on the host |

---

## Installation

```bash
git clone git@github.com:facundopadilla/plurist.git
cd plurist
cp .env.example .env
```

Edit `.env` as needed. For local development, defaults in `.env.example` match the Docker Compose Postgres and MinIO users (`plurist` / `plurist`). Set provider API keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.) when you want live LLM calls.

Start the full stack (builds images, waits for health checks, seeds test accounts):

```bash
make up
```

### Service URLs (default ports)

| Service | URL |
| --- | --- |
| **Frontend (Vite)** | [http://localhost:5173](http://localhost:5173) |
| **Backend API** | [http://localhost:8000](http://localhost:8000) |
| **MinIO console** | [http://localhost:9001](http://localhost:9001) |
| **Mailpit (email dev)** | [http://localhost:8025](http://localhost:8025) |

Shut down (add `-v` in the Makefile / compose if you need to drop volumes):

```bash
make down
```

---

## Development

Quality gates run in Docker (same as CI):

```bash
make lint             # Ruff (backend) + tsc + ESLint (frontend)
make test-backend     # pytest
make test-frontend    # Vitest
```

End-to-end tests (Playwright) need the stack running first:

```bash
make up
make test-e2e
```

### Git hooks (optional)

From the repo root, after `pnpm install`:

```bash
pnpm hooks:precommit   # pre-commit on staged files
pnpm hooks:prepush       # broader checks (bandit, mypy, full eslint/tsc/ruff)
```

### Local tooling without Docker (advanced)

- **Backend:** `uv run --project backend --extra dev pytest` / `ruff check backend`
- **Frontend:** `cd frontend && pnpm install && pnpm run test` / `pnpm run typecheck` / `pnpm run lint`

CI still validates via Docker images; match versions (Python 3.12, Node 22, pnpm 9) for consistent results.

---

## Repository layout

```
backend/          # Django app, Celery, API (Ninja)
frontend/       # React + Vite + tldraw
docs/           # Specs, proposals, verification notes
docker-utils/   # Optional static-analysis compose (SonarQube, Semgrep)
scripts/        # CI / helper scripts
```

---

## Documentation

- **Static analysis (SonarQube / Semgrep):** [`docs/static-analysis.md`](docs/static-analysis.md)
- **Design and product notes:** [`docs/`](docs/)

---

## License

No root license file is shipped in this repository yet. Clarify terms before redistribution; third-party notices (e.g. canvas libraries) are discussed under [`docs/licenses/`](docs/licenses/).
