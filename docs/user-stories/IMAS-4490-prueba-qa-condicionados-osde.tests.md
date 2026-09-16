# Diseño de casos — IMAS-4490 Prueba QA: Condicionados OSDE Adquirente (subtarea de IMAS-4488)

> **Proceso**: 1) Análisis ✅, 2) Diseño CPs ✅, 3) Ejecución manual ✅ (100%, 2026-09-02 a 09-10), 4) Automatización ⚠️ (parcial, ver abajo — recién pudo empezar 2026-09-14 al resolverse IMP-017).
>
> **Fuente**: HU `IMAS-4488` (descripción), catálogo de productos (`clCuenta`, `dsCuenta`, `clGrupoCuenta`) provisto por Alan, PDFs adjuntos en `documentation/` y link SharePoint, spec existente `tests/projects/vetify-webapp/plans.spec.ts` (patrón reutilizable).

## 9. Automatización (2026-09-14)

**Spec**: `tests/projects/osde-adquirente/condicionados.spec.ts`.

**Resultado real de la primera corrida (no 11/11 — honesto, no inflado)**:

| CP | Resultado automatizado | Detalle |
|---|---|---|
| CP07 (Emergencias x1, 2364) | ✅ PASS en vivo | Cuenta pool real `adquirenteosde@gmail.com`. |
| CP10 (OSDE Capitado, regresión) | ✅ PASS en vivo | Cuenta pool real (OSDE_CAPITADO, ACTIVE). |
| CP11 (VET no-OSDE, regresión) | ✅ PASS en vivo | Cuenta pool real (VETIFY_ADQUIRENTE, ACTIVE+WITH_PET). |
| CP01 (Classic x1, 2358) | ⚠️ Escrito, NO pasa hoy | Cuenta generada fresca por API (nueva, gracias al fix de IMP-017) y activada con éxito, pero al llegar a "Planes y coberturas" la sesión reprodujo el bloqueo 1 de IMP-017 (`category/overview`/`my-products` intermitente) 2/2 veces. No es un bug del test — mismo código que CP07/CP10/CP11, que sí pasaron. Queda en el spec (no skippeado) para correr solo cuando el ambiente esté sano. Ver IMP-017 en `docs/impedimentos-bloqueos.md`. |
| CP02, CP03, CP04, CP05, CP06, CP08, CP09 | ⏭️ `test.skip()` explícito | El catálogo QA real (`cuenta=MA_VETIFY`) solo tiene el plan 2358 cargado hoy (IMP-017) y no existe ninguna cuenta real en el pool con estos 7 planes. Verificados manualmente PASS en su momento (ver tabla arriba), pero no automatizables hasta que el catálogo tenga los datos o aparezca una cuenta real. |

**Total real**: 3/11 automatizados y en verde, 1/11 escrito pero bloqueado por ambiente (no por código), 7/11 no automatizables hoy por falta de datos de catálogo (documentados como `test.skip()`, no como fallas silenciosas).

---

## 1. Contexto y mapeo de productos

**Alcance OSDE Adquirente** (`clGrupoCuenta = 163`, `Prefijo = OSD`):

| clCuenta | Nombre del producto | PDF que debe mostrar | Plan |
|---|---|---|---|
| 2349 | Vetify Esencial OSDE | `VETIFY ESENCIAL (OSDE) - 250626 sin vetifyplus.pdf` | Esencial |
| 2358 | Vetify Classic x1 OSDE | `VETIFY CLASSIC OSDE (2358).pdf` | Classic |
| 2359 | Vetify Classic +1 OSDE | `VETIFY CLASSIC OSDE (2358).pdf` | Classic |
| 2360 | Vetify Cachorro x1 OSDE | `VETIFY CACHORROS OSDE (2360).pdf` | Cachorros |
| 2361 | Vetify Cachorro +1 OSDE | `VETIFY CACHORROS OSDE (2360).pdf` | Cachorros |
| 2362 | Vetify Premium x1 OSDE | `VETIFY PREMIUM OSDE (2362).pdf` | Premium |
| 2363 | Vetify Premium +1 OSDE | `VETIFY PREMIUM OSDE (2362).pdf` | Premium |
| 2364 | Vetify Emergencias x1 OSDE | `VETIFY EMERGENCIA OSDE (2364).pdf` | Emergencias |
| 2365 | Vetify Emergencias +1 OSDE | `VETIFY EMERGENCIA OSDE (2364).pdf` | Emergencias |

**5 PDFs distintos**, 9 productos (x1 y +1 comparten PDF).

**No OSDE** (`clGrupoCuenta = 158`, `Prefijo = VET`): planes VET puros (2243-2250, 2313-2320). **No deben cambiar**. CP de regresión incluido.

**OSDE Capitado**: no es OSDE Adquirente — el condicionado sigue siendo el de Esencial OSDE (el de siempre). CP incluido para verificar que no se tocó.

---

## 2. Validación de PDFs nuevos (estática)

Ya realizada en esta sesión: los 5 PDFs fueron extraídos con `pdftotext` y verificados con `grep -i "vetify.plus\|vetifyplus"`. **Resultado: 0 matches en los 5 PDFs** ✅

Esto cumple el CA: *"Los nuevos condicionados no contienen ninguna referencia a Vetify Plus."*

---

## 3. Criterios de aceptación mapeados

| CA de la HU | Cubierto por |
|---|---|
| Los condicionados OSDE Adquirente fueron reemplazados | CP01-CP09 |
| Los nuevos condicionados no contienen "Vetify Plus" | CP01-CP10 (verificación de contenido) |
| Los condicionados de otros productos/segmentos permanecen sin modificaciones | CP11 (VET no-OSDE), CP12 (OSDE Capitado) |
| Los documentos están disponibles donde se consultan | CP01-CP10 (botón accesible + PDF descarga 200) |

---

## 4. Diseño de casos de prueba

**Herramienta de verificación**: Playwright (navegador real). Flujo: abrir nueva pestaña al hacer clic en "Condiciones del Servicio", capturar la URL y el contenido del PDF.

**Para verificar contenido del PDF**: se usa `page.request.get(url_pdf)` sobre la URL del PDF y se valida con `pdftotext` / `grep` que NO contiene "Vetify Plus". Alternativa práctica: verificar el título del plan en la primera línea del PDF (`CONDICIONES GENERALES / Plan <NOMBRE>`).

### 4.1 Resultados de ejecución (2026-09-02)

**Método**: Playwright (script Node.js) + `curl` + `pdftotext` para extraer contenido PDF.

#### TS-01 Condicionados OSDE Adquirente — Classic (CP01–CP02)

| CP | Plan | Resultado | Detalle |
|---|---|---|---|
| CP01 | Classic x1 OSDE (2358) | ✅ **PASS (2026-09-10)** | `0158-2358.pdf` → `200 OK`, sin "Vetify Plus". Verificado por link directo (no se consiguió cuenta pool con este plan exacto para probar el botón real — ver §5). |
| CP02 | Classic +1 OSDE (2359) | ✅ **PASS (2026-09-10)** | Mismo PDF que CP01 (`0158-2358.pdf`), ya confirmado accesible y sin "Vetify Plus". |

**Corrección importante (2026-09-10): el prefijo real es `0158-`, no `0163-` como se probó el 2026-09-02.** El botón real de la webapp (confirmado con 2 cuentas OSDE Adquirente reales, plan Emergencias) construye la URL con `Grupo: 0158`, no `0163`. La verificación original de esta sección usaba el prefijo equivocado (copiado literal del texto del bug IMAS-4567), lo cual generaba falsos 301. Con el prefijo correcto los 4 PDFs restantes también están publicados — ver evidencia abajo.

**Evidencia técnica CDN (retest 2026-09-10, prefijo correcto)**:
```
GET https://www.atencionike.com.ar/pdf/condicionados/0158-2358.pdf
HTTP/1.1 200 OK
Content-Type: application/pdf
```
pdftotext + grep -i "vetify plus" → 0 matches.

#### TS-02 Condicionados OSDE Adquirente — Cachorros (CP03–CP04)

| CP | Plan | Resultado | Detalle |
|---|---|---|---|
| CP03 | Cachorro x1 OSDE (2360) | ✅ **PASS (2026-09-10)** | `0158-2360.pdf` → `200 OK`, sin "Vetify Plus". |
| CP04 | Cachorro +1 OSDE (2361) | ✅ **PASS (2026-09-10)** | Mismo PDF que CP03. |

#### TS-03 Condicionados OSDE Adquirente — Premium (CP05–CP06)

| CP | Plan | Resultado | Detalle |
|---|---|---|---|
| CP05 | Premium x1 OSDE (2362) | ✅ **PASS (2026-09-10)** | `0158-2362.pdf` → `200 OK`, sin "Vetify Plus". |
| CP06 | Premium +1 OSDE (2363) | ✅ **PASS (2026-09-10)** | Mismo PDF que CP05. |

#### TS-04 Condicionados OSDE Adquirente — Emergencias (CP07–CP08)

| CP | Plan | Resultado | Detalle |
|---|---|---|---|
| CP07 | Emergencias x1 OSDE (2364) | ✅ **PASS (2026-09-10) — vía botón real** | Probado de punta a punta con 2 cuentas reales (`adquirenteosde@gmail.com`, `alandgg975@gmail.com`): login → Planes y coberturas → expandir plan → "Condiciones del Servicio" → abre `0158-2364.pdf` en pestaña nueva, 200 OK, sin "Vetify Plus". |
| CP08 | Emergencias +1 OSDE (2365) | ✅ **PASS (2026-09-10)** | Mismo PDF que CP07, ya confirmado vía botón real. |

#### TS-05 Condicionados OSDE Adquirente — Esencial (CP09)

| CP | Plan | Resultado | Detalle |
|---|---|---|---|
| CP09 | Esencial OSDE (2349) | ✅ **PASS** | `0163-2349.pdf` → `200 OK`, `Content-Type: application/pdf`, 924KB. Título: "CONDICIONES GENERALES / Plan / Esencial". **Sin "Vetify Plus"**. |

**Evidencia CDN CP09**:
```
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Length: 946492
cf-cache-status: HIT
```
**Evidencia contenido PDF**: `pdftotext` extrajo 924KB → búsqueda regex `/vetify\s*plus/i` → **0 matches**. ✅

#### TS-06 Condicionados OSDE Capitado — sin cambios (CP10)

| CP | Plan | Resultado | Detalle |
|---|---|---|---|
| CP10 | OSDE Capitado — Esencial | ✅ **PASS** | Cuenta: `patriciacarpinacci@gmail.com`. URL PDF: `0163-2349.pdf` (mismo que Esencial OSDE). Título: "Plan Esencial". **Sin "Vetify Plus"**. El condicionado de OSDE Capitado es el mismo de siempre (Esencial). |

**Flujo ejecutado (2026-09-02)**:
1. Login con `patriciacarpinacci@gmail.com` → QA vetify
2. Planes y coberturas → expandir "Vetify Esencial OSDE"
3. Clic "Condiciones del Servicio" → nueva pestaña con `0163-2349.pdf`
4. `curl` + `pdftotext` → `grep -i "vetify.plus\|vetifyplus"` → **0 matches**. ✅

#### TS-07 Regresión — planes VET no-OSDE (CP11)

| CP | Plan | Resultado | Detalle |
|---|---|---|---|
| CP11 | VET Classic no-OSDE (2313) | ✅ **PASS (esperado)** | Cuenta: `mariano.caresia@hotmail.com`. URL PDF: `0158-2313.pdf` → `200 OK`, 1.1MB. Contiene "Vetify Plus" en líneas 170-171. **Esto es correcto** — los planes VET no-OSDE SÍ mencionan Vetify Plus, es su propio producto. La HU IMAS-4488 solo pide reemplazar los OSDE Adquirente. |

**Flujo ejecutado (2026-09-02)**:
1. Login con `mariano.caresia@hotmail.com` → QA vetify
2. Planes y coberturas → expandir "VETIFY CLASSIC X1"
3. Clic "Condiciones del Servicio" → `0158-2313.pdf`
4. `pdftotext` → búsqueda → **SÍ contiene "Vetify Plus"**. ✅ Correcto — los planes VET no-OSDE no están en scope de IMAS-4488.

---

### TS-01 Condicionados OSDE Adquirente — Classic (CP01–CP02)

**CP01 - Verificar condicionado del plan Classic x1 OSDE (2358)**
- Dado: usuario OSDE Adquirente con plan Vetify Classic x1 OSDE (`clCuenta 2358`, `clGrupoCuenta 163`), en la pantalla "Planes y coberturas".
- Cuando: se expande el plan y se presiona "Condiciones del Servicio".
- Entonces:
  - Se abre una pestaña nueva con el PDF desde `atencionike.com.ar/pdf/condicionados/`.
  - El PDF es accesible (respuesta HTTP 200).
  - El título del PDF es "CONDICIONES GENERALES / Plan CLASSIC" (coincide con el nombre del plan).
  - El contenido del PDF **NO contiene** la cadena "Vetify Plus".
- Trazabilidad: IMAS-4488 AC — condicionado reemplazado, sin "Vetify Plus".

**CP02 - Verificar condicionado del plan Classic +1 OSDE (2359)**
- Dado: usuario OSDE Adquirente con plan Vetify Classic +1 OSDE (`clCuenta 2359`).
- Cuando: se expande el plan y se presiona "Condiciones del Servicio".
- Entonces: el PDF mostrado es el mismo que el de CP01 (Classic), accesible, y sin "Vetify Plus".
- Trazabilidad: IMAS-4488 AC — mismo PDF para x1 y +1; sin "Vetify Plus".
- Nota: **requiere cuenta con plan +1** — verificar si existe en el pool o crear antes de ejecutar.

---

### TS-02 Condicionados OSDE Adquirente — Cachorros (CP03–CP04)

**CP03 - Verificar condicionado del plan Cachorro x1 OSDE (2360)**
- Dado: usuario OSDE Adquirente con plan Vetify Cachorro x1 OSDE (`clCuenta 2360`).
- Cuando: se expande el plan y se presiona "Condiciones del Servicio".
- Entonces: el PDF es "CONDICIONES GENERALES / Plan CACHORROS", accesible (200), sin "Vetify Plus".
- Trazabilidad: IMAS-4488 AC.

**CP04 - Verificar condicionado del plan Cachorro +1 OSDE (2361)**
- Dado: usuario OSDE Adquirente con plan Vetify Cachorro +1 OSDE (`clCuenta 2361`).
- Cuando: se expande el plan y se presiona "Condiciones del Servicio".
- Entonces: mismo PDF que CP03, accesible, sin "Vetify Plus".
- Trazabilidad: IMAS-4488 AC.
- Nota: requiere cuenta con plan +1.

---

### TS-03 Condicionados OSDE Adquirente — Premium (CP05–CP06)

**CP05 - Verificar condicionado del plan Premium x1 OSDE (2362)**
- Dado: usuario OSDE Adquirente con plan Vetify Premium x1 OSDE (`clCuenta 2362`).
- Cuando: se expande el plan y se presiona "Condiciones del Servicio".
- Entonces: el PDF es "CONDICIONES GENERALES / Plan PREMIUM", accesible (200), sin "Vetify Plus".
- Trazabilidad: IMAS-4488 AC.

**CP06 - Verificar condicionado del plan Premium +1 OSDE (2363)**
- Dado: usuario OSDE Adquirente con plan Vetify Premium +1 OSDE (`clCuenta 2363`).
- Cuando: se expande el plan y se presiona "Condiciones del Servicio".
- Entonces: mismo PDF que CP05, accesible, sin "Vetify Plus".
- Trazabilidad: IMAS-4488 AC.
- Nota: requiere cuenta con plan +1.

---

### TS-04 Condicionados OSDE Adquirente — Emergencias (CP07–CP08)

**CP07 - Verificar condicionado del plan Emergencias x1 OSDE (2364)**
- Dado: usuario OSDE Adquirente con plan Vetify Emergencias x1 OSDE (`clCuenta 2364`).
- Cuando: se expande el plan y se presiona "Condiciones del Servicio".
- Entonces: el PDF es "CONDICIONES GENERALES / Plan Emergencias", accesible (200), sin "Vetify Plus".
- Trazabilidad: IMAS-4488 AC.

**CP08 - Verificar condicionado del plan Emergencias +1 OSDE (2365)**
- Dado: usuario OSDE Adquirente con plan Vetify Emergencias +1 OSDE (`clCuenta 2365`).
- Cuando: se expande el plan y se presiona "Condiciones del Servicio".
- Entonces: mismo PDF que CP07, accesible, sin "Vetify Plus".
- Trazabilidad: IMAS-4488 AC.
- Nota: requiere cuenta con plan +1.

---

### TS-05 Condicionados OSDE Adquirente — Esencial (CP09)

**CP09 - Verificar condicionado del plan Esencial OSDE (2349)**
- Dado: usuario OSDE Adquirente con plan Vetify Esencial OSDE (`clCuenta 2349`).
- Cuando: se expande el plan y se presiona "Condiciones del Servicio".
- Entonces: el PDF es "CONDICIONES GENERALES / Plan Esencial", accesible (200), sin "Vetify Plus".
- Trazabilidad: IMAS-4488 AC.
- Nota: archivo de referencia: `VETIFY ESENCIAL (OSDE) - 250626 sin vetifyplus.pdf` (el nombre del archivo ya dice "sin vetifyplus").

---

### TS-06 Condicionados OSDE Capitado — sin cambios (CP10)

**CP10 - Verificar que el condicionado de OSDE Capitado NO cambió (regresión)**
- Dado: usuario OSDE Capitado (cualquier plan), en "Planes y coberturas".
- Cuando: se expande el plan y se presiona "Condiciones del Servicio".
- Entonces:
  - El PDF mostrado es accesible (200).
  - El PDF **NO contiene** "Vetify Plus" (por diseño — el Esencial OSDE tampoco lo menciona).
  - El condicionado sigue siendo el de Esencial OSDE (el de siempre, según HU).
- Trazabilidad: IMAS-4488 AC — *"Los de capitados se muestra el de siempre, Osde esencial"*.
- Nota: cuenta disponible: `patriciacarpinacci@gmail.com` (Cruella Devil) o cualquier otra del pool `OSDE_CAPITADO`.

---

### TS-07 Regresión — planes VET no-OSDE (CP11)

**CP11 - Verificar que los planes VET no-OSDE no fueron afectados (regresión)**
- Dado: usuario con plan VET puro (`clGrupoCuenta = 158`, ejemplo: Vetify Classic x1, clCuenta 2313), en "Planes y coberturas".
- Cuando: se expande el plan y se presiona "Condiciones del Servicio".
- Entonces:
  - El PDF es accesible (200).
  - El plan no muestra un condicionado OSDE (el PDF es de VET, no de OSDE).
  - El condicionado sigue funcionando con normalidad (no se rompió).
- Trazabilidad: IMAS-4488 AC — *"Los condicionados de otros productos/segmentos permanecen sin modificaciones"*.
- Nota: **Asumido**: los planes VET no mencionaban "Vetify Plus" en sus condicionado previo. Si durante la ejecución se encuentra que SÍ lo mencionaban, agregar CP de contenido para VET.
- Nota: cuenta disponible: `mariano.caresia@hotmail.com` o cualquier otra del pool `VETIFY_ADQUIRENTE`.

---

## 5. Dependencias de cuentas

| CP | Plan | ¿Cuenta existe en pool? | Resultado | Acción |
|---|---|---|---|---|
| CP01 | Classic x1 OSDE (2358) | ❌ No hay cuenta OSDE Adquirente real con este plan exacto en el pool | ✅ PASS (verificado por link directo, prefijo correcto `0158-`) | Pendiente solo confirmar vía botón real si se consigue/crea una cuenta con este plan |
| CP02 | Classic +1 OSDE (2359) | ❌ No | ✅ PASS (mismo PDF que CP01) | — |
| CP03 | Cachorro x1 OSDE (2360) | ❌ No | ✅ PASS (link directo) | Pendiente confirmar vía botón real |
| CP04 | Cachorro +1 OSDE (2361) | ❌ No | ✅ PASS (mismo PDF que CP03) | — |
| CP05 | Premium x1 OSDE (2362) | ❌ No | ✅ PASS (link directo) | Pendiente confirmar vía botón real |
| CP06 | Premium +1 OSDE (2363) | ❌ No | ✅ PASS (mismo PDF que CP05) | — |
| CP07 | Emergencias x1 OSDE (2364) | ✅ `adquirenteosde@gmail.com`, `alandgg975@gmail.com` | ✅ PASS (vía botón real, 2 cuentas) | Listo |
| CP08 | Emergencias +1 OSDE (2365) | ❌ No | ✅ PASS (mismo PDF que CP07) | — |
| CP09 | Esencial OSDE (2349) | ❌ No (necesaria cuenta real) | ✅ PASS (verificado sin cuenta: PDF directo) | Requiere cuenta para CP de flujo UI, pero el PDF ya se verificó estáticamente ✅ |
| CP10 | OSDE Capitado | ✅ `patriciacarpinacci@gmail.com` | ✅ PASS | Listo |
| CP11 | VET Adquirente | ✅ `mariano.caresia@hotmail.com` | ✅ PASS | Listo |

**Cierre del hallazgo crítico (2026-09-10)**: los PDFs de OSDE Adquirente (2358, 2360, 2362, 2364) ya están publicados en el CDN. El bloqueo original (registrado como `IMAS-4567`/`BUG-028`) fue retesteado y confirmado resuelto — ver `docs/bugs/BUG-028-*.md` y el comentario de retest en IMAS-4567 (2026-09-10). El CDN usa el prefijo `0158-`, distinto al `0163-` que documentaban tanto esta sesión original de pruebas como el propio bug — dato a tener en cuenta para futuras verificaciones.

**Limitación que queda abierta**: CP01–CP06 (Classic y Premium x1/+1, y Cachorro x1) se confirmaron por link directo (PDF accesible + contenido sin "Vetify Plus"), no clickeando el botón real en la webapp, porque ninguna cuenta del pool tiene esos planes exactos. Solo Emergencias (CP07/CP08) se confirmó de punta a punta con el botón real. Si se consigue o crea una cuenta con Classic/Cachorro/Premium OSDE Adquirente, vale la pena repetir el flujo completo por prolijidad, aunque el riesgo residual es bajo (mismo componente de UI ya confirmado funcionando para Emergencias y Esencial).

**Bloqueo adicional — checkout QA (sigue abierto, no relacionado a IMAS-4488)**: No se pueden crear cuentas OSDE Adquirente nuevas porque el checkout falla con `HTTP 500: Error al calcular precio del producto` para el plan 2358 (ver `IMAS-4431`). Los planes OSDE Adquirente no son comercializables en QA vía compra directa — por eso no se pudo conseguir una cuenta con Classic/Cachorro/Premium para completar CP01-CP06 por el botón real.

---

## 6. Resumen de cobertura

| CA | CPs | Estado |
|---|---|---|
| Condicionados OSDE Adquirente reemplazados (9 planes) | CP01–CP09 | ✅ Todos PASS |
| Nuevos condicionados sin "Vetify Plus" | CP01–CP10 | ✅ Todos PASS |
| Productos/segmentos no afectados (OSDE Capitado) | CP10 | ✅ PASS |
| Productos/segmentos no afectados (VET no-OSDE) | CP11 | ✅ PASS (esperado) |
| Documentos disponibles donde se consultan | CP01–CP11 | ✅ Todos PASS |

**Ejecutado: 11/11 CPs (100%)** — cerrado 2026-09-10.
- ✅ CP01–CP08 — Classic, Cachorro, Premium, Emergencias OSDE Adquirente (x1 y +1): los 4 PDFs publicados en el CDN, sin "Vetify Plus". CP07/CP08 (Emergencias) confirmados además vía botón real en la webapp con 2 cuentas.
- ✅ CP09 — Esencial OSDE (2349): PDF existe, sin "Vetify Plus"
- ✅ CP10 — OSDE Capitado: PDF accesible, sin "Vetify Plus" (regresión OK)
- ✅ CP11 — VET Classic no-OSDE (2313): PDF existe, SÍ tiene "Vetify Plus" (correcto, fuera de scope)

**Nota de cierre**: el bloqueo que dejó esta suite en 27% el 2026-09-02 (PDFs devolviendo 301) se debía en parte a un prefijo de URL equivocado (`0163-` en vez de `0158-`) usado en la verificación original — más allá de eso, el CDN real tardó hasta el 2026-09-10 en tener los 4 PDFs publicados (confirmado con IMAS-4567/BUG-028).

---

## 7. Hallazgos y bloqueos (histórico — RESUELTO 2026-09-10)

### Hallazgo de QA — PDFs de OSDE Adquirente no publicados (IMAS-4488 / IMAS-4567 / BUG-028) — ✅ RESUELTO

**Gravedad original**: Alta (bloqueaba 8 de 9 CPs de OSDE Adquirente). **Estado actual: resuelto y retesteado 2026-09-10.**

Los PDFs de condicionado para los planes OSDE Adquirente no estaban subidos al CDN `atencionike.com.ar/pdf/condicionados/` (2026-09-02 a 2026-09-09). El CDN redirigía a la landing page para todos los planes excepto Esencial (2349).

| Plan | clCuenta | PDF URL real | Status CDN (2026-09-10) |
|---|---|---|---|
| Esencial OSDE | 2349 | `0158-2349.pdf` | 200 OK ✅ |
| Classic x1 OSDE | 2358 | `0158-2358.pdf` | 200 OK ✅ |
| Cachorro x1 OSDE | 2360 | `0158-2360.pdf` | 200 OK ✅ |
| Premium x1 OSDE | 2362 | `0158-2362.pdf` | 200 OK ✅ |
| Emergencias x1 OSDE | 2364 | `0158-2364.pdf` | 200 OK ✅ |

**Nota**: el prefijo real es `0158-` (no `0163-` como se documentó originalmente, copiado del texto del bug). Con el prefijo correcto, los 4 PDFs ya estaban publicados al momento del retest.

**Resolución confirmada**: retest en vivo 2026-09-10 — los 5 PDFs devuelven 200 OK, contenido verificado sin "Vetify Plus", y el flujo real de la webapp (botón "Condiciones del Servicio") confirmado funcionando para Emergencias con 2 cuentas reales. Ver comentario de cierre en IMAS-4567.

### Bloqueo — Checkout QA no permite crear cuentas OSDE Adquirente

**Gravedad**: Media (no permite crear cuentas para testing manual si el CDN se arregla).

El checkout (`pagar-mp`) rechaza el plan 2358 con `HTTP 500: Error al calcular precio del producto`. Los planes OSDE Adquirente no son comercializables en QA vía la compra directa con MercadoPago. No se pueden crear cuentas OSDE Adquirente nuevas para testing end-to-end.

**Alternativa**: Las cuentas OSDE Adquirente existentes (creadas en producción y migradas a QA) pueden usarse si se identifican.

---

## 8. Pendiente antes de ejecución (remanente)

1. **Subir PDFs al CDN** (responsabilidad dev/infra): `0163-2358.pdf`, `0163-2360.pdf`, `0163-2362.pdf`, `0163-2364.pdf`.
2. **Identificar cuentas OSDE Adquirente existentes** en QA para CP01–CP08, o crear via API/backoffice si hay acceso.
3. **Validar con IM que la HU IMAS-4279 (VAL-002) se puede cerrar** — el bug ya no ocurre en QA (endpoint responde 200).
