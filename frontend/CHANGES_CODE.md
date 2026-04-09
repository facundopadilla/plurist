# CHANGES_CODE — Inventario y code review (frontend + notas cruzadas)

**Propósito:** Registrar lo comentado en sesión (alineación producto/UX/tests) y un **code review** iterado (mínimo 3 pasadas) sobre rutas, deuda técnica, legibilidad, tipado y limpieza.

**Ámbito principal:** `frontend/src/`, `frontend/e2e/`. No sustituye CI ni revisión humana de flujos.

**Última actualización del documento:** 2026-04-09

---

## A. Contexto de trabajo reciente (lo ya mencionado al equipo)

| Tema                           | Qué se hizo / estado                                                                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Copy en inglés (canvas header) | Textos como red social → **Social network**, proveedor(es) → **provider(s)**, **Configure AI** / **Model** en `header-dropdowns.tsx`; test `header-dropdowns-ui.test.tsx` alineado.                     |
| Tests con fixtures en español  | Unidad: `apply-element-patch`, `canvas-store`, `use-chat-to-canvas`, `chat-sidebar` — fixtures pasados a inglés donde eran solo datos de prueba.                                                        |
| E2E “redes sociales”           | Archivo renombrado a `e2e/social-network-settings.spec.ts`; títulos/comentarios en inglés; botón **Connect** (antes `Conectar` en el spec).                                                             |
| Ruta “página de redes”         | Se refiere a la **pantalla de ajustes para conectar cuentas sociales** que el E2E intenta cargar en **`/settings/redes-sociales`**. No es un nombre de feature en el router actual (ver pasadas abajo). |
| Commit                         | Cambios de i18n/tests/E2E quedaron en historial git (p.ej. mensaje sobre UI en inglés y spec renombrado).                                                                                               |

**Relación con** `CHANGES_FRONTEND.md`:** Ese archivo es un **relevamiento estático** (ESLint, TS, Prettier, duplicación, `any`, hooks). **CHANGES_CODE** añade **rutas vs E2E**, **qué borrar o refactorizar**, y **decisiones\*\* explícitas; evitar duplicar tablas largas: remitir a allí para detalle de supresiones ESLint por archivo.

---

## B. Pasada 1 — Rutas, navegación y pruebas E2E

### B.1 Rutas registradas en `AppRouter` (`router.tsx`)

| Ruta                                                              | Notas                    |
| ----------------------------------------------------------------- | ------------------------ |
| `/`, `/login`, `/invite/:token`                                   | Público / auth           |
| `/dashboard`, `/design-bank`, `/projects`, `/projects/:projectId` | App con `AppShell`       |
| `/content`                                                        | Review de contenido      |
| `/contenido`, `/posts`                                            | Redirect a `/content`    |
| `/compose`                                                        | Canvas (lazy, sin shell) |
| `/settings/ai-providers`                                          | AI Providers             |
| `*`                                                               | `NotFoundPage`           |

**No hay** en el router de React:

- `/settings/redes-sociales`
- `/settings/integrations`

### B.2 Navegación lateral (`app-shell.tsx`)

Los ítems usan `testId` del estilo `nav-dashboard`, `nav-projects`, …, **`nav-ai-providers`** para Settings de IA.

**Inconsistencia detectada:** `e2e/social-network-settings.spec.ts` hace clic en **`nav-settings`**, que **no existe** en `navItems` actual. El test de “Settings → redes” está **desalineado** con la UI (o con un `testId` antiguo).

### B.3 E2E que apuntan a rutas no definidas en SPA

| Spec                              | URL usada                  | En router React |
| --------------------------------- | -------------------------- | --------------- |
| `social-network-settings.spec.ts` | `/settings/redes-sociales` | No              |
| `network-integrations.spec.ts`    | `/settings/integrations`   | No              |

**Interpretación:** Con **solo** el bundle React, esas URLs caen en **404** (`NotFoundPage`) salvo que otra capa (proxy, segunda app, HTML estático) las sirva — en este repo **no** está el `Route` correspondiente.

**Recomendación (elegir una):**

1. **Implementar** rutas + pantallas (integraciones sociales) y registrarlas en `router.tsx`, **o**
2. **`test.skip`** / quitar specs hasta exista la feature, **o**
3. **Redirigir** en router desde URLs legacy a la ruta real cuando exista (p.ej. `/settings/integrations` → componente único).

---

## C. Pasada 2 — Tamaño, legibilidad, tipado y patrones

### C.1 Archivos muy grandes (candidatos a dividir por dominio)

Aproximación por líneas (aprox.):

| Archivo                                              | ~Líneas | Riesgo                                        |
| ---------------------------------------------------- | ------- | --------------------------------------------- |
| `features/canvas/chat/chat-sidebar.tsx`              | ~1600   | Alto: mezcla UI, mutaciones, adjuntos, diseño |
| `features/canvas/editor/generate-variants-panel.tsx` | ~1300   | Alto                                          |
| `features/content/review-page.tsx`                   | ~1120   | Medio-alto                                    |
| `features/design-bank/design-bank-page.tsx`          | ~1070   | Medio-alto                                    |
| `features/canvas/header-dropdowns.tsx`               | ~770    | Medio                                         |

**Mejora sugerida:** extraer subcomponentes y hooks con nombres de dominio (`useChatAttachments`, `ReviewFilters`, etc.), sin cambiar comportamiento en el primer corte.

### C.2 Tipado

- **`as any`:** prácticamente acotado a `src/__tests__/test-dom.tsx` (mocks del entorno) — aceptable; opcional tipar `globalThis` mínimo.
- **`apiRequest<T>`** (`lib/api/client.ts`): retorna `JSON` como `T` sin validación en runtime — riesgo si el backend cambia; mejora posible: Zod en endpoints críticos (ya sugerido en `CHANGES_FRONTEND.md`).
- **Casts `as unknown as`:** en límites de librerías (tldraw `plurist-context-menu`, iconos dinámicos en `skills-panel`) — documentado; refactor opcional con mapas explícitos de iconos.

### C.3 Supresiones ESLint / hooks

Listado detallado por archivo: ver **`CHANGES_FRONTEND.md` §1 y §8**. Acción: cada `eslint-disable-next-line react-hooks/exhaustive-deps` debería tener **comentario de por qué** es seguro (varios ya lo tienen).

### C.4 Duplicación y constantes

- Rutas API `/api/v1/...` repartidas — centralización opcional (`lib/api/paths.ts`).
- Listas repetidas (`isImageSourceType`, formatos): consolidar en `constants` (ver `CHANGES_FRONTEND.md` §5).

---

## D. Pasada 3 — Qué eliminar, refactorizar, o marcar como deuda

### D.1 Eliminar o archivar (cuando se confirme que no hay dependencias)

| Ítem                                                                                   | Condición                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duplicación de carpetas landing obsoletas (`landing2` / `landing3` en informes viejos) | En el árbol actual **no** aparecen bajo `src/features` — no hay nada que borrar ahí hoy; vigilar imports muertos si reaparecen.                                                                                   |
| E2E huérfanos                                                                          | Si la decisión de producto es “aún no hay UI de integraciones”, **eliminar o skip** `social-network-settings.spec.ts` / partes de `network-integrations.spec.ts` que asumen rutas inexistentes evita ruido en CI. |

### D.2 Refactor prioritario (calidad / mantenimiento)

1. **Alinear E2E con `data-testid` reales** (`nav-settings` → convención acordada, p.ej. `nav-ai-providers` o añadir `nav-settings` como alias en el shell si el producto lo requiere).
2. **Router único de verdad:** documentar en README o en este archivo la lista de rutas SPA vs rutas solo-API.
3. **Partir** `chat-sidebar.tsx` y `generate-variants-panel.tsx` en módulos testeables.

### D.3 Tipado / robustez

- `parseErrorDetail` y respuestas JSON: schema ligero (Zod) en flujos auth y pagos de error al usuario.
- Revisar `catch (err)` en features críticos: patrón `unknown` + type guard (varios archivos ya lo hacen bien).

### D.4 Rutas “usadas” vs “solo redirect”

- **`/contenido` y `/posts`:** se usan como **compatibilidad**; mantener hasta que analytics diga que no hay tráfico.
- **`/settings/redes-sociales`:** hoy **no** está en el router — “uso” solo en E2E; no es ruta de producto hasta implementarse.

---

## E. Síntesis tras 3 pasadas (checklist de alineación)

| #   | Afirmación                                                                                                                                    | ¿Alineada con el repo?                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | El canvas header y tests asociados están orientados a **inglés** en strings de UI visibles.                                                   | Sí (revisar diffs recientes).                                                |
| 2   | La “página de redes” = **settings de integraciones sociales** referenciada por E2E en `/settings/redes-sociales`.                             | Sí (concepto); **implementación SPA pendiente** si se desea que deje de 404. |
| 3   | Hay **desajuste** E2E: `nav-settings` y rutas `/settings/*` no coinciden con `router.tsx` + `app-shell`.                                      | Sí — requiere corrección o skip.                                             |
| 4   | Los archivos más grandes concentran **deuda de modularización**, no fallos de TypeScript estricto.                                            | Sí.                                                                          |
| 5   | `CHANGES_FRONTEND.md` sigue siendo la fuente de **auditoría ESLint/Prettier/any**; este archivo añade **decisiones de producto/rutas/tests**. | Sí — mantener ambos sin copiar tablas enteras.                               |

---

## F. Próximos pasos sugeridos (orden práctico)

1. Decidir **producto:** ¿existe roadmap para UI de integraciones en `/settings/...`? Si no, **skip** E2E relacionados.
2. Corregir **`nav-settings`** en E2E o añadir el `testId` en el shell.
3. Registrar rutas en `router.tsx` cuando exista la pantalla; hasta entonces considerar **redirect** desde URLs legacy a 404 o a placeholder documentado.
4. Planificar **refactor por slices** en `chat-sidebar` / `generate-variants-panel` con tests de regresión (Vitest) antes de mover código.

---

## G. Verificación recomendada al tocar este área

```bash
cd frontend && pnpm typecheck && pnpm lint && pnpm exec vitest run
# E2E (con stack levantado):
# pnpm exec playwright test
```

---

_Fin del documento iterado (3 pasadas). Actualizar tras cambios en router, shell o E2E._
