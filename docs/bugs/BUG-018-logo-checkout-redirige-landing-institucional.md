Jira: [IMAS-4439](https://ikeasistencia-arg.atlassian.net/browse/IMAS-4439) — creado 2026-08-26, tipo Error, linkeado con "Blocks" a `IMAS-3610` (bloquea el cierre de esa HU vía `checkClosable()`), estado Backlog.

[Título]: BUG | Landing Salud Mascotas: el logo en el checkout redirige a la landing institucional en vez de volver a la landing de origen
[Severidad]: Medio — no bloquea la compra en sí (el flujo de pago funciona), pero rompe la navegación de vuelta para cualquiera que llegó por esta landing y se arrepiente o quiere revisar algo antes de pagar; efecto de negocio (pierde el contexto de campaña/cupón que traía).
[Categoría]: Frontend / Navegación
[HU relacionada]: IMAS-3610 (Landing de Performance de Conversión B2C) — corrección pedida explícitamente en el mail de feedback de diseño del 25/8, adjunto a la HU, todavía sin solucionar 11 días después.

[Información del entorno]:
- Ambiente: QA — `https://qa.vetify.com.ar/salud-mascotas`
- Fecha de detección original: mail de correcciones adjunto a IMAS-3610, 2026-08-25 (Julieta Trias, Diseñadora Audiovisual)
- Fecha de esta re-confirmación en vivo: 2026-08-26 — sigue igual

[Descripción]:
La landing de Performance (`/salud-mascotas`) pasa el parámetro `from=salud_mascotas` en la URL al entrar al checkout, precisamente para que el checkout sepa a qué landing debe volver. El botón "Regresar" del wizard sí respeta ese contexto (vuelve bien a `/salud-mascotas`). El logo del header, en cambio, tiene un link hardcodeado a `/` — ignora por completo el parámetro `from` y manda siempre a la landing institucional, sin importar desde qué landing haya entrado el usuario.

[Pasos para reproducir]:
1. Ir a `https://qa.vetify.com.ar/salud-mascotas`.
2. Click en el CTA de cualquier plan (ej. "Quiero estar preparado").
3. Ya en el checkout (URL con `...&from=salud_mascotas`), click en el logo "vetify" arriba a la izquierda.

[Resultado esperado]:
Vuelve a `https://qa.vetify.com.ar/salud-mascotas` (la landing de origen).

[Resultado actual]:
Vuelve a `https://qa.vetify.com.ar/` (landing institucional), con los query params (`cupon`, `from`) colgando en la URL pero sin ningún efecto.

[Notas adicionales]:
- El botón "Regresar" del wizard (distinto del logo) **sí funciona bien** — no es el mismo mecanismo, por eso el fix tiene que tocar específicamente el link del logo, no el wizard.
- Reproducido de forma consistente, en Desktop y confirmado que el link es un href estático (no depende de una condición de carrera ni de timing).
- Encontrado durante la verificación de correcciones pendientes de IMAS-3610 (no es un hallazgo de exploración libre — ya estaba pedido explícitamente en el mail de feedback del 25/8, comentario de Liliana Picinotti en la HU).
