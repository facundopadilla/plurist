.PHONY: up down lint test-backend test-frontend test-e2e

up:
	docker compose up -d --build --wait

down:
	docker compose down

lint:
	docker compose run --rm --build backend ruff check .
	docker compose run --rm --build frontend pnpm exec tsc --noEmit
	docker compose run --rm frontend pnpm run lint

test-backend:
	docker compose run --rm --build backend pytest

test-frontend:
	docker compose run --rm --build frontend pnpm run test

test-e2e:
	@docker compose ps | grep -q "Up" || (echo "Run make up first" && exit 1)
	docker compose run --rm frontend pnpm exec playwright test --project=chromium
