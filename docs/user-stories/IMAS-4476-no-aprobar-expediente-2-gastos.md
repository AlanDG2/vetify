# IMAS-4476 — [Reintegros] No se puede aprobar expedientes al cargar 2 gastos (error expenseType amount / decision-calidad)

**Tipo:** Error · **Estado (al intake, 2026-09-18):** In Validation · **Asignado:** Alan Gonzalez · **Padre:** IMAS-4101 (épica Migración Reintegros a Nexus)
**URL:** https://ikeasistencia-arg.atlassian.net/browse/IMAS-4476

## Descripción (campo estándar + customfield_11621)

Si se cargan 2 gastos, no se pueden aprobar aunque se desglose por expediente el gasto pertinente a cada uno. La aprobación de Calidad falla.

**Error observado**
- Endpoint/acción: `decision-calidad`
- Mensaje (respuesta API): `reimbursement request must have an expense type amount before approval to finance`
- Ejemplo de expediente en QA (original): `3300-1` (`reintegros-backoffice.ike.qa/expedientes/3300-1`)

**Comportamiento actual (al reporte)**
- UI muestra "Algo salió mal / Probá de nuevo en un momento" al confirmar validación.
- No llega a derivar a Finanzas para aprobación final.

**Comportamiento esperado**
- Con 2 gastos cargados, debe poder aprobarse cada gasto desglosado por expediente.
- Debe persistirse el `expense type amount` requerido antes de enviar a Finanzas.

## Criterios de aceptación

1. Caso con 2 gastos se puede aprobar desde Calidad sin error.
2. Cada expediente/gasto mantiene su monto / expense type correcto.
3. El flujo llega a Finanzas cuando corresponde.

## Subtareas (Jira, al intake)

| Key | Título | Estado |
|---|---|---|
| IMAS-4502 | Análisis | Hecho |
| IMAS-4528 | Reunión con Core para validar posible solución | Hecho |
| IMAS-4501 | Desarrollo | Hecho |
| IMAS-4503 | Deploy en QA | Hecho |
| IMAS-4643 | Validad diseño | Hecho |
| **IMAS-4504** | **Pruebas en QA** | **Tareas Por Hacer** — pendiente esta sesión |

## Contexto previo relevante (ya documentado)

- `docs/bugs/BUG-029-reintegros-no-se-puede-aprobar-expediente-2-gastos.md` — bug ya registrado con retests previos.
- `docs/impedimentos-bloqueos.md` — mismo contenido, con 2 retests 2026-09-02 (ambos NO reprodujeron, expedientes `3131925`/`3131924`, pareja real de una solicitud de 2 gastos, ambos `decision-calidad` → 204).
- En ese momento el ticket seguía "En Progreso" (dev no había cerrado Desarrollo/Deploy) — se dejó como watch item, no como cierre definitivo, porque no estaba claro si el fix ya estaba en QA o las condiciones exactas no se replicaban.
- Hoy (2026-09-18) todas las subtareas de desarrollo están Hecho — corresponde repetir el retest de forma definitiva para poder cerrar IMAS-4504/IMAS-4476.
- Cuenta de Calidad para backoffice: `acastellano@ikeasistencia.com.ar` / `Veti123*` en `https://reintegros-backoffice.ike.qa/` (requiere VPN).
- La cola de "Pendientes" del backoffice suele tener expedientes reales sin necesidad de crear uno nuevo (lección de IMAS-4354/BUG-015, 2026-09-01) — preferir usar uno existente con 2 gastos antes que intentar crear un reintegro nuevo (bloqueado en el pasado por "mascotas vacías").

## Gap de información a resolver en este intake

Ninguno bloqueante para arrancar el retest — el escenario, endpoint, cuenta y ambiente ya están confirmados por sesiones previas. Falta solo: encontrar en vivo un expediente con 2 gastos en estado Pendiente (los usados el 09-02 ya fueron aprobados y salieron de la cola).

## ✅ Retest final 2026-09-18 — CONFIRMADO ARREGLADO

Caso usado: solicitud `VETI-8832-9c0f1e50` (titular Castellano Gutierrez Alexis Sebastian, mascota Mishi), factura única $647.374,35 dividida en 2 gastos:
- Expediente `3131802` — Consulta en centro veterinario
- Expediente `3131801` — Estudios bioquímicos

Flujo con `acastellano@ikeasistencia.com.ar`: "Distribuir factura" (2 líneas, montos $347.374/$300.000, diferencia $0,00) → Confirmar distribución → 200 OK → "Validar" en cada expediente → "Confirmar y enviar" → **ambos `POST decision-calidad` → 204 No Content**, ambos con toast "¡Envío exitoso! Derivamos el expediente para su aprobación final." Bandeja de Pendientes 47 → 45.

**Veredicto por criterio de aceptación**:
1. ✅ Caso con 2 gastos se puede aprobar desde Calidad sin error — 2/2 `decision-calidad` en 204, sin el error `expense type amount`.
2. ✅ Cada expediente/gasto mantiene su monto/expense type correcto — $347.374 Consulta vs $300.000 Estudios bioquímicos, sin mezcla.
3. ✅ El flujo llega a Finanzas cuando corresponde — confirmado por el toast de derivación y la salida de ambos expedientes de la bandeja de Pendientes.

Detalle completo (incluyendo el hallazgo menor de que el campo de monto no acepta punto decimal) en `docs/bugs/BUG-029-reintegros-no-se-puede-aprobar-expediente-2-gastos.md` § "Retest final 2026-09-18".

**Nota de alcance**: no se generó un spec Playwright nuevo para este caso — el backoffice de Reintegros (`reintegros-backoffice.ike.qa`) no tiene POMs ni specs en este framework (todo el trabajo de la épica IMAS-4101 se hizo como QA manual/exploratorio vía MCP, mismo patrón que el resto de esa épica). La validación es 100% en vivo, documentada acá y en el bug.

**Pendiente**: comentar y transicionar `IMAS-4504` (Pruebas en QA) a Hecho en Jira, con el resumen de arriba — sigue el guardrail del proyecto (preview → OK explícito de Alan → ejecutar → verificar → log).
