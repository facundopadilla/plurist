# Relevamiento backend — mejoras de estilo, robustez y mantenibilidad

Documento de **auditoría orientada a refactors** sobre `backend/apps/` y `config/` (excluye `**/migrations/**` del análisis manual salvo mención).  
**No** sustituye a CI: es una lista de oportunidades concretas (archivo + línea aproximada).

**Fecha del relevamiento:** 2026-04-09.

---

## 1. PEP 8 y herramientas actuales

| Comprobación | Resultado |
|--------------|-----------|
| `ruff check backend/apps backend/config` | **Sin errores** con la configuración actual (`pyproject.toml`: reglas `E`, `F`, `W`, `I`, `line-length = 120`). |

**Implicación:** no hay violaciones que Ruff marque hoy; el cumplimiento “estricto” de PEP 8 adicional (docstrings obligatorios, anotaciones en todos los parámetros, `B` flake8-bugbear, `UP` pyupgrade, etc.) **no** está activado en el `select` de Ruff.

**Acción sugerida:** ampliar gradualmente `[tool.ruff.lint] select` (p. ej. `UP`, `B`, `SIM`) y/o ejecutar **mypy** sobre módulos críticos; volver a correr Ruff y documentar nuevas líneas aquí.

---

## 2. Importaciones dentro de funciones (lazy imports)

Criterio: `import` / `from … import` cuyo AST aparece **dentro del cuerpo** de una función (no al tope del módulo).  
**Conteo aproximado:** ~90 ubicaciones en `backend/apps/` (puede incluir duplicados por funciones anidadas en el mismo archivo).

**Motivos habituales en este repo:** evitar ciclos de importación, diferir costo de import (httpx/json), o imports solo en `AppConfig.ready()` / arranque MCP.

### Por carpeta (archivo:línea)

- **`analytics/`**  
  - `api.py:33` — `from apps.accounts.models import Workspace`

- **`design_bank/`**  
  - `api.py` — `100`, `189`, `305`, `307`, `317`, `353`, `354`, `484`, `486`, `524`  
  - `design_system_service.py` — `366`, `414`–`416`  
  - `scanners.py` — `38` — `from django.conf import settings`  
  - `storage.py` — `59` — `import io`  
  - `tasks.py` — `22`, `62`–`64`, `124`, `148`, `150`–`152`

- **`generation/`**  
  - `api.py` — `108`, `145`, `169`, `211`, `273`, `275`  
  - `chat_service.py` — `40`, `41`, `69`, `83`, `155`  
  - `prompt_builder.py` — `68`, `276`, `354`, `355`  
  - `services.py` — `20`, `81`, `143`  
  - `tasks.py` — `14`

- **`generation/providers/`**  
  - `anthropic_provider.py` — `51`, `53`, `96`  
  - `base.py` — `42`, `90`, `147`, `174`, `252`, `254`, `287`, `289`  
  - `errors.py` — `230`  
  - `gemini_provider.py` — `43`

- **`mcp/`**  
  - `server.py` — `37`–`41`, `57`, `64` (registro lazy de tools/resources)  
  - `resources.py` — múltiples `import json` y `list_providers` en handlers  
  - `tools/design_bank.py` — `83`  
  - `tools/generation.py` — `112`, `128`, `184`

- **`posts/`**  
  - `api.py` — `240`, `339`, `368`

- **`projects/`**  
  - `api.py` — `91`, `219`, `251`, `253`, `270`

- **`rendering/`**  
  - `api.py` — `126`, `201`, `248`, `281`  
  - `export.py` — `25`, `63`  
  - `tasks.py` — `11`, `19`

- **`workspace/`**  
  - `api.py` — `86`  
  - `apps.py` — `9` — `from . import signals` (patrón típico Django)  
  - `crypto.py` — `34` — `from django.conf import settings`

**Acción sugerida:** donde no haya razón de ciclo/import pesado, mover imports al tope agrupados (stdlib, third-party, Django, local) según PEP 8; donde el lazy import sea intencional, **documentar en un comentario** de una línea el motivo.

---

## 3. Funciones sin docstring y/o sin anotaciones de tipos

Heurística usada: funciones/métodos de primer nivel (y métodos de clase) **sin** `ast.get_docstring` y/o parámetros (excepto `self`/`cls`) **sin** anotación.

**Archivos con mayor “deuda” acumulada (ejemplos representativos):**

| Archivo | Notas |
|---------|--------|
| `apps/accounts/api.py` | Muchos helpers privados sin docstring; varios `request` sin tipo. |
| `apps/design_bank/design_system_service.py` | Numerosas funciones públicas/helper sin docstring. |
| `apps/posts/api.py` | Serializers/helpers `_post_out`, etc. |
| `apps/generation/chat_service.py` | Varios `_` sin docstring. |
| `apps/generation/providers/base.py` | Helpers internos sin docstring. |
| `apps/accounts/models.py` | `create_user` / `create_superuser` — parámetros sin anotación. |
| `apps/design_bank/api.py` | `_workspace_from_request`, `_source_to_out`, `_get_project` (parámetro `workspace` sin tipo). |
| `apps/skills/api.py` | Endpoints con `request` sin `HttpRequest`. |
| `apps/analytics/services.py` | `record_event` — parámetros sin anotación. |

**Ejemplos de línea (no exhaustivo):**

- `design_bank/api.py:99` — `_workspace_from_request(_request)` sin docstring; `_request` sin tipo.  
- `design_bank/api.py:108` — `_source_to_out` sin docstring.  
- `design_bank/api.py:313` — `_get_project(workspace, …)` — `workspace` sin anotación.  
- `accounts/auth.py:8` — `get_membership` sin docstring; `request` sin tipo.  
- `workspace/api.py:72`, `80` — handlers con `request` sin tipo.

**Acción sugerida:** priorizar endpoints públicos y funciones compartidas; añadir `HttpRequest`, tipos de retorno y docstrings de una frase donde aporte contrato o comportamiento no obvio.

---

## 4. Cadenas `if` / `elif` — candidatas a *structural pattern matching* (`match/case`)

### Ejemplo canónico (solicitado): `_infer_upload_source_type`

**Ubicación actual:** `apps/design_bank/api.py` **líneas 324–336**.

```324:336:backend/apps/design_bank/api.py
def _infer_upload_source_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext == "pdf":
        return DesignBankSource.SourceType.PDF
    if ext in IMAGE_UPLOAD_EXTENSIONS:
        return DesignBankSource.SourceType.IMAGE
    if ext == "css":
        return DesignBankSource.SourceType.CSS
    if ext == "html":
        return DesignBankSource.SourceType.HTML
    if ext in MARKDOWN_UPLOAD_EXTENSIONS:
        return DesignBankSource.SourceType.MARKDOWN
    return DesignBankSource.SourceType.UPLOAD
```

**Refactor sugerido:** `match ext:` con `case "pdf":`, `case e if e in IMAGE_UPLOAD_EXTENSIONS:`, etc. (Python ≥3.10; el proyecto usa 3.12).

**Otras zonas a revisar con búsqueda manual** (ramas repetidas por string/status): `generation/providers/errors.py` (mapas `_STATUS_MAP` ya ayudan), `_raise_upload_storage_error` en `design_bank/api.py:339` (cadena de `if` sobre nombres de excepción y substrings).

---

## 5. Constantes “en el módulo” → `constants.py` por paquete

**Ejemplo explícito** — `apps/design_bank/api.py` **líneas 20–22**:

- `SOURCE_NOT_FOUND`  
- `IMAGE_UPLOAD_EXTENSIONS`  
- `MARKDOWN_UPLOAD_EXTENSIONS`  

**Acción sugerida:** `apps/design_bank/constants.py` (o `constants/upload.py`) e importar desde `api.py` y cualquier otro módulo que duplique conjuntos de extensiones.

**Otros candidatos** (revisar duplicación y centralización):

- `apps/design_bank/validators.py` — ya concentra `DOWNLOAD_TIMEOUT`, `MAX_FILE_SIZE`, etc. (bien); alinear mensajes de error repetidos con el mismo patrón.  
- `tasks.py` — User-Agent hardcodeado, `4096`, `65536`, `countdown=60` (ver sección 6).  
- Strings de error repetidos en varios `HttpError(404, …)` / `500` en APIs.

---

## 6. Cadenas hardcodeadas y “magic numbers”

| Ubicación | Qué se observa |
|-----------|----------------|
| `design_bank/api.py:104` | `"Workspace not bootstrapped"` |
| `design_bank/api.py:303`, `321` | `"No file stored…"`, `"Project not found"` |
| `design_bank/api.py:343`–`348` | Mensajes de storage y umbral `exc_str[:120]` |
| `design_bank/api.py:309` | `expires_in=300` (TTL presigned) |
| `design_bank/api.py:496` | `payload.content[:4096]` — límite de snippet |
| `design_bank/tasks.py:50`, `111` | `content[:4096]`; `chunk_size=65536` |
| `design_bank/tasks.py:83`, `96` | `User-Agent: Plurist-DesignBank/1.0` |
| `design_bank/tasks.py:142`, `185` | `countdown=60` en retry Celery |
| `generation/api.py` (docstring ~269) | Referencia a URL por defecto Ollama en texto |
| `workspace/crypto.py` | Manejo genérico; ver sección 7 |

**Acción sugerida:** constantes con nombre en `constants` o `settings`, y mensajes de usuario vs internos separados si aplica i18n más adelante.

---

## 7. `except Exception` / manejo amplio y silencioso

Lista de **líneas con `except Exception`** (revisar si se loguea, se re-lanza o se convierte a error de dominio):

| Archivo:Línea |
|---------------|
| `generation/providers/openai_provider.py:68` |
| `generation/services.py:80` |
| `mcp/tools/content.py:198` |
| `generation/providers/ollama_provider.py:107` |
| `generation/providers/gemini_provider.py:83` |
| `projects/api.py:225` |
| `generation/prompt_builder.py:389` |
| `generation/api.py:287`, `304` |
| `generation/providers/anthropic_provider.py:91`, `136` |
| `generation/providers/base.py:311` |
| `generation/providers/openrouter_provider.py:53` |
| `workspace/crypto.py:37` |
| `generation/providers/errors.py:248` |
| `generation/tasks.py:18` |
| `rendering/api.py:129`, `262` |
| `design_bank/design_system_service.py:370`, `437` |
| `generation/chat_service.py:46`, `161`, `200` |
| `skills/management/commands/seed_skills.py:94` |
| `design_bank/tasks.py:51`, `137`, `180` |
| `design_bank/api.py:157`, `192`, `527` |

**Casos de riesgo particular (silencio o `pass`):**

- `design_bank/api.py:192`–`193` — `except Exception: pass` tras encolar Celery (fallo de cola queda invisible).  
- `design_bank/api.py:527`–`528` — `except Exception: pass` al borrar archivo en storage.  
- `generation/providers/errors.py:248`–`249` — `except Exception: pass` al leer `response.text`.  
- `generation/chat_service.py:46` — `except Exception:` (ver contexto para logging).  
- `generation/prompt_builder.py:389` — `except Exception:` sin nombre.  
- `workspace/crypto.py:37` — `except Exception:` (revisar si debe ser `except binascii.Error` o similar).

**Acción sugerida:** capturar excepciones **específicas** donde sea posible; si se usa `Exception`, **loguear** con `logger.exception` o `logger.warning` + `exc_info=True`; evitar `pass` salvo comentario que justifique aceptación del fallo.

---

## 8. F-strings vs concatenación o `.format()`

| Archivo:Línea | Patrón |
|---------------|--------|
| `generation/providers/base.py:143` | `word + " "` — considerar f-string o `join`. |
| `generation/prompt_builder.py:308` | `f"..." + "\n".join(lines)` — unificar con un solo f-string multilínea o `"\n".join` con prefijo. |
| `design_bank/storage.py:36` | `"." + original_filename.rsplit...` — menor; opcional f-string. |
| `skills/github_fetcher.py:116` | `pattern.format(skill=skill_name)` — candidato a f-string si se prefiere estilo uniforme. |

**Nota:** el uso de `.format()` no viola PEP 8; es preferencia de estilo del equipo.

---

## 9. `os.path` vs `pathlib`

| Archivo:Línea | Uso |
|---------------|-----|
| `design_bank/design_system_service.py:378` | `os.path.splitext(filename)` — candidato a `Path(filename).suffix` / stem. |

Otros módulos: `import os` en `generation/providers/base.py` y `workspace/crypto.py` — revisar si el uso es solo rutas (migrar a `Path`) o variables de entorno (`os.environ` sigue siendo idiomático).

---

## 10. Anidación profunda / complejidad ciclomática

No se ejecutó **radon** (no está en dependencias actuales). Criterio manual: funciones con **más de 3 niveles** de indentación sostenida o muchas ramas.

**Candidatos a revisar** (lectura humana / Sonar historial):

- `design_bank/design_system_service.py` — flujos de sync y descarga.  
- `generation/prompt_builder.py` — armado de secciones.  
- `generation/providers/base.py` — streaming y errores.  
- `design_bank/tasks.py` — `extract_from_url` (bucle redirects + lectura por chunks).

**Acción sugerida:** extraer funciones con nombres de dominio (`_follow_redirects`, `_download_with_limit`, etc.); mantener umbral alineado con reglas Sonar **S3776** ya trabajadas en el proyecto.

---

## 11. Variables no usadas y código muerto

No se ejecutó **vulture** ni análisis de referencias global en esta pasada.

**Acción sugerida:**

```bash
uv tool run vulture backend/apps --min-confidence 61
```

y/o reglas Ruff `F401`, `F841` (ya cubiertas por `F` en CI). Revisar imports condicionados y `__all__` antes de borrar.

---

## 12. Resumen de prioridades sugeridas

1. **Alta:** revisar `except Exception: pass` en `design_bank/api.py` (`192`, `527`) y errores de provider sin log.  
2. **Media:** extraer constantes de `design_bank/api.py` a `constants.py`; refactor `_infer_upload_source_type` con `match/case`.  
3. **Media:** completar tipos en handlers Ninja (`request: HttpRequest`) y docstrings en APIs públicas.  
4. **Baja:** unificar strings con módulo de mensajes; migrar el único `os.path.splitext` citado a `pathlib`.  
5. **Continua:** ampliar reglas Ruff / mypy según roadmap del equipo.

---

*Este documento se generó como relevamiento; las refactors concretas pueden abrirse como tareas o PRs por carpeta.*
