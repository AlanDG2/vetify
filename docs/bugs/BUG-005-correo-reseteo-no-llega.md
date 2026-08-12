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
