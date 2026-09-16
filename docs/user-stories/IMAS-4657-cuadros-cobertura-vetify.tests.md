# Diseño y ejecución de casos — IMAS-4657 Actualización de cuadros de coberturas en landings Vetify

> **Fuente**: HU `IMAS-4657` (padre `IMAS-4651`, épica "Cambio de precios y condicionados Vetify 16/09"), imagen adjunta `image-20260914-154946.png` (tabla oficial mar-26 vs sep-26, fuente de verdad de los topes nuevos).
>
> **Relacionado**: comparte los mismos 4 canales que IMAS-4644 (precios) — Landing de Performance, Landing OSDE Adquirentes, Web Institucional Vetify (=B2C, la HU la nombra distinto en 2 lugares: "Web Institucional Vetify" en el alcance, "Web Institucional OSDE" en el resultado esperado — mismo problema de nomenclatura que IMAS-4644, ya resuelto con Juanchi: es `mas-osde-beneficios`), Landing PAS.

## 1. Contexto

Actualización de los **cuadros de coberturas** (topes en $, cantidades, límites) de los planes Vetify en las 4 landings, según la tabla oficial de cambios mar-26 → sep-26. A diferencia de IMAS-4644 (precios), **esta HU no tiene fecha de corte confirmada ni orden explícito de PROD-primero** — se investigó el estado real de despliegue en Jira antes de ejecutar.

## 2. Tabla de cambios (fuente: adjunto oficial, `image-20260914-154946.png`)

| Cobertura | mar-26 (antes) | sep-26 (nuevo) |
|---|---|---|
| Consulta veterinaria - fuera de la red | $35.000 | $40.000 |
| Vacunas - fuera de la red | $28.000 | $32.000 |
| Desparasitación - fuera de la red | $8.000 | $9.000 |
| Análisis bioquímico (Cachorro) | $20.000 | $27.500 |
| Análisis bioquímico (demás planes) | $25.000 | $40.000 |
| Diagnóstico por imagen y estudio cardiológico | $35.000 | $40.000 |
| Especialidades | 50% hasta $30.000 c/u | 50% hasta $35.000 c/u |
| Traslado | 10 km | 10 km o $15.000 |
| Videollamada | 9 a 21hs | 24hs |

## 3. Estado real en Jira (verificado antes de ejecutar, 2026-09-16)

| Subtarea | Estado |
|---|---|
| IMAS-4699 Actualización Vetify B2C | Hecho |
| IMAS-4700 Actualización OSDE Adquirentes | Hecho |
| IMAS-4701 Actualización Landing PAS | Hecho |
| IMAS-4702 Actualización Landing de Performance | Hecho |
| IMAS-4703 Pruebas en QA en las 4 landings | Tareas Por Hacer |
| IMAS-4704 **Deploy Prod 4 landings** | **Backlog** |

**Lectura**: el desarrollo ya está hecho (probablemente ya en QA), pero el **deploy a Prod todavía no se hizo** — es "Backlog", ni siquiera "Tareas Por Hacer". A diferencia de precios (IMAS-4644), acá no hay confirmación de que esto debiera ir junto con el despliegue del 16/09 — se trata como una HU independiente en curso.

## 4. Ejecución — cuadro de coberturas en pantalla (2026-09-16)

### CP01 — Landing de Performance (`/salud-mascotas`)
- **Dado**: sin login, sección "Conocé lo que incluye cada plan" (3 planes: Emergencias, Classic, Premium).
- **Cuando**: se comparan los 7 topes de la tabla de cambios (sin "Análisis bioquímico Cachorro", esta landing no tiene plan Cachorros) entre QA y PROD.
- **Resultado QA**: todos los topes con el valor **nuevo** ($40.000 / $32.000 / $9.000 / $40.000 análisis / $40.000 diagnóstico / $35.000 especialidades / "10km c/u o $15.000" traslado).
- **Resultado PROD**: todos los topes con el valor **viejo** ($35.000 / $28.000 / $8.000 / $25.000 / $35.000 / $30.000 / "10km c/u" sin monto en traslado).
- **Veredicto**: ⚠️ **QA actualizado, PROD desactualizado** — coincide con IMAS-4704 "Backlog".
- **Videollamada (9-21hs → 24hs)**: no se pudo comparar — el cuadro de la landing no muestra horario, solo dice "Ilimitadas" en ambos ambientes. Ese dato solo aparece dentro del condicionado PDF (ver IMAS-4652).

### CP02 — Web Institucional Vetify / B2C (`vetify.com.ar`)
- **Dado**: sin login, sección "Conocé todo lo que incluye cada plan" (4 planes, incluye Cachorros).
- **Cuando**: se comparan los 8 topes de la tabla (incluye el caso especial Cachorro en Análisis bioquímico) entre QA y PROD.
- **Resultado QA**: todos los topes nuevos, **incluyendo el caso Cachorro** ($27.500 puntual, $40.000 el resto).
- **Resultado PROD**: todos los topes viejos, **incluyendo el caso Cachorro** ($20.000 puntual, $25.000 el resto) — confirma que la excepción de Cachorro también está bien mapeada de los 2 lados.
- **Veredicto**: ⚠️ **QA actualizado, PROD desactualizado**.

### CP03 — Landing OSDE Adquirentes / Web Institucional OSDE (`mas-osde-beneficios`)
- **Dado**: sin login, sección "Mirá el detalle de cada cobertura" (tabla reducida: no muestra $ en Vacunas/Desparasitación, no tiene fila Traslado).
- **Cuando**: se comparan los topes visibles (Consultas, Diagnóstico por imagen, Especialidades) entre QA y PROD.
- **Resultado QA**: $40.000 / $40.000 / $35.000 (nuevos).
- **Resultado PROD**: $35.000 / $35.000 / $30.000 (viejos).
- **Veredicto**: ⚠️ **QA actualizado, PROD desactualizado** — mismo patrón.
- **Hallazgo aparte, no cubierto por el CP anterior — PDF "DESCARGAR CUADRO DE COBERTURA"**: esta landing tiene un botón que descarga `/img/CUADRO COBERTURA OSDE.pdf`. Se descargó el archivo de QA y de PROD: **mismo hash MD5 en los 2 ambientes** (`d324208d29b81daad86b92593e92d9f9`), y su contenido está **muy desactualizado** — muestra "Precio final $19.900" (parece un precio de lanzamiento, ni siquiera el de mar-26) y topes viejos ($35.000/$28.000/$8.000/$25.000/$30.000). Este archivo **no fue tocado por el trabajo de IMAS-4657** — ni en QA ni en PROD. Como es un "cuadro de coberturas" descargable y visible desde la misma landing, cae dentro del alcance literal de la HU ("No se visualiza información desactualizada en los cuadros de coberturas"). **Se recomienda reportarlo** (ver sección 6).
- Performance, B2C y PAS **no tienen** un botón de descarga de cuadro de cobertura — solo aplica a OSDE Adquirentes.

### CP04 — Landing PAS (`pas.vetify.com.ar`, solo PROD, sin QA)
- **Dado**: sin login, tabla "Conocé todo lo que incluye cada plan" en formato acordeón (categorías colapsadas, requieren click para expandir).
- **Cuando**: se expande la categoría "Consulta veterinaria" y se compara contra la tabla de cambios.
- **Resultado**: $40.000 (valor **nuevo**) — consistente con que PAS ya tenía los precios nuevos también (single-environment, sin lag de QA).
- **Veredicto**: ✅ PASS (spot-check, 1 de 8 topes verificado por el costo de expandir cada categoría manualmente; el patrón observado en precios para este mismo canal — sin lag — da confianza razonable de que el resto también está actualizado, pero no se verificó exhaustivamente fila por fila).

## 5. Responsive — QA (2026-09-16)

> **Alcance acotado a QA por pedido explícito de Alan** ("vamos a limitarnos a QA por ahora") — PROD queda fuera del veredicto hasta que IMAS-4704 (deploy) se ejecute.

| Canal | Desktop (1440×900) | Mobile (390×844) |
|---|---|---|
| Landing de Performance | ✅ Tabla legible, sin cortes ni superposiciones | ✅ Se convierte en tabs por plan, $40.000 correcto, legible |
| Web Institucional B2C | ✅ Acordeón por categoría, $40.000 correcto al expandir | ✅ Detrás de botón "COMPARAR PLANES" (patrón distinto al resto, pero funciona bien), navegación por flechas entre planes, $40.000 correcto |
| Landing OSDE Adquirentes | ✅ Tabla completa por plan (tabs arriba), $40.000 correcto, bien alineada | ✅ Selector de plan por botones, $40.000 correcto, legible |

Los 3 canales con ambiente QA: **responsive PASS completo**.

## 6. Resumen de hallazgos — veredicto QA (alcance acotado por pedido de Alan, 2026-09-16)

| # | Canal | Cuadro en pantalla (QA) | Responsive QA | Otro hallazgo |
|---|---|---|---|---|
| 1 | Performance | ✅ Valores nuevos correctos | ✅ PASS | Videollamada (9-21hs→24hs) no visible en el cuadro, solo en el condicionado (bloqueado, IMP-017) |
| 2 | B2C Institucional | ✅ Valores nuevos correctos (incl. excepción Cachorro $27.500) | ✅ PASS | — |
| 3 | OSDE Adquirentes | ✅ Valores nuevos correctos | ✅ PASS | **PDF descargable desactualizado, igual en QA y en PROD** (hash idéntico, precio de lanzamiento $19.900) — esto SÍ es observable en QA, no depende del deploy pendiente |
| 4 | PAS | N/A — sin ambiente QA (solo existe en PROD, confirmado por Alan) | N/A | Fuera de alcance de esta pasada |

**Veredicto QA: PASS en los 3 canales con ambiente QA** (cuadro de coberturas + responsive). PROD queda deliberadamente fuera del veredicto por pedido explícito de Alan — el deploy a Prod (IMAS-4704) sigue en "Backlog", así que la diferencia QA/PROD ya está identificada y no se vuelve a reportar como hallazgo nuevo.

**Único hallazgo real dentro del alcance QA**: el PDF `CUADRO COBERTURA OSDE.pdf` (botón "DESCARGAR CUADRO DE COBERTURA" en la landing OSDE Adquirentes) está desactualizado en QA también — no es un tema de deploy pendiente, es un archivo estático que nadie actualizó.

## 7. Defect creado

**[IMAS-4743](https://ikeasistencia-arg.atlassian.net/browse/IMAS-4743)** — "El PDF descargable 'Cuadro de cobertura OSDE' está desactualizado (precio y topes viejos)". Linkeado `Blocks → IMAS-4657`.

Origen de los números citados en el Defect (verificado dos veces ante la duda de Alan):
- Valores nuevos ($40.000/$32.000/$9.000): columna "sep-26" del adjunto oficial `image-20260914-154946.png` + confirmado en vivo en las 3 landings QA.
- Valores viejos ($35.000/$28.000/$8.000/$25.000/$30.000): columna "mar-26" del mismo adjunto + confirmado en vivo en las 3 landings PROD.
- El "resultado esperado" del Defect (que el PDF debería igualar la tabla en pantalla) es una inferencia razonable, no un requisito escrito explícito — queda aclarado así en el propio Defect.

## 8. Pendiente

- PAS y PROD quedan fuera de alcance por ahora (pedido explícito de Alan) — retomar cuando corresponda.
- Re-ejecutar CP01-CP03 en PROD una vez que IMAS-4704 (deploy) se mueva de "Backlog".
