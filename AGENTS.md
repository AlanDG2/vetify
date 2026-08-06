# AGENTS.md — Navegación del cerebro QA (automation-main)

> Mapa neuronal: decision trees, inventario de skills, reglas duras. `CLAUDE.md` es el índice de convenciones; este archivo es la **navegación** (cuándo, dónde, qué usar). **NO se auto-carga** — cuesta 0 tokens hasta referenciarse.

## 🎯 Decision tree por tipo de tarea

### Recibí una HU nueva para automatizar
1. Identificar **producto/sitio**: Vetify (B2C / webapp / institucional), OSDE (Adquirente / Capitado), Flux Capitado → determina la carpeta en `tests/projects/` y el `SiteId` a usar en `userRequest`.
2. Si la HU viene de Jira → `npm run jira -- get <KEY>` (o `adapters/jira/client.mjs → fetchStory`) para traer título/descripción/subtareas.
3. Skill `qa-hu-intake`: recopilar contexto (impedimentos conocidos en `qa-workspace/known-issues.md`, lecciones previas, HUs vecinas, POMs existentes) antes de escribir código.
4. Skill `qa-risk-test-design`: decidir cuántos/qué casos por riesgo.
5. Skill `qa-mcp-vs-pom`: ¿ya existe un POM en `src/pages/<producto>/<app>/` para esta pantalla, o hay que explorar con MCP?
6. Skill `qa-pom-authoring` (adaptada a este proyecto): crear/extender el POM — jerarquía `BasePage → <Producto><App>BasePage → <Pantalla>Page`, sin decorator `@step`, locators cacheados en el constructor. Registrar la pantalla nueva en el fixture `container` (`tests/framework/*.ts`) si otros specs la van a necesitar.
7. Skill `qa-spec-conventions` (adaptada a este proyecto): escribir el spec — `test.describe('<Feature> Test Suite')` → `TS-XX` → `test.use({ userRequest })` → `test('TC-XX - <Producto> - <escenario>')`, con `setAllureDetails()` + `step()`.
8. Correr localmente (`npx playwright test -g "TC-XX"`) y confirmar verde ANTES de reportar cobertura.
9. Si algo falla → skill `qa-troubleshooting`.
10. Auditar: `qa-coverage-validation` (CA→test) + `qa-testcase-auditor` (gate de calidad).
11. Documentar aprendizajes → skill `qa-continuous-learning` (en `docs/lecciones-aprendidas.md` si el proyecto lo usa, o `qa-workspace/known-issues.md` para issues de ambiente).

### Encontré un bug
- Skill `qa-bug-report`: clasificar PASS / ENV_BLOCKED / bug real primero.
- Antes de mutar Jira → leer [`jira/update-rules.md`](jira/update-rules.md) y [`jira/jira-workflow.md`](jira/jira-workflow.md) (guardrail de escrituras: preview → OK explícito → ejecutar → verificar → `jira/sync-log.ndjson`).
- Si es un bug real de producto → `adapters/jira/client.mjs → createDefect({ parentKey, summary, description })` crea una subtarea tipo Bug vinculada a la historia padre + comenta en la historia, y **agrega sola una línea a `jira/sync-log.ndjson`** (éxito o error). **No existe Xray** — no hay "vincular Test Execution", el vínculo es directo HU↔Bug.
- Si es un fallo de ambiente/tooling → no crear Defect, documentar en `qa-workspace/known-issues.md`.

### Necesito diagnosticar un problema de conexión/metadata Jira
- `npm run jira:check` — smoke test de credenciales (`GET /myself` + `GET /project/<JIRA_PROJECT_KEY>`). Primera cosa a correr si `npm run jira`/`createDefect` falla con 401/403.
- `npm run jira:metadata -- --issue=<KEY>` — lista transiciones disponibles para ese issue. Sin `--issue`, lista issue types y tipos de link del proyecto (`JIRA_PROJECT_KEY`).

### Quiero auditar una HU existente / saber si está "al 100%"
- Ver checklist "PRE-FLIGHT — Definition of Done" de `CLAUDE.md`: 5 universales (`core/dod/dod-core.md`) + 1 del adaptador `jira` (`adapters/jira/dod-ticket.md`, "0 bugs Jira abiertos vinculados").
- Verificar con `adapters/jira/client.mjs → checkClosable(id)` si quedan bugs sin resolver vinculados.
- Skill `qa-coverage-validation` para el mapeo CA→test.

### Quiero explorar una pantalla nueva en UI
- MCP de navegador (Playwright): `browser_navigate` (con la URL real del `SiteId`, nunca hardcodeada) → `browser_snapshot` → mapear locators (`getByRole` > `getByLabel` > `[data-cy="..."]` — este proyecto usa `data-cy`, no `data-testid`). Ver skill `qa-mcp-vs-pom` y §2 de `qa-pom-authoring`.

### Quiero explorar Figma o comparar UI vs diseño
- Usar `npm run figma` / `scripts/figma/figma-client.mjs` (integración ya construida en sesión previa). Ver memoria persistente de usuario para contexto de uso si aplica.

## 🧩 Inventario de skills

Ver tabla completa en [`CLAUDE.md`](CLAUDE.md) §"Mapa de skills del cerebro". Las 2 que fueron **reescritas** (no copiadas del template genérico) son `qa-spec-conventions` y `qa-pom-authoring` — reflejan el patrón real verificado en `tests/projects/vetify-webapp/credentials.spec.ts` y `tests/framework/*.ts`. Las demás son metodología QA agnóstica de stack y se copiaron tal cual.

## 🚦 Reglas duras (NO negociables)

1. 🚫 **NUNCA hardcodear URLs.** Usar `src/config/environment.ts` / `src/config/sites.ts` (`SiteId`). Nunca `page.goto('https://...')` literal en un spec o POM.
2. 🚫 **NUNCA hardcodear credenciales ni pedir un usuario "a mano".** Usar `UserProvider`/`userRequest` (pool de usuarios reales). Excepción: el caso de prueba es específicamente sobre credenciales inválidas.
3. 🚫 **NUNCA duplicar locators** ya existentes en un POM. Leer el POM completo antes de extender (extender-nunca-romper).
4. 🚫 **NUNCA agregar el decorator `@step`** a un método de POM — no existe en este proyecto. El step visible en Allure lo pone el spec con `step()`.
5. 🚫 **NUNCA quitar los comentarios estructurados** (`// Precondiciones:`, `// Pasos:`, `// Resultado esperado:`) de un spec — son parte del contrato de legibilidad de este proyecto, a diferencia del template genérico que los prohíbe.
6. 🚫 **NUNCA inflar el estado de una HU.** Si falta un criterio del DoD (6 totales: 5 universales + 1 del adaptador `jira`) → decirlo honesto sin que el usuario pregunte.
7. 🚫 **NUNCA asumir que existe Xray/Zephyr.** No hay tracking de test-execution en Jira — `listLinkedTests()`/`importTests()` de `adapters/jira/` son no-op documentados.
8. ✅ **SIEMPRE pedir OK explícito antes de crear un Defect en Jira** (`createDefect`) — es una escritura real e irreversible en el sistema del equipo. Seguir la secuencia de [`jira/jira-workflow.md`](jira/jira-workflow.md): leer → preview → OK → ejecutar → verificar → `jira/sync-log.ndjson`.
9. ✅ **SIEMPRE separar bug de producto vs fallo de ambiente** antes de decidir si corresponde un Defect.
10. ✅ **SIEMPRE remitirse a `documentation/development-standars.md`** para naming de código — no duplicar esas reglas en las skills ni en `CLAUDE.md`.

## 🔌 Gestor de tickets

Adaptador activo: **`adapters/jira/`** (real, sin Xray). Ver [`adapters/jira/README.md`](adapters/jira/README.md) para operaciones soportadas (reales vs no-op) y variables de entorno requeridas (`JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`).

`adapters/none/` quedó desactivado (`"active": false`). Si en el futuro este proyecto suma Xray/Zephyr, crear un adaptador `jira-xray` nuevo (no reactivar uno genérico) siguiendo `adapters/ticket-manager.interface.md`, y sumar sus 3 criterios extra de DoD en vez del 1 actual.

### Guardrail de escrituras Jira (adaptado de `precredit`, mismo equipo)

| Archivo | Qué cubre |
|---|---|
| [`jira/update-rules.md`](jira/update-rules.md) | Reglas no negociables para cualquier mutación Jira (leer→preview→OK→ejecutar→verificar→log) + reglas de qué SÍ/NO va en un comentario Jira |
| [`jira/jira-workflow.md`](jira/jira-workflow.md) | Secuencia obligatoria paso a paso, mutaciones permitidas/prohibidas, manejo de errores parciales |
| [`jira/sync-log.ndjson`](jira/sync-log.ndjson) | Bitácora append-only — una línea JSON por intento real de `createDefect()` (éxito o error). La escribe sola `adapters/jira/client.mjs` |
| `scripts/validate/validate-jira-guardrails.mjs` (`npm run validate:jira`, incluido en `npm run validate`) | Verifica que el guardrail siga presente y que `createDefect()` siga logueando en `sync-log.ndjson` |

Si se agrega un script nuevo que escriba en Jira (fuera de `createDefect`), debe loguear también en `jira/sync-log.ndjson` y seguir la secuencia de `jira-workflow.md` — si no, el validador no lo exige automáticamente (solo cubre `createDefect`), así que es responsabilidad de quien lo escriba.

## 🪝 Hooks

- `.claude/hooks/preflight-check.sh` — inyecta el DoD compuesto (5 universales + criterios del adaptador activo, detectado dinámicamente por script) en cada prompt. Registrado en `.claude/settings.json` (versionado). **No confundir con `.claude/settings.local.json`** (gitignored, contiene config personal/tokens de otra herramienta — no relacionado con este hook).

## 📁 Estructura

Ver `CLAUDE.md` §"Arquitectura de carpetas (real)".

## Pendientes conocidos (no bloqueantes)

- `core/lib/*.py` (pipeline Python de parseo de HU heredado del template) — decidir si se conserva, se reemplaza por `.mjs`, o se elimina. Ver `qa-workspace/known-issues.md`.
- Confirmar prefijo real de las keys de Jira de este proyecto y ajustar `core/schemas/*.json` si no matchea `^[A-Z]+-[0-9]+$`.
- Nota de seguridad: `.claude/settings.local.json` (gitignored) tiene un token en texto plano — rotar si esa máquina/archivo se compartió por otro medio.
