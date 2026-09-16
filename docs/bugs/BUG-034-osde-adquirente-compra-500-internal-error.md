**ESTADO: RETESTEADO 2026-09-10 — NO REPRODUCE HOY.** Ver retest completo en `docs/bugs/BUG-021-osde-adquirente-compra-falla-error-backend.md` (mismo síntoma, misma causa probable). Compra OSDE Adquirente aprobada de punta a punta con datos frescos. No se crea Defect.

Jira: **sin crear — no amerita, ver retest de arriba.**

[Título]: BUG | La compra de OSDE Adquirente falla al confirmar el pago (error interno del sistema)

[Severidad]: Alto — impide completar el 100% de las compras de OSDE Adquirente probadas hoy, con datos y tarjeta de prueba válidos. De paso, bloquea también poder generar cuentas de prueba nuevas de OSDE Adquirente para testing (mismo mecanismo).

[Categoría]: Backend

[HU relacionada]: N/A — encontrado al intentar dar de alta una cuenta de prueba para automatizar IMAS-3218 (reseteo de contraseña OSDE Adquirente), no es un CA propio de esa HU.

[Información del entorno]:
- Ambiente: QA — `https://qa.vetify.com.ar/mas-osde-beneficios`
- Fecha de detección: 2026-09-06
- Reproducido **3 de 3 veces**, con 2 planes distintos (Emergencias y Premium) y 2 DNI distintos, tarjeta de prueba idéntica en los 3 intentos

[Descripción]:
Cuando un cliente nuevo intenta comprar un plan de OSDE Adquirente y llega al último paso (ingresar los datos de la tarjeta y presionar "Finalizar"), el sistema no logra confirmar el pago — aparece un error genérico y la compra no se concreta, aunque los datos de la tarjeta y del cliente sean correctos. Probado 3 veces seguidas, con planes y datos distintos cada vez, y siempre pasa lo mismo.

[Pasos para reproducir]:
1. Ir a `https://qa.vetify.com.ar/mas-osde-beneficios`.
2. Elegir cualquier plan → "Contratar".
3. Completar datos personales (nombre, apellido, email nuevo, teléfono `1161898707`, DNI cualquiera) → Continuar.
4. Completar facturación (Provincia "Ciudad Autónoma de Buenos Aires", Localidad "CIUDAD AUTONOMA DE BUENOS AIRES", Calle "Av Corrientes 123", CP `1414`) → Continuar.
5. Ingresar tarjeta de prueba `4509 9535 6623 3704`, CVV `123`, vencimiento `08/29` → Finalizar.

[Resultado esperado]:
El pago se confirma y la compra se completa correctamente — es la misma tarjeta de prueba "aprobada" que funciona sin problema en el Flujo de Compra de Vetify B2C.

[Resultado actual]:
El pago no se confirma. El sistema muestra un mensaje de error al procesar la compra.

[Detalle técnico] (para el equipo de desarrollo):
- Endpoint: `POST /api/quantum/jengage/payment/pagar-mp?cuenta=MA_VETIFY`
- Respuesta, las 3 veces, sin excepción: `200` (HTTP) con body `{"status": 400, "statusMP": {"status": "500", "statusDetail": "internal_error", "idUser": null, "saleConfirmProducts": null}}`
- No es el mismo síntoma que el "antifraude de MercadoPago" ya visto y aceptado como comportamiento intermitente normal en `docs/bugs/BUG-021-osde-adquirente-compra-falla-error-backend.md` (retests de 2026-08-29 y 2026-09-02, que mostraban `statusMP.statusDetail: "cc_rejected_other_reason"`, un rechazo puntual de tarjeta). Esto es un `500 internal_error` — un fallo de servidor, no un rechazo de tarjeta.
- **Coincide en cambio con el síntoma ORIGINAL de BUG-021** (2026-08-26, antes de que se creyera resuelto): en ese momento se vieron tanto un `NullPointerException` de Java expuesto crudo como un `"500: Unknown error occurred"` — ambos también fallos de servidor genéricos en este mismo endpoint, para este mismo producto.
- **Ticket relacionado pero NO idéntico, ya cerrado**: `IMAS-3544` ("[QA] Flujo de checkout adquiriente (B2C/OSDE) no permite finalizar la compra", Hecho) — mismo endpoint (`pagar-mp?cuenta=MA_VETIFY`), pero el detalle específico era distinto: `status: 404`, `statusDetail: "404 NOT_FOUND \"El tipo de documento nullno fue encontrado en las tablas de engage\""` (un bug de tipo de documento llegando `null`). No se puede confirmar que sea la misma causa reapareciendo — el código de error y el mensaje son diferentes — pero refuerza que este endpoint puntual tiene un historial largo de fragilidad para este producto.
- Otros tickets relacionados al mismo endpoint/flujo, distintos síntomas: `IMAS-4431` (Backlog, error de cálculo de precio en Vetify B2C), `IMAS-4274` (Bloqueado, falla con tipo de documento Cédula).

[Tabla CP de evidencia — reproducción manual 2026-09-06]:

| Intento | Plan | DNI | Tarjeta | Resultado `pagar-mp` |
| --- | --- | --- | --- | --- |
| 1 | Emergencias ($13.791) | (aleatorio) | Visa 4509 9535 6623 3704 | `500 internal_error` |
| 2 | Premium ($61.591) | (aleatorio, distinto) | Visa 4509 9535 6623 3704 | `500 internal_error` |
| 3 | Premium ($61.591) | (aleatorio, distinto) | Visa 4509 9535 6623 3704 | `500 internal_error` |

[Notas adicionales]:
- Reproducido tanto vía script automatizado (Playwright, reusando los Page Objects de `osde-adquirente/purchase-flow.spec.ts`) como puede reproducirse manualmente con los datos de arriba — no es un artefacto de la automatización.
- Bloquea de forma transversal la generación de cuentas OSDE Adquirente reales para testing (incluida la automatización pendiente de IMAS-3218, TS-05 Cambio de contraseña) — sin una compra real exitosa, no se puede dar de alta una cuenta nueva de este producto.
- **Pendiente**: decidir si se reabre `BUG-021` (mismo watch item, mismo endpoint) o se crea un Defect nuevo vinculado a él como recurrencia — a definir mañana antes de subir a Jira.
