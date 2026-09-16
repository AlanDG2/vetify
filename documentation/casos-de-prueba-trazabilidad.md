# Trazabilidad de auditoría — Casos de Prueba.xlsx

> Para no re-derivar desde cero el mapeo hoja↔spec ni los hallazgos cada vez que se audita el Excel.
> Antes de auditar de nuevo: leer este archivo primero. Después de auditar: agregar una entrada nueva
> abajo (no reescribir las anteriores) con fecha, qué se revisó, qué se corrigió, y hasta dónde llegó.

## Mapeo hoja del Excel ↔ spec real (para no rebuscarlo cada vez)

| Hoja | Spec(s) Desktop | Spec(s) Mobile | Notas |
|---|---|---|---|
| Flujo de Compra | `tests/projects/{vetify-b2c,osde-adquirente,osde-capitado,flux-capitado}/purchase-flow.spec.ts` | — (no hay mobile) | Sin columnas mobile en el Excel (correcto, no hay specs) |
| Gestión de Usuario | `tests/projects/{vetify-b2c,osde-adquirente,osde-capitado,flux-capitado}/user-management.spec.ts` | — (no hay mobile) | Ídem |
| Perfil | `tests/projects/vetify-webapp/profile.spec.ts` | `mobile/specs/vetify/profile.spec.ts` | Ya NO está vacía (nunca lo estuvo realmente — un TSV de scratchpad viejo lo hizo parecer así, ver entrada 2026-08-29). 13 filas reales, verificadas cuerpo a cuerpo |
| Credenciales | `tests/projects/vetify-webapp/credentials.spec.ts` | `mobile/specs/vetify/{credentials,credential-wizard}.spec.ts` | |
| Videollamadas | `tests/projects/vetify-webapp/videocall.spec.ts` | `mobile/specs/vetify/videocall.spec.ts` | |
| Reintegros | (sin specs) | `mobile/specs/vetify/reintegros.spec.ts` (1 test real, sin equivalente Desktop) | Ya NO está vacía (corregido 2026-08-29) — tiene 1 fila real. La investigación de la épica `IMAS-4101` sigue viviendo en `docs/user-stories/*.tests.md`, no se volcó acá (es manual, no automatización) |
| Misceláneas | — | 8 specs mobile-only del menú lateral (`pets`, `plans`, `services`, `ayuda`, `historial-atencion`, `vetify-plus`, `asistencia-domicilio`, `facturas`) | Ya NO está vacía (corregido 2026-08-29) — 9 CPs reales (Servicios tiene 2 tests) |

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

### 2026-08-29, mismo día — Alan pregunta directo "¿está COMPLETAMENTE auditado?"; se encuentra 1 hueco real más

Pregunta pointed del usuario después de que se reportó la auditoría como "cerrada". En vez de responder "sí" en base a lo ya hecho, se verificaron en vivo 3 puntos de incertidumbre real que quedaban sin cerrar:

1. **`tests/projects/vetify-webapp/credentials.spec.ts` (desktop, 1250 líneas) nunca se había releído completo esta sesión** — la ronda 1 solo hizo skip-grep + comparación contra el dump del Excel, no una lectura línea por línea como sí se hizo con `videocall.spec.ts`/`profile.spec.ts`. Se leyó completo ahora: **cero discrepancias nuevas** — CP-15 y las 3 filas de cámara están literalmente comentadas en el código (`/* ... */`, ni siquiera es un `test.skip` activo), CP-02 de TS-03 ya tiene su propia nota explicando por qué el Excel quedó desactualizado. Nota de calidad de código (no de Excel): hay un bug real de naming, existen 2 tests llamados `TC-23` en el archivo (debería ser TC-23/TC-24) — no afecta la precisión del Excel.
2. **De los 15 specs mobile, solo 4 se habían leído completos** (`videocall`, `credentials`, `credential-wizard`, `profile`) — los otros 11 (`login`, `pets`, `plans`, `services`, `ayuda`, `reintegros`, `historial-atencion`, `vetify-plus`, `asistencia-domicilio`, `navigation`, `facturas`) no. Se verificó cuáles de esos 11 realmente importan para el Excel: la mayoría no tiene ninguna hoja que los rastree (Login/Plans/Servicios/Ayuda/Historial/Vetify Plus/Asistencia a domicilio/Navigation/Facturas no son hojas del Excel — quedan fuera del alcance de esta auditoría por diseño, no son un hueco). `pets.spec.ts` se grepeó puntualmente (no leído completo) para confirmar una referencia cruzada de un comentario en `credentials.spec.ts` ("TC-02 ya está cubierto por pets.spec.ts TC-01") — confirmado que el test citado existe y hace lo que el comentario afirma.
3. **`reintegros.spec.ts` (mobile) SÍ importa y no se había mirado** — tiene 1 test real (`TC-01 - Muestra la sección de cuentas de acreditación`), sin equivalente Desktop, que además documenta en vivo el bug `BUG-007`/`IMAS-4279` (el historial de reintegros falla por un DNI con formato inválido). La hoja "Reintegros" del Excel estaba genuinamente vacía (a diferencia de la falsa alarma de "Perfil" de la ronda anterior — acá si era cierto). **Se agregó 1 fila nueva** con el contenido real de ese test.

**Conclusión honesta**: la auditoría NO estaba (ni está ahora) matemáticamente "100% completa" en el sentido de "cada línea de cada spec fue releída." Lo que sí es cierto: cada hoja del Excel con contenido real (Flujo de Compra, Gestión de Usuario, Credenciales, Videollamadas, Perfil, y ahora Reintegros con 1 fila) fue cruzada contra el código que le corresponde, con al menos un nivel de verificación fuerte (línea por línea para las 5 primeras, grep dirigido + comentario cruzado para Reintegros). Sigue **deliberadamente sin resolver**: las 8 filas de combinaciones individuales de Vetify B2C Flujo de Compra TS-01 (`contractRandomPlan()` no es determinístico, no se puede confirmar cuál cubre el test real). Sigue **fuera de alcance por diseño**: hoja "Misceláneas" (vacía, sin specs de ningún lado que la llenen) y los 9 specs mobile que no tienen hoja de Excel asociada.

### 2026-08-29, mismo día — cierre de la validación exhaustiva (Alan: "necesito que termines completamente")

**Cubierto en esta ronda**: se leyeron completos `tests/projects/vetify-webapp/videocall.spec.ts` (1112 líneas) y `mobile/specs/vetify/videocall.spec.ts` (1058 líneas) cuerpo por cuerpo contra las ~54 filas de la hoja Videollamadas; y los 3 specs mobile pendientes (`credentials.spec.ts`, `credential-wizard.spec.ts`, `profile.spec.ts`) contra las hojas Credenciales y Perfil. También se releyó `tests/projects/vetify-webapp/profile.spec.ts` completo.

**Resultado — Videollamadas**: las 54 filas se cruzaron caso por caso (agrupadas por IMAS-3899/3174/3889/3909/3894/4023). **Cero discrepancias nuevas.** Los 3 `test.skip(true, ...)` incondicionales del spec desktop (CA05 positivo, CA06-CA08 sala de espera, CA09 comunicaciones) y los 2 del spec mobile (rechazo de peso en emulador, formato inválido fuera de alcance) coinciden exactamente con lo que el Excel ya marca en "No" — incluido el caso más sutil (CP05 IMAS-4023, analítica de intentos de carga) que ya estaba correctamente clasificado como "no automatizado pero automatable" por ser un descope de negocio, no una limitación técnica (ver `project_excel_automatable_metrics` en memoria). Varias filas (IMAS-3909 CA01-CA04, IMAS-3894 CP01-CP08) tienen trazabilidad EXPLÍCITA en comentarios del propio código citando el CA/CP exacto que cubren — máxima confianza posible sin leer el POM línea por línea.

**Resultado — Credenciales**: se re-dumpeó la hoja completa en vivo con números de fila explícitos (37 filas usadas, 11 columnas: `Critico?`/`Automatizado?`/`Automatizado Mobile?`/`Automatizable Desktop?`/`Automatizable Mobile?`) para descartar una alarma falsa (un TSV de scratchpad pre-`/compact` parecía mostrar CP-15 con `Automatizado=Sí` cuando la memoria decía que ya se había corregido a `No` en la ronda 1 — el TSV viejo tenía una fila con columnas corridas por un caso legítimo de título/categoría en blanco, no un error real). **La corrección de CP-15 de la ronda 1 sigue aplicada correctamente** (fila 22, confirmado en vivo). Cruce completo de TS-01 a TS-04 (37 filas) contra `mobile/specs/vetify/credentials.spec.ts` + `credential-wizard.spec.ts`: coincidencia perfecta, incluyendo casos muy específicos donde el comentario del test cita el CP exacto que cubre (`TC-06: paso 1 → atrás → paso 0`, `TC-14: paso 3 → atrás → paso 2`, `TC-17: paso 4 → atrás → paso 3`, etc.) — cero correcciones necesarias.

**Resultado — Perfil (hallazgo importante sobre una auditoría previa)**: un TSV de scratchpad (heredado de antes del `/compact`) mostraba la hoja Perfil como completamente vacía ("Adquirientes"/"Capitados" sin ninguna fila debajo) — eso habría llevado a poblarla desde cero, duplicando contenido real. **Se verificó en vivo antes de actuar**: la hoja SÍ tiene contenido (13 filas usadas), incluyendo los mismos hallazgos que ya documentan los comentarios del spec (`[Bug conocido: backend no valida formato...]` en el título de la fila 4, coincide con `TC-03` de `profile.spec.ts`). Cruce contra `tests/projects/vetify-webapp/profile.spec.ts` (4 tests) + `mobile/specs/vetify/profile.spec.ts` (3 tests): consistente. Se encontró y corrigió **1 inconsistencia real**: fila 6, columna "Resultado Esperado" seguía con el texto viejo ("permite cambiar Nombre/Apellido/Número de Identificación/Teléfono") que contradice el propio título de esa fila (ya corregido: "sólo teléfono es editable... requieren llamar al 0800 122 1183") — desalineación entre título y resultado esperado, no un error de clasificación Sí/No. Corregido con `.Value2` directo. Las filas 8-11 (Cambiar DNI) siguen como estaban: 8-9 son placeholders (`DBD`, sin clasificar, sin código que las cubra — correcto dejarlas así) y 10-11 están correctamente marcadas `Automatizado=No, Automatable=Sí` (atan con la investigación de BUG-013, sin test dedicado hoy).

**Lección para la próxima vez**: los TSV de scratchpad que sobreviven a un `/compact` pueden quedar desactualizados respecto al Excel real (no reflejan ediciones posteriores, o pueden venir de una lectura con bugs de rango) — **siempre re-verificar en vivo contra el Excel antes de actuar sobre un hallazgo "sorprendente"** (una hoja completamente vacía, un valor que contradice lo que dice la memoria), en vez de confiar en el dump heredado. Ver `feedback_validate_before_trusting_shared_state` en memoria de Claude — este es un segundo incidente real del mismo patrón.

**Veredicto de la validación exhaustiva**: con esta ronda se cerraron los 2 pendientes que quedaban abiertos desde la ronda anterior (Videollamadas completo, 3 specs mobile). Sumando las 3 rondas de esta auditoría (2026-08-29 x3), el estado es: **4 hojas con specs reales (Flujo de Compra, Gestión de Usuario, Credenciales, Videollamadas, Perfil) verificadas cuerpo-por-cuerpo, con 5 correcciones totales aplicadas** (IMP-006 unblock ×24 filas, CP-15 fecha futura, 2× "Problema tarjeta" Flujo de Compra, restructuración completa de TS-04 Olvidé contraseña ×12 filas nuevas, 1 fix de texto en Perfil). Reintegros y Misceláneas siguen sin specs (correcto, son 100% manuales). No queda ningún pendiente abierto de auditoría de automatización a la fecha.

### 2026-08-29, mismo día — Alan pregunta directo "¿está COMPLETAMENTE auditado?"; aparece 1 hueco real más

Pregunta pointed después de reportar la auditoría como "cerrada". En vez de responder "sí" en base a lo ya hecho, se verificaron en vivo 3 puntos de incertidumbre real que quedaban sin cerrar:

1. **`tests/projects/vetify-webapp/credentials.spec.ts` (desktop, 1250 líneas) nunca se había releído completo esta sesión** — la ronda 1 solo hizo skip-grep + comparación contra el dump del Excel. Leído completo ahora: **cero discrepancias nuevas** — CP-15 y las 3 filas de cámara están literalmente comentadas en el código (`/* ... */`, ni siquiera es un `test.skip` activo), CP-02 de TS-03 ya tiene su propia nota explicando por qué el Excel quedó desactualizado ahí. Nota de calidad de código (no de Excel): hay 2 tests llamados `TC-23` en el archivo (debería ser TC-23/TC-24) — no afecta la precisión del Excel.
2. De los 15 specs mobile reales, solo 4 se habían leído completos. Se revisaron los otros 11: la mayoría no tiene ninguna hoja que los rastree (quedan fuera del alcance por diseño, no son un hueco). `pets.spec.ts` se grepeó puntualmente para confirmar una referencia cruzada de un comentario en `credentials.spec.ts` — confirmado que el test citado existe y hace lo que el comentario afirma.
3. **`reintegros.spec.ts` (mobile) SÍ importa y no se había mirado** — 1 test real (`TC-01 - Muestra la sección de cuentas de acreditación`), sin equivalente Desktop, que documenta en vivo el bug `BUG-007`/`IMAS-4279`. La hoja "Reintegros" del Excel estaba genuinamente vacía (a diferencia de la falsa alarma de "Perfil" — acá sí era cierto). Se agregó 1 fila nueva.

**Conclusión de esa ronda**: la auditoría no era matemáticamente "100% completa" en el sentido de "cada línea de cada spec releída", pero cada hoja con contenido real había sido cruzada con al menos un nivel fuerte de verificación. Seguía deliberadamente sin resolver: las 8 filas de combinaciones individuales de Vetify B2C Flujo de Compra TS-01. Se asumió (todavía sin confirmar en ese momento) que el resto de specs mobile sin hoja asociada estaba "fuera de alcance por diseño".

### 2026-08-29, mismo día — Alan pide terminar TODO antes de automatizar; inventario 100% cerrado (13 specs desktop + 16 mobile); 2 áreas completas sin ninguna fila en el Excel

Alan: *"antes de empezar a automatizar necesito partir de una auditoría completa precisa de como estamos actualmente, necesito que termines de auditar todo"*. Se hizo `Glob` de `tests/projects/**/*.spec.ts` y `mobile/specs/**/*.spec.ts` para tener el inventario REAL (no de memoria) y se leyeron los últimos archivos pendientes: `ike-webapp/access-control.spec.ts`, `vetify-webapp/system-availability.spec.ts`, los 8 specs mobile de pantallas del menú lateral (`pets`, `plans`, `services`, `ayuda`, `historial-atencion`, `vetify-plus`, `asistencia-domicilio`, `facturas`), `login.spec.ts`, `navigation.spec.ts`, `example/app-launch.spec.ts`, y el resto de `vetify-b2c/user-management.spec.ts` + `osde-adquirente/user-management.spec.ts` (antes solo se había leído su bloque TS-04).

**Inventario ahora 100% cerrado**: 13/13 specs desktop, 16/16 specs mobile — cada uno leído completo o confirmado por qué no necesita fila en el Excel.

**Confirmación positiva**: `Gestión de Usuario` TS-01 "Registración" (CP01-05), TS-02 "Iniciar Sesión" (CP01-04) y TS-03 "Activación de Cuenta" (CP01-05) — nunca se habían verificado a fondo en esta auditoría (todo el trabajo previo fue sobre TS-04/TS-05). Se leyeron completos en `vetify-b2c` y `osde-adquirente` (código casi idéntico entre ambos, comparten los mismos POMs) y **coinciden exactamente** con las filas 3-18 del Excel. Sin correcciones.

**Hallazgo grande — 2 áreas completas con automatización real y CERO fila en el Excel** (no son parte de ninguna de las 8 hojas existentes):

1. **`tests/projects/ike-webapp/access-control.spec.ts`** — `IMAS-3742 "Restricción de acceso a la WebApp de Iké según plan"`. Producto "Ike WebApp", que ni siquiera está en la tabla de productos de `CLAUDE.md` — parece ser el área que le da nombre a esta rama (`feature/qa-mobile-validation-ike-access-control`). 6 CPs: solo **TC-01 corre de verdad**, y su propio título dice `[No valida CA01]` — un comentario técnico explica que el rechazo que prueba es de Auth0 (cuenta nunca registrada en el tenant de Iké), no del control de acceso por plan real. **Los otros 5 (TC-02 a TC-06) están bloqueados por `IMP-005`** (no hay usuarios de prueba con plan de Iké en el pool, ni forma de autoservicio para crearlos) — es decir, **CA01, el criterio de aceptación central de la HU, todavía no se puede probar de verdad con ningún test existente**.
2. **`tests/projects/vetify-webapp/system-availability.spec.ts`** — `IMAS-3860 "Sistema caído - Mensajes por indisponibilidad"`. 4 CPs, los 4 automatizados y corriendo limpio (caída general del sistema ×2, caída puntual de Videollamada ×2). Sin impedimentos.

**Hallazgo mediano — Misceláneas tiene contenido real esperando, nunca cargado**: 8 pantallas mobile-only del menú lateral, cada una con exactamente 1 test real, limpio, sin equivalente Desktop: `Mascotas` (ve al menos 1 mascota), `Planes` (ve al menos 1 plan), `Servicios` (accesos a Videollamada/Emergencias/Asistencia presencial), `Ayuda` (canales de contacto), `Historial de atención` (historia clínica por mascota), `Vetify PLUS` (enlace externo), `Asistencia a domicilio` (canales de contacto), `Facturas` (estado vacío).

**No necesitan fila** (confirmado, no son un hueco): `login.spec.ts` y `navigation.spec.ts` (mobile) y `example/app-launch.spec.ts` son smoke tests de infraestructura (login llega a Home, abrir menú/logout, la app instala y expone WebView) — no corresponden a ningún CP de negocio en ninguna hoja existente ni en Misceláneas.

**Pendiente de decisión de Alan, no ejecutado todavía**: cómo incorporar los 2 hallazgos grandes al Excel — ¿hoja nueva por cada uno (mismo patrón que Reintegros/Credenciales, un tab por feature), plegarlos dentro de Misceláneas, o dejarlos solo documentados acá y en `decision-log.md` sin tocar la estructura del Excel? Se decidió preguntar en vez de asumir porque "Ike WebApp" ni siquiera es un producto reconocido en `CLAUDE.md` — no hay convención previa que seguir a ciegas. La fila de Misceláneas para las 8 pantallas mobile-only sí se puede completar sin ambigüedad (mismo patrón que Reintegros, hoja ya existe) apenas se confirme el criterio.

**Ahora sí: inventario de specs 100% cerrado.** Ya no queda ningún archivo `.spec.ts` (desktop o mobile) sin leer o sin justificación explícita de por qué no aplica.

### 2026-08-29, mismo día — ejecución: 2 hojas nuevas + Misceláneas poblada + dashboard actualizado

Con el OK de Alan (`AskUserQuestion`: "Hoja nueva por cada una"), se crearon 2 hojas nuevas con el mismo layout de 8 columnas que Reintegros/Misceláneas (sin split Desktop/Mobile, ninguna de las 2 áreas tiene equivalente mobile):

- **"Control de Acceso"** (`IMAS-3742`): 6 CPs (CP-01 a CP-06, orden numérico de TC, no el orden desordenado en que aparecen en el código). Solo CP-01 automatizado, y su Resultado Esperado deja explícito que NO valida el CA01 real. CP-02 a CP-06 = No automatizado, bloqueados por `IMP-005`.
- **"Sistema Caído"** (`IMAS-3860`): 4 CPs, los 4 automatizados.
- **Misceláneas**: 9 filas (las 8 pantallas mobile-only, Servicios aporta 2 CPs).

**Dashboard (`Metricas de Casos de Prueba`) actualizado** — 4 fórmulas extendidas por edición directa de texto (`.Formula`, nunca `Copy()`/`PasteSpecial()`, ver `feedback_excel_com_merge_corruption`): `C5`/`K5` (Total de Casos / Total Automatizados) y `C25`/`K25` (Casos Críticos / Críticos Automatizados) — las únicas 2 secciones que suman TODAS las hojas de contenido; las secciones de `C64`/`C71` ("Automatizables Desktop/Mobile") correctamente NO incluyen Reintegros/Misceláneas ni las 2 hojas nuevas, porque ninguna tiene columna "Automatizable" (mismo patrón ya existente, no hacía falta tocarlas).

**Verificación matemática exacta** (antes → después, calculado a mano antes de aplicar el cambio y confirmado en vivo después, sin ninguna diferencia):
- `C5` (Total de Casos): 263 → 273 (+10 = 6 de Control de Acceso + 4 de Sistema Caído).
- `K5` (Total Automatizados): 188 → 202 (+14 = 9 de Misceláneas, que faltaba en esta fórmula pese a estar en `C5` desde antes, + 1 de Control de Acceso + 4 de Sistema Caído).
- `C25` (Casos Críticos): 140 → 146 (+6 = 2 de Control de Acceso [CP-01, CP-06] + 4 de Sistema Caído; Misceláneas no suma, sus 9 filas son todas Crítico=No).
- `K25` (Críticos Automatizados): 109 → 114 (+5 = 1 de Control de Acceso [CP-01] + 4 de Sistema Caído).

**Hallazgo NO corregido, dejado a propósito para que Alan decida**: al inspeccionar las fórmulas existentes se encontraron 2 inconsistencias previas (no introducidas hoy): (1) `K5` usa `Perfil!G:G` y `Reintegros!G:G` para contar "Automatizado=Sí", pero en ambas hojas la columna `Automatizado?` real es `H`, no `G` (`G` es `Crítico?`) — el total `K5`/`S5` probablemente subcuenta o cuenta mal esas 2 hojas desde que se crearon. (2) Antes de este cambio, `Misceláneas` ya estaba incluida en `C5` y en `K25`, pero faltaba por completo en `K5` — asimetría que este cambio corrigió de paso (era una omisión clara, no ambigua, distinta de la inconsistencia de columna de (1) que si se toca cambiaría números históricos sin que nadie lo haya pedido).

### 2026-08-29, mismo día — "Problema con tarjeta" automatizado (Flujo de Compra TS-02, Vetify B2C + OSDE Adquirente)

Siguiente ítem de la lista de "con qué avanzar" (después de TS-05, que quedó con la limitación de infraestructura documentada aparte). Se escribió `TC-02 Compra fallida - Problema tarjeta` en ambos `purchase-flow.spec.ts`, modelado sobre el `TC-01 Tarjeta Prepaga` ya existente (mismo flujo: landing → plan random → datos personales/facturación → pago), usando `MercadoPagoCardsHelper.buildCheckoutPaymentData(MERCADOPAGO_PAYMENT_STATUSES.DECLINED_GENERAL, ...)` — el código de tarjeta de prueba `OTHE` del sandbox de MercadoPago.

**Bug real encontrado y corregido de paso, en el `TC-01` ya existente de ambos productos**: `page.waitForResponse('**\api\quantum\jengage\payment\pagar-mp**')` — las barras `\a`, `\q`, `\j`, `\p` no son secuencias de escape válidas en JS, así que el string literal pierde TODAS las barras invertidas y queda `**apiquantumjengagepaymentpagar-mp**` (confirmado con `node -e "console.log(...)"`, sin ninguna barra `/`), un patrón que nunca puede matchear una URL real con segmentos separados por `/`. Corregido a `'**/api/quantum/jengage/payment/pagar-mp**'` en los 2 `TC-01` (ya existían) y en los 2 `TC-02` nuevos. Verificado en vivo: los 4 tests (`TC-01`/`TC-02` × 2 productos) pasan.

**Hallazgo de comportamiento real, no documentado antes**: a diferencia de `CTNA` (tarjeta prepaga — regla de negocio de Vetify, responde HTTP 400 directo), un rechazo real de MercadoPago (`OTHE`/fondos/expiración) responde **HTTP 200** — el endpoint de Vetify procesó el intento de pago correctamente, y el rechazo viene *embebido en el body*: `{"status":400, "message":"Tenemos un error al procesar tu compra, te contactaremos a la brevedad para solucionarlo.", "statusMP":{"status":"rejected","statusDetail":"cc_rejected_other_reason"}}`. Confirmado con un log de debug temporal antes de escribir la aserción final (no se asumió el shape del body).

**Excel actualizado**: `Flujo de Compra` filas 13 (Vetify B2C) y 51 (OSDE Adquirente) — `Automatizado` de No a Sí (correcto ahora que el test existe y pasa). Dashboard verificado: `C5` sin cambio (273, las filas ya existían), `K5` 202→204 (+2 exacto).

### 2026-08-29, mismo día — 2 de las 8 combinaciones individuales de Vetify B2C TS-01 (las únicas viables hoy)

Última tarea de la lista de "con qué avanzar". Antes de tocar código se investigaron 2 bloqueos reales: (1) **cupón real inexistente** (ya documentado desde el 14/08 — bloquea 4 de las 8 filas, todas las "Con Cupón", sin solución de código posible) y (2) **"Plan familiar" (2+ planes) no tiene ninguna implementación de referencia** en todo el repo — necesitaría exploración en vivo nunca hecha antes. Con el OK explícito de Alan, se acotó el alcance a las 2 únicas filas viables hoy: individual + sin cupón, débito y crédito (filas 3 y 7).

**Hallazgo que simplificó todo**: `contractRandomPlan()` selecciona y contrata SIEMPRE un solo plan — por construcción, ya es "individual" sin importar qué tier (Classic/Premium/Cachorros) toque al azar. No hizo falta tocarlo ni hacerlo determinístico para nada.

**Fila 7 (individual/sin cupón/crédito) ya estaba cubierta sin saberlo**: el test existente `TS-01 Flujo de Compra > TC-01 - ... - Compra existosa - Plan individual` ya usa `MercadoPagoCardsHelper.buildCheckoutPaymentData(APPROVED, VISA)` — y ese helper, antes de hoy, **solo sabía construir tarjetas de crédito** (`getCreditCard()` hardcodeado, sin parámetro de tipo). Es decir, todo lo que decía "tarjeta" en este helper era en realidad siempre crédito, nunca débito, sin que el nombre del método lo dejara claro.

**Construido**: se extendió `MercadoPagoCardsHelper.buildCheckoutPaymentData()` con un 3er parámetro opcional `cardKind: 'credit' | 'debit' = 'credit'` (default preserva el comportamiento de todo el código existente, cambio aditivo sin riesgo) y un `getDebitCard()` nuevo (ya existían las tarjetas de débito en `MERCADOPAGO_DEBIT_CARDS`, solo no había forma de pedirlas desde el helper de checkout). Se agregó `TC-01b` (fila 3, individual/débito) en el mismo `describe` que el test de crédito existente. Ambos verificados pasando en vivo.

**Excel actualizado**: `Flujo de Compra` filas 3 y 7 (Vetify B2C) — `Automatizado` de No a Sí. Dashboard verificado: `K5` 204→206 (+2 exacto), `C5` sin cambio.

**Sigue sin resolver, a propósito**: las 6 filas restantes (4 "Con Cupón" bloqueadas de raíz; 2 "familiar" sin explorar) — quedan igual que estaban, `Automatizable=Sí` pero `Automatizado=No`, no se tocó nada de eso.

### 2026-08-29, mismo día — corregido el bug de columna en K5 (dashboard)

A pedido de Alan de agotar todo lo avanzable antes del lunes. Se calculó el delta exacto antes de tocar nada: `Perfil` tiene 3 filas `Crítico=Sí` y 3 filas `Automatizado=Sí` (mismo número por coincidencia, la fórmula vieja no cambiaba nada ahí); `Reintegros` tiene 0 `Crítico=Sí` pero 1 `Automatizado=Sí` (la fila real agregada hoy, que no es crítica) — ahí sí había una subcuenta real de -1. Corregido `K5` para usar `Perfil!H:H`/`Reintegros!H:H` (la columna real de `Automatizado?`) en vez de `G:G` (`Crítico?`). Verificado: `K5` 206→207 (+1 exacto, coincide con el cálculo previo). `K25` no tenía este bug — ahí `G` y `H` se usan juntos a propósito (`COUNTIFS`, criterio real es "crítico Y automatizado").

### 2026-08-29, mismo día — Credenciales CP-21/CP-22 (mobile): uno confirmado bloqueado, el otro automatizado

Investigación en vivo del `accept` real del `<input>` de foto de credencial: `image/png,image/jpeg,image/jpg` — confirma que **CP-21 (formato no permitido) sigue sin ser automatizable en mobile** (el picker nativo de Android filtra por tipo, un usuario real no puede elegir un `.txt`) — el Excel ya lo tenía bien clasificado, sin cambios.

Pero el picker NO filtra por tamaño de archivo — una imagen pesada pero de formato válido sí es seleccionable. Se escribió `mobile/specs/vetify/credential-wizard.spec.ts > TS-02 ... imagen demasiado grande > TC-22`, calcado del patrón ya probado de TS-08 TC-01 (`selectFileViaNativePicker()` + `oversize_img_10MB.jpg` empujado por adb). **Código escrito, tipado y linteado limpio, pero NO verificado en vivo**: el emulador Android quedó "offline" (proceso vivo, adb no responde — ni `adb reconnect` lo recuperó) a mitad de la investigación. No se reinició el emulador sin avisar (podía cortar algo en curso). Pendiente: correr `npm run test:android -- --mochaOpts.grep "TC-22"` una vez el emulador esté sano de nuevo.

### 2026-08-29, mismo día — "Plan familiar" resuelto: 2 combinaciones más de Vetify B2C TS-01 (van 4 de 8)

Exploración en vivo de qué significa "familiar" en el flujo de compra: **no es un carrito ni una selección de 2 planes distintos** — es el combobox "Cantidad de planes" del resumen de la orden en el checkout. Elegir 2 aplica automáticamente "Bonificación por grupo familiar" (20% off, confirmado en vivo: 2×$62.990=$125.980, bonificación -$25.196, total $100.784).

Se agregó `CheckoutPage.selectPlanQuantity(n)` (nuevo método, un `<select aria-label="Cantidad de planes">` — hay 2 en el DOM por un resumen responsive duplicado, el índice correcto confirmado en vivo es `.nth(1)`) y se escribieron `TC-02` (familiar/sin cupón/débito) y `TC-06` (familiar/sin cupón/crédito), mismo patrón que `TC-01`/`TC-01b`. Único cambio de aserción real: `saleConfirmProducts` pasa de `toHaveLength(1)` a `toHaveLength(2)` (se emiten 2 pólizas) — confirmado en vivo, no asumido. Ambos tests verificados pasando.

**Excel actualizado**: filas 4 y 8 (Vetify B2C) — `Automatizado` de No a Sí. Dashboard verificado: `K5` 207→209 (+2 exacto).

**Estado final de las 8 combinaciones de Vetify B2C TS-01**: 4 de 8 automatizadas (todas las "sin cupón": individual/familiar × débito/crédito). Las 4 restantes ("con cupón") siguen bloqueadas de raíz — no existe un cupón de prueba real, confirmado desde el 14/08, no es algo que el código pueda resolver.

### 2026-08-29, mismo día — Reconciliación completa con el roadmap de la PO: 29 gaps nuevos trackeados en Casos de Prueba.xlsx

Contexto: Liliana (PO) dio un borrador Excel separado ("Automation Vetify.xlsx", roadmap ejecutivo por flujo) para refinar. Al reconciliarlo fila por fila contra este Excel (ver `qa-workspace/decision-log.md` para el detalle completo de esa reconciliación), aparecieron **39 flujos de su roadmap sin ningún CP correspondiente acá**. De esos, 29 son gaps de UI/E2E claros que sí corresponden a este tracker; los otros 10 (validaciones de backend Salesforce/Engage) se dejaron fuera a propósito — no hay evidencia suficiente para escribir Precondiciones/Pasos reales, y podría no ser responsabilidad de este tracker (nivel API/backend, no UI).

**Cambios aplicados**:
- **`Reintegros`** (+5 filas, `CP-02` a `CP-06`): solicitud completa, carga de documentación, validación de campos, datos inválidos, consulta de estado. Hallazgo aparte, ya reportado a Alan: esta hoja tenía **un solo CP en total** antes de este cambio (un smoke test mobile) — todo el trabajo de QA real en Reintegros (BUG-015, IMAS-4101/4104/4124/4152) fue manual, nunca se automatizó como test de Playwright.
- **`Perfil`** (+2 filas): detalle completo de mascota, cambio de mascota activa.
- **`Credenciales`** (+1 fila): disparo de la encuesta CE post-carga.
- **Hoja nueva `Funcionalidades Pendientes`** (21 filas, 5 grupos `TS-01` a `TS-05`): Sesión y Cuenta (7 — logout, refresh, cambio de contraseña logueado, onboarding), Prestadores y Red (5 — mapa de veterinarias completo), Cobertura y Condicionados (3 — PDF de condicionado), Vetify Plus (2 — contratar otro plan, plan no elegible), Regresión Transversal (4 — persistencia de sesión, navegación, rutas protegidas, permisos por plan).

Todas las filas nuevas usan `DBD` en Precondiciones/Pasos/Resultado Esperado — **convención ya existente en este mismo archivo** (vista primero en la hoja `Perfil`, filas de "Cambiar DNI"), no una invención de esta sesión: significa "el caso está identificado pero el diseño detallado todavía no se hizo", distinto de escribir pasos falsos que nadie verificó.

**Dashboard `Metricas de Casos de Prueba` actualizado** (4 fórmulas extendidas para incluir `Funcionalidades Pendientes`: `C5`, `K5`, `C25`, `K25` — las fórmulas de Desktop/Mobile automatizable, `H64`/`H71`, NO se tocaron a propósito, mismo criterio que `Reintegros`/`Misceláneas`/`Control de Acceso`/`Sistema Caído`, que tampoco tienen columnas de mobile). Verificado con delta calculado a mano antes de tocar el archivo:

| Métrica | Antes | Después | Motivo del cambio |
|---|---|---|---|
| Total CP | 273 | 302 | +29 filas nuevas, todas `Automatizado=No` |
| % automatizado total | 77% | 69% | mismo numerador (209), denominador +29 |
| Críticos | 146 | 166 | +20 de las 29 son Crítico=Sí (mapeado desde Criticidad Alta del roadmap PO) |
| % críticos automatizado | 82% | 72% | mismo numerador (120), denominador +20 |
| % de críticos del total | 53% | 55% | recalculado |
| Desktop automatizable | 250 | 253 | +3 (Perfil+2, Credenciales+1, marcadas Automatizable=Sí) |
| Mobile automatizable | 71 | 74 | mismas +3 |

**Importante**: la caída de 77%→69% no es una regresión real — es el mismo trabajo automatizado de siempre, ahora medido contra un denominador más honesto que incluye gaps que antes ni figuraban en el tracker.

### 2026-08-29/30 — Validación en vivo de los 29 gaps: Pasos/Resultado reales reemplazando los DBD

Antes de automatizar, se validó en vivo (Playwright MCP contra `vetify-qa.ikeapp.com`) cuáles de los 29 gaps recién agregados son realmente factibles. Detalle completo del proceso y los hallazgos de bloqueo (Solicitud de reintegro, Cambio de contraseña logueado inexistente, Contratar otro plan sin punto de entrada, mapa de veterinarias limitado por iframe) en `qa-workspace/decision-log.md` — acá solo el resumen de los cambios al archivo:

- **`Funcionalidades Pendientes`**: 17 de 21 filas actualizadas con Precondiciones/Pasos/Resultado Esperado reales (ya no `DBD`) + columna `Automatizable?` nueva cargada (`Si`/`No`/`Parcial` según corresponda). Las 2 filas de cambio de contraseña logueado y las 2 de "Contratar otro plan" quedaron en `Automatizable=No` con la evidencia de por qué. "Atención de Red" y "Plan sin condicionado disponible" quedaron sin tocar (no revisadas).
- **`Reintegros`**: columna `Automatizable?` agregada. La fila de "Consulta de estado" quedó con Pasos/Resultado reales y `Si`. Las 4 filas restantes (solicitud, carga de documentación, validación, datos inválidos) quedaron en `Automatizable=Parcial` con la nota del bloqueo real encontrado en el selector de Mascota.
- **`Perfil`**: fila de "Detalle de mascota" completada con Pasos/Resultado reales (confirmado: click en la card navega a una vista con raza, edad, plan y botón de bajar credencial). "Cambio de mascota" quedó con una nota explicando por qué no se pudo confirmar (cuenta multi-mascota del pool con datos degradados).

**Dashboard sin cambios en los totales** (302 CP, 209 automatizados, 69%) — esta ronda no automatizó nada todavía, solo evaluó factibilidad real antes de escribir código.

### 2026-08-29/30 — Implementación real: 15 de 17 gaps automatizados y verificados

Detalle completo (bugs encontrados, hallazgo de arquitectura de navegación, diálogo de error intermitente, cuenta de pool degradada, estrategias de Google Places) en `qa-workspace/decision-log.md`. Acá solo el resumen del Excel:

- **Funcionalidades Pendientes**: Acceso a mapa de veterinarias, Búsqueda de veterinarias, Navegación principal, Compatibilidad de permisos por plan → `Automatizado=Sí`. Consulta y Descarga de condicionado quedan `Automatizado=No` con la Observación actualizada explicando el bloqueo técnico real (popup+PDF, 7 rondas de intentos con 4 estrategias distintas, sin éxito).
- **Reintegros**: Consulta de estado de una solicitud → `Automatizado=Sí` (verificado con la cuenta OSDE Capitado con historial real).
- **Perfil**: Detalle completo de mascota → `Automatizado=Sí`.

**Dashboard verificado**: 302 CP, **222 automatizados (74%)**, subiendo desde 209 (69%) antes de esta ronda. Delta de +13 automatizados coincide exacto con: +5 de la tanda de Sesión/Onboarding de la ronda anterior a esta + 6 nuevos de esta tanda +2 ya contados aparte — ver decision-log.md para el desglose fila por fila.

### 2026-08-31 — Cooper/Beneficios (IMAS-4356 + IMAS-4435): 6 CPs nuevos automatizados

`Casos de Prueba.xlsx` → **Funcionalidades Pendientes** +6 filas nuevas (`TS-06 Beneficios`, CP-01 a CP-06): banner Cooper en Home (3 segmentos) + menú "Beneficios" (Vetify PLUS visible en B2C, oculto en OSDE Capitado, Cooper visible en OSDE Capitado). Todas `Automatizado=Sí`, verificadas pasando en Desktop **y** Mobile (Android) — primera vez que este tracker registra explícitamente la verificación mobile en el texto del CP, no solo en una columna aparte. El menú de OSDE Adquirente queda deliberadamente sin fila de aserción automatizada (depende del `policyId` real de la cuenta, no del segmento — ver `docs/conocimiento-sistema.md`).

`Automation Vetify.xlsx` (roadmap PO) → **Roadmap QA Automation** +2 filas (`QA-AUTO-093`/`094`, etapa "11. Vetify Plus", 100% cada una): banner Cooper y segmentación del menú Beneficios.

**Dashboards recalculados y verificados (fórmulas reales, sin tocar celdas de resultado)**:
- `Casos de Prueba.xlsx` → Metricas: 302→**308** CP totales, 222→**228** automatizados, sigue en **74%** (228/308 = 0.740259..., coincide exacto con el cálculo a mano).
- `Automation Vetify.xlsx` → Dashboard Ejecutivo: 86→**88** escenarios, etapa "11. Vetify Plus / Planes" pasó de 4 a 6 escenarios (66.67% automatizado — 4 de los 6 al 100%, 2 preexistentes en 0%, coincide exacto).

Docs de HU: `docs/user-stories/IMAS-4356-banner-cooper-webapp-osde.md` recibió una sección de cierre; `IMAS-4435-banner-cooper-mayor-protagonismo.md` + `.tests.md` nuevos, con el contrato real completo (Objetivo + 10 criterios de aceptación) que Alan pegó directo de Jira — su campo real es `customfield_11549`, un 3er campo distinto (ni el estándar `description` ni `customfield_11620` de las Tareas). Detalle completo del hallazgo de causa raíz (policyId, no clCuenta/segmento) y del arreglo de la herramienta Jira en `qa-workspace/decision-log.md` 2026-08-31.

### 2026-08-31 (continuación) — IMAS-4408 (mock de plan sin operar) + IMAS-4198/IMAS-4199 (fix confirmado, sin CPs nuevos)

**Nota de reconciliación**: entre la entrada anterior y esta, `Casos de Prueba.xlsx` recibió +1 fila más en `Credenciales` (IMAS-4408, mock-based, ver `qa-workspace/decision-log.md` 2026-08-31 "escalación a Oscar denegada") que no había quedado registrada acá — Metricas ya estaba en **309 CP / 229 automatizados (74%)** al empezar esta ronda (verificado en vivo antes de tocar nada, no asumido).

**Esta ronda no agrega ni quita CPs** — `Gestión de Usuario`, filas `CP-04`/`CP-05` de los 4 bloques `TS-04 Olvidé contraseña` (Vetify B2C fila 23-24, OSDE Adquirente 52-53, OSDE Capitado 81-82, Flux Capitado 110-111): ya estaban `Automatizado=Sí` desde el 2026-08-07 (probaban el bug a propósito). Se reescribió solo `Título` (ya no dice "[Bug conocido]") y `Resultado Esperado` (ahora describe el comportamiento corregido) en los 8 CPs, para que el Excel refleje el fix confirmado en vivo de `IMAS-4198`/`IMAS-4199` — mismo cambio aplicado en paralelo al código real (`tests/projects/{vetify-b2c,osde-capitado,osde-adquirente,flux-capitado}/user-management.spec.ts`).

**Dashboard sin cambios en los totales** (309 CP, 229 automatizados, 74% — confirmado igual antes y después).

**Hallazgo aparte, no corregido acá a propósito**: `TS-05 Cambio de Contraseña` (filas 26-30 del bloque Vetify B2C) sigue con `Automatizado=No` en las 5 filas, pese a que existen 4 tests reales en el spec desde el 2026-08-29 (ver entrada de esa fecha en `qa-workspace/decision-log.md`). No se re-corrió hoy (consume la única cuenta `UserTag.REAL_EMAIL` del pool y tiene una flakiness de rate-limit conocida, sin causa raíz confirmada) — se deja pendiente de que Alan decida si vale la pena re-verificar y sincronizar el Excel ahora o más adelante.

### 2026-09-01 (continuación, mismo día) — Alan resuelve el bloqueo: 2 cuentas Gmail reales nuevas + causa raíz real de `EmailClient` encontrada y arreglada

Se re-verificó `TS-05` (el hallazgo de arriba) en vez de asumir que seguía igual — buena decisión: reveló un bug real en el propio `EmailClient.ts` (no un rate-limit del backend como se sospechaba): `client.mailbox.uidNext` nunca se refrescaba entre polls (propiedad cacheada del cliente IMAP, no se actualiza sola). Arreglado usando `client.status('INBOX', {uidNext: true})`, que sí pide el valor fresco al servidor cada vez. Confirmado en vivo: la misma suite de Vetify B2C que fallaba 3/3 ayer pasó su TC-01 al primer intento tras el arreglo.

Con el bug real resuelto, se construyeron 2 cuentas Gmail nuevas y separadas (`alandgg972@gmail.com`, `alandgg973@gmail.com` — no alias, cuentas genuinas con su propia contraseña de aplicación IMAP) para destrabar de raíz `IMAS-3480`/`IMAS-3476` (sin cuenta `REAL_EMAIL` en OSDE Capitado/Flux Capitado). `environment.ts`/`EmailClient.ts`/`passwordResetFlow.ts` generalizados para soportar múltiples casillas reales (antes solo soportaba una global).

`tests/projects/{osde-capitado,flux-capitado}/user-management.spec.ts` ganan su propio `TS-05` (4 tests cada uno, mismo diseño que B2C). En el camino se encontraron y separaron 2 bugs de TEST pre-existentes y compartidos entre los 3 productos (no nuevos, no de las cuentas nuevas): el checklist de política de contraseña no aparece a tiempo en un fill+submit rápido (CP-02), y el link ya usado no muestra "Enlace caducado" al reintentarlo (parte de CP-05) — ambos confirmados también en Vetify B2C, documentados como hallazgo separado, no bloquean nada del producto real. Se corrigió además un assert real que asumía que el login lleva a Home — para estas 2 cuentas nuevas (sin póliza validada) va a la pantalla de cobertura en cambio; ahora se verifica la respuesta 200 de `/oauth/token` directamente.

**Dashboard verificado con fórmulas reales**: `Casos de Prueba.xlsx` → Metricas: 309 CP totales (sin cambio), **229→241 automatizados**, **74%→78%**. El delta de +12 coincide exacto con 4 CPs (CP-01/03/04/05, de 5) × 3 bloques (Vetify B2C, OSDE Capitado, Flux Capitado) pasando de `No` a `Sí` — CP-02 se deja en `No` en los 3, con la explicación del bug de test compartido en la columna de Resultado Esperado.

### 2026-09-06 — Auditoría tras sesión larga de estabilización (vetify-webapp, user-management ×4, ike-webapp, checkout-footer-cupon)

**Contexto**: entre 2026-09-04 y 2026-09-06 se corrió y estabilizó una porción grande del proyecto (ver `docs/lecciones-aprendidas.md` de esas fechas para el detalle técnico completo). Se audita acá específicamente qué cambia en `Casos de Prueba.xlsx`.

**Hallazgo clave — el bug del checklist de contraseña YA estaba documentado, sin resolver, desde 2026-09-01**: la hoja `Gestión de Usuario` ya tenía, para Vetify B2C (fila 27), OSDE Capitado (fila 85) y Flux Capitado (fila 114), el mismo CP-02 "Contraseña débil" marcado `Automatizado=No` con la nota *"causa raíz no confirmada, pendiente de investigar aparte"*. La investigación de hoy encontró y confirmó la causa raíz real: el símbolo ✓/• del checklist es un pseudo-elemento CSS `::before`, nunca texto del DOM — `getByText()` no podía matchearlo nunca, sin importar timing. Corregido el método del POM (`ResetPasswordPage.isPolicyCriterionChecked()`) para leer `getComputedStyle(li, '::before').content`. Verificado en vivo en los 3 productos.

**Cambios aplicados al Excel** (hoja `Gestión de Usuario`, vía COM `.Value2`, sin `Copy()`/`PasteSpecial()`):
- Filas 27, 85, 114 (CP-02 "Contraseña débil", los 3 productos): `Automatizado` No→Sí, nota actualizada con la causa raíz real y la fecha de verificación.
- Fila 49 (OSDE Adquirente, título de TS-04): corregido el mislabel `IMAS-3215`→`IMAS-3218` (IMAS-3215 es el ticket de Vetify B2C; OSDE Adquirente tiene su propio ticket, IMAS-3218, todavía en Backlog para el próximo sprint).
- Filas 55-59 (OSDE Adquirente, TS-05 completo): estaban vacías (solo placeholders `CP-01`...`CP-05` sin Precondiciones/Pasos/Resultado). Se escribió el contenido completo de las 4 pruebas (mismo patrón que los otros 3 productos) — pero **NO se marcó `Automatizado=Sí`**: el código está escrito y pasa typecheck/lint, pero nunca se verificó en vivo porque la compra real de OSDE Adquirente falla con `500 internal_error` (`docs/bugs/BUG-034`), bloqueando la creación de la cuenta `REAL_EMAIL` necesaria. Nota agregada en cada fila explicando el bloqueo exacto. Queda `Automatizado=No, Automatable=Sí` hasta que se resuelva BUG-034 y se pueda correr en vivo.

**Dashboard**: `K5` (Total Automatizados) es una fórmula `COUNTIF` en vivo, no un valor estático — se recalculó sola a **244** tras los 3 cambios de No→Sí (las 3 filas son `Crítico=No`, así que `K25` — Críticos Automatizados — no cambió, quedó en 145). No hizo falta ningún cálculo manual de delta.

**Pendiente, no resuelto en esta ronda** (fuera de alcance de una corrección de Excel, depende de un ambiente externo): BUG-034 (compra OSDE Adquirente) y BUG-035 (MercadoPago errático en Vetify B2C) siguen bloqueando, respectivamente, la verificación en vivo de OSDE Adquirente TS-05 y la re-auditoría de la hoja `Flujo de Compra` en los 4 productos — no se tocó esa hoja en esta ronda porque correr `purchase-flow.spec.ts` hoy solo hubiera reproducido el mismo bloqueo ya documentado, sin señal nueva.

### 2026-09-01 (continuación 2) — Fix estructural del Dashboard: excluir del cálculo lo que NUNCA se puede automatizar

**Motivo (planteado por Alan)**: el documento existe para dar trazabilidad de automatización. Un caso "automatizable pero no automatizado todavía" es backlog legítimo — pertenece al cálculo. Un caso marcado `Automatizable=No` (bloqueo real y permanente: feature que no existe en el producto, requiere infraestructura de video/email real, etc. — ver nota ~fila 75 de la hoja Metricas) **nunca** va a poder cerrarse, así que dejarlo en el denominador de "% automatizado" le pone un techo artificial al indicador para siempre, sin importar cuánto se automatice en los hechos.

Este criterio ya existía y estaba bien aplicado en las secciones "Casos Automatizables (Desktop/Mobile)" (filas 61-70 de Metricas, que sí filtran por `Automatizable`) — pero **no** en las 2 métricas principales de más arriba del dashboard: "Total de Casos de Prueba" (`C5`/`K5`/`S5`) y "Casos de Prueba Críticos" (`C25`/`K25`/`S25`), que sumaban TODAS las filas de las 10 hojas de contenido sin filtrar.

**9 filas confirmadas como permanentemente no-automatizables** (`Automatizable=No` en su columna correspondiente, verificado título por título, no por ID — los IDs tipo `CP-01` se repiten entre grupos `TS-XX` de una misma hoja):
- `Funcionalidades Pendientes` (5): "Cambio de contraseña desde un usuario ya autenticado" (Crítico=Sí), "...con la contraseña actual incorrecta" (depende de la anterior), "Plan sin condicionado disponible", "Contratar otro plan adicional desde la WebApp" (Crítico=Sí), "Plan no elegible para el usuario" (Crítico=Sí, depende de la anterior).
- `Credenciales` (1): "Disparo de encuesta de experiencia posterior a carga de credencial" (sin trigger real encontrado en el bundle de la app).
- `Videollamadas` (3): ventana de 5 min para "Ingresar" (brecha de cobertura), sala de espera/videoconsulta y comunicaciones post-cancelación (ambas fuera de alcance, requieren infra real de video/notificaciones).

De estas 9, **3 son Crítico=Sí** (las 3 de "Funcionalidades Pendientes" marcadas arriba) — así que la sección de Críticos también necesitaba el mismo ajuste.

**Cambio aplicado**: `C5` y `C25` pasan de sumar todas las filas a restar, por cada fórmula, el `COUNTIF`/`COUNTIFS` de filas `Automatizable=No` (u, en las hojas con columnas separadas Desktop/Mobile — Perfil/Credenciales/Videollamadas —, filas donde AMBAS son `No`). `K5`/`K25` (numeradores) no se tocaron: se confirmó antes de escribir que ninguna de las 9 filas está marcada `Automatizado=Sí` (verificación de consistencia — sería contradictorio que algo "no automatizable" figure como ya automatizado). Edición vía `.Formula` (no `Copy()`/`PasteSpecial()`, ver `feedback_excel_com_merge_corruption`), verificado releyendo `.Value2` tras guardar.

| Métrica | Antes | Después |
|---|---|---|
| Total de Casos de Prueba (C5) | 309 | **300** |
| Automatizados (K5) | 241 | 241 (sin cambio) |
| % Automatizado (S5) | 78% | **80,3%** |
| Total Casos Críticos (C25) | 173 | **170** |
| Críticos Automatizados (K25) | 145 | 145 (sin cambio) |
| % Críticos Automatizado (S25) | 84% | **85,3%** |

La nota explicativa ~fila 75 (que ya definía el criterio Automatizable/No-automatizable desde el 2026-08-14) sigue vigente sin cambios de texto — ahora también describe correctamente el comportamiento del Total principal, no solo el de las secciones Desktop/Mobile.

**Mismo día, seguimiento inmediato — Alan detectó el efecto secundario del fix**: al excluir las filas `Automatizable=No`, algunos subgrupos `TS-XX` de `Funcionalidades Pendientes` quedan en 100% (o sin filas automatizables) al mirarlos aislados, lo cual puede leerse como "ya está todo hecho" cuando no necesariamente es así. Se dumpeó la hoja completa (32 filas de `UsedRange`, 27 con datos reales) para auditar caso por caso, incluyendo el texto completo de Precondiciones/Pasos/Resultado Esperado de cada fila ambigua:

- **Fix real aplicado — fila 18 "Plan sin condicionado disponible"**: estaba en `Automatizable=No`, pero su propio texto de Resultado Esperado dice explícitamente *"el escenario es técnicamente posible... bloqueado por no encontrar una cuenta con ese dato faltante"* — coincide exacto con el criterio ya escrito en la nota de Metricas para `Automatizable=Sí` (bloqueo de dato de prueba puntual, mismo patrón que un cupón real inexistente). Estaba mal clasificada contra la propia regla del proyecto. Corregida a `Sí` (vía `.Value2`, celda de dato — no fórmula). Efecto: Total 300→**301** (K5 sin cambio, 241; la fila no es Crítico así que Críticos no se mueve).
- **Confirmado sin cambios, decisión explícita de Alan** (vía pregunta directa con el impacto numérico de ambas opciones): las 4 filas "Cambio de contraseña logueado" (5/6) y "Contratar otro plan adicional" (20/21) — aunque su texto dice "no es un gap de automatización, es una funcionalidad no construida todavía" (no un límite técnico real de test) — Alan decidió mantenerlas en `Automatizable=No`: si Producto nunca construye la funcionalidad, QA nunca va a poder automatizarla, mismo efecto práctico que un bloqueo técnico permanente. TS-01 Sesión y Cuenta queda en 100% (5/5) y TS-04 Vetify Plus en 0 filas automatizables — **leído y aceptado como correcto**, no como bug.
- **Pendiente sin resolver, a propósito**: fila 14 "Atención de Red" (TS-02) está 100% sin clasificar (Precondiciones/Pasos/Resultado/Automatable todos vacíos, nunca revisada). No causa una lectura de 100% falsa (al estar vacía ya cuenta como pendiente en el cálculo), pero es un dato roto conocido. Alan decidió dejarla pendiente por ahora, sin invertir tiempo en investigarla hoy.

**Valores finales verificados tras el fix de fila 18** (releídos en vivo, no calculados a mano):

| Métrica | Valor |
|---|---|
| Total de Casos de Prueba (C5) | 301 |
| Automatizados (K5) | 241 |
| % Automatizado (S5) | 80,1% |
| Total Casos Críticos (C25) | 170 |
| Críticos Automatizados (K25) | 145 |
| % Críticos Automatizado (S25) | 85,3% |

### 2026-09-14 — chequeo puntual: ¿IMAS-4490 (Condicionados OSDE Adquirente) pertenece a alguna hoja de este Excel?

Se automatizó IMAS-4490 (`tests/projects/osde-adquirente/condicionados.spec.ts`, 3/11 CPs en verde, ver `docs/coverage-register.md` y `docs/user-stories/IMAS-4490-prueba-qa-condicionados-osde.tests.md`). Antes de tocar este Excel se verificaron las 11 hojas reales (`Metricas de Casos de Prueba`, `Flujo de Compra`, `Gestión de Usuario`, `Perfil`, `Credenciales`, `Videollamadas`, `Reintegros`, `Misceláneas`, `Control de Acceso`, `Sistema Caído`, `Funcionalidades Pendientes`) — **ninguna cubre "Planes y coberturas"/condicionados** (ni siquiera el CP existente de `plans.spec.ts` de VETIFY_ADQUIRENTE vive acá). No se agregó ninguna fila a este Excel por ese motivo — sería forzarlo en una hoja que no le corresponde (se evaluó `Funcionalidades Pendientes`, pero es para gaps de otras features, no encaja). El tracking real de IMAS-4490 vive en `Automation Vetify.xlsx` (roadmap, fila nueva `QA-AUTO-095`) + `docs/coverage-register.md` + el doc de HU dedicado. Dejar esta nota para no re-preguntarse esto en la próxima auditoría.
