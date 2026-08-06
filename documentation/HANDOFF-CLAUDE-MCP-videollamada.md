# 🤝 Handoff para Claude Code (MCP Playwright) — Automatización Videollamada (rediseño)

> **Por qué existe este documento**: se trabajó todo el análisis y diseño de esta tarea con GitHub Copilot Chat, pero en este entorno el MCP de Playwright (navegador) está bloqueado — no se puede explorar la UI real. Este documento es un **paquete de contexto completo** para que Claude Code (que sí tiene MCP Playwright disponible) continúe desde acá: explorar el ambiente QA real, validar el mapeo funcional contra la UI, y automatizar (POMs + specs) las 4 HUs del rediseño de videollamada.
>
> **Leer este documento completo antes de tocar nada.** Después, leer [`AGENTS.md`](../AGENTS.md) y [`CLAUDE.md`](../CLAUDE.md) de la raíz del repo (son el mapa de navegación y el índice de convenciones de este proyecto — tienen decision trees, reglas duras e inventario de skills en `.claude/skills/`).

---

## 1. Qué es este proyecto (automation-main)

Repo de automatización E2E con **Playwright + TypeScript** para varios productos/sitios del grupo Vetify/IKE:

| Producto | Carpeta specs | Notas |
|---|---|---|
| Vetify B2C | `tests/projects/vetify-b2c/` | Sitio de cara al dueño de mascota |
| **Vetify webapp** | `tests/projects/vetify-webapp/` | **Acá vive la videollamada** — panel interno del tutor |
| OSDE Adquirente | `tests/projects/osde-adquirente/` | |
| OSDE Capitado | `tests/projects/osde-capitado/` | Relevante para IMAS-3909 (límite de videollamadas anuales) |
| Flux Capitado | `tests/projects/flux-capitado/` | Mismo límite anual que OSDE Capitado |

Reporta con **Allure** (`allurerc.js`). Hay capa de API en `src/api/` además de la E2E. El gestor de tickets es **Jira sin Xray** — no hay tracking de test-execution en Jira, solo HU ↔ Bug directo.

### Comandos útiles

```bash
npm test                          # toda la suite Playwright
npx playwright test -g "TC-01"    # por título
npx playwright test --ui          # UI mode
npm run allure:report             # generar + abrir reporte Allure
npm run jira -- get <KEY>         # traer historia de Jira
npm run jira:check                # smoke test credenciales Jira
npm run figma                     # cliente Figma (scripts/figma/figma-client.mjs)
npm run lint / npm run typecheck  # calidad de código
```

### Reglas duras de este repo (resumen — el detalle completo está en `AGENTS.md`)

1. 🚫 **Nunca hardcodear URLs.** Usar `src/config/environment.ts` (`SiteId`, `getWebappBaseUrl`).
2. 🚫 **Nunca hardcodear credenciales.** Usar `UserProvider`/`userRequest` (pool de usuarios reales) — excepción solo si el caso de prueba es específicamente sobre credenciales inválidas.
3. 🚫 **Nunca duplicar locators** ya existentes en un POM — leer el POM completo antes de extenderlo (extender-nunca-romper).
4. 🚫 **Nunca agregar el decorator `@step`** a un método de POM — no existe en este proyecto. El step visible en Allure lo pone el spec con la función `step()`.
5. 🚫 **Nunca quitar los comentarios estructurados** (`// Precondiciones:`, `// Pasos:`, `// Resultado esperado:`) de un spec — son parte del contrato de legibilidad de este proyecto (a diferencia de otros proyectos QA del mismo equipo que sí prohíben comentarios inline).
6. ✅ **Siempre pedir OK explícito antes de crear un Defect en Jira** (`createDefect`) — es una escritura real e irreversible. Seguir `jira/jira-workflow.md`.
7. 🚫 **Nunca asumir comportamiento sin confirmar contra el ambiente real** cuando el mapeo lo marca como punto abierto (ver §6 de este documento).

---

## 2. Contexto completo de la tarea — cómo se llegó hasta acá

### 2.1 Origen: análisis de Figma

Se analizó en profundidad el archivo Figma `Dev - Vetify - Iniciativas y solicitudes` (`fileKey=YfysBYoQZB2Y0J0pLf3nMb`), página **"Videollamadas"** (`node-id=40001944-9407`), específicamente el frame **`Nuevo flujo Videollamada`** (`node-id=40001944-27644`) — el frame más grande de la página, con el flujo completo Mobile + Desktop y todas las casuísticas anotadas por diseño.

Extracción hecha con **`scripts/figma/figma-client.mjs`** (cliente REST de Figma, ya funcional en este repo) leyendo el árbol de nodos + texto literal de las anotaciones (`CardNotas`) — **no hicieron falta exports PNG**, el texto de las anotaciones tiene la regla de negocio exacta (copy de errores, límites numéricos, etc.). Si hace falta ver el detalle visual de una pantalla puntual: `node scripts/figma/figma-client.mjs image <FILE_KEY> <NODE_ID>`.

Resultado: **[`documentation/Videollamada-Nuevo-Flujo-Figma-Mapeo.md`](Videollamada-Nuevo-Flujo-Figma-Mapeo.md)** — documento de 18 secciones que mapea el flujo completo (ver §3 de este handoff para el índice).

### 2.2 Enriquecimiento con Jira (sprint actual)

El mapeo de Figma se contrastó y corrigió contra las **4 HUs del sprint actual**, todas hijas del epic **`IMAS-2877`**, estado **"In Validation"** (subtask de desarrollo = Hecho, subtask de QA = pendiente → listas para diseñar/automatizar):

| HU | Título | Cubre del mapeo | Subtask QA |
|---|---|---|---|
| [IMAS-3899](https://ikeasistencia-arg.atlassian.net/browse/IMAS-3899) | Solicitud de Videollamada sin Credencial Cargada | §4 | IMAS-3901 |
| [IMAS-3174](https://ikeasistencia-arg.atlassian.net/browse/IMAS-3174) | Rediseño Solicitud de Turno **x 1 mascota** (sin turno previo) | §3, §5-§9 | IMAS-3176 |
| [IMAS-3889](https://ikeasistencia-arg.atlassian.net/browse/IMAS-3889) | Rediseño Solicitud de Turno **+1 mascota** (sin turno previo) | §3, §5-§9 | IMAS-3891 |
| [IMAS-3909](https://ikeasistencia-arg.atlassian.net/browse/IMAS-3909) | Casuísticas especiales — Con turno previo (límites) | §13 | IMAS-3911 / IMAS-4063 |

Cada HU tiene un **comentario de validación de Paula Scalzo** (quien las pasó a "In Validation") con precisiones que **no estaban en Figma** y que se priorizan por sobre el diseño cuando hay diferencia — el detalle completo de cada corrección está en la [§0 del mapeo](Videollamada-Nuevo-Flujo-Figma-Mapeo.md#0-trazabilidad-con-hus-de-jira-sprint-actual-epic-imas-2877), puntos 1 a 9. Las más importantes para automatizar bien:

- **Cámara desde el celular**: confirmado que se puede usar (no era seguro en Figma).
- **Archivos**: tope de **5**, se pueden borrar, bloqueo específico de cámara al llegar al tope, **doble validación front + back** (hay que probar bypass de UI contra el backend directamente).
- **Calendario**: máximo 30 días de anticipación, también validado front + back.
- **Límite OSDE Capitado / Flux Capitado**: es **2 videollamadas POR AÑO**, no de por vida (corrección importante, en Figma parecía un tope total).
- **Secuencia exacta del límite "2 turnos por mascota"**: con 1 sola mascota el bloqueo aparece ANTES del selector de motivo; con múltiples mascotas se permite avanzar hasta elegir mascota, y ahí recién se bifurca (misma mascota bloqueada = error, otra mascota = continúa).

### 2.3 La discrepancia IMAS-3174 (RESUELTA — no es un punto abierto)

El comentario de validación de IMAS-3174 mencionaba una pantalla previa de selección de mascota que contradecía el título/alcance de esa misma HU (es el flujo de **1 sola mascota**, donde la mascota se auto-selecciona). Se investigó, el usuario revisó el video adjunto al comentario y **confirmó que fue un error de redacción** (texto copiado por error desde IMAS-3889, la HU multi-mascota). **Conclusión validada: vale lo que dice Figma — NO hay pantalla de selección de mascota en el flujo de 1 sola mascota**, se va directo a "Motivo de la consulta". Detalle completo en [`documentation/IMAS-3174-duda-para-daily.md`](IMAS-3174-duda-para-daily.md) (ya marcado como ✅ resuelto).

**No re-abrir esta pregunta** — es un hecho confirmado, no una suposición.

### 2.4 Diseño de casos de prueba (§18 del mapeo)

Se diseñaron **41 casos de prueba** con metodología basada en riesgo (`impacto × probabilidad`, skill `qa-risk-test-design` de este repo), con trazabilidad a los CA de cada HU y a los comentarios de Paula Scalzo. Resumen:

| HU | # Casos | Feliz | Negativos/borde | `[API]` bypass | ⚠️ Pendientes de confirmar |
|---|---|---|---|---|---|
| IMAS-3899 | 5 | 2 | 2 | 1 | 0 |
| IMAS-3174 | 8 | 5 | 3 | 0 | 1 |
| IMAS-3889 | 18 | 6 | 10 | 2 | 1 |
| IMAS-3909 | 10 | 4 | 5 | 0 | 1 |
| **Total** | **41** | **17** | **20** | **3** | **3** |

Los casos completos (con Dado/Cuando/Entonces, datos de prueba y trazabilidad) están en la [§18 del mapeo](Videollamada-Nuevo-Flujo-Figma-Mapeo.md#18-casos-de-prueba). Los marcados `[API]` exigen probar el bypass de frontend directo contra el backend (pedido explícito del comentario de IMAS-3889: "sortear estas validaciones desde el front no permite vulnerabilidades"). Los marcados ⚠️ dependen de un punto abierto real (ver §6 de este handoff) — no fijar la aserción exacta sin confirmar primero contra el ambiente.

---

## 3. Índice completo del mapeo funcional (`Videollamada-Nuevo-Flujo-Figma-Mapeo.md`)

Archivo: [`documentation/Videollamada-Nuevo-Flujo-Figma-Mapeo.md`](Videollamada-Nuevo-Flujo-Figma-Mapeo.md) (leerlo completo, es la fuente de verdad funcional).

```
0. Trazabilidad con HUs de Jira (sprint actual)
1. Visión general del flujo
2. Entrada al flujo (Home)
3. Selección de mascota
4. Validación de credencial de la mascota
5. Selector de motivo + comentarios adicionales
6. Adjuntar archivos (opcional)
7. Selección de día y horario
8. Pantalla de revisión
9. Pantalla de confirmación
10. Detalle del turno (ver / reprogramar / cancelar)
11. Ingreso a la videollamada (sala de espera)
12. Salida de la videollamada
13. Límites de turnos por mascota / cupo / OSDE Capitado
14-15. (variaciones Mobile/Desktop y responsive del selector de horario)
16. Puntos abiertos / a confirmar con negocio
17. Mapeo a POMs / fixtures existentes
18. Casos de prueba (41 casos, ver §2.4 de este handoff)
```

---

## 4. Ambiente y credenciales

- **URL QA de Vetify webapp**: `https://vetify-qa.ikeapp.com` (confirmado en `.env`, variable `VETIFY_WEBAPP_BASE_URL`). **No hardcodear esta URL en código** — el framework la lee de `src/config/environment.ts` vía `getWebappBaseUrl(SiteId.VETIFY_ADQUIRENTE)`. Para explorar con MCP Playwright manualmente sí podés navegar directo a esta URL.
- **Credenciales**: NO están en este documento a propósito (higiene de secretos). Viven en:
  - `.env` (raíz del repo, gitignorado) — tiene `VETIFY_WEBAPP_BASE_URL`, `AUTH_API_BASE_URL`, tokens de Jira/Figma. Leerlo directamente si hace falta un valor puntual, no copiarlo a otros documentos.
  - `src/fixtures/users/pooled-users.json` y `fresh-users.json` (gitignorados, se generan/mantienen fuera del ciclo de vida del test) — usuarios reales de prueba, accedidos siempre vía `UserProvider`, nunca hardcodeados en un spec.
- **Tags de usuario disponibles hoy** (`src/providers/user/tags.ts`): `ERROR, VERIFIED, REGISTERED, UNREGISTERED, PENDING_ACTIVATION, ACTIVE, NO_PLAN, INACTIVE_PLAN, PLAN_WITHOUT_PET, NO_EMPTY_PLAN, NO_PET, WITH_PET`.
  - ⚠️ **Gap detectado**: no existe todavía un tag para "mascota sin credencial cargada" (necesario para IMAS-3899), "usuario con 2+ mascotas" (necesario para IMAS-3889/3909), "plan OSDE Capitado/Flux Capitado con cupo agotado" (necesario para IMAS-3909 CP06/CP07), ni "mascota con 2 turnos ya agendados" (necesario para IMAS-3909 CP01-CP04). **Antes de automatizar esos casos, verificar si ya existen usuarios pooled con esas condiciones en `pooled-users.json`, o si hay que ampliar `UserTag` + `user-factory.ts` para poder provisionarlos.** No inventar un mock — el proyecto prohíbe mockear datos, todo es contra QA real (ver `CLAUDE.md`/`AGENTS.md` de proyectos hermanos del mismo equipo, misma política).

---

## 5. Estado actual de POMs/fixtures relacionados a videollamada

Ubicación: `src/pages/vetify/webapp/videocall/` — **este POM es del flujo VIEJO** (pre-rediseño), no refleja el nuevo diseño de Figma. Hay que revisar y muy probablemente reescribir/extender casi todo.

| Archivo | Qué cubre hoy | Qué falta para el rediseño |
|---|---|---|
| `VideocallFormPage.ts` | Formulario de **una sola pantalla**: selección de mascota + motivo + calendario juntos (paso 1), luego archivos + comentario (paso 2) | El rediseño es **multi-paso** (selección de mascota como paso propio solo si hay +1 mascota → motivo → adjuntos → día/horario → revisión → confirmación). Hay que separar en varias page classes o remodelar esta con métodos por paso. |
| `CalendarSchedulingComponent.ts` | Selector de día/horario | Revisar si ya contempla el límite de 30 días y el diseño Bottom Sheet (mobile) / Drawer (desktop) del rediseño (ver §7 y §14-15 del mapeo). |
| `RescheduleVideocallPage.ts`, `VideocallViewPage.ts` | Ver/reprogramar turno | Existen, validar que el copy/diseño siga vigente tras el rediseño. |
| `CancelVideocallModal.ts` | Modal de cancelación (doble check) | Existe, validar copy contra §10 del mapeo. |

**No existe POM todavía para**:
- Pantalla de selección de mascota como paso independiente (IMAS-3889).
- Pantalla de revisión con opción de editar mascota (CA09 de IMAS-3889).
- Pantalla informativa de credencial faltante (IMAS-3899).
- Pantalla previa de "turnos ya agendados" / bloqueo por límite (IMAS-3909).
- Pantalla de espera (sala) + modal de salida con variantes de cortesía (§11-12 del mapeo).

**Fixtures ya wireados** en `tests/framework/base-test.ts` y `tests/framework/vetify-base-test.ts`: `videocallFormPage`, `createVideocallViewPage`, `createRescheduleVideocallPage`, `createCancelVideocallModal` — expuestos vía el fixture `container`. Cualquier POM nuevo debe registrarse ahí también para quedar disponible en los specs (ver skill `qa-pom-authoring`).

**Specs existentes**: `tests/projects/vetify-webapp/credentials.spec.ts` es el único spec del proyecto webapp — úsalo como **referencia de convención real** (estructura `TS-XX`/`TC-XX`, `test.use({ userRequest })`, `setAllureDetails()`, `step()`, comentarios `// Precondiciones:` / `// Pasos:` / `// Resultado esperado:`). **No hay ningún `.spec.ts` de videollamada todavía** — lo que armes acá es el primero.

---

## 6. Puntos abiertos — no asumir, confirmar contra el ambiente real primero

Extracto de la [§16 del mapeo](Videollamada-Nuevo-Flujo-Figma-Mapeo.md#16-puntos-abiertos--a-confirmar-con-negocio) (los ya resueltos por Jira no se repiten acá):

1. **Formatos y pesos exactos de archivos** (`.png/.jpg/.pdf` ~10MB, video `.mp4/.mov` ~1min/100MB) — las HUs confirman que la validación es front+back pero no repiten los valores numéricos exactos. **Confirmar contra el ambiente real** (intentar subir un archivo de cada formato/límite y leer el mensaje de error exacto).
2. **Tiempo de cortesía de 5 minutos** (reingreso post-turno) — parametrizable, no mencionado en las HUs.
3. **Botón "Ingresar" se habilita 5 min antes del turno** — hay una nota de Figma ("En Refi confirmamos que sí es posible") que sugiere que ya fue validado técnicamente, pero vale re-confirmar.
4. **Campo que se invalida al cambiar de mascota en revisión** (IMAS-3889 CA09) — no queda claro qué campo exacto se pierde/revalida. Confirmar en exploración manual.
5. **Analítica de bloqueos** (IMAS-3909 CA08) — no se sabe si el proyecto tiene forma de verificar eventos de dataLayer/tracker. Si no la tiene, reportarlo como brecha de cobertura, no omitirlo.

Para cada uno de estos: **explorar la UI real con MCP Playwright (`browser_navigate`, `browser_snapshot`, intentar el escenario límite) antes de escribir la aserción exacta del test**, y actualizar la §16 del mapeo con el resultado confirmado (mismo patrón usado para resolver la discrepancia de IMAS-3174 — marcar con `~~texto~~` + ✅ **Resuelto** cuando se confirme).

---

## 7. Qué se espera que hagas (Claude, con MCP Playwright)

### Paso 1 — Explorar el flujo real en QA

1. Navegar a `https://vetify-qa.ikeapp.com`, loguearte con un usuario de prueba válido (ver §4 — usar uno de `pooled-users.json` si ya existe uno con mascota y credencial cargada; si no, coordinar con el usuario humano para obtener uno).
2. Recorrer el flujo completo de solicitud de videollamada (Home → selección mascota si aplica → motivo → adjuntos → día/horario → revisión → confirmación) tomando snapshots (`browser_snapshot`) en cada pantalla.
3. Contrastar cada pantalla contra la sección correspondiente del mapeo (§2-§13) — confirmar que el diseño real coincide con lo documentado. Si hay diferencias, **documentarlas** (no asumir que el mapeo tiene razón porque sí — este mismo documento fue corregido varias veces con evidencia real).
4. Resolver los puntos abiertos de §6 de este handoff explorando los casos límite reales (subir archivo pesado, esperar el mensaje exacto, etc.).

### Paso 2 — Extender/crear los POMs

Seguir la skill `qa-pom-authoring` de este repo (adaptada a este proyecto — sin decorator `@step`, jerarquía `BasePage → VetifyWebappBasePage/VetifyWebappLoggedBasePage → <Pantalla>Page`, locators cacheados en el constructor). Regla de oro: **extender, nunca romper** — leer el POM completo antes de tocarlo.

Prioridad sugerida (de menor a mayor complejidad):
1. `VetifyWebappVideocallFormPage` — remodelar/dividir en pasos según el rediseño (motivo, adjuntos, día/horario ya tienen base).
2. Pantalla de selección de mascota (nueva) — para IMAS-3889.
3. Pantalla de revisión con edición de mascota (nueva) — para IMAS-3889 CA09.
4. Pantalla informativa de credencial faltante (nueva) — para IMAS-3899.
5. Pantalla de bloqueo por límite de turnos (nueva) — para IMAS-3909.

Registrar cada POM nuevo en `tests/framework/base-test.ts` y `vetify-base-test.ts` (fixture `container`) siguiendo el patrón ya usado por `videocallFormPage`/`videocallViewPage`/etc.

### Paso 3 — Escribir los specs

Seguir la skill `qa-spec-conventions` de este repo (estructura `test.describe('<Feature> Test Suite')` → `TS-XX` → `test.use({ userRequest })` → `test('TC-XX - <Producto> - <escenario>')`, con `setAllureDetails()` + `step()` + comentarios `// Precondiciones:` / `// Pasos:` / `// Resultado esperado:`). Usar `credentials.spec.ts` como plantilla real.

**Orden recomendado de automatización** (del piloto más simple a lo más complejo):
1. **IMAS-3174** (1 mascota, sin ramas de selección) — piloto, valida que el patrón de POMs/specs funciona end-to-end.
2. **IMAS-3899** (credencial faltante) — flujo corto, gate temprano.
3. **IMAS-3889** (+1 mascota) — reutiliza casi todo de 3174 + agrega selector/edición de mascota.
4. **IMAS-3909** (límites) — el más complejo, requiere datos de prueba específicos (mascota con 2 turnos, plan OSDE Capitado con cupo agotado).

Usar los 41 casos de la §18 del mapeo como base — no hace falta reinventar el diseño de casos, solo traducirlos a `.spec.ts` (y ajustar los marcados ⚠️ una vez confirmados en el Paso 1).

### Paso 4 — Correr y validar

Correr localmente antes de dar por terminado cualquier caso: `npx playwright test -g "TC-XX"`. Confirmar verde antes de reportar cobertura — no asumir que un spec "debería" pasar.

### Paso 5 — Documentar lo aprendido

Actualizar la §16 del mapeo con los puntos abiertos que se hayan confirmado (marcar `~~texto~~` + ✅ **Resuelto** + cómo se confirmó, mismo patrón que se usó para la discrepancia de IMAS-3174). Si se descubre algo nuevo no documentado (bug, comportamiento inesperado), seguir la skill `qa-bug-report` de este repo (clasificar PASS/ENV_BLOCKED/bug real antes de reportar) y pedir OK explícito antes de crear un Defect en Jira.

---

## 8. Reglas de comportamiento para esta tarea puntual

- **No inflar el estado de cobertura.** Si un POM/spec no está terminado o no corrió en verde, decirlo explícitamente.
- **No asumir comportamiento en los puntos ⚠️** — confirmar contra el ambiente real primero (ver §6).
- **No mockear datos ni URLs** — todo contra el ambiente QA real (`vetify-qa.ikeapp.com`), usuarios reales vía `UserProvider`.
- **No re-abrir la discrepancia de IMAS-3174** — está resuelta y confirmada (ver §2.3), no es un punto abierto.
- Si algo bloquea el avance de forma estructural (falta un tipo de usuario, un endpoint no responde, etc.), documentarlo como impedimento antes de improvisar un workaround silencioso.

---

## 9. Archivos clave de este handoff (resumen de rutas)

| Archivo | Qué es |
|---|---|
| [`documentation/Videollamada-Nuevo-Flujo-Figma-Mapeo.md`](Videollamada-Nuevo-Flujo-Figma-Mapeo.md) | Mapeo funcional completo (18 secciones) + 41 casos de prueba diseñados (§18) — **fuente de verdad funcional** |
| [`documentation/IMAS-3174-duda-para-daily.md`](IMAS-3174-duda-para-daily.md) | Registro de la discrepancia resuelta (§2.3 de este handoff) |
| [`docs/conocimiento-sistema.md`](../docs/conocimiento-sistema.md) | Entrada corta del módulo Videollamadas en la base de conocimiento del proyecto, con link al mapeo |
| `src/pages/vetify/webapp/videocall/` | POMs existentes (flujo viejo) a extender/reescribir |
| `tests/projects/vetify-webapp/credentials.spec.ts` | Único spec existente del proyecto webapp — plantilla de convención real |
| `src/providers/user/` | `UserProvider`, `UserTag`, pool de usuarios — leer `readme.md` antes de pedir un usuario nuevo |
| `AGENTS.md` / `CLAUDE.md` (raíz) | Mapa de navegación + índice de convenciones + inventario de skills de este repo |
| `.claude/skills/qa-pom-authoring/`, `qa-spec-conventions/`, `qa-risk-test-design/`, `qa-mcp-vs-pom/`, `qa-troubleshooting/`, `qa-bug-report/` | Skills a invocar durante esta tarea |
| `scripts/figma/figma-client.mjs`, `scripts/jira/jira-client.mjs` | Clientes ya funcionales si hace falta volver a consultar Figma o Jira |
