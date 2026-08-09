# IMAS-3217 — Automatización - Reseteo de Contraseña Capitado FLUX

- **Type**: Tarea
- **Parent**: (mismo epic que IMAS-3215, a confirmar en Jira — no se leyó vía API en este intake)
- **Estado de intake**: análisis de factibilidad para sprint planning (2026-08-06) — **no automatizar todavía**, solo lectura + validación de capacidad.

## Descripción

Igual a IMAS-3215 pero para usuarios Capitado FLUX. Ver texto completo de la HU (idéntico salvo el producto) en el ticket de Jira.

## Hallazgo de intake — mismo caso que IMAS-3216

Igual que OSDE Capitado (ver `docs/user-stories/IMAS-3216-reseteo-contrasena-capitado-osde.md`): Flux Capitado no tiene un "webapp" propio — `siteWebappBaseUrls[SiteId.FLUX_CAPITADO]` (`src/config/environment.ts`) apunta al mismo `VETIFY_WEBAPP_BASE_URL`, y el patrón de `IMP-002` (registro reusado de Vetify, sin página propia) aplica igual. Todo indica que login y reseteo de contraseña también son la misma pantalla `/auth/login` / `VetifyWebappLoginPage` — a confirmar con un usuario real del pool antes de comprometer capacidad.

**Consecuencia para el diseño de casos**: mismo diseño de `docs/user-stories/IMAS-3215-reseteo-contrasena-b2c-vetify.tests.md`, variando el pool a `SiteId.FLUX_CAPITADO`. Hay usuarios utilizables: `src/fixtures/users/pooled-users.json` tiene 1 usuario `FLUX_CAPITADO` con tag `ACTIVE` (pool más chico que OSDE Capitado — si se necesitan varios usuarios en paralelo para esta suite, puede quedar corto, similar al problema de pool chico documentado en `qa-workspace/known-issues.md` para `VETIFY_ADQUIRENTE`).

## Qué falta confirmar antes de comprometer capacidad (no asumir)

1. **¿El email de recuperación es idéntico al de Vetify B2C o tiene un template propio de FLUX?** Misma duda que IMAS-3216 — no validado todavía con un usuario `FLUX_CAPITADO` real.
2. **Mismo bloqueo que IMAS-3215/3216**: `IMP-006` — sin infraestructura de lectura de casilla de correo (`IMAS-3467` sigue en Backlog).
3. **Tamaño del pool `FLUX_CAPITADO`**: solo 1 usuario `ACTIVE` disponible hoy — suficiente para un caso feliz secuencial, insuficiente si se quieren correr casos en paralelo o repetir el flujo (el reseteo cambia la contraseña del usuario, lo que puede romper otros specs que dependen de la contraseña original de ese mismo usuario pooled si no se coordina bien el reset+revert).

## Estado

🟡 **No automatizado, diseño no requerido de cero (reusa IMAS-3215)**. Ver resumen de capacidad consolidado que se entregó en el chat de la sesión 2026-08-06 para el board del sprint.
