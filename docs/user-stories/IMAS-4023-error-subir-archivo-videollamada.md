# IMAS-4023 — [Nueva Videollamada] Casuísticas especiales - Error Subir Archivo

- **Type**: Historia de usuario
- **Parent**: mismo epic de videollamadas que IMAS-3899/3174/3889/3909/3894 (a confirmar key exacta en Jira — no se leyó vía API en este intake)
- **Figma**: https://www.figma.com/design/YfysBYoQZB2Y0J0pLf3nMb/Dev---Vetify---Iniciativas-y-solicitudes?node-id=40001944-9407 — **no se pudo leer el nodo todavía** (rate limit 429 de la API de Figma en el momento del intake, reintentar)
- **Estado de intake**: análisis de contexto/factibilidad (2026-08-06) — no automatizar todavía, solo lectura + gaps.

## Descripción (texto de la HU)

Como tutor de Vetify, quiero recibir información clara cuando ocurra un error al cargar un archivo, para comprender qué ocurrió y saber cómo puedo continuar con la solicitud.

**Alcance**: validación del archivo al cargar, identificación de errores, bloqueo de continuidad con archivo inválido, mensaje informativo, comunicación clara de la acción a seguir, reintento de carga, alineación con Figma.

**Criterios de aceptación**: CA01 detección de error → bloquea avance · CA02 mensaje de error definido en Figma ("no se pudo procesar" + "hacé una nueva carga") · CA03 reintento (nueva selección + re-validación) · CA04 continuidad con archivo válido · CA05 bloqueo mientras el archivo tenga error · CA06 mensaje claro, sin info técnica/códigos de error · CA07 analítica (intentos, rechazos, motivo, reintentos, éxito post-error, abandono).

**Comentario del dev** (tarjeta enviada a validación): probó manualmente y confirmó (i) "Continuar" solo se habilita con ≥1 archivo cargado, (ii) formato fuera de lista no se puede cargar, (iii) archivo que excede el peso → error, no se carga, (iv) al llegar a 5 archivos se deshabilita el botón de subir, (v) los archivos se pueden borrar, (vi) mobile permite usar la cámara del teléfono, (vii) mobile bloquea la cámara también al llegar a 5 archivos con su propio mensaje, (viii) todo está validado front **y back** — bypasear el front no genera vulnerabilidad.

## Contexto — no es un módulo nuevo, es la misma pantalla de "Adjuntos" ya automatizada parcialmente

Esta HU cae sobre la pantalla de adjuntos del flujo de videollamada (`VetifyWebappVideocallFormPage`, sección "Subí una foto, video o archivo"), que **ya tiene POM construido y varios casos automatizados** desde IMAS-3174/IMAS-3889 (`tests/projects/vetify-webapp/videocall.spec.ts`, `src/pages/vetify/webapp/videocall/VideocallFormPage.ts`). El Excel de casos manuales (`documentation/Casos de Prueba (1).xlsx`, hoja Videollamadas, grupo IMAS-3889) ya tenía diseñados varios CPs que mapean casi 1:1 con los CA de IMAS-4023 — ver tabla abajo. No hace falta diseñar de cero ni construir un POM nuevo.

### Ya automatizado y verde hoy (reusable, no tocar)

| Comportamiento | Método/locator en `VideocallFormPage` | CA de IMAS-4023 que confirma |
|---|---|---|
| Adjuntar archivo válido, se muestra y habilita "Continuar" | `uploadAttachment()`, `verifyAttachmentUploaded()` | CA04 |
| Archivo que excede el peso → error, no se carga | `verifyAttachmentTooLargeError()` (usa `attachmentErrorLbl`, regex `/demasiado grande|excede|supera/i`) | CA01, CA02 (parcial — mensaje no verificado con texto exacto) |
| Borrar archivo adjuntado | `deleteAttachedFile()` | — (no es CA de esta HU, pero es infra del mismo flujo) |
| Omitir adjuntos sin cargar nada | `skipAttachments()` | — |

### Ya identificado como gap en el propio spec (stubs `test.skip` ya escritos, con TODOs explícitos)

`videocall.spec.ts` líneas 504-519 ya documentan exactamente esto como pendiente:

- **TC-07** `[Brecha de cobertura] IMAS-3889 CP10, CP12, CP15` — formato de archivo no permitido (**CA01/CA02** de 4023), bloqueo del botón de subir al llegar a 5 archivos (**CA01/CA05**), bypass de validación vía API directa (**CA01** a nivel backend — coincide con el punto viii del dev). No ejecutados "por tiempo" en la sesión que los escribió — el patrón `uploadAttachment()` ya está listo para extenderlos.
- **TC-08** `[Brecha de cobertura] IMAS-3889 CP13` — bloqueo de cámara al llegar a 5 archivos en mobile (**CA01/CA05**, coincide con el punto vii del dev).

**Hallazgo — el motivo de skip de TC-08 está desactualizado**: dice *"CP13 requiere el proyecto mobile, deshabilitado en playwright.config.ts"*. Eso ya no es cierto — el proyecto `Vetify WebApp Android` está habilitado desde 2026-08-05 (experimento documentado en `qa-workspace/decision-log.md`) y `videocall.spec.ts` corre hoy 100% verde en Desktop **y** Android (ver `docs/coverage-register.md`, IMAS-3174/3889/3909). El comentario quedó desactualizado — CP13/CA_mobile ya no está bloqueado técnicamente, solo no implementado.

### Sin ningún CP/test existente (gap real, hay que diseñar)

- **CA03 — Reintento de carga**: ningún test hoy encadena "cargar archivo con error → recibir el mensaje → volver a seleccionar un archivo → que sea válido → continuar". Los tests existentes prueban error y éxito por separado, no la secuencia de reintento completa que pide la HU.
- **CA06 — mensaje claro sin info técnica**: hoy solo se verifica con un regex amplio (`attachmentErrorLbl`), no el texto exacto ni que esté libre de jerga técnica. Falta confirmar contra Figma/UI real el texto para cada tipo de error (formato inválido, peso excedido, límite de 5 alcanzado, límite de cámara mobile).
- **CA07 — Analítica**: no hay ningún test (ni en este spec ni en el resto del proyecto) que intercepte eventos de tracking/analytics. Es un tipo de validación distinto a UI — hay que confirmar si existe un endpoint/evento de red interceptable (ej. Segment, GA, un endpoint propio) antes de asumir que es automatizable por Playwright, o si queda fuera de alcance como pasó con las comunicaciones de IMAS-3894 (CA09, "fuera de alcance — requiere infra real").

## Retest 2026-08-07 — automatizado, sin depender de Figma

El rate limit de Figma (429) siguió activo al reintentar, así que en vez de seguir esperando se confirmaron los textos/comportamientos reales navegando en vivo contra QA (script standalone, ver nota al final) — más confiable que el diseño para lo que necesitan los asserts automatizados. Hallazgos:

1. **Texto real del error de formato inválido** (CA02/CA06): **"Error de carga" / "No se pudo subir el archivo. Intentá nuevamente."** — confirmado subiendo un `.txt` real. Es un mensaje **distinto** del de "demasiado grande" (`attachmentErrorLbl`, regex `/demasiado grande|excede|supera/i`) — no es el mismo copy para los 4 casos, al menos formato-inválido y peso-excedido difieren. Límite de 5 y límite de cámara mobile no muestran un mensaje de error propio — el `<input type="file">` simplemente deja de estar disponible (ver punto 3).
2. **El front llama al backend para CUALQUIER archivo, no solo los válidos** — inspeccionando la red, `POST /api/files/upload/pets` se dispara igual para el `.txt` inválido que para un `.jpg` válido; la respuesta/mensaje de error viene de esa misma llamada. **CP15 (bypass de API) queda sin sentido como caso separado**: no hay un gate solo-frontend que bypasear, front y back comparten el mismo endpoint — ver `docs/backlog-automatizacion.md`.
3. **Límite de 5 archivos (CA01/CA05)**: el texto "Cargá foto, video o archivo" **NO desaparece** (hipótesis inicial incorrecta, corregida tras un primer test fallido) — sigue mostrándose como encabezado del bloque con 5 archivos ya adjuntados. Lo que sí se oculta es el `<input type="file">` en sí. Mismo comportamiento confirmado en mobile (Android), incluyendo el selector que en ese viewport agrega la opción de cámara.
4. **CA07 (analítica) — ✅ DESCOPEADO 2026-08-07, confirmado por la PO (Pau)**: se había encontrado el endpoint real de eventos de producto, `POST /api/bff/events` (payload simple, ej. `{"name":"assistance_form_opened","properties":{...}}` al iniciar la solicitud) — distinto de `POST /api/bff/faro/collect`, que es telemetría genérica de performance/RUM (Grafana Faro), no analítica de producto. No se detectó ningún evento específico de carga de archivos durante la exploración en vivo. Se consultó con la PO y confirmó que **esto no fue algo hablado al definir la HU y no aporta valor suficiente como para justificarlo** — queda fuera de alcance, no se automatiza (mismo criterio ya usado con IMAS-3894 CA09).
5. **Archivo de prueba para formato inválido**: se usa `src/fixtures/files/invalid-format.txt` (nuevo, `.txt` plano) — confirmado que lo rechaza.

**Implementado y verde en Desktop + Android** (`videocall.spec.ts`, dentro del mismo `describe` con `beforeEach` que ya deja al usuario en Adjuntos con "Vacunas" seleccionado — los stubs originales estaban declarados FUERA de ese `describe`, sin login ni navegación, lo cual habría hecho fallar cualquier implementación sin importar el contenido; corregido de paso):
- **TC-07** — CP10 (formato inválido) + CP12 (límite de 5).
- **TC-08** — CP13 (límite de 5 en mobile), restringido a Android por motivo real (viewport), no por infraestructura faltante.
- **TC-09** — CA03 (reintento: error → archivo válido → éxito), caso nuevo.

**Nota de timing**: subir varios archivos en loop sin esperar entre cada uno hace que el input REEMPLACE la selección en vez de sumar (confirmado: 5 llamadas seguidas sin espera dejaron 1 solo archivo adjuntado). Los tests esperan `attachedFileNameLbl` en el conteo esperado entre cada subida.

## Estimación

Completado. Esfuerzo real: bajo-medio, como se estimó — el trabajo grande fue diagnosticar el comportamiento real (Figma bloqueado, corregido explorando en vivo) y un par de bugs de automatización propios (ubicación de los tests fuera del `describe` con login; timing del loop de uploads), no construir infraestructura nueva.

## Ver también

- `docs/backlog-automatizacion.md` (Tier 2) — estos CPs ahora están marcados `✅ Automatizado 2026-08-07`.
- `tests/projects/vetify-webapp/videocall.spec.ts` — TC-07/TC-08/TC-09 dentro de `TS-03 IMAS-3889`.
- `src/pages/vetify/webapp/videocall/VideocallFormPage.ts` — `invalidFormatErrorLbl`, `verifyInvalidFormatError()`, `verifyUploadWidgetHiddenAtLimit()` (nuevos).
- `qa-workspace/known-issues.md` — contexto de por qué mobile tardó en habilitarse y qué se validó ahí.
