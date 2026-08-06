# SETUP — estado de aplicación del template en `automation-main`

Checklist de aplicación del template. Este proyecto YA EXISTÍA (no es un proyecto nuevo) — el template se adaptó a sus convenciones reales en vez de forzar las del template.

## 1. Identidad del proyecto
- [x] `qa-workspace/current-state.md` — completo: automation-main, Playwright+TS, Jira sin Xray, idioma mixto (títulos ES / código EN).
- [x] `qa-workspace/project-context.md` — completo: Vetify (B2C/institucional/webapp), OSDE (Adquirente/Capitado), Flux Capitado.
- [x] Idioma de tests → **no es un solo idioma**, ver `core/dod/dod-core.md` criterio 3 (títulos ES + código EN).

## 2. Ambiente
- [x] El proyecto ya tenía `.env` / variables de entorno propias antes de aplicar el template (`src/config/environment.ts`, `src/config/sites.ts`) — no se tocaron.
- [ ] Si se agregan nuevos sitios/productos, extender `src/config/sites.ts` (`SiteId`) — no `apps/e2e/config/urls.ts` (ese path es del template genérico, no existe en este proyecto).

## 3. Gestor de tickets (adaptador)
- [x] **Con Jira, sin Xray** → se construyó `adapters/jira/` (custom, NO el `jira-xray` del template) wrapping `scripts/jira/jira-client.mjs` ya existente. DoD = 5 universales + 1 (`adapters/jira/dod-ticket.md`) = 6.
- [x] `adapters/jira-xray/` (stub del template) eliminado — habría sido engañoso sin Xray real.
- [x] `adapters/none/adapter.config.json` → `"active": false`.

## 4. Prefijo de keys (si usás gestor)
- [ ] Confirmar el prefijo real de las keys de Jira de este proyecto (ej. `IMAS-123`) y ajustar el pattern en `core/schemas/*.json` si difiere de `^[A-Z]+-[0-9]+$`.

## 5. Hook del DoD
- [x] Registrado en `.claude/settings.json` (versionado, separado de `.claude/settings.local.json` que es local/gitignored y ya contenía config propia). El hook (`preflight-check.sh`) ya es dinámico — detecta el adaptador activo sin hardcodear nombre.

## 6. Verificar
- [ ] `npm run validate` → correr `core/validate/validate-control-plane.mjs` y confirmar OK (requiere agregar el script `"validate": "node core/validate/validate-control-plane.mjs"` a `package.json` si no está).
- [x] Primer POM y primer spec ya existían antes del template (`credentials.spec.ts`, `LoginPage.ts` de Vetify webapp) — usados como referencia real para reescribir las skills `qa-spec-conventions` y `qa-pom-authoring`.
- [ ] Crear `CLAUDE.md` y `AGENTS.md` en la raíz (pendiente — el template los trae vacíos/genéricos, hay que escribirlos a medida referenciando la estructura real: `src/pages`, `src/providers`, `tests/framework`, `tests/projects/*`, `scripts/jira`, `scripts/figma`).

## Nota de seguridad detectada durante la aplicación

`.claude/settings.local.json` (gitignored, no versionado) contiene un token real en texto plano (`ANTHROPIC_AUTH_TOKEN`). No se sube al repo por el `.gitignore`, pero si esa máquina/archivo se compartió por otro medio, rotar el token.

