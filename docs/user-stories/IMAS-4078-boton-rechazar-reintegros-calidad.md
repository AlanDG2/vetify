# IMAS-4078 — Reintegros: botón "Rechazar" en módulo Calidad no funciona antes de validar factura con ARCA

**Tipo:** Incidente Productivo
**Estado (Jira, al 2026-08-05):** In Validation
**Reporter:** Cyntia Ferrari
**Assignee:** alan david gonzalez guzman (yo)
**Prioridad:** Medium
**Creado:** 2026-07-31 · **Actualizado:** 2026-08-05
**URL:** https://ikeasistencia-arg.atlassian.net/browse/IMAS-4078

## Entorno
- Ambiente: **Producción**
- Módulo: Backoffice Calidad — Reintegros
- Sitio: https://reintegros-backoffice.ike.ar/

## Descripción (texto completo de Jira)
En el módulo de backoffice de Calidad (Reintegros), el botón "Rechazar" aparece habilitado y visible desde el primer momento en que se carga la solicitud, pero su funcionalidad no está realmente disponible hasta que la factura fue validada con ARCA.

Esto genera un problema concreto: cuando la factura es incorrecta y no logra validarse con ARCA, el usuario de Calidad intenta rechazarla haciendo clic en el botón, pero el botón no acciona correctamente — la factura no se rechaza.

## Pasos para reproducir (según reporte original)
1. Ingresar al módulo de Calidad – Reintegros (backoffice).
2. Abrir una solicitud pendiente cuya factura sea inválida (no puede validarse con ARCA).
3. Hacer clic en el botón "Rechazar" antes de que se complete la validación con ARCA.
4. Observar que la acción no tiene efecto: el reintegro no se rechaza.

**Resultado actual (bug):** el botón "Rechazar" está visible y clickeable desde el inicio, pero solo funciona una vez que la validación con ARCA finalizó. Si la factura no puede validarse, el rechazo queda bloqueado sin ningún aviso al usuario.

**Resultado esperado:** el botón "Rechazar" debe estar funcional en todo momento, sin depender del resultado de la validación con ARCA, permitiendo a Calidad rechazar un reintegro con factura inválida apenas se detecta el problema.

**Impacto:** casos con factura inválida quedan trabados en estado "Pendiente" sin posibilidad real de rechazo, generando demoras en la resolución del expediente y confusión para el usuario de Calidad (sin feedback de por qué el botón no responde).

## Subtasks
| Key | Título | Estado | Asignado |
|---|---|---|---|
| IMAS-4115 | Desarrollo de la solución | Hecho | Paula Scalzo |
| IMAS-4116 | Deploy en Producción | Hecho | Paula Scalzo |
| IMAS-4117 | Pruebas en Producción | **Tareas Por Hacer** | alan david gonzalez guzman |

> IMAS-4117 (validación en Producción) es la única subtask pendiente, y está asignada a mí.

## Comentarios
**Paula Scalzo — 2026-08-04 18:44:**
> Paso esta tarea a validación. Tras conversaciones con Ariamis confirmó que el problema quedó resuelto. Sin embargo, a futuro, deberíamos evaluar la posibilidad de que el rechazo del reintegro por calidad no dependa de enviar el monto que no se va a reintegrar. Hoy en día es requisito, para aprobar o rechazar, el envío del monto. Sin embargo, si se rechaza el reembolso no es lógico que deba enviarse el monto antes de rechazar. Adjunto imagen de rechazo exitoso sin depender de la validación de ARCA.

> Nota: el comentario incluye una imagen adjunta (no descargada por este análisis) mostrando un rechazo exitoso sin depender de la validación ARCA.

## Deuda técnica / seguimiento sugerido por el comentario (no bloqueante para este incidente)
- Evaluar si el flujo de rechazo debería dejar de requerir el envío del "monto no reintegrado" como paso obligatorio previo — hoy aplica tanto para aprobar como para rechazar, pero para un rechazo no tendría sentido pedir ese monto.

## Precondiciones para validar
- Acceso al backoffice de Calidad — Reintegros en **Producción** (https://reintegros-backoffice.ike.ar/).
- Una solicitud de reintegro pendiente cuya factura sea inválida para ARCA (o poder generar ese estado).

## Intake 2026-08-07 — factibilidad de automatización

**No hay nada de infraestructura para este sitio en el repo**: sin `SiteId`, sin entrada en `src/config/sites.ts`/`environment.ts`, sin POMs (`src/pages/`), sin pool de usuarios con rol "Calidad" en `src/providers/user`. Sería construir todo desde cero, no extender algo existente — a diferencia de las HUs anteriores de esta sesión.

**3 motivos para NO automatizar esto ahora mismo**:
1. **VPN**: sin acceso al backoffice en este momento (mismo bloqueo que ya se había marcado para la hoja "Reintegros" del Excel de casos manuales, `docs/backlog-automatizacion.md`).
2. **Ambiente Producción**: `qa-workspace/qa-playbook.md` — "Prod (no se testea, salvo excepción)". Esta HU **es** la excepción sancionada (subtask `IMAS-4117 - Pruebas en Producción`, asignada a mí), pero eso históricamente significó validación manual puntual, no un spec de Playwright corriendo repetidamente contra Producción con acciones reales de rechazo de expedientes (impacto financiero real, no reversible con un cleanup de test).
3. **El subtask asignado (`IMAS-4117`) es "Pruebas en Producción", no "Automatizar"** — y ya tiene evidencia manual de éxito (las 2 capturas del comentario de Paula: rechazo registrado exitosamente sin depender de ARCA). El trabajo pendiente real es cerrar el ciclo de validación (confirmar + comentar en Jira), no construir automatización nueva.

**Hallazgo secundario de Paula (no bloqueante, no es este incidente)**: el monto a no reintegrar es obligatorio hoy tanto para aprobar como para rechazar — no tiene sentido pedirlo para un rechazo. Es deuda técnica a evaluar a futuro, no forma parte del alcance de IMAS-4078.

**Recomendación**: no construir automatización todavía. Cerrar `IMAS-4117` como validación manual (las capturas ya alcanzan como evidencia) cuando haya OK explícito para comentar/cerrar en Jira — seguir `jira/jira-workflow.md` (preview → OK → ejecutar → verificar → `jira/sync-log.ndjson`). Si en el futuro se decide dar soporte automatizado a Reintegros/backoffice, es un proyecto de infraestructura nuevo (SiteId + POMs + pool de usuarios Calidad), no una extensión de una tarde.

## Validación manual 2026-08-07 (QA, no Producción)

Con VPN activa, se validó el flujo real vía MCP de navegador en `reintegros-backoffice.ike.qa` (usuario `acastellano@ikeasistencia.com.ar`), no en el dominio de Producción del ticket original.

- **Expediente 3131628** ("Testeando", factura en estado "Validación manual", sin validar por ARCA): botón **"Rechazar"** funcionó correctamente — abrió el modal de motivo, se completó con "Factura inconsistente" y se envió con éxito ("Registramos el rechazo del expediente"). Confirma el fix del bug original.
- **Expediente 3131632** ("Branco", misma condición de factura sin validar): se probó la cadena completa **Validar → Pagar** — "Validar" derivó el expediente a Finanzas ("Derivamos el expediente para su aprobación final"), y "Pagar" (monto $0,00 en este caso) registró el pago ("Pago registrado"). Ambos funcionaron sin errores, tampoco dependiendo de la validación ARCA.

**Pendiente**: comentario de cierre para `IMAS-4117` redactado y en preview (con aclaración de que se validó en QA, no en Producción) — **no publicado todavía**, a la espera de decidir si se valida también en Producción antes de comentar/transicionar. Estado de `IMAS-4117` sin cambios ("Tareas Por Hacer").

**Bloqueo 2026-08-07**: `IMAS-4117` es literalmente "Pruebas en Producción" — sin credenciales de Producción todavía (solo se consiguieron credenciales de QA en esta sesión). Se preparó un mensaje para pedir acceso de rol Calidad en `https://reintegros-backoffice.ike.ar/` + un expediente puntual seguro para probar. Hasta tener esas credenciales, `IMAS-4117` no se puede cerrar con evidencia estrictamente productiva — la evidencia de QA queda como respaldo intermedio.
