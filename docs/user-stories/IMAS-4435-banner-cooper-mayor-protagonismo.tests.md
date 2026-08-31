# Diseño de casos — IMAS-4435 Banner Cooper con mayor protagonismo

> Diseño basado en riesgo (`qa-risk-test-design`), cruzado contra los 10 criterios de aceptación reales (ver `IMAS-4435-banner-cooper-mayor-protagonismo.md`). Automatizado en `tests/projects/vetify-webapp/navigation.spec.ts` (TS-04 + TS-05), verificado pasando en Desktop y Mobile (Android) 2026-08-31.

## TS-01 Banner Cooper disponible y con mayor protagonismo (AC 1, 2, 5)
**Riesgo: ALTO** (es el entregable principal de la HU).

**CP01 - Verificar que el banner de Cooper es visible en Home para Vetify B2C** ✅
- Dado: usuario Vetify B2C logueado
- Cuando: carga Home
- Entonces: el banner "Ir a Cooper" es visible ("Beneficio exclusivo clientes Vetify", 20% off primer servicio)
- Trazabilidad: AC1. Automatizado: `TS-05 TC-01`

**CP02 - Verificar que el banner de Cooper es visible en Home para OSDE Capitado** ✅
- Mismo patrón que CP01, cuenta OSDE Capitado
- Trazabilidad: AC1. Automatizado: `TS-05 TC-02`

**CP03 - Verificar que el banner de Cooper es visible en Home para OSDE Adquirente** ✅
- Mismo patrón que CP01, cuenta OSDE Adquirente (confirma que `IMAS-4465` sigue arreglado)
- Trazabilidad: AC1. Automatizado: `TS-05 TC-03`

**CP04 - Verificar que el banner se ve correctamente en mobile (responsive)** ✅
- Dado: cualquiera de las 3 cuentas de CP01-03
- Cuando: se accede desde el proyecto "Vetify WebApp Android"
- Entonces: mismo resultado que Desktop, sin diferencias
- Trazabilidad: AC5. Verificado corriendo TS-04+TS-05 completo contra `--project="Vetify WebApp Android"`, 6/6 casos pasando

**CP05 - Verificar que el banner de Cooper tiene mayor protagonismo visual que Vetify PLUS** ⏳ no verificable por automatización
- No es un criterio de comportamiento funcional (posición/tamaño/jerarquía visual) — validación de diseño, ya cubierta por el sign-off de `IMAS-4448`/`IMAS-4449` (Hecho)
- Trazabilidad: AC2

## TS-02 Redirección al hacer clic (AC 6)
**Riesgo: MEDIO** (ya confirmado en la investigación original de IMAS-4356, sin cambios esperados).

**CP06 - Verificar que el botón "Ir a Cooper" redirige a la URL correcta** ✅ (confirmado en IMAS-4356, no reautomatizado como aserción nueva)
- Dado: banner de Cooper visible
- Cuando: se hace clic en "Ir a Cooper"
- Entonces: abre pestaña nueva a `https://www.cooperpetcare.app/?referral_code=VTFY-2026`
- Trazabilidad: AC6, fuente = verificación previa en `IMAS-4356-banner-cooper-webapp-osde.tests.md` CP02

## TS-03 No afecta otros banners/componentes — regresión (AC 7, 9)
**Riesgo: MEDIO** (impacto medio si rompe algo existente; probabilidad baja, cambio aislado a un componente nuevo).

**CP07 - Verificar que el resto de la Home sigue funcionando con el banner de Cooper presente** ✅ implícito
- Dado: cualquier cuenta con el banner de Cooper visible
- Cuando: se carga Home completo
- Entonces: las secciones Emergencias, Asistencia presencial, Videollamada y Planes y coberturas siguen visibles y funcionales, sin errores
- Trazabilidad: AC7 — cubierto implícitamente en cada corrida de TS-05 (el `homePage.load()` espera las respuestas de `pets/my-products` y `users/me`, y el resto de la pantalla se verifica renderizada en cada snapshot)

**CP08 - Verificar 0 bugs abiertos vinculados a la implementación** ✅
- `checkClosable('IMAS-4435')` → `closable: true`, 0 issuelinks de tipo bug
- Trazabilidad: AC9

## Menú "Beneficios" (segmentación Cooper/Vetify PLUS — comparte alcance con IMAS-4356)

**CP09 - Verificar que el menú de Vetify B2C muestra Cooper y Vetify PLUS juntos** ✅
- Automatizado: `TS-04 TC-01` (ya existía, sigue vigente tras la reestructuración a "Beneficios")

**CP10 - Verificar que el menú de OSDE Capitado muestra solo Cooper** ✅
- Automatizado: `TS-04 TC-02` (Vetify PLUS oculto) + `TS-04 TC-03` (Cooper visible)

**CP11 - Menú de OSDE Adquirente** ⏳ DBD a propósito
- No automatizado: depende del `policyId` real de la cuenta (ver `docs/conocimiento-sistema.md`), no del segmento — una aserción fija daría falsos negativos/positivos según qué cuenta del pool le toque. Requiere una cuenta con `policyId` de catálogo OSDE confirmado para diseñarse correctamente.

## AC de proceso/diseño, no verificables por QA vía automatización

AC3 (validación previa de stakeholders), AC4 (identidad visual Vetify), AC8 (se realizaron pruebas — meta-criterio de este mismo documento), AC10 (validación final de Negocio/Producto antes de Prod) — quedan satisfechos por el estado Hecho de las subtareas de diseño/arquitectura y por este mismo documento, no requieren un CP de Playwright.
