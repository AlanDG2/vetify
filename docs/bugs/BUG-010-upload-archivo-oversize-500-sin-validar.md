# BUG-010 — Backend: `/api/files/upload/pets` devuelve 500 crudo en vez de validar el tamaño máximo del archivo

**Título**: BUG | Backend — endpoint de subida de archivos no valida tamaño máximo, devuelve 500 sin mensaje
**Severidad**: Medio — no bloquea el flujo normal en Desktop (el frontend ya impide enviar un archivo de más de 10MB antes de llegar a este endpoint), pero es una falla real de robustez del backend: cualquier request que sí llegue con un archivo grande (un cliente distinto, una app mobile, una integración) recibe un error genérico sin información útil. Es la causa más probable de que en la app mobile no se vea ningún mensaje de error al intentar adjuntar un archivo de más de 10MB (ver notas).
**Categoría**: Backend
**HU relacionada**: IMAS-3889 (Adjuntos de videollamada) / IMAS-4023 (regresión de adjuntos) — mismo endpoint que usa esa pantalla; no ligado a una HU de mobile puntual.

## Información del entorno

- Ambiente QA: `https://vetify-qa.ikeapp.com`.
- Endpoint: `POST /api/files/upload/pets` (mismo que usa el paso de adjuntos de la solicitud de videollamada, tanto Desktop como mobile).
- Usuario: cuenta pooled `user_1782499435430@automation.com` (sesión cacheada real, `playwright/auth/452f3aa0-3a53-451e-a416-01d730b6e081.json`).
- Reproducido con una llamada HTTP directa (Playwright `request` context, sin pasar por ninguna UI), 2026-08-12.

## Descripción

El endpoint de subida de archivos no valida el tamaño del payload antes de procesarlo — un archivo de 11MB (por encima del límite documentado de 10MB que el frontend Desktop sí hace cumplir antes de enviar la request) produce una excepción no controlada del lado del servidor (`500 Internal Server Error`), en vez de una respuesta 4xx con un mensaje claro (ej. "el archivo excede el tamaño permitido").

En Desktop este bug nunca lo ve un usuario real porque el frontend bloquea el envío antes de llegar a la red (confirmado en el POM Playwright: el mensaje "demasiado grande" se muestra sin esperar ninguna respuesta HTTP). Pero es un gap real de robustez del backend, y es la explicación más probable de un hallazgo separado en mobile (`videocall.spec.ts` TS-03, ver `qa-workspace/decision-log.md` 2026-08-12): al adjuntar un archivo de 11MB vía el selector nativo de Android, la pantalla no mostró ningún mensaje de error ni tampoco el archivo adjuntado — consistente con que la petición sí llegó a este endpoint (a diferencia de Desktop) y el 500 resultante no tiene ningún manejo de error mapeado en la UI.

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

## Notas adicionales

- No se confirmó si mobile realmente llega a golpear este endpoint con el archivo oversize (no se pudo interceptar la red desde WebdriverIO/Appium — ver limitación ya documentada en `qa-workspace/known-issues.md` sobre CDP no disponible en este stack). Es la explicación más consistente con lo observado, pero queda como hipótesis fundamentada, no como hecho confirmado end-to-end.
- No se investigó si existe algún límite/config de tamaño de request a nivel de gateway/proxy delante del backend (podría explicar por qué es un 500 genérico de Spring/Java — `"error":"Internal Server Error"` sin cuerpo específico de aplicación — en vez de un error de validación propio de la app).
- Relacionado con el hallazgo de mobile documentado en `qa-workspace/decision-log.md`, entrada "TS-03 ampliado..." (2026-08-12) — `videocall.spec.ts` TS-03 TC-01 quedó como skip documentado por evidencia entonces ambigua; este bug le da un respaldo técnico más sólido a esa ambigüedad, aunque no la resuelve del todo (ver punto anterior).
