.PHONY: up down lint audit-backend test-backend test-frontend test-e2e seed-test-accounts

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

# Dependency CVE scan, import boundaries, Django system checks (no Docker; uses uv).
audit-backend:
	cd backend && uv run pip-audit
	cd backend && PYTHONPATH=. uv run lint-imports
	cd backend && DJANGO_SETTINGS_MODULE=config.settings.test PYTHONPATH=. uv run python manage.py check

test-backend:
	docker compose run --rm --build backend pytest

test-frontend:
	docker compose run --rm --build frontend pnpm run test

coverage-backend:
	cd backend && set -a && . ../.env && set +a && uv run --extra dev pytest --cov=apps --cov=config --cov-report=xml:coverage.xml --cov-report=term || true
	cd backend && python3 -c "exec('''import xml.etree.ElementTree as ET\npath = \"coverage.xml\"\ntree = ET.parse(path)\nroot = tree.getroot()\nsources = root.find(\"sources\")\nfor child in list(sources):\n    sources.remove(child)\nnode = ET.SubElement(sources, \"source\")\nnode.text = \"backend\"\nfor package in root.find(\"packages\"):\n    package_name = package.attrib.get(\"name\", \"\")\n    classes = package.find(\"classes\")\n    for klass in classes:\n        filename = klass.attrib.get(\"filename\", \"\")\n        if filename.startswith(\"apps/settings/\"):\n            klass.attrib[\"filename\"] = filename.replace(\"apps/settings/\", \"config/settings/\", 1)\n            continue\n        if filename.startswith((\"apps/\", \"config/\")):\n            continue\n        prefix = \"config\" if package_name == \".\" or filename.startswith(\"settings/\") else \"apps\"\n        klass.attrib[\"filename\"] = f\"{prefix}/{filename}\"\ntree.write(path, encoding=\"utf-8\", xml_declaration=True)\nprint(\"Normalized coverage.xml paths for SonarQube\")\n''')"

coverage-frontend:
	cd frontend && pnpm exec vitest run --coverage
	python3 -c "exec('''from pathlib import Path\npath = Path(\"frontend/coverage/lcov.info\")\nlines = path.read_text(encoding=\"utf-8\").splitlines()\nnormalized = []\nfor line in lines:\n    if not line.startswith(\"SF:\"):\n        normalized.append(line)\n        continue\n    source_path = line[3:]\n    if source_path.startswith(\"frontend/\"):\n        normalized.append(line)\n        continue\n    marker = \"/frontend/\"\n    if marker in source_path:\n        source_path = \"frontend/\" + source_path.split(marker, 1)[1]\n    elif source_path.startswith(\"src/\"):\n        source_path = f\"frontend/{source_path}\"\n    normalized.append(f\"SF:{source_path}\")\npath.write_text(chr(10).join(normalized) + chr(10), encoding=\"utf-8\")\nprint(\"Normalized lcov.info paths for SonarQube\")\n''')"

coverage: coverage-backend coverage-frontend

test-e2e:
	@docker compose ps | grep -q "Up" || (echo "Run make up first" && exit 1)
	docker compose build frontend
	docker compose run --rm -e CI=1 -e BASE_URL=http://frontend:5173 -e BACKEND_URL=http://backend:8000 frontend pnpm exec playwright test --project=chromium
