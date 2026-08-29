Jira: [IMAS-4465](https://ikeasistencia-arg.atlassian.net/browse/IMAS-4465) — creado 2026-08-28, tipo Error, linkeado con "Blocks" a `IMAS-4356`, estado Backlog.

[Título]: BUG | OSDE Adquirente no ve el banner de beneficios Cooper (sigue viendo Vetify PLUS)
[Severidad]: Alto — incumple un requisito explícito y sin excepciones de la HU (OSDE Adquirente debe ver el banner de Cooper). Los clientes de este segmento no reciben el beneficio que se les prometió.
[Categoría]: Frontend / Segmentación
[HU relacionada]: IMAS-4356 (banner Cooper en WebApp) — bloquea su cierre.

[Información del entorno]:
- Ambiente: QA — `vetify-qa.ikeapp.com`
- Fecha de detección: 2026-08-28
- Reproducido 3 de 3 veces, con el resto de los servicios funcionando con normalidad (confirmado que no es por una caída del sistema)

[Descripción]:
Un cliente de OSDE Adquirente debería ver, al entrar a su cuenta, un banner promocional invitándolo a usar Cooper (paseos, guardería y entrenamiento para su mascota, con 20% de descuento). En cambio, sigue viendo el banner viejo de "Vetify PLUS", que ya no le corresponde a este tipo de cliente. Se probó 3 veces distintas con la misma cuenta y siempre se vio el banner incorrecto — mientras que otros 2 tipos de cliente de OSDE (Capitado, y Capitado con cupón Flux) sí ven el banner de Cooper correctamente en las mismas condiciones y el mismo día. Esto descarta que sea una falla pasajera del sistema — es específico de este tipo de cliente.

[Pasos para reproducir]:
1. Iniciar sesión en `https://vetify-qa.ikeapp.com` con una cuenta de OSDE Adquirente (ej. `adquirenteosde@gmail.com`).
2. Mirar la pantalla de Inicio.

[Resultado esperado]:
Aparece el banner de Cooper ("Beneficio exclusivo clientes Vetify", 20% off en el primer servicio, botón "Ir a Cooper").

[Resultado actual]:
Sigue apareciendo el banner viejo "Vetify PLUS".

[Detalle técnico]:
- Cuenta usada: `adquirenteosde@gmail.com`, producto confirmado `2364` ("Vetify Emergencias x1 OSDE").
- Reproducido 3/3 el 2026-08-28 con `GET /api/services/category/overview` devolviendo `200` (backend sano, confirmado por captura de red vía Playwright MCP) — descarta que sea el impedimento `IMP-014`/`IMAS-4464` (servicios intermitentes), que no reprodujo en ninguno de los 3 intentos.
- Comparación en el mismo día, mismo backend sano: OSDE Capitado (`user_1783951005615@automation.com`) y una segunda cuenta OSDE Capitado (`user_1785245387146_cbf32975@automation.com` — tageada `FLUX_CAPITADO` en el pool del framework, pero su producto real de catálogo es `2349` "Vetify Esencial OSDE", un producto OSDE Capitado normal, NO Flux; ver corrección en `qa-workspace/known-issues.md`) sí mostraron el banner Cooper correctamente. El sub-segmento genuino "OSDE Capitado – Flux" no tiene todavía ninguna cuenta real disponible para probarlo — este bug no depende de esa distinción, la conclusión sobre Adquirente se sostiene igual.
- El criterio de aceptación real de la HU (campo `customfield_11620` de Jira) especifica sin condición: "OSDE Adquirente ✅" debe ver el banner.

[Notas adicionales]:
- Este bug reemplaza la conclusión anterior (2026-08-27) de que el banner era simplemente "inconsistente" entre cargas sin causa identificable — ese veredicto se dio mientras `IMP-014` (servicios 500 intermitentes) estaba activo. Con el ambiente confirmado estable el 2026-08-28, el patrón cambió: ya no es inconsistente, es consistentemente incorrecto para este segmento específico.
- Hallazgo relacionado, no incluido en este bug (pendiente de decisión aparte): la misma cuenta también tiene "Planes y coberturas" mostrando "No hay planes por el momento" pese a un plan real y activo en la respuesta del backend — ver `docs/impedimentos-bloqueos.md` (sección IMP-014, retest 2026-08-28) y `docs/user-stories/IMAS-4356-banner-cooper-webapp-osde.tests.md` (TS-04).
- Ver `docs/user-stories/IMAS-4356-banner-cooper-webapp-osde.md` y su `.tests.md` (TS-04, CP06/CP07) para el detalle completo de la investigación.
