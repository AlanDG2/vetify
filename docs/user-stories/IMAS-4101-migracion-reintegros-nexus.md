# IMAS-4101 — Épica: Migración Reintegros a Nexus

> Intake completo desde cero, 2026-08-28 (a pedido explícito del usuario: "analiza todo, todos los campos, comentarios, tareas, bugs"). Reemplaza/corrige lo que había en `docs/conocimiento-sistema.md` § Reintegros — última vez que se leyó esta épica en profundidad fue 2026-08-21/22, esta pasada encontró cambios reales de estado y al menos 1 hallazgo nuevo no documentado.

**Tipo:** Epic · **Estado:** Backlog (el rollup de la épica en sí — sus 7 hijos están mucho más avanzados, ver abajo) · **Reporter:** Liliana Picinotti · **Prioridad:** Medium
**Creado:** 2026-08-04 · **Actualizado:** 2026-08-26
**Descripción propia (campo estándar y `customfield_11620`)**: ambas vacías/template sin llenar — todo el contenido real vive en los 7 issues hijos, que sí están completos y muy detallados.

## Los 7 issues hijos (encontrados vía `parent = IMAS-4101 OR "Epic Link" = IMAS-4101`)

| Key | Título | Tipo | Estado | Asignado |
|---|---|---|---|---|
| `IMAS-4143` | A — Feature Flag | Tarea | **Hecho** | Paula Scalzo |
| `IMAS-4092` | B — Obtener Historial Servicios Auxiliares | Tarea | In Validation | Alan |
| `IMAS-4103` | C — Alta Nexus | Tarea | In Validation | Alan |
| `IMAS-4104` | D — Cierre Nexus | Tarea | In Validation | Alan |
| `IMAS-4124` | E — Notas Nexus | Tarea | In Validation | Alan |
| `IMAS-4354` | Bug: Rechazo falla (BUS-005, `clCuenta`) | Error | In Validation | Alan |
| `IMAS-4052` | Workaround reintegros OSDE Capitado | Tarea | **Hecho** | Liliana Picinotti |

`IMAS-4052` no es parte de las 5 fases A-E — es un workaround **separado y ya cerrado**, con 11 subtareas propias todas Hecho (ver más abajo, sección propia).

## Fase A — Feature Flag (`IMAS-4143`, Hecho)

Permite pasar de SISE a Nexus (o al revés) mientras dure la convivencia — "Habilitar/deshabilitar el camino de la gestión de reintegros." Subtareas `IMAS-4145`/`IMAS-4144` ambas Hecho. Sin nada pendiente.

## Fase B — Obtener Historial Servicios Auxiliares (`IMAS-4092`, In Validation)

**Objetivo**: habilitar reintegros para adquirientes Y capitados, migrando la dependencia de SISE a Nexus. El desafío de fondo: un capitado no compra → no pasa por Engage → no tiene cliente en SISE → nunca podía pedir reintegro. Nexus lo destraba.

**Endpoint real**: `GET /api/customers/aux/claimsHistory/{policyKey}` (Customers) → trae `capabilityList` (id, capabilityCode, name) + límites — alcanza para el alta, no hace falta `getAuxiliaryTypes` (`IMAS-4094`, cancelada, absorbida acá, confirmado con Core).

**Limitante ya conocida, reconfirmada acá**: `policy.key`/`policyKey` = `{clCuenta}-{clave}` (`clave` ≈ DNI del titular) — identifica titular+producto, no la mascota puntual. Con 2+ mascotas, el key es el mismo para todas; la mascota se resuelve aparte por `insuredObject` (IKE Mascotas).

**Subtareas propias**: `IMAS-4146` (Análisis, Hecho), `IMAS-4093` (Obtener historial, Hecho), `IMAS-4097` (Deploy a QA, Hecho) — **las 3 Hecho**, esta fase está completa de su lado.

**✅❌ Retest en vivo 2026-08-28 — funcionaba hace 2 días, hoy no.** Casos formales completos en `docs/user-stories/IMAS-4092-obtener-historial-servicios-auxiliares.tests.md`. La cuenta Capitado real que dev (Paula Scalzo) usó el 26/08 para confirmar "reintegros funciona OK en Nexus" (DNI `12540524`, "Popi", confirmada "Osde/capitado (H)" en el panel interno de Nexus) **tiene historial real y pagado** (confirmado hoy de forma independiente) — pero al intentar iniciar un reintegro NUEVO hoy, `GET /mascotas` devuelve el registro con todos los campos de identidad de la mascota en `null`, y la UI muestra "No hay mascotas registradas para tu documento". El control (Adquirente) no tiene este problema. No se sabe si es específico de esta cuenta o generalizado — pendiente probar con otra cuenta Capitado de DNI válido. Esta misma cuenta es, además, la usada en el hallazgo de `IMAS-4052` (ver esa sección) — probablemente habilitada a propósito para poder validar este ticket.

**Issue links**: conectada a `IMAS-4064` (SPIKE previo, Hecho); bloquea a `IMAS-4103` y `IMAS-4104`.

**Pendiente propio, según la descripción**: OpenAPI de `refund/exp` (todavía no llegó de Core al momento de escribir esto), wire completo de `auxiliaryClaimsHistory` con semántica multi-mascota, aclarar con Core si el `policy.key` alguna vez es por mascota o siempre por titular/DNI.

## Fase C — Alta Nexus (`IMAS-4103`, In Validation)

**Objetivo**: reemplazar el alta de expediente SISE por `createPetAuxiliary` de Nexus.

**Endpoint real**: `POST /api/assistance/v1/pets/auxiliaries` — confirmado con Core: es solo creación, `refund: {idEstado: 1, montoAReintegrar: 0}`, `assisted.capability` sale del `capabilityList` de la Fase B (no de `getAuxiliaryTypes`). Respuesta real de ejemplo:
```json
{"msg":"Success","statusCode":200,"payload":{"_id":"6a1892acc19472233c78f5d6","filecase":"2499-1"}}
```
Se persiste `filecase` + `_id` (y `siseExpedienteId` si hay dual-write). La mascota va en `assisted.insuredObject` (IKE Mascotas), no en `policy.key` — mismo motivo que la limitante de la Fase B.

**Subtareas propias**: `IMAS-4147` (Análisis, Hecho), `IMAS-4111` (Deploy QA, Hecho), `IMAS-4110` (Desarrollo, Hecho) — **las 3 Hecho**.

**Retest en vivo 2026-08-28.** Casos formales completos en `docs/user-stories/IMAS-4103-alta-nexus.tests.md`. Evidencia de dev (Paula Scalzo, 21/08) muestra un 2do expediente exitoso de la misma cuenta Popi (`3147-1`, distinto del `3268-1` de `IMAS-4092`) — confirma que esta cuenta es la referencia estándar del equipo para Alta+Cierre en Nexus. Mismo hallazgo que `IMAS-4092`: el mecanismo funcionó 2 veces (21/08 y 26/08) pero hoy la misma cuenta no puede completar un alta nueva (mismo `GET /mascotas` con campos null). El control Adquirente sí funciona hoy. 3 de los 9 criterios de aceptación del ticket (`assisted.capability` desde `capabilityList`, `provider.internalCode=2080`, fallo-Nexus-no-corrompe) son de caja negra — no verificables sin logs de backend.

**Issue links**: bloqueada por `IMAS-4092`; bloquea a `IMAS-4104`.

## Fase D — Cierre Nexus (`IMAS-4104`, In Validation)

**Objetivo**: integrar el cierre/actualización de monto vía `refund/exp`, reemplazando el cierre SISE.

**Catálogo completo de estados `refund` (Core)** — nunca documentado en detalle antes en este proyecto:
| ID | Nombre | Uso real en reintegros |
|---|---|---|
| 1 | Recepción de Información | Create, monto 0 |
| 2 | Envío a Finanzas | Opcional/futuro, sin uso hoy |
| 3 | Aviso de Pago | Cierre pago (Finanzas) |
| 4 | Rechazo Incompleto | Opcional, sin uso hoy |
| 5 | Rechazo Definitivo | Cierre rechazo (Calidad o Finanzas) |
| 6 | Pendiente de Aprobación | Opcional, sin uso hoy |
| 7 | Rechazado Devuelto a Calidad | Opcional (inconveniente Finanzas) |

**Subtareas propias**: `IMAS-4148` (Análisis, Hecho), `IMAS-4105` (Desarrollo, Hecho), `IMAS-4108` (Deploy DEV, Hecho), `IMAS-4106` (Deploy QA, Hecho), `IMAS-4109` (Pruebas en Prod, **Cancelado** — no se sabe por qué, no está explicado en ningún comentario con texto), y **`IMAS-4107` (Pruebas en QA) — todavía "In Validation", no Hecho**. Es la única subtarea de esta fase sin cerrar.

**Issue links**: bloqueada por `IMAS-4092` y `IMAS-4103`; bloquea a `IMAS-4124`.

**Retest/investigación 2026-08-28.** Casos formales en `docs/user-stories/IMAS-4104-cierre-nexus.tests.md`. Hallazgo clave: una colección de Postman de Mariana Navarro (14/08, adjunta a esta épica) prueba que **Nexus acepta un rechazo directo (estado 5) sin problema** cuando se lo llama sin pasar por `reintegros-backend`. **Confirmado en vivo, hoy mismo**: se ejecutó la secuencia completa (`claimsHistory` → `createPetAuxiliary` → `POST refund idEstado=5` → nota) directo contra `qa-quantum.ike.ar` — los 4 pasos dieron `200`. Esto acota de forma **definitiva** la causa raíz de `BUG-015`/`IMAS-4354` a `reintegros-backend` exclusivamente — Core/Nexus nunca tuvo ningún problema real. También se encontró que Mariana ya había reportado este mismo problema informalmente el 14/08 (una semana antes de que `IMAS-4354` se creara formalmente el 21/08), y que hubo un "despliegue a dev" el 18/08 — otro dato a favor de la hipótesis de que "dev" y "QA" son entornos distintos con desfasaje.

## Fase E — Notas Nexus (`IMAS-4124`, In Validation)

**Objetivo**: integrar notas/bitácora vía `addAuxiliaryNote`, reemplazando el registro best-effort en SISE. Es Fase 2 de la migración — depende de que Fase 1 (B+C+D) esté estable.

**Endpoint real**: `POST /api/assistance/v1/auxiliaries/notes`, body `{filecase, noteType: "shared", text}` — ejemplo real:
```json
{"filecase":"2820-1","noteType":"shared","text":"https://asistencia.ikeargentina.com.ar/reembolsosuat/homeview.aspx?id=90400"}
```
Usa `filecase` (no `_id`). Explícitamente **no es lo mismo** que `POST /api/assistance/v1/comments` (canal IVR/técnico, no es la bitácora pública).

**Subtareas propias**: `IMAS-4149` (Análisis, Hecho), `IMAS-4150` (Desarrollo, Hecho), `IMAS-4151` (Deploy QA, Hecho), y **2 sin arrancar**: `IMAS-4152` ("Pruebas QA Manuales Nexus" — **"Tareas Por Hacer"**, ya documentada en `docs/user-stories/IMAS-4152-pruebas-qa-manuales-nexus.tests.md` con 5/11 casos ejecutados en una sesión previa — el ticket de Jira nunca se movió a "En Progreso" pese a ese avance real, gap de higiene de estado) y `IMAS-4153` ("Deploy Prod Nexus" — "Tareas Por Hacer").

**Issue links**: bloqueada por `IMAS-4104`.

## El bug — `IMAS-4354` (BUS-005, rechazo directo requiere `clCuenta`)

Ya documentado extensamente en `docs/bugs/BUG-015-rechazo-directo-calidad-pendiente-requiere-clcuenta.md` — el rechazo directo desde Calidad (sin pasar por Finanzas) fallaba con `400 BUS-009` y luego `404 BUS-005 "Nexus pets/refund requires clCuenta"`.

**🎯 ACTUALIZACIÓN IMPORTANTE, encontrada en esta pasada (2026-08-28)**: las subtareas `IMAS-4427` (Desarrollo) y `IMAS-4428` (Deploy a QA) están **ambas Hecho** — y una captura del comentario más reciente (Mariana Navarro, 2026-08-26) muestra evidencia visual real de un rechazo directo **exitoso**: "¡Envío exitoso! Registramos el rechazo del expediente" — expediente `3279-1`, `POST decision-calidad` → **`204 No Content`** (antes daba 404 BUS-005). Verificado cruzado contra el panel interno de Nexus, que muestra el mismo expediente `3279-1` con la prestación "Asesoramiento Nutricional Online".

**Pero la subtarea `IMAS-4429` ("Pruebas en QA") sigue "Tareas Por Hacer"** — el fix parece andar (hay evidencia visual de un caso exitoso), pero la validación formal de QA todavía no se hizo/marcó. **No dar esto por cerrado sin retestear en vivo** — 1 captura de otra persona no reemplaza una validación propia.

**❌ Retest en vivo el mismo día (2026-08-28) — NO se sostuvo.** Reproducidos los pasos exactos (click directo en "Rechazar" de Calidad desde `PENDIENTE`) en 2 expedientes distintos (`3131739` Duko/Scalzo Paula factura OCR completa, `3131793` Nala/Castellano Alexis factura OCR incompleta) — **ambos fallaron con el mismo `404 BUS-005 "Nexus pets/refund requires clCuenta"` de siempre**, mismo endpoint, sin cambios. Contradice directamente la captura "204 exitosa" de 2 días antes. Detalle completo, incluyendo una hipótesis sin confirmar sobre por qué la captura de dev mostró éxito (¿`clCuenta` cacheado por mascota desde una aprobación previa? ¿deploy revertido entre el 26 y el 28?), en `docs/bugs/BUG-015-rechazo-directo-calidad-pendiente-requiere-clcuenta.md` § "Retest en vivo 2026-08-28". **`IMAS-4429` no debería cerrarse en este estado** — pendiente decidir con el usuario si se comenta esto en `IMAS-4354`.

## 🆕 Hallazgo nuevo, no documentado en ningún ticket con texto — 502 "IKE Mascotas lookup failed"

Encontrado en una captura de pantalla del último comentario de la épica `IMAS-4101` (Mariana Navarro, 2026-08-25, sin texto — la imagen es la única evidencia). Pantalla: `vetify-qa.ikeapp.com/section/nuevo-reintegro` (el formulario de **Nuevo reintegro del lado tutor**, no el backoffice de Calidad/Finanzas). Modal de error: "Algo salió mal / Probá de nuevo en un momento." Response real capturada en DevTools:
```json
{"type":"about:blank","title":"Bad Gateway","status":502,"code":"INT-005","message":"IKE Mascotas lookup failed.","traceId":"c8bc80dc-986b-4a07-b2f6-0316a3077a13","instance":"/api/reintegros/v1/mascotas"}
```
**Esto es un hallazgo distinto de `IMAS-4354`** — pasa en un paso mucho más temprano (el tutor ni siquiera llega a elegir mascota/gasto, falla al listar las mascotas asociadas para armar el formulario). No hay ningún ticket, comentario con texto, ni mención en `docs/impedimentos-bloqueos.md` que documente este error puntual (`INT-005`/"IKE Mascotas lookup failed").

**✅ Retest en vivo 2026-08-28: NO reprodujo.** Navegando a `vetify-qa.ikeapp.com/section/nuevo-reintegro` con la cuenta `pauscalzo@hotmail.com` (mascota Mishi), `GET /api/bff/reintegros/mascotas` devolvió `200` dos veces sin problema — el formulario cargó normal y Mishi quedó preseleccionada. El combo de "Cargando tipos de gasto…" quedó deshabilitado, pero por una razón distinta y ya conocida: `GET /api/bff/reintegros/tipos-gasto` respondió `200` con `{"items":[],...}` (sin tipos de gasto disponibles para esa mascota/cobertura — no es un error, ya documentado antes en esta misma sesión como bloqueo de esa cuenta puntual). **Con un solo intento/cuenta no se puede descartar del todo** (podría ser intermitente o específico de otra cuenta/estado), pero no se sostiene como impedimento activo hoy — queda como hallazgo histórico de baja prioridad, no como bloqueo confirmado.

## El workaround — `IMAS-4052` (OSDE Capitado, Hecho) — importante para el alcance de las pruebas

**Hallazgo relevante para diseñar cualquier caso de reintegros de aquí en adelante**: los clientes **Capitados de OSDE** (no todos los capitados — puntualmente OSDE) **no pasan por el flujo de autogestión de reintegros en absoluto**. Al entrar a Reintegros (desde Menú Principal o Quick Access), en vez del formulario real, ven un mensaje informativo pidiendo contactar al Centro de Atención al Cliente (0800 122 1183). Esto es un **workaround intencional y ya productivo** (11 subtareas, todas Hecho, incluida una ronda de fix específico de iOS) — no un bug.

**Consecuencia práctica**: para probar el flujo real de reintegros (el que sí pasa por Nexus, toda la migración de esta épica), **hace falta un usuario Adquirente** (Vetify B2C u OSDE Adquirente) o un Capitado que NO sea de OSDE — un capitado OSDE nunca va a llegar al formulario real, sin importar qué tan bien esté implementada la migración. Si se diseñan casos de prueba para esta épica, excluir explícitamente a OSDE Capitado del alcance de "probar el formulario", y en cambio usarlo (si hace falta) solo para confirmar que el mensaje de workaround se siga mostrando correctamente.

**❌ Retest en vivo 2026-08-28: el mensaje de workaround NO se mostró.** Diseñados y ejecutados 4 casos formales en `docs/user-stories/IMAS-4052-workaround-reintegros-osde-capitado.tests.md`, contra el contrato real (7 AC, extraídos del campo oculto `customfield_11620` — `IMAS-4052` es tipo "Tarea"). Con la única cuenta del pool `OSDE_CAPITADO` que dio evidencia limpia (DNI válido, producto confirmado real `2349` "Vetify Esencial OSDE"), tanto el Menú Principal como "Nuevo reintegro" cargaron el flujo **real** de autogestión (historial con reintegros pagados reales, wizard de alta) — nunca apareció el mensaje informativo del 0800. El control (cuenta Adquirente real de Paula, confirmada horas antes en esta misma sesión) sí se comportó como se espera (AC4 cumplido) — lo que hace notable el contraste. **Ambigüedad parcialmente resuelta**: la cuenta usada (DNI `12540524`, "Popi") resultó ser la misma que dev usó para validar `IMAS-4092` (Fase B) — confirmada "Osde/capitado (H)" en el panel interno de Nexus, no un mal etiquetado del pool. Es más probable que esta cuenta puntual esté deliberadamente habilitada para poder ejercer el flujo real de Capitados (necesario para validar `IMAS-4092`), que un gap general del workaround — si `IMAS-4052` bloqueara también a esta cuenta, nadie podría haber probado nunca que Capitados sí pueden reintegrar. Sigue sin confirmarse si es un mecanismo soportado/documentado. Ver `docs/user-stories/IMAS-4092-obtener-historial-servicios-auxiliares.tests.md` para el detalle completo de esa investigación cruzada.

## Catálogo de productos (adjunto a la épica, `Cuentas activas Vetify.xlsx`, 2026-08-25)

Mismo catálogo real ya usado en otras investigaciones esta sesión (`clCuenta`/`Nombre`/`clGrupoCuenta`) — confirma una vez más que los productos OSDE son **2349** (Grupo 163, "Vetify Esencial OSDE") y **2358-2365** (Grupo 158, con sufijo "OSDE" en el nombre); todo lo demás en Grupo 158 sin sufijo OSDE (2243-2320, 2376) es Vetify común. Adjuntarlo a esta épica sugiere que el equipo lo usa como referencia estándar para pruebas de Reintegros también, no solo para las investigaciones de OSDE/Cooper.

## Estado de otras subtareas mencionadas en las descripciones pero fuera de las 7 principales

Las descripciones ricas de las Fases B/D/E mencionan subtareas propias adicionales con nombres tipo `IMAS-4093`-`IMAS-4100` (fase B) que en la búsqueda live aparecen redundantes con lo ya listado arriba — no se investigó cada una individualmente más allá de lo que ya se muestra en la tabla de subtareas de cada fase (serían ~20+ issues más si se abriera cada una, la mayoría "Activa"/Hecho según el propio texto de la descripción — no se hizo intake individual de cada una en esta pasada, se prioit... [ver "Pendiente" abajo]).

## Pendiente / próximos pasos

1. ~~Retestear en vivo `IMAS-4354`~~ — **hecho el 2026-08-28, mismo día: el bug SIGUE reproduciendo** (2 expedientes distintos, mismo `404 BUS-005`). La evidencia visual de "resuelto" no se sostuvo. Falta decidir con el usuario si se comenta en Jira antes de que se cierre `IMAS-4429` por error.
2. ~~Confirmar si el 502 "IKE Mascotas lookup failed" (`INT-005`) sigue reproduciendo~~ — **hecho el 2026-08-28: no reprodujo** (1 cuenta, 2 intentos, ambos `200`). Queda como hallazgo histórico de baja prioridad, no bloqueo activo.
3. **Retestear Fase D en general** (`IMAS-4107` "Pruebas en QA" sigue sin cerrar) y Fase E (`IMAS-4152`/`IMAS-4429` "Tareas Por Hacer", nunca se marcó "En Progreso" pese al avance ya documentado).
4. Decidir si vale la pena abrir intake individual de las ~20 subtareas técnicas mencionadas dentro de las descripciones de B/D/E (`IMAS-4093`-`IMAS-4100`, etc.) o si alcanza con el nivel de detalle ya capturado acá.
5. Diseñar casos de prueba formales (`.tests.md`) para esta épica, ahora con todo el contrato técnico real documentado — excluyendo explícitamente OSDE Capitado del alcance de "probar el formulario real" (ver hallazgo de `IMAS-4052` arriba).
