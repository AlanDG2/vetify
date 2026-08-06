# Estado actual del proyecto QA (arranque del agente)

> Fuente de arranque por sesión. Mantener actualizado: el agente lo lee primero para no depender solo del chat.

- **Proyecto**: `automation-main` — automatización QA E2E de los productos **Vetify** (B2C, institucional, webapp) y **OSDE** (Adquirente, Capitado) + **Flux Capitado**.
- **Stack**: Playwright + TypeScript. Reporte con **Allure** (`allurerc.js`, `allure-results/`, `npm run allure:report`). Sin capa API separada por ahora (todo vive bajo `tests/projects/`).
- **Gestor de tickets**: **Jira, sin Xray/Zephyr** → adaptador activo `adapters/jira/` (ver `adapters/jira/README.md`). El adaptador `none` quedó desactivado (`adapters/none/adapter.config.json` → `"active": false`).
- **Escrituras Jira**: guardrail formal en [`jira/update-rules.md`](../jira/update-rules.md) + [`jira/jira-workflow.md`](../jira/jira-workflow.md) — toda escritura real (`createDefect`) loguea en `jira/sync-log.ndjson`, verificado por `npm run validate:jira`. Smoke test de credenciales: `npm run jira:check`. Metadata (issue types/link types/transiciones): `npm run jira:metadata -- --issue=<KEY>`.
- **Idioma de tests**: **mixto, no elegir uno solo** — títulos de `test.describe()`/`test()` en español con prefijo `TC-XX`/`TS-XX` (contenido de negocio); identificadores de código (clases, métodos, variables, archivos) en **inglés**, según `documentation/development-standars.md`. No es la convención "todo español" del template genérico.
- **Ambiente activo**: variables de entorno gestionadas vía `src/config/environment.ts` + `src/config/sites.ts` (multi-sitio: cada producto/país tiene su propio `SiteId`). Confirmar contra ese archivo antes de asumir nombres de env vars nuevos.
- **Autenticación de test**: pool de usuarios reales vía `UserProvider` (`src/providers/user/`), no `storageState` global de un solo usuario admin. Ver skill `qa-spec-conventions`.
- **Estructura real de specs**: `test.describe('<Feature> Test Suite')` → `test.describe('TS-XX <categoría>')` → `test.describe()` anónimo con `test.use({ userRequest })` → `test('TC-XX - <Producto> - <escenario>', { tag: [...] }, async ({ container, page }) => {...})`. Ver skill `qa-spec-conventions`.
- **POMs**: jerarquía `BasePage` → `<Producto><App>BasePage` → `<Pantalla>Page`, en `src/pages/<producto>/<app>/`. Sin decorator `@step` (el step lo pone el spec con `step()` de `allure-js-commons`). Ver skill `qa-pom-authoring`.
- **Integraciones ya construidas** (sesiones previas): Jira (`scripts/jira/`, sin Xray) y Figma (`scripts/figma/`) — ambas funcionales, ver memoria persistente de usuario para detalles de uso.
- **Política de ramas**: estilo GitHub (`feature/*`, `fix/*`, `chore/*`, `docs/*`).
- **Regla de evidencia**: no afirmar estado de test/cobertura sin archivo, lectura del gestor, u output de prueba.
- **Nota de seguridad abierta**: `.claude/settings.local.json` (gitignored, no se versiona) contiene un token real (`ANTHROPIC_AUTH_TOKEN`) en texto plano. No se sube al repo por el `.gitignore`, pero conviene rotarlo si se compartió esa máquina/archivo por otro medio.
