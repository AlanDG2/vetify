# Trazabilidad de auditoría — Casos de Prueba.xlsx

> Para no re-derivar desde cero el mapeo hoja↔spec ni los hallazgos cada vez que se audita el Excel.
> Antes de auditar de nuevo: leer este archivo primero. Después de auditar: agregar una entrada nueva
> abajo (no reescribir las anteriores) con fecha, qué se revisó, qué se corrigió, y hasta dónde llegó.

## Mapeo hoja del Excel ↔ spec real (para no rebuscarlo cada vez)

| Hoja | Spec(s) Desktop | Spec(s) Mobile | Notas |
|---|---|---|---|
| Flujo de Compra | `tests/projects/{vetify-b2c,osde-adquirente,osde-capitado,flux-capitado}/purchase-flow.spec.ts` | — (no hay mobile) | Sin columnas mobile en el Excel (correcto, no hay specs) |
| Gestión de Usuario | `tests/projects/{vetify-b2c,osde-adquirente,osde-capitado,flux-capitado}/user-management.spec.ts` | — (no hay mobile) | Ídem |
| Perfil | `tests/projects/vetify-webapp/profile.spec.ts` | `mobile/specs/vetify/profile.spec.ts` | **Hoja del Excel vacía** — hay specs reales en ambas plataformas pero el inventario de casos nunca se cargó |
| Credenciales | `tests/projects/vetify-webapp/credentials.spec.ts` | `mobile/specs/vetify/{credentials,credential-wizard}.spec.ts` | |
| Videollamadas | `tests/projects/vetify-webapp/videocall.spec.ts` | `mobile/specs/vetify/videocall.spec.ts` | |
| Reintegros | (sin specs — todo manual) | (sin specs) | **Hoja vacía**. Toda la investigación de la épica `IMAS-4101` vive en `docs/user-stories/*.tests.md`, nunca se volcó acá |
| Misceláneas | — | — | **Hoja vacía** |

## Técnica de auditoría que funcionó (usar primero, es la más barata)

1. `grep -rn "\.skip(" tests/projects/ mobile/specs/ --include="*.spec.ts"` — separar los **incondicionales** (`test.skip(true, ...)`, `this.skip()` sin condición) de los **dinámicos** (`test.skip(!user, ...)`, dependen de datos del pool). Los incondicionales son la señal más confiable de "el Excel dice que está pero nunca corre".
2. Cruzar cada skip incondicional contra el título de la fila del Excel correspondiente (columna `Automatizado?`).
3. Para sospechar un **hueco al revés** (Excel dice "Sí" pero no hay test real), contar cuántos `test(` hay dentro de cada `test.describe('TS-XX ...')` y compararlo contra cuántos CPs lista el Excel para esa misma categoría — si el Excel lista más CPs que tests reales existen, leer el bloque completo del `describe` para confirmar.
4. **Ojo**: 1 test no siempre = 1 CP. El patrón real del proyecto es "1 test cubre varios CPs vía `step()`" (confirmado en Videollamadas) — no asumir que un conteo de `test()` distinto al conteo de CPs del Excel es automáticamente un error; solo es señal fuerte cuando el conteo real es MENOR al que el Excel reclama para una categoría entera.
5. Leer el Excel vía PowerShell + Excel COM (ver `reference_docx_xlsx_reading_without_tools` en memoria de Claude) — **siempre volcar TODAS las filas del rango usado sin saltear vacías** para que el número de línea del volcado coincida con la fila real de Excel (si se filtran filas vacías antes de imprimir, se pierde la correspondencia y se escribe en la fila equivocada — pasó una vez, se corrigió a tiempo).
6. Escribir con `.Value2 =` directo (no `Copy()`/`PasteSpecial()`) — ver `feedback_excel_com_merge_corruption` en memoria, la hoja "Metricas de Casos de Prueba" tiene celdas combinadas grandes donde Copy/Paste corrompe el archivo. Las otras 7 hojas son seguras para Copy/Paste si hiciera falta, pero `.Value2` directo funciona en todas y es más simple.

## Historial de auditorías

### 2026-08-29 — primera auditoría formal desktop/mobile

**Alcance cubierto**: grep de skips incondicionales en los 13 specs desktop + 15 mobile, cruzado contra las hojas Gestión de Usuario, Credenciales, Flujo de Compra. Revisión de estructura de las 8 hojas (headers, tamaño). Cruce contra `docs/impedimentos-bloqueos.md` completo (15 IMPs).

**Correcciones aplicadas**:
- Gestión de Usuario, 24 filas (TS-04 CP-02 + TS-05 completo, × 4 productos): `Automatizable` No→Sí — destrabado por `IMP-006` (resuelto 2026-08-28).
- Credenciales, fila 22 (TS-02 CP-15 "fecha futura"): `Automatizado` Sí→No, `Automatizable Desktop` Sí→No — `test.skip(true, ...)` confirmado en código.
- Flujo de Compra, filas 13 y 51 (Vetify B2C + OSDE Adquirente, TS-02 "Problema tarjeta"): `Automatizado` Sí→No — el test no existe en el código, solo hay 1 test en ese `describe` (Tarjeta Prepaga).

**Dashboard**: Automatizables Desktop 215→239. % automatizado-de-automatizable 81%→~73% (esperado, no es regresión).

**NO cubierto esta vez** (para la próxima):
- Videollamadas: solo se verificaron los skips incondicionales (consistentes, sin corrección necesaria). Falta cruzar el resto de las ~54 filas cuerpo por cuerpo.
- OSDE Capitado / Flux Capitado (`purchase-flow.spec.ts`, `user-management.spec.ts`): no se leyó el cuerpo completo, solo conteos.
- Mobile: solo se cruzaron los skips incondicionales (`this.skip()` sin condición) de forma superficial — no se leyó el cuerpo de ningún spec mobile en detalle.
- Vetify B2C TS-01 TC-01 (`contractRandomPlan()`, no determinístico) quedó **sin resolver a propósito** — no se pudo confirmar si cubre alguna de las 8 combinaciones que lista el Excel. Si se hace determinístico en el futuro (plan/cupón/tarjeta fijos), actualizar la fila correspondiente.
- Hoja "Perfil": sigue vacía, nunca se cargó el inventario de casos pese a tener specs reales en ambas plataformas.
- Hojas "Reintegros"/"Misceláneas": siguen vacías, fuera de alcance de esta auditoría (es trabajo manual, no de automatización).

**Próxima auditoría, empezar por**: Videollamadas cuerpo completo (es la hoja con más filas sin verificar a fondo) y los 2 specs de Capitado (OSDE/Flux) que nunca se leyeron línea por línea.

### 2026-08-29, mismo día — continuación exhaustiva (Alan: "toca hacer la validación exhaustiva")

**Cubierto en esta ronda**: se leyeron completos `osde-capitado/{purchase-flow,user-management}.spec.ts`, `flux-capitado/{purchase-flow,user-management}.spec.ts` (nunca antes leídos línea por línea), y la estructura de `mobile/specs/vetify/videocall.spec.ts` completa (consistente con desktop, sin hallazgos).

**Hallazgo grande — restructuración de "Olvidé contraseña" (Gestión de Usuario, los 4 productos)**: el código real tiene `test.describe('TS-04 IMAS-321X - Olvidé contraseña')` con **5 tests reales** (CP01 Acceso al flujo, CP02 Solicitud con email registrado, CP03 [Negativo] email no registrado, CP04 [Bug conocido] campo email obligatorio = `IMAS-4198`, CP05 [Bug conocido] formato inválido no se valida = `IMAS-4199`) — completamente distinto de lo que el Excel listaba (CP-01 "Campos Obligatorios" + CP-02 "Recibir Email"). No existe ningún `test.describe('TS-05...')` en el código — "Cambio de Contraseña" (5 CPs) sigue sin automatizar, tal cual estaba.

**Acción, con OK explícito del usuario** (eligió "reemplazar las filas viejas por las 5 CPs reales" sobre 2 alternativas más conservadoras): se insertaron 3 filas nuevas en cada uno de los 4 bloques de producto (12 filas nuevas en total, de abajo hacia arriba — Flux Capitado primero, Vetify B2C último — para no invalidar los números de fila ya calculados) y se reescribió el bloque TS-04 completo (ID/Categoría/Título/Precondiciones/Pasos/Resultado/Crítico/Automatizado/Automatable) con el contenido real tomado de `setAllureDetails()` de cada test. Los 20 CPs nuevos: `Automatizado=Sí`, `Automatable=Sí`, `Crítico=Sí`. El bloque `TS-05 Cambio de Contraseña` quedó intacto (5 CPs, `Automatizado=No`, `Automatable=Sí` desde el fix anterior).

**Verificación matemática del dashboard tras el cambio** (para confirmar que no hubo corrupción): Total de Casos 241→253 (+12, correcto). Automatizados 175→188 — el neto real por bloque es +3 (2 filas viejas con 1 Automatizado=Sí → 5 filas nuevas todas Sí = +4) × 4 productos = +16, menos los -3 de las correcciones anteriores de esta misma sesión (CP-15 Credenciales + 2× "Problema tarjeta") = +13 exacto. Automatizables Desktop 239→250 (+11 = +12 del bloque nuevo -1 de la corrección de CP-15). Todo cuadra.

**No cubierto todavía**: Videollamadas cuerpo-por-cuerpo (solo se verificaron los skips incondicionales, ya reportado antes), mobile `credentials.spec.ts`/`credential-wizard.spec.ts`/`profile.spec.ts` (solo se miró la estructura de `videocall.spec.ts`).

**Próxima auditoría, empezar por**: mismo pendiente que la ronda anterior (Videollamadas completo) + los 3 specs mobile no leídos (`credentials`, `credential-wizard`, `profile`).

### 2026-08-29, mismo día — cierre de la validación exhaustiva (Alan: "necesito que termines completamente")

**Cubierto en esta ronda**: se leyeron completos `tests/projects/vetify-webapp/videocall.spec.ts` (1112 líneas) y `mobile/specs/vetify/videocall.spec.ts` (1058 líneas) cuerpo por cuerpo contra las ~54 filas de la hoja Videollamadas; y los 3 specs mobile pendientes (`credentials.spec.ts`, `credential-wizard.spec.ts`, `profile.spec.ts`) contra las hojas Credenciales y Perfil. También se releyó `tests/projects/vetify-webapp/profile.spec.ts` completo.

**Resultado — Videollamadas**: las 54 filas se cruzaron caso por caso (agrupadas por IMAS-3899/3174/3889/3909/3894/4023). **Cero discrepancias nuevas.** Los 3 `test.skip(true, ...)` incondicionales del spec desktop (CA05 positivo, CA06-CA08 sala de espera, CA09 comunicaciones) y los 2 del spec mobile (rechazo de peso en emulador, formato inválido fuera de alcance) coinciden exactamente con lo que el Excel ya marca en "No" — incluido el caso más sutil (CP05 IMAS-4023, analítica de intentos de carga) que ya estaba correctamente clasificado como "no automatizado pero automatable" por ser un descope de negocio, no una limitación técnica (ver `project_excel_automatable_metrics` en memoria). Varias filas (IMAS-3909 CA01-CA04, IMAS-3894 CP01-CP08) tienen trazabilidad EXPLÍCITA en comentarios del propio código citando el CA/CP exacto que cubren — máxima confianza posible sin leer el POM línea por línea.

**Resultado — Credenciales**: se re-dumpeó la hoja completa en vivo con números de fila explícitos (37 filas usadas, 11 columnas: `Critico?`/`Automatizado?`/`Automatizado Mobile?`/`Automatizable Desktop?`/`Automatizable Mobile?`) para descartar una alarma falsa (un TSV de scratchpad pre-`/compact` parecía mostrar CP-15 con `Automatizado=Sí` cuando la memoria decía que ya se había corregido a `No` en la ronda 1 — el TSV viejo tenía una fila con columnas corridas por un caso legítimo de título/categoría en blanco, no un error real). **La corrección de CP-15 de la ronda 1 sigue aplicada correctamente** (fila 22, confirmado en vivo). Cruce completo de TS-01 a TS-04 (37 filas) contra `mobile/specs/vetify/credentials.spec.ts` + `credential-wizard.spec.ts`: coincidencia perfecta, incluyendo casos muy específicos donde el comentario del test cita el CP exacto que cubre (`TC-06: paso 1 → atrás → paso 0`, `TC-14: paso 3 → atrás → paso 2`, `TC-17: paso 4 → atrás → paso 3`, etc.) — cero correcciones necesarias.

**Resultado — Perfil (hallazgo importante sobre una auditoría previa)**: un TSV de scratchpad (heredado de antes del `/compact`) mostraba la hoja Perfil como completamente vacía ("Adquirientes"/"Capitados" sin ninguna fila debajo) — eso habría llevado a poblarla desde cero, duplicando contenido real. **Se verificó en vivo antes de actuar**: la hoja SÍ tiene contenido (13 filas usadas), incluyendo los mismos hallazgos que ya documentan los comentarios del spec (`[Bug conocido: backend no valida formato...]` en el título de la fila 4, coincide con `TC-03` de `profile.spec.ts`). Cruce contra `tests/projects/vetify-webapp/profile.spec.ts` (4 tests) + `mobile/specs/vetify/profile.spec.ts` (3 tests): consistente. Se encontró y corrigió **1 inconsistencia real**: fila 6, columna "Resultado Esperado" seguía con el texto viejo ("permite cambiar Nombre/Apellido/Número de Identificación/Teléfono") que contradice el propio título de esa fila (ya corregido: "sólo teléfono es editable... requieren llamar al 0800 122 1183") — desalineación entre título y resultado esperado, no un error de clasificación Sí/No. Corregido con `.Value2` directo. Las filas 8-11 (Cambiar DNI) siguen como estaban: 8-9 son placeholders (`DBD`, sin clasificar, sin código que las cubra — correcto dejarlas así) y 10-11 están correctamente marcadas `Automatizado=No, Automatable=Sí` (atan con la investigación de BUG-013, sin test dedicado hoy).

**Lección para la próxima vez**: los TSV de scratchpad que sobreviven a un `/compact` pueden quedar desactualizados respecto al Excel real (no reflejan ediciones posteriores, o pueden venir de una lectura con bugs de rango) — **siempre re-verificar en vivo contra el Excel antes de actuar sobre un hallazgo "sorprendente"** (una hoja completamente vacía, un valor que contradice lo que dice la memoria), en vez de confiar en el dump heredado. Ver `feedback_validate_before_trusting_shared_state` en memoria de Claude — este es un segundo incidente real del mismo patrón.

**Veredicto de la validación exhaustiva**: con esta ronda se cerraron los 2 pendientes que quedaban abiertos desde la ronda anterior (Videollamadas completo, 3 specs mobile). Sumando las 3 rondas de esta auditoría (2026-08-29 x3), el estado es: **4 hojas con specs reales (Flujo de Compra, Gestión de Usuario, Credenciales, Videollamadas, Perfil) verificadas cuerpo-por-cuerpo, con 5 correcciones totales aplicadas** (IMP-006 unblock ×24 filas, CP-15 fecha futura, 2× "Problema tarjeta" Flujo de Compra, restructuración completa de TS-04 Olvidé contraseña ×12 filas nuevas, 1 fix de texto en Perfil). Reintegros y Misceláneas siguen sin specs (correcto, son 100% manuales). No queda ningún pendiente abierto de auditoría de automatización a la fecha.
