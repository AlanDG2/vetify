**ESTADO: NO se crea ticket propio — mismo síntoma que IMAS-4431.** Reconfirmado 2026-09-10: el checkout de Vetify B2C sigue roto hoy (12 fallas en `purchase-flow.spec.ts`, mismo endpoint `pagar-mp`), ya trackeado como IMAS-4431 (vinculado a IMAS-4658). Este documento describe el mismo problema de fondo (tarjetas de prueba que deberían aprobarse y no lo hacen) — no amerita un Defect separado, sería duplicado.

Jira: **sin crear — duplicado de IMAS-4431, ver nota de arriba.**

[Título]: BUG | Las tarjetas de prueba de pago fallan de forma pareja en varios productos (no es un caso puntual)

[Severidad]: Alto — impide completar el 100% de las compras probadas hoy en Vetify B2C, con datos y tarjetas de prueba que hasta ahora siempre habían funcionado. Bloquea todo el módulo de Flujo de Compra.

[Categoría]: Backend / Ambiente (MercadoPago sandbox QA)

[HU relacionada]: N/A — hallazgo transversal, encontrado al retomar la automatización del módulo de compras.

[Información del entorno]:
- Ambiente: QA — `https://qa.vetify.com.ar` (Vetify B2C)
- Fecha de detección: 2026-09-06
- Reproducido **2 de 2 veces** el mismo caso puntual (mismo test, mismos datos), y coincide con 6 casos más distintos en la misma corrida

[Descripción]:
Al completar una compra con una tarjeta de prueba que hasta ahora siempre se aprobaba sin problema, el sistema la rechaza. Y al revés: una tarjeta que debería rechazarse a propósito (para probar el caso de error) esta vez se aprobó. Y una tercera tarjeta que simula "fondos insuficientes" fue rechazada, pero con un motivo genérico distinto al esperado. En criollo: el comportamiento de las tarjetas de prueba está mezclado hoy — ninguna se comporta como se espera, ni para bien ni para mal.

[Pasos para reproducir]:
1. Ir a la web institucional de Vetify B2C, elegir cualquier plan.
2. Completar los datos personales y de facturación con cualquier valor válido.
3. En el paso de pago, usar la tarjeta de prueba `4509 9535 6623 3704` (Visa, la que siempre se usó como "aprobada").
4. Presionar "Finalizar".

[Resultado esperado]:
La compra se aprueba (como siempre pasó con esta tarjeta).

[Resultado actual]:
La compra se rechaza.

[Detalle técnico] (para el equipo de desarrollo):
- Endpoint: `POST /api/quantum/jengage/payment/pagar-mp`
- Caso reproducido 2/2 (mismo test, misma tarjeta): esperado `{"status":200,"statusMP":{"status":"approved","statusDetail":"accredited"}}`, recibido `{"status":400,"statusMP":{"status":"rejected","statusDetail":"cc_rejected_other_reason"}}`.
- **Mismo patrón, misma corrida, 4 casos más de "aprobada esperada" con distintas variantes** (plan individual débito, plan familiar débito, plan familiar crédito, y el setup de un test de asociación de compra) — los 5 casos de "debería aprobarse" fallaron igual, todos con `cc_rejected_other_reason`.
- **1 caso invertido**: un test que simula una tarjeta prepaga (`CTNA`) para probar el rechazo esperado (`400`) en cambio devolvió `200` (aprobado) — la tarjeta que debía fallar, esta vez pasó.
- **1 caso con motivo distinto**: un test que espera `cc_rejected_insufficient_amount` (fondos insuficientes) recibió `cc_rejected_other_reason` en cambio — la compra sí falló como se esperaba, pero con el código de motivo equivocado.
- 7 de 7 fallas de esta corrida caen en esta misma categoría (comportamiento de tarjeta de prueba, no lógica de la app ni del test) — 0 de 7 son bugs de automatización o de producto.
- **Relacionado, mismo dominio, ya documentado para OSDE Adquirente**: `docs/bugs/BUG-021-osde-adquirente-compra-falla-error-backend.md` y su retest de hoy (`docs/bugs/BUG-034-osde-adquirente-compra-500-internal-error.md`) — pero ahí el síntoma es `500 internal_error` (fallo de servidor), acá es un rechazo válido de MercadoPago (`400`/`cc_rejected_*`) con el motivo equivocado. Son síntomas distintos del mismo sandbox de pago inestable, en productos distintos, el mismo día.

[Notas adicionales]:
- No se investigaron los otros 3 productos (OSDE Capitado, Flux Capitado, OSDE Adquirente) hoy — dado que Vetify B2C, que hasta ahora era el más estable de los 4, também falla parejo, no tiene sentido gastar más corridas ahí hasta que esto se resuelva o se entienda mejor.
- Este es exactamente el mismo patrón de inestabilidad de MercadoPago sandbox en QA ya documentado como "intermitente, aparece y desaparece solo" en `BUG-021` (retests de 2026-08-29 y 2026-09-02) — la diferencia es que hoy afecta también a Vetify B2C, no solo a OSDE Adquirente, y con más variedad de síntomas (no solo rechazo, también aprobación indebida y motivo de rechazo equivocado).
- Recomendación: reintentar más tarde (en otra sesión/día) antes de escalar a Jira — si el patrón persiste sostenido en el tiempo, ahí sí amerita Defect formal por el impacto transversal a los 4 productos.
