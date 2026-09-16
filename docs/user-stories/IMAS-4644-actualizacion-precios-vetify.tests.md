# Diseño de casos — IMAS-4644 Actualización de precios Vetify en canales digitales (16/09)

> **Proceso**: 1) Análisis ✅ (este archivo), 2) Ejecución PROD (16/09 antes de la daily), 3) Ejecución QA (16/09, identificar gaps), 4) Reporte a Liliana.
>
> **Fuente**: HU `IMAS-4644` (padre `IMAS-4651`), tabla de precios adjunta en Jira (`image-20260909-201154.png`), chat con Liliana Picinotti (2026-09-15).

---

## 1. Contexto

A partir del **16/09/2026** cambian los precios de los planes Vetify en 4 canales digitales. La prueba **no requiere login ni usuarios de prueba** — es una persona visitante navegando a la sección de contratar/comprar plan y verificando que el valor mostrado sea el correcto. **No hace falta completar ninguna compra.**

**Orden de ejecución acordado con Liliana**:
1. **PROD, mañana 16/09 a primera hora, antes de la daily** — validar que los 4 canales ya muestren los precios nuevos (plan individual y familiar). Si están OK, se puede dar por confirmado que el cambio ya es productivo.
2. **QA, después** — es común que QA no se actualice igual que prod; la idea acá es relevar qué planes/precios faltan actualizar en cada portal (no bloquea el punto 1).

**Hoy (15/09) no se puede ejecutar nada todavía** — Liliana confirmó que el cambio todavía no está subido ni en prod ni en QA.

---

## 2. Tabla de precios (fuente: adjunto Jira, verificado carácter por carácter)

### B2C (Vetify institucional / Landing de Performance)
| Cod SISE | Plan | Precio anterior (28-may-26) | Precio nuevo (16-sep-26) | Incremento |
|---|---|---|---|---|
| 2313 | Classic x1 | $62.990 | $66.790 | 6,03% |
| 2314 | Classic +1 | $50.392 | $53.432 | 6,00% |
| 2315 | Cachorro x1 | $79.990 | $84.790 | 6,00% |
| 2316 | Cachorro +1 | $63.992 | $67.832 | 6,00% |
| 2317 | Premium x1 | $88.990 | $94.790 | 6,52% |
| 2318 | Premium +1 | $71.192 | $75.832 | 6,00% |
| 2319 | Emergencias x1 | $19.990 | $21.190 | 6,00% |
| 2320 | Emergencias +1 | $15.992 | $16.952 | 6,00% |

### OSDE (Landing/Web OSDE Adquirentes)
| Cod SISE | Plan | Precio anterior (lanzamiento) | Precio nuevo (16-sep-26) | Incremento |
|---|---|---|---|---|
| 2358 | Classic x1 OSDE | $56.691 | $60.111 | 6,03% |
| 2359 | Classic +1 OSDE | $45.353 | $48.089 | 6,00% |
| 2360 | Cachorro x1 OSDE | $71.991 | $76.311 | 6,00% |
| 2361 | Cachorro +1 OSDE | $57.593 | $61.049 | 6,00% |
| 2362 | Premium x1 OSDE | $80.091 | $85.311 | 6,52% |
| 2363 | Premium +1 OSDE | $64.073 | $68.249 | 6,00% |
| 2364 | Emergencias x1 OSDE | $17.991 | $19.071 | 6,00% |
| 2365 | Emergencias +1 OSDE | $14.393 | $15.257 | 6,00% |

### PAS (Landing PAS)
| Cod SISE | Plan | Precio anterior (28-may-26) | Precio nuevo (16-sep-26) | Incremento |
|---|---|---|---|---|
| 2338 | Classic x1 | $62.990 | $66.790 | 6,03% |
| 2339 | Cachorro x1 | $79.990 | $84.790 | 6,00% |
| 2340 | Premium x1 | $88.990 | $94.790 | 6,52% |
| 2337 | Emergencias x1 | $19.990 | $21.190 | 6,00% |

**Nota**: PAS solo tiene planes individuales (x1) en la tabla — no hay fila "+1" para PAS. A confirmar si eso es correcto (¿PAS no ofrece plan familiar?) o si falta en la tabla — preguntar a Liliana si surge la duda en la prueba.

---

## 2bis. Baseline observado EN VIVO hoy (2026-09-15, antes del despliegue) — no solo la tabla del Excel

> La tabla de la sección 2 viene del Excel/adjunto de Jira (columna "antes"). Pero lo que se ve **en pantalla, hoy, en cada canal real** no siempre es ese número pelado — varios canales le suman un descuento promocional encima. Esta sección es la foto real que vi navegando cada URL hoy, para comparar mañana contra ESTO (lo que cambió de verdad en cada pantalla), no solo contra la columna del Excel.

### Landing de Performance (`vetify.com.ar/salud-mascotas`) — 3 planes (sin Cachorro)
| Plan | "Antes" en pantalla | Con "20% off por tres meses" |
|---|---|---|
| Emergencias | $19.990/mes | $15.990/mes |
| Classic | $62.990/mes | $50.390/mes |
| Premium | $88.990/mes | $71.190/mes |

### Web Institucional Vetify B2C (`vetify.com.ar`) — 4 planes, precio directo sin promo por card
| Plan | Precio en pantalla |
|---|---|
| Emergencias | $19.990/mes |
| Classic | $62.990/mes |
| Premium | $88.990/mes |
| Cachorros | $79.990/mes |

Nota: banner genérico "20% de descuento por grupo familiar" (no es un precio de card separado).

### Landing/Web OSDE Adquirentes (`vetify.com.ar/mas-osde-beneficios`) — 4 planes, con 2 capas de descuento
| Plan | "Antes" en pantalla | Con "30% off por tres meses" |
|---|---|---|
| Emergencias | $19.990/mes | $13.791/mes |
| Classic | $62.990/mes | $43.591/mes |
| Premium | $88.990/mes | $61.591/mes |
| Cachorros | $79.990/mes | $55.391/mes |

Notas: además hay "10% OFF fijo a partir del 4to mes" y "20% OFF por grupo familiar ADICIONAL" mencionados como capas extra (no vi el precio final con esas 2 aplicadas, solo el badge de texto).

### Landing PAS (`pas.vetify.com.ar`) — 4 planes, precio directo sin promo
| Plan | Precio en pantalla |
|---|---|
| Emergencias | $19.990/mes |
| Classic | $62.990/mes |
| Premium | $88.990/mes |
| Cachorros | $79.990/mes |

### OSDE Capitado (`vetify.com.ar/osde`) — sin precio
No muestra ningún monto — es un formulario de activación ("cobertura 100% bonificada"), solo pide datos personales. Ver discusión en la sección de canales sobre si esto es o no "Web Institucional OSDE".

---

## 3. Canales — URLs confirmadas vs. pendientes de confirmar

| # | Canal (según la HU) | URL QA | URL PROD | Estado |
|---|---|---|---|---|
| 1 | Landing de Performance Vetify | `qa.vetify.com.ar/salud-mascotas` | `vetify.com.ar/salud-mascotas` | ✅ Confirmada — verificado en vivo 2026-09-15, hoy muestra precios viejos (esperado, el cambio es recién el 16/09) |
| 2 | Web Institucional Vetify (B2C) — implícito en "Landing de Performance" pero es la home institucional, no la landing de campaña | `qa.vetify.com.ar` | `vetify.com.ar` | ✅ Confirmada — verificado en vivo, precios viejos hoy, sin variante "+1" como tarjeta propia (ver nota abajo) |
| 3 | Landing OSDE Adquirentes | `qa.vetify.com.ar/mas-osde-beneficios` | `vetify.com.ar/mas-osde-beneficios` | ✅ **Confirmada en vivo 2026-09-15** (ya no es una suposición) |
| 4 | Web Institucional OSDE | `qa.vetify.com.ar/mas-osde-beneficios` (misma que la fila de arriba) | `vetify.com.ar/mas-osde-beneficios` (misma que la fila de arriba) | ✅ **RE-CONFIRMADO (2026-09-16)** — Alan le preguntó directamente a Juanchi, dándole las 2 candidatas reales (`/osde` sin precio vs `mas-osde-beneficios` con precio). Respuesta explícita de Juanchi: **es la opción 2, `mas-osde-beneficios`**. El merge original del 2026-09-15 con "Landing OSDE Adquirentes" era correcto — la duda reabierta más temprano el mismo día (por un comentario ambiguo de Juanchi, "institucional OSDE es institucional") queda resuelta. `vetify.com.ar/osde` (OSDE Capitado, sin precio) NO es este canal, queda fuera de alcance de esta HU. |
| — | Landing PAS | *(sin confirmar aún, probablemente `qa.pas.vetify.com.ar` — a verificar mañana)* | `pas.vetify.com.ar` | ✅ **Confirmada en vivo 2026-09-15** — Alan la encontró (subdominio propio, no un path de `vetify.com.ar`, por eso no estaba en `environment.ts`). Muestra los 4 planes exactos de la tabla PAS (Emergencias/Classic/Premium/Cachorros, todos x1), precios viejos hoy. **Sin ninguna variante "+1"/familiar visible en la página** — refuerza que PAS realmente no ofrece plan familiar (no es solo un hueco en la tabla), pero confirmarlo igual con Liliana de pasada. |

**Estado (actualizado 2026-09-16, cierre definitivo)**: "Web Institucional OSDE" = `mas-osde-beneficios`, confirmado directamente por Juanchi. Los 4 canales de la HU quedan mapeados a solo 3 URLs físicas (Performance, OSDE Adquirentes/Institucional OSDE, PAS) — sin dudas abiertas.

**Hallazgo en vivo (2026-09-15) — importante para la ejecución de mañana**: ni la Landing de Performance ni la de OSDE Adquirentes muestran el precio de la tabla "pelado". Ambas muestran `antes $<precio base> → $<precio con descuento promocional>` (ej. "20% off por tres meses" en Performance, "30% off por tres meses" + "20% off por grupo familiar adicional" en OSDE). **La validación de mañana no es buscar el número de la tabla tal cual en pantalla** — es confirmar que el valor "antes" sea el precio nuevo de la tabla, y que el descuento promocional se calcule bien sobre ese valor nuevo. El plan "+1"/familiar tampoco aparece como tarjeta separada en ninguna de las 2 — el "20% por grupo familiar" se aplica como descuento adicional, no como un plan distinto con su propio precio visible de entrada.

**Acción pendiente antes de mañana**: preguntarle a Liliana la URL exacta de "Web Institucional OSDE" y "Landing PAS".

---

## 4. Casos de prueba

**Patrón general (se repite por canal aplicable)**: sin login, ir a la sección "Contratar plan" / "Comprar plan" de la landing, y verificar el precio mostrado de cada plan disponible en ese canal contra la tabla de la sección 2. Revisar también que no quede el precio viejo visible en ningún lado de la página (cards, CTAs, tablas comparativas, FAQs).

### CP01 — PROD, Landing de Performance (`vetify.com.ar/salud-mascotas`), precios nuevos
- **Dado**: 16/09, antes de la daily, sin login.
- **Cuando**: se navega a la landing de Performance en PROD y se revisan los 3 planes que ofrece (Emergencias/Classic/Premium — sin Cachorro, según lo documentado en IMAS-3610).
- **Entonces**: cada precio mostrado (individual y familiar si el plan lo ofrece) coincide con la columna "16-sep-26" de la tabla B2C. Ningún precio viejo visible.

### CP02 — PROD, Web Institucional Vetify (`vetify.com.ar`), precios nuevos
- **Dado**: 16/09, antes de la daily, sin login.
- **Cuando**: se navega a la sección de planes de la web institucional.
- **Entonces**: los 8 planes B2C (Classic/Cachorro/Premium/Emergencias × individual/familiar) muestran el precio nuevo. Ningún precio viejo visible.

### CP03 — PROD, Landing OSDE Adquirentes (`mas-osde-beneficios`), precios nuevos
- **Dado**: 16/09, antes de la daily, sin login. **Cubre solo "Landing OSDE Adquirentes"** — el merge con "Web Institucional OSDE" hecho el 2026-09-15 quedó revertido el 2026-09-16 (ver sección 3, fila 4, reabierta). "Web Institucional OSDE" es un caso aparte, pendiente de confirmación.
- **Cuando**: se navega a `vetify.com.ar/mas-osde-beneficios` en PROD.
- **Entonces**: el valor "antes" de cada uno de los 4 planes coincide con la columna "16-sep-26" de la tabla OSDE, y el precio con descuento promocional ("30% off por tres meses") se recalcula bien sobre ese valor nuevo. Ningún precio viejo visible como "antes".
- **Nota de mecánica de precio** (hallazgo en vivo 2026-09-15): esta página no muestra el precio de tabla "pelado" — muestra `antes $X → $Y con 30% off por tres meses`, más "20% off por grupo familiar" como descuento adicional (no como plan separado). Validar el cálculo, no solo buscar el número de la tabla tal cual.
- **Resultado 2026-09-16**: ver sección 6 — el "antes" se actualizó, pero contra la columna B2C, no la columna OSDE de la tabla (era así también antes del despliegue). Observación anotada, no bloqueante — Alan lo comenta en la daily.

### CP04 — PROD, Landing PAS (`pas.vetify.com.ar`), precios nuevos
- **Dado**: 16/09, antes de la daily, sin login.
- **Cuando**: se navega a `pas.vetify.com.ar` en PROD.
- **Entonces**: los 4 planes PAS (tabla PAS, todos x1 — sin variante familiar) muestran el precio nuevo directo, sin descuento promocional superpuesto (a diferencia de CP01/CP03, acá si mostró el precio de tabla "pelado" al revisar hoy). Ningún precio viejo visible.

### CP05–CP08 — Repetir CP01–CP04 en QA
Mismo patrón que arriba pero contra los ambientes QA (`qa.vetify.com.ar/salud-mascotas`, `qa.vetify.com.ar/mas-osde-beneficios`, y PAS QA — confirmar el subdominio exacto al ejecutar, probablemente `qa.pas.vetify.com.ar`). **Objetivo distinto**: no es solo PASS/FAIL — es relevar y listar puntualmente qué planes/precios de cada canal todavía no están actualizados en QA, para reportarlo (es esperable que QA vaya atrás de prod).

### CP09 — Responsive desktop
- **Dado**: cualquiera de los canales de arriba.
- **Cuando**: se revisa en viewport desktop.
- **Entonces**: precios legibles, sin textos cortados ni superposiciones.

### CP10 — Responsive mobile
- **Dado**: cualquiera de los canales de arriba.
- **Cuando**: se revisa en viewport mobile.
- **Entonces**: precios legibles, sin textos cortados ni superposiciones.

---

## 5. Resumen de cobertura vs. criterios de aceptación de la HU

| AC de la HU | Cubierto por |
|---|---|
| Precios nuevos correctos a partir del 16/09 | CP01–CP08 |
| No quedan precios anteriores visibles | CP01–CP08 (parte "ningún precio viejo visible") |
| Landing de Performance actualizada | CP01, CP05 |
| Landing OSDE Adquirentes actualizada | CP03, CP07 |
| Web Institucional OSDE actualizada | CP03, CP07 (mismo canal que OSDE Adquirentes, re-confirmado por Juanchi el 2026-09-16) |
| Web PAS actualizada | CP04, CP08 |
| Validación desktop | CP09 (solo probado en Performance — falta repetir en OSDE Adquirentes/Institucional OSDE y PAS) |
| Validación mobile | CP10 (solo probado en Performance — falta repetir en OSDE Adquirentes/Institucional OSDE y PAS) |

**Estado actualizado 2026-09-16 (cierre)**: 10/10 CPs con resultado real (ver sección 6, ejecución PROD del día). Los 4 canales de la HU están cubiertos. Gaps que quedan: (1) responsive (CP09/CP10) solo se ejecutó en Landing de Performance, falta repetir en los otros 2 canales; (2) nada subido a Jira todavía (subtareas IMAS-4646/4647/4648/4649/4650 siguen "Tareas Por Hacer").

---

## 6. Ejecución en vivo PROD (2026-09-16, mañana del despliegue)

| CP | Canal | Resultado | Detalle |
|---|---|---|---|
| CP01 | Landing de Performance | ✅ PASS | "Antes" de los 3 planes coincide exacto con columna B2C nueva ($21.190/$66.790/$94.790). El cálculo del "20% off por tres meses" tiene una diferencia de $42–62 respecto al 20% exacto — anotado como observación, no como falla (no hay fuente confirmada de la fórmula exacta de la promo). |
| CP02 | Web Institucional B2C | ✅ PASS | Los 4 planes coinciden exacto con la tabla nueva: Emergencias $21.190, Classic $66.790, Premium $94.790, Cachorros $84.790. |
| CP03 | Landing OSDE Adquirentes | ⚠️ Observación | El "antes" de los 4 planes ($21.190/$66.790/$94.790/$84.790) coincide con la columna **B2C** nueva, no con la columna **OSDE** de la tabla ($19.071/$60.111/$85.311/$76.311). Ya pasaba lo mismo ayer antes del despliegue (esta landing nunca mostró la columna OSDE, ni antes ni ahora). El número de referencia se actualizó correctamente en sí mismo, solo que contra la tabla equivocada. **Decisión de Alan (2026-09-16): mantener como observación, no bloquear, lo comenta en la daily.** |
| CP04 | Landing PAS | ✅ PASS | Los 4 planes coinciden exacto con la tabla nueva: Emergencias $21.190, Classic $66.790, Premium $94.790, Cachorros $84.790. Sin capa de promo (igual que el baseline de ayer). |

## 7. Ejecución en vivo QA (2026-09-16)

**Objetivo distinto al de PROD**: no es pass/fail — es relevar si QA ya tiene el cambio o va atrás (es esperable que vaya atrás).

| CP | Canal | Resultado |
|---|---|---|
| CP05 | Landing de Performance (`qa.vetify.com.ar/salud-mascotas`) | ✅ Ya actualizado — mismos 3 precios nuevos que PROD ($21.190/$66.790/$94.790), con "20% off por tres meses" igual que en PROD |
| CP06 | Web Institucional B2C (`qa.vetify.com.ar`) | ✅ Ya actualizado — los 4 planes con precio nuevo exacto |
| CP07 | Landing OSDE Adquirentes (`qa.vetify.com.ar/mas-osde-beneficios`) | ✅ Ya actualizado — mismo patrón que PROD (usa columna B2C como "antes", no columna OSDE; ver observación de CP03) |
| CP08 | Landing PAS (QA) | ➖ **N/A — confirmado por Alan (2026-09-16)**: PAS no tiene ambiente QA, solo existe en PROD ("de PAS solo tengo prod... no tiene qa, es en vivo prod de una"). No es un gap ni un bloqueo, es el diseño real del canal. Se retiran los 2 intentos de URL adivinada como no aplicables. |

**Hallazgo relevante para el reporte a Liliana**: contra lo esperado (QA normalmente atrás de prod), los 3 canales que se pudieron verificar en QA **ya tienen el cambio aplicado**, igual que PROD — no hay gap que reportar en esos 3. Falta solo confirmar PAS QA (bloqueado por falta de URL).

## 8. Responsive (2026-09-16) — completo, los 4 canales

| Canal | Desktop (1440×900) | Mobile (390×844) |
|---|---|---|
| Landing de Performance | ✅ Legible, sin superposiciones | ✅ Legible, sin cortes (solo banner estándar de cookies) |
| Landing OSDE Adquirentes / Web Institucional OSDE | ✅ 4 tarjetas legibles, sin cortes | ✅ Legible, "$14.671/mes, luego $21.190 por mes" correcto |
| Landing PAS | ✅ 4 planes legibles (el texto "Classic" en gris tenue es una animación de scroll-reveal a medio transicionar, no un bug) | ✅ Legible, sin cortes |

**Pendiente**: solo queda subir a Jira lo ya confirmado (subtareas IMAS-4646/4647/4648/4649/4650) y reportar el hallazgo de la columna B2C-vs-OSDE en OSDE Adquirentes (Alan lo comenta en la daily).

## 9. Validación de checkout (2026-09-16) — cierre del hallazgo de OSDE Adquirentes

Tras el hallazgo de que la landing OSDE Adquirentes muestra "antes" = columna B2C (no columna OSDE), Alan pidió validar qué precio se cobra realmente al tocar "Contratar"/"Elegí plan", antes de decidir si era un bug real.

| Canal | Plan probado | Precio en landing ("antes") | Precio en checkout | ¿Coincide con la tabla OSDE? |
|---|---|---|---|---|
| OSDE Adquirentes | Cachorros (clCuenta 2360) | $84.790 (columna B2C) | **$76.311** | ✅ Sí — exacto a la columna OSDE |
| OSDE Adquirentes | Emergencias (clCuenta 2364) | $21.190 (columna B2C) | **$19.071** | ✅ Sí — exacto a la columna OSDE |
| Landing de Performance | Classic (clCuenta 2313) | $66.790 | $66.790, con cupón "20% OFF los primeros 3 meses" (-$13.400) → Total $53.390 | ✅ Sí — columna B2C, como corresponde a este canal |
| Web Institucional B2C | Classic | $66.790 | $66.790 (sin cupón) | ✅ Sí |
| Landing PAS | Emergencias | $21.190 | No se pudo probar — pantalla "Link inválido: contactá a tu productor de seguros para que te reenvíe el link correcto" | ➖ N/A, acceso restringido por diseño (venta vía productores de seguros, no es un problema de precio) |

**Conclusión**: el checkout de OSDE Adquirentes cobra el monto correcto de la tabla OSDE — el problema es exclusivamente el precio de referencia ("antes") que se muestra en la landing, que usa la tabla equivocada (B2C en vez de OSDE). No afecta lo que paga el cliente, pero sí puede confundir sobre cuánto está ahorrando.

**Defecto formal creado**: [IMAS-4731](https://ikeasistencia-arg.atlassian.net/browse/IMAS-4731) — "La landing de OSDE Adquirentes muestra el precio 'antes' equivocado (usa el precio general, no el de OSDE)". Linkeado `Blocks → IMAS-4644`.

**Estado final de IMAS-4644 (QA)**: 10/10 CPs ejecutados, responsive completo en los 4 canales, checkout validado en 3 de 4 canales (PAS requiere link de productor, fuera de alcance de esta prueba), 5 comentarios de evidencia subidos a Jira, 1 Defect real creado y linkeado.
