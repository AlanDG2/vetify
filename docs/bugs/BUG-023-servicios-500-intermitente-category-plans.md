Jira: creado 2026-08-28, tipo Error, linkeado con "Blocks" a IMAS-4356.

[Título]: BUG | Servicios `category/overview` y `plans/engage/{dni}` devuelven 500 de forma intermitente en QA
[Severidad]: Alto — impide validar de forma confiable cualquier feature que dependa de estos servicios (segmentación de banners promocionales, listado de planes vigentes); el usuario final puede ver estados vacíos/incorrectos (sin planes, sin beneficios) aunque su cuenta esté en orden.
[Categoría]: Backend / Infraestructura
[HU relacionada]: Encontrado investigando `IMAS-4356` (banner Cooper OSDE) — bloquea poder validar la segmentación de esa Tarea, pero es un problema transversal de infraestructura, no de esa feature puntual.

[Información del entorno]:
- Ambiente: QA — `https://vetify-qa.ikeapp.com`
- Cuenta usada: OSDE Adquirente real, producto confirmado `2364` ("Vetify Emergencias x1 OSDE")
- Fecha de detección: 2026-08-28

[Descripción]:
Capturando la red completa desde el login (no solo el resultado final en la UI), se confirmaron 3 endpoints devolviendo `500` (Internal Server Error genérico, sin detalle de negocio) de forma intermitente en el mismo ambiente y la misma sesión:

- `GET /api/services/category/overview` → `500`. En la misma carga de página, el banner de beneficios en Home mostró "Vetify PLUS" en vez de "Cooper" (comportamiento esperado para esta cuenta según la especificación de `IMAS-4356`).
- `GET /api/services/plans/engage/{dni}` → `500`. En la misma navegación a "Planes y coberturas", la pantalla mostró "No hay planes por el momento" — pese a que la cuenta tiene un plan real y vigente confirmado por otra vía (`Código Producto: 2364`). El endpoint hermano `GET /api/services/plans/suscripciones/engage/{dni}` sí respondió `200` en la misma carga — la falla es específica de `plans/engage`, no de todo lo relacionado a planes.
- `GET /api/services/notifications` → `500`, visto 2 veces seguidas en la misma sesión.

Mismo patrón/clasificación que un incidente ya resuelto en este proyecto (`IMAS-4347`, `pagar-mp` 500/502 intermitente en 2026-08-19/20): error de servidor no controlado, no una regla de negocio aplicada correctamente — la UI cae a un estado default/vacío cuando el servicio que debería informar el estado real falla.

[Pasos para reproducir]:
1. Ir a `https://vetify-qa.ikeapp.com`.
2. Iniciar sesión con una cuenta real con al menos un plan vigente.
3. Observar el banner de beneficios en Home y la sección "Planes y coberturas".
4. Si no reproduce en el primer intento, cerrar sesión y volver a entrar unas 3-4 veces con la misma cuenta — la falla es intermitente, no determinística.

[Resultado esperado]:
`category/overview` y `plans/engage/{dni}` responden `200` de forma consistente, reflejando el estado real de la cuenta (banner correcto según segmento, planes vigentes listados).

[Resultado actual]:
Ambos endpoints responden `500` de forma intermitente, causando que la UI muestre un estado default/vacío (Vetify PLUS en vez del banner correcto; "No hay planes por el momento" pese a tener un plan real vigente).

[Notas adicionales]:
- Documentado como impedimento en `docs/impedimentos-bloqueos.md` (`IMP-014`) con la evidencia de red completa (URLs, status codes, bodies de respuesta).
- Bloquea directamente la validación de `IMAS-4356` (banner Cooper) — no se puede confirmar si la segmentación de esa Tarea está bien implementada mientras este bug esté activo, porque el mismo síntoma (banner incorrecto) puede deberse a esto en vez de a la lógica de la Tarea.
- No confirmado si los 3 endpoints comparten una misma causa raíz de infraestructura, o son fallas independientes coincidiendo en la misma ventana de tiempo.
