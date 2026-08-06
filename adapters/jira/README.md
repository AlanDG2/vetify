# Adaptador `jira` — real, no stub

Este adaptador implementa la interfaz de `adapters/ticket-manager.interface.md` contra el Jira real de este proyecto, reutilizando el cliente que ya existe y está probado en `scripts/jira/jira-client.mjs` (usado también por `scripts/jira/jira-mcp-server.mjs`).

## Por qué `jira` y no `jira-xray`

El template original ofrece `adapters/jira-xray` como ejemplo para stacks con Jira **+ Xray** (test-management con Test Execution, runs, evidencia por run). Este proyecto **tiene Jira pero no tiene Xray** — no hay concepto de "Test" ni "Test Execution" como issues de Jira. Nombrar el adaptador `jira-xray` sería engañoso: implicaría capacidades de tracking de ejecución que no existen.

Por eso:
- `listLinkedTests(id)` y `importTests(testsFile, id)` son **no-ops documentados**, no TODOs. Devuelven explícitamente que no hay gestor de test-management y señalan dónde vive esa información en este proyecto (`documentation/Casos de Prueba.xlsx`, `docs/coverage-register.md`).
- `fetchStory`, `createDefect`, `getDoDTicketCriteria` y `checkClosable` son implementaciones **reales**, no stubs — funcionan hoy con las credenciales de `.env`.

## Variables de entorno requeridas (`.env`, ya configuradas en este proyecto)

```
JIRA_BASE_URL=https://ikeasistencia-arg.atlassian.net
JIRA_EMAIL=<tu email>
JIRA_API_TOKEN=<tu token>
JIRA_PROJECT_KEY=IMAS
```

## Operaciones

Ver detalle en `adapter.config.json` y el código de `client.mjs`. Resumen:

| Operación | Estado | Implementación |
|---|---|---|
| `fetchStory(id)` | ✅ real | `getIssue(id)` → texto HU.md (summary + description + subtasks) |
| `listLinkedTests(id)` | ⚪ no-op documentado | no hay Xray/Zephyr; devuelve `[]` |
| `importTests(testsFile, id)` | ⚪ no-op documentado | no hay dónde importar; devuelve `errors` explicando el registro manual |
| `createDefect(bug)` | ✅ real | `createChildTask` (subtask bajo la HU) + `addComment` |
| `getDoDTicketCriteria()` | ✅ real | lee `dod-ticket.md` de este adaptador |
| `checkClosable(id)` | ✅ real | `getIssue(id)` + revisa `issuelinks` tipo Bug no resueltos |

## CLI ya disponible (no duplicado por este adaptador)

Este adaptador **no reimplementa** llamadas Jira — delega todo a `scripts/jira/jira-client.mjs`, que ya se usa por CLI:

```bash
npm run jira -- get IMAS-123
npm run jira -- sprint IMAS
npm run jira -- create IMAS-10 "Bug: ..."
npm run jira -- comment IMAS-10 "..."
npm run jira:check                       # smoke test de credenciales + proyecto
npm run jira:metadata -- --issue=IMAS-68 # transiciones disponibles de un issue
```

## Guardrail de escrituras

`createDefect()` es la única operación de escritura real de este adaptador. Sigue el guardrail documentado en [`jira/update-rules.md`](../../jira/update-rules.md) y [`jira/jira-workflow.md`](../../jira/jira-workflow.md): cada llamada (éxito o error) agrega una línea a [`jira/sync-log.ndjson`](../../jira/sync-log.ndjson) vía `appendSyncLog()`. `npm run validate:jira` verifica que este mecanismo siga presente.

