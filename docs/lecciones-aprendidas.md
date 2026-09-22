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

**✅ Promovido a regla en CLAUDE.md (2026-09-06)**, tras confirmarse 5+ veces (ver también la entrada del 2026-08-07 sobre copiar cuentas entre fixtures, y las 2 recurrencias del 2026-09-06) — ver sección "Autenticación" de CLAUDE.md.

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

### [2026-08-26] `createDefect()` sin `description` no avisa en el padre — el comentario automático se salta en silencio

**HU relacionada**: IMAS-3610 (bugs `IMAS-4439`/`IMAS-4447`/`IMAS-4450`)  ·  **Categoría**: Jira / `adapters/jira/client.mjs`

**Problema**: al reportar `IMAS-4439` con `createDefect({ parentKey, summary, briefDescription, steps, actualResult, expectedResult, environment, evidence })` (sin pasar `description`), el Defect se creó bien y el campo "Descripción del error" quedó completo — pero el comentario automático de aviso en la HU padre (`Bug reportado: <key> — <summary>`) **no se publicó**, sin ningún error ni warning visible. Se detectó recién al verificar manualmente los comentarios de la HU después de la escritura.

**Solución**: la condición real en el código es `if (bug.parentKey && bug.description)` — el aviso depende específicamente de `description` (string plano), no de los campos estructurados (`briefDescription`/`steps`/etc.) que sí alimentan el campo custom. Se agregó el comentario faltante a mano con `scripts/jira/jira-client.mjs comment <KEY> <texto>`. En las 2 llamadas siguientes (`IMAS-4447`, `IMAS-4450`) se pasó también un `description` corto y el aviso se publicó solo, sin intervención.

**Aprendizaje/Regla**: al llamar `createDefect()` con `parentKey`, pasar SIEMPRE también un `description` (aunque sea una oración corta) — no alcanza con los campos estructurados para que se dispare el aviso automático en el padre. Regla del guardrail Jira igual aplica: releer el padre después de escribir (paso 5 de `jira/update-rules.md`) para confirmar que el comentario efectivamente llegó, no asumirlo.

### [2026-08-27] Comparar 2 cuentas del pool que difieren en más de una variable a la vez invalida la comparación

**HU relacionada**: IMAS-4356 (banner Cooper OSDE)  ·  **Categoría**: Datos de prueba / diseño de casos

**Problema**: para saber si el banner de "Cooper" (nuevo, reemplaza a "Vetify PLUS" para OSDE) depende del segmento OSDE (Capitado vs. Adquirente), se probó con el único usuario Capitado disponible (`WITH_PET`, perfil completo) y el único Adquirente disponible (`NO_PET`, perfil incompleto) — Capitado mostró Cooper, Adquirente no. A punto de concluir "Adquirente no tiene Cooper, puede ser un bug", se notó que los dos usuarios NO solo difieren en el segmento — también difieren en si el perfil está completo o no. La comparación mezclaba dos variables a la vez, así que no se puede saber cuál de las dos explica la diferencia observada.

**Solución**: no se concluyó nada — se dejó documentado como confusión sin resolver (`docs/user-stories/IMAS-4356-*.tests.md`, CP06/CP07) en vez de reportar un bug con evidencia débil. Se intentó conseguir una cuenta Adquirente CON perfil completo para aislar la variable (bloqueado por otro problema, `BUG-021`).

**Aprendizaje/Regla**: antes de comparar el comportamiento de 2 cuentas del pool para aislar una variable puntual (segmento, plan, tipo de documento, lo que sea), revisar **todos** los tags de las dos cuentas, no solo el que se cree que es la variable en juego — `pooled-users.json` casi nunca tiene cuentas que difieran en una sola dimensión. Si no hay una cuenta que aísle la variable real, decirlo explícitamente como limitación en vez de concluir con una comparación contaminada.

### [2026-08-27/28] Issues tipo "Tarea" guardan la descripción real en `customfield_11620`, no en `description` — una sesión entera investigó un confound que el spec ya resolvía

**HU relacionada**: IMAS-4356 (banner Cooper OSDE) e IMAS-4408 (ocultar credenciales planes inactivos)  ·  **Categoría**: Jira / `scripts/jira/jira-client.mjs`

**Problema**: se reportó "descripción vacía" en `IMAS-4408` (tipo Tarea) — el campo estándar `description` efectivamente venía vacío vía `getIssue()`. El usuario pegó el texto completo de la descripción real (objetivo, estados, escenarios, 12 criterios de aceptación), contradiciendo lo reportado. Al investigar, el contenido completo estaba en **`customfield_11620`**, un campo custom que ni `getIssue()` ni `fetchStory()` revisan. Se confirmó retroactivamente que **`IMAS-4356`** (también tipo Tarea, trabajada toda la sesión anterior) tenía el mismo problema — su spec real (incluyendo que el banner debía mostrarse a OSDE Adquirente sin ninguna ambigüedad) estuvo ahí todo el tiempo, sin leerse. Un ticket tipo "Historia" (`IMAS-3610`) se verificó limpio — su contenido real sí está en el campo estándar.

**Costo real**: la sesión anterior completa investigando si "OSDE Adquirente debía ver el banner de Cooper" (segmento vs. perfil vs. plataforma, con retest en vivo, catálogos de producto, etc.) hubiera sido innecesaria — el spec real en `customfield_11620` decía explícitamente que sí, sin condición, desde el principio.

**Solución**: se extrajo el texto real con `extractText(issue.fields.customfield_11620)`, se corrigieron ambos documentos de HU (`IMAS-4408-*.md` desde cero, `IMAS-4356-*.md` con una sección de corrección al principio sin borrar el análisis original). No se modificó el código de `jira-client.mjs` todavía — pendiente de decidir con el usuario si conviene que `getIssue()`/`fetchStory()` revisen ambos campos automáticamente.

**Aprendizaje/Regla**: ante cualquier issue de Jira con `description` estándar vacío, **no concluir que la HU no tiene especificación** — chequear `customfield_11620` primero, especialmente si el tipo de issue es "Tarea". Esto aplica retroactivamente a cualquier Tarea ya analizada en sesiones previas cuyo `description` estándar haya salido vacío — no se puede asumir que ese análisis fue completo sin volver a chequear este campo.

### [2026-09-04] `RegistrationPage.register()` colgaba 30s en cuentas que YA existían — nunca se leía el status real de la respuesta

**HU relacionada**: sesión de estabilización general (activación de cuentas Fresh)  ·  **Categoría**: Patrón de código (POM) / Ambiente

**Problema**: 4 cuentas "fresh" llevaban semanas acumulando tags `ERROR` (hasta 20+ cada una) en cada corrida — `register()` esperaba con `waitForResponse(r => r.url().includes('/api/users/create') && r.status() === 200)`, y si el status real no era 200 (porque la cuenta ya se había registrado en un intento anterior que se cortó a mitad de camino, entre el registro y la validación de póliza), la promesa nunca resolvía y el test colgaba los 30s completos con un `TimeoutError` genérico, sin ninguna pista de la causa real. Mismo patrón de fondo que la lección del 2026-08-07 sobre POMs que esperan un status fijo de éxito, pero acá el costo compuesto (repetido en cada corrida, sobre las mismas 4 cuentas, sin nunca resolverse) fue mucho mayor.

**Solución**: se cambió `register()` para capturar la respuesta real (`waitForResponse` sin filtro de status) y verificar `.status()` explícitamente — si es 400 con `registrationSuccessful=true`, se lanza un error tipado (`AccountAlreadyExistsError`) en vez de dejar que el timeout genérico oculte la causa. `account-activation-setup.ts` ahora atrapa ese error específico y, en vez de descartar la cuenta, hace login directo y retoma desde donde haya quedado (chequeando si ya pasó la validación de póliza vía `page.url()` antes de reintentarla). Las 4 cuentas se recuperaron 100% en la siguiente corrida.

**Aprendizaje/Regla**: si un `waitForResponse` filtra por un status específico de éxito, capturar igual la respuesta SIN el filtro y ramificar según el status real — un status inesperado nunca debe traducirse en un timeout ciego, sino en un error explícito que diga qué pasó. Y si una cuenta/entidad "falla" en un paso reproducible siempre (nunca transitorio), sospechar que el paso anterior SÍ tuvo éxito en algún momento pasado y el flujo no contempla retomar desde ahí — no asumir que hay que repetir todo desde cero.

### [2026-09-05] El ✓/• de un checklist de política de contraseña no era texto del DOM — era un pseudo-elemento CSS `::before`

**HU relacionada**: TS-05 Cambio de contraseña (4 productos)  ·  **Categoría**: Locators / comportamiento inesperado de UI

**Problema**: `policyCriterionChecked(criterio)` usaba `getByText('✓ ' + label)` y nunca encontraba nada — "element(s) not found" pese a que el criterio SÍ se veía marcado como cumplido en pantalla (confirmado por screenshot). El accessibility snapshot (`error-context.md`) mostraba el texto "✓ Letras minúsculas (a-z): ." en el árbol de accesibilidad, lo que hacía parecer que el texto SÍ estaba ahí.

**Solución**: se armó un script descartable que reproducía el mismo flujo y corría `getComputedStyle(li, '::before').content` sobre cada `<li>` del checklist — confirmó que el símbolo (`"✓"` o `"•"`) es contenido CSS generado (`::before`), nunca parte de `textContent`/`innerText` reales. El accessibility snapshot lo muestra porque la accesibilidad computa un "nombre accesible" que SÍ incluye pseudo-contenido — pero Playwright's `getByText()` opera sobre el DOM real, no sobre el árbol de accesibilidad. El método se reescribió para leer `getComputedStyle(el, '::before').content` del `<li>` más específico (usando `.last()` sobre `locator('li', {hasText: label})`, ya que los `<li>` ancestros también matchean por texto y siempre preceden a sus descendientes en orden de documento).

**Aprendizaje/Regla**: si un accessibility snapshot muestra un texto pero `getByText()` no lo encuentra ("element(s) not found" con el elemento visiblemente presente en el screenshot), sospechar de contenido generado por CSS (`::before`/`::after`/`list-style`) antes de seguir ajustando el string del locator — ninguna variación de texto va a matchear nunca contenido que no está en el DOM. Confirmar con `getComputedStyle(el, '::before'/'::after').content` en un script descartable antes de reescribir el locator.

### [2026-09-06] Un test con 2 round-trips de email real (cada uno con cooldown propio) puede superar el timeout global sin ningún bug de lógica

**HU relacionada**: TS-05 TC-04 "Cambio exitoso..." (3 productos)  ·  **Categoría**: Timing / diseño de test

**Problema**: `TC-04` (cambio de contraseña completo: reset → login nueva contraseña → login vieja rechazado → reintentar link usado) falló con `Test timeout of 180000ms exceeded`, sin ningún error de aserción — solo un timeout genérico. El test hace su propio `requestResetLink()` MÁS otro dentro de `restorePassword()` en el `finally` — y `requestResetLink()` tiene un cooldown de 90s por cuenta (agregado el 2026-08-29 para evitar que pedidos seguidos generen un link caducado). 2×90s de cooldown + la entrega real de cada correo supera cómodamente el timeout global de 180s configurado en `playwright.config.ts`.

**Solución**: `test.setTimeout(300_000)` al inicio de estos 3 tests — no hizo falta tocar ninguna lógica del test en sí.

**Aprendizaje/Regla**: antes de investigar un `Test timeout exceeded` genérico (sin aserción asociada) como si fuera un bug de lógica/locator, sumar el tiempo real acumulado de TODAS las esperas conocidas del test (cooldowns documentados, `wait()` explícitos, reintentos) contra el timeout configurado — si la suma ya supera el timeout, la solución es `test.setTimeout()`, no seguir buscando un locator roto. Aplica en particular a cualquier test que dispare 2+ flujos de email real dentro del mismo `test()` (flujo principal + limpieza en `finally`).

### [2026-09-06] `npx playwright test --last-failed` lee el estado de la ÚLTIMA invocación de Playwright, no de la última corrida "completa" que uno tiene en mente

**HU relacionada**: sesión de estabilización general  ·  **Categoría**: Herramientas (Playwright CLI)

**Problema**: tras una corrida de 16 tests fallidos, se corrigió 1 test puntual y se lo verificó de forma aislada (`-g "nombre del test"`). Al querer re-correr los 16 originales con `--last-failed`, Playwright solo re-corrió ESE 1 test verificado — `.last-run.json` (la fuente de `--last-failed`) se sobreescribe con CADA invocación de `npx playwright test`, sin importar cuántos tests corrió esa invocación puntual.

**Solución**: para re-correr un conjunto específico de tests conocido (no "los últimos que fallaron", sino "estos 16 en particular"), pasar los archivos con `archivo.spec.ts:línea` explícitos como argumentos posicionales, en vez de depender de `--last-failed` después de haber corrido cualquier otra cosa en el medio.

**Aprendizaje/Regla**: `--last-failed` solo es confiable como el PRÓXIMO comando después de la corrida completa cuyo resultado se quiere reproducir — cualquier invocación de Playwright en el medio (aunque sea un solo test de verificación) lo invalida en silencio, sin ningún aviso. Si hace falta re-correr un set específico de tests con seguridad, anotar los `archivo:línea` exactos en vez de confiar en el estado implícito de `--last-failed`.

### [2026-09-06] El reporte de Allure SÍ se regenera cada vez — pero la carpeta de nivel superior y los bundles JS estáticos nunca cambian de fecha, y eso engaña

**HU relacionada**: sesión de estabilización general  ·  **Categoría**: Herramientas (Allure)

**Problema**: al verificar si `npm run allure:generate` realmente actualizaba el reporte, se chequeó la fecha de modificación de `allure-report/` (la carpeta) y de sus archivos `*.app-*.js` (bundle de la app del visor) — ninguna de las dos cambiaba entre corridas, lo que hizo pensar por un momento que el comando fallaba en silencio (hipótesis reforzada porque la CLI de Allure 3 no tiene ni necesita un flag `--clean`, a diferencia de la vieja suposición de Allure2 Java).

**Solución**: los datos reales de cada test viven en `allure-report/awesome/data/test-results/*.json` (y carpetas hermanas `test-env-groups/`, `attachments/`) — esas SÍ se actualizan en cada `generate`, con contenido nuevo confirmado por grep de títulos de test recién corridos. El bundle de la app (JS/CSS del visor) legítimamente no cambia porque es el mismo código de la versión de `allure` instalada, no datos.

**Aprendizaje/Regla**: para confirmar si un `allure generate` realmente actualizó el reporte, no mirar la fecha de la carpeta contenedora ni de los archivos `*.app-*.js`/`*.css` de nivel superior — revisar `allure-report/awesome/data/test-results/` (fecha de modificación, o mejor, grep de un título de test que se sepa que corrió recién). El motivo real de que un usuario vea contenido viejo suele ser una pestaña de navegador ya abierta de antes (el server de `allure open` sirve estático; recargar una pestaña vieja no re-sirve nada si esa invocación de `allure open` ni llegó a levantarse), no que el `generate` haya fallado.

### [2026-09-07] La migración a `UserSource.Fresh` del 2026-09-04 rompió el test de Tour "primer login" — la propia activación "quema" el disparador antes de que el test lo vea

**HU relacionada**: N/A (no ligado a una HU puntual, `tests/projects/vetify-webapp/session.spec.ts` TS-03 TC-01)  ·  **Categoría**: Ambiente / arquitectura de pool de usuarios

**Problema**: al re-verificar en vivo `session.spec.ts` completo (motivado por la pregunta "qué más se puede automatizar"), 5 de 6 tests pasaron limpio, pero **TS-03 TC-01 "Tour de onboarding en el primer login" ahora falla siempre** (reproducido 2 veces seguidas, no es flaky) — el locator del banner de bienvenida (`tourWelcomeStartBtn`, `.nth(1)`) no encuentra ningún elemento. Este mismo test se había migrado a `UserSource.Fresh` el 2026-09-04 (para resolver el agotamiento del pool de cuentas Pooled vírgenes) bajo el supuesto de que "cada corrida pide una cuenta recién activada que por construcción nunca vio el tour".

**Causa raíz**: ese supuesto es falso. `tests/setup/account-activation-setup.ts` → `activateAccount()` hace, para TODA cuenta Fresh (línea 65, `loginPage.loginWithUserRequest(account)`), un login real que navega a Home **para poder cachear el `storageState`** (`LoginPage.loginWithUserRequest`, líneas 80-86) — esa es la primera vez que la cuenta ve Home, y aparentemente alcanza para que el backend/frontend marque el tour como visto (el comentario del código en `HomePage.ts` dice "es un flag de backend, no de browser", pero el mecanismo exacto — al renderizar vs. al hacer click — no está confirmado). Cuando el test real arranca, reutiliza ese `storageState` cacheado (sin loguearse de nuevo) y llega a Home con el tour ya "gastado". Es decir: **la activación genérica de cuentas Fresh usa, sin quererlo, el único login "virgen" que este test necesita, antes de que el test lo pueda usar** — un efecto secundario de una pieza compartida (`activateFreshAccounts()`) sobre un test que asume exclusividad de ese primer login.

**Solución**: NO aplicada todavía — requiere decidir con el equipo si el "visto" se dispara al renderizar el banner o al hacer click en "Comenzar" (para saber si hay margen de arreglo liviano) y luego elegir entre (a) un pool de cuentas Fresh activadas SIN el login de cacheo final (requiere tocar el pipeline compartido, riesgoso para el resto de los tests Fresh) o (b) volver este test puntual a `UserSource.Pooled` con una cuenta realmente virgen (reintroduce el riesgo de agotamiento de pool que motivó el cambio original). Documentado como hallazgo, no como fix.

**Aprendizaje/Regla**: cuando una migración de pool (`Pooled`→`Fresh` o viceversa) "resuelve" un problema de disponibilidad de cuentas, verificar en vivo el test que specíficamente depende de un estado "nunca antes visto/tocado" — la infraestructura compartida de activación/cacheo de sesión puede introducir ese mismo "toque" antes de que el test arranque, sin que sea evidente por el nombre (`activateFreshAccounts` sugiere solo "activar", no "loguear y cachear"). Un cambio que arregla el síntoma de un test (agotamiento de pool) puede romper la precondición exacta de OTRO test que comparte la misma cuenta/pipeline.

### [2026-09-07] "Usar cámara" en carga de credencial: la misma pantalla visual (Paso 5) se comporta distinto según CÓMO se llega a ella

**HU relacionada**: N/A (`tests/projects/vetify-webapp/credentials.spec.ts`, TS-02 vs TS-03)  ·  **Categoría**: Locators / arquitectura de navegación

**Problema**: al destrabar los 3 CPs comentados de cámara (TC-18/19/20), se escribieron primero dentro de `TS-02 Cargar credencial - Validación de Pasos - Paso 5`, cuyo `beforeEach` compartido navega a `/pets` (sin id de plan) y completa el asistente desde cero. El botón "Usar cámara" nunca apareció ahí (confirmado 2 veces, aislado y en paralelo — accessibility snapshot sin ese botón, solo "Cargá el archivo"). Después, usando exactamente la misma cuenta con `/pets/{slotId}` (un plan real puntual, como hace `TS-03 Crear Credencial` vía `myPetsPage.addPetToPlanBtn.click()`), el botón sí apareció y funcionó (subida real vía `input[id="pet-photo-camera-input"]`, mismo endpoint `POST /api/files/upload/pets` que la carga de archivo). Aun así, en un tercer intento con OTRA cuenta fresh distinta usando el mismo camino `/pets/{slotId}`, el botón volvió a estar ausente una vez — no se pudo aislar el 100% de la causa (¿producto/plan específico? ¿timing de carga del componente?).

**Solución**: se movieron los tests reales a `TS-03 Crear Credencial` (el flujo real de selección de plan). Para evitar depender de 2 corridas/cuentas distintas con el mismo resultado esperado (lo que generó el falso negativo del tercer intento), se consolidó "el botón está visible" + "tomar la foto sube bien" en un solo test, verificando ambas cosas en la MISMA sesión/cuenta en vez de en 2 tests separados que podían tocar 2 estados distintos.

**Aprendizaje/Regla**: no asumir que 2 rutas que muestran el mismo título de paso ("Por último, subí una foto de...") son la misma pantalla con el mismo comportamiento — verificar la URL/ruta real (`/pets` vs `/pets/{id}`) antes de escribir un CP sobre un elemento condicional. Si una aserción de "elemento visible" es inconsistente entre corridas con cuentas nominalmente equivalentes, preferir consolidarla junto con el uso real del elemento en un solo test (misma sesión) antes que dejar 2 tests separados que puedan capturar 2 estados distintos del mismo flujo.

### [2026-09-08] "El correo nunca llega" era en realidad "el correo tarda 10 minutos" — un timeout de 60s no es evidencia de ausencia

**HU relacionada**: IMAS-3218 (TS-05, OSDE Adquirente)  ·  **Categoría**: Datos/Ambiente (falso positivo por timeout)

**Problema**: 4 intentos automatizados seguidos de `TS-05 IMAS-3218 TC-01` fallaron con "EmailClient: no llegó ningún correo... dentro de 60000ms". Se verificó por IMAP directo (INBOX, Spam y Todos) que efectivamente no había nada — evidencia aparentemente sólida. Se documentó como bug (`BUG-037`, "el correo nunca llega") y se le pidió al usuario del proyecto que probara manualmente para una segunda confirmación independiente. El usuario probó y **sí le llegó** — lo cual, en un primer momento, pareció contradecir toda la evidencia reunida.

**Solución**: se volvió a revisar la MISMA casilla por IMAP inmediatamente después de que el usuario avisara — el correo real de `webapp@vetify.com.ar` estaba ahí, con un `internalDate` de recepción real. Comparando esa marca de tiempo contra el momento exacto en que se había hecho la última solicitud automatizada, la diferencia fue **10 minutos y 11 segundos** — muy por encima del timeout default de `EmailClient.waitForEmail` (60 segundos) que sí alcanza sin problema para los otros 3 productos (Vetify B2C, OSDE Capitado, Flux Capitado). El correo SIEMPRE llegó; el test simplemente dejaba de mirar demasiado pronto. Se corrigió agregando un parámetro `timeoutMs` configurable a `requestResetLink`/`restorePassword` (`passwordResetFlow.ts`) y usando ~13 minutos de margen específicamente para OSDE Adquirente, con los `test.setTimeout()` de cada CP ajustados en consecuencia (hasta ~30 min en el CP que hace 2 round-trips reales).

**Aprendizaje/Regla**: "no llegó dentro de Xs" NO es lo mismo que "nunca llega" — antes de documentar un bug de "ausencia" (un correo, un dato, un evento) basado en un timeout agotado, considerar explícitamente la hipótesis de "todavía no, pero va a llegar" y, si es barato hacerlo, volver a chequear más tarde (o pedirle a alguien que lo confirme en vivo) antes de escribir el reporte. Cuando un producto/sitio comparte el mismo mecanismo que otros 3 que sí andan bien con el timeout default, la explicación más simple suele ser "este es más lento", no "está roto" — medir el tiempo real antes de descartar esa posibilidad. Reporte de bug corregido/retitulado de "no llega" a "tarda ~10 minutos" tras la medición real.

**Segunda vuelta, mismo día — "medir una vez y asumir que es constante" también fue un error**: con el timeout ya subido a 13 minutos (generoso respecto a los 10m38s medidos), se corrió el mismo CP de nuevo y el correo **tampoco llegó esta vez**, ni en los 13 minutos de esa corrida ni en varios minutos más de margen chequeados después a mano. La diferencia entre este segundo pedido y el primero: se hizo solo ~17 minutos después del primero, para la misma cuenta. Hipótesis más probable en ese momento: algún cooldown/deduplicación del backend entre pedidos seguidos.

**Tercera vuelta, mismo día — el usuario del proyecto notó el patrón real ("qué raro, a mí manualmente sí me llega")**: esa observación fue la pista correcta. Se probó de nuevo en modo `--headed` (navegador visible) en vez de headless, por si algún sistema anti-bot distinguía por eso — tampoco llegó, ni a los 3 minutos ni a los ~13. Headed y headless comparten lo mismo que headless NO comparte con un navegador humano real: ambos son controlados por Playwright vía CDP, con `navigator.webdriver = true`. Conclusión final (documentada en `BUG-037`): el patrón real no es "lento" ni "cooldown entre pedidos" — es que NINGÚN pedido hecho por Playwright llegó nunca, en ningún modo, mientras que el único pedido manual (navegador real de una persona) sí funcionó. La atribución anterior del correo de las 06:14 al pedido automatizado de las 06:02 fue un error de coincidencia de horario — lo más probable es que ese correo respondiera al pedido manual del usuario, no al automatizado.

**Aprendizaje acumulado de las 3 vueltas**: (1) "no llegó en Xs" no es "nunca llega" — medir el tiempo real antes de concluir. (2) una sola medición de un tiempo variable no prueba que sea constante — si el mecanismo depende del contexto (cooldown, quién pide), subir el timeout no alcanza. (3) cuando algo funciona a mano pero nunca vía automatización de browser, ANTES de seguir ajustando timeouts a ciegas, sospechar de una diferencia estructural entre "browser controlado por Playwright" y "browser real" (ej. `navigator.webdriver`, fingerprinting, WAF/bot-detection) — especialmente si otros 3 productos con el mismo mecanismo de automatización SÍ funcionan bien, lo que descarta que sea un problema genérico de Playwright y apunta a algo específico de ESE endpoint/sitio. La señal más barata y valiosa de todo este ciclo fue la pregunta directa del usuario del proyecto ("¿por qué a mí sí me llega?") — vale la pena pedirle a alguien que reproduzca a mano ANTES de escribir un reporte de bug basado solo en evidencia automatizada.

**Cuarta vuelta, mismo día — la variable real no era Playwright vs. humano, era la CUENTA**: para descartar del todo la hipótesis de `navigator.webdriver`/bot-detection, se probó comprar un plan nuevo de OSDE Adquirente por front-end automatizado (mismo Playwright, mismo `navigator.webdriver=true`) y usar ESA cuenta nueva (`alandgg975@gmail.com`) para pedir el reset — **llegó en 28 segundos**, automatizado, sin ningún cambio de código. La hipótesis de bot-detection quedó completamente descartada: si el backend detectara y bloqueara tráfico de Playwright, tampoco habría dejado pasar la compra ni el reset de la cuenta nueva. La variable real, todo este tiempo, era la cuenta específica (`adquirenteosde@gmail.com`) — reusada en pruebas manuales y automatizadas durante varios días, probablemente con algún estado corrupto o flag en el proveedor de identidad (Auth0) que le impedía recibir el correo, sin relación con CÓMO se pedía el reset.

**Aprendizaje final de todo el ciclo (4 vueltas, ~2 horas de investigación real)**: cuando una cuenta de prueba reusada durante varios días empieza a fallar de una forma que ninguna otra cuenta reproduce, sospechar de la CUENTA antes que del MECANISMO — la forma más barata de probarlo es crear una cuenta nueva desde cero (acá, comprando un plan real) y repetir el mismo test exacto. Se llegó a esta prueba de último recurso recién en la cuarta vuelta; con los datos ya reunidos en la primera vuelta (una cuenta reusada muchos días, ningún otro producto con el problema), hubiera sido la hipótesis más barata de probar primero, antes que timeout, cooldown o bot-detection — las tres explicaban peor por qué SOLO esa cuenta fallaba. Regla para la próxima vez: si el fallo es 100% reproducible con una cuenta puntual y 0% reproducible con cualquier otra cuenta/producto equivalente, la cuenta es sospechosa #1, no el mecanismo compartido.

**Quinta vuelta, el cierre real — ni siquiera era la cuenta, era la elección de la cuenta**: después de resolver todo lo de arriba con la compra + reset exitoso en `alandgg975@gmail.com`, el usuario del proyecto aclaró algo que ninguna prueba técnica podía haber revelado: **esa siempre fue la única cuenta real destinada a estas pruebas** — `adquirenteosde@gmail.com` (la que se venía usando desde el `pooled-users.json`) nunca debió ser parte de este flujo en absoluto. No era una cuenta "rota" con una causa técnica por descubrir — era, lisa y llanamente, la cuenta que no correspondía, tageada así por error en algún momento anterior de la automatización. Con esto, `BUG-037` se cerró como "no es un bug" en vez de "resuelto".

**Meta-aprendizaje de las 5 vueltas juntas**: cuando algo que "debería funcionar" no funciona de forma consistente y las hipótesis técnicas (timeout, cooldown, bot-detection) se van descartando una por una sin converger, en algún punto vale la pena preguntarle directamente a quien conoce el contexto de negocio/datos ("¿esta cuenta es la que corresponde para esto?") — puede ahorrar horas que ninguna cantidad de experimentación técnica adicional iba a ahorrar, porque el problema no estaba en el sistema, estaba en un supuesto de partida (qué cuenta usar) que nunca se cuestionó hasta que alguien con el contexto completo lo señaló.

### [2026-09-13] Una llamada con un dev externo "contestó todo" pero no destrabó nada — confundir "contexto nuevo" con "impedimento resuelto"

**HU relacionada**: N/A (proceso de gestión de impedimentos, no de un caso de prueba puntual)  ·  **Categoría**: Comunicación / reporte de estado

**Problema**: se analizó la transcripción de una llamada de 46 minutos entre Alan y Oscar Tello donde se tocaron 6 de los 13 pedidos/preguntas pendientes armados en `docs/pedidos-para-enviar-2026-09-10.md`/`docs/preguntas-contextualizacion-2026-09-10.md`. El primer resumen que se le dio a Alan, aunque técnicamente honesto en cada punto individual, se sentía "más positivo" de lo real — mezclaba en una misma lista cosas genuinamente resueltas, cosas que solo ganaron contexto (quién es el dueño real, una teoría, una reunión agendada) y cosas que quedaron exactamente igual. Alan tuvo que preguntar explícitamente 3 veces seguidas ("¿qué se destrabó?", "¿se destrabó alguna automatización?", "espera, ¿solo se destrabó una?") para llegar a la cifra real: de 6 temas tocados, **solo 1** (IMP-026, Cambiar DNI) tuvo una respuesta definitiva — y esa respuesta fue "no existe, permanentemente imposible", no un desbloqueo de automatización nueva.

**Solución**: al responder, separar explícitamente 3 categorías en vez de una lista mezclada: (1) **resuelto de verdad** — hay una respuesta accionable, cierra el impedimento; (2) **más contexto, sigue abierto** — se sabe más (dueño real, teoría, próximo paso) pero nada cambió en la capacidad de automatizar hoy; (3) **sin cambios** — se mencionó pero no avanzó. Y aclarar explícitamente que "resuelto" no es sinónimo de "se puede automatizar algo nuevo" — a veces la respuesta definitiva es "nunca se va a poder", que es lo contrario de destrabar.

**Aprendizaje/Regla**: al reportar el resultado de una conversación con alguien externo a QA (llamada, reunión, hilo de mail) sobre una lista de impedimentos, nunca presentar "se habló de X" como si fuera "X avanzó". Antes de escribir el resumen, clasificar cada ítem tocado en una de las 3 categorías de arriba y llevar la cuenta real (ej. "de 6 tocados, 1 resuelto, 5 con más contexto pero abiertos") en vez de narrar la conversación en orden cronológico y dejar que el lector infiera el balance. Aplica también a esta misma sesión hacia adelante: la reunión agendada para el lunes 2026-09-14 con Andrés (Mobile) va a necesitar el mismo tipo de resumen categorizado al terminar, no una narración.

### [2026-09-14] La API "caída" (IMP-017) no estaba caída — le pegábamos al dominio/path viejo, y la respuesta ya estaba en un Postman existente en el propio repo

**HU relacionada**: IMP-017 (API institucional `/api/quantum/...` 404), IMAS-4490  ·  **Categoría**: Ambiente / código (falso "caído" — en realidad ruta desactualizada)

**Problema**: desde el 2026-09-01 se documentó `/api/quantum/jengage/...` como "toda la base caída, 404 puro" — un impedimento externo, pendiente de que backend/COP lo resolviera. Se armó un pedido formal para escalarlo. Al pedir ayuda para preparar ese pedido (variables de entorno para un Postman), se encontró que **ya existía una colección Postman real en la raíz del repo** (`Vetify.postman_collection.json`, 27KB, armada por un ingeniero real de Ike) que nadie había revisado a fondo — nunca se le había hecho `grep` buscando los endpoints específicos que fallaban.

**Solución**: leer esa colección reveló que catálogo y pago de Quantum viven en un **dominio completamente separado** (`https://qa-quantum.ike.ar/api/v1/jengage/...`), distinto del dominio/path que usa nuestro código (`qa.vetify.com.ar/api/quantum/jengage/...`). El login (`jauth/token`) y Salesforce (`/api/sf/...`) sí siguen en el dominio viejo — es una migración parcial, no una caída total. Se armó un script puntual que probó el flujo corregido de punta a punta (Salesforce para el lead + dominio nuevo para el pago) y **completó una compra real aprobada** antes de tocar el código de producción. Fix real aplicado: nueva variable `VETIFY_QUANTUM_BASE_URL`, y 2 métodos corregidos en `VetifyInstitutionalApiClient` (`getPlans()`, `createPurchase()`).

**Aprendizaje/Regla**: antes de documentar un endpoint como "caído"/"404 total" y escalarlo como un impedimento externo, buscar si ya existe documentación de API real en el repo (colecciones Postman, specs de OpenAPI/Swagger, `.http` files) que muestre la URL/path correctos vigentes — `grep -rn` por el nombre del endpoint sobre TODO el repo, no solo sobre el código propio. En este proyecto puntual: `Vetify.postman_collection.json` (raíz) y `documentation/documentacion/Apis/` tienen colecciones reales de otros sistemas también. Un 404 "total" en una sola ruta mientras el resto de la API funciona es más probable que sea "cambiamos el dominio/versión y nadie actualizó este cliente" que "el servicio está caído" — la migración parcial (algunos endpoints migraron, otros no) es un patrón más común que la caída completa.

### [2026-09-14] Reescribir un script JS "hermano" de un cliente TS que sí funciona — copiar el payload exacto, no reconstruirlo de memoria

**HU relacionada**: IMP-017 (segunda pasada, `scripts/qa/create-test-account.mjs`)  ·  **Categoría**: Código / API (payload mal armado)

**Problema**: al reescribir `create-test-account.mjs` (script JS plano, corre fuera de Playwright) para usar la misma arquitectura ya confirmada en `VetifyInstitutionalApiClient` (TS), la primera corrida falló igual — pero con errores NUEVOS y más específicos en cada intento: primero `400 Cannot deserialize value of type int from String` (el script mandaba `paymentTypeId: 'credit_card'`, un string, cuando el backend espera un entero), después un `NullPointerException` (`identification` iba como hermano de `cardholder` en vez de anidada adentro). Ninguno de los 2 bugs existía en el cliente TS — el script los tenía porque su objeto de tarjeta de prueba se había armado a mano en algún momento, a ojo, sin copiar la forma exacta del payload real.

**Solución**: en vez de seguir adivinando campo por campo a partir de los mensajes de error del backend (que sí ayudan, pero uno por uno), se comparó directamente contra el payload real ya confirmado funcionando (`MercadoPagoCardsHelper.buildCheckoutPaymentData()` + el armado de `tokenVentaMercadoPago` en `user-factory.ts`) y se copiaron los valores/estructura exactos: `brandCardId`/`paymentTypeId` numéricos reales (`1`/`1` para VISA crédito, de `mercadoPagoCardProviders.ts`), e `identification` anidada dentro de `cardholder`.

**Aprendizaje/Regla**: cuando dos partes del código (un cliente TS "de referencia" ya confirmado funcionando, y un script JS "hermano" que hace lo mismo por fuera de Playwright) tienen que armar el mismo payload de una API externa, no reconstruir el payload del script de memoria/a ojo — copiar la estructura exacta del lado que ya funciona (valores, anidación, tipos de dato) campo por campo. Un backend que devuelve 400/NPE da pistas reales pero de a una por vez — es más rápido diffear contra una fuente ya confirmada que ir resolviendo el payload a fuerza de reintentos.

### [2026-09-15] Un 500/intermitencia de infra ya documentado como impedimento no se convierte en Defect nuevo solo porque tiene mucha evidencia

**HU relacionada**: BUG-033 / IMP-017 bloqueo 1  ·  **Categoría**: Proceso de reporte (clasificación de bug)

**Problema**: `BUG-033` (síntoma de `category/overview`/`my-products` intermitente) llevaba 11 días sin subirse a Jira, esperando una decisión pendiente. Al juntar evidencia nueva (6 reconfirmaciones en 4 fechas distintas), se armó un preview completo de Defect nuevo para Jira, linkeado como "recurrencia" de `IMAS-4464` — sin aplicar primero el paso 1 de la propia skill `qa-bug-report` ("clasificar antes de escribir nada": ¿es `ENV_BLOCKED` o es un bug de producto real?). El usuario lo notó de inmediato: "ese es un bug de ambiente".

**Solución**: `IMAS-4464` ya había sido cancelado antes exactamente por este motivo ("problema de ambiente, no de producto", confirmado por el usuario en su momento) — crear un Defect nuevo hubiera repetido el mismo error de clasificación ya corregido una vez. El síntoma ya estaba, además, completamente trackeado como impedimento (`IMP-017` bloqueo 1, con toda la evidencia histórica). Se descartó el Defect y se consolidó toda la evidencia nueva directamente en `IMP-017`.

**Aprendizaje/Regla**: mucha evidencia acumulada y muchas reconfirmaciones NO cambian la clasificación de un hallazgo — un 500/timeout intermitente de infraestructura sigue siendo `ENV_BLOCKED` sin importar cuántas veces se lo reconfirme. Antes de armar un preview de Defect para algo que lleva tiempo "pendiente", volver a aplicar el paso 1 de `qa-bug-report` (clasificar) como si fuera la primera vez, no asumir que por tener mucho detalle documentado ya califica como bug de producto. Si el síntoma ya vive en `docs/impedimentos-bloqueos.md` como impedimento, sumar la evidencia ahí, no crear un registro paralelo en `docs/bugs/`.

### [2026-09-22] "Unknown step title" en `credentials.spec.ts` — un paso nuevo del wizard (no un impedimento de ambiente), causado por una cuenta pool degradada con 10 planes libres duplicados

**HU relacionada**: TS-02 `credentials.spec.ts` (sin HU/IMAS asociada — hallazgo nuevo, no reportado en Jira)  ·  **Categoría**: Código/POM desactualizado + salud de pool

**Problema**: corrida completa de la suite (2026-09-22, ambiente sano) mostró 72 fallos, ~74 ocurrencias del mismo error: `Error: Unknown step title: Asigná el plan de la credencial` en `AddPetFormPage.getStepNumber()`. Antes de asumir que era otro impedimento de ambiente (patrón dominante en sesiones anteriores), se verificó en vivo con Playwright MCP usando la cuenta real que usa el test (`user_1787086478298_7768b2cc@automation.com`).

**Hallazgo real**: `GET /api/services/pets/my-products` para esa cuenta devolvió **10 planes con `estado:"LIBRE"` duplicados** (PREMIUM×6, EMERGENCIAS×2, CLASSIC×1, CACHORRO×1) — de tanto reusarse esta cuenta en corridas automatizadas repetidas sin nunca completarlos. El wizard de carga de credencial, al detectar más de un plan libre ambiguo, ahora inserta un paso nuevo **"Asigná el plan de la credencial"** (combobox nativo) entre el paso 0 ("¡Vamos a empezar!") y el paso 1 ("¿Cómo se llama tu mascota?") — confirmado navegando el flujo real paso a paso. `getStepNumber()` no conocía este título y tiraba error en vez de manejarlo.

**Solución**: `getStepNumber()` ahora detecta ese título específico, selecciona cualquier plan disponible del combobox y hace click en "Continuar" antes de leer el paso real — resuelve el paso nuevo de forma transparente para los ~23 tests que ya llamaban a este método, sin tocarlos. Un solo caso (`TC-06`, verificación de navegación "atrás") necesitó su propio ajuste: al volver atrás desde el paso 1, la app aterriza en la pantalla de selección de plan (no en el paso 0 directo) — se cambió esa aserción puntual para aceptar cualquiera de las 2 pantallas válidas de "inicio sin datos cargados", en vez de forzar un único valor numérico.

**Aprendizaje/Regla**: no asumir que un error nuevo y masivo es automáticamente el mismo patrón de impedimento de ambiente que domina el historial reciente — verificar en vivo con la cuenta real del test antes de clasificar. Un `getStepNumber()`/mapeo de títulos que empieza a tirar "Unknown X" puede ser un paso nuevo agregado al producto, no un timeout de backend. Y al arreglar un método compartido por muchos tests (auto-healing en la capa del POM), volver a correr el archivo COMPLETO después del fix — no asumir que "los que fallaban ahora pasan" es suficiente; achicar el alcance de un fix a veces rompe un caso vecino que dependía del comportamiento anterior (acá, la navegación "atrás").

**Pendiente separado, encontrado en el mismo re-run**: `TS-01 TC-01 - Plan sin mascota asociada` (cuenta `UserSource.Fresh`, 0 mascotas reales) sigue fallando — la pantalla de Mascotas muestra el banner genérico "Necesitás completar la credencial para visualizar los datos" + botón "+ Suscribir mascota", NO el texto "Dejá su credencial lista" que el test espera. Ese texto sí aparece para cuentas con una mascota YA creada (con nombre) pero credencial incompleta — un estado distinto de "plan completamente vacío, sin mascota nunca creada". Sin investigar a fondo todavía si es el mismo texto mal targeteado o 2 estados de UI genuinamente distintos — próxima sesión.
