[Título]: DEFECT | Detalle del turno no muestra "Estado del turno" y sigue mostrando acciones activas para un turno ya CANCELADO tras reprogramar

[Jira]: **IMAS-4119** (tipo Error, linkeado con "Blocks" a IMAS-3894, estado Backlog) — creado 2026-08-05. https://ikeasistencia-arg.atlassian.net/browse/IMAS-4119

[Severidad]: Medio — no bloquea el flujo feliz de ver/reprogramar/cancelar un turno vigente, pero contradice un requisito explícito de la HU (CA02) y puede confundir al usuario si vuelve a un link/turno viejo tras reprogramar (ej. notificación por email con el link del turno original).

[Categoría]: Divergencia HU vs UI

[HU relacionada]: IMAS-3894 (CA02), epic IMAS-2877

[Información del entorno]:
- Ambiente: QA (`https://vetify-qa.ikeapp.com`)
- Navegador: Chromium (Playwright, vía MCP)
- Usuario de prueba: `user_1782499435430@automation.com` (pool, tags `ACTIVE, WITH_PET, NO_EMPTY_PLAN`)
- Fecha de validación: 2026-08-04

[Descripción]:
CA02 de la HU (fuente: descripción del ticket, leída directo de Jira vía API) exige:

> **CA02 – Visualización del detalle**
> Cuando abra la información del turno
> Entonces deberá visualizar como mínimo: Mascota. Fecha. Hora. **Estado del turno**. Acciones disponibles según corresponda.

**Hallazgo 1 — falta el campo "Estado del turno"**: la pantalla de detalle (`/petsAssistance/{assistanceId}`) muestra únicamente Mascota, Fecha y hora, Motivo y Detalle. No hay ningún campo/label que muestre el estado del turno (ej. "Programado", "Cancelado", "Realizado") — confirmado por inspección directa del DOM renderizado, no solo del snapshot de accesibilidad.

**Hallazgo 2 — consecuencia directa del hallazgo 1**: al reprogramar un turno, el backend genera una `assistanceId` **nueva** para la nueva fecha y marca la `assistanceId` anterior como `estado: "CANCELADO"` (confirmado vía `GET /api/services/pets/appointment/{id}`, que además devuelve `se_puede_cancelar: "false"` y `cliente_puede_ingresar: "false"` para ese id). Sin embargo, navegar directamente a la URL de detalle de esa `assistanceId` vieja **sigue renderizando la pantalla como si el turno estuviera activo**: muestra la fecha/hora vieja, y los tres botones de acción (Ingresar deshabilitado, **Reprogramar habilitado**, Cancelar deshabilitado) — sin ningún indicio visual de que el turno fue reemplazado/cancelado. Al no haber un campo de estado en la UI (hallazgo 1), no hay forma de que el frontend distinga y comunique este caso.

No se probó si presionar "Reprogramar" sobre esa `assistanceId` ya cancelada permite completar una reprogramación fantasma (dejar esa exploración adicional para cuando se decida si este hallazgo amerita ticket) — se evitó para no generar más datos de prueba huérfanos.

[Pasos para reproducir]:
1. Loguearse con un usuario con un turno de videollamada agendado (`GET /api/services/assistance/local/programmed`).
2. Ir a `/petsAssistance/{assistanceId}` de ese turno → observar que no hay ningún campo "Estado".
3. Desde ese detalle, presionar "Reprogramar" → completar día/horario → "Confirmar turno".
4. Confirmar que `GET /api/services/pets/appointment/{assistanceId original}` devuelve `estado: "CANCELADO"`.
5. Navegar (o volver) a la URL de detalle de esa `assistanceId` original (la ya cancelada).

[Resultado esperado]:
Según CA02, el detalle debería mostrar el "Estado del turno" siempre. Para un turno ya `CANCELADO` (paso 5), el detalle debería reflejar ese estado (ej. mensaje de turno cancelado/expirado, sin ofrecer "Reprogramar"/"Cancelar" como si estuviera vigente) — mismo patrón que la pantalla de confirmación real de cancelación ("Tu turno fue cancelado"), no la pantalla de detalle activo.

[Resultado actual]:
No se muestra "Estado del turno" en ningún caso. Para una `assistanceId` ya `CANCELADO` por una reprogramación, el detalle sigue mostrando la fecha/hora vieja y los botones de acción como si el turno siguiera vigente.

[Notas adicionales]:
- No automatizado como test de regresión todavía (es un hallazgo exploratorio de esta sesión, no cubierto por TS-05 IMAS-3894 en `videocall.spec.ts`) — se automatiza fácil una vez decidido si es bug real a corregir o comportamiento aceptado (ej. si el link viejo simplemente no debería ser alcanzable en el flujo normal, dado que "Tus turnos" ya no lo lista).
- Bajo impacto de exposición: en la navegación normal (Home → banner → "Tus turnos"), la lista de turnos ya excluye correctamente la `assistanceId` cancelada — el único camino realista para llegar a esta pantalla stale es un link directo/guardado (ej. notificación por email/push con el link del turno original) o el botón "Atrás" del navegador.
- Pendiente: confirmar con el equipo si el gap es "falta estado en el detalle" (fix de UI, bajo esfuerzo) o si además hace falta lógica de guardia (redirect/expirar) para `assistanceId` ya `CANCELADO`.
