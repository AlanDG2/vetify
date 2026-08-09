# IMAS-3216 — Automatización - Reseteo de Contraseña Capitado OSDE

- **Type**: Tarea
- **Parent**: (mismo epic que IMAS-3215, a confirmar en Jira — no se leyó vía API en este intake)
- **Estado de intake**: análisis de factibilidad para sprint planning (2026-08-06) — **no automatizar todavía**, solo lectura + validación de capacidad.

## Descripción

Igual a IMAS-3215 pero para usuarios Capitado OSDE. Ver texto completo de la HU (idéntico salvo el producto) en el ticket de Jira.

## Hallazgo de intake — no es una HU independiente a nivel técnico

`tests/projects/osde-capitado/user-management.spec.ts` (TS-02 Iniciar Sesión, ya en código y corriendo) usa `container.vetify.webapp.loginPage` — **la misma pantalla `/auth/login`, el mismo `VetifyWebappLoginPage`, los mismos `data-cy` y el mismo mensaje de error** que Vetify B2C. No existe (ni en `src/pages/`, ni en `src/config/sites.ts`/`environment.ts`) un "webapp" propio de OSDE Capitado — `siteWebappBaseUrls[SiteId.OSDE_CAPITADO]` apunta al mismo `VETIFY_WEBAPP_BASE_URL`. Esto coincide con `IMP-002` (`docs/impedimentos-bloqueos.md`): OSDE/Flux no tienen registro propio, reusan el de Vetify — el mismo patrón aplica a login y, todo indica, a reseteo de contraseña.

**Consecuencia para el diseño de casos**: no hace falta diseñar 18 CPs nuevos. El diseño de `docs/user-stories/IMAS-3215-reseteo-contrasena-b2c-vetify.tests.md` (TS-01 a TS-06, CP01-CP18) aplica tal cual — la única variable es qué pool de usuario se usa (`SiteId.OSDE_CAPITADO` en vez de `VETIFY_ADQUIRENTE`). Hay usuarios utilizables en el pool: `src/fixtures/users/pooled-users.json` tiene usuarios `OSDE_CAPITADO` con tags `ACTIVE` y `REGISTERED`.

## Qué falta confirmar antes de comprometer capacidad (no asumir)

1. **¿El email de recuperación es idéntico al de Vetify B2C o tiene un template propio de OSDE?** La UI es la misma pantalla, pero el contenido del correo (remitente, asunto, branding) podría diferir por producto — no se validó todavía con un usuario `OSDE_CAPITADO` real. La HU dice "correo... desde Vetify", lo que sugiere que no cambia, pero es una suposición a confirmar (10-15 min de exploración manual/MCP con un usuario del pool `OSDE_CAPITADO` alcanza).
2. **Mismo bloqueo que IMAS-3215**: `IMP-006` — sin infraestructura de lectura de casilla de correo (`IMAS-3467` sigue en Backlog). Esto bloquea los mismos CP06-CP09 (recepción/contenido del email, extracción del link) para este producto también.
3. Si el punto 1 se confirma (mismo flujo, mismo email), la automatización de esta HU es prácticamente **reutilizar el mismo spec parametrizado por `siteId`**, no una automatización desde cero.

## Estado

🟡 **No automatizado, diseño no requerido de cero (reusa IMAS-3215)**. Ver resumen de capacidad consolidado que se entregó en el chat de la sesión 2026-08-06 para el board del sprint.
