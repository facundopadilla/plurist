.PHONY: up down lint test-backend test-frontend test-e2e seed-test-accounts

up:
	docker compose up -d --build --wait
	$(MAKE) seed-test-accounts

seed-test-accounts:
	docker compose exec -T backend python manage.py seed_test_accounts

down:
	docker compose down -v --remove-orphans

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
	docker compose run --rm -e BASE_URL=http://frontend:5173 -e BACKEND_URL=http://backend:8000 frontend pnpm exec playwright test --project=chromium
