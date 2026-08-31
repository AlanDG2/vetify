# IMAS-3923 — [Reintegros] Reintegro sugerido usa total de factura cuando hay un solo tipo de gasto (conceptos no cubiertos)

**Tipo:** Tarea
**Estado (Jira, verificado 2026-08-31):** Pending Validation
**Parent:** IMAS-2960
**Assignee:** Oscar Tello
**URL:** https://ikeasistencia-arg.atlassian.net/browse/IMAS-3923

## Por qué existe este documento

Alan señaló (2026-08-31) que esta Tarea **está terminada del lado de QA en los hechos, pero los casos de prueba nunca se subieron formalmente** — ni a Jira, ni a este repo. Se confirmó: la subtarea `IMAS-3967` ("Creación de los casos de prueba") figura **Hecho** en Jira pero con descripción y comentarios vacíos — el trabajo real de QA existe, solo que quedó como comentario narrativo en el ticket padre, nunca como caso de prueba formal. Este documento + su `.tests.md` reconstruyen ese caso desde la evidencia real ya existente (comentarios de Jira), sin inventar nada no verificado.

## Descripción real (`customfield_11620`, no el campo estándar — vacío)

> El sistema guarda el total de la factura (OCR o carga del titular) y con ese valor calcula el reintegro sugerido. El error aparece cuando: la factura tiene más de un concepto (ej. control veterinario + bocaditos) y el titular pide reintegro de un solo tipo de gasto (un ítem/subservicio). En backend, si la solicitud tenía un solo ítem, se asumía que el monto de ese gasto era todo el importe total de la factura. No se distinguían líneas cubiertas vs. no cubiertas, y el sugerido podía quedar más alto de lo correcto.
>
> Solución adoptada: no tomar automático el total de la factura como monto reintegrable — Calidad siempre carga el monto a reintegrar (distribución de factura), también con un solo ítem.
>
> **DOD explícito**: para cuando hay más de un concepto, se debe abrir un expediente en SISE para dejar registro; los expedientes que se abran deben generarse con la bitácora acordada (tarjeta de Oscar Tello, no detallada acá).

## Subtareas (15) — estado real verificado 2026-08-31

| Key | Título | Estado |
|---|---|---|
| IMAS-3967 | Creación de los casos de prueba | Hecho (sin contenido real, ver arriba) |
| IMAS-3927 | Deploy a PROD backoffice | **Tareas Por Hacer** |
| IMAS-4161 | Deploy a PROD backend | **Tareas Por Hacer** |
| IMAS-4006 | Migración V13: tabla `factura_linea` | Hecho |
| IMAS-4007 | Invariantes de cuadratura de líneas contra total y expedientes | Hecho |
| IMAS-4008 | API de distribución y rechazo de líneas para Calidad | Hecho |
| IMAS-4009 | Pantalla de distribución de factura (cuadratura + rechazo de línea) | Hecho |
| IMAS-4010 | Corrección de distribución confirmada, avisos de tope, parseo de moneda | Hecho |
| IMAS-3925 | Deploy a QA backoffice | Hecho |
| IMAS-4160 | Deploy a QA backend | Hecho |
| IMAS-4155 | Prueba UX-Content QA | Hecho (sin contenido) |
| IMAS-3926 | Prueba en QA | Hecho (sin contenido — evidencia real vive en el comentario de Alan, ver abajo) |
| IMAS-3928 | Prueba en PROD | Cancelado |
| IMAS-3924 | Desarrollo | Cancelado (superado por IMAS-4006–4010) |
| IMAS-3968 | Solución Técnica | Hecho |

**Lectura real del estado**: todo lo de desarrollo/deploy a QA está Hecho. **Deploy a PROD (backoffice y backend) sigue sin hacer** — es lo único que falta para que esta Tarea cierre de punta a punta, no los casos de prueba (que ya se ejecutaron, solo que no están documentados formalmente).

## Evidencia real ya existente (4 comentarios en el ticket padre, nunca formalizados como CP)

1. **Mariana Navarro (2026-08-07)** — describe el flujo de UI real probado en QA (video adjunto, no revisado acá): pantalla de detalle de expediente con factura cargada muestra un bloque "Subservicio solicitado / Distribuir factura" que reemplaza el formulario viejo de monto único; modal "Distribución de factura" con tabla de líneas (Descripción/Monto/Destino-expediente/Motivo de rechazo), agregar/eliminar líneas, footer de cuadratura (total factura vs. distribuido), confirmación.
2. **Hernán Casabella (2026-08-07)** — feedback de diseño (header no ocupa todo el ancho vs. Figma) — no funcional, no afecta el caso de prueba.
3. **Alan Gonzalez (2026-08-11) — el retest real, ya ejecutado, nunca formalizado**: flujo completo de distribución de factura en QA, de punta a punta, con factura real de 2 conceptos (Consulta $81.000 + Estudio Radiográfico $65.000, total $146.000), solicitando reintegro de un solo tipo de gasto (Vacunación). El sistema **no** tomó el total como monto reintegrable — exigió distribución manual explícita. Distribuido: línea "Vacunación" $81.000 (aceptada), línea "Estudio Radiográfico" $65.000 (rechazada, motivo "El plan no cubre el servicio"). Cuadratura correcta: "Confirmar distribución" deshabilitado hasta que la suma igualó el total ($0 de diferencia), confirmado sin errores. **Conclusión: el bug no reproduce.** Expediente de prueba: `3132040`.
4. **Mariana Navarro (2026-08-21)** — PR a producción de backend: `reintegros-backend` MR !107 (aún no deployado, ver IMAS-4161 arriba).

## Gap real, no resuelto por la evidencia existente

El DOD pide explícitamente que, con más de un concepto, se abra **un expediente en SISE por cada uno** para dejar registro (bitácora). El retest de Alan (08-11) solo nombra **un** número de expediente (`3132040`) para las 2 líneas distribuidas — no queda explícito en el comentario si cada línea generó su propio expediente en SISE o si ambas comparten uno. **No inventar una respuesta**: queda como pendiente de verificación explícita en el caso de prueba formal (ver `.tests.md`).

## Alcance — Backoffice, no la WebApp del tutor

Esta Tarea prueba `reintegros-backoffice` (herramienta interna de Calidad/Finanzas, `reintegros-backoffice.ike.qa`), **no** la vista del tutor en la WebApp (`/section/myreintegros`, documentada aparte en `docs/conocimiento-sistema.md`). Por eso no encaja 1:1 en la hoja "Reintegros" de `documentation/Casos de Prueba.xlsx` (esa hoja es 100% flujo tutor/WebApp) — pendiente de que Alan decida si esto necesita una hoja propia o un tratamiento distinto en el tracker.
