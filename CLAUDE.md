# CLAUDE.md — automation-main

> Índice ligero del cerebro QA de este proyecto. Los procedimientos multi-paso viven en `.claude/skills/` (cargan on-demand). Acá solo quedan las reglas **siempre visibles** (DoD, convenciones reales verificadas, mapa de navegación).
>
> 🧭 **Antes de cualquier tarea, leer [`AGENTS.md`](AGENTS.md)** — decision trees, inventario de skills, cuándo usar qué.
>
> Este proyecto **ya existía** antes de aplicar el template QA (`qa-automation-template-main`). Donde el template asumía algo genérico y el código real dice otra cosa, **gana el código real**. Ver `qa-workspace/decision-log.md` para el detalle de qué se adaptó y por qué.

---

## 🚨 PRE-FLIGHT — Definition of Done

Antes de declarar una HU "lista / al 100%":

- **5 criterios universales** (siempre): [`core/dod/dod-core.md`](core/dod/dod-core.md).
- **+ 1 criterio del adaptador `jira` activo** (0 bugs Jira abiertos vinculados a la historia): [`adapters/jira/dod-ticket.md`](adapters/jira/dod-ticket.md).

Total: **6 criterios**. El hook `.claude/hooks/preflight-check.sh` (registrado en `.claude/settings.json`) los inyecta automáticamente antes de cada respuesta — es dinámico, detecta el adaptador activo sin nombre hardcodeado.

**Regla dura**: si falta cualquiera de los 6 → la HU NO está al 100%. Decirlo honesto sin que el usuario pregunte.

---

## Qué es este proyecto

Automatización E2E con **Playwright + TypeScript** para varios productos/sitios:

| Producto | Carpeta en `tests/projects/` | Notas |
|---|---|---|
| Vetify B2C | `vetify-b2c/` | Sitio de cara al dueño de mascota |
| Vetify webapp | `vetify-webapp/` | Panel interno (login, credenciales, mascotas) |
| Vetify institucional | (POMs en `src/pages/vetify/institutional/`) | |
| OSDE Adquirente | `osde-adquirente/` | |
| OSDE Capitado | `osde-capitado/` | |
| Flux Capitado | `flux-capitado/` | |

Reporte con **Allure** (`allurerc.js`, `allure-results/`, `npm run allure:report`). Hay una capa de API en `src/api/` (`authentication-api.ts`, `base-api.ts`, `BaseApiClient.ts`, `vetify/`) además de la E2E.

---

## Convenciones REALES (verificadas en código, no asumidas)

### Idioma — mixto, no elegir uno solo

- **Títulos de negocio en español**, con prefijo `TC-XX` (caso) / `TS-XX` (suite): `test('TC-01 - Vetify - ...')`, `test.describe('TS-01 <categoría>')`.
- **Identificadores de código en inglés**: clases, métodos, variables, nombres de archivo. Fuente única de naming: [`documentation/development-standars.md`](documentation/development-standars.md) — no duplicar esas reglas acá, remitirse a ese archivo.

### Estructura de un spec (ver skill `qa-spec-conventions` para el detalle completo)

```
test.describe('<Feature> Test Suite')
  └─ test.describe('TS-XX <categoría>')
      └─ test.describe()  // anónimo, fija test.use({ userRequest })
          └─ test('TC-XX - <Producto> - <escenario>', { tag: ['@critical'] }, async ({ container, page }) => {
                // Precondiciones: / Pasos: / Resultado esperado: (comentarios SÍ permitidos)
                await setAllureDetails({ preconditions, steps, expectedResult });
                await step('1. ...', async () => { ... });
              })
```

- Comentarios estructurados **sí se usan** (no es el proyecto "cero comentarios" del template genérico).
- `step()` (de `allure-js-commons`) envuelve cada acción/verificación relevante — no hay decorator `@step` en los POMs.
- `setAllureDetails()` es obligatorio al inicio del test — alimenta el reporte Allure.

### Autenticación — pool de usuarios reales, no storageState global de un admin

`container.<producto>.<app>.loginPage.loginWithUserRequest(userRequest)` pide un usuario real del pool (`UserProvider.getUser()`), reusa `storageState` cacheado si existe, o hace login fresco y lo cachea. Nunca pedir un usuario "a mano" salvo que el caso sea justo sobre credenciales inválidas.

### POMs — jerarquía de 3 niveles, sin decorator

```
BasePage (src/pages/BasePage.ts)
  → <Producto><App>BasePage (ej. VetifyWebappBasePage)
    → <Pantalla>Page (ej. VetifyWebappLoginPage) — 1 archivo por pantalla, locators + métodos juntos
```

Carpetas: `src/pages/<producto>/<app>/`. Cada pantalla nueva se registra en el fixture `container` correspondiente (`tests/framework/base-test.ts`, `vetify-base-test.ts`, `osde-base-test.ts`) para quedar disponible en los specs.

### Gestor de tickets — Jira sin Xray

Adaptador activo: [`adapters/jira/`](adapters/jira/README.md) (real, wrapping `scripts/jira/jira-client.mjs`). `adapters/none/` está desactivado. No hay Xray/Zephyr — `listLinkedTests()`/`importTests()` del adaptador son no-op documentados, no asumir que existe tracking de test-execution en Jira.

Toda escritura real en Jira (`createDefect`, y cualquier script nuevo) sigue el guardrail de [`jira/update-rules.md`](jira/update-rules.md) + [`jira/jira-workflow.md`](jira/jira-workflow.md): leer → preview → OK explícito del usuario → ejecutar → verificar → línea en [`jira/sync-log.ndjson`](jira/sync-log.ndjson). `createDefect()` ya lo hace automático. `npm run validate:jira` (incluido en `npm run validate`) verifica que el guardrail siga presente.

---

## Comandos

```bash
npm test                          # toda la suite Playwright
npx playwright test -g "TC-01"    # por título
npx playwright test --ui           # UI mode
npm run allure:report              # generar + abrir reporte Allure
npm run jira -- get <KEY>          # traer historia de Jira (adapters/jira / scripts/jira)
npm run jira:check                 # smoke test de credenciales/proyecto Jira (401/403 → correr esto primero)
npm run jira:metadata -- --issue=<KEY>  # issue types, link types, o transiciones de un issue puntual
npm run figma                      # cliente Figma
npm run lint / npm run typecheck   # calidad de código
npm run validate                   # valida el control plane QA + el guardrail de escrituras Jira
npm run validate:jira              # solo el guardrail de escrituras Jira (jira/update-rules.md, sync-log, etc.)
```

---

## 🧩 Mapa de skills del cerebro

Skills en `.claude/skills/`, cargan on-demand (solo su `description` se precarga).

| Skill | Qué cubre | Se carga cuando |
|---|---|---|
| `qa-hu-intake` | Protocolo de análisis contextual antes de automatizar una HU | recibís una HU nueva |
| `qa-risk-test-design` | Diseño de casos por riesgo (NIST/ISTQB) | planeás cobertura de una HU |
| `qa-mcp-vs-pom` | Decisión: explorar con MCP vs leer POM existente | abordás una pantalla nueva/parcial |
| `qa-pom-authoring` | **Adaptada a este proyecto**: jerarquía real de POMs, sin `@step`, registro en `container` | tocás `src/pages/**` |
| `qa-spec-conventions` | **Adaptada a este proyecto**: estructura `TS-XX`/`TC-XX`, `step()`+`setAllureDetails()`, pool de usuarios | escribís/revisás un `.spec.ts` |
| `qa-troubleshooting` | Algo falló: auto-healing + bloqueo + impedimentos | un test falla / hay bloqueo |
| `qa-coverage-validation` | Reporte de cobertura CA→test + veredicto | auditás cobertura de una HU |
| `qa-testcase-auditor` | Gate GO/NO-GO de calidad antes de cargar casos | revisás casos antes de reportar |
| `qa-bug-report` | Reporte de bug estructurado (gating PASS/ENV) — usa `adapters/jira` para crear el Defect | reportás un bug |
| `qa-continuous-learning` | Ciclo de aprendizaje: qué documentar, cuándo promover a regla | cerrás una automatización |
| `doc-to-markdown` | PDF→texto antes de leerlo (ahorro de tokens) | vas a leer un `.pdf` |
| `skill-creator` / `skill-doctor` | Crear/auditar skills nuevas | necesidad recurrente no cubierta / revisión de salud del cerebro |

> Las 3 skills que tocan el gestor de tickets (`qa-coverage-validation`, `qa-testcase-auditor`, `qa-bug-report`) llaman a la interfaz de adaptador (`adapters/ticket-manager.interface.md`), nunca a Jira directamente — hoy resuelven contra `adapters/jira/client.mjs`.

---

## Arquitectura de carpetas (real)

- **`src/pages/`** — POMs, organizados por `<producto>/<app>/`.
- **`src/providers/`** — `user/` (pool de usuarios + `UserProvider`), `cupon/`.
- **`src/api/`** — capa de API (auth, base client, endpoints Vetify).
- **`src/config/`** — `environment.ts`, `sites.ts` (`SiteId`), `test-configuration.ts`.
- **`src/fixtures/`, `src/helpers/`, `src/integrations/`** (ej. `mercadopago/`), `src/scripts/`, `src/types/`.
- **`tests/framework/`** — `base-test.ts` (fixture `container` global + `TestContainer`), `vetify-base-test.ts`, `osde-base-test.ts`, `report-annotations-setup.ts`.
- **`tests/projects/`** — specs por producto (ver tabla arriba).
- **`scripts/jira/`** — cliente Jira real (`jira-client.mjs`, `jira-mcp-server.mjs`), ya funcional.
- **`scripts/figma/`** — cliente Figma real, ya funcional.
- **`documentation/development-standars.md`** — fuente única de naming/estilo de código.
- **`adapters/jira/`** — adaptador de ticket-manager para las skills QA (envuelve `scripts/jira/jira-client.mjs`).
- **`qa-workspace/`** — control-plane: `current-state.md`, `project-context.md`, `decision-log.md`, `glossary.md`, `known-issues.md`, `qa-playbook.md`, `context-index.json`.
- **`core/`** — DoD (`dod/dod-core.md`), schemas, `validate/validate-control-plane.mjs`, `lib/` (pipeline Python de parseo de HUs, heredado del template — ver `qa-workspace/known-issues.md`, pendiente de decidir si se conserva).
