Jira: IMAS-4472 (padre, "In Validation") + IMAS-4534 (subtarea "Pruebas en QA", Backlog)

[Título]: BUG | Reintegros: validación ARCA automática sigue devolviendo HTTP 400 en QA pese al fix IMAS-4533
[Severidad]: Alto — bloquea la validación automática de facturas; obliga a usar el workaround manual que el fix introdujo (IMAS-4533), pero el ticket pide que ARCA "responda correctamente en QA" — y eso no se cumple.
[Categoría]: Backend (integración con ARCA)
[HU relacionada]: IMAS-4101 (épica migración SISE→Nexus)

[Información del entorno]:
- Ambiente: QA — `https://reintegros-backoffice.ike.qa`
- Fecha de detección original: 2026-08 (época ticket IMAS-4472)
- Re-verificación QA: 2026-09-02 (esta sesión)
- Subtarea de desarrollo: IMAS-4533 (Desarrollo) — estado: "Hecho" (deployado)
- Subtarea de QA: IMAS-4534 (Pruebas en QA) — estado: "Backlog"

[Descripción]:
Cuando se sube una factura nueva y se quiere verificar automáticamente contra ARCA desde el backoffice, la llamada a la API devuelve HTTP 400 con un error de CUIT que no se puede destrabar desde la UI. El fix IMAS-4533 (Desarrollo, "Hecho") agregó la opción de "Validación manual" como workaround — y ese workaround sí funciona (se ve en el badge "Validación manual" en facturas como 3131739 y 3131925) — pero el camino automático sigue roto: cualquier factura nueva sin override manual cae en este 400 y queda con badge "Pendiente de verificación" hasta que alguien la valide a mano.

[Pasos para reproducir]:
1. Ingresar al backoffice de Reintegros (`reintegros-backoffice.ike.qa`) con usuario de Calidad.
2. Ir a la bandeja "Pendientes" (39 exptes al 2026-09-02).
3. Abrir un expediente con factura recién subida (ej. 3131927 — Deus, "Chequeo General", 4/8/26, factura `images.jpeg` con CUIT 20-98765434-3, CAE 65467002122724, monto $700).
4. Verificar que la factura muestra badge "Pendiente de verificación" y campos leídos por OCR.
5. Apretar el botón "Verificar".

[Resultado esperado]:
La factura se valida automáticamente contra ARCA y el badge pasa a "Validado por ARCA" (o el flujo sigue hacia aprobación de Calidad sin necesidad de override manual).

[Resultado actual]:
La UI no muestra feedback explícito, pero en la consola del navegador queda un error:
```
Failed to load resource: the server responded with a status of 400 ()
@ https://reintegros-backoffice.ike.qa/api/bff/reintegros/backoffice/expedientes/3131927/comprobante-arca:0
```
La factura sigue con badge "Pendiente de verificación". El operador tiene que editar los campos manualmente y forzar la validación manual (no hay camino de éxito automático).

[Detalle técnico] (para el equipo de desarrollo):
- Endpoint: `POST /api/bff/reintegros/backoffice/expedientes/{id}/comprobante-arca` (o PATCH — verificar método exacto)
- Respuesta observada: HTTP 400 (body no inspeccionado en esta pasada; el front solo loguea el status)
- Expediente de ejemplo en QA: `3131927` (Deus, 4/8/26, $700)
- Subtarea de desarrollo: IMAS-4533 — marcada como "Hecho", pero el síntoma original (ARCA devuelve 400 con motivo CUIT) sigue presente
- Subtarea de QA: IMAS-4534 — sigue en Backlog; al intentar validarla en 2026-09-02 se reproduce el 400
- Comportamiento relacionado en facturas más viejas: el `payloadSnapshot` del expte 3131739 muestra `previousMotivo: "HTTP 400"`, `previousResultado: "ERROR"`, `bodyExcerpt: "{\"message\":\"El CUIT no coincide\",\"status\":400}"` — el mismo síntoma se arrastra al menos desde junio

[Notas adicionales]:
- Ver `docs/bugs/BUG-029-reintegros-no-se-puede-aprobar-expediente-2-gastos.md` para el síntoma relacionado (decisión-calidad con 2 gastos), que ese sí está cerrado.
- La validación manual como workaround está bien resuelta (IMAS-4533 cubre eso) — el problema puntual es que el CA de la HU ("ARCA responde correctamente en QA") no se cumple, porque el camino automático sigue devolviendo 400.
- Subtarea de desarrollo probablemente necesite una segunda iteración para arreglar el matching del CUIT contra AFIP/ARCA, o para que el endpoint devuelva un error más informativo en vez de un 400 genérico.
- NO se propone cerrar IMAS-4472 ni IMAS-4534 — el ticket describe exactamente este síntoma y sigue activo.

## 🔎 Retest 2026-09-02 — BUG SIGUE ACTIVO (superado por la actualización de abajo, mismo día)

Re-verificación en QA (`reintegros-backoffice.ike.qa`) con usuario Calidad `acastellano@ikeasistencia.com.ar`. Expediente 3131927 (Deus, 4/8/26, "Chequeo General", factura `images.jpeg` recién subida y leída por OCR).

Acción: clic en "Verificar" sobre el expediente.
Resultado: `POST /api/bff/reintegros/backoffice/expedientes/3131927/comprobante-arca` → **HTTP 400** (visible en la consola del navegador como `Failed to load resource: the server responded with a status of 400 ()`).

**Decisión (2026-09-02, 17:29)**: el bug NO está cerrado. IMAS-4472 sigue activo. La subtarea IMAS-4534 (Pruebas QA) NO se puede cerrar sin un nuevo fix de dev que arregle la validación ARCA automática.

## ✅ RESUELTO — cierre 2026-09-02 (19 min después del retest de arriba, mismo día)

Dev (Paula Scalzo, comentario 14:43) explicó la causa real: la API de ARCA que se usaba fue modificada ~1 mes antes para no permitir que el receptor de la factura sea "consumidor final" — algo inviable para reintegros, porque el tutor que recibe la factura frecuentemente lo es. Se cambió a otra API disponible en Iké y se remapearon los errores al backoffice.

Con ese contexto, el 400 del expediente `3131927` **no era el bug** — era ARCA rechazando correctamente una factura de prueba con datos inválidos (CUIT `20-98765434-3` de "Prueba Monotributo"), lo cual dispara legítimamente el estado "Factura en Revisión" (con la verificación manual como fallback ya confirmado funcionando). El retest de las 17:29 interpretó ese rechazo esperado como si fuera el bug original.

**Estado final en Jira**: `IMAS-4472` → **Pending Validation** (CA "La validación ARCA responde correctamente en QA" ✅ confirmado; CA de Producción pendiente del deploy — `IMAS-4535` sigue en Backlog). `IMAS-4534` (Pruebas en QA) → **Hecho**.

**Lección**: antes de reconfirmar "sigue roto" con el mismo caso de prueba de siempre, verificar si los datos de esa factura de prueba son deliberadamente inválidos (dispararía un rechazo legítimo) — no asumir que cualquier 400 es el bug original sin revisar el motivo real del rechazo.
