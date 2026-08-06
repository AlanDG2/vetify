# Criterios de DoD del adaptador `jira` (automation-main)

> Estos criterios se **suman** a los 5 universales de `core/dod/dod-core.md` cuando este adaptador está activo. Con `jira` activo, el DoD final tiene **6 criterios** (no 8 — este proyecto no tiene Xray/Zephyr, así que no hay criterios de test-execution que verificar).

## Por qué solo 1 criterio extra (no 3 como en un stack con Xray)

El template original (`jira-xray`) asume un gestor de test-management (Xray) que trackea Test Execution, runs PASSED/FAILED y evidencia por run. **Este proyecto no tiene eso.** La evidencia de ejecución vive en:
- Reportes Allure (`allure-results/`, publicados por CI).
- Reportes Playwright HTML (`playwright-report/`).
- `documentation/Casos de Prueba.xlsx` como inventario manual de casos.

Por eso el único criterio adicional real y verificable en vivo es sobre bugs vinculados, no sobre runs de Xray que no existen.

## Criterio de cierre adicional (gestor de tickets)

6. **0 bugs Jira abiertos vinculados a la HU.** Si `checkClosable(id)` encuentra un `issuelink` tipo Bug en estado no-final (no Done/Cerrada/Finalizada) → la HU NO cierra. Verificar con `adapters/jira/client.mjs → checkClosable(id)`, que consulta el issue en vivo vía `getIssue`.
   - **Nota de nombres reales (proyecto IMAS, confirmado 2026-08-04 vía `npm run jira:metadata`)**: este proyecto Jira no tiene un issuetype llamado literalmente "Bug" — el equivalente real se llama **"Error"**. `checkClosable()` reconoce ambos nombres (`bug` y `error`, case-insensitive) vía `BUG_ISSUETYPE_NAMES` en `adapters/jira/client.mjs`. `createDefect()` crea el issue con `issuetype: "Error"` (no Subtarea — "Error" no admite `parent`, se linkea a la HU con un link "Blocks").

## Orden de validación (cuando este adaptador está activo)

1. Validar bugs vinculados → retestear → cerrar el bug en Jira (NUNCA desvincular para esquivar el bloqueo).
2. Validar los 5 criterios universales (core).
3. Validar el criterio 6 de arriba.
4. Recién entonces reportar la HU como cerrada/lista.

> Si `checkClosable(id)` no puede consultar Jira en vivo (sin red/credenciales) → debe devolver `{closable: false, missing: ['NO_VERIFICADO_EN_VIVO']}`, nunca asumir que está cerrable.
