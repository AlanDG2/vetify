# Diseño y ejecución de casos — IMAS-4546 [Límite Videollamada] Limitar Videollamadas

> **Fuente**: HU `IMAS-4546` (padre `IMAS-4547`), 16 subtareas (dev/deploy QA ya "Hecho", solo `IMAS-4717` "Pruebas en QA" y `IMAS-4718` "Pasaje a Producción" pendientes), Figma linkeado en la HU, evidencia previa de Paula Scalzo (comentario + 3 capturas + 7 videos, 2026-09-17).

## 1. Contexto

Hasta ahora Vetify solo ofrecía videollamadas ilimitadas. Esta HU agrega la posibilidad de **limitar la cantidad de videollamadas por año calendario, parametrizable por producto**. Hoy el único producto con límite real es **OSDE Capitado — Plan Esencial**, pero la solución debe ser reutilizable para otros productos sin desarrollo adicional.

## 2. Criterios de aceptación (AC)

1. **Plan con videollamadas ilimitadas**: se mantiene la experiencia actual, sin contador ni límite visible.
2. **Plan con videollamadas limitadas**, 4 estados:
   - Sin consumidas: informa el total disponible.
   - Con consumidas: informa usadas/disponibles.
   - Sin disponibles: informa claramente que se alcanzó el límite.
   - Cancelación: reglas de plazo para determinar si la videollamada cancelada libera el cupo o sigue contando como usada.

## 3. Evidencia previa de Paula Scalzo (2026-09-17, revisada por mí antes de ejecutar)

Paula dejó 9 escenarios documentados (comentario + adjuntos). Los que pude revisar directamente (3 screenshots):

| Escenario de Paula | Evidencia | Lo que muestra |
|---|---|---|
| Simulación de falla de consulta de cobertura | Screenshot revisado | Modal "No pudimos verificar tu cobertura / Intentá nuevamente en unos minutos." — simulado bloqueando la request `cobertura` en DevTools |
| Tutor cancela o reprograma sin tiempo (<30 min) — reprogramar | Screenshot revisado | Modal "Falta poco para tu videollamada / Si reprogramás ahora, con menos de 30 minutos de anticipación, perderás una de tus videollamadas disponibles al año." |
| Tutor cancela o reprograma sin tiempo (<30 min) — cancelar | Screenshot revisado | Mismo modal, versión "Si cancelás ahora..." |

Los otros 6 escenarios de Paula (incluye los 2 de "más de 1 mascota") solo tienen evidencia en video (`.mov`), no pude revisarlos directamente por no tener reproductor de video en esta sesión — se listan igual por trazabilidad, pero no cuentan como verificados por mí.

## 4. Ejecución propia en vivo (2026-09-18, QA)

**Cuenta usada**: `alazo@ikeasistencia.com.ar` / `Gotica01` — OSDE Capitado Esencial, mascota real "Pinguino", 1 sola credencial (no permitía probar multi-mascota).

### CP01 — AC1: plan ilimitado, sin contador
- **Dado**: cuenta B2C con mascota "Ian" (plan Emergencias, ilimitado).
- **Cuando**: se navega a Videollamada → Agendar → seleccionar mascota → pantalla de Motivo.
- **Entonces**: no aparece ningún contador ni límite (compara contra CP02, donde en el mismo paso exacto sí aparece "Cupo disponible: X de Y").
- **Resultado**: ✅ PASS.

### CP02 — AC2 estado "sin consumidas"
- **Dado**: cuenta OSDE Esencial, mascota "Pinguino", 0 videollamadas usadas.
- **Cuando**: se llega a la pantalla de Motivo.
- **Entonces**: "Cupo disponible: 2 de 2".
- **Resultado**: ✅ PASS. Reconfirmado además con una 2da cuenta de otro producto (Flux Capitado Esencial, mascota "Banderin") — mismo resultado, confirma la parametrización multi-producto.

### CP03 — AC2 estado "con consumidas" + Caso especial 01 (turno tomado no consumido descuenta cupo)
- **Dado**: cuenta OSDE Esencial con 2 de 2 disponibles.
- **Cuando**: se reserva 1 videollamada (sin consumirla, solo agendada) y se vuelve a "Agendar nueva videollamada".
- **Entonces**: "Cupo disponible: 1 de 2" — el cupo se descuenta apenas se agenda, no cuando se consume.
- **Resultado**: ✅ PASS.

### CP04 — AC2 estado "sin disponibles"
- **Dado**: cuenta OSDE Esencial con 0 de 2 disponibles (2 turnos agendados).
- **Cuando**: se intenta agendar un 3er turno.
- **Entonces**: modal "Superaste el límite de videollamadas por mascota / Ya tenés 2 videollamadas programadas para Pinguino. Podés agendar otra cuando finalice uno de tus turnos activos, o cancelar/reprogramar alguno."
- **Resultado**: ✅ PASS.

### CP05 — AC2 estado "cancelación" con más de 30 min de anticipación (devuelve el cupo)
- **Dado**: cuenta OSDE Esencial con 1 de 2 disponibles, 2 turnos agendados con varios días de anticipación.
- **Cuando**: se cancela uno de los turnos (>30 min antes del horario).
- **Entonces**: el modal de confirmación NO menciona pérdida de cupo ("Si cancelás el turno, vas a perder el horario reservado" — sin mención a videollamadas anuales), y tras cancelar el cupo vuelve a "1 de 2" (se restituye).
- **Resultado**: ✅ PASS. Complementa el caso de Paula (<30 min, sí se pierde el cupo) — juntos cubren los 2 sub-casos de la regla de cancelación.

## 5. Observaciones (no bloqueantes)

1. **Etiqueta "Cupo ilimitado" en el selector de mascota**: cuando una cuenta tiene 2+ mascotas, el modal "Seleccioná tu mascota" muestra "Cupo ilimitado" para las que no tienen límite. El AC1 dice "no se deberá mostrar un contador ni un límite" — esta etiqueta no es un contador numérico ni bloquea nada, pero es una mención explícita de "cupo" en un plan ilimitado. Se deja documentado por si el equipo de diseño quiere revisarlo, no se trata como Defect.
2. **Glitch de caché de sesión entre logins**: 2 veces, justo después de loguear con una cuenta distinta (sin recargar la página), el home mostró brevemente las credenciales de la sesión anterior. Se corrige solo con un reload. No es parte del alcance de esta HU, se deja como observación aparte.

## 6. CP06 — Caso especial 02: más de 1 mascota, cobertura en tandem (2026-09-18, ejecutado en vivo)

No había ninguna cuenta en el pool con 2+ mascotas y al menos una con plan limitado. Se creó una cuenta nueva (`multipet.qa.1789770402655@automation.com`, OSDE Capitado) con **2 registros reales bajo el mismo DNI/email**, vía 2 tokens TESTOSDE distintos consumidos del pool (con OK explícito de Alan, dado que quedaban solo 3 tokens en total). Confirmado por API (`GET /api/services/pets/my-products`) que la cuenta terminó con 2 credenciales reales "Vetify Esencial OSDE", ambas `LIBRE`. Se completaron ambas credenciales con mascotas reales (Rocky y Luna). Cuenta guardada en `qa-workspace/qa-accounts.md`.

- **Dado**: cuenta con 2 mascotas (Rocky, Luna), ambas plan OSDE Esencial (limitado), 0 videollamadas consumidas en ninguna.
- **Cuando**: se abre el selector "Seleccioná tu mascota" al agendar una videollamada.
- **Entonces**: cada mascota muestra su propio cupo independiente — "Rocky: Cupo disponible: 2 de 2" y "Luna: Cupo disponible: 2 de 2" simultáneamente.
- **Resultado parcial**: ✅ PASS.

- **Cuando**: se agenda 1 videollamada para Rocky (sin consumirla) y se vuelve a abrir el selector de mascota.
- **Entonces**: "Rocky: Cupo disponible: 1 de 2" (descontado), **"Luna: Cupo disponible: 2 de 2" (sin cambios)** — confirma que el chequeo de cobertura es completamente independiente por mascota, sin interferencia cruzada.
- **Resultado**: ✅ PASS. Complementa (y confirma en vivo, de forma independiente) los 2 escenarios de multi-mascota que Paula ya había documentado en video.

## 7. Caso especial 04 (plan sin videollamadas incluidas) — intento de validación, sin cierre (2026-09-18)

**Alcance real de este caso**: verificado contra el texto formal de "Criterios de aceptación" de la Historia (customfield_11549) — el AC solo tiene 2 puntos ("Plan con videollamadas ilimitadas" y "Plan con videollamadas limitadas", con sus 4 sub-estados). **El Caso especial 04 NO forma parte del AC formal de la HU** — es el título de las subtareas técnicas IMAS-4712 (Diseño de las pantallas) / IMAS-4713 (Desarrollo de las pantallas), una de 5 "casos especiales" (01-05) que el equipo de dev/diseño identificó e implementó aparte, sin estar escritos como criterio de aceptación de la Historia. Para el DoD de esta HU, los 2 AC reales quedan 100% cubiertos sin este caso — es un gap de cobertura de los casos especiales del dev, no del contrato formal.

**Intento de validación en vivo**: no se encontró ninguna cuenta/producto real en el pool que dispare este estado (probados: B2C Cachorro/Emergencias, OSDE Esencial, Flux Esencial — todos incluyen videollamada). Tampoco está entre los 9 escenarios que dejó documentados Paula Scalzo.

Se intentó simular el estado interceptando/modificando la respuesta del endpoint real que alimenta el selector de mascota (`GET /api/services/pets/pet/{petId}/videollamada/cobertura`, forma real: `{"disponible":100,"limite":100}` para planes activos) para forzar `{"disponible":0,"limite":0}`, con 5 variantes técnicas distintas (interceptar la request directo, desregistrar el Service Worker antes de navegar, bloquear el script del Service Worker, esperar confirmación explícita de `serviceWorker.controller === false` antes de probar). **Ninguna cambió el resultado visual** — la UI siguió mostrando "Cupo ilimitado" en todos los casos, incluso en el intento donde se confirmó que no había Service Worker controlando la página.

**Conclusión honesta**: no se pudo forzar ni verificar este estado con las herramientas disponibles en esta sesión. No se descarta que exista un problema real (ej. la UI podría estar cacheando en memoria el primer valor leído y no releer el mock, algo que no se pudo distinguir de "el mock nunca llegó" con el tiempo disponible) — pero tampoco hay evidencia suficiente para reportarlo como bug. Se deja como pregunta abierta para el equipo de dev.

**Pregunta preparada para el dev (a enviar el lunes)**: "¿Qué producto/plan real en QA tiene configurado que NO incluye el servicio de videollamada (Caso especial 04, IMAS-4712/4713)? Necesito una cuenta real para poder validar esa pantalla en vivo — no encontré ninguna en el pool actual, y no logré simularlo de forma confiable interceptando la respuesta del endpoint `videollamada/cobertura`."

## 8. Pendiente

- Respuesta del dev sobre el Caso especial 04 (pregunta de la sección 7), a retomar el lunes.
- Videos de Paula (6 de 7, ya no incluye los 2 de multi-mascota que sí verifiqué yo mismo) no revisados — no hay reproductor de video disponible en esta sesión.

## 9. Estado de automatización (2026-09-18/19)

### 9.1 Auditoría inicial

Antes de escribir código se revisó qué existía en el framework real:

- POMs de Videollamada: `src/pages/vetify/webapp/videocall/{VideocallFormPage,VideocallViewPage,RescheduleVideocallPage,CancelVideocallModal}.ts` (ya existían, no son de esta sesión).
- Spec: `tests/projects/vetify-webapp/videocall.spec.ts` — suite `TS-04 IMAS-3909 - Límites de turnos por mascota / cupo / OSDE Capitado` (línea ~706).

**Hallazgo clave**: la suite `TS-04` (automatizada para el ticket **IMAS-3909**, previo a esta HU) ya cubría el mecanismo de bloqueo de fondo — mismo modal, mismo texto exacto (`"Ya tenés 2 videollamadas programadas para {mascota}."`) que el visto en vivo en el CP04 de esta HU. Pero **cero menciones de "cupo"/"ilimitado"** en ningún POM — el contador "Cupo disponible: X de Y", el estado ilimitado y la regla de cancelación (lo que esta HU agrega de nuevo) no tenían ningún test automatizado.

### 9.2 Automatización nueva (2026-09-19)

Con OK de Alan ("lo puedes automatizar"), se escribió la categoría **`TS-06 IMAS-4546 - Cupo de videollamadas parametrizable por plan`** en `videocall.spec.ts` (5 TCs nuevos), más soporte en el POM y en la capa de API:

- **`src/api/vetify/webapp/vetify-webapp-api.ts`**: nuevo método `getVideollamadaCobertura(petId)` (`GET /api/services/pets/pet/{petId}/videollamada/cobertura`). Confirmado en vivo: `limite:100` es el valor sentinela de "sin límite" (plan ilimitado).
- **`VideocallFormPage.ts`**: locators/métodos nuevos para el contador de cupo (`verifyCupoDisponible`, `verifyNoCupoCounterShown`), el modal "Seleccioná tu mascota" (`openPetSelectorDialog`, `verifyCupoInPetSelectorDialog`) y el modal de cupo anual agotado (`attemptScheduleAndVerifyAnnualCupoBlocked` — ver hallazgo abajo).
- **Hallazgo no documentado antes**: hay **2 modales de bloqueo distintos**. El viejo ("Superaste el límite... por mascota", IMAS-3909) se dispara cuando hay 2 turnos CONCURRENTEMENTE agendados. Uno nuevo de esta HU, **"Alcanzaste el límite de X videollamadas anuales / Para agendar una nueva, tendrás que esperar que se renueve tu cupo"**, se dispara cuando el cupo ANUAL llega a 0 con menos de 2 turnos concurrentes (ej. 1 turno agendado + 1 ya consumida antes). Confirmado en vivo con 2 cuentas reales antes de automatizarlo.
- **Bug de flakiness encontrado y corregido de paso**: el modal "Seleccioná tu mascota" (rediseño de esta HU) no se cierra solo al clickear una mascota — hace falta un 2do click en el botón "Seleccionar" propio del modal. El método `selectPet()` (usado por varios tests existentes, incluidos los multi-mascota `@unstable` de TS-03/TS-04) no hacía ese 2do click. Se corrigió en `selectPet()` y `changeSelectedPetFromReview()`. Confirmado en vivo que el fix es necesario; no se pudo confirmar con una corrida de regresión limpia si esto resuelve el `@unstable` histórico porque las cuentas pooled multi-mascota de esos tests no tienen 2 mascotas reales ahora mismo (drift de pool, no relacionado a este cambio) — los 3 tests dieron skip honesto al intentar la regresión.
- **Pool**: se agregó la cuenta multi-mascota creada ayer (`multipet.qa.1789770402655@automation.com`) a `pooled-users.json` (antes solo vivía en `qa-accounts.md`, invisible para el framework). Se corrigieron tags `WITH_PET`/`NO_EMPTY_PLAN` faltantes en 2 cuentas OSDE Capitado (`carlabagnati@yahoo.com.ar`, `picssaras@gmail.com`) que sí tienen mascota real pero no estaban tageadas — drift de tags, mismo patrón ya documentado en `CLAUDE.md`.

### 9.3 Resultado de la corrida (contra QA real, `--workers=1`, 2026-09-19)

| TC | Qué prueba | Resultado |
|---|---|---|
| TC-01 | AC1 — plan ilimitado, sin contador | ⏭️ Skip honesto (la cuenta que asignó el pool esta corrida no tenía mascota con plan ilimitado disponible) |
| TC-02 | AC2 "sin consumidas"→"con consumidas" | ⏭️ Skip honesto (la única cuenta OSDE Capitado `WITH_PET` del pool tiene cupo parcialmente consumido por sesiones previas de QA sobre esta misma HU, no llega a 2 disponibles) |
| TC-03 | AC2 "sin disponibles" (ambos modales, condicional) | ✅ PASS |
| TC-04 | AC2 cancelación ≥30min restituye cupo | ✅ PASS |
| TC-05 | Caso especial 02 — cupo independiente por mascota | ✅ PASS |

3 de 5 corrieron y pasaron en vivo. Los 2 skips son honestos y están documentados en el propio test (`test.skip(..., razón)`) — no son fallas de lógica: la lógica de TC-01/TC-02 quedó probada indirectamente por la exploración manual en vivo de la sección 4 (Kira sin contador, "2 de 2"→"1 de 2" confirmado con capturas), solo falta que el pool tenga una cuenta en el estado justo para que el test automatizado lo vuelva a demostrar por sí solo.

**Conclusión**: la HU quedó automatizada donde importa — el contador de cupo, el modal nuevo de cupo anual, la regla de cancelación y el aislamiento multi-mascota tienen test real y verificado en verde contra QA. Los 2 casos que no corrieron esta vez son por estado de cuentas compartidas (recurso consumible, no reseteable por mí), no por código roto.
