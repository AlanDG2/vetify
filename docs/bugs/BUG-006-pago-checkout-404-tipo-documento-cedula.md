[Título]: BUG | Checkout Vetify - Pago Mercado Pago falla con 404 al seleccionar tipo de documento Cédula

[Jira]: **IMAS-4274** (tipo Error, sin parent/link, sprint 2026-Q3-S4-Mascotas, estado Tareas Por Hacer) — creado 2026-08-11. https://ikeasistencia-arg.atlassian.net/browse/IMAS-4274

[Severidad]: Alto — bloquea el 100% de las compras cuando el comprador selecciona "Cédula" como tipo de documento; el pago nunca se concreta.

[Categoría]: Bug de producto (backend) — servicio `jengage`.

[HU relacionada]: Ninguna HU puntual — bug transversal del checkout institucional de Vetify.

[Información del entorno]:
- Ambiente: QA — https://qa.vetify.com.ar/checkout
- SO / navegador: Windows 11 / Chrome (vía Playwright MCP)
- Tarjeta de prueba Mercado Pago usada: Visa 4509 9535 6623 3704, CVV 123, titular APRO (fuerza pago aprobado en sandbox)
- Fecha de validación: 2026-08-11

[Descripción]:
Al finalizar el checkout de compra de un plan Vetify (paso 3, "Formas de pago") habiendo seleccionado "Cédula" como tipo de documento en el paso 1 ("Datos personales"), el endpoint `POST /api/quantum/jengage/payment/pagar-mp?cuenta=MA_VETIFY` devuelve `404 Not Found`. El backend "jengage" no reconoce el código de tipo de documento que el frontend envía para la opción "Cédula" — el mensaje de error indica explícitamente que ese código ("LC") no existe en las tablas de catálogo del servicio. El pago nunca llega a Mercado Pago (`idMercadoPago: null`) y el checkout se resetea al paso 1, perdiendo los datos de facturación ya cargados.

[Pasos para reproducir]:
1. Ir a https://qa.vetify.com.ar/ → elegir un plan (ej. "Vetify Cachorros") → "Contratar".
2. En "Datos personales": completar Nombre, Apellido, Email, Teléfono; en "Tipo de documento" seleccionar **Cédula**; Número de documento cualquier valor válido. Continuar.
3. En "Datos de facturación": completar Provincia, Localidad (elegida de la lista de autocomplete), Calle y número, Código postal. Continuar.
4. En "Formas de pago": completar una tarjeta de prueba de Mercado Pago (Visa `4509 9535 6623 3704`, CVV `123`, vencimiento vigente, titular `APRO`).
5. Click en "Finalizar".

[Resultado esperado]:
El pago se procesa contra Mercado Pago (sandbox QA) y el checkout avanza a una pantalla de confirmación de compra.

[Resultado actual]:
Pantalla "¡Ups! No se pudo concretar el pago" con opciones "Reintentar pago" / "Volver al inicio". Response del endpoint `pagar-mp`:
```json
{
  "status": 404,
  "message": "No se pudo concretar el pago",
  "statusMP": {
    "status": "404",
    "statusDetail": "404 NOT_FOUND \"El tipo de documento LC no fue encontrado en las tablas de engage\"",
    "idUser": null,
    "idMercadoPago": null,
    "saleConfirmProducts": null
  }
}
```

[Notas adicionales]:
- Reportado como Error suelto en Jira, sin HU/parent asociado, por decisión explícita del usuario del proyecto — sprint actual `2026-Q3-S4-Mascotas`, estado `Tareas Por Hacer`.
- **Relacionado con [BUG-004](BUG-004-tipo-documento-no-dni-no-vincula-compra.md) / IMAS-4118**, pero NO es el mismo defecto: BUG-004 ocurre *después* del pago (Quantum graba `'96'`/DNI sin importar el tipo real, rompiendo la vinculación posterior en `/validation/policy`); este bug ocurre *antes* de cobrar, en el servicio `jengage`, y bloquea la compra misma con un 404. Ambos comparten la causa de fondo (mapeo de tipo de documento no-DNI roto en el backend), pero son fallas técnicas distintas en servicios distintos — no se linkearon formalmente en Jira.
- No se probó si L.C., L.E. u "Otro" también fallan con el mismo 404 — solo se confirmó con "Cédula".
- Dato aparte, no bug: el campo "Número de documento" trunca a 8 dígitos (formato argentino DNI/Cédula) — un número de 10 dígitos (formato cédula colombiana) no entra completo. Comportamiento esperado para documentos AR, no reportado junto con este bug.
