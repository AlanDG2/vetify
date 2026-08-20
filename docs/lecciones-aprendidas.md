# Lecciones aprendidas

> Bitácora de aprendizajes QA: bloqueos resueltos, preguntas recurrentes, patrones. **Leer primero** al empezar una sesión. La skill `qa-continuous-learning` define qué documentar aquí y cuándo promover un patrón (3+ veces) a regla.

<!-- Formato por entrada:
### [YYYY-MM-DD] Título corto
**HU relacionada**: <id o N/A>  ·  **Categoría**: <Locators/Datos/Ambiente/...>
**Problema**: ...
**Solución**: ...
**Aprendizaje/Regla**: ...
-->

### [2026-08-05] "videocall.spec.ts" fallaba igual en toda plataforma/config — no era inestabilidad de backend

**HU relacionada**: IMAS-3174, IMAS-3889, IMAS-3909, IMAS-3894 (TS-02 a TS-05)  ·  **Categoría**: Ambiente / helper de test

**Problema**: al validar mobile, la suite fallaba de forma casi idéntica en Desktop y Android, con y sin concurrencia (`--workers=1` y `2`), con sesión de usuario fresca o cacheada. Varias horas de investigación apuntaban a "inestabilidad de lectura del backend QA compartido" como causa.

**Solución**: la causa real era un bug propio — `VetifyWebappApiClient.cancelVideoCall()` llamaba primero a `GET /api/services/pets/cancel_reasons` (endpoint deprecado que devuelve 500 siempre; la UI real, rediseño IMAS-3894, ya no tiene selector de motivo y no lo usa). El error quedaba tragado en `cancelAllScheduledVideocalls()` (`.catch(() => {})`), así que la "limpieza" al inicio de cada test nunca cancelaba nada de verdad — los turnos se fueron acumulando corrida tras corrida hasta tocar el límite real de negocio de 2 turnos por mascota, que sí bloquea de forma determinística. Fix: `PUT /cancel/{id}` directo con `motivo_id: 1` (valor fijo confirmado por prueba directa contra la API, ya que la UI real no expone selector).

**Aprendizaje/Regla**: cuando algo falla igual sin importar plataforma/workers/frescura de sesión, leer el código del `beforeEach`/setup del test que falla ANTES de re-correr a ciegas o de concluir "ambiente inestable" — un error tragado en un helper de limpieza puede simular perfectamente ese patrón. Detalle completo en memoria de sesión `feedback_verify_before_concluding_flaky`.

### [2026-08-05] Botón final de la revisión de turno tiene texto distinto en mobile vs Desktop

**HU relacionada**: IMAS-3174 (TS-02)  ·  **Categoría**: Locators (mobile)

**Problema**: `VideocallFormPage.confirmVideocallBtn` buscaba el texto exacto `'Confirmar videollamada'`. En la corrida contra Android (`Vetify WebApp Android`, viewport Pixel 5) el test se colgaba 60s esperando la respuesta de red de `POST /assistance/493/create` que nunca llegaba — el click nunca encontraba el botón.

**Solución**: confirmado por screenshot real de la corrida que en mobile el mismo botón, mismo lugar, dice **"Continuar"** (mismo label genérico que usa el resto del wizard en esa plataforma). Se cambió el locator a `page.getByRole('button', { name: /^(Confirmar videollamada|Continuar)$/ })` — sin ambigüedad, la pantalla de revisión no tiene otro botón con esos textos.

**Aprendizaje/Regla**: en specs con proyecto mobile habilitado, no asumir que el texto de un botón "final" (confirmar/enviar) es el mismo en todos los breakpoints — validar el paso de confirmación específicamente contra mobile antes de dar un flujo por cerrado, aunque el resto del wizard ya haya sido validado en Desktop.

### [2026-08-05] Las tags de `pooled-users.json` no se auto-validan contra el backend real

**HU relacionada**: TS-02 a TS-05 (pool `VETIFY_ADQUIRENTE`)  ·  **Categoría**: Datos

**Problema**: 3 de 4 cuentas tageadas `ACTIVE, WITH_PET, NO_EMPTY_PLAN` en `pooled-users.json` ya no tenían plan/póliza activa en el backend real — la UI mostraba "Completá su credencial" pese al tag, y `getUserPets()` a veces devolvía la mascota (dato cacheado/parcial) y a veces `[]`.

**Solución**: confirmado navegando manualmente (login real) que esas 3 cuentas, al tocar "Suscribir mascota", reciben *"Para darle cobertura a una nueva mascota, primero elegí su plan en la web"* — no tienen plan, punto. Se retaggearon `BROKEN_NO_PLAN` con nota de fecha en el fixture. Se creó `scripts/maintenance/reset-pooled-user.mjs` para diagnosticar (pets/turnos agendados) y limpiar turnos sueltos de una cuenta pooled a demanda.

**Aprendizaje/Regla**: si una HU depende de un tag específico (`WITH_PET`, `NO_EMPTY_PLAN`, etc.) y el test falla de forma que no tiene sentido con ese tag, verificar manualmente el estado real de la cuenta (login + UI) antes de asumir que el problema está en el test o en el ambiente — el fixture puede simplemente estar desactualizado respecto al backend.

### [2026-08-07] MCP de Playwright rompe contra certificados internos detrás de VPN — falta `--ignore-https-errors`

**HU relacionada**: IMAS-4078  ·  **Categoría**: Ambiente / herramientas (MCP)

**Problema**: al navegar con `mcp__playwright__browser_navigate` a un sitio interno detrás de VPN con certificado no confiable (`reintegros-backoffice.ike.qa`), la llamada falla con `net::ERR_CERT_AUTHORITY_INVALID` — el server de `@playwright/mcp` (configurado en `.mcp.json`) no ignora errores HTTPS por defecto.

**Solución**: agregar el flag `--ignore-https-errors` a los args del server `playwright` en `.mcp.json` (`"args": ["node_modules/@playwright/mcp/cli.js", "--ignore-https-errors"]`). Requiere reiniciar la conexión del MCP para tomar efecto — **un solo "reinicio" no siempre alcanza**: confirmado con `tasklist` / `wmic process where "name='node.exe'" get ProcessId,CommandLine` que el proceso viejo seguía corriendo sin el flag nuevo pese a que el usuario confirmó haber reiniciado Claude Code. Hizo falta un segundo reinicio real para que el server nuevo tomara el `.mcp.json` actualizado.

**Aprendizaje/Regla**: si un sitio nuevo (backoffice, ambiente interno) da `ERR_CERT_AUTHORITY_INVALID` al explorarlo con el MCP de Playwright, no asumir que es un bloqueo real del sitio — es casi seguro el flag faltante en `.mcp.json`. Y si tras "reiniciar" sigue fallando exactamente igual, verificar con `tasklist`/`wmic` que el proceso viejo realmente murió antes de seguir debuggeando el flag en sí.

### [2026-08-07] Figma rate-limited (429) — explorar en vivo con MCP suele ser mejor que esperar al diseño de todos modos

**HU relacionada**: IMAS-4023  ·  **Categoría**: Ambiente / herramientas

**Problema**: `npm run figma -- node <FILE_KEY> <NODE_ID>` devolvió `429 Rate limit exceeded` de forma persistente (2 intentos, con espera entre medio) al intentar leer el nodo de Figma referenciado en una HU para obtener el texto exacto de un mensaje de error.

**Solución**: en vez de seguir reintentando/esperando el rate limit, se navegó en vivo contra el ambiente QA real vía MCP de Playwright y se confirmaron ahí los textos y comportamientos exactos necesarios para los asserts — resultó más confiable que el diseño de Figma de todos modos, porque reveló comportamiento real no capturado en el diseño (mensaje de error distinto según el tipo de error; al llegar al límite de 5 archivos se oculta el input en vez de mostrar un mensaje).

**Aprendizaje/Regla**: para HUs que remiten a Figma solo para confirmar copy/texto exacto de UI (no para maquetación/diseño visual), priorizar la exploración en vivo vía MCP contra el ambiente real antes que depender de Figma — es la fuente de verdad de lo que un test realmente necesita. Si Figma da 429, no bloquear el intake por eso; no vale la pena reintentar más de una vez.

### [2026-08-07] Explorando una SPA nueva con MCP: navegar directo a una URL con id no siempre puebla el estado — hay que clickear desde la lista

**HU relacionada**: IMAS-4078  ·  **Categoría**: Herramientas (MCP) / exploración de UI nueva

**Problema**: en el backoffice de Reintegros (SPA), hacer `browser_navigate` directo a `/expedientes/<id>` como primera carga de la página no pobló el panel de detalle (quedaba el placeholder "Seleccioná un expediente"). Además, el browser gestionado por el MCP se desconectó solo una vez por inactividad entre acciones (esperando confirmación del usuario), y la siguiente llamada falló con "Target page, context or browser has been closed".

**Solución**: en vez de navegar directo a la URL con id, hacer click en el link/card correspondiente desde la lista ya cargada — el router de la SPA sí puebla el estado del panel de detalle en ese caso. Ante una desconexión por inactividad, simplemente renavegar y volver a loguear (la sesión de la app no se pierde del lado del servidor, solo el contexto del browser del MCP).

**Aprendizaje/Regla**: al explorar una SPA nueva por primera vez con el MCP, preferir navegación por click (desde una lista/menú ya cargado) antes que URLs profundas directas, salvo que ya se haya confirmado que la SPA soporta deep-linking. Si una acción del MCP falla con "Target page, context or browser has been closed" tras una pausa larga, no es un error real — solo hace falta renavegar.

### [2026-08-08] El Excel de casos de prueba queda desactualizado respecto al código real — patrón recurrente (4+ veces en una sesión)

**HU relacionada**: Auditoría completa de `documentation/Casos de Prueba.xlsx` (hojas Videollamadas, Credenciales, Gestión de Usuario, Flujo de Compra, Perfil)  ·  **Categoría**: Proceso / gestión de casos de prueba

**Problema**: al cruzar cada hoja del Excel contra los `.spec.ts` reales, aparecieron divergencias en ambas direcciones, repetidas en casi todas las hojas: (a) CPs marcados `No` que en realidad ya estaban cubiertos por un test de regresión con nombre distinto al CP original (ej. `TC-07 CP10,CP12` en videollamada), y (b) CPs marcados `No`/`Parcial` que describían un comportamiento que **ya no existe** en el producto (ej. "Cargar credencial sin foto (Omitir)" — la foto es obligatoria por diseño hoy; "Cambiar DNI" en Perfil — no existe forma de cambiar el DNI desde la UI, solo llamando a un 0800).

**Solución**: para cada hoja, se generó primero un mapeo CP↔test real (grep de títulos `test('TC-...')` + lectura del spec) antes de tocar código, y se corrigió el Excel en ambos sentidos: `No→Sí` cuando el código ya cubría el caso, y título con tag `[Obsoleto]`/`[Bug conocido]` (manteniendo `Automatizado?=No` o el valor real, sin inventar un estado nuevo tipo "No aplica" fuera del vocabulario Sí/No/Parcial ya usado en la hoja) cuando el CP describía algo que ya no aplica.

**Aprendizaje/Regla**: no confiar en el Excel como fuente de verdad de qué está automatizado — es una foto desactualizada. Antes de automatizar un CP marcado `No`, buscar primero si ya existe cobertura con otro nombre/test de regresión. Y si al automatizar un CP se descubre que el comportamiento descrito no existe más en el producto, no forzar un test que documente una premisa falsa — verificar en vivo (o preguntar a negocio si es ambiguo, como pasó con la foto obligatoria de credencial) y corregir el Excel, no solo el código.

### [2026-08-08] Usuarios `Fresh` (no registrados) cuestan una compra real — no gastarlos en validaciones de formulario que no la necesitan

**HU relacionada**: Gestión de Usuario TS-03 Activación de Cuenta (CP-01 Campos obligatorios, CP-02 Listado de tipos de documentos), 4 productos  ·  **Categoría**: Datos / diseño de test

**Problema**: el patrón existente para probar la pantalla de activación de cuenta (`policyValidationPage`) pedía un usuario `UserSource.Fresh` con tag `UNREGISTERED` — ese tag se genera vía `UserFactory.generateTestUsers()`, que ejecuta una **compra real completa contra MercadoPago sandbox** por cada cuenta. El pool de estas cuentas es chico (3 para `VETIFY_ADQUIRENTE`) y se agotó durante la sesión al intentar correr 2 tests nuevos de validación de formulario que en realidad no necesitaban un plan comprado atrás.

**Solución**: los CPs que solo validan el formulario en sí (campos vacíos, contenido de un dropdown) no necesitan una cuenta con plan — **cualquier registración exitosa** (vía `registrationPage.register({email: getRandomEmail(), password: getRandomPassword()})`, sin pool ni compra) aterriza en la misma pantalla `/validation/policy`. Se movieron esos 2 CPs a un `test.describe` independiente que registra una cuenta descartable en vez de reservar del pool `Fresh/UNREGISTERED`, dejando ese pool intacto para los casos que sí necesitan cobertura real (CP-04/CP-05).

**Aprendizaje/Regla**: antes de pedir un usuario `Fresh` o cualquier fixture que dispare una transacción real (compra, cupón, etc.), preguntar si el CP realmente necesita ese estado de negocio o solo necesita *llegar* a la pantalla — si es lo segundo, generar la cuenta mínima necesaria inline en vez de reservar del pool caro.

### [2026-08-08] Un método de POM que dispara un guardado async debe esperar la confirmación antes de devolver el control

**HU relacionada**: Perfil TC-04 (Actualizar teléfono)  ·  **Categoría**: Patrón de código (POM)

**Problema**: `MyProfilePage.saveChanges()` solo hacía `await this.saveBtn.click()` sin esperar nada más. El test hacía `saveChanges()` seguido de `load()` (recargar para verificar persistencia) y el teléfono actualizado **no aparecía** — el reload se adelantaba al guardado real en el backend (carrera entre el POST de guardado y la navegación siguiente).

**Solución**: se agregó `profileUpdatedToastLbl` (locator del toast "Perfil actualizado correctamente" confirmado en vivo) y `saveChanges()` ahora espera ese toast visible antes de retornar.

**Aprendizaje/Regla**: cualquier método de POM que dispare una acción de guardado/submit debe esperar una señal de finalización real (respuesta de red, toast, cambio de URL) antes de devolver el control al test — nunca asumir que un `.click()` solo es suficiente si el siguiente paso del test depende de que la escritura ya haya persistido server-side. Si un test que verifica persistencia falla de forma intermitente justo después de guardar, sospechar primero de esta carrera antes de asumir un bug de producto.

### [2026-08-08] `playwright/auth/<userId>.json` vencido hace que un test aterrice en login sin ningún error de locator

**HU relacionada**: Perfil (todos los TCs, primera corrida)  ·  **Categoría**: Ambiente / storageState

**Problema**: los 4 tests de `profile.spec.ts` fallaron con timeouts genéricos tipo "elemento no encontrado" (`Editar datos`, avatar) sin ninguna relación aparente con el código nuevo. El screenshot del fallo mostró que la página había caído en `/auth/login` — la `storageState` cacheada para ese usuario pooled (`playwright/auth/<id>.json`) estaba vencida, y `loginWithUserRequest()` la reusa sin validar que la sesión siga viva.

**Solución**: se identificó el `id` del usuario en `pooled-users.json` por email, se borró su archivo cacheado en `playwright/auth/`, y la siguiente corrida hizo login fresco y volvió a guardar un storageState válido.

**Aprendizaje/Regla**: si un test que usaba locators ya verificados en vivo (vía MCP, la misma sesión) falla con "elemento no encontrado" en la primera corrida automatizada, revisar el screenshot antes de sospechar del locator — si la pantalla real es el login, el problema es la `storageState` cacheada, no el POM. Fix: borrar `playwright/auth/<userId>.json` de esa cuenta puntual (no hace falta limpiar todo el directorio).

### [2026-08-07] Un test fuera del `describe()` que tiene `test.use()`+`beforeEach()` corre sin login, sin avisar — pasa "about:blank"

**HU relacionada**: IMAS-3899 (TC-03), IMAS-4023 (TC-07/TC-08/TC-09)  ·  **Categoría**: Patrón de código (estructura del spec) — **ocurrió 2 veces en la misma sesión**

**Problema**: al agregar tests nuevos a `videocall.spec.ts`, los pegué como hermanos del `test.describe()` que contiene el `test.use({ userRequest })` + `test.beforeEach()` (login y navegación), en vez de DENTRO de él. Playwright no tira ningún error de estructura — el test corre igual, pero sin `userRequest` no hay login y sin `beforeEach` no hay navegación previa. El fallo resultante es engañoso: el primer locator que se busca tira timeout con "element(s) not found", y el trace muestra `frameUrl: "about:blank"` — nada que apunte obviamente a "te olvidaste el `describe`".

**Solución**: mover el/los `test('TC-...', ...)` nuevos para que queden anidados dentro del `test.describe(() => { test.use(...); test.beforeEach(...); ... })` correspondiente, no como hermanos después de que ese bloque cierra.

**Aprendizaje/Regla**: al agregar un test nuevo a un spec existente, verificar SIEMPRE en qué nivel de anidación de `describe()` está cayendo la llave de cierre `});` justo antes de pegar el nuevo test — copiar-pegar cerca del final de un bloque es la forma más fácil de terminar afuera sin darse cuenta. Si un test nuevo falla con "elemento no encontrado" en el primerísimo paso (antes incluso de loguear), revisar el trace: `frameUrl: "about:blank"` confirma que nunca hubo `userRequest`/login, no es un problema de locator.

### [2026-08-07] `setInputFiles()` llamado varias veces seguidas sin esperar REEMPLAZA el archivo, no lo suma

**HU relacionada**: IMAS-4023 (TC-07/TC-08, límite de 5 archivos)  ·  **Categoría**: Patrón de código (Playwright)

**Problema**: un loop de 5 llamadas seguidas a `uploadAttachment()` (que internamente hace `fileInput.setInputFiles(path)`) sin esperar nada entre medio dejó **1 solo archivo adjuntado**, no 5 — confirmado con captura real. El test pasaba igual porque no se verificaba la cantidad, solo el estado final.

**Solución**: esperar a que cada archivo aparezca en la lista de adjuntos (`expect(attachedFileNameLbl).toHaveCount(i + 1)`) antes de disparar la siguiente llamada a `setInputFiles()`.

**Aprendizaje/Regla**: en cualquier flujo de "adjuntar múltiples archivos", no asumir que `setInputFiles()` en loop se acumula — si la UI necesita procesar/registrar cada archivo (llamada a red, re-render) antes de aceptar el siguiente, dispararlos todos seguidos puede pisar la selección anterior en vez de sumarla. Verificar el conteo real después de cada carga, no solo al final.

### [2026-08-07] Un método de POM que espera una respuesta 200 específica se cuelga en casos negativos — no reusarlo para el camino de error

**HU relacionada**: Credenciales CP-21 (formato de foto no permitido)  ·  **Categoría**: Patrón de código (POM)

**Problema**: `AddPetFormPage.uploadPetFilePhoto()` hace `Promise.all([waitForResponse(r => r.url().includes('/api/files/upload/pets') && r.status() === 200), fileInput.setInputFiles(path)])`. Al reusarlo para subir un archivo que el backend rechaza, la respuesta nunca es 200 — el `waitForResponse` nunca resuelve y el test cuelga hasta el timeout genérico, con un error que no dice nada sobre "formato inválido".

**Solución**: para el caso negativo, no usar el método del POM — llamar directo al locator (`petPhotoFileInput.setInputFiles(path)`) sin esperar una respuesta puntual, y verificar el mensaje de error visible en la UI.

**Aprendizaje/Regla**: si un método de POM está escrito para el camino feliz y espera una respuesta de red con un status específico de éxito, no asumir que sirve tal cual para el caso negativo equivalente — revisar su implementación antes de reusarlo, y si espera un status fijo, bajar al locator crudo para el test que espera que la operación falle.

### [2026-08-07] Copiar manualmente una cuenta entre `pooled-users.json` y `fresh-users.json` las desincroniza — hay que actualizar las dos copias

**HU relacionada**: IMAS-3899, IMAS-4023, Credenciales CP-21/CP-02  ·  **Categoría**: Datos / gestión del pool

**Problema**: varias veces en la sesión se generó una cuenta fresca (que vive en `fresh-users.json`) y se copió a mano a `pooled-users.json` para que un test con `UserSource.Pooled` pudiera usarla. Al consumirse la cuenta (se le sube una mascota), solo se actualizaba el tag en el archivo que se estaba mirando en ese momento — la otra copia quedaba con el tag viejo (`NO_PET`) apuntando a una cuenta que en la realidad ya es `WITH_PET`, lista para volver a causar el mismo síntoma de IMP-003 en el próximo test que la pida por el otro `UserSource`.

**Solución**: cuando se copia una cuenta entre fixtures, tratarla como una sola entidad con 2 copias — al actualizar el tag tras consumirla, actualizar **ambos** archivos, no solo el que se usó para reservarla.

**Aprendizaje/Regla**: antes de dar por buena una cuenta con `NO_PET`/`PLAN_WITHOUT_PET`, si existe la posibilidad de que haya sido copiada entre `pooled-users.json` y `fresh-users.json` en algún momento, verificar el estado real vía API (`getUserPets()`) en vez de confiar en el tag de cualquiera de los dos archivos — es el mismo patrón de fondo que la lección del 2026-08-05 sobre tags desactualizadas, pero específico de cuentas que viven en dos fixtures a la vez.

### [2026-08-07] `UserFactory` (compra + registro + validación) necesita ~15 min de espera real, no 8 — y confirmado que el camino automatizado SÍ funciona con esa espera

**HU relacionada**: IMAS-3899 (retest IMAS-4102), Credenciales CP-21/CP-02  ·  **Categoría**: Ambiente (IMP-004)

**Problema**: generar una cuenta fresca vía `UserFactory.generateTestUsers()` + `activateFreshAccounts()` falló 6+ veces seguidas en la sesión con el síntoma de siempre (`isClient: false`, rebote entre `/validation/policy` y `/auth/login`), incluso agregando una espera explícita de 8 minutos entre la compra y la validación de póliza — llevando a sospechar que el camino automatizado usaba un endpoint de compra distinto del checkout real (que sí funcionaba a mano).

**Solución**: con 15 minutos de espera real entre la compra y la validación, el mismo camino automatizado funcionó — 2/2 cuentas activadas correctamente. Era timing de propagación (IMP-004), no un camino de backend distinto.

**Aprendizaje/Regla**: si `UserFactory`/`activateFreshAccounts()` falla con el síntoma de IMP-004, no concluir que el camino automatizado está roto de fondo solo porque una espera de 8 min no alcanzó — probar con 15 min antes de descartarlo. `src/scripts/generate-fresh-videocall-users.ts` ya quedó con `waitMinutes = 15` por defecto para la próxima vez que se necesite una cuenta `NO_PET`.

### [2026-08-07] Si un test falla con "Test not found in the worker process" o un spec parece cambiar solo, puede haber otra sesión editando el mismo repo en vivo

**HU relacionada**: IMAS-3894 (retest BUG-003/IMAS-4119)  ·  **Categoría**: Ambiente / colaboración multi-sesión

**Problema**: en una corrida de `videocall.spec.ts`, un test falló con `"Test not found in the worker process. Make sure test title does not change."` para un título que, al leer el archivo después, ya no existía — había sido reemplazado por otro test con nombre distinto. El archivo había cambiado entre la fase de "listar tests" de Playwright y la fase de ejecución real de los workers.

**Solución**: `git status`/`git diff` reveló cambios sin commitear en varios archivos (spec, POM, docs, y hasta un comentario nuevo publicado en Jira) que no fueron hechos por esta sesión — otro proceso (otra sesión de Claude Code, u otra persona) estaba trabajando el mismo repo en paralelo, en el mismo momento.

**Aprendizaje/Regla**: si aparece `"Test not found in the worker process"` o cualquier discrepancia entre lo que se esperaba encontrar y lo que hay en el archivo, no asumir corrupción o un bug de Playwright — correr `git status`/`git diff` primero para descartar (o confirmar) que hay otra sesión escribiendo sobre el mismo working tree en simultáneo. No pisar esos cambios; si son legítimos, coexistir y avisar al usuario.

### [2026-08-07] "Rechazado en el login" no es evidencia de un control de acceso — puede ser solo que la cuenta no existe en ese sistema

**HU relacionada**: IMAS-3742 (WebApp de Iké)  ·  **Categoría**: Metodología / diseño de casos

**Problema**: `TC-01` de `access-control.spec.ts` daba por válido que un usuario Vetify-only rechazado en el login de la WebApp de Iké era evidencia de que el control de acceso por plan (`IMAS-3744`) estaba funcionando (CA01). El test "pasaba", pero no probaba lo que decía probar.

**Solución**: se comparó la respuesta de red exacta del login rechazado contra la de un email completamente inventado (nunca registrado en ningún lado, en cualquier sistema). Ambos dieron el mismo error exacto (`403 invalid_grant "Wrong email or password"`, desde un tenant de Auth0 dedicado a Iké). Eso probó que el rechazo ocurre a nivel de identidad (la cuenta no existe en ese sistema), antes de que exista oportunidad de evaluar ningún plan — el test estaba probando una cosa distinta a la que su título/CA afirmaban.

**Aprendizaje/Regla**: cuando un caso de prueba de control de acceso depende de credenciales que cruzan de un sistema a otro (login de un producto probado con cuenta de otro producto, SSO entre apps separadas, etc.), un "rechazo" NO alcanza como evidencia de que el control específico bajo prueba esté funcionando — puede ser simplemente que la cuenta no existe del lado que se está probando. Comparar contra un caso de control claramente inválido (email inventado) para ver si el error es idéntico; si lo es, el test no está probando lo que dice probar y hay que conseguir una cuenta que sí exista en ambos sistemas antes de dar el CA por válido.

### [2026-08-08] Subir un archivo clickeando + esperando el file-chooser del SO: patrón ya descartado en este proyecto, no reinventarlo

**HU relacionada**: Perfil (`MyProfilePage.changeProfilePhoto`)  ·  **Categoría**: Patrón de código (POM) / consistencia

**Problema**: al escribir `changeProfilePhoto()` para la foto de perfil, se implementó con `page.waitForEvent('filechooser')` + click sobre el avatar. Los tests pasaron, pero el patrón contradice una decisión ya tomada (y documentada con comentario inline) en `VideocallFormPage.ts` línea 97-101: manejar el diálogo nativo del sistema operativo vía click es **flaky en uploads repetidos dentro del mismo test** — la solución adoptada ahí y en `AddPetFormPage.ts` es ubicar el `<input type="file">` oculto y llamar `setInputFiles()` directo, sin pasar por el diálogo del SO en absoluto.

**Solución**: se corrigió `MyProfilePage.ts` para usar `avatarFileInput.setInputFiles(filePath)` directo, igual que los otros dos POMs.

**Aprendizaje/Regla**: antes de escribir un método de upload nuevo en un POM, grepear `setInputFiles` en `src/pages/` — si ya existe un patrón resuelto para subir archivos en este proyecto, replicarlo en vez de reinventar uno propio (el click+file-chooser es tentador porque "funciona" en una corrida aislada, pero ya está descartado por una razón documentada). Esto es la 3ra vez que el proyecto usa este patrón (`AddPetFormPage`, `VideocallFormPage`, `MyProfilePage`) — candidato a promover a regla explícita en la skill `qa-pom-authoring` si aparece una 4ta.

### [2026-08-08] Varios tests con `ignoreReserved: true` sobre la MISMA cuenta pooled, corridos en paralelo, invalidan la sesión cacheada entre ellos

**HU relacionada**: Perfil (los 4 TCs de `profile.spec.ts`)  ·  **Categoría**: Ambiente / storageState / paralelismo

**Problema**: los 4 tests de `profile.spec.ts` comparten un único `test.describe` con `userRequest: { tags: [ACTIVE, WITH_PET], reserve: false, ignoreReserved: true }` — sin reserva exclusiva, los 4 workers en paralelo piden y usan la MISMA cuenta pooled al mismo tiempo. La corrida falló 2 veces seguidas con los 4 tests aterrizando en `/auth/login` en vez de en la pantalla esperada (ver lección anterior sobre `storageState` vencida) — pero acá la causa no era una `storageState` vieja de una sesión previa, sino contención entre los propios 4 workers de la misma corrida leyendo/escribiendo el mismo archivo `playwright/auth/<id>.json` en simultáneo. Con `--workers=1` (sin concurrencia posible) los mismos 4 tests pasaron siempre.

**Solución**: no se cambió el código — se documenta como patrón a vigilar. Si una suite nueva con `ignoreReserved: true` sobre pocos usuarios empieza a fallar de forma intermitente con síntoma "aterrizó en login", correr primero con `--workers=1` para confirmar si es esto antes de investigar el POM/spec.

**Aprendizaje/Regla**: `ignoreReserved: true` está pensado para tests de solo-lectura que no les importa compartir cuenta, pero **no serializa el acceso a la `storageState` cacheada** — con varios `describe`/tests independientes pidiendo el mismo perfil de usuario y corriendo en workers paralelos, hay una carrera real de lectura/escritura sobre `playwright/auth/<id>.json`. Si una suite nueva reutiliza una sola cuenta para varios tests de solo-lectura, considerar `test.describe.configure({ mode: 'serial' })` (como ya hace `TS-03 Activación de Cuenta`) en vez de dejarlos correr en paralelo sobre la misma cuenta compartida.
