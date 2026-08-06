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
