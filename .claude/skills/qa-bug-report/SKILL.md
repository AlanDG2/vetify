---
name: qa-bug-report
description: Convierte hallazgos QA (divergencia HU vs UI, fallo de contrato API, comportamiento inesperado) en reportes de bug estructurados. Incluye gating PASS/ENV_BLOCKED (no abrir bug si el fallo es de ambiente), tabla CP de evidencia y anclaje al spec. Si el proyecto tiene gestor de tickets, lo registra vía el adaptador. Invocar al reportar un bug encontrado en automatización o QA exploratoria.
---

# QA Bug Report — reporte de bug estructurado

> **Agnóstico del gestor de tickets.** La estructura del bug es universal; el registro en un gestor (crear el Defect) pasa por la **interfaz de adaptador** (`adapters/ticket-manager.interface.md` → `createDefect(bug)`), nunca por un gestor concreto. Con el adaptador `none`, el bug queda como `docs/bugs/<slug>.md` sin crear nada externo.

## Paso 1 — Clasificar el hallazgo (gating PASS / ENV_BLOCKED)

Antes de escribir nada, clasificar:
- **PASS** → no hay bug. No reportar.
- **ENV_BLOCKED** (endpoint caído, 500 de infra, deploy no aplicado, token expirado, dato seed faltante) → **NO es bug de producto**. Va a `docs/impedimentos-bloqueos.md` (IMP-XXX) como bloqueo, NO a un Defect.
- **CONTRACT/BEHAVIOR FAIL** (la app contradice la HU/contrato/CA) → **sí es bug** → generar el reporte.

> Regla: toda anomalía es bug potencial hasta probar lo contrario. Reproducir manual + comparar con un caso control ANTES de descartar. Pero un fallo de ambiente NO se reporta como Defect de producto.

## Paso 2 — Estructura del bug (universal)

```markdown
[Título]: <PREFIJO> | <Síntoma> en <Pantalla/Componente>   (máx 80 chars)
[Severidad]: Alto / Medio / Bajo  (+ justificación de 1 línea)
[Categoría]: Typo | Divergencia HU vs UI | Validación | Flujo | Performance | Accesibilidad | Backend
[HU relacionada]: <id de HU> o "N/A"
[Información del entorno]: SO / navegador / ambiente-URL / usuario o fixture (sin password) / versión (fecha) / adjuntos
[Descripción]: técnica para dev — qué se observa / por qué es defecto (regla violada) / impacto en el usuario
[Pasos para reproducir]: numerados, máx 6
[Resultado esperado]: según la HU/convención
[Resultado actual]: con texto exacto si es UI
[Notas adicionales]: HU, POM, spec, bugs relacionados, preguntas a PM/UX
```

**Prefijo del título:**
- `DEFECT | ` → viola un criterio explícito de una HU/spec (la mayoría).
- `BUG | ` → fallo técnico no ligado a una HU concreta (crash, error de servidor, infra).

**Regla "fuente de verdad":** en divergencia HU vs UI, decir explícitamente cuál es la fuente de verdad (típicamente pendiente de PM).

<!-- EJEMPLO: los defaults del proyecto (ambiente-URL, usuario de exploración, dónde está la tabla de severidad) se rellenan en docs/ o SETUP.md. -->

## Paso 3 — Tabla CP de evidencia (cuando el bug viene de un spec)

Si el bug salió de un spec automatizado, anexar una tabla que ancla el fallo al caso:

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

- NO inventar líneas, códigos de error, payloads, conteos ni resultados — solo lo observado.
- NO pegar logs completos, secrets, tokens ni payloads sensibles.
- NO mezclar bloqueos de ambiente con bugs de producto (Paso 1).
- Evidencia técnica → en el Defect/`.md`, NO en la HU.
- Al revisar duplicados, filtrar TODOS los issuetypes de bug del gestor (Defect / Error / Bug, según el gestor).
