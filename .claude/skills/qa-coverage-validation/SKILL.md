---
name: qa-coverage-validation
description: Valida la cobertura de diseño de una HU — mapea cada criterio de aceptación a sus tests, clasifica cobertura (COMPLETO/PARCIAL/INSUFICIENTE), identifica gaps por taxonomía, calcula % de cobertura y emite veredicto APROBADO/CON OBSERVACIONES/RECHAZADO en un reporte de 10 secciones. Invocar al auditar la cobertura de una HU antes de declararla lista, o al cruzar CAs vs tests.
---

# Validación de Cobertura de Diseño por HU

> **Agnóstica del gestor de tickets.** Evalúa **cobertura de diseño** (no ejecución) de los CAs de una HU contra los tests existentes, identifica gaps y sugiere casos. **NO genera código** (`.spec.ts`) — solo el reporte Markdown. El esqueleto de 10 secciones, las etiquetas ✅/⚠️/❌, la taxonomía de 8 gaps y la fórmula de cobertura son universales.

> 🔗 Esta skill audita **cobertura de diseño CA→test** (una capa). El **DoD** audita el cierre (criterios universales + los del adaptador de tickets). Son capas distintas — no confundir "100% de diseño" con "HU al 100%" (ver el banner DoD obligatorio en la Sección 1).

## Modos de entrada

**Modo Manual (default, siempre funciona):** el usuario pega la HU completa (CAs) + la lista de tests/CPs que existen. Trabajás de ahí. Es el modo que funciona sin ningún gestor de tickets.

**Modo con gestor (si hay adaptador activo):** obtener los inputs vía la **interfaz de adaptador** (`adapters/ticket-manager.interface.md`):
- HU + CAs → `fetchStory(id)` (o pegada a mano).
- Tests vinculados reales → `listLinkedTests(id)` (no se llama a ningún gestor directo; la interfaz abstrae Jira/Xray/lo-que-sea).

### ⛔ Regla de estado real (NO asumir status)

El **estado de ejecución** (qué tests existen, cuáles pasan, qué defects hay) **NO se asume ni se infiere de los archivos locales**. Antes de emitir el reporte:

1. **Consultar en vivo** vía `listLinkedTests(id)` del adaptador activo (y/o leer un registro de cobertura auditado del proyecto, si lo hay).
2. **Si la consulta en vivo se ejecutó** → usar esos datos como estado real, citando la fuente + fecha en la Sección 10.
3. **Si NO se pudo consultar** (adaptador `none`, sin red/credenciales, el usuario no lo pidió, la interfaz devolvió `NO_VERIFICADO_EN_VIVO`) → marcar TODA la sección de estado de ejecución como **`⚠️ NO VERIFICADO EN VIVO`** y NO presentarla como real. El reporte sigue siendo válido como **cobertura de DISEÑO**; el estado de ejecución queda sin confirmar.

Citar la fuente en la Sección 10: `Manual input`, `gestor de tickets (vía adaptador, + fecha)`, o `⚠️ estado de ejecución NO verificado en vivo`. NO inventar conteos ni resultados.

## Criterios de evaluación

Por cada CA, etiquetar:
| Etiqueta | Significado |
|---|---|
| ✅ COMPLETO | Todos los sub-escenarios del CA tienen al menos un Test bien definido que los cubre (a nivel diseño). |
| ⚠️ PARCIAL | El CA está parcialmente cubierto — algunos sub-escenarios tienen Tests, otros faltan o están mal especificados. |
| ❌ INSUFICIENTE | El CA no tiene Tests asociados. Gap de máxima prioridad. |

Chequeos de calidad de diseño:
- **Calidad de pasos**: Dado/Cuando/Entonces completos y testeables; resultado esperado observable y específico (los casos no pueden ser genéricos — Acción + Datos + Resultado Esperado).
- **Tests duplicados**: dos Tests con título/propósito idénticos = issue de calidad, marcar crítico.
- **Saltos de numeración**: CP ausente (ej. CP22 falta cuando existen CP21 y CP23) = posibles casos borrados/no reportados.
- **Trazabilidad CA → Test**: cada CA debe mapear a uno o más Tests, explícita o inferiblemente vía título/pasos.

## Estructura del reporte (10 secciones obligatorias, en orden)

1. **Resumen Ejecutivo** — **encabezar OBLIGATORIAMENTE con el banner DoD** (ver regla abajo), luego metadata (id de HU, link al ticket si hay, sprint, status) + tabla de métricas: Total tests vinculados / Tests con pasos completos (%) / CAs cubiertos / Cobertura funcional estimada `~N%` / E2E documentado ✅❌ / API documentado ✅❌. **Estado global**: ✅ APROBADO (todos los CAs completos, sin gaps críticos) / ⚠️ APROBADO CON OBSERVACIONES (mayormente cubierto con gaps de calidad) / ❌ RECHAZADO (algún CA INSUFICIENTE o gap crítico).

   ### ⛔ Banner DoD obligatorio (primera línea de la Sección 1)

   **"Cobertura de diseño" ≠ "HU al 100% / lista para cierre".** Son capas distintas (ver el pre-flight DoD de `CLAUDE.md`, 8 criterios). El reporte NUNCA puede mostrar `~100%` a secas si hay deuda de cierre. Determinar el banner ASÍ:

   - Si hay **≥1 defect activo vinculado** (no Finalizado) **O** **≥1 CA en skip por bug** **O** la HU no cumple algún criterio DoD verificado:
     > **⚠️ DISEÑO COMPLETO PERO HU NO CERRABLE — `<N>` defect(s) activo(s) / `<M>` CA(s) en skip por bug.** La cobertura de diseño puede ser alta, pero la HU NO está al 100% (DoD). Ver §5 (brechas) y el DoD compuesto (`core/dod/`).
   - Si el **estado de ejecución NO se verificó en vivo** (ver regla de estado real):
     > **⚠️ COBERTURA DE DISEÑO solamente — estado de ejecución NO verificado en vivo.** Este reporte NO afirma que los Tests pasen ni que no haya defects; solo evalúa el diseño CA→Test.
   - Solo si **0 defects activos + 0 skips + estado verificado en vivo + todos los CAs ✅**:
     > **✅ Cobertura de diseño completa y sin deuda de cierre detectada** (confirmar igualmente contra el DoD de 8 criterios antes de declarar la HU al 100%).

   El número de cobertura (`~N%`) SIEMPRE se acompaña de la etiqueta **"(diseño)"** para que sea imposible confundirlo con "HU lista".
2. **Historia de Usuario** — Como/Quiero/Para + objetivos de negocio **inferidos** del CA+descripción (orientados a resultado, no técnicos).
3. **Criterios de Aceptación y Cobertura** — una subsección por CA: Dado/Cuando/Entonces condensado; tabla de estado (✅/⚠️/❌ + razón en 1 frase); **Tests que lo cubren** (lista con marcadores 🧪 diseñado / ✅ pasando); **Brechas identificadas** (solo si PARCIAL/INSUFICIENTE).
4. **Cobertura por Tipo de Prueba** — 4.1 API (tabla Área | Casos | Estado | con TOTAL), 4.2 E2E (si ausente, describir qué flujo E2E tendría sentido), 4.3 BD/integración si aplica.
5. **Brechas Identificadas** — IDs secuenciales `B01, B02…` en 3 tiers: 5.1 Críticas 🔴 / 5.2 Importantes 🟡 / 5.3 Mejoras 🔵. Tabla: ID | Tipo | Descripción (**título**: detalle) | CA Relacionado.
6. **Casos de Prueba Sugeridos** — IDs `CP-GAP-NN`. Tabla: ID | Título | Steps (Dado/Cuando/Entonces) | Resultado Esperado | Prioridad (Alta/Media/Baja). (Generarlos de verdad es trabajo del generador de casos de tu pipeline de carga, no de esta skill.)
7. **Análisis de Calidad del Suite** — 7.1 estructura/nombrado (nomenclatura, positivos, negativos, numeración, duplicados, trazabilidad); 7.2 madurez (completitud Dado/Cuando/Entonces, claridad del esperado, datos de prueba).
8. **Métricas de Cobertura** — resumen por CA (CA | Descripción | Estado) + footer con conteos. **Fórmula**: `((completos × 1) + (parciales × 0.5)) / total × 100`.
9. **Recomendaciones Priorizadas** — 3 horizontes: Inmediatas (antes de cerrar la HU) / Corto plazo / Mediano plazo. Cada recomendación referencia su gap ID (Bxx). Regla: toda 🔴 Crítica va en Inmediatas; toda 🟡 Importante en Inmediatas o Corto plazo; toda 🔵 Mejora en Corto/Mediano plazo.
10. **Fuentes de Datos** — tabla Fuente | Detalle. Ej: `Manual input | pegado por el usuario`; `gestor de tickets | listLinkedTests(id) vía adaptador, <fecha>`; o `⚠️ estado de ejecución NO verificado en vivo`.

## Taxonomía de gaps (valores exactos en la columna Tipo)

- `Calidad` — claridad, completitud y consistencia de los Tests.
- `Proceso` — estado/workflow del Test o de la HU.
- `Funcional` — falta cobertura de un CA, escenario de negocio sin probar.
- `Técnica` — automatización declarada, validación de schema, validación de BD.
- `Cobertura` — edge cases, seguridad, concurrencia.
- `Numeración` — saltos en la numeración de CPs.
- `Performance` — falta de tests no-funcionales (si la HU lo amerita).
- `E2E` — falta de tests end-to-end.

## Reglas

- Validar **diseño**, no ejecución: NO crear gaps por "no ejecutado" salvo que el usuario pida auditoría de ejecución.
- NO inventar tests, conteos, ni resultados — citar la fuente real (Manual / gestor vía adaptador).
- Cada gap de la Sección 5 debe tener una recomendación en la Sección 9.
- El ASCII/tabla de la Sección 8 debe coincidir con las evaluaciones de la Sección 3.
- NO generar `.spec.ts` ni `tests.md` — esta skill solo produce el reporte de cobertura.

## Workflow

1. Recolectar datos (Manual: input del usuario / con gestor: HU + tests + `listLinkedTests` vía adaptador).
2. Parsear CAs — cada escenario nombrado del CA es un CAn separado.
3. Mapear Tests a CAs vía títulos + contenido de pasos.
4. Evaluar calidad de diseño (nombrado, pasos, esperado, trazabilidad, secuencia, duplicados).
5. Identificar gaps en las 8 categorías, asignar IDs secuenciales `Bxx`.
6. Calcular métricas (fórmula Sección 8).
7. Escribir el reporte siguiendo las 10 secciones exactas.
8. Checklist final: todos los CAs en Sección 3; cada gap de Sección 5 con recomendación en Sección 9; Sección 8 coincide con Sección 3; fuente citada en Sección 10.
