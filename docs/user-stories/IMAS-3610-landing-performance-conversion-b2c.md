# IMAS-3610 — Desarrollar landing de performance de Conversión B2C

**Tipo:** Historia
**Estado (Jira, al 2026-08-27):** In Validation (volvió a subir desde "En Progreso" — el dev devolvió los 3 bugs)
**Reporter:** Liliana Picinotti
**Assignee (actualizado 2026-08-27):** alan david gonzalez guzman (reasignada de vuelta a mí para el retest; había pasado por Juan Cruz Triventi — dev — entre el 26 y el 27)
**Prioridad:** High
**Label:** SG2
**Parent (Epic):** [IMAS-2878](https://ikeasistencia-arg.atlassian.net/browse/IMAS-2878) — "Landing de Performance - Ventas" (En Progreso, sin asignar)
**Creado:** 2026-07-12 · **Actualizado:** 2026-08-25
**URL:** https://ikeasistencia-arg.atlassian.net/browse/IMAS-3610
**Sprint:** activo en `2026-Q3-S5-Mascotas` (arrastrada desde `2026-Q3-S2-Mascotas`, mediados de julio — 3 sprints)
**Sitio en vivo:** QA `https://qa.vetify.com.ar/salud-mascotas` · Prod (planeado) `https://vetify.com.ar/salud-mascotas`

## Descripción (texto completo de Jira)

Como potencial cliente interesado en contratar Vetify, quiero acceder a una Landing Page simple, clara y optimizada para dispositivos móviles y desktop, para comprender rápidamente la propuesta de valor y completar el proceso de conversión con la menor fricción posible.

Desarrollar la Landing Page de Performance de Vetify tomando como base el diseño aprobado en Figma. La implementación deberá respetar la propuesta visual y funcional definida por UX/UI, priorizando una experiencia orientada a la conversión, con navegación simple, contenido claro y CTAs visibles durante todo el recorrido. Debe ser completamente responsive (mobile y desktop) y cumplir criterios de performance, accesibilidad y usabilidad.

**Figma**:
- Link original (el que estaba al momento del análisis del 26/8 a la mañana), escondido como hyperlink sobre el texto "El Figma de Landing de Performance" — `extractText()` de `jira-client.mjs` lo descarta porque solo lee nodos de texto, no `marks`; hubo que armar un extractor de ADF aparte para encontrarlo. Apunta a un archivo enorme multi-proyecto (`Dev - Vetify - Iniciativas y solicitudes`) que da "Request too large" en la API de Figma al pedir el frame completo: `https://www.figma.com/design/YfysBYoQZB2Y0J0pLf3nMb/Dev---Vetify---Iniciativas-y-solicitudes?node-id=40002669-85014`
- **Link nuevo, agregado por Liliana el mismo 26/8 más tarde (`updated` 19:02, confirmado que no estaba en la lectura original de la mañana)** — esta vez como texto plano en un párrafo aparte de la descripción ("FIGMA :https://..."), apunta a un archivo dedicado, **"Vetify (Premium)"**: `https://www.figma.com/design/jXOyYOaYFsHfXjcGdiebGU/Vetify--Premium-?t=WJBtlA9iLjV0iwnJ-0`. **Es este el que hay que usar** — el link abre en la última página que quedó activa (no necesariamente la relevante); dentro del archivo, las páginas correctas para esta HU son **"Landing conversion"** (cards de planes, incluida "Cards v3/Emergencias") y **"Pasarela de pago"** (checkout/wizard) — confirmado por el usuario del proyecto viéndolo en vivo el 2026-08-26.

## Criterios de aceptación (texto de Jira)

- Se implementa la Landing respetando el diseño aprobado en Figma.
- Experiencia responsive, funciona en Mobile y Desktop.
- Componentes visuales y funcionales conforme al diseño.
- CTAs operativos, redirigen al flujo correspondiente.
- Navegación minimiza fricción, orientada a maximizar conversión.
- Tiempos de carga acordes a estándares de performance del proyecto.
- Se visualiza correctamente en navegadores soportados.
- Eventos de analítica/tracking definidos por el negocio implementados (si aplica).

## Subtareas (10)

| Key | Título | Estado | Asignado |
|---|---|---|---|
| IMAS-4185 | Explicación del Figma | Hecho | — |
| IMAS-4247 | Tags de landing acuerdo con Nahue | Hecho | — |
| IMAS-3785 | Solicitud de preguntas frecuentes a MKT | Hecho | — |
| IMAS-3786 | Prueba prod | Cancelado | — |
| IMAS-3783 | Desarrollo Landing Performance | Hecho | — |
| IMAS-3784 | **Prueba en QA** | **Tareas Por Hacer** | **Sin asignar** |
| IMAS-4186 | Validación QA MKT-BO-Diseño en QA | **En Progreso** (era Tareas Por Hacer) | — |
| IMAS-4200 | Aviso a BO y MKT | Tareas Por Hacer | — |
| IMAS-4419 | QA de diseño | Hecho | — |
| IMAS-4426 | desarrollo de correcciones | **Hecho** (era In Validation) | Juan Cruz Triventi |

> ⚠️ **Gap de proceso**: `IMAS-3784 "Prueba en QA"` sigue sin asignar y en "Tareas Por Hacer", pese a que Liliana ya pidió pruebas funcionales explícitamente (comentario del 2026-08-25 22:32, el más reciente). Nadie está trackeando formalmente ese trabajo en Jira todavía. `IMAS-4426` (las correcciones de diseño) sí está siendo validado por el dev.

**Issuelinks (Blocks/Relates/etc.):** 3 — `IMAS-4439`, `IMAS-4447`, `IMAS-4450` (todos "Blocks", cargados 2026-08-26). `checkClosable('IMAS-3610')` (verificado 2026-08-27): **no closable**, los 3 siguen en estado no-final ("In Validation"). 2 de los 3 (`IMAS-4439`/`IMAS-4447`) confirmados corregidos hoy — pendiente transicionarlos a Done (a la espera de OK del usuario) para que el criterio 6 del DoD (jira) avance. `IMAS-4450` sigue con fix parcial, no puede pasar a Done todavía.

## Adjuntos (6) — todos revisados

| ID | Archivo | De | Fecha | Contenido |
|---|---|---|---|---|
| 33996 | image-20260812-161407.png | Liliana | 2026-08-12 | Captura del board "FINALES" de Figma, con la sección de FAQ marcada en rosa (solo navegacional, no contenido) |
| 34027 | image-20260814-141018.png | Liliana | 2026-08-14 | Tabla de precios por cód. SISE: Classic (2313) $62.990→$50.392, Premium (2317) $88.990→$71.192, Emergencias (2319) $19.990→$15.992 |
| 34134 | image-20260820-222035.png | Liliana | 2026-08-20 | Mail de Milagros Sce (MKT) con la spec de cupones — ver sección Cupón abajo. **Posible corte**: la captura termina en el punto 2, no se puede confirmar si el mail original tenía un punto 3 |
| 34201 / 34206 | mail-correcciones(-v2).pdf | Liliana | 2026-08-25 | **Bit-a-bit idénticos** (mismo SHA-256) — re-upload duplicado, no dos versiones. Mail de Julieta Trias (Diseñadora Audiovisual) con el checklist de correcciones de diseño — ver sección Checklist abajo |
| 34202 | MAPA-VETES-7.pdf | Liliana | 2026-08-25 | Cartilla veterinaria actualizada (listado de +180 veterinarias por provincia) — es la que el mail de correcciones dice que hay que reemplazar en el sitio |

## Comentarios (9, cronológico)

1. **2026-08-11, Liliana** — Minuta de acuerdos de diseño: barra "Ver planes" NO es sticky (reposiciona a la misma altura al hacer clic); hover destaca Classic (más elegido, estilo azul); cuadro comparativo con scroll interno y cabecera sticky por plan; botón "Contratar" redirige en la misma ventana al checkout (sin pestaña nueva, debe permitir volver atrás); solo 3 planes (Esencial/Classic/Premium, sin Cachorro); reviews de a una por vez; FAQ busca por pregunta y respuesta; cartilla se descarga como adjunto (preview opcional, sin preview en mobile); mobile apila planes (sin carrusel), tablet no contemplada. **Contradicción interna del propio comentario** sobre el switch "ampliar detalles" — ver sección dedicada abajo. Pendientes a esa fecha: cupón vía UTM, tema legal del switch, tags/analytics, paridad de precio con institucional, documentar todo en Figma.
2. **2026-08-12, Juan Cruz Triventi** — Figma solo tenía una FAQ completa, resto pendiente de MKT.
3. **2026-08-12, Liliana** — MKT completó las FAQ (mobile+desktop), marcadas en rosa en Figma. [img 33996]
4. **2026-08-14, Liliana** — Precios actualizados en Figma. Pendiente: nombre de URL y de cupón. [img 34027]
5. **2026-08-18, Liliana** — Cupón debe funcionar vía UTM (igual que el institucional). URL definida: `/salud-mascotas`. Pide avanzar antes de pasar a QA.
6. **2026-08-20, Liliana** — Comparte la definición de MKT sobre cupones/UTM. Lista para pasar a QA interno y luego a MKT/negocio. [img 34134]
7. **2026-08-25 09:12, Liliana** — Se está probando `https://qa.vetify.com.ar/salud-mascotas`. Derivado a MKT (diseño) y a QA del squad (funcionamiento + alineación con Figma).
8. **2026-08-25 12:00, Liliana** — Feedback de diseño recibido, adjunta mail con correcciones. [PDF 34201/34206]
9. **2026-08-25 22:32, Liliana (el más reciente)** — Pide pruebas funcionales: navegación, compra de un plan en QA con tarjetas MP test, validar que todas las correcciones del mail del 25/8 estén incluidas. **Excepción explícita**: la corrección sobre ver las coberturas comprimidas NO aplica — deben verse todas expandidas.

## La contradicción del switch "Ampliar detalles" — resuelta en vivo

Tres fuentes dicen cosas distintas sobre si el switch de detalle de cobertura debe venir abierto o cerrado por default:
- Comentario 11/8 (mismo comentario, dos frases): primero "se mantiene la definición original → apagado por defecto", después "Tema legal... tiene que venir por default encendido".
- Mail de correcciones 25/8: Cande (UX) recomienda **cerrado** por default, para una visual comparativa rápida.
- Comentario más reciente, hoy 25/8 22:32: coberturas deben verse **expandidas** — explícitamente descarta la corrección de Cande.

**Verificado en vivo (QA, 2026-08-26)**: el botón "Ampliar detalles" está `[pressed]` → **expandido por default ahora mismo**. Coincide con la última palabra de Liliana (comentario 9), no con la recomendación de Cande del mail. **No es un bug** — pero si alguien solo lee el mail de correcciones sin ver el comentario de hoy, podría "corregirlo" al revés. Dejar constancia acá para que no se pierda el criterio vigente.

## Cupón (mail de Milagros Sce, MKT — 2026-08-20, ver img 34134)

1. Cupón default (sin parámetro en la URL): **`VETIFY20X3`**.
2. No es el único: todos los cupones activos hoy en la landing institucional de Vetify deben funcionar acá también — **excepto los de OSDE**.
3. Si la UTM trae un cupón distinto (ej. `VETIFY25X3`), ese es el que se muestra en el sitio y el que debe ir a Salesforce en toda venta/carrito/lead.

## Checklist del mail de correcciones (25/8) — verificado contra QA en vivo el 2026-08-26

| Corrección pedida | Estado verificado |
|---|---|
| "20% off por TRES meses" en letras (no en número) | ✅ Implementado |
| Botón "regresar" desde checkout debe volver a esta landing | ✅ Correcto — vuelve a `/salud-mascotas` con los query params intactos |
| Logo desde checkout debe volver a esta landing, no a la institucional | ✅ **Corregido — retestado 2026-08-27**, ver detalle abajo |
| Tope fuera de cartilla — Vacunación | ✅ Implementado ($28.000 c/u, activa a los 30 días) |
| Tope fuera de cartilla — Desparasitaciones | ✅ Implementado ($8.000 c/u, máx 1 cada 2 meses) |
| Tope fuera de cartilla — Diagnóstico por imagen, **Classic** | ✅ Implementado ($35.000, activo a los 60 días) |
| Tope fuera de cartilla — Diagnóstico por imagen, **Emergencias** | ✅ **Corregido 2026-08-27** — el tope ($35.000) aparece; el hallazgo de cantidad (1 vs. 6) y cláusula de 60 días fue **un error de comparación mío** (Figma mobile con copy-paste sin actualizar), retractado — ver detalle abajo (`IMAS-4450`) |
| Tope — Intervención quirúrgica, Emergencias | ✅ Implementado (50% con tope $500.000) |
| Tope — Especialidades (Classic/Premium) | ✅ Implementado ($30.000) |
| Tilde en "obtenés" (FAQ multi-mascota) | ✅ Confirmado — "Sí. Con el beneficio por grupo familiar obtenés un descuento extra del 20% OFF." |
| Cartilla veterinaria actualizada | ✅ Confirmado — el botón sirve `MAPA_VETERINARIAS_VETIFY_10.pdf` (no el v7 adjuntado en Jira), contenido genuinamente distinto (diff real, no solo nombre) |
| Slide de reviews responsive en Desktop (que no se pisen/corten las cards) | Sin verificar |
| Mobile: "globa" pisando el texto | ✅ Se ve bien a 390×844 — badge y texto del hero no se pisan |
| Mobile: título principal en 3 líneas | ⚠️ Renderiza en **4 líneas** a 390px ("EL PLAN DE" / "SALUD IDEAL" / "PARA TU" / "MASCOTA"), no 3 — puede depender del ancho exacto probado en el mail, no es un bug funcional |
| Mobile: letra del botón de cartilla muy chica (ya corregido en Figma según el mail) | Sin verificar |
| Switch "ampliar detalles" cerrado por default (recomendación de Cande) | **No aplica** — ver sección de contradicción arriba, el criterio vigente es expandido |

### Bug del logo en checkout — confirmado 2026-08-26, reportado como IMAS-4439, CORREGIDO (retest 2026-08-27)

El link del logo (`<a href="/">`) estaba **hardcodeado a `/`** — no usaba el parámetro `from=salud_mascotas` que sí está presente en la URL. Reproducido en vivo: desde `checkout/form?plan=2319&cupon=VETIFY20&from=salud_mascotas`, clickear el logo navegaba a `qa.vetify.com.ar/?cupon=VETIFY20&from=salud_mascotas` (landing institucional, con los query params colgando pero sin efecto). El botón "Regresar" del wizard, en cambio, ya funcionaba bien (usa navegación propia del wizard, no el link del logo). Coincidía 1:1 con la corrección pedida en el mail del 25/8.

**Reportado en Jira 2026-08-26**: [IMAS-4439](https://ikeasistencia-arg.atlassian.net/browse/IMAS-4439), linkeado con "Blocks" a esta HU. Ver `docs/bugs/BUG-018-logo-checkout-redirige-landing-institucional.md`. Validado con el usuario del proyecto antes de crear.

**Retest 2026-08-27 (dev devolvió el bug "In Validation")**: el logo dejó de ser un `<a href="/">` y pasó a un `<button>` con navegación propia — clickeado desde `checkout/form?plan=2319&cupon=VETIFY20X3&from=salud_mascotas`, navega correctamente a `/salud-mascotas?cupon=VETIFY20X3&from=salud_mascotas`, conservando los query params. **Confirmado corregido.** Pendiente transicionar `IMAS-4439` a Done (a la espera de OK del usuario).

## Hallazgo nuevo — cupón default incorrecto en el CTA de la landing (2026-08-26), CORREGIDO (retest 2026-08-27)

Al clickear cualquier CTA de plan **sin cupón en la URL** (el caso más común — cualquier visitante sin UTM de campaña), el checkout resultante aplica el cupón **`VETIFY20`**, no **`VETIFY20X3`** como especifica la spec de MKT (punto 1, sección Cupón arriba).

**Por qué importa**: son cupones distintos con bases y condiciones distintas.
- `VETIFY20` → "Bases y condiciones: 20% OFF **el primer mes**" (un solo mes).
- `VETIFY20X3` → "Bases y condiciones: 20% OFF **los primeros 3 meses**" (coincide con el badge del hero).

La landing muestra visualmente "20% OFF POR TRES MESES" en el hero para **todos** los visitantes (ese texto no depende de ningún cupón — los llamados a `payment/calculate` en la landing van con `cupon: ""`, es puro texto estático), pero el cupón que efectivamente se aplica al comprar sin UTM es el de un solo mes. Es decir: **la mayoría de los visitantes ven "3 meses" en el hero y reciben en la práctica solo "1 mes" de descuento real** al finalizar la compra sin una UTM específica.

**Verificado 2/2 con `localStorage`/`sessionStorage` limpios** (para descartar que fuera caché de un cupón probado antes en la misma sesión de navegador) — reproducible de forma limpia. El mecanismo de override sí funciona bien: forzando `?cupon=VETIFY25X3` o `?cupon=VETIFY20X3` en la URL de la landing, el CTA lo respeta y lo pasa correctamente al checkout (confirmado con ambos). El bug está acotado específicamente al **caso sin cupón en la URL** — ahí el CTA arma el link con `VETIFY20` en vez de `VETIFY20X3`.

**Reportado en Jira 2026-08-26**: [IMAS-4447](https://ikeasistencia-arg.atlassian.net/browse/IMAS-4447), linkeado con "Blocks" a esta HU. Ver `docs/bugs/BUG-019-cupon-default-landing-salud-mascotas-incorrecto.md`. Validado con el usuario del proyecto antes de crear.

**Retest 2026-08-27 (dev devolvió el bug "In Validation")**: con `localStorage`/`sessionStorage` limpios, sin parámetro de cupón en la URL, el CTA de "Emergencias" ahora navega a `checkout/form?plan=2319&cupon=VETIFY20X3&from=salud_mascotas` — confirmado además en la respuesta real de `POST payment/calculate` (`listDiscountOverTotal[0]`: `discountType: "VETIFY20X3"`, `description: "20% OFF los primeros 3 meses"`). Coincide con el badge del hero. **Confirmado corregido.** Pendiente transicionar `IMAS-4447` a Done (a la espera de OK del usuario).

## Comparación contra el Figma correcto ("Vetify Premium", páginas "Landing conversion"/"Pasarela de pago") — 2026-08-26

La comparación anterior de esta sesión se había hecho contra el archivo viejo (`Dev - Vetify - Iniciativas y solicitudes`), que ya no es el que la HU referencia — Liliana agregó un link nuevo a un archivo dedicado, **"Vetify Premium"** (`jXOyYOaYFsHfXjcGdiebGU`), con las páginas **"Landing conversion"** y **"Pasarela de pago"**. Esta sección es la comparación real contra ESE archivo.

- **Switch "Ampliar detalles"**: el componente `Ampliar detalles toggle` (`10450:21102`) en Figma tiene la perilla del switch posicionada a la derecha (calculado por geometría: offset ~45px sobre un track de 77px, con perilla de 28px — consistente con "activado", no con "apagado a la izquierda"). **Confirma independientemente, por el diseño mismo y no solo por comentarios, que el switch debe venir expandido por default** — coincide con lo ya verificado en vivo.

- ~~🐛 Hallazgo nuevo y más grave de lo que se había reportado~~ — **ERROR MÍO, corregido 2026-08-27, ver detalle abajo.** (Se mantiene tachado para dejar rastro del error, no se borra.)
  - El 2026-08-26 reporté que el componente de Figma `Seccion cuadro cobertura/Emergencias/Desplegado` (`10302:28307`) especificaba para "Diagnóstico por imagen y estudios cardiológicos" (plan Emergencias): "6 por año", tope "$35.000 c/u", "Fuera de la red", "Servicio activo a partir de los 60 días" — y que la UI en vivo mostraba solo "1 por año" sin tope. Se amplió `IMAS-4450` en Jira con este detalle (`updateIssueFields` + comentario) y, tras el retest del 27/8, se devolvió el bug a Juan Cruz Triventi con este hallazgo (comentario + reasignación + transición a "En Progreso").
  - **2026-08-27, el usuario reportó que Juan (mirando Figma directamente) no ve "6 por año" ni la cláusula de 60 días para esa fila.** Re-examiné el nodo `10302:28307` a fondo (no solo los nombres de capa, el texto real): la fila "Diagnóstico por imagen" y la fila "Análisis bioquímico" (un servicio totalmente distinto) comparten **texto idéntico carácter por carácter** en su bloque "fuera de cartilla" ("6 por año tope de $35.000 c/u / Fuera de la red / Servicio activo a partir de los 60 días") — un copy-paste de Figma sin actualizar, no una especificación real. Coincide con un patrón ya documentado antes en este mismo proyecto (otro archivo de Figma: "los textos mobile son provisorios").
  - **Conclusión corregida**: no existe ningún gap de cantidad ni de cláusula. El "1 por año" / sin cláusula de 60 días que muestra la UI en vivo para Emergencias **es correcto** — coincide con lo que Juan confirmó mirando Figma directamente. `IMAS-4450` queda **100% resuelto** (solo el tope, que sí se corrigió, era el bug real).
  - **Cerrado 2026-08-27**: comentario de `IMAS-4450` corregido (reencuadrado como "punto ya flageado como pendiente de confirmación → confirmado", no como error propio), reasignado de vuelta a mí, y los **3 bugs** (`IMAS-4439`, `IMAS-4447`, `IMAS-4450`) transicionados a **Done**. `checkClosable('IMAS-3610')` ahora devuelve `closable: true` — criterio 6 del DoD (Jira) satisfecho.

- **Corrección/confirmación 2026-08-27, directo de Juan Cruz Triventi**: la referencia autoritativa para comparar esta landing es la página **"Landing conversion"** (`3540:685`), específicamente la sección/board **"FINALES"** (`10510:12830`) dentro de esa página. Juan aclaró explícitamente que **`Conversion (CON FORM) E-Commerce/Desktop` ("CON FORM CD") todavía NO se construye** — descarta la especulación anterior de que fuera "la landing completa más actual"; es una versión futura/fuera de alcance por ahora, no comparar contra ella. `Pasarela de pagos nueva / Desktop / Paso 1/2/3` (`3530:6235`/`6455`/`6528`, wizard de checkout rediseñado) sigue sin confirmar si aplica o no — no se le preguntó a Juan puntualmente por ese frame.
- **Pendiente**: identificar el nodo exacto dentro de "FINALES" que contiene el cuadro de coberturas Desktop (para no repetir la confusión del 27/8 comparando contra el componente mobile equivocado) — intentado, bloqueado por rate-limit de la API de Figma (429), reintentar más tarde. Mientras tanto, **cualquier comparación nueva contra Figma en esta HU debe partir de "Landing conversion" → "FINALES"**, nunca de `CON FORM CD` ni de componentes sueltos "v3"/"Cande" sin confirmar con el equipo primero.

## Hallazgos de Figma que no están en ningún comentario de Jira

Con `npm run figma` (cliente ya funcional del proyecto) se exportó e inspeccionó el frame linkeado (`40002669:85014`, "Tabla 3 + Tarjetas | Nuestra propuesta con ajustes aplicados después de la reu del 17/07"). Notas de diseño encontradas ahí, en ningún comentario de Jira:

- Frame Desktop: **"los textos desktop son la versión UX, faltaría actualizar la versión MKT."**
- Frame Mobile: **"los textos mobile son provisorios, faltaría actualizar la versión UX + MKT."**

Si se está validando copy al pie de la letra, tener en cuenta que el propio equipo de diseño marca el texto mobile como no-final. El frame revisado es uno específico del board "FINALES" (visto en la captura del 12/8) — ese board tiene más frames (`Conversion E...`, otras tablas) que no se cruzaron uno por uno.

## Nota técnica reutilizable (ver también `qa-workspace/current-state.md`)

`extractText()` en `scripts/jira/jira-client.mjs` no solo descarta imágenes/videos (`extractMediaIds()` ya lo cubre desde 2026-08-21) — **también descarta links reales** (`marks` tipo `link` con `href`, e `inlineCard`/`blockCard` con `url`). Un texto como "El Figma de Landing de Performance" con un hyperlink aplicado se lee como texto plano sin URL. Se armó un extractor ad-hoc (`extract-links.mjs`, no comiteado — vivió en el scratchpad de la sesión) que camina el mismo árbol ADF buscando `node.marks[].attrs.href` y `node.attrs.url` en nodos `inlineCard`/`blockCard`/`embedCard`. **Regla para la próxima vez que se analice un ticket a fondo**: si la descripción o un comentario menciona "el link de..." / "ver acá" / nombra un archivo o Figma sin mostrar una URL en el texto extraído, sospechar que es un hyperlink oculto y no asumir que no existe.

## Pendiente para continuar (actualizado 2026-08-27)

**Hecho 2026-08-26**: logo de checkout confirmado roto (`IMAS-4439`), cupón default confirmado roto (`IMAS-4447`), tope de Emergencias/Diagnóstico por imagen confirmado y ampliado (`IMAS-4450` — ver hallazgo de cantidad 1 vs 6 más abajo), tilde/cartilla/mobile badge OK, 25 casos de prueba diseñados (`.tests.md`), comparación contra el Figma correcto ("Vetify Premium") iniciada.

**Hecho hoy (2026-08-27)**:
- **Retest de los 3 bugs** (dev los devolvió "In Validation", reasignados a mí): `IMAS-4439` (logo) y `IMAS-4447` (cupón default) **confirmados corregidos** en vivo. `IMAS-4450` (tope Emergencias) quedó **parcialmente corregido** — el tope ya aparece, pero la cantidad (1 vs. 6 Figma) y la cláusula de activación siguen sin resolverse.
- **Decisión de scope confirmada por el usuario**: los 4 puntos consolidados en el comentario de `IMAS-3610` (`CP08` Salesforce, `CP15` mobile Regresar, `CP24` Performance, `CP25` Analítica) los toma la **PO para el sprint siguiente** — quedan formalmente **fuera de alcance** para este cierre, no bloquean.
- ~~Transicionar `IMAS-4439`/`IMAS-4447` a Done~~ — **hecho 2026-08-27**, con OK explícito del usuario.
- ~~Qué hacer con `IMAS-4450`~~ — **hecho 2026-08-27**: el hallazgo ampliado (cantidad 1 vs 6 + cláusula 60 días) era un error mío de comparación contra un componente Figma mobile con contenido copy-pasteado sin actualizar — retractado tras confirmación de Juan. Comentario corregido, bug transicionado a Done junto con los otros 2.
- **`IMAS-3610` ya es `closable: true`** según `checkClosable` — quedaría lista para que el equipo la cierre formalmente (no ejecutado — cerrar la HU en sí es decisión del equipo/PO, no una escritura que corresponda hacer desde acá sin que lo pidan).

**Cambio de contexto (2026-08-26)**: la HU pasó de "In Validation" (asignada a mí) a "En Progreso" (asignada a Juan Cruz Triventi, dev) al quedar 3 bugs "Blocks" abiertos. Con 2 de los 3 ya corregidos, es esperable que vuelva a QA pronto para el cierre final (sujeto a que `IMAS-4450` también se resuelva).

**Queda pendiente**:
1. ~~Decisión sobre `IMAS-4450`~~ — **hecho 2026-08-26**: actualizado con el alcance real (cantidad + tope), ver sección de arriba. **Retest 2026-08-27**: parcialmente corregido, ver arriba — sigue sin poder cerrarse.
2. ~~CP08/CP15/CP24/CP25~~ — **hecho 2026-08-26**: consolidados en un comentario de `IMAS-3610`. **Resuelto 2026-08-27**: la PO los tomó para el sprint siguiente, quedan fuera de alcance para este cierre.
3. Terminar la comparación Figma-vs-UI: quedaron sin revisar `Conversion (CON FORM) E-Commerce/Desktop` (`10992:14395`, landing completa con formulario) y `Pasarela de pagos nueva / Desktop` (`3530:6235`/`6455`/`6528`, wizard de checkout rediseñado) — en particular, confirmar si el tratamiento del logo/header ahí coincide con el bug de `IMAS-4439` o si el diseño real nunca contempló ese caso.
4. ~~Decidir sobre `IMAS-3784`~~ — **resuelto solo, 2026-08-26**: alguien la asignó a mí sin que lo pidiéramos. Cargado el resumen en criollo (con veredicto) + los 25 casos completos en un bloque plegable, directo en la descripción de la subtarea.
5. Una vez el dev resuelva los 3 bugs, retestear y recién ahí evaluar automatizar (`.spec.ts`) — sigue sin hacerse, todo lo de hoy fue intake + verificación manual + diseño de casos.
