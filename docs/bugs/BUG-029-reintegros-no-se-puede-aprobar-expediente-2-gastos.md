Jira: IMAS-4476 — ya creado en Jira, en estado "En Progreso", asignado a Mariana Navarro.

[Título]: BUG | Reintegros: no se puede aprobar expediente con 2 gastos cargados — error "expense type amount" en decision-calidad
[Severidad]: Alto — bloquea la aprobación de Calidad cuando hay 2 gastos cargados; el expediente no llega a Finanzas para el pago final.
[Categoría]: Flujo
[HU relacionada]: IMAS-4101 (épica migración SISE→Nexus)

[Información del entorno]:
- Ambiente: QA — `https://reintegros-backoffice.ike.qa`
- Fecha de detección: no especificada en Jira, analizada 2026-09-02
- Subtarea QA: IMAS-4504 (Pruebas en QA) — estado: "Tareas Por Hacer"

[Descripción]:
Cuando se carga más de un gasto (2+) en un expediente de reintegro y se intenta aprobar desde la pantalla de Calidad del backoffice, el endpoint `decision-calidad` rechaza la aprobación con el error "reimbursement request must have an expense type amount before approval to finance". La UI del backoffice muestra "Algo salió mal / Probá de nuevo en un momento" y el expediente queda bloqueado — no llega a Finanzas.

Este bug afecta el flujo completo de la migración SISE→Nexus: si un expediente tiene 2+ gastos (situación real en producción donde el tutor carga más de un concepto en la factura), la aprobación se corta en Calidad.

[Pasos para reproducir]:
1. Ingresar al backoffice de Reintegros (`reintegros-backoffice.ike.qa`) con usuario de Calidad.
2. Seleccionar un expediente con 2 gastos cargados (ej. expediente `3300-1` en QA).
3. Verificar que los gastos están cargados correctamente.
4. Intentar aprobar (presionar "Aprobar" o botón de decisión de Calidad).
5. Observar la respuesta.

[Resultado esperado]:
La aprobación de Calidad se completa exitosamente. El sistema registra la aprobación y deriva el expediente a Finanzas. Cada gasto mantiene su monto y expense type correcto.

[Resultado actual]:
- UI: "Algo salió mal / Probá de nuevo en un momento"
- API: `decision-calidad` devuelve error con mensaje "reimbursement request must have an expense type amount before approval to finance"
- Expediente queda bloqueado en Calidad, no llega a Finanzas

[Detalle técnico] (para el equipo de desarrollo):
- Endpoint: `decision-calidad` (endpoint del flujo de aprobación en Calidad)
- Error: `reimbursement request must have an expense type amount before approval to finance`
- Expediente de ejemplo en QA: `3300-1`
- Subtarea de desarrollo: IMAS-4501 (Desarrollo) — estado: "Tareas Por Hacer"
- Subtarea de QA: IMAS-4504 (Pruebas en QA) — estado: "Tareas Por Hacer"

[Notas adicionales]:
- IMAS-4476 tiene 5 subtareas: Análisis ✅, Reunión con Core (Tareas Por Hacer), Desarrollo (Tareas Por Hacer), Deploy QA (Tareas Por Hacer), Pruebas QA (Tareas Por Hacer).

## 🔎 Retest 2026-09-02 — NO reproduce

Retest en QA (`reintegros-backoffice.ike.qa`) con usuario de Calidad `acastellano@ikeasistencia.com.ar`. Expediente real: **3131925** (Firulais, Videollamada Veterinaria, $350 asignado), parte de solicitud `135adcad-aafc-4955-8f4f-2b077f69442e` con 2 gastos (3131925 Videollamada + 3131924 Consulta, ambos $350 de una factura de $700).

Flujo ejecutado completo:
1. "Distribuir factura" → dialog con 2 líneas (Consulta + Videollamada), ambas con monto $350, destino correcto → Confirmar distribución → 200 OK
2. "Validar manualmente" → dialog de confirmación de validación manual → Confirmar → PATCH `/aprobacion-manual-arca` → 200 OK, cobertura calculada
3. "Validar" (botón de decisión de Calidad) → dialog "Confirmar validación" → Confirmar y enviar

**Resultado clave**: `POST /api/bff/reintegros/backoffice/expedientes/3131925/decision-calidad` body `{"accion":"APROBAR"}` → **HTTP 204 No Content** (éxito). El toast de la UI mostró "¡Envío exitoso! Derivamos el expediente para su aprobación final." El expte salió de la bandeja de Pendientes (41 → 40 en la bandeja).

**Decisión**: El bug no reproduce en QA con este escenario. IMAS-4476 sigue en "En Progreso" — es posible que el fix ya esté aplicado en QA (deployado entre la detección original y este retest), o que las condiciones específicas del bug original (tipo de gasto, estado del expediente, versión del producto/plan) no se replican exactamente con este caso de prueba. Continuar como watch item; si vuelve a aparecer en otro expediente con 2+ gastos, sí amerita investigación adicional.

**Decisión (2026-09-02)**: no es un bug activo en QA. IMAS-4476 sigue abierto en Jira — verificar con el equipo si el fix ya fue deployado a QA o si el bug requiere condiciones distintas para reproducirse.
- La subtarea de análisis (IMAS-4502) ya está "Hecho", lo que sugiere que el equipo ya entendió el problema.
- No se verificó en vivo esta sesión (backoffice inaccesible sin VPN, sin cuenta de Calidad en el pool).
- Requiere verificar en QA una vez que el fix esté listo (IMAS-4504).

## 🔁 Cross-validación 2026-09-02 con VPN — también NO reproduce (2/2)

Verificación adicional el mismo día con VPN, usuario de Calidad `acastellano@ikeasistencia.com.ar`, sobre la **otra mitad de la misma solicitud de 2 gastos** (`135adcad-aafc-4955-8f4f-2b077f69442e`): expte **3131924** (Firulais, Consulta en centro veterinario, $350 asignado, parte de la misma factura $700 de Prueba Monotributo).

Flujo ejecutado:
1. Bandeja Pendientes (39 items al inicio de esta pasada) → click en expte 3131924.
2. "Validar" → dialog "Confirmar validación" → "Confirmar y enviar".
3. `POST /api/bff/reintegros/backoffice/expedientes/3131924/decision-calidad` body `{"accion":"APROBAR"}` → **HTTP 204 No Content**.
4. Toast UI: "¡Envío exitoso! Derivamos el expediente para su aprobación final. El expediente de 13313024 por $ 0,00 fue enviado correctamente. Expediente: 3131924".

**Resultado de la bandeja**: 3131924 desapareció de Pendientes. La bandeja pasó de 39 → 38 (los 2 exptes de esta solicitud de 2 gastos salieron juntos, ambos con 204).

**Conclusión reforzada**: 2/2 aprobaciones Calidad de expedientes que pertenecen a una solicitud de 2 gastos cargados, ambos `decision-calidad` con 204. El bug no reproduce. La causa más probable hoy es que el fix ya está aplicado en QA; el síntoma original (400 con "reimbursement request must have an expense type amount before approval to finance") ya no se observa.

## ✅ Retest final 2026-09-18 — CONFIRMADO ARREGLADO (IMAS-4504)

Retomado con IMAS-4476 en "In Validation" y todas las subtareas de desarrollo (`IMAS-4501` Desarrollo, `IMAS-4503` Deploy QA, `IMAS-4528` Reunión Core, `IMAS-4643` Validar diseño) ya "Hecho" — solo faltaba `IMAS-4504` (Pruebas en QA).

Caso nuevo, distinto de los 2 retests de 2026-09-02 (esos expedientes ya estaban aprobados/fuera de la cola): solicitud `VETI-8832-9c0f1e50` (titular CASTELLANO GUTIERREZ ALEXIS SEBASTIAN, mascota Mishi), factura única $647.374,35 dividida en 2 gastos:
- Expediente `3131802` — Consulta en centro veterinario
- Expediente `3131801` — Estudios bioquímicos

Flujo ejecutado completo con `acastellano@ikeasistencia.com.ar`:
1. "Distribuir factura" en `3131802` → 2 líneas (Consulta $347.374 / Estudios bioquímicos $300.000), diferencia $0,00 → Confirmar distribución → `PUT lineas-factura` → 200 OK. El monto de `3131801` (el otro expediente de la misma solicitud) se completó automáticamente con la línea correspondiente.
2. "Validar" en `3131802` → dialog "Confirmar validación" → Confirmar y enviar → `POST /api/bff/reintegros/backoffice/expedientes/3131802/decision-calidad` → **204 No Content**. Toast: "¡Envío exitoso! Derivamos el expediente para su aprobación final." (monto liquidado $15.000, tope por evento).
3. "Validar" en `3131801` → mismo diálogo → Confirmar y enviar → `POST .../3131801/decision-calidad` → **204 No Content**. Toast igual de éxito (monto liquidado $0,00 por tope de cobertura ya consumido — comportamiento de negocio esperado, no error).
4. Bandeja de Pendientes bajó de 47 a 45 (los 2 expedientes de la solicitud salieron juntos).

**Ningún error "reimbursement request must have an expense type amount before approval to finance", ningún "Algo salió mal".** Los 3 criterios de aceptación de IMAS-4476 se cumplen:
1. ✅ Caso con 2 gastos se aprueba desde Calidad sin error (2/2 `decision-calidad` → 204).
2. ✅ Cada expediente mantiene su monto/tipo de gasto correcto (Consulta $347.374 vs Estudios bioquímicos $300.000, sin mezcla entre expedientes).
3. ✅ El flujo llega a Finanzas (toast "Derivamos el expediente para su aprobación final" en ambos, confirmado también por la baja de la bandeja de Pendientes).

**Veredicto: BUG-029 / IMAS-4476 confirmado arreglado.** Corresponde comentar IMAS-4504 (Pruebas en QA) con este resultado y transicionarlo a Hecho, siguiendo la regla del proyecto (bug confirmado → comentario + cerrar).
