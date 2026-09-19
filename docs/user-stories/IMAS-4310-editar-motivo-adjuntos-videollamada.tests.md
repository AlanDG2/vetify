# Diseño y ejecución de casos — IMAS-4310 Habilitar edición en Fecha y hora, Motivo y Adjuntos desde la pantalla de confirmación

> **Fuente**: HU `IMAS-4310` (padre `IMAS-2877`, épica Videollamada — misma épica que IMAS-4311, probada antes en esta sesión), mockup adjunto (`image-20260813-013825.png`, "Cómo se ve ahora" vs "Cómo se debería ver"), evidencia de Mariana Navarro (comentarios + capturas 2026-09-17, "Se validó en qa").

## 1. Contexto

En la pantalla de confirmación de Videollamada ("Revisá los datos y confirmá tu turno"), el ícono de lápiz (editar) solo estaba disponible en "Fecha y hora". Esta HU agrega el mismo ícono a "Motivo" y "Adjuntos" (cuando hay archivos cargados), permitiendo modificar cada campo sin reiniciar todo el flujo.

**Bloqueo previo**: Mariana no pudo validar en QA hasta hoy porque la API de "gestión cliente" estuvo caída (avisado a DevOps). Se recuperó y ella confirmó "Se validó en qa" con evidencia propia. Este documento es la reverificación independiente en vivo.

## 2. Ejecución (2026-09-17, QA)

**Cuenta**: sesión ya activa en `vetify-qa.ikeapp.com` (cuenta "Test", mascota "Testts091787192345664", plan Classic).

**Flujo armado**: Home → Videollamada → Agendar nueva videollamada → Motivo "Seguimiento de tratamiento" → Adjuntos (1 archivo) → Fecha 18/09/2026, 14:00h → llega a "Revisá los datos y confirmá tu turno".

### CP01 — Los 3 campos muestran el ícono de lápiz en la confirmación
- **Dado**: pantalla de confirmación con Mascota, Fecha y hora, Motivo y Adjuntos completos.
- **Cuando**: se observa cada fila.
- **Entonces**: "Fecha y hora", "Motivo" y "Adjuntos" tienen su botón "Editar..." propio (antes solo "Fecha y hora" lo tenía).
- **Resultado**: ✅ PASS.

### CP02 — Editar Motivo funciona de punta a punta
- **Dado**: confirmación con Motivo = "Seguimiento de tratamiento".
- **Cuando**: se toca "Editar motivo", se cambia a "Vacunas y desparasitación", se toca "Continuar".
- **Entonces**: vuelve a la pantalla de confirmación con Motivo actualizado a "Vacunas y desparasitación"; Fecha y hora y Adjuntos quedan intactos.
- **Resultado**: ✅ PASS.

### CP03 — Editar Adjuntos funciona de punta a punta
- **Dado**: confirmación con "1 archivo adjunto".
- **Cuando**: se toca "Editar adjuntos", se agrega un segundo archivo, se toca "Continuar".
- **Entonces**: vuelve a la confirmación con "2 archivos adjuntos"; Fecha y hora y Motivo quedan intactos (con el valor ya actualizado en CP02).
- **Resultado**: ✅ PASS.

### CP04 — Editar Fecha y hora sigue funcionando (regresión)
- **Dado**: confirmación con Fecha y hora = "18 de septiembre de 2026 · 14:00 h".
- **Cuando**: se toca "Editar fecha y hora", se cambia el horario a 17:00h, se toca "Continuar".
- **Entonces**: vuelve a la confirmación con "18 de septiembre de 2026 · 17:00 h"; Motivo y Adjuntos quedan intactos.
- **Resultado**: ✅ PASS. Confirma que la funcionalidad preexistente no se rompió al agregar los otros 2 lápices.

### CP05 — Los 3 campos combinados llegan correctos a la confirmación final
- **Dado**: los 3 CPs anteriores ejecutados en secuencia sobre el mismo turno.
- **Cuando**: se revisa el estado final de la pantalla de confirmación.
- **Entonces**: Fecha y hora "17:00 h", Motivo "Vacunas y desparasitación", Adjuntos "2 archivos adjuntos" — los 3 cambios independientes se mantienen simultáneamente, sin pisarse entre sí.
- **Resultado**: ✅ PASS.

**Nota**: no se tocó "Confirmar videollamada" para no crear un turno real innecesario en la cuenta de prueba — la validación de los 3 CPs de edición no lo requiere.

## 3. Observación aparte (no bloqueante, fuera del alcance de esta HU)

Al reabrir el selector de horario (dentro de "Editar fecha y hora"), tocar la franja "Noche" (18:00-24:00h) no cambió la lista de horarios mostrada — siguió mostrando los horarios de "Tarde" (12:00-18:00h). No se investigó más a fondo por no ser parte del alcance de IMAS-4310 (que es específicamente sobre la disponibilidad de los íconos de edición, no sobre la lógica del selector de franjas). Se deja documentado por si alguien lo quiere investigar aparte.

## 4. Veredicto QA

**IMAS-4310 PASA los 3 comportamientos esperados** (Fecha y hora, Motivo, Adjuntos editables desde la confirmación, sin perder los otros valores). Consistente con la validación de Mariana Navarro del mismo día. Listo para Deploy a Prod (IMAS-4724).
