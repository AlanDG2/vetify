# QA Playbook

> Cómo se trabaja QA en este proyecto: convenciones operacionales, flujos repetidos, decisiones de equipo. Complementa las skills (que son el "cómo" técnico).

## Recibir una HU nueva

1. Identificar producto/sitio (Vetify B2C / webapp / institucional, OSDE Adquirente / Capitado, Flux Capitado) → determina bajo qué carpeta de `tests/projects/` va el spec y qué `SiteId` usar en el `userRequest`.
2. Si la HU viene de Jira → usar `adapters/jira/` (`npm run jira -- get <KEY>`) para traer título/descripción/subtareas.
3. Revisar si ya existe un POM para esa pantalla en `src/pages/<producto>/<app>/` (skill `qa-mcp-vs-pom`) antes de explorar con MCP.
4. Escribir el spec siguiendo la skill `qa-spec-conventions` (estructura `TS-XX`/`TC-XX`, `step()`, `setAllureDetails()`, `userRequest` del pool).
5. Correr localmente (`npm test -- <archivo>` o `npx playwright test -g "TC-XX"`) y confirmar verde antes de reportar cobertura — **en TODAS las plataformas configuradas para ese sitio** (ver regla de Desktop+Mobile abajo), no solo Desktop.
6. Si se descubre un bug real (no de ambiente) → `createDefect` vía `adapters/jira/client.mjs` (subtarea tipo Bug vinculada a la historia padre + comentario).

## Comandos frecuentes

```bash
npm test                      # toda la suite
npx playwright test -g "TC-01"  # por título
npm run allure:report          # generar + abrir reporte Allure
npm run jira -- get IMAS-123   # traer una historia de Jira (adapters/jira)
npm run figma                  # cliente Figma
```

## Reglas operacionales propias

- Nunca pedir un usuario "a mano" (email/password literal) salvo que el caso de prueba sea justamente sobre credenciales inválidas.
- No hay Xray — no existe flujo de "importar casos de prueba" a Jira en este proyecto. El DoD de cierre de HU es 5 criterios universales + 1 (bugs Jira vinculados resueltos), no 8 como en un proyecto con Xray.
- **Validar Desktop + Mobile, siempre (regla desde 2026-08-05)**: para cualquier automatización nueva o modificada, correr y confirmar verde tanto el proyecto Desktop como el Mobile/Android del mismo sitio en `playwright.config.ts` antes de reportarla como lista — no alcanza con Desktop solo. Hoy el proyecto mobile solo está habilitado para `Vetify WebApp` (`Vetify WebApp Android`, `devices['Pixel 5']`); si se habilita para otro sitio, la regla aplica igual ahí. Si un sitio todavía no tiene proyecto mobile configurado, avisar explícitamente que esa cobertura queda pendiente en vez de asumir que Desktop alcanza.
  - Antes de correr, limpiar el pool con `node scripts/maintenance/reset-pooled-user.mjs --all` si se sospecha algo raro — evita perder tiempo re-diagnosticando el mismo problema (ver `qa-workspace/known-issues.md` § pool `VETIFY_ADQUIRENTE`).
  - Si algo falla igual en ambas plataformas, no asumir "bug de producto" ni "inestabilidad de ambiente" sin antes leer el código del test que falla y aislar la causa (ver lección completa en memoria: `feedback_verify_before_concluding_flaky`).

## Ciclo de sprint (proceso real del equipo)

- **Ambientes**: Dev (solo devs) / QA (para probar, **no estable** — un fallo puede ser del ambiente) / Prod (no se testea, salvo excepción).
- Planning: complejidad = `AVG(Dev+QA)` (a veces `MAX`). Subtareas por feature: crear/actualizar casos de prueba, validar en QA, y definir la regresión a correr (se dice explícito en la planning).
- Semana 1 del sprint: Dev construye → se crean casos de prueba → se prueba en QA → se corre la regresión.
- Semana 2: pruebas manuales (deadline histórico jueves 16hs ARG) → viernes Review (feature lista para Prod).
- **La automatización de una feature va un sprint detrás** de su desarrollo/pruebas manuales — no se automatiza en el mismo sprint en que se construyó.
