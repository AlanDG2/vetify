# Flujo Jira para agentes QA (automation-main)

> Adaptado del flujo real de `precredit` (mismo equipo). Ver también [`update-rules.md`](update-rules.md) para las reglas no negociables.

## Autoridad

El estado actual de Jira es la fuente autorizada para status, transiciones, links y responsables. Los archivos locales (`qa-workspace/`, `docs/bugs/` si se crea) son el espejo operativo de QA: evidencia, explicación y trazabilidad — no reemplazan la lectura en vivo.

## Vías aprobadas para escribir en Jira

```bash
# CLI directo (comandos genéricos: get/comment/transition/link/assign)
npm run jira -- get IMAS-123
npm run jira -- comment IMAS-123 "..."
npm run jira -- transition IMAS-123 "In Progress"

# Crear un Defect (vía el adaptador, usado por la skill qa-bug-report)
# adapters/jira/client.mjs → createDefect({ parentKey, summary, description })
```

No hay un script `create-issue.mjs --preview/--execute` propio en este proyecto (a diferencia de `precredit`) — la vía aprobada para crear Defects es `createDefect()` del adaptador. **Pedir el OK explícito del usuario antes de invocarlo** (regla dura #8 de `AGENTS.md`); no hay flag de confirmación porque es una función, no un CLI standalone. Si en el futuro se necesita un script CLI equivalente, debe seguir el mismo patrón `--preview` → aprobación → `--execute --confirm=JIRA-WRITE`.

## Secuencia obligatoria para escribir

1. Leer el issue Jira objetivo (`getIssue`/`npm run jira -- get <KEY>`).
2. Construir la vista previa de la mutación (qué se va a crear/comentar/transicionar).
3. Mostrar la vista previa al usuario.
4. Esperar aprobación explícita en la sesión actual.
5. Ejecutar la mutación.
6. Releer el issue creado/actualizado para confirmar.
7. Verificar la línea en [`jira/sync-log.ndjson`](sync-log.ndjson) (`createDefect()` la escribe sola; para otras mutaciones, agregarla a mano si el script no lo hace).
8. Reconciliar docs locales afectados (`qa-workspace/known-issues.md`, `docs/bugs/<slug>.md` si existe).

## Mutaciones QA permitidas

| Mutación | Cuándo está permitida |
|---|---|
| Crear Defect (`createDefect`) | Hay evidencia de que el producto viola un TC-XX/comportamiento esperado, y NO es un fallo de ambiente |
| Comentar un issue | El comentario es de producto, conciso, referencia key/evidencia |
| Transicionar un issue | El usuario lo pidió explícitamente, o una regla del proyecto lo requiere |
| Vincular issues (`link`) | Hay una relación real (bloqueo, duplicado) y el usuario lo aprobó |

## Mutaciones prohibidas

- No inventar estados Jira, IDs de transición, custom fields ni labels.
- No escribir paths locales del repo en comentarios/descripciones Jira.
- No sobrescribir comentarios humanos existentes.
- No mutar Jira si no se puede leer el estado en vivo primero (sin red/credenciales → detener y avisar).
- No asumir que existe Xray/Zephyr — ver `adapters/jira/README.md`.

## Manejo de errores

Si un paso crítico falla después de una escritura parcial (ej. se creó el Defect pero falló el comentario en la HU padre), detener las siguientes mutaciones, informar al usuario el paso de recuperación pendiente, y verificar que quedó registrada la entrada de fallo parcial en `jira/sync-log.ndjson` (`createDefect()` en `adapters/jira/client.mjs` ya loguea el resultado, ok o error).
