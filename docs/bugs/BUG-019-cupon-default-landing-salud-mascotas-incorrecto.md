Jira: [IMAS-4447](https://ikeasistencia-arg.atlassian.net/browse/IMAS-4447) — creado 2026-08-26, tipo Error, linkeado con "Blocks" a `IMAS-3610`, estado Backlog.

[Título]: BUG | Landing Salud Mascotas: sin cupón en la URL aplica VETIFY20 (1 mes) en vez del default VETIFY20X3 (3 meses)
[Severidad]: Alto — contenido promocional/legal que no se cumple para la mayoría de los visitantes reales (cualquiera que entra sin UTM de campaña específica). El hero de la landing promete "20% OFF POR TRES MESES" a todo el mundo, pero el descuento real aplicado en el checkout, en el caso default, es de un solo mes.
[Categoría]: Frontend / Contenido promocional
[HU relacionada]: IMAS-3610 (Landing de Performance de Conversión B2C) — spec de cupón definida en el mail de MKT (Milagros Sce, 20/8) adjunto a la HU: "Por defecto, en caso de que no exista ningún campo de cupón en la URL, necesitamos que la landing se visualice con el cupón: VETIFY20X3."

[Información del entorno]:
- Ambiente: QA — `https://qa.vetify.com.ar/salud-mascotas`
- Fecha de detección y confirmación: 2026-08-26

[Descripción]:
La landing `/salud-mascotas` muestra en su hero, para todos los visitantes sin excepción, el badge "20% OFF POR TRES MESES" — ese texto es estático y no depende de ningún cupón real (las llamadas a `payment/calculate` que hace la landing van con `cupon: ""`). El cupón real solo se resuelve al clickear un CTA de plan y llegar al checkout.

Cuando no hay ningún cupón en la URL de la landing (el caso de la enorme mayoría de las visitas reales — cualquiera sin una UTM de campaña puntual), el CTA arma el link al checkout con `cupon=VETIFY20`, en vez del default `VETIFY20X3` que especifica la spec de MKT. Son cupones con bases y condiciones legales distintas:
- `VETIFY20` → "Bases y condiciones: 20% OFF el primer mes" (un solo mes).
- `VETIFY20X3` → "Bases y condiciones: 20% OFF los primeros 3 meses" (coincide con lo que promete el hero).

El mecanismo de override sí funciona correctamente: si la URL de la landing trae explícitamente un cupón (ej. `?cupon=VETIFY25X3` o `?cupon=VETIFY20X3`), el CTA lo respeta y lo pasa bien al checkout. El bug está acotado específicamente al caso sin cupón en la URL.

[Pasos para reproducir]:
1. Abrir una ventana nueva/incógnito de `qa.vetify.com.ar` (para no arrastrar un cupón probado antes en la misma sesión de navegador).
2. Ir a `https://qa.vetify.com.ar/salud-mascotas` — sin ningún parámetro en la URL.
3. Click en el CTA de cualquier plan (ej. "Quiero estar preparado").
4. En el checkout, revisar "Cupones aplicados" y el pie de página ("Bases y condiciones").

[Resultado esperado]:
Se aplica el cupón `VETIFY20X3` → "20% OFF los primeros 3 meses" (coincide con el badge del hero).

[Resultado actual]:
Se aplica el cupón `VETIFY20` → "20% OFF el primer mes" (un solo mes) — no coincide con lo que la propia landing promete visualmente a ese mismo visitante.

[Notas adicionales]:
- Verificado 2/2 veces con `localStorage`/`sessionStorage` limpios entre pruebas, para descartar que fuera un cupón cacheado de una prueba anterior en la misma sesión de navegador — reproducible de forma limpia.
- El mecanismo de override (cupón explícito en la URL/UTM) funciona bien — confirmado con `VETIFY25X3` y con `VETIFY20X3` explícito, ambos se aplican correctamente cuando vienen en la URL.
- Encontrado durante la verificación de correcciones pendientes de IMAS-3610, validado en vivo por el usuario del proyecto antes de reportar.
- Ver `docs/user-stories/IMAS-3610-landing-performance-conversion-b2c.md` para el detalle completo de la investigación (incluye la comparación de bases y condiciones de ambos cupones).
