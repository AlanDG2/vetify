# BUG-016 — Landing Flux Capitado: el FAQ muestra copy de OSDE sin adaptar a la marca

**Jira**: [IMAS-4430](https://ikeasistencia-arg.atlassian.net/browse/IMAS-4430) — creado 2026-08-25/26, tipo Error, sin parent, estado Backlog.
**Título sugerido**: BUG | Landing Flux Capitado - FAQ con copy de OSDE sin adaptar a la marca
**Severidad**: Bajo-Medio — no bloquea ningún flujo funcional (el formulario de activación funciona normal), pero es un error de contenido visible a todos los tutores que entran por el canal Flux Capitado, y genera mala impresión de marca (menciona un competidor/alianza distinta a la que el usuario cree estar usando).
**Categoría**: Divergencia de contenido / Copy
**HU relacionada**: N/A directa — hallazgo de relevamiento de contenido institucional, no de una HU puntual.

## Información del entorno

- Ambiente: QA — `https://qa.vetify.com.ar/flux` (confirmado también en PROD, `https://vetify.com.ar/flux`, en el relevamiento original)
- Fecha del hallazgo original: 2026-08-14
- Fecha de esta re-confirmación en vivo: 2026-08-25 — **sigue exactamente igual, sin cambios en 11 días**

## Descripción

La landing de "Vetify x Flux" (canje de cupón para clientes de Flux, plan corporativo) tiene toda la sección de Preguntas Frecuentes (FAQ) con el copy literal de la landing de OSDE Capitado, sin adaptar la marca. El resto de la página (hero, formulario, "Plan Esencial") sí dice "Flux" correctamente — el problema está acotado al bloque de FAQ.

## Pasos para reproducir

1. Ir a `https://qa.vetify.com.ar/flux`.
2. Confirmar que el hero dice "Por tener FLUX, tu mascota cuenta con Vetify..." (marca correcta).
3. Bajar hasta la sección "Preguntas frecuentes".
4. Observar la primera categoría de la izquierda.
5. Observar la primera pregunta (viene expandida por defecto).

## Resultado esperado

La categoría debería decir "Alianza Vetify x Flux", y las preguntas/respuestas deberían mencionar "Flux" (no "OSDE") como la alianza/socio del beneficio.

## Resultado actual

- La categoría dice literalmente **"Alianza Vetify x OSDE"**.
- La primera pregunta dice **"¿Qué es Vetify y por qué está dentro del Programa de Beneficios MÁS OSDE?"**, con una respuesta que menciona "OSDE" varias veces ("En OSDE también creemos que prevenir...").
- Confirmado que el resto del FAQ (categorías "Condiciones", "Cómo acceder", etc.) probablemente tiene el mismo problema en las demás preguntas — no se revisó pregunta por pregunta, se confirmó la categoría/primera pregunta como evidencia representativa.

## Notas adicionales

- Encontrado originalmente durante un relevamiento general de contenido institucional (`docs/contenido-institucional.md`), no buscando este bug puntual.
- Confirmado en QA y PROD por igual en el relevamiento original — no es drift de ambiente, es el mismo contenido cargado mal en ambos.
- Sin reportar en Jira durante 11 días desde el hallazgo — el usuario del proyecto confirmó (2026-08-25) que nadie más lo había reportado antes de crear este Defect.
- Creado vía `createIssue` directo (sin parent, mismo patrón que BUG-004/006/009/012/013/014) + `updateIssueFields` para poblar el campo real "Descripción del error" (`customfield_11621`, 6 paneles) — verificado que quedó poblado. Logueado a mano en `jira/sync-log.ndjson` (acción `createDefect`), ya que se invocó el cliente Jira crudo en vez de pasar por `adapters/jira/client.mjs → createDefect()`.
