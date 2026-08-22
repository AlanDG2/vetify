# BUG-015 — Rechazo directo de Calidad desde PENDIENTE falla (400/404) por precondiciones no documentadas ligadas a Nexus

**Jira**: N/A (no filed — ver nota al final)
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

- **No se filó todavía en Jira** — se documenta acá primero, siguiendo el criterio de "documentar y frenar" antes de escalar, dado que no se descartó del todo si esto es (a) un bug real de precondiciones faltantes, o (b) una limitación conocida y aceptada del flujo QA que el equipo de dev ya tiene presente. Recomendado confirmar con dev/Mariana Navarro antes de crear el Defect.
- Los otros 3 caminos de esta suite (CP01/CP03: aprobar→pagar; CP07/CP08: aprobar→Finanzas rechaza→Calidad rechaza definitivo) **sí funcionan end-to-end** y fueron verificados en vivo el mismo día — el problema es específico al camino "rechazo directo desde `PENDIENTE`, sin aprobación previa ni paso por Finanzas".
- Relacionado con el error 502 de ARCA ya documentado (`docs/conocimiento-sistema.md`) — es esperado en QA por diseño del ambiente, no es la causa de este bug.

## Segunda reproducción independiente (2026-08-22, mismo día)

Alan reprodujo el mismo bug de forma independiente (siguiendo el instructivo de reproducción, sin usar las herramientas de automatización de esta sesión), en un **expediente y categoría distintos**:

- Expediente: `3192-1` (solicitudId `28834654-b4e2-4373-a321-069c1a000504`)
- Categoría: **"Videollamada Veterinaria"** (`clSubServicio=493`) — distinta a la usada en la primera reproducción (`445`, Consulta en centro veterinario)
- Mismo resultado exacto: `404 BUS-005` — *"Nexus pets/refund requires clCuenta."*

**Por qué importa**: confirma que el bloqueo **no depende de la categoría del gasto** — es un problema general del camino "Calidad rechaza directo desde `PENDIENTE`", reproducible con distintos datos, por dos personas distintas, el mismo día. Sube la confianza de que es un bug real y no un artefacto de una cuenta/dato puntual.

**Hallazgo adicional en el camino** (no directamente parte de este bug, pero relacionado con el mismo pipeline): al dar de alta un reintegro con categoría **"Traslado de mascotas"** (`clSubServicio=502`) para la misma cuenta, el alta falló con `502 Bad Gateway / BUS-006 "Nexus claimsHistory does not report capability for clSubServicio=502"` — un gap de cobertura en el datalake de Nexus (ya documentado como límite conocido, ver CP02 en `IMAS-4152`), agravado porque el sistema devuelve **502** (error de infraestructura) para lo que en realidad es una falta de dato de negocio. No bloqueó la reproducción de este bug (se resolvió probando con otra categoría), pero vale la pena que dev lo revise por separado — un 502 en vez de un 4xx con mensaje claro puede confundir a monitoreo/soporte.
