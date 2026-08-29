---
name: qa-bug-report
description: Convierte hallazgos QA (divergencia HU vs UI, fallo de contrato API, comportamiento inesperado) en reportes de bug estructurados. Incluye gating PASS/ENV_BLOCKED (no abrir bug si el fallo es de ambiente), tabla CP de evidencia y anclaje al spec. Si el proyecto tiene gestor de tickets, lo registra vía el adaptador. Invocar al reportar un bug encontrado en automatización o QA exploratoria.
---

# QA Bug Report — reporte de bug estructurado

> **Agnóstico del gestor de tickets.** La estructura del bug es universal; el registro en un gestor (crear el Defect) pasa por la **interfaz de adaptador** (`adapters/ticket-manager.interface.md` → `createDefect(bug)`), nunca por un gestor concreto. Con el adaptador `none`, el bug queda como `docs/bugs/<slug>.md` sin crear nada externo.

## 🚨 Principio no negociable: se lo escribe para una persona, no para una máquina

**El lector típico de este reporte es la PO, alguien de negocio, o un dev que no tiene el contexto que vos tenés ahora — no un parser, no otra IA.** Muchas veces esa persona no sabe qué es un endpoint, un status code, o un payload. Si el reporte tiene esas palabras en el cuerpo principal (Descripción/Resultado actual/Resultado esperado), **está mal escrito**, aunque sea 100% preciso técnicamente.

Antes de escribir cualquier campo del bug, pensar: *"¿esto lo entiende la PO leyéndolo una sola vez, sin preguntarme nada?"* Si la respuesta es no, reescribirlo en criollo. Ejemplo real de qué NO hacer (esto se escribió mal en este proyecto y hubo que corregirlo):

❌ **Mal** (jerga técnica en el cuerpo principal, nadie no-técnico lo entiende):
> [Descripción]: Capturando la red completa desde el login, se confirmaron 3 endpoints devolviendo 500 (Internal Server Error genérico) de forma intermitente: GET /api/services/category/overview (500 en la misma carga donde el banner de beneficios mostró "Vetify PLUS" en vez de "Cooper")...

✅ **Bien** (mismo hallazgo, en criollo — cualquiera lo entiende sin saber qué es un endpoint):
> [Descripción]: A veces, cuando un cliente entra a la app, el sistema no logra traer bien su información (qué plan tiene, qué beneficios le corresponden) — y en vez de mostrar lo correcto, la pantalla muestra algo genérico o vacío, como si el cliente no tuviera nada. No pasa siempre; a veces la misma persona entra y sí funciona bien. Esto no es un problema del beneficio de Cooper en sí — es que el sistema que trae los datos del cliente falla de vez en cuando, y cuando falla, la pantalla no sabe qué mostrar y se queda con lo genérico.

La segunda versión no tiene NINGÚN término técnico y dice exactamente lo mismo. El detalle técnico (nombres de endpoints, códigos de status, payloads) **no desaparece** — se documenta aparte, en una sección claramente separada para quien vaya a arreglarlo (ver Paso 2bis).

## Paso 1 — Clasificar el hallazgo (gating PASS / ENV_BLOCKED)

Antes de escribir nada, clasificar:
- **PASS** → no hay bug. No reportar.
- **ENV_BLOCKED** (endpoint caído, 500 de infra, deploy no aplicado, token expirado, dato seed faltante) → **NO es bug de producto**. Va a `docs/impedimentos-bloqueos.md` (IMP-XXX) como bloqueo, NO a un Defect.
- **CONTRACT/BEHAVIOR FAIL** (la app contradice la HU/contrato/CA) → **sí es bug** → generar el reporte.

> Regla: toda anomalía es bug potencial hasta probar lo contrario. Reproducir manual + comparar con un caso control ANTES de descartar. Pero un fallo de ambiente NO se reporta como Defect de producto.

## Paso 2 — Estructura del bug (universal)

```markdown
[Título]: <PREFIJO> | <Síntoma en criollo> en <Pantalla/Componente>   (máx 80 chars, sin jerga técnica)
[Severidad]: Alto / Medio / Bajo  (+ justificación de 1 línea, en criollo: qué tan mal le va al usuario)
[Categoría]: Typo | Divergencia HU vs UI | Validación | Flujo | Performance | Accesibilidad | Backend
[HU relacionada]: <id de HU> o "N/A"
[Información del entorno]: SO / navegador / ambiente-URL / usuario o fixture (sin password) / versión (fecha) / adjuntos
[Descripción]: EN CRIOLLO — qué le pasa al usuario, contado como se lo contarías a alguien de negocio en un pasillo. Cero jerga técnica acá (nada de endpoint/status code/payload/JSON). Explicar qué se ve mal y por qué le importa al usuario, no el mecanismo interno.
[Pasos para reproducir]: numerados, máx 6, en lenguaje de "hacé click acá, mirá esto" — no "llamar al endpoint X"
[Resultado esperado]: qué debería ver/poder hacer el usuario, en criollo
[Resultado actual]: qué ve/puede hacer en realidad, con el texto exacto que aparece en pantalla si es UI — en criollo, no "recibió un 500"
[Notas adicionales]: HU, POM, spec, bugs relacionados, preguntas a PM/UX — acá SÍ puede haber alguna referencia técnica breve si hace falta, pero preferir seguir en criollo
```

**Prefijo del título:**
- `DEFECT | ` → viola un criterio explícito de una HU/spec (la mayoría).
- `BUG | ` → fallo técnico no ligado a una HU concreta (crash, error de servidor, infra).

**Regla "fuente de verdad":** en divergencia HU vs UI, decir explícitamente cuál es la fuente de verdad (típicamente pendiente de PM).

<!-- EJEMPLO: los defaults del proyecto (ambiente-URL, usuario de exploración, dónde está la tabla de severidad) se rellenan en docs/ o SETUP.md. -->

## Paso 2bis — Detalle técnico (aparte, para quien lo va a arreglar)

Todo lo técnico (nombre de endpoint, método HTTP, status code, payload, línea de código, stack trace) va en una sección **separada y claramente etiquetada**, después de los campos de arriba — nunca mezclado en `[Descripción]`/`[Resultado actual]`/`[Resultado esperado]`:

```markdown
[Detalle técnico] (para el equipo de desarrollo)
- Endpoint: GET /api/services/category/overview
- Respuesta: 500 Internal Server Error
- Cuándo pasa: intermitente, no en el 100% de los intentos
```

Así, quien solo necesita entender el impacto (PO, negocio) lee los campos de arriba y ya sabe todo lo que necesita — y quien va a arreglarlo tiene el detalle técnico completo, sin tener que traducir nada. Ningún dato técnico se pierde, solo se lo pone en su lugar.

## Paso 3 — Tabla CP de evidencia (cuando el bug viene de un spec)

Si el bug salió de un spec automatizado, anexar una tabla que ancla el fallo al caso — esta tabla es para trazabilidad de QA, puede ir dentro de `[Detalle técnico]` o inmediatamente después, no hace falta traducirla a criollo:

```markdown
| CP | Condición | Esperado | Recibido |
| --- | --- | --- | --- |
| CP03 | <input/precondición> | <lo que dice la HU/contrato> | <lo que devolvió la app> |
```

Y citar el spec con ruta + línea: `tests/<area>/foo.spec.ts:NN`. Esto hace el bug reproducible y trazable.

## Paso 4 — Anclaje a la fuente

- Bug de **contrato API** → citar la regla violada de la HU/comentario del ticket.
- **Divergencia HU vs UI** → citar el CA exacto + el texto/comportamiento real (con snapshot/screenshot en Adjuntos).
- Un bug por endpoint/funcionalidad; subhallazgos relacionados se agrupan, no se fragmentan.

## Paso 5 — Registrar

- **Siempre:** guardar como `docs/bugs/BUG-XXX-<slug>.md`.
- **Si hay gestor de tickets:** registrar el Defect vía `createDefect(bug)` del adaptador activo (issuetype = Defect, NO Story). **Pedir OK explícito antes de crear.** Seguir el guardrail de [`jira/jira-workflow.md`](../../../jira/jira-workflow.md) y [`jira/update-rules.md`](../../../jira/update-rules.md) (preview → OK → ejecutar → verificar → `jira/sync-log.ndjson`, este último ya lo escribe solo `createDefect()`). La evidencia técnica va en el Defect, no en la HU.
- **Con adaptador `none`:** queda solo el `.md` local. Suficiente para un proyecto sin gestor.

## Reglas duras

- **`[Descripción]`, `[Resultado esperado]` y `[Resultado actual]` van SIEMPRE en criollo, sin jerga técnica** (nada de endpoint, status code, payload, stack trace, nombre de función). Si al releerlos aparece una palabra que la PO no reconocería, moverla a `[Detalle técnico]` y reescribir la frase sin ella.
- NO inventar líneas, códigos de error, payloads, conteos ni resultados — solo lo observado.
- NO pegar logs completos, secrets, tokens ni payloads sensibles.
- NO mezclar bloqueos de ambiente con bugs de producto (Paso 1).
- Evidencia técnica → en `[Detalle técnico]` dentro del Defect/`.md`, NO en la HU, y NO mezclada en los campos narrativos.
- Al revisar duplicados, filtrar TODOS los issuetypes de bug del gestor (Defect / Error / Bug, según el gestor).
