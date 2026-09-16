Jira: IMAS-4431 (https://ikeasistencia-arg.atlassian.net/browse/IMAS-4431) — creado 2026-08-26, tipo Error, sin HU padre. Confirmado que no estaba reportado por otra vía (búsqueda de texto "calcular precio", "pagar-mp", "checkout"+"compra" y los 15 issues más recientes del proyecto, sin coincidencias).

[Título]: BUG | Error 500 "Error al calcular precio del producto" al finalizar la compra (Vetify B2C)
[Severidad]: Crítico — bloquea el 100% de las compras de Vetify B2C confirmadas con datos y tarjeta de prueba válidos; nadie puede completar el Flujo de Compra mientras esto esté activo.
[Categoría]: Backend
[HU relacionada]: N/A — falla técnica transversal del backend, no ligada a una HU puntual.

[Información del entorno]:
- Ambiente: QA — `https://qa.vetify.com.ar`
- Fecha de detección original (vía `UserFactory` automatizado): 2026-08-25
- Fecha de esta confirmación en vivo, 100% manual vía UI real: 2026-08-26
- Reproducido 2/2 veces en esta sesión, con datos completamente independientes cada vez (ver detalle abajo)

[Descripción]:
Al completar el Flujo de Compra de Vetify B2C (institucional, `qa.vetify.com.ar`) hasta el paso final ("Finalizar"), el endpoint `POST /api/quantum/jengage/payment/pagar-mp` responde `500` con el body `{"error":"Error al calcular precio del producto"}`. La compra nunca se concreta — no hay forma de avanzar más allá del botón "Finalizar".

Este hallazgo empezó como una sospecha de bug de automatización (`UserFactory.generateVetifyTestUser()`, ver IMP-004 en `docs/impedimentos-bloqueos.md`, actualización 2026-08-25): ese helper arma el `calculateParam` del pago a mano en vez de dejar que la UI lo recalcule, así que la hipótesis inicial fue que el payload armado a mano tenía algo mal formado que el backend rechazaba.

**Esa hipótesis quedó descartada hoy**: se reprodujo el mismo error exacto conduciendo el Flujo de Compra 100% a mano por la UI real (sin ningún helper de automatización, sin ningún payload armado por script), con Playwright MCP capturando la request real que el navegador arma solo. El payload real de la UI (ver Notas) tiene la misma forma que el de `UserFactory` y el backend lo rechaza igual — **no es un problema de cómo arma el payload la automatización, es el backend real rechazando compras reales**.

[Pasos para reproducir]:
1. Ir a `https://qa.vetify.com.ar`.
2. Elegir cualquier plan (confirmado con "Emergencias" y "Classic") → "Contratar".
3. Paso 1 (Datos personales): nombre/apellido cualquiera, email nuevo, teléfono `1161898707`, tipo de documento "DNI", número de documento cualquiera. Continuar.
4. Paso 2 (Datos de facturación): Provincia "Ciudad Autónoma de Buenos Aires", Localidad "CIUDAD AUTONOMA DE BUENOS AIRES" (elegir la sugerencia del buscador), Calle y número "Av Corrientes 123", Código postal `1414`. Continuar.
5. Paso 3 (Formas de pago): tarjeta de prueba MercadoPago `4509 9535 6623 3704`, CVV `123`, vencimiento `08/29`, nombre del titular cualquiera.
6. Presionar "Finalizar".

[Resultado esperado]:
`200` (compra aprobada) — es la tarjeta de prueba "APRO" estándar de MercadoPago, usada en decenas de corridas previas exitosas del mismo flujo (`purchase-flow.spec.ts`).

[Resultado actual]:
`500` en `POST /api/quantum/jengage/payment/pagar-mp?cuenta=MA_VETIFY`, body `{"error":"Error al calcular precio del producto"}`. Confirmado 2/2 veces:
- Intento 1: plan Emergencias ($19.990), DNI `40123456`, email `user_1785900000001_imp004@automation.com`.
- Intento 2: plan Classic ($62.990), mismo DNI, email `user_1785900000002_imp004b@automation.com`, nombre de titular distinto.

[Notas adicionales]:
- **Puede o no estar relacionado con IMAS-4347** (BUG-014, `docs/bugs/BUG-014-error-502-auth-carga-planes.md`, ya marcado "Hecho" el 2026-08-25) — mismo síntoma general (bloqueo total de compra) pero mensaje de error distinto y más específico ("calcular precio del producto" vs. el 502 genérico de Auth al cargar planes). Podría ser una regresión del mismo incidente de fondo, o un problema nuevo en la lógica de cálculo de precio — no confirmado cuál sin acceso a logs del backend.
- `purchase-flow.spec.ts` (Vetify B2C y OSDE Adquirente) había corrido 29/29 en verde el 2026-08-25 (día anterior a esta confirmación) — no se volvió a correr la suite automatizada hoy todavía, solo la reproducción manual vía MCP documentada acá. Recomendado re-correr la suite automatizada para confirmar si también empezó a fallar ahí.
- **Alcance extendido (2026-09-02)**: verificado que falla con planes VET y OSDE por igual — NO es un problema específico de OSDE ni de un plan en particular. Probado y confirmado con 3 planes distintos:
  - Plan 2313 (VET Classic, no-OSDE) → `500 {"error":"Error al calcular precio del producto"}`
  - Plan 2349 (VET Esencial OSDE) → `500 {"error":"Error al calcular precio del producto"}`
  - Plan 2358 (VET Classic OSDE) → `500 {"error":"Error al calcular precio del producto"}`
  Todos llegan al paso de pago, completan los datos de tarjeta, pero fallan al presionar "Finalizar" con el mismo error. El checkout está roto para TODOS los productos en QA, no solo para OSDE.
- Body de la request real capturada en el intento 1 (vía `browser_network_request`, Playwright MCP), para referencia de quien investigue del lado backend:
  ```json
  {"calculateParam":{"idTarjeta":1,"esCredito":1,"esDebito":0,"cupon":"","couponDescription":"","listInvoicedProducts":[{"id":2319,"qty":1}],"subtotalWODiscount":19990,"discounts":0,"subtotalWDiscount":19990,"total":19990,"idPayType":1}, ...}
  ```
- Documentado como impedimento en `docs/impedimentos-bloqueos.md` (IMP-004, actualización 2026-08-26) — bloquea toda la suite de Flujo de Compra de Vetify B2C (TS-02, TS-03) mientras esté activo, además de bloquear por completo `UserFactory.generateTestUsers()`/`generateVetifyTestUser()` (cualquier necesidad de cuentas fresh nuevas).
- Reportado en Jira como IMAS-4431 (ver arriba) tras confirmar que no existía un reporte previo.
