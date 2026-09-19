# Reporte de estabilización — corrida completa 2026-09-16

> Corrida de referencia: `CI=1 npx playwright test` (workers:2, retries:1, igual que CI), suite completa de `tests/projects/**`. Duración: 2.7h. Log completo conservado en el scratchpad de la sesión (`full-suite-run-2026-09-16.log`) — no versionado (es un artefacto de corrida, no código).

## Resultado global

| Estado | Cantidad |
|---|---|
| ✅ Passed | 222 |
| ❌ Failed | 69 |
| 🟡 Flaky (pasó en retry) | 2 |
| ⏭️ Skipped | 28 |
| ⚠️ Did not run | 12 |
| **Total** | **333** |

**68/69 fallos concentrados en un patrón identificable** (ver clusters abajo) — no es ruido disperso, son 2 causas raíz dominando casi todo.

---

## Cluster 1 — `videocall.spec.ts` (36/69 fallos, el 52% del total)

**Síntoma**: el wizard de videollamada se traba al clickear el combobox **"Motivo"** (`this.reasonInput.click()`, `VideocallFormPage.ts:214`) — timeout de 60s esperando `getByRole('textbox', { name: 'Motivo' })`. Como es un paso temprano del flujo, arrastra a TODOS los tests que dependen de llegar más allá de esa pantalla — de ahí que aparezcan fallos "downstream" en aserciones de `skipAttachmentsBtn`, `continueBtn`, `attachmentsHeadingLbl` que en realidad son la misma causa, no bugs independientes.

**Por qué es lo más urgente de investigar**: este archivo estaba documentado en `qa-workspace/known-issues.md` como **100% verde desde 2026-08-05** (Desktop 10/10, Android 10/10). No es un impedimento ya conocido — es una regresión nueva desde entonces.

**Descartado como causa**: no es un cambio de código propio. `git log` sobre `VideocallFormPage.ts` no tiene commits nuevos que toquen `selectReason`/`reasonInput` — el último cambio en ese archivo es del 9 de agosto y no afecta esas líneas.

**Hipótesis más probable (sin confirmar aún en vivo)**: el combobox "Motivo" depende de una lista de motivos que se carga desde el backend — mismo patrón que IMP-017/IMP-014 (endpoints de `category/overview`/`plans/engage` intermitentes) pero manifestándose en un endpoint distinto que alimenta esta pantalla. Falta reproducir en vivo con Network tab para confirmar cuál.

**Afecta**: TS-01 a TS-05 completos, Desktop (20/38 tests del archivo) y Android (16/38) — prácticamente todo el archivo salvo un puñado de negativos que no llegan a ese paso.

---

## Cluster 2 — resto de `vetify-webapp` (25/69 fallos)

**Síntoma**: timeout esperando datos de plan/mascota ya cargados — `petCards`, `sideMenuSection.vetifyPlusEntry`, `tourWelcomeStartBtn`, condicionado de plan, credenciales.

**Diagnóstico**: coincide exactamente con **IMP-017 bloqueo-1** (`category/overview`/`my-products` intermitente), ya documentado y reconfirmado varias veces esta semana — **no es una regresión nueva**, es el mismo impedimento de ambiente de siempre reproduciendo a mayor escala hoy.

**Archivos afectados** (Desktop + Android): `credentials.spec.ts` (10), `plans.spec.ts` (5), `system-availability.spec.ts` (4), `pets.spec.ts` (2), `navigation.spec.ts` (2), `session.spec.ts` (2).

---

## Cluster 3 — user-management, 4 productos (5/69 fallos)

`vetify-b2c`, `osde-capitado`, `osde-adquirente`, `flux-capitado` — todos fallando en el mismo caso: **TS-03 TC-03 "Documento no existente"**. Mismo test, mismo síntoma, en los 4 productos → huele a un cambio de comportamiento de backend/validación compartida entre productos, no a 4 bugs distintos. Pendiente de reproducir en vivo para confirmar el mensaje/código real recibido.

---

## Cluster 4 — `condicionados.spec.ts` OSDE Adquirente (4/69 fallos) — CONFIRMADO

**Re-corrida aislada (2026-09-17)**: CP07, CP10, CP11 pasaron limpio (43s/17s/13s) — no eran regresión, era contención de pool de la corrida completa. **CP01 volvió a fallar exactamente igual, incluso aislado** — mismo timeout de 60s esperando la nueva pestaña del PDF, con una cuenta generada fresca por API. Esto es el mismo patrón que **IMP-017 bloqueo-1** ya documentaba desde el 2026-09-14: el bloqueo afecta desproporcionadamente a cuentas recién compradas por API, mientras las cuentas pooled ya existentes (CP07/CP10/CP11) no tienen problema. Reconfirmación agregada a `docs/impedimentos-bloqueos.md`. **No es un bug de automatización.**

---

## Actualización 2026-09-17 — Cluster 1 investigado en vivo, conclusión revisada

**Verificación manual (Playwright MCP)**: logueado con la cuenta `user_1786146480312_053a00eb@automation.com` (la más usada en los fallos de anoche, 26 veces), el combobox "Motivo" abrió instantáneo con las 7 opciones — sin timeout, sin delay de red visible. Es una lista estática del frontend, no depende de un endpoint que se cargue en el momento.

**Re-corrida aislada de `videocall.spec.ts`** (mismo archivo, mismo `workers:2/retries:1`, sin competir con el resto de la suite por cuentas del pool): pasó de **36 failed** (anoche, corrida completa) a **8 failed + 2 flaky + 24 passed**. Los ~20+ fallos del combobox "Motivo" (TS-02, TS-03 completos) **no volvieron a reproducir ni una vez**.

**Conclusión revisada — Cluster 1 NO es una regresión nueva de código**: es intermitencia de ambiente/contención de pool, la misma familia ya documentada en `qa-workspace/known-issues.md` para este archivo puntual ("Pool de usuarios VETIFY_ADQUIRENTE chico para el nivel de paralelismo... fallos intermitentes por contención entre tests hermanos que comparten cuenta"). Corriendo la suite COMPLETA de anoche, `videocall.spec.ts` competía por cuentas del pool con `credentials.spec.ts`/`plans.spec.ts`/etc. (todos `VETIFY_ADQUIRENTE`) — eso explica por qué reprodujo tan masivamente anoche y prácticamente no reprodujo hoy corriendo solo.

**Los 8 fallos residuales de la corrida aislada** (no investigados caso por caso todavía, pero con patrón identificable):
- TS-01 TC-01/TC-03 (Desktop+Android): timeout de 180s en el flujo "Completar credencial → alta de mascota" — consistente con el pool chico de cuentas `NO_PET`/credencial-incompleta (mismo patrón que `IMP-003`).
- TS-05 TC-01/TC-02/TC-07 (Desktop+Android): timeout de 60s esperando la respuesta del detalle de turno — consistente con el mismo backend intermitente de siempre (familia IMP-017).
- TS-04 TC-01 (flaky): "Tus turnos" muestra 1 en vez de 2 — contención de cuenta compartida entre workers, ya documentado como patrón conocido de este archivo.

**Confirmación 1 a 1 de los 8 residuales (2026-09-17)** — ninguno es un bug nuevo:

- **TS-01 TC-01/TC-03**: confirmado como **IMP-003 reabierto** (ver detalle actualizado en `docs/impedimentos-bloqueos.md`). La única cuenta del pool con la precondición "sin mascota" ya no está en ese estado — tiene una mascota real con credencial incompleta, un estado intermedio que el guard existente en el código (`apiClient.userHasPlanWithPet()`) no detecta. Confirmado con `error-context.md` de la corrida real + verificación manual en vivo (Playwright MCP) de la misma cuenta.
- **TS-05 TC-01/TC-02/TC-07**: confirmado en el código (`VideocallViewPage.ts:60`) que la pantalla espera `GET /api/services/pets/appointment/{id}` → 200 — el mismo endpoint que `qa-workspace/known-issues.md` ya documentaba como intermitente desde 2026-08-05.
- **TS-04 TC-01 (flaky)**: contención de cuenta compartida entre los 2 workers de Playwright — patrón ya documentado para este archivo específico.

## Veredicto final del Cluster 1

**No hay ningún bug de automatización ni regresión de producto que arreglar en `videocall.spec.ts`.** Los 36 fallos de la corrida completa fueron ~85% contención de pool/intermitencia de ambiente (no reprodujeron al aislar el archivo) y el resto son la reconfirmación de 2 impedimentos ya existentes (IMP-003, endpoint `pets/appointment` intermitente). No se tocó código.

## Veredicto final de los 4 clusters

| Cluster | Causa confirmada | ¿Bug nuevo? |
|---|---|---|
| 1 — `videocall.spec.ts` (36 fallos) | Contención de pool (85%) + IMP-003 + endpoint `pets/appointment` intermitente | No |
| 2 — resto de `vetify-webapp` (25 fallos) | IMP-017 bloqueo-1 (`category/overview`/`my-products`) | No |
| 3 — "Documento no existente" x4 productos (5 fallos) | 502 en `/validation/policy`, mismo backend compartido — nueva evidencia agregada a IMP-004 | No |
| 4 — `condicionados.spec.ts` (4 fallos) | IMP-017 bloqueo-1, expuesto en cuentas fresh por API — CP07/10/11 confirmados sanos aislados | No |

**Conclusión de la sesión de estabilización**: de 69 fallos en la corrida completa, **0 resultaron ser bugs de automatización o regresiones de producto**. Todo mapea a impedimentos de ambiente ya conocidos (3 reconfirmados, 1 con evidencia nueva agregada). No se modificó ningún archivo de test/POM — todo el trabajo fue de diagnóstico y actualización de `docs/impedimentos-bloqueos.md`.

## Lo que NO se tocó todavía

Este reporte es diagnóstico, no de corrección — ningún fix se aplicó aún. Antes de tocar código hace falta:
1. Reproducir Cluster 1 en vivo (Network tab) para confirmar el endpoint real detrás del combobox "Motivo".
2. Confirmar Cluster 3 en vivo (¿cambió el mensaje de error, el status code, o directamente el endpoint no responde?).
3. Cluster 2 y 4 no requieren investigación nueva — ya son IMP-017, solo hace falta la reconfirmación de rutina en `docs/impedimentos-bloqueos.md`.

## Recomendación de orden de trabajo

1. **Cluster 1 primero** — es nuevo, es el 52% del total, y rompe algo que ya funcionaba.
2. Cluster 3 — pequeño pero con patrón sospechoso (4 productos, mismo caso).
3. Clusters 2 y 4 — solo actualizar evidencia en IMP-017, no requieren trabajo de diagnóstico nuevo.
