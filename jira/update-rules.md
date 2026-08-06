# Reglas de escritura Jira

> Adaptado del guardrail real de otro proyecto QA del mismo equipo (`precredit`). Aplica a **toda** mutación Jira hecha desde este repo — vía `adapters/jira/client.mjs → createDefect()`, vía `npm run jira -- comment/transition/link`, o vía cualquier script nuevo en `scripts/jira/`.

## Reglas no negociables

1. Leer el issue en vivo antes de escribir (`getIssue`/`npm run jira -- get <KEY>`).
2. Mostrar una vista previa de la mutación antes de ejecutarla.
3. Tener aprobación explícita del usuario en la sesión actual antes de mutar.
4. Ejecutar la escritura real solo con confirmación explícita (`--confirm=JIRA-WRITE` en scripts CLI; para `createDefect()` del adaptador, pedir el OK del usuario antes de invocarlo — ver regla dura #8 de `AGENTS.md`).
5. Verificar después de escribir (releer el issue creado/actualizado).
6. Agregar una línea a [`jira/sync-log.ndjson`](sync-log.ndjson) — `adapters/jira/client.mjs` ya lo hace automáticamente en `createDefect()`.
7. Reconciliar docs locales (`qa-workspace/known-issues.md`, `docs/bugs/` si aplica) cuando Jira confirme la mutación.

## Reglas de comentarios

Los comentarios Jira son para el equipo de producto (dev/PO), no para navegar el repo.

**Permitido**: key del Defect/bug, síntoma de producto, TC-XX/TS-XX o pantalla afectada, link al issue Jira, resumen de evidencia (Allure/Playwright report).

**Prohibido**: paths locales del filesystem (`src/pages/...`, `tests/projects/...`), razonamiento interno del agente, afirmaciones sin evidencia, detalles de implementación de tests salvo que el equipo los pida.

## Este proyecto no tiene Xray/Zephyr

No hay "Test" ni "Test Execution" como issuetypes de Jira — no inventar esos conceptos ni transiciones. Ver `adapters/jira/README.md` §"Por qué `jira` y no `jira-xray`".
