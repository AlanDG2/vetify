# Diseño de casos — IMAS-3610 Landing de Performance de Conversión B2C

> Diseño basado en riesgo (`qa-risk-test-design`). Riesgo por sub-área, no uniforme para toda la HU — ver cada TS. Fuente: los 8 criterios de aceptación de la HU + los 9 comentarios de Jira + el mail de correcciones del 25/8 (adjunto) + la spec de cupón/UTM (mail de Milagros Sce, 20/8) + el frame de Figma linkeado en la descripción. Detalle completo de cada fuente en `IMAS-3610-landing-performance-conversion-b2c.md` (el archivo de intake/análisis) — este documento no repite ese contexto, solo referencia dónde sale cada caso.
>
> **Estado de verificación por caso**: ✅ verificado en vivo contra QA (2026-08-26) / 🔴 **BLOQUEADO — bug real confirmado** (Jira linkeado) / ⏳ diseñado, todavía sin verificar / `[CONFIRMAR]` falta información en la HU/mails para poder ejecutar el caso tal cual.
>
> **Automatización**: ninguno de estos casos está automatizado todavía (sin `.spec.ts`, sin POM propio de esta landing en `src/pages/`) — este documento es diseño + verificación manual, el paso de automatizar es posterior y no se hizo.

## Los 8 criterios de aceptación de la HU (AC-1 a AC-8)

- **AC-1**: Se implementa la Landing respetando el diseño aprobado en Figma.
- **AC-2**: La experiencia es responsive y funciona en Mobile y Desktop.
- **AC-3**: Los componentes visuales y funcionales se implementan conforme al diseño.
- **AC-4**: Los CTAs están operativos y redirigen al flujo correspondiente.
- **AC-5**: La navegación minimiza la fricción y está orientada a maximizar la conversión.
- **AC-6**: Tiempos de carga acordes a estándares de performance del proyecto.
- **AC-7**: Se visualiza correctamente en los navegadores soportados.
- **AC-8**: Eventos de analítica y tracking definidos por el negocio implementados (si aplica).

## TS-01 Contenido y diseño de los planes (AC-1, AC-3)
**Riesgo: BAJO-MEDIO** (impacto medio — es lo primero que ve el visitante; probabilidad baja — ya validado en Figma y no cambió desde entonces).

**CP01 - Verificar los 3 planes ofrecidos y su contenido** ✅
- Dado: visitante entra a `/salud-mascotas` sin ningún parámetro
- Cuando: se observa la sección "Elegí el mejor plan"
- Entonces: se muestran exactamente 3 planes — Emergencias, Classic, Premium (**sin** "Cachorro", excluido a propósito según el comentario del 11/8) — cada uno con su lista de "Incluye"
- Trazabilidad: AC-1, AC-3 (fuente: comentario 2026-08-11)

**CP02 - Verificar que Classic se destaca visualmente como "más elegido"** ✅
- Dado: visitante en `/salud-mascotas`
- Cuando: se observa la tarjeta del plan Classic
- Entonces: tiene el badge "MÁS ELEGIDO" y un estilo visual distinto (borde azul) respecto a Emergencias/Premium
- Trazabilidad: AC-1, AC-3 (fuente: comentario 2026-08-11, "destacar visualmente el plan Classic")

**CP03 - Verificar CTAs de cada plan con copy persuasivo distinto** ✅
- Dado: visitante en `/salud-mascotas`
- Cuando: se observa el botón de cada tarjeta
- Entonces: cada plan tiene un CTA con texto propio — Emergencias "Quiero estar preparado", Classic "Quiero cuidar su salud", Premium "Quiero cobertura máxima" (no un genérico "Contratar" repetido)
- Trazabilidad: AC-3, AC-4 (fuente: mail de correcciones 25/8, confirmado visualmente en vivo)

**CP04 - Verificar badge "20% OFF POR TRES MESES" con el número en letras** ✅
- Dado: visitante en `/salud-mascotas`
- Cuando: se observa el badge del hero
- Entonces: dice "20% OFF POR TRES MESES" con el número escrito en letras, no en dígito ("3")
- Trazabilidad: AC-3 (fuente: mail de correcciones 25/8, ítem ya corregido)

## TS-02 Cupón / UTM (AC-3, AC-4)
**Riesgo: ALTO** (impacto alto — contenido promocional/legal, afecta el monto que paga el cliente; probabilidad alta — ya se confirmó 1 defecto real acá).

**CP05 - Verificar cupón default sin parámetro en la URL** ✅ **CORREGIDO — verificado en vivo 2026-08-27**
- Dado: visitante entra a `/salud-mascotas` sin ningún parámetro (storage limpio)
- Cuando: hace click en el CTA de cualquier plan y llega al checkout
- Entonces (esperado): se aplica el cupón `VETIFY20X3` → "20% OFF los primeros 3 meses"
- Entonces (real, retest 2026-08-27): la URL de checkout ahora trae `cupon=VETIFY20X3`; confirmado además en la respuesta real de `payment/calculate` (`listDiscountOverTotal[0].description = "20% OFF los primeros 3 meses"`, `discountType: "VETIFY20X3"`) — coincide con el badge del hero
- Trazabilidad: AC-3, AC-4 (fuente: mail de Milagros Sce, 20/8 — spec de cupón, punto 1)
- **`IMAS-4447` retestado y confirmado corregido — pendiente transicionar a Done (a la espera de OK del usuario).**

**CP06 - Verificar override con cupón explícito en la UTM** ✅
- Dado: visitante entra a `/salud-mascotas?cupon=VETIFY25X3` (o `VETIFY20X3`)
- Cuando: hace click en el CTA de cualquier plan
- Entonces: el checkout aplica exactamente ese cupón (confirmado con ambos, con `localStorage` limpio entre pruebas)
- Trazabilidad: AC-4 (fuente: mail de Milagros Sce, 20/8, punto 2)

**CP07 - Verificar exclusión de cupones de OSDE** ✅ (aclarado, no es un caso ejecutable tal como estaba planteado)
- Dado: se investigó el checkout real de OSDE Adquirente (`/mas-osde-beneficios` → "Contratar")
- Cuando: se inspeccionó la request real de `payment/calculate`
- Entonces: OSDE Adquirente **no usa el mecanismo `cupon=` en absoluto** — llega al checkout con `?from=osde` (sin `cupon`), y el descuento está incorporado en IDs de producto propios y distintos (`id: 2364`, contra `2319`/etc. de Vetify B2C), con `cupon: ""` siempre. No existe un "cupón real de OSDE" en el sentido que asume la spec de MKT — la exclusión no es testeable tal cual está redactada, porque no hay nada que excluir por ese mecanismo.
- Trazabilidad: AC-4 (fuente: mail de Milagros Sce, 20/8, punto 1) — **recomendado**: confirmar con MKT/Milagros si esta cláusula de la spec sigue teniendo sentido dado cómo está implementado OSDE hoy, o si se refiere a algo distinto que no se identificó en esta verificación.

**CP08 - Verificar que el cupón viaja correctamente a Salesforce en toda venta/carrito/lead** ⚪ **FUERA DE ALCANCE — diferido a próximo sprint (decisión de PO, 2026-08-27)**
- Dado: una compra completada (o un carrito/lead) con un cupón puntual aplicado
- Cuando: se revisa el registro creado en Salesforce
- Entonces (esperado): el cupón que se visualizó en el sitio es el mismo que ingresó a Salesforce
- Trazabilidad: AC-4 (fuente: mail de Milagros Sce, 20/8, punto 2 — imagen adjunta `34134`, referenciada en el comentario 6 de Liliana, no es texto plano del comentario) — no verificable desde afuera del backend/Salesforce.
- **No es un bug** (no hay evidencia de falla, solo falta de acceso). La PO tomó este punto (del comentario consolidado en `IMAS-3610`) para el próximo sprint — para efectos de esta ronda de pruebas, queda fuera de alcance, no cuenta como bloqueante de cierre de esta HU.

> **Nota 2026-08-26**: `CP08`, `CP15`, `CP24` y `CP25` quedaron consolidados en **un solo comentario** en `IMAS-3610` (editado, no uno nuevo por cada uno), etiquetando a `@Liliana Picinotti` y `@juan cruz triventi` para que les llegue la notificación. Ninguno de los 4 se reportó como bug — son decisiones/confirmaciones pendientes del equipo, no fallas confirmadas.
>
> **Actualización 2026-08-27**: el usuario del proyecto confirmó que la PO tomará estos 4 puntos para el sprint siguiente. Para esta ronda de pruebas (cierre de lo que sí se puede cerrar hoy), los 4 quedan formalmente **fuera de alcance** — no bloquean el cierre de la HU por sí mismos (no son bugs), quedan como trabajo futuro ya priorizado por la PO.

## TS-03 Cuadro comparativo de coberturas (AC-1, AC-3)
**Riesgo: MEDIO** (impacto medio — información de cobertura, no bloquea la compra; probabilidad alta — ya se confirmó 1 defecto real).

**CP09 - Verificar que "Ampliar detalles" viene expandido por default** ✅ (doble confirmado: en vivo Y contra el componente real de Figma)
- Dado: visitante en `/salud-mascotas`, sección "Conocé lo que incluye cada plan"
- Cuando: se observa el estado inicial del switch "Ampliar detalles"
- Entonces: está `pressed`/activado — las coberturas se ven expandidas sin necesidad de tocar el switch. Confirmado también contra el componente `Ampliar detalles toggle` del Figma "Vetify Premium" (`10450:21102`) — la perilla está geométricamente a la derecha (activado), no a la izquierda.
- Trazabilidad: AC-1, AC-3 (fuente: contradicción entre el comentario 11/8, el mail de correcciones 25/8, y el comentario más reciente 25/8 22:32 — **este último es el criterio vigente**, ver detalle en el archivo de intake)

**CP10 - Verificar tope "fuera de cartilla" en Vacunación, Desparasitaciones, Intervención quirúrgica (Emergencias) y Especialidades** ✅
- Dado: visitante con el cuadro de coberturas expandido
- Cuando: se revisan esas 4 filas en las 3 columnas de plan
- Entonces: cada celda muestra el tope económico "por fuera de la cartilla" correspondiente (ej. Vacunación $28.000 c/u, Desparasitaciones $8.000 c/u)
- Trazabilidad: AC-1, AC-3 (fuente: mail de correcciones 25/8)

**CP11 - Verificar tope "fuera de cartilla" en Diagnóstico por imagen, plan Emergencias** ✅ **CORREGIDO — confirmado 2026-08-27**
- Dado: visitante con el cuadro de coberturas expandido
- Cuando: se revisa la fila "Diagnósticos por imagen y estudios cardiológicos", columna Emergencias
- Entonces (esperado, según el mail de correcciones 25/8): debería mostrar el tope, igual que Classic/Premium
- Entonces (real en QA, hallazgo original 2026-08-26): mostraba solo "1 por año", sin tope ni ninguna otra aclaración
- Entonces (real en QA, retest 2026-08-27): muestra **"1 por año" / "Con tope de $35.000"** — el tope **SÍ aparece**, corrige el reclamo original.
- **Nota sobre un hallazgo propio retractado**: el 2026-08-26 reporté además que el componente Figma `Seccion cuadro cobertura/Emergencias/Desplegado` (`10302:28307`) exigía "6 por año" + cláusula "activo a los 60 días" para esta fila, y que la UI no lo cumplía. **Esto fue un error de comparación mío** — ese componente es la versión mobile, y su bloque "fuera de cartilla" para esta fila resultó ser texto idéntico, carácter por carácter, al de la fila "Análisis bioquímico" (un servicio distinto) — un copy-paste de Figma sin actualizar, no una especificación real. Confirmado con Juan Cruz Triventi (mirando Figma directamente) que el diseño real no pide "6 por año" ni esa cláusula para Emergencias. Retractado en Jira.
- **Veredicto final**: `IMAS-4450` está **100% resuelto** — el único bug real era la falta de tope, ya corregida.
- Trazabilidad: AC-1, AC-3 (fuente: mail de correcciones 25/8 + componente real de Figma)

## TS-04 Navegación y CTAs (AC-4, AC-5)
**Riesgo: ALTO** (impacto alto — pérdida de contexto/conversión si el visitante no puede volver fácilmente; probabilidad alta — ya se confirmó 1 defecto real).

**CP12 - Verificar que el CTA de un plan lleva al checkout con el plan, cupón y origen correctos** ✅
- Dado: visitante en `/salud-mascotas` (con o sin cupón en la URL)
- Cuando: hace click en el CTA de un plan
- Entonces: navega a `/checkout/form` con los query params `plan=<id>`, `cupon=<el que corresponda>` y `from=salud_mascotas`
- Trazabilidad: AC-4 (verificado en todas las pruebas de esta ronda — el mecanismo de paso de parámetros funciona, más allá de qué cupón puntual resuelva mal CP05)

**CP13 - Verificar que el botón "Regresar" del wizard vuelve a la landing de origen** ✅
- Dado: visitante llegó al checkout desde `/salud-mascotas` (con `from=salud_mascotas` en la URL)
- Cuando: presiona "Regresar" en el Paso 1 o Paso 2 del wizard
- Entonces: vuelve a `/salud-mascotas`, con los query params intactos
- Trazabilidad: AC-4, AC-5 (fuente: mail de correcciones 25/8 — este ítem sí quedó bien)

**CP14 - Verificar que el logo del checkout vuelve a la landing de origen** ✅ **CORREGIDO — verificado en vivo 2026-08-27**
- Dado: visitante llegó al checkout desde `/salud-mascotas` (con `from=salud_mascotas` en la URL)
- Cuando: hace click en el logo "vetify" del header
- Entonces (esperado): debería volver a `/salud-mascotas`
- Entonces (real, hallazgo original 2026-08-26): vuelve a `/` (landing institucional) — el link estaba hardcodeado, ignoraba `from`
- Entonces (real, **retest 2026-08-27**): el logo pasó de ser un `<a href="/">` a un `<button>` — al clickearlo, navega correctamente a `/salud-mascotas` conservando los query params (`?cupon=...&from=salud_mascotas`)
- Trazabilidad: AC-4, AC-5 (fuente: mail de correcciones 25/8)
- **`IMAS-4439` retestado y confirmado corregido — pendiente transicionar a Done (a la espera de OK del usuario).**

**CP15 - Verificar que "Regresar" está presente y accesible en mobile** ⚪ **FUERA DE ALCANCE — diferido a próximo sprint (decisión de PO, 2026-08-27)**
- Dado: visitante en mobile (390px), checkout Paso 2
- Cuando: se busca el botón "Regresar"
- Entonces: existe, pero queda debajo de todos los campos del formulario — requiere scroll completo para encontrarlo, sin ningún indicio visual arriba (las flechas "Anterior"/"Siguiente" que sí se ven de entrada pertenecen a un carrusel promocional no relacionado)
- Trazabilidad: AC-2, AC-5 (borde de UX, no bug — dejado como sugerencia en el comentario consolidado de `IMAS-3610`, tomado por la PO para el sprint siguiente)

## TS-05 FAQ y cartilla (AC-1, AC-3)
**Riesgo: BAJO** (impacto bajo — contenido secundario, no bloquea conversión).

**CP16 - Verificar tilde en la respuesta de descuento por múltiples mascotas** ✅
- Dado: visitante en `/salud-mascotas`, sección "Preguntas frecuentes"
- Cuando: abre "¿Existe un descuento por contratar planes para más de una mascota?"
- Entonces: la respuesta dice "...obtenés..." (con tilde)
- Trazabilidad: AC-3 (fuente: mail de correcciones 25/8)

**CP17 - Verificar que el buscador de FAQ filtra por pregunta y por respuesta** ✅
- Dado: visitante en la sección FAQ
- Cuando: escribe "grupo familiar" en el buscador (término que solo aparece en la **respuesta** de "¿Existe un descuento por contratar planes para más de una mascota?", no en el texto de la pregunta)
- Entonces: esa FAQ aparece igual en los resultados — confirma que el buscador sí indexa el contenido de la respuesta, no solo la pregunta
- Trazabilidad: AC-3 (fuente: comentario 2026-08-11)

**CP18 - Verificar que el botón "Conocé la cartilla" descarga la versión actualizada** ✅
- Dado: visitante en `/salud-mascotas`
- Cuando: hace click en "Conocé la cartilla"
- Entonces: abre `MAPA_VETERINARIAS_VETIFY_10.pdf` — contenido verificado como distinto (diff real) al `MAPA VETES 7.pdf` que estaba adjunto en Jira como "desactualizado"
- Trazabilidad: AC-1, AC-3 (fuente: mail de correcciones 25/8)

## TS-06 Responsive (AC-2, AC-7)
**Riesgo: MEDIO** (impacto medio — parte explícita de los ACs; probabilidad media — mobile es lo menos verificado de toda la HU hasta ahora).

**CP19 - Verificar que el badge del hero no pisa el texto en mobile** ✅
- Dado: visitante en mobile (390×844)
- Cuando: se observa el hero
- Entonces: el badge "20% OFF POR TRES MESES" y el título no se superponen
- Trazabilidad: AC-2 (fuente: mail de correcciones 25/8)

**CP20 - Verificar título principal en 3 líneas en mobile** ✅ (comportamiento preciso confirmado, es sensible al ancho)
- Dado: visitante en mobile, probado a 375px, 390px y 428px de ancho
- Cuando: se mide la altura real renderizada del `<h1>` contra su `line-height` (no solo inspección visual)
- Entonces: a **375px y 390px da 4 líneas**; a **428px (celulares grandes, ej. Pro Max) da 3 líneas**. No está roto — es reflow natural de texto sensible al ancho, no una regla fija de "siempre 3 líneas". La corrección del mail probablemente se validó contra un ancho de referencia más grande que el estándar (375-390px, el más común).
- Trazabilidad: AC-2 (fuente: mail de correcciones 25/8) — dato preciso para decidir si vale la pena ajustar el copy/tamaño de fuente para que dé 3 líneas también en los anchos más chicos y comunes.

**CP21 - Verificar que el carrusel de reviews no corta/pisa las cards en Desktop** ✅
- Dado: visitante en Desktop, probado a 800px, 900px, 1024px y 1280px de ancho
- Cuando: se observa el carrusel "Familias que ya confían en nosotros" en cada ancho
- Entonces: las cards nunca se pisan ni se rompen visualmente en ningún ancho probado — el recorte de la última card visible es el patrón esperado de un carrusel "peek" (asoma la siguiente para indicar que hay más), no un bug
- Trazabilidad: AC-2, AC-7 (fuente: mail de correcciones 25/8) — parece ya resuelto

**CP22 - Verificar tamaño de letra del botón de cartilla en mobile** ✅
- Dado: visitante en mobile (390px)
- Cuando: se compara el `font-size` computado del botón "Conocé la cartilla" contra un CTA de plan (ej. "Quiero estar preparado")
- Entonces: ambos miden **18px** — igual tamaño de letra, ya no es "chica" (la diferencia de alto entre botones es solo padding, no tipografía)
- Trazabilidad: AC-2, AC-3 (fuente: mail de correcciones 25/8)

**CP23 - Tablet** — **fuera de alcance**, decisión de producto explícita ("no está contemplada por tiempos; se usa el diseño mobile más compacto", comentario 2026-08-11). No diseñar casos para tablet salvo que se revierta esa decisión.

## TS-07 Performance y analítica (AC-6, AC-8)
**Riesgo: sin clasificar — falta información para diseñar casos ejecutables.**

**CP24 - Verificar tiempos de carga acordes a estándares de performance** ⚪ **FUERA DE ALCANCE — diferido a próximo sprint (decisión de PO, 2026-08-27)**
- La HU no define un umbral concreto (segundos, Core Web Vitals, etc.) ni qué herramienta usar. No es un caso ejecutable como prueba funcional manual/E2E — requeriría acordar un estándar con el equipo (ej. Lighthouse, WebPageTest) antes de poder diseñar un caso real.
- Trazabilidad: AC-6

**CP25 - Verificar eventos de analítica y tracking** ⚪ **FUERA DE ALCANCE — diferido a próximo sprint (decisión de PO, 2026-08-27)**
- Dado: visitante carga `/salud-mascotas`
- Cuando: se inspeccionan las requests de red al cargar la página y al scrollear
- Entonces: **sí hay tracking implementado** — Google Tag Manager, Google Analytics 4 (`tid=G-L1Y9Y5BRCT`, vía server-side tagging en `ss.vetify.com.ar`) y Google Ads (`AW-17413499394`) disparan `page_view` y un evento de `scroll` (`percent_scrolled=90`) confirmados en vivo.
- Trazabilidad: AC-8 (fuente: comentario 2026-08-11, "definir con Nahuel si se reutiliza el mismo esquema... o si hace falta diferenciarlo por origen" — esa pregunta **nunca se resolvió** en los comentarios posteriores). La PO tomó la definición final para el sprint siguiente — por ahora queda documentado que el tracking base SÍ existe, sin confirmar si es el esquema definitivo.

---

## Resumen de cobertura vs. criterios de aceptación

**Actualizado 2026-08-27** — retest de los 3 bugs (dev los devolvió "In Validation") + decisión de PO: los 4 puntos consolidados (CP08/CP15/CP24/CP25) quedan fuera de alcance para este cierre, tomados para el sprint siguiente.

| AC | Cubierto por | Estado |
|---|---|---|
| AC-1 Fiel al diseño de Figma | CP01-04, CP09-11, CP16, CP18 | ✅ CP11 corregido y confirmado — el hallazgo de cantidad 1 vs 6 fue un error propio de comparación, retractado |
| AC-2 Responsive Mobile/Desktop | CP19-23 | 🟡 CP19/CP21/CP22 ✅, CP20 dato preciso (3 líneas desde 428px, 4 líneas en 375-390px), CP15 diferido a próximo sprint (no bloquea) |
| AC-3 Componentes conforme al diseño | CP01-04, CP07, CP09-11, CP16-18, CP22 | ✅ CP11 corregido y confirmado, CP07 aclarado (no aplica tal como estaba planteado) |
| AC-4 CTAs operativos | CP05-08, CP12-14 | ✅ CP05 y CP14 corregidos y verificados 2026-08-27. CP07 aclarado, CP08 diferido a próximo sprint (no bloquea) |
| AC-5 Navegación de baja fricción | CP12-15 | ✅ CP14 corregido. CP15 diferido a próximo sprint (no bloquea) |
| AC-6 Performance | CP24 | ⚪ Diferido a próximo sprint (decisión de PO) — no bloquea este cierre |
| AC-7 Navegadores soportados | CP21 | 🟡 Responsive Desktop confirmado en 4 anchos — pero solo se probó Chrome/Chromium (motor de Playwright MCP), no se definió ni probó una matriz real de navegadores |
| AC-8 Analítica/tracking | CP25 | ⚪ Diferido a próximo sprint (decisión de PO) — tracking base confirmado existente, no bloquea este cierre |

**25 casos diseñados.** De los 3 bloqueados por bugs reales: `CP05` (`IMAS-4447`), `CP14` (`IMAS-4439`) y `CP11` (`IMAS-4450`) **retestados y confirmados corregidos el 2026-08-27** (pendiente transicionar `IMAS-4439`/`IMAS-4447` a Done en Jira, a la espera de OK del usuario; `IMAS-4450` pendiente de postear la corrección/retractación y cerrar). El hallazgo ampliado que había quedado sobre `CP11` (cantidad 1 vs. 6 + cláusula de 60 días) fue **un error de comparación mío** contra un componente Figma mobile con contenido copy-pasteado sin actualizar — retractado tras confirmarlo con Juan Cruz Triventi mirando el diseño real.

De los 4 puntos que habían quedado como hallazgos/dudas sin bug (`CP08` Salesforce, `CP15` mobile Regresar, `CP24` performance, `CP25` analítica): la PO los tomó para el sprint siguiente (confirmado por el usuario 2026-08-27) — quedan **fuera de alcance** para este cierre, no cuentan como bloqueantes.

**Balance actual: 23/25 casos en verde o fuera-de-alcance-no-bloqueante, 0 casos con bugs reales pendientes.** Con los 3 bugs (`IMAS-4439`/`IMAS-4447`/`IMAS-4450`) transicionados a Done, no quedaría ningún bug "Blocks" abierto sobre `IMAS-3610`.

**No se automatizó ningún caso todavía** — no existe `.spec.ts` ni POM propio para esta landing en `src/pages/`. Con 2 de los 3 bugs bloqueantes ya resueltos, automatizar empieza a tener sentido — pero conviene esperar la resolución de `IMAS-4450` (para no automatizar sobre un valor "1 por año" que podría cambiar a "6") antes de escribir el spec definitivo.
