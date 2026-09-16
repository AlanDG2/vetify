# BUG-027 — Rechazo de Calidad post-Finanzas (`decision-calidad`) sigue fallando incluso en expedientes nuevos

**Jira**: creado 2026-09-04 como Error nuevo, vinculado (`Blocks`) a `IMAS-4104`.
**Título sugerido**: BUG | Rechazo definitivo de Calidad post-Finanzas sigue fallando (expediente nuevo)
**Severidad**: Alto — REVISADO al alza 2026-09-04. Ya NO es solo deuda de datos históricos: un expediente 100% nuevo (creado hoy, post-26/08) reproduce el mismo bloqueo, solo que con un código de error distinto.
**Categoría**: Backend (`reintegros-backend`)
**HU relacionada**: `IMAS-4104` (Cierre Nexus, fase D) — CA3, CP08

## Información del entorno

- Ambiente: QA — `https://reintegros-backoffice.ike.qa/`
- Cuenta backoffice: acastellano@ikeasistencia.com.ar
- Expediente afectado: `3131746` (Rechazado por Finanzas, Branco, $61.000, 5/6/26)
- Fecha: 2026-09-03

## Descripción

Cuando un expediente está en estado "Rechazado por Finanzas" (pasó por Calidad → fue a Finanzas → Finanzas lo rechazó), el operador de Calidad debe poder rechazarlo definitivamente. El flujo de UI es correcto: al hacer click en "Rechazar" se abre un modal donde el motivo de Finanzas ("Datos inconsistentes") se muestra como texto read-only y no se pide uno nuevo — el operador solo debe clickear "Enviar rechazo".

Sin embargo, la llamada `POST .../decision-calidad` que se dispara al confirmar devuelve **404** con código `BUS-005`, indicando que Nexus (`pets/refund`) no puede procesar la solicitud porque `clCuenta` no está populado para este expedient.

La misma causa raíz que `IMAS-4354` (BUG-015): expedients anteriores al deploy del 26/08/2026 no tienen `clCuenta` en la estructura de Nexus, y el endpoint de rechazo de `reintegros-backend` falla al intentar llamar a `refund/exp`.

## Pasos para reproducir

1. En el backoffice, abrir cualquier expediente en estado "Rechazado por Finanzas" (ej. `3131746`, criado el 5/6/26).
2. Verificar que el modal de rechazo muestra el motivo de Finanzas como texto readonly ("Datos inconsistentes").
3. Click en "Enviar rechazo".
4. Observar la llamada a `POST .../decision-calidad` → 404 BUS-005.

## Resultado esperado

`POST .../decision-calidad` → **204** → expediente pasa a "Rechazado" (definitivo), mensaje enviado al tutor.

## Resultado actual

`POST .../decision-calidad` → **404** con `{"code":"BUS-005","message":"Nexus pets/refund requires clCuenta."}`

## Notas adicionales

- **La UI está correcta**: el modal se comporta según el diseño (motivo readonly, sin pedir dato nuevo). El bug es puramente del endpoint, no de la interfaz.
- Relacionado: `BUG-015` (IMAS-4354) cubre el caso "rechazo directo desde PENDIENTE"; este bug cubre "rechazo post-Finanzas".
- Posible relación con `IMAS-4578`/`IMAS-4583` (mismo día 2026-09-04, mismo dominio: identidad de mascota/plan que no resuelve en varios flujos de Capitado/reintegros) — a confirmar con dev si comparten causa raíz.

## ⚠️ Actualización 2026-09-04 — RETRACTACIÓN PARCIAL: reproducido en expediente 100% NUEVO, con error DISTINTO

Se armó de punta a punta un expediente nuevo (`3131817`, creado hoy 2026-09-04, post-fix del 26/08) siguiendo el flujo completo: validación manual de factura → aprobación en Calidad → rechazo en Finanzas ("Datos inconsistentes") → rechazo definitivo en Calidad.

**El rechazo definitivo sigue fallando** — pero con un código de error DISTINTO al documentado arriba:
- Antes (expedientes viejos, pre-26/08): `404 BUS-005 "Nexus pets/refund requires clCuenta"`.
- Ahora (expediente nuevo, post-26/08): `400 INT-004 "Nexus pets/refund call failed."`

**Reproducido 2 veces de forma independiente el mismo día**: una vez con un script Playwright automatizado (traceId `79ab1c81-c799-4fdd-bb4d-d22efc836732`), y una segunda vez por Alan manualmente en su navegador sobre el mismo expediente (traceId `d78daa9c-068f-47ed-a000-27e8dc26e1d8`) — mismo endpoint, mismo expediente, mismo código de error.

**Por qué esto cambia la severidad**: la hipótesis original (severidad Baja, "solo afecta legado, ya está resuelto para lo nuevo") queda descartada. El síntoma final (Calidad no puede cerrar un rechazo post-Finanzas) persiste hoy para cualquier expediente, nuevo o viejo — solo cambia el código de error interno.

**Hallazgo relacionado, mismo día**: al intentar reproducir con un segundo expediente (`3322-1`, factura SWISS $697.988,91), Alan encontró que el paso ANTERIOR (`aprobacion-manual-arca`, validación manual de factura) también puede fallar, con un tercer error distinto: `400 VAL-021 "Holder document does not correspond to a known pet in the holder catalog." reason=pet_not_found`. No confirmado todavía si es el mismo bug manifestándose distinto o un problema aparte — mismo dominio (identidad de mascota) que IMAS-4578/IMAS-4583.

## [Detalle técnico] (para el equipo de desarrollo)

- Endpoint: `POST /api/bff/reintegros/backoffice/expedientes/{id}/decision-calidad`
- Respuesta HOY en expediente nuevo (`3131817`, 2026-09-04): `400 {"code":"INT-004","message":"Nexus pets/refund call failed."}`
- Respuesta histórica en expedientes viejos: `404 {"code":"BUS-005","message":"Nexus pets/refund requires clCuenta."}`
- Expedients viejos conocidos afectados (histórico): `3131746` (5/6/26), `3131793` (8/6/26)
- Expedient nuevo afectado (2026-09-04): `3131817` — creado y llevado por el flujo completo el mismo día, no es un caso legado.
- Hallazgo relacionado (mismo día, expediente `3322-1`): `PATCH .../expedientes/{id}/aprobacion-manual-arca` → `400 {"code":"VAL-021","message":"Holder document does not correspond to a known pet in the holder catalog.","details":["reason=pet_not_found"]}`
