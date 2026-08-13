# BUG-010 — Backend: `/api/files/upload/pets` devuelve 500 crudo en vez de validar el tamaño máximo del archivo

**Título**: BUG | Backend — endpoint de subida de archivos no valida tamaño máximo, devuelve 500 sin mensaje
**Severidad**: Medio — no bloquea el flujo normal en Desktop NI en mobile (ambos frontends impiden enviar un archivo de más de 10MB antes de llegar a este endpoint — confirmado en los dos, ver "Reconfirmado en vivo"), pero es una falla real de robustez del backend: cualquier request que sí llegue con un archivo grande (un cliente distinto, una integración, o el mismo frontend si cambia su validación) recibe un error genérico sin información útil.
**Categoría**: Backend
**HU relacionada**: IMAS-3889 (Adjuntos de videollamada) / IMAS-4023 (regresión de adjuntos) — mismo endpoint que usa esa pantalla; no ligado a una HU de mobile puntual.

## Información del entorno

- Ambiente QA: `https://vetify-qa.ikeapp.com`.
- Endpoint: `POST /api/files/upload/pets` (mismo que usa el paso de adjuntos de la solicitud de videollamada, tanto Desktop como mobile).
- Usuario: cuenta pooled `user_1782499435430@automation.com` (sesión cacheada real, `playwright/auth/452f3aa0-3a53-451e-a416-01d730b6e081.json`).
- Reproducido con una llamada HTTP directa (Playwright `request` context, sin pasar por ninguna UI), 2026-08-12.

## Descripción

El endpoint de subida de archivos no valida el tamaño del payload antes de procesarlo — un archivo de 11MB (por encima del límite documentado de 10MB que el frontend Desktop sí hace cumplir antes de enviar la request) produce una excepción no controlada del lado del servidor (`500 Internal Server Error`), en vez de una respuesta 4xx con un mensaje claro (ej. "el archivo excede el tamaño permitido").

Ningún usuario real (Desktop ni mobile) ve este bug hoy porque ambos frontends bloquean el envío antes de llegar a la red — confirmado en Desktop (POM Playwright: el mensaje "demasiado grande" se muestra sin esperar ninguna respuesta HTTP) y confirmado en mobile en hardware real el 2026-08-13 (ver "Reconfirmado en vivo" — subir una foto real de >10MB en la pantalla de adjuntos de videollamada muestra un error claro: "El archivo '...' supera el tamaño permitido (10 MB)"). Es un gap real de robustez del backend igual — cualquier cliente que no valide (o cuya validación falle) queda expuesto a un 500 genérico sin ningún manejo de error.

## Pasos para reproducir

1. Autenticarse como cualquier usuario Vetify con sesión válida.
2. Hacer un `POST` directo a `/api/files/upload/pets` con un archivo `multipart/form-data` de más de 10MB (ej. `src/fixtures/images/oversize_videocall_11MB.jpg`, 11.5MB).
3. Observar la respuesta.

## Resultado esperado

El backend responde con un código de error claro (ej. `400 Bad Request` o `413 Payload Too Large`) y un mensaje indicando que el archivo excede el tamaño permitido.

## Resultado actual

```
Status: 500
Body: {"timestamp":"2026-08-13T01:32:19.976+00:00","status":500,"error":"Internal Server Error","path":"/upload/pets"}
```

## Caso control (para descartar que sea un problema de la request en sí)

| Caso | Archivo | Tamaño | Resultado |
| --- | --- | --- | --- |
| Control | `dog-profile-photo.jpg` | 6091 bytes | `200`, `{"id":"0ab58966-5877-41c3-8899-354718c3b8a7"}` |
| Bug | `oversize_videocall_11MB.jpg` | 11,534,350 bytes | `500`, sin id, error genérico |

Mismo endpoint, misma sesión, mismo formato de request — la única variable es el tamaño del archivo. Confirma que el 500 es específico del tamaño, no un problema de la request de prueba.

## Reconfirmado en vivo (2026-08-13)

Se re-probó contra QA real, esta vez también confirmando que **la UI de Desktop nunca deja llegar el archivo grande al backend** (el frontend bloquea client-side con el mensaje "La foto que estás intentando subir es demasiado grande" — confirmado que no sale ningún request de red en ese caso, revisando la pestaña Network). Por eso el bug **no es reproducible navegando la UI normalmente**, ni en Desktop ni en mobile — solo golpeando el endpoint directo.

Repetido el llamado directo al endpoint (mismo patrón que el hallazgo original, cuenta real, token de sesión real):

```
POST /api/files/upload/pets
Archivo de 6000 bytes → 200 {"id":"aee5ebc4-2916-45df-8362-10067a92f471"}
Archivo de 11MB       → 500 {"timestamp":"2026-08-13T16:49:02.708+00:00","status":500,"error":"Internal Server Error","path":"/upload/pets"}
```

Mismo resultado exacto que la vez anterior — el bug sigue vigente.

## Cómo reproducirlo vos mismo (sin código, con DevTools del navegador)

1. Iniciar sesión en `https://vetify-qa.ikeapp.com` con cualquier usuario real.
2. Abrir las DevTools de Chrome (F12) → pestaña **Network**.
3. Ir a Mascotas → completar (o continuar) una credencial hasta el paso 5 (foto) y subir cualquier foto válida y chica (menos de 5MB).
4. En la pestaña Network, buscar la request `upload/pets` (filtrar escribiendo "upload").
5. Click derecho sobre esa request → **Copy** → **Copy as cURL** (bash).
6. Pegar el comando en una terminal (Git Bash, por ejemplo) — va a incluir automáticamente el token/cookie de sesión real, no hace falta copiarlo a mano.
7. Editar el comando: donde dice `--form 'file=@<archivo-chico>.jpg'`, cambiar la ruta por la de un archivo de más de 10MB (cualquier imagen/video pesado que tengas a mano sirve).
8. Ejecutar el comando y mirar la respuesta.

**Resultado esperado**: un error claro tipo "el archivo es demasiado grande" (4xx).
**Resultado que confirma el bug**: `500 Internal Server Error` genérico, sin mensaje útil — igual al de la tabla de arriba.

## Notas adicionales

- **Actualización 2026-08-13**: la hipótesis original ("es la explicación más probable de que mobile no muestre error") quedó **descartada** — validado en hardware real que mobile SÍ muestra un mensaje de rechazo claro y consistente para archivos oversize en la pantalla de adjuntos de videollamada, igual que Desktop. El hallazgo ambiguo de `videocall.spec.ts` TS-03 TC-01 (2026-08-12, resultados contradictorios entre corridas contra el emulador) era un falso negativo del emulador, no evidencia de que este bug de backend afectara a un usuario real — ver `qa-workspace/decision-log.md` (entrada 2026-08-13) para el detalle completo. Este bug (el 500 crudo del backend) sigue vigente igual — solo se descarta que explique algo del comportamiento observado en mobile.
- No se investigó si existe algún límite/config de tamaño de request a nivel de gateway/proxy delante del backend (podría explicar por qué es un 500 genérico de Spring/Java — `"error":"Internal Server Error"` sin cuerpo específico de aplicación — en vez de un error de validación propio de la app).
