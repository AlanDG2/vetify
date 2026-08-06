# Interfaz de Ticket-Manager (contrato agnóstico)

> **Esto es lo que hace al template enchufable.** Las skills del core (`qa-coverage-validation`, `qa-testcase-auditor`, `qa-bug-report`) y la lógica de `core/lib/` llaman a **estas operaciones**, NUNCA a un gestor concreto (Jira, Linear, Azure, etc.). Cambiar de gestor = escribir un adaptador nuevo que cumpla este contrato, sin tocar las skills ni el core.

## Cómo funciona

- Cada adaptador vive en `adapters/<nombre>/` y declara que cumple esta interfaz.
- Un solo adaptador está **activo** a la vez (definido en su `adapter.config.json` con `"active": true`, o seleccionado en `SETUP.md`).
- El adaptador `none` (default) implementa la interfaz como **no-ops** → el template funciona sin ningún gestor.
- El adaptador `jira-xray` es un **ejemplo/stub** de cómo se implementa contra un gestor real.

## El contrato — operaciones que todo adaptador debe ofrecer

| Operación | Entrada | Salida | Quién la usa | Qué hace `none` |
|---|---|---|---|---|
| `fetchStory(id)` | id de HU (string) | `HU.md` (texto con CAs) | `qa-hu-intake` | devuelve "" (el usuario pega la HU a mano) |
| `listLinkedTests(id)` | id de HU | lista de tests vinculados (`[{key, title, status}]`) | `qa-coverage-validation`, `qa-testcase-auditor` | devuelve `[]` (no hay gestor) |
| `importTests(testsFile, id)` | ruta a `tests.md`, id de HU | resultado de import (`{created, skipped, errors}`) | pipeline de carga (`core/lib`) | no-op: deja el `tests.md` local, no importa nada |
| `createDefect(bug)` | objeto bug estructurado | id del defect creado (o null) | `qa-bug-report` | no-op: devuelve null (el bug queda como `docs/bugs/<slug>.md`) |
| `getDoDTicketCriteria()` | — | texto de criterios extra (de `dod-ticket.md`) o "" | preflight DoD / `dod-template` | devuelve "" (DoD = solo los 5 universales) |
| `checkClosable(id)` | id de HU | `{closable: bool, missing: [criterios]}` | cierre de HU | devuelve `{closable: true, missing: []}` (sin criterios de ticket que validar) |

## Reglas del contrato

1. **Las skills del core NUNCA mencionan un gestor concreto.** Si una skill necesita el estado real de los tests, llama a `listLinkedTests(id)` — no a "Jira" ni "Xray".
2. **El adaptador `none` siempre debe existir y funcionar.** Es el fallback que mantiene el template usable sin configuración.
3. **Toda escritura al gestor pide OK explícito del usuario** antes de ejecutarse (importar tests, crear defects). El adaptador no escribe en silencio.
4. **Las credenciales viven en `.env`** (gitignored), nunca en el código del adaptador. El stub `jira-xray` muestra qué variables se esperan, con placeholders.
5. **Estado real, no asumido.** Si un adaptador no puede consultar el gestor en vivo (sin red/credenciales), debe devolver un marcador "no verificado", no inventar estado. (Las skills de auditoría ya respetan esto.)

## Cómo crear un adaptador nuevo

1. `adapters/<tu-gestor>/` con un `adapter.config.json` (`{"name": "...", "active": false}`).
2. Implementar las 6 operaciones de arriba (lenguaje libre; el `jira-xray` usa `.mjs`, podrías usar Python como `core/lib`).
3. Un `dod-ticket.md` con los criterios de cierre que tu gestor impone (o vacío si ninguno).
4. Activar: poner `"active": true` en el tuyo y `false` en los demás (o configurarlo en `SETUP.md`).
