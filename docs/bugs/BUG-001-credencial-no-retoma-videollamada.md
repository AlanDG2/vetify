[Título]: DEFECT | Al completar credencial desde videollamada, no retoma el flujo — va a Home

[Jira]: **IMAS-4102** (tipo Error, linkeado con "Blocks" a IMAS-3899, estado Backlog) — creado 2026-08-04. https://ikeasistencia-arg.atlassian.net/browse/IMAS-4102

[Severidad]: Alto — bloquea el flujo completo de agendamiento para cualquier tutor cuya mascota no tenga credencial cargada; obliga a reiniciar la solicitud desde cero.

[Categoría]: Divergencia HU vs UI / Flujo

[HU relacionada]: IMAS-3899 (CA05), epic IMAS-2877

[Información del entorno]:
- Ambiente: QA (`https://vetify-qa.ikeapp.com`)
- Navegador: Chromium (Playwright, vía MCP y `npx playwright test`)
- Usuario de prueba: `user_1782309546559@automation.com` (pool, tags `ACTIVE, NO_PET, PLAN_WITHOUT_PET` al momento de la validación)
- Fecha de validación: 2026-08-04

[Descripción]:
**Fuente verificada directamente en Jira 2026-08-04** (vía API REST, `fields=description`, no de segunda mano) — la descripción de la HU IMAS-3899, sección "Alcance", último punto:

> *"Una vez finalizada exitosamente la carga y validación de la credencial, permitir al usuario retomar la solicitud del turno sin necesidad de comenzar nuevamente desde la Home."*

Y el criterio de aceptación formal:

> **CA05 – Retomar la solicitud**
> Dado que la credencial fue cargada y validada exitosamente
> Cuando el usuario finalice dicho proceso
> Entonces podrá continuar con la solicitud de la videoconsulta.
> Y el sistema deberá retomarlo en el flujo de reserva sin requerir que inicie nuevamente la operación desde la Home.

(Nota de trazabilidad: el único comentario del ticket, de Paula Scalzo el 2026-07-30, dice solo *"Paso esta tarjeta a 'in validation' y dejo video mostrando la solución"* con un video adjunto `sincredencial.mp4` — no contiene texto que describa el comportamiento esperado; el video no fue revisado en esta validación. La cita de arriba es la fuente de verdad primaria y verificable: la descripción/CA de la HU, no el comentario.)

En la práctica, tras completar exitosamente el flujo de carga de credencial (iniciado desde la pantalla "Completá su credencial" de videollamada), la pantalla de confirmación ("¡X ya tiene su credencial lista!") solo ofrece el botón **"Ir al inicio"**, que navega a `/` (Home). No hay ninguna redirección de vuelta al flujo de videollamada, ni el sistema conserva ningún rastro de la solicitud en curso.

[Pasos para reproducir]:
1. Loguearse con un usuario cuya mascota NO tenga credencial vigente cargada.
2. Ir a Videollamada → "Agendar nueva videollamada".
3. El sistema muestra "Completá su credencial" → presionar "Completar credencial".
4. Completar el formulario de credencial (nombre, tipo, género, raza, edad, foto) hasta el final.
5. En la pantalla "¡X ya tiene su credencial lista!", presionar el único botón disponible ("Ir al inicio").

[Resultado esperado]:
Según CA05 de la HU: continuar la solicitud de videollamada, retomando el punto exacto donde quedó (ej. volver directo al selector de motivo), sin pasar por Home.

[Resultado actual]:
Navega a `/` (Home). No hay continuación automática del flujo de videollamada.

[Notas adicionales]:
- No automatizado como test (requiere el usuario `NO_PET` real que se consumió durante esta misma validación — ver IMP-003 en `docs/impedimentos-bloqueos.md`).
- Pendiente decidir con el equipo si "Ir al inicio" es un error de copy/enlace (debería decir algo como "Continuar solicitud" y apuntar de vuelta al flujo) o si falta implementar la lógica de retomar el estado guardado.
- **✅ Defect creado en Jira 2026-08-04**: IMAS-4102, con OK explícito del usuario del proyecto. `checkClosable('IMAS-3899')` ahora reporta `closable: false` correctamente hasta que se resuelva.
