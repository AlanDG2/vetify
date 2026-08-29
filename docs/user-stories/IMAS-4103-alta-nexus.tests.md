# Diseño de casos — IMAS-4103 [Reintegros] C: Alta Nexus (subtarea de IMAS-4101)

> Diseño basado en riesgo (qa-risk-test-design). Riesgo: **alto** — reemplaza el alta de expediente (`SiseExpedienteAltaPort`/`registerCase`) por `createPetAuxiliary` de Nexus; si falla, ningún reintegro nuevo puede crearse, para ningún segmento.
>
> **Fuente**: `customfield_11620` de Jira (es "Tarea", igual patrón que `IMAS-4052` — descripción estándar vacía). Comparte mecanismo técnico con `IMAS-4092` (ambos dependen de `capabilityList`/`auxiliaryClaimsHistory`) — donde el alcance se solapa, este doc referencia `docs/user-stories/IMAS-4092-obtener-historial-servicios-auxiliares.tests.md` en vez de duplicar.

## Contrato real (resumen)

**Objetivo**: reemplazar el alta SISE por `createPetAuxiliary` de Nexus, conviviendo con SISE si hace falta (dual-write/shadow).

**Endpoint**: `POST /api/assistance/v1/pets/auxiliaries`. Auth: API-KEY (+ opcional `Customer-Channel`).

**Confirmado con Core**: create = solo creación; `refund: {idEstado:1, montoAReintegrar:0}`; `assisted.capability` viene de `capabilityList` de `claimsHistory` (no de `getAuxiliaryTypes`, cancelado).

**Response real**: `{"msg":"Success","statusCode":200,"payload":{"_id":"...","filecase":"2499-1"}}` — se persiste `nexusFilecase`+`nexusId` (+`siseExpedienteId` si dual-write).

**Estrategia de convivencia de IDs** (3 opciones documentadas en el ticket): A) Dual-write (SISE+Nexus, PK local `clExpediente`); B) Solo Nexus (PK `filecase`/`_id`); C) Shadow (SISE primary, Nexus best-effort). **Recomendación del propio ticket**: create con refund 1/0 ahora; migrar a la opción B cuando exista `refund/exp` (Fase D, ya existe — `IMAS-4104`).

**Criterios de aceptación, citados textual — ninguno marcado**:
- [ ] Confirmación abre expediente Nexus con refund `1/0`.
- [ ] `assisted.capability` viene de `capabilityList` (sin `getAuxiliaryTypes`).
- [ ] Se persisten `filecase` y `_id`.
- [ ] Adquirientes y capitados pueden abrir.
- [ ] Provider `2080` correcto.
- [ ] Mascota en `insuredObject` (no vía `policy.key`).
- [ ] Caso 2+ mascotas: mismo `policy.key`, distinto `insuredObject`.
- [ ] Fallo Nexus no deja solicitud inconsistente.
- [ ] Tests alineados a OpenAPI.

Las últimas 2 (multi-mascota, tests-vs-OpenAPI) no tienen CP propio nuevo acá — la primera es exactamente `CP04` de `IMAS-4092` (mismo gap de datos, no se repite el análisis), la segunda es un criterio de proceso.

## Evidencia de dev — mismo patrón que IMAS-4092, misma cuenta de referencia

Comentario de Paula Scalzo, 2026-08-21, 2 capturas adjuntas: *"Paso esta tarjeta para validar y adjunto las pruebas realizadas donde se evidencia el alta de los expedientes de reintegros en Nexus."* Otra vez la cuenta **DNI `12540524`, "Popi"** (la misma de `IMAS-4052`/`IMAS-4092`, confirmada "Osde/capitado (H)"). Evidencia: expediente `3147-1`, "Consulta en centro veterinario", $100 — panel interno de Nexus muestra `Aceptado 20/08/26 17:07 → Finalizado 17:11`, sección **"Servicios auxiliares"** (nombre real del ítem de menú, confirmado por primera vez en esta captura), logueado como Paula Scalzo.

Con esto son **2 expedientes distintos** de Popi confirmados por dev en 2 fechas distintas (`3147-1` el 21/08, `3268-1` el 26/08) — refuerza que esta cuenta fue usada repetidamente como referencia estándar del equipo para validar Alta+Cierre en Nexus, no un caso aislado.

## TS-01 Alta exitosa (AC1, AC2, AC3)

**CP01 - Verificar que existe evidencia de alta exitosa histórica para Capitado y Adquirente** ✅✅ **CONFIRMADO — evidencia cruzada, no ejecutado hoy mismo**
- Capitado (Popi, DNI `12540524`): 2 expedientes confirmados por dev (`3147-1` 21/08, `3268-1` 26/08) + reconfirmado por mí hoy vía "Mis reintegros" (historial real: Pagado 4, Solicitado 1, Desaprobado 2).
- Adquirente (Cruella Devil, DNI `98765499`, ejecutado 2026-08-22 en `IMAS-4152.tests.md` CP01): expediente `3184-1`, `solicitudId=4e74b0b0-...`, `201` en la confirmación.
- Trazabilidad: AC1 (refund 1/0 — inferido, no inspeccionado directamente en DevTools en ninguna de las 2 corridas), AC3 (`filecase`/`_id` persistidos — sí, visibles como "Expediente en SISE" en el backoffice en ambos casos), AC4 (adquirientes y capitados pueden abrir — cumplido **históricamente**, ver CP02 para el estado de hoy).

**CP02 - Verificar que HOY se puede dar de alta un reintegro nuevo para Capitado (AC4, mitad "capitados")** 🔴 **NO PASA — mismo hallazgo que CP02 de `IMAS-4092`, no se repite la ejecución**
- Ver `docs/user-stories/IMAS-4092-obtener-historial-servicios-auxiliares.tests.md` CP02: con la misma cuenta Popi, `GET /mascotas` devuelve el registro con todos los campos de identidad en `null` — la UI nunca llega a ofrecer el paso de elegir capability/categoría, así que **este CP tampoco se puede completar hoy** por la misma causa raíz.
- Trazabilidad: AC4 — no se cumple hoy para Capitado, aunque sí se cumplió el 21/08 y el 26/08.

**CP03 - Verificar que HOY se puede dar de alta un reintegro nuevo para Adquirente (AC4, mitad "adquirientes")** ✅✅ **CONFIRMADO HOY**
- Ver `IMAS-4092.tests.md` CP03: cuenta `pauscalzo@hotmail.com` (Mishi), `GET /mascotas` → `200` con datos completos, wizard cargó con Mishi preseleccionada.
- Trazabilidad: AC4 — cumplido para Adquirente, hoy mismo.

## TS-02 Contrato técnico específico de Alta (AC2, AC5, AC8)

**CP04 - Verificar que `assisted.capability` viene de `capabilityList` y no de `getAuxiliaryTypes`** 🟠 **NO VERIFICABLE DESDE LA UI**
- Es un detalle de implementación del backend (qué endpoint interno se llama) — no observable desde Network del navegador (la llamada capabilityList→capability es servidor a servidor, `reintegros-backend` → Nexus `Customers`). Se puede inferir indirectamente (el alta funciona con categorías reales, `getAuxiliaryTypes` está cancelado según el propio ticket) pero no confirmar en positivo sin logs de backend.
- Trazabilidad: AC2 — no verificable por QA de caja negra, requeriría logs de `reintegros-backend` o que dev confirme.

**CP05 - Verificar que el `provider.internalCode` es `2080`** 🟠 **NO VERIFICABLE DESDE LA UI**
- Mismo caso que CP04 — es un campo interno del payload que arma el backend al llamar a Nexus, no expuesto en ninguna pantalla de tutor ni de backoffice que haya visto hasta ahora.
- Trazabilidad: AC5 — no verificable por QA de caja negra sin acceso a logs/API interna.

**CP06 - Verificar que un fallo de Nexus durante el alta no deja la solicitud en un estado inconsistente** 🟠 **NO EJECUTABLE SIN FAULT-INJECTION**
- Mismo tipo de limitación ya documentada para `CP10` de `IMAS-4152` (nota best-effort) — requeriría poder simular un fallo de Nexus a mitad del alta (timeout, 500, etc.), no disponible manualmente en QA.
- Trazabilidad: AC8 — pendiente de una herramienta de fault-injection o coordinar con dev un escenario controlado.

## Resumen de cobertura

| AC del ticket | Cubierto por | Estado |
|---|---|---|
| Confirmación abre expediente con refund 1/0 | CP01 | 🟡 Inferido de evidencia histórica, no inspeccionado en DevTools directamente |
| `assisted.capability` de `capabilityList` | CP04 | 🟠 No verificable de caja negra |
| Persisten `filecase`/`_id` | CP01 | ✅ Confirmado (visibles como número de expediente en backoffice) |
| Adquirientes y capitados pueden abrir | CP02 (capitado), CP03 (adquirente) | 🔴 Capitado falla HOY / ✅ Adquirente funciona HOY |
| Provider 2080 correcto | CP05 | 🟠 No verificable de caja negra |
| Mascota en `insuredObject` | — | Mismo gap de multi-mascota que `IMAS-4092` CP04, sin cuenta disponible |
| Caso 2+ mascotas | — | Ídem — ver `IMAS-4092.tests.md` CP04 |
| Fallo Nexus no corrompe solicitud | CP06 | 🟠 No ejecutable sin fault-injection |
| Tests alineados a OpenAPI | — | Criterio de proceso, no funcional |

**Conclusión**: mismo patrón que `IMAS-4092` — el mecanismo de Alta funcionó (2 veces, con fechas y expedientes distintos) para Capitado, pero **hoy específicamente la cuenta de referencia no puede completar un alta nueva**. 3 de los 9 AC son de caja negra imposible de verificar sin acceso a backend/logs (`assisted.capability`, `provider.internalCode`, fallo-Nexus) — quedan como huecos estructurales de esta forma de testear, no fallas encontradas.

## Pendiente

1. Mismo pendiente que `IMAS-4092`: conseguir una cuenta Capitado con DNI válido para descartar que el problema de `/mascotas` sea específico de Popi.
2. Para AC2/AC5/AC8 (capability desde capabilityList, provider 2080, fallo Nexus): pedir a dev logs de un alta real, o coordinar un ambiente donde se pueda inspeccionar el payload servidor-a-servidor hacia Nexus.
3. Confirmar con Alan/Alexis si hay más gente con acceso al panel "Iké Argentina (dev)" además de Alexis — esta sesión encontró que Paula Scalzo también lo tiene (aparece logueada en las capturas), lo que amplía las opciones para pedir acceso y destrabar `IMP-013`.
