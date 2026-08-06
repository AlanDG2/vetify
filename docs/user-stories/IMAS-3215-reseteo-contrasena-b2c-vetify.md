# IMAS-3215 — Automatización - Reseteo de Contraseña B2C Vetify

- **Type**: Tarea
- **Status**: Tareas Por Hacer
- **Parent**: IMAS-1602
- **URL**: https://ikeasistencia-arg.atlassian.net/browse/IMAS-3215

## Subtareas (estado al 2026-08-05)

| ID | Título | Estado |
|---|---|---|
| IMAS-3465 | Diseño disponible | Cancelado |
| IMAS-3466 | Decisiones técnicas | Backlog |
| IMAS-3467 | Implementar lógica de lectura de casilla de correo | Backlog |
| IMAS-3468 | Documentar casos de prueba | Backlog |
| IMAS-3662 | Automatizar casos de prueba | Backlog |
| IMAS-3663 | Validar ejecución en CI | Backlog |

## Descripción

Se requiere desarrollar una automatización que valide el flujo de recuperación de contraseña para usuarios B2C Vetify.

El flujo inicia cuando un usuario registrado selecciona la opción "Olvidé mi contraseña" en la pantalla de login. A partir de ese momento, el sistema debe enviar un correo electrónico desde Vetify con un enlace único que permita al usuario restablecer su contraseña de forma segura, simple y rápida.

La automatización deberá validar el proceso end-to-end, desde la solicitud de reseteo hasta la correcta actualización de la contraseña y el posterior acceso a la plataforma.

## Alcance de la automatización

- Acceso a la opción "Olvidé mi contraseña" desde la pantalla de login.
- Ingreso de un correo electrónico válido asociado a un usuario B2C Vetify.
- Envío exitoso del correo de recuperación desde Vetify.
- Recepción del email en la casilla correspondiente.
- Validación del contenido del email (remitente, asunto y estructura del mensaje).
- Existencia del link de reset de contraseña dentro del correo.
- Redirección correcta al flujo de cambio de contraseña al hacer click en el link.
- Permitir la generación de una nueva contraseña cumpliendo las reglas de seguridad establecidas.
- Confirmación exitosa del cambio de contraseña.
- Inicio de sesión exitoso con la nueva contraseña generada.

## Criterios de aceptación

- ✅ El usuario puede acceder correctamente a la opción "Olvidé mi contraseña".
- ✅ El sistema envía un correo de recuperación en un tiempo razonable.
- ✅ El email es recibido correctamente en la bandeja del usuario.
- ✅ El contenido del correo incluye un link válido de recuperación.
- ✅ El link redirige correctamente al flujo de reset de contraseña.
- ✅ El usuario puede establecer una nueva contraseña cumpliendo las políticas de seguridad.
- ✅ El cambio de contraseña se confirma correctamente en el sistema.
- ✅ El usuario puede iniciar sesión con la nueva contraseña sin errores.
- ✅ No se presentan errores funcionales ni de interfaz durante todo el flujo.

## Notas de intake (2026-08-05)

Ver `docs/impedimentos-bloqueos.md` → IMP-006 para el detalle del bloqueo de infraestructura de email que impide automatizar el 100% del alcance por ahora. Decisión de sesión: avanzar solo con diseño de casos + mapeo de POM/UI, dejar la automatización end-to-end pendiente de IMAS-3467 (lectura de casilla de correo).
