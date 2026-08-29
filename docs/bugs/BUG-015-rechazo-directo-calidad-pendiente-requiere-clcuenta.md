# BUG-015 — Rechazo directo de Calidad desde PENDIENTE falla (400/404) por precondiciones no documentadas ligadas a Nexus

**Jira**: **`IMAS-4354`** ("[Reintegros Calidad] Rechazo de expediente falla (BUS-005): Nexus pets/refund requiere clCuenta") — **ya existía**, creado por Mariana Navarro (dev) el 2026-08-21, un día antes de que lo encontráramos por nuestra cuenta. Estado en Jira: "En Progreso", colgando de `IMAS-4101`. No hace falta filear un Defect nuevo — confirmado 2026-08-24 vía `search "parent = IMAS-4101"`.
**Título sugerido**: BUG | Rechazo de Calidad desde PENDIENTE bloqueado por BUS-009/BUS-005 (monto no distribuido / clCuenta ausente en Nexus)
**Severidad**: Medio-Alto — no bloquea el camino feliz (Calidad aprueba primero, como en CP01/CP03/CP07/CP08, todos verificados en vivo), pero bloquea por completo el camino "Calidad rechaza directo desde PENDIENTE sin pasar por Finanzas" (Escenario 1 de `IMAS-4124`, casos CP04/CP05), que es un camino de negocio real y esperado según el Gherkin de la HU.
**Categoría**: Backend / Reglas de negocio (`reintegros-backend`)
**HU relacionada**: `IMAS-4124` (Notas en Nexus), subtarea `IMAS-4152` (Pruebas QA Manuales Nexus) — Escenario 1, casos CP04/CP05 de `docs/user-stories/IMAS-4152-pruebas-qa-manuales-nexus.tests.md`

## Información del entorno

- Ambiente: QA — `https://reintegros-backoffice.ike.qa/` (Calidad/Finanzas) + `https://vetify-qa.ikeapp.com/` (alta del tutor)
- Cuenta de prueba: Cruella Devil, DNI `98765499`, mascota Manchitas, plan Vetify Esencial OSDE
- Expediente afectado: `3188-1` (solicitudId `63acb2b6-6d79-4471-8dfc-08bb581cf5d9`)
- Fecha: 2026-08-22

## Descripción

Se intentó ejecutar CP04/CP05: Calidad rechaza un expediente directo desde `PENDIENTE`, sin que Finanzas lo toque. El flujo se bloqueó en dos pasos sucesivos, ninguno de los cuales está documentado como precondición en la HU/Gherkin:

1. **`BUS-009`** — al intentar `Rechazar` inmediatamente después de completar los campos de OCR ("Campos incompletos") y guardar vía "Verificar", el backend devuelve 400: *"Claim dossier must have a positive amount before SISE closure on quality rejection."* Causa real: completar los campos de la factura (monto, CAE, tipo de comprobante) **no asigna el monto a la línea de cobertura del expediente** — hace falta un paso adicional y no obvio, "Distribuir factura" (un modal separado, alcanzado desde el resumen de cobertura), donde se debe escribir explícitamente el monto en la línea correspondiente y confirmar. Sin ese paso, el monto "Asignado" queda en `$0,00` aunque el campo "Monto" de la factura ya muestre `$120`.

2. **`BUS-005`** — después de distribuir la factura correctamente (Asignado = Total = $120,00), reintentar `Rechazar` devuelve 404: *"Nexus pets/refund requires clCuenta."* `clCuenta` es un identificador de cuenta/póliza en Nexus que, según lo observado, **solo se popula como parte del mismo pipeline de validación de cobertura que usa el flujo de aprobación** ("Verificar" → 502 de ARCA → reload → "Validar manualmente" → confirmar → "Validar" → "Confirmar validación", el mismo camino documentado para CP01). No se encontró ninguna acción en la UI que popule `clCuenta` sin, en el mismo paso, mover el expediente hacia la aprobación (`VALIDADO`).

**Consecuencia**: tal como está hoy el ambiente/flujo de QA, no parece posible rechazar un expediente directo desde `PENDIENTE` (sin que pase antes por la resolución de cobertura que en la práctica equivale a aprobarlo) — lo cual contradice el Escenario 1 de `IMAS-4124`, que espera que Calidad pueda rechazar directo desde `PENDIENTE`.

## Pasos para reproducir

1. Dar de alta un reintegro nuevo (cualquier categoría) desde `vetify-qa.ikeapp.com`, con una factura cuyo OCR quede incompleto (para reproducir el paso 1) o completo (para ir directo al paso 2).
2. En `reintegros-backoffice.ike.qa`, abrir el expediente recién creado (estado `PENDIENTE`).
3. Sin usar "Validar manualmente" ni completar la validación de cobertura, click en "Rechazar" (el botón de Calidad, no el deshabilitado de Finanzas) y elegir cualquier motivo del catálogo (ej. "Costo elevado").
4. Click en "Enviar".

## Resultado esperado

El expediente debería poder rechazarse directo desde `PENDIENTE`, sin requerir que primero pase por el pipeline de validación de cobertura (que es, en la práctica, el camino de aprobación).

## Resultado actual

- Intento 1 (sin distribuir factura): `POST .../decision-calidad` → **400 BUS-009** — *"Claim dossier must have a positive amount before SISE closure on quality rejection."*
- Intento 2 (factura distribuida, monto asignado = $120, pero sin pasar por "Validar manualmente"): `POST .../decision-calidad` → **404 BUS-005** — *"Nexus pets/refund requires clCuenta."*

El expediente `3188-1` quedó en `PENDIENTE`, sin cambios (ambos intentos de rechazo fallaron sin comprometer el estado).

## Notas adicionales

- **Ya está en Jira como `IMAS-4354`** (ver arriba) — no filar un Defect nuevo. Nuestra evidencia (2 reproducciones adicionales + la causa raíz del pipeline `clCuenta`, ver sección siguiente) queda documentada acá; decisión pendiente del usuario sobre si sumarla como comentario en Jira o dejarla solo en este doc interno (2026-08-24: por ahora, solo interno).
- Los otros 3 caminos de esta suite (CP01/CP03: aprobar→pagar; CP07/CP08: aprobar→Finanzas rechaza→Calidad rechaza definitivo) **sí funcionan end-to-end** y fueron verificados en vivo el mismo día — el problema es específico al camino "rechazo directo desde `PENDIENTE`, sin aprobación previa ni paso por Finanzas".
- Relacionado con el error 502 de ARCA ya documentado (`docs/conocimiento-sistema.md`) — es esperado en QA por diseño del ambiente, no es la causa de este bug.

## Segunda reproducción independiente (2026-08-22, mismo día)

Alan reprodujo el mismo bug de forma independiente (siguiendo el instructivo de reproducción, sin usar las herramientas de automatización de esta sesión), en un **expediente y categoría distintos**:

- Expediente: `3192-1` (solicitudId `28834654-b4e2-4373-a321-069c1a000504`)
- Categoría: **"Videollamada Veterinaria"** (`clSubServicio=493`) — distinta a la usada en la primera reproducción (`445`, Consulta en centro veterinario)
- Mismo resultado exacto: `404 BUS-005` — *"Nexus pets/refund requires clCuenta."*

**Por qué importa**: confirma que el bloqueo **no depende de la categoría del gasto** — es un problema general del camino "Calidad rechaza directo desde `PENDIENTE`", reproducible con distintos datos, por dos personas distintas, el mismo día. Sube la confianza de que es un bug real y no un artefacto de una cuenta/dato puntual.

**Hallazgo adicional en el camino** (no directamente parte de este bug, pero relacionado con el mismo pipeline): al dar de alta un reintegro con categoría **"Traslado de mascotas"** (`clSubServicio=502`) para la misma cuenta, el alta falló con `502 Bad Gateway / BUS-006 "Nexus claimsHistory does not report capability for clSubServicio=502"` — un gap de cobertura en el datalake de Nexus (ya documentado como límite conocido, ver CP02 en `IMAS-4152`), agravado porque el sistema devuelve **502** (error de infraestructura) para lo que en realidad es una falta de dato de negocio. No bloqueó la reproducción de este bug (se resolvió probando con otra categoría), pero vale la pena que dev lo revise por separado — un 502 en vez de un 4xx con mensaje claro puede confundir a monitoreo/soporte.

## 🎯 Actualización 2026-08-28 — evidencia de que está resuelto, pendiente de retest propio

Re-intake completo de la épica `IMAS-4101` (a pedido del usuario). En Jira, `IMAS-4354` avanzó: sus subtareas `IMAS-4427` (Desarrollo) e `IMAS-4428` (Deploy a QA) están **Hecho**. El comentario más reciente (Mariana Navarro, 2026-08-26, solo capturas sin texto) muestra un rechazo directo de Calidad **exitoso**:

- Modal "¡Envío exitoso! Registramos el rechazo del expediente" — expediente `32382023` por `$60.000,00`, `filecase` Nexus `3279-1`.
- DevTools: `POST .../decision-calidad` → **`204 No Content`** (antes daba `404 BUS-005`). Payload real: `{"accion":"RECHAZAR","motivoCalidadId":"67dda292-c0d7-4613-bb12-848774dc7582","mensajeTitular":"No pudimos aprobar tu solicitud porque detectamos inconsistencias en los datos de la factura..."}`.
- Verificado cruzado contra el panel interno de Nexus: el mismo expediente `3279-1` aparece con la prestación "Asesoramiento Nutricional Online" — confirma que el cierre quedó bien registrado también del lado interno.

**Parece resuelto — pero la subtarea `IMAS-4429` ("Pruebas en QA") sigue "Tareas Por Hacer"**, sin marcar. Esta captura es evidencia de un caso exitoso (probablemente de dev validando su propio fix), no una validación formal de QA. **Pendiente**: retestear en vivo (reproducir exactamente los pasos de este bug — rechazo directo desde `PENDIENTE`, sin pasar por Finanzas ni por "Validar manualmente") antes de dar esto por cerrado y transicionar `IMAS-4429`/comentar en `IMAS-4354`.

## ❌ Retest en vivo 2026-08-28 (mismo día) — el bug SIGUE reproduciendo, contradice la evidencia de arriba

Retest independiente en `reintegros-backoffice.ike.qa`, logueado como Alex (`acastellano@ikeasistencia.com.ar`), siguiendo exactamente los pasos originales (click directo en "Rechazar" de Calidad desde `PENDIENTE`, sin "Validar manualmente" ni pasar por Finanzas). **Dos expedientes distintos, mismo resultado exacto ambas veces:**

| Expediente | Titular / mascota | Estado factura | Motivo elegido | Resultado |
|---|---|---|---|---|
| `3131739` | Scalzo Paula / Duko (Internación, plan Vetify Classic x1) | Factura OCR completa ("Validación manual") | Costo elevado | `POST decision-calidad` → **404** `{"code":"BUS-005","message":"Nexus pets/refund requires clCuenta."}` |
| `3131793` | Castellano Gutierrez Alexis Sebastian (DNI `32382023`) / Nala (Consulta en centro veterinario, plan Vetify 100 Senior x1) | Factura OCR incompleta ("Pendiente de verificación", "Campos incompletos") | Factura inconsistente | `POST decision-calidad` → **404** `{"code":"BUS-005","message":"Nexus pets/refund requires clCuenta."}` |

Mismo `code`, mismo `message`, mismo endpoint (`/api/reintegros/v1/backoffice/expedientes/{id}/decision-calidad`) que la reproducción original de 2026-08-22 — **no es un caso puntual, es el mismo bug sin resolver**, verificado con datos y cuentas completamente distintas a las de la captura "exitosa".

**Dato curioso, no confirmado como causa**: el titular del expediente `3131793` es **Alexis Castellano** (DNI `32382023`) — la misma persona dueña de la captura "exitosa" de `IMAS-4354` (que documentaba un rechazo para un DNI/número `32382023`, ver sección de arriba). Es decir, la propia mascota de Alexis (Nala) también falla hoy con `BUS-005`, pese a que la captura de fix la asocia al mismo DNI. Hipótesis sin confirmar: la captura "exitosa" pudo corresponder a otra mascota/expediente de la misma cuenta donde `clCuenta` ya estaba poblado por actividad previa en Nexus (aprobación anterior de ese pet puntual), no a un fix general del pipeline — o el deploy a QA no se propagó/se revirtió entre el 26 y el 28. No se puede confirmar cuál sin que dev lo aclare.

**Conclusión**: `IMAS-4429` NO debería marcarse Hecho todavía. La evidencia de la captura de Mariana Navarro no se sostuvo en un retest QA independiente el mismo día. Pendiente decidir con el usuario si esto se comenta en `IMAS-4354` (Jira) antes de que alguien dé el bug por cerrado.

## 🎯 Causa raíz acotada — el problema es de `reintegros-backend`, no de Nexus/Core

Investigando `IMAS-4104` (Cierre Nexus) por separado, se encontró una colección de Postman que Mariana Navarro armó el 2026-08-14 para probar Nexus **directo**, sin pasar por `reintegros-backend` ni el backoffice (carpeta "02 Camino no feliz (rechazo)": `createPetAuxiliary` → `registerPetRefund estado 5` → `addAuxiliaryNote rechazo`). Una captura de esa fecha muestra que el rechazo (estado 5) **se registró con éxito directamente en Nexus** — nota real generada: `"Estado: Rechazo Definitivo, Monto: 1500, Observaciones: prueba camino no feliz"`.

Esto acota la causa raíz: **Nexus (Core) acepta y procesa un rechazo directo sin problema** cuando se lo llama de forma aislada — el bloqueo (`404 BUS-005 "requires clCuenta"`) es una validación propia de `reintegros-backend`, que exige `clCuenta` ANTES de siquiera intentar llamar a `refund/exp` en Nexus. La responsabilidad del fix es 100% de `reintegros-backend`, no depende de Core. Ver `docs/user-stories/IMAS-4104-cierre-nexus.tests.md` para el detalle completo.

## ✅ CONFIRMACIÓN DEFINITIVA E INDEPENDIENTE 2026-08-28 — Nexus acepta el rechazo directo, HOY, probado por QA

Usando la colección de Postman de Mariana (adaptada — el export tenía un campo `assisted.contact.name`/`surname` faltante que hoy el contrato exige, se completó con datos sintéticos), se ejecutó la secuencia completa "Camino no feliz (rechazo)" **directo contra Nexus, sin pasar por `reintegros-backend`**, con la cuenta de prueba dedicada de Mariana (`clCuenta 1715`, `clave 13313024`, 19 capabilities reales confirmadas vía `claimsHistory` el mismo día):

1. `GET /api/customers/aux/claimsHistory/1715-13313024` → **200**, capabilityList completo y real.
2. `POST /api/assistance/v1/pets/auxiliaries` (create, refund 1/0) → **200**, `filecase: "3307-1"`.
3. **`POST /api/assistance/v1/pets/refund` con `idEstado: "5"` (Rechazo Definitivo), `clExpediente: "3307-1"` → `200 OK`**, `notesProvider` con la nota generada correctamente.
4. `POST /api/assistance/v1/auxiliaries/notes` (nota shared) → **200**.

**Los 3 pasos del rechazo directo funcionan perfecto, hoy mismo, llamando a Nexus sin intermediarios.** Esto confirma de forma independiente y con datos frescos (no una captura de hace 2 semanas) que el problema de `BUG-015` está **100% aislado en `reintegros-backend`** — Nexus/Core nunca tuvo ni tiene ningún problema real para procesar un rechazo directo. El fix, cuando se haga, no requiere ningún cambio de Core — es enteramente responsabilidad del equipo de `reintegros-backend` (probablemente relajar o completar la validación de `clCuenta` antes de llamar a Nexus, en vez de exigirla incondicionalmente).
