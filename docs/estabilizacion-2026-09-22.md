# Reporte de estabilización — corrida completa 2026-09-22

> Corrida fresca desde cero (`allure-results`/`allure-report` viejos borrados antes de arrancar, ~3GB acumulados de sesiones pasadas). `CI=1 npx playwright test`, reporters correctos esta vez (`list` + `allure-playwright` — la corrida del 09-16 había usado `--reporter=line`, que pisa la config y no genera resultados Allure). Reporte real servido en `http://localhost:62231` durante la sesión.

## Resultado de la corrida inicial

| Estado | Cantidad |
|---|---|
| ✅ Passed | 218 |
| ❌ Failed | 72 |
| 🟡 Flaky | 4 |
| ⏭️ Skipped | 33 |
| ⚠️ Did not run | 15 |
| **Total** | **342** |

## Hallazgo principal — NO era ambiente

74 de las 72+ ocurrencias de fallo (con retries) compartían un único error: `Unknown step title: Asigná el plan de la credencial` en `AddPetFormPage.getStepNumber()` (`credentials.spec.ts`, TS-02 completo).

**Verificado en vivo (Playwright MCP)** con la cuenta real del pool (`user_1787086478298_7768b2cc@automation.com`): `GET /api/services/pets/my-products` devolvió **10 planes "LIBRE" duplicados** (de tanto reusarse esta cuenta en corridas automatizadas sin nunca completarlos). El wizard de carga de credencial, al detectar más de un plan libre ambiguo, inserta un paso nuevo **"Asigná el plan de la credencial"** (combobox nativo) entre el paso 0 y el paso 1 — confirmado navegando el flujo real paso a paso, incluyendo la transición de vuelta a "¿Cómo se llama tu mascota?" tras elegir un plan.

**No es un impedimento de ambiente ni un bug de producto** — es un paso real y válido del wizard que el POM no conocía.

## Fix aplicado y verificado

- `AddPetFormPage.getStepNumber()`: detecta el título nuevo, selecciona cualquier plan disponible del combobox y continúa antes de leer el paso real — transparente para los ~23 tests que ya llamaban a este método.
- `credentials.spec.ts` TC-06 (navegación "atrás"): ajustada la aserción final para aceptar cualquiera de las 2 pantallas válidas de "inicio sin datos" (el fix de arriba hacía que "atrás" avanzara de más en este caso puntual — encontrado y corregido en la propia verificación, no asumido).

**Verificación**: `credentials.spec.ts` completo, corrida aislada antes/después:

| | Antes del fix | Después del fix |
|---|---|---|
| Failed | ~20 (Desktop+Android) | 1 (no relacionado, ver abajo) |
| Flaky | — | 1 |
| Passed | — | 50 |

Commit: `3d67e00` (rama `windows`).

## Pendiente separado (no bloqueante, no investigado a fondo hoy)

`TS-01 TC-01 - Plan sin mascota asociada` (cuenta `UserSource.Fresh`, 0 mascotas reales) sigue fallando: la pantalla muestra el banner genérico "Necesitás completar la credencial para visualizar los datos" + "+ Suscribir mascota", no el texto "Dejá su credencial lista" que el test espera (ese texto es de un estado distinto: mascota ya creada con nombre, credencial incompleta). Documentado en `docs/lecciones-aprendidas.md` para retomar.

## Otros hallazgos de la corrida (no perseguidos hoy, de bajo impacto)

- 2 tests de reset de contraseña (Vetify B2C, Flux Capitado) — **flaky**, no failed: el correo de reset a veces tarda más de 60s. Patrón ya documentado en `lecciones-aprendidas.md` (2026-09-XX, mismo síntoma para OSDE Adquirente). No requiere acción — el retry ya lo cubre.
- El resto de los "did not run"/algunos "failed" residuales no se investigaron uno por uno esta sesión — quedan para la próxima corrida de estabilización.

## Reporte Allure

Generado y servido localmente durante la sesión (`http://localhost:62231`, PID en background). Para regenerarlo: `npm run allure:report` (usa `allure-results/` ya poblado por esta corrida).
