# BUG-005 — El correo para resetear la contraseña no llega

**Título**: Bug: El correo para resetear la contraseña no llega
**Jira**: IMAS-4272 — vinculado a IMAS-3215, IMAS-3216 e IMAS-3217
**Severidad**: Alto — el usuario no puede recuperar su cuenta, y el sistema no avisa que algo falló

## Descripción

Cuando alguien pide resetear su contraseña, el sistema avisa que envió un correo, pero el correo nunca llega a la casilla real.

## Pasos para reproducir

1. Entrar a la pantalla de inicio de sesión.
2. Hacer clic en "¿Olvidaste tu contraseña?".
3. Poner el email y hacer clic en "Enviar".
4. Revisar el correo de esa cuenta (bandeja de entrada y spam).

## Resultado esperado

El correo para resetear la contraseña debería llegar.

## Resultado actual

No llega ningún correo, aunque el sistema dice que sí se envió.

## Ambiente

QA, pantalla de inicio de sesión de Vetify. Probado con una cuenta real; se esperaron varios minutos y se revisó bandeja de entrada y spam — no llegó nada.

## Notas

Afecta igual a IMAS-3215, IMAS-3216 (Capitado OSDE) e IMAS-3217 (Capitado Flux) — comparten la misma pantalla de login. Mientras este bug siga abierto, ninguna de las 3 HUs puede cerrarse.

## Retest 2026-08-28 — confirmado arreglado, verificado en vivo de punta a punta

El usuario probó manualmente que el correo ya llega. Se confirmó además con automatización real: se construyó `src/integrations/email/EmailClient.ts` (IMAP real, ver `IMP-006` en `docs/impedimentos-bloqueos.md`), se conectó a una casilla real (`alan.gonzalez@ingenia.la`) y se disparó un reset real — **el correo llegó en 27 segundos**, con remitente `webapp@vetify.com.ar` y asunto "Recuperá tu contraseña". Se continuó el flujo completo: click en el link real → cambio de contraseña real (política confirmada en vivo) → "¡Contraseña cambiada!" → login exitoso con la nueva contraseña → un segundo reset encadenado confirmó además que la contraseña anterior queda invalidada (rechazada con `403`). El bug está confirmado resuelto de punta a punta, no solo en la llegada del correo.

En Jira, `IMAS-4272` está "In Validation" (Análisis/Desarrollo "Hecho", "Pruebas en QA" en Backlog) — este retest es justamente esa validación pendiente, aunque no se transicionó el ticket todavía (el usuario pidió ir "por partes" antes de decidir qué hacer en Jira).
