# DoD — cómo se arma el Definition of Done final

El DoD que el agente aplica al cerrar una HU se **compone** de dos partes:

```
DoD final  =  dod-core.md (5 criterios universales)
            + adapters/<adaptador-activo>/dod-ticket.md (criterios de ticket, si hay)
```

## Sin gestor de tickets (adaptador `none`, default)

`adapters/none/dod-ticket.md` está vacío → el DoD final son **solo los 5 criterios universales**. Un proyecto que recién arranca ya tiene un DoD que funciona.

## Con gestor de tickets (ej. adaptador `jira-xray`)

Al activar un adaptador, su `dod-ticket.md` **suma** criterios. Ejemplo con `jira-xray` (3 criterios extra → DoD de 8):

- 6. 0 Defects activos vinculados (todos en estado final).
- 7. 1 sola ejecución de prueba activa (la de hoy); 0 ejecuciones viejas vinculadas.
- 8. Runs PASSED con evidencia adjunta en cada run + status del ticket = el de cierre.

## Quién compone el DoD

El hook `.claude/hooks/preflight-check.sh` lee el adaptador activo y arma el recordatorio del DoD inyectando `dod-core.md` + el `dod-ticket.md` del adaptador. Así el pre-flight siempre refleja el DoD real del proyecto, sin hardcodear nada.

## Para cambiar el DoD

- **Criterios universales** → editar `dod-core.md` (raro; son el mínimo de cualquier proyecto QA).
- **Criterios de ticket** → editar el `dod-ticket.md` del adaptador, o crear un adaptador nuevo (ver `adapters/ticket-manager.interface.md`).
- **Idioma, prefijo de keys** → `SETUP.md`.
