# Diseño de casos — IMAS-4104 [Reintegros] D: Cierre Nexus (subtarea de IMAS-4101)

> Diseño basado en riesgo (qa-risk-test-design). Riesgo: **alto** — es el cierre real del dinero (pago o rechazo); esta fase es también donde vive `IMAS-4354`/`BUG-015`, el hallazgo más importante de todo el día de hoy.
>
> **Fuente**: `customfield_11620` de Jira (mismo patrón "Tarea" que `IMAS-4052`/`IMAS-4092`/`IMAS-4103`). Comparte alcance con `docs/user-stories/IMAS-4152-pruebas-qa-manuales-nexus.tests.md` (CP03/CP04 ya cubren el camino feliz de pago y el bug de rechazo directo) y con `docs/bugs/BUG-015-...md` (retesteado hoy) — este doc no repite esos CPs, los referencia.

## Contrato real (resumen)

**Objetivo**: integrar cierre/actualización de monto en Nexus vía `refund/exp`, reemplazando el cierre SISE.

**Endpoint real, confirmado con ejemplo real (Mariana Navarro, 2026-08-04)**: `POST https://qa-quantum.ike.ar/api/assistance/v1/pets/refund`, headers `API-KEY` + `customer-channel: PRUEBAS_DESARROLLO`. Body real de ejemplo:
```json
{
  "bitacora": 1234,
  "urlRefund": "https://www.google.com",
  "clCuenta": 2243,
  "clave": "30007889",
  "idEstado": "1",
  "clExpediente": "2503-1",
  "montoAReintegrar": 1000,
  "fechaEstado": "2026-08-04T13:34:56Z",
  "tipo": "",
  "observaciones": "ESTADO 1 COMENTARIO"
}
```
(Curiosidad: `clCuenta: 2243` + `clave: "30007889"` son el producto y el DNI reales de Paula Scalzo — dev también usa cuentas reales del equipo como datos de ejemplo, no solo QA.)

**Catálogo completo de estados `refund`** (ya documentado antes, reconfirmado acá con el detalle de "Acción Nexus"):
| ID | Nombre | Acción Nexus | Uso en reintegros |
|---|---|---|---|
| 1 | Recepción de Información | Nota | Create con monto 0 |
| 2 | Envío a Finanzas | Nota | Opcional/futuro |
| 3 | Aviso de Pago | Actualiza estado + Nota | Cierre pago |
| 4 | Rechazo Incompleto | Nota | Opcional |
| 5 | Rechazo Definitivo | Actualiza estado + Nota | Cierre rechazo |
| 6 | Pendiente de Aprobación | Nota | Opcional |
| 7 | Rechazado Devuelto a Calidad | Nota | Opcional |

**Criterios de aceptación, ninguno marcado**:
- [ ] OpenAPI `refund/exp` recibido y documentado.
- [ ] Pago Finanzas → estado 3 + monto cargado por Calidad.
- [ ] Rechazo → estado 5.
- [ ] Id Nexus correcto (`filecase` vs `_id`) confirmado.
- [ ] Estados locales reintegros siguen coherentes.
- [ ] Interim: dual-write/SISE documentado y feature-flageado si OpenAPI no llega.

## 🎯 Hallazgo clave — el problema de BUG-015 es de `reintegros-backend`, no de Nexus en sí

Se encontró (y descargó) una **colección completa de Postman** que Mariana Navarro adjuntó el 2026-08-14 (`nexus-pets-reintegros.postman_collection.json` + su environment), con carpetas `00 Común`, `01 Camino feliz (pago)`, `02 Camino no feliz (rechazo)`, `03 Errores de contrato` — prueba Nexus **directo**, sin pasar por `reintegros-backend` ni el backoffice.

En una captura de esa fecha (carpeta "02 Camino no feliz (rechazo)"), el panel interno de Nexus para el servicio `3112-1` muestra una nota real generada con éxito:
```
14/08/26 17:52 - Nexus-api
Fecha Estado: 2026-08-14T20:52:56.975Z
Estado: Rechazo Definitivo
Monto: 1500
Observaciones: prueba camino no feliz
```
**Esto confirma que Nexus (Core) SÍ acepta y procesa un rechazo (estado 5) cuando se lo llama directo** — la nota se generó sin problema. Sin embargo, el comentario de Mariana en `IMAS-4104` ese mismo día dice: *"Detecté errores en el camino no feliz, ya que no me permite rechazar un reintegro con estado 5."*

**Reconciliando ambas cosas**: lo más probable es que el error que Mariana encontró esté en la llamada vía UI/backoffice (que pasa por `reintegros-backend`, el mismo componente que hoy sigue devolviendo `404 BUS-005 "Nexus pets/refund requires clCuenta"` en el retest de `BUG-015`), **no en Nexus mismo**. Es decir: `reintegros-backend` tiene una validación propia (exigir `clCuenta` antes de llamar a `refund/exp`) que bloquea la llamada ANTES de que llegue a Nexus — Nexus, del otro lado, nunca tuvo problema en aceptar un rechazo cuando se lo invoca directamente. **Esto acota la causa raíz de `BUG-015` a `reintegros-backend`, no a Core/Nexus** — información nueva, nunca antes documentada con esta claridad.

**Dato aparte, mismo hilo temporal**: comentario de Mariana del 2026-08-18 ("Se desplegó solución en dev") — un posible primer intento de arreglo, 3 días antes de que `IMAS-4354` se creara formalmente (21/08). Refuerza la hipótesis (ya anotada en `IMAS-4092`) de que hay una separación real entre el entorno "dev" (donde Mariana valida) y "QA" (`reintegros-backoffice.ike.qa`, donde retesteo yo) — explicaría por qué la evidencia de dev no se sostiene en mis retests de hoy.

### ✅ Confirmado en vivo, HOY (2026-08-28) — ya no es solo una hipótesis basada en una captura de hace 2 semanas

Se ejecutó la colección de Postman de Mariana directo contra `qa-quantum.ike.ar` (API-KEY + cuenta dedicada `clCuenta 1715`/`clave 13313024`, 19 capabilities reales confirmadas hoy vía `claimsHistory`). Secuencia completa "02 Camino no feliz (rechazo)":

| Paso | Resultado |
|---|---|
| `GET claimsHistory/1715-13313024` | `200` — capabilityList completo, cuenta viva |
| `POST pets/auxiliaries` (create) | `200` — `filecase: "3307-1"` |
| **`POST pets/refund` idEstado=5 (Rechazo Definitivo)** | **`200`** — `notesProvider` con la nota generada |
| `POST auxiliaries/notes` (nota shared) | `200` |

**Los 4 pasos funcionan perfecto, hoy.** Confirma de forma definitiva e independiente (no solo la palabra de dev, no solo una captura de 2 semanas atrás) que Nexus nunca tuvo problema real para procesar un rechazo directo — el bug de `BUG-015` está 100% en `reintegros-backend`. Detalle completo en `docs/bugs/BUG-015-rechazo-directo-calidad-pendiente-requiere-clcuenta.md` § "Confirmación definitiva 2026-08-28".

**Nota técnica encontrada en el camino**: el export de la colección de Postman (el JSON adjunto a Jira) tenía el body de `createPetAuxiliary` incompleto — le faltaba `assisted.contact.name`/`surname` (sí estaban en la ejecución original de Mariana, se ve en su captura, pero no en el archivo exportado). Sin esos 2 campos, la API devuelve `400 "El campo assisted.contact.name es requerido."` Cualquiera que reuse esta colección tal cual está adjunta en Jira va a chocar con este mismo error hasta que los agregue a mano.

## TS-01 Camino feliz — pago (ya cubierto)

Ver `IMAS-4152.tests.md` **CP03** — ejecutado y pasando en vivo el 2026-08-22 (expediente `3184-1`, `registro-pago` → `204`). No se repite acá.

## TS-02 Camino no feliz — rechazo directo (ya cubierto, es BUG-015)

Ver `IMAS-4152.tests.md` **CP04** y `docs/bugs/BUG-015-rechazo-directo-calidad-pendiente-requiere-clcuenta.md` — retesteado hoy 2 veces (expedientes `3131739`, `3131793`), **sigue fallando** con `404 BUS-005`. No se repite acá.

## TS-03 Errores de contrato (nunca antes probado desde QA)

**CP01 - Verificar el comportamiento ante una `capability` inválida en el alta** ✅ **EJECUTADO 2026-09-01**
- **Setup**: `POST https://qa-quantum.ike.ar/api/assistance/v1/pets/auxiliaries` con `capability.id = "000000000000000000000000"`, `capability.name = "capability-inexistente"`, resto del body válido (cuenta 1715, clave 13313024 de la cuenta de prueba de Mariana, provider 2080, refund 1/0).
- **Headers**: `API-KEY` + `customer-channel: PRUEBAS_DESARROLLO`.
- **Resultado real** (1337ms): `HTTP 400` con body `{"detail":"El campo assisted.contact.name es requerido.","instance":"/api/assistance/v1/pets/auxiliaries","status":400,"title":"Invalid request"}`.
- **Lectura**: el 400 lo dispara la validación de **otro campo faltante** (`assisted.contact.name`), no la capability inválida. Es el mismo body incompleto que ya se documentó como faltante en el export de la Postman collection adjunta a Jira (Mariana 2026-08-04). Conclusión práctica: **Nexus valida ANTES** — no llegó a chequear la capability porque el body ya falló en `assisted.contact.name`. Para verificar el rechazo de capability inválida en forma, hay que primero completar el body con los campos requeridos.
- **Conclusión del CP**: **parcialmente verificado**. La API rechaza el body (4xx, no se crea fila en Nexus) ✅. Pero la causa específica del 400 no es la capability inválida sino la falta de `assisted.contact.name` (descubrimiento nuevo: **Nexus exige `assisted.contact.name` Y `assisted.contact.surname`**, no estaba en el export de Postman).
- Trazabilidad: no mapea a un AC específico del padre, es un caso de robustez propio de la colección de dev.

**CP02 - Verificar el comportamiento ante un `refund` con expediente inexistente** ✅ **EJECUTADO 2026-09-01**
- **Setup**: `POST https://qa-quantum.ike.ar/api/assistance/v1/pets/refund` con `clExpediente: "0-0"` (formato válido pero no existe), resto del body completo y válido (cuenta 1715, clave 13313024, idEstado "3", monto 1000).
- **Headers**: `API-KEY` + `customer-channel: PRUEBAS_DESARROLLO`.
- **Resultado real** (3367ms): `HTTP 400` con body `{"statusCode":400,"code":"invalidService","msg":"Selected service not found"}`.
- **Lectura**: 4xx claro con `code` específico (`invalidService`) y mensaje legible ("Selected service not found"). NO se generó la nota del reembolso, NO se aceptó el cierre. Validación de contrato **cumple**.
- **Conclusión del CP**: ✅ verificado completamente. La API rechaza correctamente expedientes inexistentes con 4xx estructurado (status + code + msg), no deja estado inconsistente.
- Trazabilidad: ídem CP01.

## Resumen de cobertura

| AC del ticket | Cubierto por | Estado |
|---|---|---|
| Pago Finanzas → estado 3 | `IMAS-4152.tests.md` CP03 | ✅ Confirmado 2026-08-22 |
| Rechazo → estado 5 (vía UI/backoffice) | `IMAS-4152.tests.md` CP04 / `BUG-015` | 🔴 Falla — retesteado hoy, sigue roto |
| Rechazo → estado 5 (vía Nexus directo) | Captura de Mariana 2026-08-14 + **confirmado en vivo hoy 2026-08-28** | ✅ Nexus lo acepta sin problema, en ambas fechas — acota la causa raíz 100% a `reintegros-backend` |
| Id Nexus correcto (`filecase`) | Todas las evidencias de hoy (Popi, Cruella, etc.) | ✅ Confirmado — siempre aparece como "Expediente en SISE" en el backoffice |
| OpenAPI recibido | Comentario de Mariana 2026-08-04 (curl real) | ✅ Ya está, con ejemplo funcionando |
| Errores de contrato (capability/expediente inválidos) | CP01 (parcial — descubierto campo faltante), CP02 (✅ completo) | 🟡 CP01 ejecutado pero descubrió que la Postman collection tiene un body incompleto; CP02 ✅ 4xx claro |

## Pendiente

1. ~~Usar la colección de Postman para confirmar si el rechazo directo vía Nexus sigue funcionando hoy~~ — **hecho, confirmado 2026-08-28: sí funciona perfecto**.
2. Ejecutar CP01/CP02 (errores de contrato: capability inválida, expediente inexistente) — todavía no ejecutados, menor prioridad ahora que la pregunta principal ya se respondió.
3. Confirmar con Mariana/Alexis si existe de verdad una separación "dev" vs "QA" para Nexus que explique por qué su evidencia no se sostiene en los retests de hoy (mismo pendiente ya anotado en `IMAS-4092`/`IMAS-4103`).
4. Avisar a Mariana que el export de la colección de Postman adjunta a Jira tiene el body de `createPetAuxiliary` incompleto (falta `contact.name`/`surname`) — un arreglo chico pero evita que la próxima persona pierda tiempo con el mismo `400`.
