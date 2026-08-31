# IMAS-4356 — OSDE: Incorporación de banner Cooper en WebApp (reemplazo vetify+)

**Tipo:** Tarea
**Estado (Jira, al 2026-08-26):** In Validation — **actualizado 2026-08-28: "Pending Validation", reasignado a Juan Cruz Triventi (dev)**
**Reporter:** Liliana Picinotti
**Assignee:** alan david gonzalez guzman (yo)
**Prioridad:** Highest
**Creado:** 2026-08-21 · **Actualizado:** 2026-08-26
**URL:** https://ikeasistencia-arg.atlassian.net/browse/IMAS-4356
**Sprint:** `2026-Q3-S5-Mascotas` — mencionada como sprint goal explícito: "4- Banner Cooper - Osde en prod (ASAP)"
**Issuelinks (Blocks/Relates/etc.):** 3 — `IMAS-4463` (Blocks, cargado 2026-08-27, ver CP03, menú sin Cooper), `IMAS-4464` (Blocks, cargado 2026-08-28, ver `IMP-014`, servicios 500 intermitentes — no reprodujo en el retest de la tarde) y `IMAS-4465` (Blocks, cargado 2026-08-28 tarde, ver TS-04, OSDE Adquirente no muestra Cooper — gap de segmento confirmado con backend sano). `checkClosable('IMAS-4356')` → no closable mientras sigan abiertos.

## ⚠️⚠️ CORRECCIÓN 2026-08-27/28 — la HU SÍ tenía descripción completa, estaba en un campo que no revisé

Todo lo de la sección original de abajo ("HU con muy poca información escrita") **da por sentado algo que resultó ser falso**: asumí que la descripción de Jira estaba vacía porque el campo estándar `description` lo estaba. **No revisé el campo custom `customfield_11620`**, donde esta Tarea (como `IMAS-4408`, ver su documento y la nota técnica ahí) sí tenía la especificación completa. Se descubrió el 2026-08-27/28 trabajando en `IMAS-4408` (mismo tipo de issue), no en esta HU directamente — quedó pendiente de re-abrir la investigación de esta HU con el spec real.

**Texto completo real de `customfield_11620`** (nunca leído durante toda la investigación de esta HU):

> Objetivo: Incorporar un banner promocional de Cooper dentro de la WebApp, dirigido exclusivamente a los clientes alcanzados por la acción, para comunicar el beneficio de **3 meses de descuento en Cooper** y redireccionarlos al sitio correspondiente al hacer clic. El beneficio es 20% de descuento en la primera compra en Cooper (paseadores, guardería, entrenadores). Vigencia: 24/8 al 24/11 inclusive (con posibilidad de renovación). Debe linkear a una URL específica donde está el cupón aplicado.
>
> **Alcance — el banner debe visualizarse ÚNICAMENTE para:**
> - **OSDE Capitado – OSDE** ✅
> - **OSDE Capitado – Flux** ✅ (sub-segmento nunca testeado en esta investigación)
> - **OSDE Adquirente** ✅
> - **Vetify B2C / Vetify común** ❌ No mostrar
>
> "La lógica deberá quedar preparada para que la segmentación pueda ampliarse... Debe ocupar el lugar que antes ocupaba vetify plus."
>
> Menciona un **Figma adjunto** y una URL de destino "Cooper - Your dog deserves the best" (coincide con `cooperpetcare.app`, ya confirmado).
>
> Criterios de aceptación incluyen explícitamente: "El banner se muestra a clientes OSDE Adquirente" (sin condición ni ambigüedad) y "QA validó la correcta implementación y segmentación del banner".

**Por qué esto cambia todo lo investigado hoy sobre CP06/CP07**: el spec real **confirma sin ambigüedad que OSDE Adquirente debe ver el banner siempre** — no hacía falta el confound de "segmento vs. completitud de perfil vs. plataforma" que se investigó durante horas. Con esto, el hallazgo de "el banner es inconsistente entre cargas para la misma cuenta" (cuenta `adquirenteosde@gmail.com`, mostró Cooper una vez y Vetify PLUS después) **deja de ser una zona gris — es directamente un incumplimiento confirmado del AC** ("el banner se muestra a clientes OSDE Adquirente"), no una duda abierta de a quién le corresponde verlo.

**2026-08-28, continuación con el spec real en mano:**
1. **Figma ubicado** — estaba oculto como hyperlink en el mismo campo `customfield_11620` (mismo patrón que el link de `IMAS-3610`): `https://www.figma.com/design/jXOyYOaYFsHfXjcGdiebGU/Vetify--Premium-?node-id=7560-67` — mismo archivo "Vetify Premium" que `IMAS-3610`, nodo `7560:67`. **Contenido del nodo sin revisar todavía** — la API de Figma está rate-limited (429) desde antes en esta sesión, no se insistió.
2. **Sub-segmento "OSDE Capitado – Flux" testeado** — única cuenta disponible en el pool (`user_1785245387146_cbf32975@automation.com`, `FLUX_CAPITADO`, perfil incompleto `NO_PET`/`PLAN_WITHOUT_PET` — no hay otra para aislar completitud de perfil). Resultado: **"Vetify PLUS" en banner y menú, sin Cooper** — mismo patrón que las demás cuentas OSDE probadas hoy.
3. Con esto, las **3 combinaciones que el spec dice que deberían mostrar Cooper** (Capitado-OSDE, Capitado-Flux, Adquirente) fueron probadas — **ninguna lo muestra de forma confiable ahora mismo** (Capitado-OSDE lo mostró en el primer test de ayer pero no se re-confirmó hoy; Adquirente lo mostró una vez y después no; Capitado-Flux no lo mostró ninguna vez que se probó). Con el spec ya sin ambigüedad, esto ya no es "esperar confirmación de negocio" — es un patrón consistente de que el banner no se muestra donde el spec dice que debería.

**🎯 2026-08-28, causa raíz encontrada — probablemente NO es un bug de esta Tarea**: a sugerencia del usuario ("hay varios servicios fallando, entre esos el que trae el plan"), se capturó la red completa desde el login (no solo el resultado final en la UI). Confirmado: `GET /api/services/category/overview` devolvió **500** en la misma carga donde el banner mostró "Vetify PLUS" en vez de Cooper; y `GET /api/services/plans/engage/{dni}` devolvió **500** en la misma navegación donde "Planes y coberturas" mostró "No hay planes por el momento" para una cuenta con plan real confirmado (`2364`). Documentado como **`IMP-014`** en `docs/impedimentos-bloqueos.md` (nuevo, con toda la evidencia de red).

**Conclusión revisada**: la "inconsistencia" del banner que se investigó ayer (segmento/perfil/plataforma, todos descartados) probablemente **no es un bug de la implementación de Cooper** — es un síntoma de `IMP-014` (servicios backend devolviendo 500 intermitente en QA). Cuando `category/overview` responde bien, el banner de Cooper se ve correctamente (confirmado, se vio andando más de una vez); cuando falla, cae a "Vetify PLUS" como default. **No se puede validar de forma confiable si la segmentación de Cooper está bien implementada mientras `IMP-014` siga activo** — cualquier intento de re-test seguirá dando resultados mezclados hasta que el ambiente esté estable.

**`IMP-014` reportado en Jira 2026-08-28**: creado [`IMAS-4464`](https://ikeasistencia-arg.atlassian.net/browse/IMAS-4464) (Error), linkeado con "Blocks" a esta Tarea — con el OK explícito del usuario. Ver `docs/bugs/BUG-023-servicios-500-intermitente-category-plans.md`. `checkClosable('IMAS-4356')` ahora reporta 2 bugs abiertos (`IMAS-4463` menú, `IMAS-4464` servicios 500).

**Decisión explícita del usuario (2026-08-28): esperar a que `IMAS-4464` (`IMP-014`) esté resuelto antes de retomar CP06/CP07** — "cuando el ambiente esté estable, probamos de nuevo". No reintentar la validación de segmentación de Cooper mientras ese bug siga abierto; cualquier resultado hasta entonces es ruido, ya demostrado hoy (misma cuenta, mismo plan, resultados distintos).

## 🔄 Retest 2026-08-28 (tarde) — ambiente estable, CP06/CP07 y CP03 re-ejecutados

El usuario confirmó que el ambiente estaba funcional y pidió retomar: validar lo que había quedado bloqueado por `IMP-014` y retestear los 2 bugs ya reportados. Detalle completo en `IMAS-4356-banner-cooper-webapp-osde.tests.md` (TS-04 y CP03bis actualizados) y en `docs/impedimentos-bloqueos.md` (IMP-014, sección "RETEST 2026-08-28").

**Resumen del retest** (5 logins frescos, 3 cuentas, `category/overview`/`plans/engage` siempre `200`):
- **`IMAS-4463` (menú sin Cooper) — sigue vigente.** Reproducido de nuevo en OSDE Capitado y OSDE Capitado-Flux, con backend sano. Ya no queda ninguna duda de que sea un síntoma de `IMP-014` — es un bug propio, confirmado con 2 datos independientes hoy además de los de días anteriores.
- **`IMAS-4464`/`IMP-014` (500 intermitente) — no reprodujo hoy.** Backend sano en las 5 pruebas.
- **OSDE Adquirente (`adquirenteosde@gmail.com`, producto 2364) — gap de segmento confirmado, ya NO es "inconsistencia".** 3/3 logins mostraron "Vetify PLUS", nunca Cooper — mientras que 2 cuentas OSDE Capitado (mismo día, mismo backend sano) sí mostraron Cooper. El spec (`customfield_11620`) exige que Adquirente lo vea ("OSDE Adquirente ✅", sin condición) — hoy no lo cumple, de forma reproducible y sin poder explicarlo por el ambiente.
- **Hallazgo nuevo, sin CP formal todavía**: "Planes y coberturas" de esa misma cuenta Adquirente sigue mostrando "No hay planes por el momento" pese a que `plans/engage/45285456` devuelve `200` con un plan real (`estado: "ACTIVO"`, producto 2364). No es un 500 — es la UI no renderizando un plan real que el backend sí entrega. Candidato de causa: varios campos vienen `null` (`priceAmount`, `priceLabel`, `billingPeriodLabel`, etc.), posiblemente porque OSDE maneja el precio distinto (incorporado al ID de producto, no como descuento aparte).
- **⚠️ CORRECCIÓN 2026-08-28 (más tarde el mismo día) — la 2da cuenta usada como comparación NO era Flux**: el usuario del proyecto revisó el catálogo real y encontró que `user_1785245387146_cbf32975@automation.com` (tageada `FLUX_CAPITADO` en el pool) tiene producto **`2349` = "Vetify Esencial OSDE"**, Grupo `0163` — un producto OSDE Capitado normal, no Flux. Es la ÚNICA cuenta Flux que existe en todo el pool, así que **el sub-segmento genuino "OSDE Capitado – Flux" nunca fue probado de verdad** en toda esta investigación (ni hoy, ni en las rondas anteriores) — cada vez que se creyó testear Flux, en realidad se testeaba otra cuenta OSDE Capitado disfrazada. No cambia la conclusión sobre Adquirente (sigue siendo el único gap confirmado, ahora comparado contra 2 cuentas OSDE Capitado en vez de contra "Capitado + Flux"), pero sí dejó un hueco real: falta conseguir/generar una cuenta con un producto Flux genuino para cerrar ese sub-segmento. Ver `qa-workspace/known-issues.md` para el detalle completo del hallazgo, y `IMAS-4356-banner-cooper-webapp-osde.tests.md` (TS-06bis, CP11 nuevo) para el caso bloqueado.

**Pendiente, ahora con el retest hecho**:
1. Revisar el nodo de Figma (`7560:67`) cuando la API deje de estar rate-limited, para comparar diseño vs. implementación real — sigue sin depender de nada de esto.
2. Re-leer los comentarios/transcripción originales con el spec real como contexto — sigue sin resolver si "ocupar el lugar de Vetify PLUS" aplica solo al banner o también al menú (`IMAS-4463`).
3. **Decidido y ejecutado (2026-08-28, misma tarde)**: creado `IMAS-4465` (Defect, Blocks → `IMAS-4356`) para el gap de segmento de Adquirente, con preview + OK explícito del usuario. Ver `docs/bugs/BUG-024-osde-adquirente-banner-vetify-plus-en-vez-cooper.md`.
4. **Todavía sin decidir** (el usuario solo pidió el punto 3 arriba, el resto queda abierto):
   - Si corresponde crear un Defect nuevo para "Planes y coberturas" no renderizando un plan real.
   - Si corresponde comentar `IMAS-4463`/`IMAS-4464` en Jira con la evidencia de hoy (menú sigue roto con backend sano; servicios ya no fallan pero el ticket sigue "Tareas Por Hacer"/"Backlog").
   - Si se postean por fin las reescrituras en criollo de `IMAS-4463`/`IMAS-4464` (redactadas 2026-08-28, nunca confirmadas).

---

## Sección original (antes de la corrección) — HU con "muy poca información escrita"

⚠️ Lo siguiente da por sentado que la descripción estaba vacía — **eso era incorrecto**, ver corrección arriba. Se deja sin borrar por trazabilidad.

La descripción de Jira está **vacía**. Las 4 subtareas (`IMAS-4357` Desarrollo, `IMAS-4358` Pruebas QA, `IMAS-4359` Pruebas Negocio QA, `IMAS-4360` Deploy prod) también tienen descripción vacía y 0 comentarios cada una. Solo hay **1 comentario** en el ticket padre. Todo el contexto real de esta HU se reconstruyó desde 3 fuentes indirectas:
1. El único comentario de Liliana.
2. La transcripción de la review de sprint del 21/8 (mismo día que se creó el ticket).
3. Un spec de automatización mobile ya existente (`mobile/specs/vetify/vetify-plus.spec.ts`) que documenta el comportamiento actual de "Vetify PLUS".

Por la regla de `qa-hu-intake` ("si la HU está incompleta → generar advertencias y reducir alcance, no inventar"), los casos de prueba de esta HU están marcados según de dónde sale cada uno — ninguno se infirió sin una fuente concreta.

## Subtareas (4)

| Key | Título | Estado |
|---|---|---|
| IMAS-4357 | Desarrollo | Hecho |
| IMAS-4358 | Pruebas QA | En Progreso |
| IMAS-4359 | Pruebas Negocio QA | Cancelado |
| IMAS-4360 | Deploy prod | Tareas Por Hacer |

## El único comentario (Liliana Picinotti, 2026-08-26)

> "Por favor realizar las pruebas con usuarios de osde capitados y adquirentes. En los usuarios b2c Vetify no tiene que verse nada de cooper (por ahora ya que lo estamos construyendo en otra card)."

## Contexto de la transcripción (review de sprint, 2026-08-21, ~min 43)

Transcripción automática con errores de dictado ("Bettify"/"Betify Plus" = "Vetify"/"Vetify Plus" mal transcrito). Reconstruido:

> "...primero en trabajar en el banner para Cooper, para aquellos clientes que se suman [que] ya son clientes de Vetify... hablamos con Mariana de que primero arranque para [OSDE], de que ya ellos [OSDE] no tienen nada de Vetify Plus, porque para los clientes de Vetify, en preguntas frecuentes hay algo de Vetify Plus, hay que ver cómo lo sacamos para que quede todo prolijo — pero eso es lo primero que se va a estar tomando, que es Banner Cooper, para cumplir con el acuerdo que hay con el prestador."

**Interpretación**: "Cooper" es un **prestador** (proveedor de servicios — por el contenido real del banner, paseos/guardería/entrenamiento canino, no es una clínica veterinaria) con el que hay un acuerdo comercial. El objetivo es reemplazar las referencias a "Vetify PLUS" (un beneficio externo genérico, link a `vetifyplus.com`) por este banner de Cooper, específicamente para clientes OSDE — porque OSDE nunca tuvo acceso real a Vetify Plus. Vetify B2C debe seguir como está (con Vetify Plus, sin Cooper), ya que Cooper para B2C es una iniciativa aparte, todavía sin construir.

## Qué es "Vetify PLUS" (fuente: código real, `mobile/specs/vetify/vetify-plus.spec.ts`)

Es una entrada del menú lateral (y, confirmado en vivo, también un banner en Home) que al tocarla abre `https://vetifyplus.com/` en el navegador externo del sistema — un portal externo de descuentos/beneficios en marcas, no una pantalla propia de la app/WebApp.

## Verificación en vivo — 2026-08-26/27

Probado contra `https://vetify-qa.ikeapp.com` con 3 tipos de usuario reales del pool (`src/fixtures/users/pooled-users.json`):

| Usuario | Perfil | Banner Home | Menú lateral ("Cuenta") |
|---|---|---|---|
| OSDE Capitado (`user_1783951005615@automation.com`) | `WITH_PET`, plan y credencial completos | ✅ Muestra banner "Cooper" (20% off primer servicio, paseos/guarderías/entrenamiento, botón "Ir a Cooper") | "Vetify PLUS" **desapareció** — no fue reemplazado por una entrada de Cooper, directamente ya no está |
| OSDE Adquirente (`user_1782769599580@automation.com`) | `NO_PET`, `PLAN_WITHOUT_PET` | ❌ Sigue "Vetify PLUS", sin Cooper | Sigue "Vetify PLUS" |
| Vetify B2C Adquirente (`user_1786584481760_8aea8baa@automation.com`) | plan completo | ✅ Sigue "Vetify PLUS", **sin ningún rastro de Cooper** — cumple el pedido explícito de Liliana | Sigue "Vetify PLUS" intacto |

**⚠️ 2026-08-27 — investigación extensa, terminó en un hallazgo de INCONSISTENCIA, no en una conclusión de segmento. Historial completo dejado a propósito (no se borra), para que quien retome esto vea exactamente qué se probó y por qué se descartó cada teoría intermedia:**

1. **Primer intento**: 2 usuarios del pool (Capitado/Adquirente) diferían en 2 variables a la vez (segmento + completitud de perfil) — confound sin resolver. Se intentó generar una cuenta Adquirente fresh vía compra real para aislarlo — bloqueado por `BUG-021`.
2. **Segundo intento**: se probaron 2 cuentas históricas de `documentation/Pruebas OSDE.xlsx` (`mariano.caresia@hotmail.com`, `68.sandra@gmail.com`) — ambas mostraban Vetify PLUS, ninguna Cooper. **Descartado**: al cruzar sus "Código Producto" (2313, 2318) contra el catálogo real de productos (que el usuario compartió: `clCuenta/Nombre/dsCuenta/clGrupoCuenta`), **ninguna de las 2 tenía un producto OSDE real** (los productos OSDE del catálogo son 2349, y 2358-2365 — estas 2 cuentas tenían productos genéricos Vetify sin sufijo OSDE). No eran cuentas OSDE genuinas pese a la nota del Excel — la etiqueta del Excel no bastaba como evidencia, había que cruzar el código de producto contra el catálogo real.
3. **Tercer intento, cuenta genuina encontrada**: `adquirenteosde@gmail.com` (hoja "Adquirentes 30.06" del mismo Excel) — su producto real confirmado es **2364 = "Vetify Emergencias x1 OSDE"** (coincide exacto con el catálogo). La primera vez que se probó, mostró Cooper correctamente en el banner (y el mismo gap de menú que Capitado, ver `IMAS-4463`).
4. **Retest inmediato de esa misma cuenta, mismo plan, mismo ancho de pantalla** (para descartar que fuera una diferencia de viewport mobile/desktop, hipótesis que se planteó y se alcanzó a probar parcialmente): **mostró Vetify PLUS**, no Cooper. Misma cuenta, mismo producto (2364, verificado de nuevo), mismo ancho — resultado distinto.

**Conclusión final de esta ronda**: el banner Cooper/Vetify PLUS es **inconsistente entre cargas de página para la misma cuenta con el mismo plan** — no se pudo aislar una regla determinística (ni por segmento, ni por completitud de perfil, ni por ancho de pantalla) desde afuera, probando solo por UI. Esto necesita a alguien con acceso al código/config (¿feature flag?, ¿experimento A/B?, ¿caché inconsistente entre réplicas del backend?) — no es algo que QA pueda seguir acotando a ciegas. **Lo único confirmado sin ninguna excepción en todas las repeticiones**: Vetify B2C nunca muestra Cooper (consistente siempre), y cuando Cooper sí aparece en el banner, el menú lateral nunca lo acompaña (`IMAS-4463`, reproducido igual en las 2 veces que se vio el banner).

**Nota técnica reusable de este intento**: el catálogo de productos real (`clCuenta`/`Nombre`/`clGrupoCuenta`) es la única fuente confiable para saber si una cuenta es "OSDE" — ni el `siteId` del pool de datos del proyecto, ni una nota de un Excel histórico, alcanzan por sí solos. El "Grupo" (`clGrupoCuenta`) tampoco sirve como señal — un mismo grupo (158) contiene productos OSDE y no-OSDE mezclados; solo el nombre completo del producto (columna `Nombre`) dice la verdad.

**FAQ pública de OSDE** (`qa.vetify.com.ar/osde`): verificado que no hay ninguna mención a "Vetify Plus" en toda la página (texto completo, incluido contenido colapsado) — el cleanup que Liliana mencionaba en la transcripción del 21/8 parece que ya se hizo.

**"Ir a Cooper" (destino del botón)**: verificado 2026-08-27 — abre pestaña nueva a `https://www.cooperpetcare.app/?referral_code=VTFY-2026` (landing real y funcional de Cooper, paseadores de perros). Mismo patrón que "Vetify PLUS" (link externo), solo que a `cooperpetcare.app` en vez de `vetifyplus.com`.

**FAQ de B2C y OSDE Adquirente**: verificado 2026-08-27 — se expandieron las 9 preguntas de la landing B2C institucional (`qa.vetify.com.ar`) y las 33 preguntas (8 categorías) de la landing OSDE Adquirente (`/mas-osde-beneficios`). Cero menciones a "Vetify Plus" en ninguna de las 2 — mismo resultado que ya se tenía para OSDE Capitado (`/osde`). El cleanup queda confirmado en las 3 landings públicas.

## ⏸️ HU pausada 2026-08-27 — pendiente para retomar

**🚨 Antes de retomar, leer la sección "CORRECCIÓN 2026-08-27/28" al principio de este documento** — apareció el spec real completo (estaba en `customfield_11620`, nunca leído durante esta investigación) y cambia la interpretación de todo lo encontrado sobre CP06/CP07.

**Motivo de la pausa**: la investigación del banner Cooper/Vetify PLUS llegó a un hallazgo de inconsistencia (ver sección de arriba) que QA no puede seguir acotando desde la UI — necesita a alguien con acceso al código antes de que tenga sentido seguir probando. El usuario decidió pausar acá el 2026-08-27.

**Instrucción explícita del usuario para retomar**: "mañana validamos de nuevo cada CP" — al retomar, re-ejecutar los 10 casos de `.tests.md` desde cero, sin asumir que el estado de hoy sigue vigente. Dado lo inconsistente que resultó el banner (misma cuenta, mismo plan, mismo ancho, resultados distintos en el mismo día), no dar nada por sentado de una sesión a la otra — ni siquiera los casos que hoy quedaron ✅.

**Resuelto en esta ronda (no reabrir sin nueva información)**:
1. ~~Destino del botón "Ir a Cooper"~~ — `cooperpetcare.app/?referral_code=VTFY-2026`.
2. ~~Reemplazo de menú lateral (comportamiento esperado)~~ — la PO confirmó que debe decir "Cooper". Reportado como [`IMAS-4463`](https://ikeasistencia-arg.atlassian.net/browse/IMAS-4463) (Blocks), ver `docs/bugs/BUG-022-osde-capitado-menu-lateral-sin-cooper.md`. Reproducido igual en Capitado y en Adquirente (cuenta `adquirenteosde@gmail.com`, producto 2364) — el bug aplica a ambos segmentos, no falta ampliar el alcance en Jira si se retoma (agregar el dato de Adquirente al ticket queda pendiente, no se llegó a postear).
3. ~~FAQ de B2C y OSDE Adquirente (no solo Capitado)~~ — 0 menciones a "Vetify Plus" en las 3 landings públicas.

**Genuinamente abierto, necesita a alguien con acceso al código, no más testing de QA**:
4. **Qué determina si el banner muestra Cooper o Vetify PLUS** — no es segmento, no es completitud de perfil, no es viewport (los 3 se probaron y se descartaron). Parece inconsistente entre cargas de la misma cuenta con el mismo plan. Preguntarle directo a Juan Cruz Triventi (o quien programó el banner) si hay un feature flag, un experimento A/B, o algo cacheado de forma inconsistente.

**Sin tocar, no evaluado en esta ronda**:
5. Decidir si corresponde reportar el bug de compra de OSDE Adquirente (`BUG-021`) — pendiente de que el usuario confirme si ya lo había reportado antes.
6. Alcance mobile/app nativa: esta HU dice "WebApp" — no se investigó si la app nativa (que sí tiene su propio `vetify-plus.spec.ts`) está dentro de alcance o es una card aparte.

## ✅ CIERRE — 2026-08-31

**HU cerrada, pasada a Pending Validation por Alan.** El punto 4 (qué determina Cooper vs. Vetify PLUS) quedó resuelto: no era un feature flag ni un experimento A/B — el causante real es el campo `policyId` de `/api/users/me` (el producto/plan real de la cuenta), no el segmento comercial ni ningún estado inconsistente. Una cuenta con un producto OSDE real siempre muestra el comportamiento OSDE; una cuenta sin uno, no — sin importar si el pool la tiene tageada Capitado o Adquirente. La "inconsistencia entre cargas" de los días 26-27/08 se explica en retrospectiva por estar comparando, sin saberlo, cuentas/productos distintos en cada intento (y, por un tramo, por el bug de backend IMP-014 ya resuelto).

**Los 3 bugs vinculados**: `IMAS-4463` (menú) Hecho, `IMAS-4464` (servicios 500) Cancelado, `IMAS-4465` (banner Adquirente) retesteado y confirmado arreglado.

**Automatizado**: `tests/projects/vetify-webapp/navigation.spec.ts` TS-04 (menú, 3 casos) + TS-05 (banner, 3 casos), verificado pasando en Desktop y Mobile (Android).

Casos de prueba posteados en `IMAS-4358`, comentario de cierre en `IMAS-4356`. Detalle completo de la causa raíz del policyId y de la trampa de cache entre cuentas: `qa-workspace/decision-log.md` 2026-08-31.
