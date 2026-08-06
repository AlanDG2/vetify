# DoD Core — Definition of Done (criterios universales)

> Estos **5 criterios universales** vienen siempre con el template, sin importar el gestor de tickets. Si el proyecto enchufa un adaptador (ej. Jira/Xray), ese adaptador **suma** sus propios criterios desde `adapters/<activo>/dod-ticket.md`. El DoD final que el agente aplica = estos 5 + los del adaptador activo (ver `dod-template.md`).

Una HU está **"lista" (Done)** si y solo si cumple los siguientes criterios **simultáneamente**:

## Los 5 criterios universales

1. **Cobertura CA→test completa.** Cada criterio de aceptación de la HU mapea a ≥1 test. No hay CAs huérfanos (sin test que los cubra). Verificable con la skill `qa-coverage-validation`.
2. **Pasos completos.** Todos los tests/casos tienen pasos completos: **Acción + Datos + Resultado Esperado**. Sin casos que solo tengan título.
3. **Idioma del proyecto.** Todos los casos en el idioma configurado del proyecto. En `automation-main` es **mixto, no un solo idioma**: título de negocio (`test()`/`test.describe()`) en **español** con prefijo `TC-XX`/`TS-XX`; identificadores de código (clases, métodos, variables, archivos) en **inglés**, por `documentation/development-standars.md`. No exigir "todo español" ni "todo inglés" — exigir que cada parte esté en el idioma que le corresponde. (Ver `qa-workspace/current-state.md`.)
4. **Sin duplicados.** 0 casos de prueba duplicados (mismo título/propósito).
5. **Re-ejecutados y pasando en la sesión de cierre.** Los tests se corrieron **en esta sesión** (no histórico) y pasan. Verde de hace una semana no cuenta.

## Regla dura

Si falta **cualquiera** de los criterios aplicables (estos 5 + los del adaptador activo) → la HU **NO está al 100%**. Es "casi 100%" o "no cumple". **NUNCA inflar el estado:** si un criterio no se cumple, decirlo honesto antes de que el usuario pregunte.

## Cómo se verifica

- Criterios 1-4 → análisis de diseño (skills `qa-coverage-validation` + `qa-testcase-auditor`).
- Criterio 5 → correr la suite en la sesión y confirmar verde real (no asumir desde un run viejo).
