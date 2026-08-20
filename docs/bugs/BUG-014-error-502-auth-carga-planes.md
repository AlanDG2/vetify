Jira: IMAS-4347 (https://ikeasistencia-arg.atlassian.net/browse/IMAS-4347) — creado 2026-08-20, tipo Error, sin HU padre (mismo patrón que BUG-004).

[Título]: BUG | Error 502 (Auth) al cargar el listado de planes en Flujo de Compra
[Severidad]: Alto — bloquea por completo el inicio del flujo de compra en ambos productos (Vetify B2C y OSDE Adquirente); nadie puede contratar un plan mientras esto esté activo.
[Categoría]: Backend
[HU relacionada]: N/A — falla técnica transversal del backend, no ligada a una HU puntual.
[Información del entorno]:
- Ambiente: QA
- URLs: `https://qa.vetify.com.ar` (Vetify B2C) y `https://qa.vetify.com.ar/mas-osde-beneficios` (OSDE Adquirente)
- Fecha de detección y confirmación manual: 2026-08-20
- Reproducido también desde Playwright (automatización) el mismo día, 2/2 corridas

[Descripción]:
Al cargar la página institucional (landing de Vetify B2C u OSDE Adquirente) y llegar a la sección "Elegí el mejor plan", el listado de planes nunca aparece. En su lugar, la propia página muestra un mensaje de error visible al usuario:

```
Error al cargar planes: Auth 502: Bad Gateway - {"error":"upstream_error","details":"AbortError: The operation was aborted."}
```

El mensaje indica que el servicio de Auth (upstream) está devolviendo `502 Bad Gateway` y que la operación se abortó. Como no hay ningún plan visible, es imposible avanzar en el flujo de compra — no se puede seleccionar un plan ni continuar al formulario.

Nota de contexto: el día anterior (2026-08-19) se había detectado un síntoma relacionado pero distinto en el mismo flujo — el endpoint de pago (`/api/quantum/jengage/payment/pagar-mp`) devolvía `500` en vez de `502`, en un paso posterior del flujo (al confirmar el pago, no al cargar planes). Puede ser el mismo incidente de infraestructura de fondo manifestándose de otra forma, o un problema nuevo — no confirmado cuál. Se documenta acá el síntoma de hoy (carga de planes), que es el que bloquea el flujo desde el primer paso.

[Pasos para reproducir]:
1. Ir a `https://qa.vetify.com.ar` (o `https://qa.vetify.com.ar/mas-osde-beneficios` para OSDE Adquirente).
2. Esperar a que cargue la página completa.
3. Bajar hasta la sección "Elegí el mejor plan".

[Resultado esperado]:
Se listan los planes disponibles (ej. Vetify Classic, Premium, Cachorros) con sus precios, disponibles para seleccionar y continuar la compra.

[Resultado actual]:
En vez del listado de planes, aparece el mensaje de error "Error al cargar planes: Auth 502: Bad Gateway - {"error":"upstream_error","details":"AbortError: The operation was aborted."}". No hay forma de continuar el flujo de compra.

[Notas adicionales]:
- Confirmado manualmente en vivo por el usuario del proyecto (captura de pantalla propia, mismo mensaje exacto).
- Confirmado también vía automatización (Playwright), 2/2 corridas, mismo error.
- Documentado como impedimento en `docs/impedimentos-bloqueos.md` (IMP-012) — bloquea toda la suite de Flujo de Compra (TS-01, TS-02, TS-03) en Vetify B2C y OSDE Adquirente mientras esté activo.
- No es un bug de lógica de negocio ni algo introducido por cambios de la automatización — es un error de infraestructura del lado del servidor (gateway/Auth), reproducible de forma consistente.
