# Contexto del proyecto

> Qué es el producto, sus módulos, sus actores, sus reglas macro. Lo que un QA nuevo necesita para ubicarse.

`automation-main` automatiza la QA E2E de varios productos/sitios agrupados bajo `tests/projects/`:

- **Vetify** — plataforma de gestión veterinaria/mascotas.
  - `vetify-b2c` — sitio de cara al dueño de mascota (adquirente).
  - `vetify-webapp` — panel interno (login, credenciales, gestión de mascotas — `myPetsPage`, etc.).
  - Institucional (`src/pages/vetify/institutional/`).
- **OSDE** — dos frentes: `osde-adquirente` y `osde-capitado`.
- **Flux** — `flux-capitado`.

Cada producto/sitio tiene su propio `SiteId` (`src/config/sites.ts`) y su propia jerarquía de POMs bajo `src/pages/<producto>/<app>/`. Los fixtures de Playwright exponen todo a través de un objeto `container` inyectado (DI), agrupado por producto/app (`container.vetify.webapp.loginPage`, `container.osdeAdquiriente.landingPage`, etc.), definido en `tests/framework/base-test.ts` + variantes por producto (`vetify-base-test.ts`, `osde-base-test.ts`).

**Actores de test**: no hay un único "admin QA" fijo. Los tests piden usuarios de un **pool real** (`UserProvider`, `src/providers/user/`) filtrados por `siteId` + `tags` (ej. `UserTag.ACTIVE`, `UserTag.WITH_PET`), con caché de sesión (`storageState`) por usuario para evitar logins repetidos.

**Reporte**: Allure es la fuente de verdad para precondiciones/pasos/resultado esperado de cada test (`setAllureDetails()` + `step()`), no comentarios sueltos en el código (aunque el código SÍ mantiene comentarios `// Precondiciones:` / `// Pasos:` / `// Resultado esperado:` como estructura legible).

**Gestión de tickets**: Jira (proyecto real, sin Xray/Zephyr) — el adaptador `adapters/jira/` envuelve `scripts/jira/jira-client.mjs` (ya funcional de una sesión previa: fetch de historias, creación de subtareas tipo Bug, comentarios, chequeo de links de bugs abiertos).
