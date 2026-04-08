# Análisis estático local

Este stack corre SonarQube y Semgrep sin mezclar herramientas de calidad con el `docker-compose.yml` principal del proyecto.

## Levantar SonarQube

```bash
docker compose -f docker-compose.static-analysis.yml up -d sonarqube-db sonarqube
```

Después abrí <http://localhost:9002>. El login inicial por defecto de SonarQube es `admin` / `admin`.

## Ejecutar Semgrep

```bash
docker compose -f docker-compose.static-analysis.yml --profile scan run --rm semgrep
```

El reporte queda en `ops/static-analysis/reports/semgrep-report.json`.

## Ejecutar SonarScanner

1. Creá un token en SonarQube.
2. Exportalo en tu shell:

```bash
export SONAR_TOKEN=<tu-token>
```

3. Corré el escaneo:

```bash
docker compose -f docker-compose.static-analysis.yml --profile scan run --rm sonarscanner
```

La configuración del proyecto está en `sonar-project.properties`.

## Coverage antes de SonarQube

Para que SonarQube no marque `0%` de cobertura, generá los reportes antes del scan:

```bash
make coverage-backend
make coverage-frontend
```

Esto produce:

- `backend/coverage.xml`
- `frontend/coverage/lcov.info`

Además, `sonar.typescript.tsconfigPaths` está fijado para que el analizador de TypeScript no recorra `tmp_repos/**` ni otros directorios scratch del workspace.

## Apagar el stack

```bash
docker compose -f docker-compose.static-analysis.yml down -v
```
