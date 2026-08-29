# Diseño de casos — IMAS-4356 Banner Cooper en WebApp (OSDE)

> Diseño basado en riesgo (`qa-risk-test-design`). **HU con descripción vacía y sin criterios de aceptación formales** — cada caso está marcado con la fuente real de donde sale (el único comentario de Jira, la transcripción de la review del 21/8, o el código existente de `vetify-plus.spec.ts`), no hay nada inventado sin fuente. Ver `IMAS-4356-banner-cooper-webapp-osde.md` para el detalle completo de cada fuente.
>
> **Estado por caso**: ✅ verificado en vivo (2026-08-26/27) / ❌ **no cumple lo esperado** / 🔴 **BLOQUEADO** / ⏳ sin verificar todavía / `[SIN FUENTE]` — sería necesario inventar el criterio, no se diseña caso hasta confirmar con el equipo.

## TS-01 Banner Cooper en Home — OSDE Capitado (perfil completo)
**Riesgo: MEDIO** (impacto medio — es el entregable principal de la HU; probabilidad baja, ya se ve andando).

**CP01 - Verificar que el banner de Home muestra Cooper para OSDE Capitado con perfil completo** ✅
- Dado: usuario OSDE Capitado real, con mascota/credencial ya completa (`WITH_PET`, `NO_EMPTY_PLAN`)
- Cuando: inicia sesión en `vetify-qa.ikeapp.com` y ve la pantalla de Home
- Entonces: aparece un banner con logo "Cooper", texto "Beneficio exclusivo clientes Vetify", oferta "20% off en el primer servicio", categorías "Paseos, guarderías y entrenamiento", y botón "Ir a Cooper"
- Trazabilidad: fuente = comentario de Liliana (2026-08-26) + transcripción review 21/8

**CP02 - Verificar destino del botón "Ir a Cooper"** ✅ (verificado 2026-08-27)
- Dado: usuario OSDE Capitado con perfil completo, banner Cooper visible en Home
- Cuando: hace click en "Ir a Cooper"
- Entonces: abre una pestaña nueva con `https://www.cooperpetcare.app/?referral_code=VTFY-2026` — landing real y funcional de Cooper (paseadores de perros), con el código de referido de Vetify en la URL. Mismo patrón que "Vetify PLUS" (link externo, `vetifyplus.com`), solo que a un dominio distinto
- Trazabilidad: fuente = inferido por analogía con el comportamiento de "Vetify PLUS" (`vetify-plus.spec.ts`), confirmado en vivo

## TS-02 Menú lateral — reemplazo de "Vetify PLUS"
**Riesgo: BAJO-MEDIO** (sin fuente escrita de cuál es el comportamiento esperado exacto).

**CP03 - Verificar que el menú lateral de OSDE Capitado ya no muestra "Vetify PLUS"** 🔴 **BLOQUEADO — `IMAS-4463`**
- Dado: mismo usuario OSDE Capitado de CP01
- Cuando: abre el menú lateral ("Más" → sección "Cuenta")
- Entonces (esperado, confirmado por la PO 2026-08-27): la sección "Cuenta" muestra una entrada "Cooper"
- Entonces (real): la entrada "Vetify PLUS" ya no está, pero tampoco apareció una entrada de "Cooper" en su lugar — la sección "Cuenta" quedó con 3 ítems en vez de 4
- Trazabilidad: fuente = transcripción 21/8 ("hay que ver cómo lo sacamos") + confirmación explícita de la PO (2026-08-27): *"En osde en el menu hamburguesa tiene q decir cooper"*
- **Reportado en Jira 2026-08-27**: [IMAS-4463](https://ikeasistencia-arg.atlassian.net/browse/IMAS-4463), linkeado con "Blocks" a `IMAS-4356`. Ver `docs/bugs/BUG-022-osde-capitado-menu-lateral-sin-cooper.md`.

## TS-03 Exclusión de Cooper en Vetify B2C — riesgo ALTO
**Riesgo: ALTO** (es el requisito negativo más explícito de toda la HU — "en los usuarios B2C Vetify no tiene que verse nada de cooper").

**CP04 - Verificar que un usuario B2C Vetify NO ve banner de Cooper en Home** ✅
- Dado: usuario Vetify B2C (Adquirente) real, con plan completo
- Cuando: inicia sesión y ve Home
- Entonces: sigue mostrando el banner "Vetify PLUS" de siempre — cero rastro de "Cooper"
- Trazabilidad: fuente = comentario de Liliana (2026-08-26), literal

**CP05 - Verificar que un usuario B2C Vetify NO ve Cooper en el menú lateral** ✅
- Dado: mismo usuario de CP04
- Cuando: abre el menú lateral
- Entonces: "Vetify PLUS" sigue presente e intacto, sin ninguna entrada de Cooper
- Trazabilidad: fuente = comentario de Liliana (2026-08-26), literal

## TS-04 OSDE Adquirente — retest 2026-08-28 con ambiente estable: gap de segmento confirmado
**Riesgo: ALTO** (impacto alto — viola un AC explícito y sin ambigüedad de la HU).

> ⚠️ **Este veredicto reemplaza el de 2026-08-27** (que hablaba de "inconsistencia, no es bug de segmento"). Ese veredicto se dio mientras `IMP-014`/`IMAS-4464` (servicios backend intermitentes) estaba activo — con el ambiente ya estable (confirmado hoy, ver abajo), el patrón cambió por completo. Se deja el historial de 2026-08-27 abajo por trazabilidad, pero **no es el estado vigente**.

**CP06 - Verificar que un usuario OSDE Adquirente ve el banner de Cooper** ❌ **NO CUMPLE — gap de segmento confirmado, reproducido 3/3**
- Dado: `adquirenteosde@gmail.com` (producto real confirmado **2364 = "Vetify Emergencias x1 OSDE"**), con `category/overview` devolviendo `200` limpio las 3 veces (confirmado por captura de red, no solo por la UI)
- Cuando: se inició sesión 3 veces (logins frescos, no solo recargas), en la misma sesión de testing de hoy
- Entonces: **las 3 veces mostró "Vetify PLUS"**, nunca Cooper — con el backend sano las 3 veces. Comparar contra 2 cuentas OSDE Capitado distintas (mismo día, mismo backend sano, ver CP07-bis abajo — **⚠️ corrección**: la segunda de esas 2 cuentas se creía Flux y en realidad es OSDE Capitado normal, ver nota de corrección): ambas mostraron Cooper correctamente — la diferencia de resultado con Adquirente ya no se explica por el estado del ambiente, ambos lados de la comparación tuvieron backend sano.
- **Veredicto**: el AC "El banner se muestra a clientes OSDE Adquirente" (spec real, `customfield_11620`) **no se cumple hoy**, de forma reproducible y ya no explicable por `IMP-014`.
- **Reportado en Jira 2026-08-28**: [IMAS-4465](https://ikeasistencia-arg.atlassian.net/browse/IMAS-4465), linkeado con "Blocks" a `IMAS-4356`. Ver `docs/bugs/BUG-024-osde-adquirente-banner-vetify-plus-en-vez-cooper.md`.
- Trazabilidad: fuente = spec real de `customfield_11620` (sin ambigüedad) + retest 2026-08-28.

**Hallazgo adicional, mismo retest — "Planes y coberturas" sigue vacío pese a un 200 con datos reales**: `GET /api/services/plans/engage/45285456` devolvió `200` las 2 veces que se probó, con un `elements[]` de 1 ítem — plan real, `estado: "ACTIVO"`, `desCuenta: "Vetify Emergencias x1 OSDE"`, mismo producto 2364. La pantalla "Planes y coberturas" igual mostró "No hay planes por el momento" las 2 veces. **Esto es un bug distinto de `IMP-014`** — el endpoint no falló, devolvió un plan real, y la UI no lo renderizó. Candidato de causa (no confirmado): varios campos del plan vienen `null` (`priceAmount`, `priceLabel`, `billingPeriodLabel`, `description`, `coverageTarget`, `nextBillingDate`, `nextBillingAmount`, `linea`) — si el frontend filtra/exige alguno de estos para mostrar la tarjeta del plan, un producto OSDE (que no maneja precio/facturación de la misma forma que un plan Vetify común) podría quedar afuera del render sin que sea un error de backend. No reportado todavía — pendiente de decisión del usuario.

**CP07-bis - Retest de OSDE Capitado con ambiente estable** ✅ **muestra Cooper correctamente (2 cuentas)**
- OSDE Capitado (`user_1783951005615@automation.com`): `category/overview` 200 (3 veces) → banner Cooper correcto las 3 veces.
- ~~OSDE Capitado – Flux~~ (`user_1785245387146_cbf32975@automation.com`): `category/overview` 200 (4 veces) → banner Cooper correcto siempre que se verificó hoy.
- **⚠️ CORRECCIÓN 2026-08-28 (más tarde el mismo día) — esta 2da cuenta NO es Flux**: el usuario del proyecto revisó el catálogo real y encontró que `user_1785245387146_cbf32975@automation.com` tiene producto **`2349` = "Vetify Esencial OSDE"** (Grupo `0163`) — un producto OSDE Capitado normal, no un producto Flux. El pool la tiene mal tageada (`siteId: FLUX_CAPITADO`), pero backend-side es la misma familia que la primera cuenta. Ver `qa-workspace/known-issues.md` para el detalle completo del hallazgo.
- **Conclusión corregida**: de los 3 segmentos que el spec dice que deben ver Cooper, se confirmó **1 (OSDE Capitado, con 2 cuentas distintas que resultaron ser el mismo segmento)** — **Adquirente sigue siendo el único confirmado que NO lo cumple**, de forma reproducible. **El sub-segmento genuino "OSDE Capitado – Flux" sigue sin testearse** — no hay ninguna cuenta real de Flux disponible hoy (ver TS-06bis abajo).

## TS-06bis OSDE Capitado – Flux (sub-segmento genuino) — sin cuenta disponible
**Riesgo: sin clasificar — nunca se pudo testear con una cuenta real.**

**CP11 - Verificar que el sub-segmento genuino "OSDE Capitado – Flux" muestra Cooper** 🔴 **BLOQUEADO — sin cuenta real disponible**
- La única cuenta del pool tageada `FLUX_CAPITADO` resultó ser, en el catálogo real, un producto OSDE Capitado normal (`2349`, ver corrección arriba) — no existe hoy ninguna cuenta con un producto Flux genuino confirmado para probar este sub-segmento.
- Trazabilidad: spec real (`customfield_11620`) exige explícitamente "OSDE Capitado – Flux ✅" — sigue siendo parte del alcance, solo que no se puede verificar sin una cuenta real.
- **Para destrabar**: conseguir o generar una cuenta con un producto Flux real confirmado (ver catálogo de productos, prefijo/familia Flux) antes de dar este sub-segmento por probado.

**CP03bis - Retest del menú lateral (`IMAS-4463`) con ambiente estable** ❌ **sigue sin cumplir, reproducido en 2 cuentas OSDE Capitado**
- OSDE Capitado (`user_1783951005615@automation.com`): menú "Cuenta" con 3 ítems (Perfil, Mascotas, Planes y coberturas) — sin Cooper, banner sí lo muestra.
- OSDE Capitado (`user_1785245387146_cbf32975@automation.com`, producto `2349` — ver corrección arriba, NO es Flux): mismo resultado, 3 ítems, sin Cooper.
- **`IMAS-4463` sigue vigente, confirmado con ambiente sano** — termina de descartar cualquier duda de que fuera un síntoma de `IMP-014` (ver [[feedback-isolate-shared-root-cause-compare-states]]).

---
### Historial 2026-08-27 (ambiente con IMP-014 activo — ya no es el estado vigente, se deja por trazabilidad)

**CP06 (veredicto anterior)** 🟡 INCONSISTENTE — no determinístico, no es bug de segmento
- Dado: se probaron 3 cuentas Adquirente en total a lo largo de la investigación — 2 resultaron NO ser cuentas OSDE reales al cruzar su Código Producto contra el catálogo (`mariano.caresia@hotmail.com` = producto 2313, `68.sandra@gmail.com` = producto 2318, ninguno de los dos es un producto OSDE) — descartadas. La tercera, `adquirenteosde@gmail.com`, sí tiene un producto OSDE real confirmado: **2364 = "Vetify Emergencias x1 OSDE"**.
- Cuando: se inició sesión con `adquirenteosde@gmail.com` dos veces en el mismo día, mismo ancho de pantalla, mismo plan confirmado (2364 las dos veces)
- Entonces: **la primera vez mostró Cooper correctamente; la segunda vez, con todo lo demás igual, mostró Vetify PLUS**. No hay variable controlada que explique la diferencia.
- Trazabilidad: fuente = comentario de Liliana (probar con "adquirentes") — el hallazgo real terminó siendo distinto a lo que el comentario hacía sospechar en su momento.

**CP07 (veredicto anterior)** ✅ las 3 hipótesis descartadas — el criterio real (en ese momento) parecía ser otro (inconsistencia)
- Se probó cada hipótesis por separado y se descartaron las 3 con evidencia directa:
  - **Segmento**: descartado en ese momento — la cuenta Adquirente real (`adquirenteosde@gmail.com`, producto 2364) mostró Cooper correctamente al menos una vez.
  - **Completitud de perfil**: descartado — 2 cuentas con perfil incompleto en grados distintos dieron el mismo resultado; y la cuenta que sí mostró Cooper también tenía perfil incompleto.
  - **Plataforma (viewport mobile vs desktop)**: descartado — la misma cuenta al mismo ancho de pantalla (428px) dio resultados distintos en 2 intentos.
- Trazabilidad: `BUG-021` bloqueó la vía de generar una cuenta fresh (no se necesitó al final, se encontró una cuenta real ya existente); catálogo de productos real (compartido por el usuario) fue la fuente decisiva para descartar 2 de las 3 cuentas probadas.

## TS-05 Contenido institucional — limpieza de FAQ
**Riesgo: BAJO** (mencionado en la transcripción como pendiente, pero de bajo impacto si quedó sin hacer).

**CP08 - Verificar que la landing pública de OSDE Capitado no menciona "Vetify Plus" en el FAQ** ✅
- Dado: visitante en `https://qa.vetify.com.ar/osde`
- Cuando: se revisa todo el texto de la página (incluido contenido colapsado)
- Entonces: no aparece ninguna mención a "Vetify Plus" / "plus" — el cleanup mencionado en la transcripción del 21/8 parece ya hecho
- Trazabilidad: fuente = transcripción 21/8 ("en preguntas frecuentes hay algo de Vetify Plus, hay que ver cómo lo sacamos")

**CP09 - Verificar lo mismo en la landing de Vetify B2C y OSDE Adquirente (`/mas-osde-beneficios`)** ✅ (verificado 2026-08-27)
- Dado: visitante en `qa.vetify.com.ar` (B2C institucional, 9 FAQ) y en `qa.vetify.com.ar/mas-osde-beneficios` (OSDE Adquirente, 33 FAQ en 8 categorías)
- Cuando: se expanden todas las preguntas de ambas páginas (33 + 9 = 42 ítems) y se revisa el texto completo (`innerText`/`textContent`, no solo lo visible por default)
- Entonces: cero menciones a "Plus"/"Vetify Plus" en ninguna de las 2 — mismo resultado que ya se había confirmado en `/osde` (OSDE Capitado)
- Trazabilidad: mismo origen que CP08 — confirma que el cleanup de "Vetify Plus" está hecho en las 3 landings públicas (Capitado, B2C, Adquirente)

## TS-06 Alcance mobile / app nativa
**Riesgo: sin clasificar — falta confirmar si está en alcance.**

**CP10 - Verificar si la app nativa (mobile) también reemplaza "Vetify PLUS" por Cooper** `[SIN FUENTE]`
- El título de la HU dice literalmente "en WebApp" — no hay ninguna fuente que confirme si la app nativa (que tiene su propio `mobile/specs/vetify/vetify-plus.spec.ts`) está en este mismo alcance o es una card distinta
- Trazabilidad: sin fuente — no se diseña el caso hasta confirmar con el equipo si aplica

---

## Resumen de cobertura

> **Actualizado 2026-08-28 (tarde)** — retest completo con ambiente estable (`IMP-014`/`IMAS-4464` no reprodujo hoy, ver detalle en TS-04) + **corrección importante same-day**: la cuenta que se creía "OSDE Capitado – Flux" resultó tener un producto OSDE normal (`2349`) según el catálogo real — nunca se probó genuinamente el sub-segmento Flux. Reemplaza el resumen de 2026-08-27 para CP03/CP06/CP07 y corrige el resumen de más temprano hoy.

| Área | Casos | Estado |
|---|---|---|
| Banner Cooper Home (Capitado) | CP01, CP02 | ✅ Ambos verificados y en verde |
| Menú lateral | CP03 | ❌ **`IMAS-4463` sigue vigente** — re-confirmado hoy con backend sano en 2 cuentas OSDE Capitado, ya no explicable por `IMP-014` |
| Exclusión B2C (el requisito más crítico) | CP04, CP05 | ✅ Verificados 2026-08-27 (no re-testeado hoy, no era parte del alcance de este retest) |
| OSDE Adquirente | CP06, CP07 | ❌ **Gap de segmento confirmado, 3/3 con backend sano** — Adquirente no muestra Cooper hoy, mientras OSDE Capitado sí (2 cuentas, mismo backend). Ya no es "inconsistencia sin explicación" — es un incumplimiento reproducible del AC. **Reportado como `IMAS-4465`.** |
| Planes y coberturas (Adquirente) | — (hallazgo nuevo, sin CP propio) | ❌ 200 con plan real (`ACTIVO`, producto 2364) mostrado como "No hay planes por el momento" — bug de render, no de `IMP-014` |
| FAQ / contenido | CP08, CP09 | ✅ Verificados 2026-08-27 (no re-testeado hoy) |
| Alcance mobile | CP10 | ⚪ Sin fuente para diseñar el caso |
| **OSDE Capitado – Flux (genuino)** | **CP11 (nuevo)** | 🔴 **BLOQUEADO — nunca se probó de verdad**, la única cuenta "Flux" del pool tiene producto OSDE (`2349`), no Flux. Ver `qa-workspace/known-issues.md`. |

**11 casos identificados + 1 hallazgo nuevo sin CP formal.** Retest de hoy (2026-08-28), con el ambiente confirmado estable, cambia el veredicto de 3 casos: `CP03`/`IMAS-4463` pasa de "podría ser síntoma de IMP-014" a **confirmado independiente, sigue abierto**; `CP06`/`CP07` pasan de "inconsistencia sin causa identificable" a **gap de segmento real y reproducible en OSDE Adquirente**. **Corrección importante**: lo que se documentó primero como "2 segmentos confirmados (Capitado-OSDE, Capitado-Flux)" en realidad es **1 solo segmento confirmado (OSDE Capitado), probado con 2 cuentas** — la segunda cuenta nunca fue Flux. El sub-segmento Flux genuino (`CP11`) sigue sin ninguna verificación real.

**Ejecutado 2026-08-28 (misma tarde)**: creado `IMAS-4465` (Blocks → `IMAS-4356`) para el gap de segmento de Adquirente, con preview + OK explícito del usuario.

**Sigue pendiente de decisión del usuario, no ejecutado todavía**:
1. Si corresponde comentar/actualizar `IMAS-4463` e `IMAS-4464` en Jira con la evidencia de hoy (backend sano, bug de menú se sostiene igual).
2. Si corresponde crear un Defect nuevo para "Planes y coberturas" no renderizando un plan real con campos `null`.
3. Postear las reescrituras en criollo ya redactadas para `IMAS-4463`/`IMAS-4464` (pendiente desde 2026-08-28, nunca confirmado).
