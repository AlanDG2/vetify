# Diseño de casos — IMAS-4152 Pruebas QA Manuales Nexus (subtarea de IMAS-4124, épica IMAS-4101)

> Diseño basado en riesgo (qa-risk-test-design). Riesgo: **ALTO** (migración de un circuito de pagos/reembolsos reales, dependencia de un sistema externo — Nexus — todavía en ajuste). Cobertura cruza el pipeline completo A→E de la épica (Alta `IMAS-4103` → Cierre `IMAS-4104` → Notas `IMAS-4124`), porque las 3 son "In Validation" simultáneamente y las Notas dependen de que Alta+Cierre funcionen primero.
>
> **Fuente**: código real de `reintegros-backend` (`ReintegrosCoreProviderRouter`, `NexusHttpClient`, `DecideClaimDossierQualityUseCaseImpl`, `RegisterFinancePaymentUseCaseImpl` — MR `!103`, rama `develop`) **+ 4 MRs de fixes aplicados directo a la rama `qa`** (`#109`, `#110`, `#113`, `#115` — ver `docs/conocimiento-sistema.md` §"Divergencia real entre ramas qa y develop"), Gherkin de la propia HU `IMAS-4124`, y capturas ya revisadas del backoffice + panel interno de Nexus.
>
> **Confirmado 2026-08-22**: Nexus está operativo en el ambiente QA real (`REINTEGROS_CORE_PROVIDER=NEXUS` en la rama `qa`, no solo en `develop`). `IMP-013` (VPN) se destrabó en la misma sesión — **se ejecutaron en vivo con éxito 4 casos, con 2 solicitudes distintas: CP01, CP03 (expediente `3184-1`) y CP07, CP08 (expediente `3186-1`, el camino Calidad-aprueba→Finanzas-rechaza→Calidad-rechaza-definitivo)**. Una 3ª solicitud (expediente `3188-1`) se creó específicamente para CP04/CP05 (rechazo directo de Calidad desde `PENDIENTE`, sin pasar por Finanzas) y **quedó bloqueada por un bug real** — ver `docs/bugs/BUG-015-rechazo-directo-calidad-pendiente-requiere-clcuenta.md`. CP11 (panel interno de Nexus) sigue sin credenciales.
>
> **Ambiente/datos**: `reintegros-backoffice.ike.qa` (Calidad/Finanzas, cuenta dual **Alex** `acastellano@ikeasistencia.com.ar`) + webapp tutor QA. Cuenta de prueba con evidencia ya vista: DNI `12540524` ("Automation Test", mascota "Popi", plan Vetify Esencial OSDE).

## TS-01 Alta en Nexus (`IMAS-4103`) — precondición del resto de la suite

**CP01 - Verificar alta exitosa genera filecase** ✅✅ **EJECUTADO 2026-08-22 — PASA**
- Dado: tutor capitado real (Cruella Devil, DNI `98765499`, plan Esencial OSDE, mascota Manchitas) en `vetify-qa.ikeapp.com`.
- Cuando: se completó el wizard de "Nuevo reintegro" — categoría "Consulta en centro veterinario" (resuelta en vivo vía `tipos-gasto`/Nexus `claimsHistory`), factura sintética subida (OCR la leyó bien: comprobante, CUIT, monto), cuenta de acreditación creada con CBU `0070001600001234567891` (checksum válido, resolvió solo a "Banco de Galicia" — confirma `VAL-010`/`VAL-011` reales).
- Entonces: `POST /api/bff/reintegros/solicitudes/confirmacion` → **201**, `solicitudId=4e74b0b0-badb-49fe-a337-4b934015a799`, UI mostró "¡Solicitud enviada!".
- Trazabilidad: `IMAS-4103` · **regresión del fix `#109`** (`contact.name`) — confirmada indirectamente (el alta no falló por falta de nombre).
- **Nota**: confirmado en `reintegros-backoffice.ike.qa` (expediente `3184-1`, ver CP03) que el alta llegó bien al backoffice de Calidad/Finanzas. **No se verificó** la línea de tiempo `Aceptado`/`Finalizado` en el panel interno de Nexus ("Iké Argentina (dev)" → Servicios auxiliares) — es un sistema distinto del backoffice de reintegros, sin credenciales propias en esta sesión. Queda pendiente (ver CP11).

**CP02 - Verificar alta cuando la póliza real no está cargada en el datalake de Nexus QA** 🟡 No forzado explícitamente — el alta de CP01 no disparó el fallback de forma visible (o el dato de esta cuenta ya estaba en el datalake)
- Dado: una cuenta cuya póliza real todavía no está sincronizada en el datalake de Nexus QA (gap conocido, confirmado con Core — hack `IMAS-4143`).
- Cuando: se intenta el alta.
- Entonces: `resolveCapabilityId` cae al fallback de catálogo fijo (`TEMP_CAPABILITY_CATALOG_POLICY_KEY`) — el alta se completa **sin error visible al usuario**, transparente.
- Trazabilidad: **regresión del fix `#110`**. Nota: si Core sincroniza el datalake completo, este fallback deja de dispararse — no es un bug si en algún momento CP02 "deja de pasar por el catálogo", es la mejora esperada.

## TS-02 Cierre en Nexus (`IMAS-4104`)

**CP03 - Verificar pago exitoso sin observaciones adicionales del tutor** ✅✅ **EJECUTADO 2026-08-22 — PASA**
- Dado: expediente `3184-1` (VETI-4e74-b0b0badb) en estado `VALIDADO` tras la aprobación de Calidad (ver CP01, `POST .../decision-calidad` → 204).
- Cuando: Finanzas (Alex, mismo rol dual) confirma el pago sin ingresar observaciones propias — el modal "Confirmar pago" no pide ese dato, va directo con lo que ya se validó.
- Entonces: `POST /api/bff/reintegros/backoffice/expedientes/3184-1/registro-pago` → **204**. El expediente pasó a estado final (ambos botones Rechazar/Pagar quedaron deshabilitados). **Antes del fix `#113`/`#115` esto fallaba** con `"urlRefund/observaciones is not allowed to be empty"` — este pase confirma en vivo que el fix sigue andando, no solo que "funciona en teoría".
- Trazabilidad: `IMAS-4104` · regresión `#113`/`#115` **confirmada en vivo**.

**CP04 - Verificar rechazo directo de Calidad con motivo** 🔴 **BLOQUEADO 2026-08-22 — ver `docs/bugs/BUG-015`**
- Dado: expediente `3188-1` en `PENDIENTE` (3ra solicitud, creada específicamente para este caso).
- Cuando: Calidad intenta rechazar directo desde `PENDIENTE`, sin pasar por "Validar manualmente"/aprobación.
- Entonces (esperado): cierre en Nexus con `idEstado=5`, expediente pasa a `RECHAZADO`.
- **Resultado real**: el rechazo falló dos veces con errores reales y reproducibles, no simulados — primero `400 BUS-009` ("must have a positive amount", resuelto distribuyendo la factura vía "Distribuir factura"), y luego `404 BUS-005` ("Nexus pets/refund requires clCuenta"), que no se pudo resolver sin pasar por el mismo pipeline de validación de cobertura que usa el camino de aprobación. Documentado en detalle en `docs/bugs/BUG-015-rechazo-directo-calidad-pendiente-requiere-clcuenta.md` (no filado en Jira todavía, pendiente confirmar con dev si es bug o limitación conocida).
- Trazabilidad: `IMAS-4104`.

## TS-03 Notas en Nexus (`IMAS-4124` — foco real de `IMAS-4152`)

**CP05 - Nota de rechazo directo (Escenario 1 de la HU)** 🔴 **BLOQUEADO 2026-08-22 — misma causa que CP04, ver `docs/bugs/BUG-015`**
- Dado: expediente `PENDIENTE` con `filecase` ya generado.
- Cuando: Calidad rechaza con un motivo, directo desde `PENDIENTE`.
- Entonces (esperado): se dispara `POST /auxiliaries/notes` con ese `filecase`, `noteType: "shared"` y el texto del motivo — visible en el panel interno de Nexus.
- **No se pudo ejercer**: el rechazo directo en sí nunca se completó (ver CP04 — falló con `400 BUS-009` y luego `404 BUS-005`), así que no hay nota que verificar para este camino todavía.
- Trazabilidad: `IMAS-4124` (Escenario 1 Gherkin de la HU).

**CP06 - Nota de pago (Escenario 2 de la HU)** 🟡 MUY PROBABLE, NO VERIFICADO VISUALMENTE
- Dado: expediente `VALIDADO` (`3184-1`).
- Cuando: Finanzas confirma el pago (`PAGO_REALIZADO` — ver CP03, `registro-pago` → 204 confirmado).
- Entonces (esperado por código, `RegisterFinancePaymentUseCaseImpl` llama a `registrarNotaBitacoraBestEffort` inmediatamente después del cierre exitoso): se dispara la nota **"Aviso de Pago"** en Nexus, mismo `filecase` `3184-1`.
- **Por qué no está confirmado al 100%**: el 204 de `registro-pago` prueba que el pago se registró — la nota es best-effort (try/catch que solo loguea), así que un 204 exitoso NO prueba por sí solo que la nota específicamente se disparó. Verificarlo requiere el panel interno de Nexus ("Iké Argentina (dev)" → Servicios auxiliares), al que no tengo credenciales en esta sesión.
- Trazabilidad: `IMAS-4124` (Escenario 2 Gherkin) — pendiente de confirmación visual, no de ejecución.

**CP07 - Rechazo operativo de Finanzas (`INCONVENIENTE`) — NO debe disparar nota** ✅✅ **EJECUTADO 2026-08-22 — PASA** — ⚠️ EL CASO MÁS FÁCIL DE DAR POR SENTADO MAL
- Dado: expediente `3186-1` (VETI-c3c4-b69444c0) en `VALIDADO` tras la aprobación de Calidad (`decision-calidad` → 204).
- Cuando: Finanzas marcó `INCONVENIENTE`, único motivo disponible en el catálogo **"Datos inconsistentes"** (confirma 1:1 lo ya documentado: Finanzas solo tiene ese motivo).
- Entonces: `POST .../registro-pago` (mismo endpoint que CP03, body distinto) → **204**. UI mostró explícitamente **"Rechazado por Finanzas / Este expediente fue rechazado por Finanzas."** — confirma la transición a `RECHAZADO_FINANZAS` (estado real e intermedio, no un rechazo final).
- **Sobre "no dispara nota"**: el 204 confirma que el flujo de rechazo operativo funciona end-to-end en la UI/backoffice — pero la ausencia específica de la nota en Nexus sigue sin verificación visual directa (requiere el panel interno de Nexus, ver CP11/CP06). El comportamiento de código ya confirmado (`RegisterFinancePaymentUseCaseImpl`, la rama `INCONVENIENTE` nunca llama al port de notas) no cambió con esta corrida — esta ejecución valida el camino completo del lado UI, no reemplaza la verificación en Nexus.
- Trazabilidad: `IMAS-4124` — comportamiento también confirmado por Mariana Navarro en el comentario del 2026-08-21 de la propia HU.

**CP08 - Rechazo definitivo de Calidad tras `RECHAZADO_FINANZAS` (ciclo post-Finanzas)** ✅✅ **EJECUTADO 2026-08-22 — PASA**
- Dado: expediente `3186-1` en `RECHAZADO_FINANZAS` (viene de CP07), con el motivo operativo de Finanzas ya linkeado.
- Cuando: Calidad rechazó desde el botón "Rechazar" habilitado en ese estado.
- Entonces: el modal mostró el motivo **ya resuelto y de solo lectura** ("RECHAZO POR FINANZAS / Datos inconsistentes") — **no pidió elegir un motivo nuevo**, exactamente como predecía el código (`postFinanceReturn`, prohíbe `motivoCalidadId`). Segundo `POST .../decision-calidad` → **204**. UI final: "¡Envío exitoso! Registramos el rechazo del expediente" — ambos botones (Rechazar/Pagar) quedaron deshabilitados, estado terminal `RECHAZADO`.
- Trazabilidad: `IMAS-4124` — regresión de código confirmada en vivo, no solo por lectura.

**CP09 - Confirmar que NO se usa el canal de comments IVR para bitácora (Escenario 3 de la HU)** 🟡 PARCIALMENTE CONFIRMADO
- Dado: las 2 solicitudes completas ejecutadas esta sesión (CP01→CP03, CP01→CP07→CP08).
- Cuando: se inspeccionó el tráfico de red (`browser_network_requests`) durante los 2 flujos completos.
- Entonces: **ninguna llamada a un endpoint de "comments" apareció en ningún momento** desde el propio backoffice de reintegros — solo `decision-calidad`, `registro-pago`, `aprobacion-manual-arca`. **Salvedad**: esto confirma que el backoffice/BFF de reintegros nunca llama a `/comments`, pero la llamada real a Nexus (`/auxiliaries/notes` vs `/api/assistance/v1/comments`) ocurre servidor-a-servidor (`reintegros-backend` → Nexus), fuera de lo que este navegador puede observar — la confirmación completa sigue necesitando el panel interno de Nexus o logs del backend.
- Trazabilidad: `IMAS-4124` (Escenario 3 Gherkin).

**CP10 - Nota es best-effort: un fallo de Nexus en la nota no debe revertir el cierre** 🟡 No ejecutable manualmente sin herramientas de fault-injection
- Dado: un cierre exitoso (CP05/CP06) donde la llamada a `/auxiliaries/notes` falla por algún motivo transitorio.
- Cuando: eso ocurre.
- Entonces (comportamiento esperado por código, no verificable a mano sin mockear Nexus): el rechazo/pago **queda igual confirmado** en reintegros — la nota es best-effort (`try/catch` que solo loguea). Dejar como verificación de código, no de QA manual, salvo que el equipo dev provea una forma de simular el fallo en QA.
- Trazabilidad: `IMAS-4124` — documentado, no bloqueante para dar por válida la suite.

## TS-04 Verificación cruzada — panel interno de Nexus

**CP11 - El expediente del backoffice coincide con el "Servicio" del panel interno de Nexus** 🔴 BLOQUEADO — sin credenciales del panel interno de Nexus ("Iké Argentina (dev)") en esta sesión
- Dado: expediente `3184-1` ya cerrado (`PAGADO`, ver CP03).
- Cuando: se busca el mismo `filecase` en "Iké Argentina (dev)" → **Servicios auxiliares**.
- Entonces: el DNI del asistido (`98765499`), el tipo de servicio y el estado de línea de tiempo (`Aceptado`→`Finalizado`) deberían coincidir con lo ya confirmado en `reintegros-backoffice`.
- Trazabilidad: `IMAS-4103`/`IMAS-4104`/`IMAS-4124` — pendiente, necesita acceso a ese panel puntual (distinto del backoffice de reintegros).

---

## Resumen de cobertura vs. tickets

| Ticket | Cubierto por | Estado |
|---|---|---|
| `IMAS-4103` (Alta) | CP01 ✅, CP02 🟡, CP11 🔴 | Parcial — CP01 pasó en vivo |
| `IMAS-4104` (Cierre) | CP03 ✅, CP04 🔴 | Parcial — CP03 pasó en vivo (regresión `#113`/`#115` confirmada); CP04 **bloqueado por bug real, ver `BUG-015`** |
| `IMAS-4124` / `IMAS-4152` (Notas) | CP05-CP10 | CP07 ✅, CP08 ✅ ejecutados en vivo; CP09 🟡 parcial (confirmado del lado backoffice, no server-a-server); CP06 muy probable no confirmado visualmente; CP05 **bloqueado, misma causa que CP04**; CP10 no ejecutable a mano |

**11 casos diseñados. 4 ejecutados y pasando en vivo (CP01, CP03, CP07, CP08 — 2026-08-22)**, contra QA real, con VPN conectada, en 3 solicitudes distintas (`3184-1`: alta→pago; `3186-1`: alta→Calidad aprueba→Finanzas rechaza (Inconveniente)→Calidad rechaza definitivo; `3188-1`: intento de rechazo directo desde `PENDIENTE`, bloqueado). Se intentó específicamente ejercer el camino de rechazo directo de Calidad (**CP04/CP05**) con una 3ª solicitud creada para ese fin, y se encontró un bloqueo real y reproducible (dos errores de backend distintos, `400 BUS-009` y `404 BUS-005`), documentado en `docs/bugs/BUG-015-rechazo-directo-calidad-pendiente-requiere-clcuenta.md` — no filado en Jira todavía, pendiente confirmar con dev si es bug o limitación conocida del ambiente. CP02 no se forzó explícitamente. CP06 y CP09 quedaron parcialmente confirmados: el 204 de `registro-pago`/`decision-calidad` prueba que el flujo de negocio cerró bien, pero la nota específica en Nexus (best-effort, servidor-a-servidor) sigue sin verificación visual — requiere el panel interno de Nexus (CP11), sin credenciales en esta sesión. CP10 requiere fault-injection no disponible manualmente. **Esta HU NO puede reportarse como cerrada/lista todavía** — CP04/CP05 quedaron bloqueados (no solo pendientes) y falta la confirmación visual en el panel interno de Nexus (CP06/CP09/CP11).

## Notas y limitaciones a tener presentes durante la ejecución

- **ARCA automática falla en QA (502) por diseño del ambiente** — Calidad usa el botón de validación manual como bypass intencional. No reportar como bug salvo que se repita en Producción (ver `docs/conocimiento-sistema.md`).
- **Multi-mascota**: `policy.key` no distingue mascota dentro de la misma cuenta (gap conocido, sin confirmar con Core). Si se usa una cuenta con 2+ mascotas, verificar explícitamente a qué mascota quedó imputado el expediente — no asumir que el sistema ya lo resuelve.
- **`qa` y `develop` divergieron** (ver `docs/conocimiento-sistema.md`) — si algún CP falla, aclarar explícitamente contra qué rama/ambiente, no asumir que el comportamiento de una aplica a la otra.
