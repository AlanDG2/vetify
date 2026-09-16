**ESTADO: RETESTEADO 2026-09-10 — NO REPRODUCE HOY.** Se repitió la compra OSDE Adquirente completa (DNI, mismo plan, tarjeta `4509 9535 6623 3704`/APRO) y se aprobó de punta a punta (`status: approved`, `statusDetail: accredited`, póliza real emitida). No se crea Defect — probablemente el mismo patrón de falso alarma ya visto con IMP-004 (email de dominio descartable rechazado por antifraude de MercadoPago) u otra inestabilidad puntual del ambiente en su momento, no un bug persistente del backend.

Jira: sin crear — no amerita, ver retest de arriba.

[Título]: BUG | OSDE Adquirente: la compra falla en el paso de pago, con un error de backend crudo (no siempre el mismo mensaje)
[Severidad]: Alto — bloquea el 100% de las compras de OSDE Adquirente confirmadas con datos y tarjeta de prueba válidos; de paso, bloquea también la generación de cuentas fresh de OSDE Adquirente para testing (mismo mecanismo).
[Categoría]: Backend
[HU relacionada]: Encontrado investigando `IMAS-4356` (banner Cooper) — se necesitaba una cuenta OSDE Adquirente con mascota/perfil completo para aislar una duda de esa HU, y no se pudo generar por este bloqueo. No es un bug de `IMAS-4356` en sí, es un hallazgo transversal.

[Información del entorno]:
- Ambiente: QA — `https://qa.vetify.com.ar/mas-osde-beneficios`
- Fecha de detección: 2026-08-26/27

[Descripción]:
Al completar el Flujo de Compra de OSDE Adquirente hasta el paso final ("Finalizar"), el endpoint `POST /api/quantum/jengage/payment/pagar-mp` responde `400` con un mensaje de error de backend — pero **el mensaje exacto no fue el mismo en las 2 reproducciones**, lo que sugiere más de una causa posible, o un backend inestable en ese paso puntual para este producto.

**No es el mismo síntoma que `IMAS-4431`** (ese es "Error al calcular precio del producto", encontrado en Vetify B2C) — acá el checkout llega más lejos (calcula el precio bien) pero falla específicamente al confirmar el pago con MercadoPago.

[Pasos para reproducir]:
1. Ir a `https://qa.vetify.com.ar/mas-osde-beneficios`.
2. Elegir cualquier plan → "CONTRATAR".
3. Paso 1 (Datos personales): nombre/apellido cualquiera, email nuevo, teléfono `1161898707`, DNI cualquiera. Continuar.
4. Paso 2 (Facturación): Provincia "Ciudad Autónoma de Buenos Aires", Localidad "CIUDAD AUTONOMA DE BUENOS AIRES" (sugerencia), Calle "Av Corrientes 123", CP `1414`. Continuar.
5. Paso 3 (Pago): tarjeta de prueba `4509 9535 6623 3704` o `5031 4332 1540 6351`, CVV `123`, vencimiento `08/29`, nombre cualquiera.
6. Presionar "Finalizar".

[Resultado esperado]:
`200` (compra aprobada) — misma tarjeta de prueba "APRO" que funciona sin problema en el Flujo de Compra de Vetify B2C.

[Resultado actual]:
Pantalla "¡Ups! No se pudo concretar el pago". Reproducido 2/2, con `POST .../pagar-mp` respondiendo `400` las dos veces, pero con detalle distinto:
- Intento 1 (tarjeta Visa, plan Emergencias, DNI `40555123`): `statusMP.statusDetail` = `"Cannot invoke \"java.util.List.size()\" because the return value of \"ar.com.ike.jengage.model.engage.ErroresMP.getCause()\" is null"` — un NullPointerException de Java expuesto crudo en la respuesta.
- Intento 2 (tarjeta Mastercard, plan Classic, DNI `40777888`): `statusMP.status` = `500`, `statusMP.statusDetail` = `"500 : \"{\"status\":500,\"message\":\"Unknown error occurred\"}\""` — mensaje genérico, parecido a uno ya visto el 2026-08-04 (ver `docs/impedimentos-bloqueos.md` IMP-004) en otro contexto.

[Notas adicionales]:
- El usuario del proyecto (Alan) cree que este bug — o algo muy parecido — **ya podría estar reportado**. Se buscó en Jira por texto (`ErroresMP`, `getCause`, `"No se pudo concretar el pago"`, `OSDE`+`pago`) y no apareció nada abierto que coincida — los resultados más cercanos son tickets viejos ya cerrados (`IMAS-3544`, `IMAS-2490`, `IMAS-3203`) sobre otros síntomas de OSDE/pago. **Pendiente de validar mañana con más contexto de Alan** (número de ticket, fecha aproximada) antes de decidir si corresponde crear un Defect nuevo o si ya existe.
- No confirmado si el mismo problema afecta Vetify B2C (no se reprobó ahí en el momento de este hallazgo — `purchase-flow.spec.ts` había corrido 29/29 el 2026-08-25, pero eso fue antes de este hallazgo puntual en OSDE).
- Bloquea de forma transversal cualquier necesidad de generar una cuenta OSDE Adquirente fresh (vía compra real) para testing — incluida la investigación de `IMAS-4356` (no se pudo aislar si el banner de Cooper depende del segmento OSDE o de tener el perfil completo, por no poder generar una cuenta Adquirente con mascota).
- Ver `docs/user-stories/IMAS-4356-banner-cooper-webapp-osde.md` para el contexto completo de cómo se encontró esto.

## 🔎 Retest 2026-08-29 — NO reprodujo (3/3 exitosas), el "mañana" de arriba nunca se retomó hasta hoy

Auditoría general de bugs sin reportar (a pedido del usuario). Se re-ejecutó `tests/projects/osde-adquirente/purchase-flow.spec.ts` TC-01 (Compra exitosa) 3 veces, misma ruta (`/mas-osde-beneficios`), plan elegido al azar cada vez (`contractRandomPlan()`), tarjeta Visa **exactamente la misma** (`4509 9535 6623 3704`) que la usada en el intento 1 de la reproducción manual original. **Las 3 corridas pasaron limpio** — `pagar-mp` respondió `200`, `statusMP.status: 'approved'`.

**No se puede confirmar que el bug esté arreglado** (nunca se filó un Defect, dev nunca lo tocó a propósito) — es más consistente con el mismo patrón ya visto en este ambiente QA para este endpoint compartido (`IMP-012`, `IMP-014`: 500/400 intermitentes que aparecen y desaparecen solos, sin fix identificable). **Decisión**: no filear todavía — si vuelve a aparecer, sí amerita Defect nuevo (severidad Alto si reproduce de forma sostenida). Dejar como watch item.

## 🔎 Retest 2026-09-02 — NullPointer no reproduce; persiste rechazo de MP por razones propias

Tercera verificación en QA. Cambio respecto a intentos anteriores: email de dominio real (`alan.gonzalez.test.0902@ingenia.la`) en vez de `@yopmail.com`. Plan Classic OSDE (2358), 1 unidad, $56.691, tarjeta `4509 9535 6623 3704`, CVV `123`, vencimiento `08/30`.

Resultado de red (`POST .../pagar-mp?cuenta=MA_VETIFY`):
```
HTTP 200, body: {
  "status": 400,
  "statusMP": {
    "status": "rejected",
    "statusDetail": "cc_rejected_other_reason",  ← rechazo de MP, no de Vetify
    "idUser": null,
    "saleConfirmProducts": null
  }
}
```

UI: "¡Ups! Tenemos un error al procesar tu compra, te contactaremos a la brevedad para solucionarlo."

**El NullPointerException original (intento 1, 2026-08-26) y el 500 Unknown error (intento 2, 2026-08-26) no se reprodujeron.** La lógica de `pagar-mp` está funcionando — llega correctamente a MercadoPago. El rechazo actual (`cc_rejected_other_reason`) es la política antifraude de MP, no un bug de Vetify.

**Diferencia clave vs. el retest anterior (2026-08-29)**: ese día el `pagar-mp` aprobó la compra con `statusMP.status: 'approved'`. Hoy la rechaza con `cc_rejected_other_reason` con datos equivalentes (mismo plan, misma tarjeta, mismo dominio de email). Esto refuerza la hipótesis de comportamiento **intermitente de MercadoPago antifraude en QA**, no un bug estable de Vetify.

**Decisión actualizada (2026-09-02)**: continuar como watch item, no filear. BUG-017/IMAS-4431 (error 500 "calcular precio") sigue cerrado. El checkout de OSDE Adquirente técnicamente funciona — el bloqueo actual es de MP, no nuestro.

## 🔎 Retest 2026-09-06 — vuelve el síntoma GRAVE (no el antifraude leve), 3/3 con `500 internal_error`

Al intentar dar de alta una cuenta OSDE Adquirente nueva (para automatizar IMAS-3218), 3 intentos consecutivos de compra real (2 planes distintos, 2 DNI distintos, misma tarjeta Visa APRO) fallaron los 3 con `pagar-mp` → `statusMP.status: "500", statusDetail: "internal_error"` — **no** es el rechazo de antifraude (`cc_rejected_other_reason`) visto en los retests anteriores, es el mismo tipo de fallo de servidor genérico visto en el hallazgo original de este bug (2026-08-26). Documentado aparte como `BUG-034` (con más detalle técnico y tabla de evidencia) porque el usuario del proyecto quiere subirlo a Jira mañana como Defect propio — no se tocó Jira todavía. Ver `docs/bugs/BUG-034-osde-adquirente-compra-500-internal-error.md`.
