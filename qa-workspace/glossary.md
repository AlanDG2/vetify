# Glosario

> Términos del dominio del proyecto, para que el agente y el equipo hablen el mismo idioma.

| Término | Significado |
|---|---|
| `container` | Objeto de inyección de dependencias expuesto como fixture de Playwright (`tests/framework/base-test.ts` + variantes por producto). Agrupa instancias de POM por producto/app: `container.vetify.webapp.loginPage`, `container.osdeAdquiriente.landingPage`, etc. |
| `userRequest` | Fixture-option que describe qué usuario pedir al pool (`source`, `siteId`, `tags`, `reserve`, `ignoreReserved`). Se define con `test.use({ userRequest })`. |
| `UserProvider` | Módulo (`src/providers/user/`) que sirve usuarios reales de un pool y cachea su `storageState` para evitar logins repetidos entre tests. |
| `SiteId` | Identificador de producto/sitio (`src/config/sites.ts`) — distingue Vetify B2C, Vetify webapp, OSDE Adquirente, OSDE Capitado, Flux Capitado, etc. |
| `step()` | Helper de `allure-js-commons` que envuelve una acción o verificación dentro de un test, generando un paso nombrado en el reporte Allure. No confundir con el decorator `@step` de otros proyectos QA (no existe en este). |
| `setAllureDetails()` | Helper de `@tests/framework/base-test` que registra `preconditions`/`steps`/`expectedResult` de un test para el reporte Allure. |
| `TS-XX` | Prefijo de categoría/suite dentro de un `test.describe()` (Test Suite número XX). |
| `TC-XX` | Prefijo de caso de prueba individual dentro de un `test()` (Test Case número XX). |
| `adapters/jira/` | Adaptador de gestor de tickets de este proyecto — Jira real, sin Xray/Zephyr. Ver `adapters/jira/README.md`. |
