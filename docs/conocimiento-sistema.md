# Conocimiento del sistema

> Documentación funcional del sistema bajo prueba: qué hace cada módulo, reglas de negocio, estados, validaciones, mensajes exactos. Se llena tras explorar con MCP o automatizar HUs. La skill `qa-hu-intake` la consulta al analizar una HU nueva.

<!-- EJEMPLO de sección por módulo:
## Módulo: <nombre>
### Página: <pantalla>
**Reglas de negocio**: ...
**Validaciones UI (mensajes exactos)**: ...
**Estados y transiciones**: ...
**Última actualización**: <fecha> (<HU/spec que lo generó>)
-->

---

## Qué es el producto (visión general)

**Iké Asistencia** es una compañía de asistencia con 30+ años de trayectoria en Latinoamérica (misión: "hacer la vida más fácil brindando servicios de excelencia"). **Vetify** es su marca de Iké Asistencia Argentina orientada al cuidado integral de perros y gatos, con foco en medicina preventiva — combina atención veterinaria, urgencias 24h, videollamadas, red de prestadores y reintegros. Fuente: onboarding oficial del equipo (`Onboarding_Vetify_Puki_.docx.pdf`).

Plataforma de **venta y gestión de planes de mascotas/salud veterinaria**, distribuida bajo **múltiples marcas blancas** con dos modelos de adquisición distintos:

| Modelo de adquisición | Productos/sitios | Cómo se compra |
|---|---|---|
| **Compra directa con tarjeta** (checkout MercadoPago) | `vetify-b2c`, `osde-adquirente` | Landing institucional → checkout → pago con tarjeta crédito/débito vía MercadoPago |
| **Canje de cupón** (plan corporativo/capitado, prepago por un tercero) | `osde-capitado`, `flux-capitado` | Landing con formulario → ingresar cupón de un solo uso → alta del plan sin pago |

**Además existen 2 canales de alta que este repo NO automatiza todavía** (confirmado por el onboarding oficial, no eran conocidos antes en este control-plane):
- **Agente IA** — canal de contratación asistido por inteligencia artificial.
- **Call Center (CDS)** — alta gestionada directamente por el Centro de Servicios (mismo CDS que interviene en la atención presencial, ver más abajo).

Además existe **`vetify-webapp`**: el panel logueado donde el usuario YA con plan activo gestiona sus mascotas, ve su credencial y agenda videollamadas veterinarias.

## Módulo: Atención presencial (veterinaria física) — contexto de IMAS-3728

Flujo real (5 pasos, fuente: onboarding oficial): **Ana contacta CDS y agenda** → Puki asiste a la consulta → **se genera/valida un token** (esto es lo que probamos en `IMAS-3728`, `qa.prestadores.ike.ar`) → finaliza la consulta veterinaria → **el prestador sube su factura**.

- **El agendamiento presencial NO se autogestiona hoy desde la webapp del tutor** — CDS (Call Center) sigue siendo parte obligatoria del circuito para pedir el turno presencial. Está marcado como "próximamente esto se modificará" — si en el futuro aparece un flujo de auto-agendamiento presencial en la webapp del tutor, es este cambio.
- **Ojo con no confundir 2 apps distintas de "Prestadores"**:
  - **App Prestadores** (mobile nativa, Expo, APK "Vetify Prestadores" en Google Play, repo `webapp-mascotas/app-mobile`) — la que recibe la notificación cuando se agenda una **videollamada**.
  - **Webapp Prestadores** (`qa.prestadores.ike.ar` / prod, repo `webapp-mascotas/webapp-proveedores-mascotas` + `backend-prestadores`) — la que usamos para **validar el token de atención presencial** (`IMAS-3728`). Usuario QA: `acastellano@ikeasistencia.com.ar`.
- Tras la consulta, el prestador sube su factura directamente — esto es **distinto** del flujo de Reintegros (donde es el tutor quien carga la factura desde la webapp para pedir el reembolso). Son 2 vías separadas de ingreso de facturas al sistema, no confundir una con otra al diseñar casos.

## Usuarios de prueba compartidos por el equipo (onboarding oficial, no generados por este repo)

⚠️ Cuentas reales compartidas por el equipo — tratarlas como en el resto de este documento (no exponer/duplicar innecesariamente más allá de esta referencia). Las de PRODUCCIÓN úsense con la misma cautela que cualquier acción en Prod (`qa-workspace/qa-playbook.md`).

| Ambiente | Usuario | Notas |
|---|---|---|
| QA | `montefiori@mail.com` | Adquiriente \| Capitado |
| Producción | `pauscalzo@gmail.com` | Adquiriente \| Capitado — **esta es la misma cuenta "Paula Scalzo" que ya usamos en QA** (`vetify-qa.ikeapp.com`); el equipo la lista también como válida en Producción |
| Producción | `user_1783951005615@automation.com` | Adquiriente \| Capitado |
| Producción | `pruebasadquirentes@gmail.com` | Adquiriente \| Capitado |
| Producción | `mauroicardi@gmail.com` | Adquiriente \| Capitado |

**Contenido institucional/marketing de cada landing** (textos reales, planes, precios, FAQ, comparativa QA vs. PROD) — relevado completo en [`docs/contenido-institucional.md`](contenido-institucional.md), separado de este archivo para no mezclar comportamiento funcional con copy de marketing.

**Backend real de pagos/catálogo**: API "Quantum" (`api/v1/jengage/...`, `api/quantum/jengage/...`), autenticación separada "jauth" (`api/quantum/jauth/token`, Auth0 para usuarios de portal). El parámetro de query `cuenta` en Quantum identifica el producto/backoffice (`MA_VETIFY` = Vetify, `LN_MASC_CD` = otra línea mascotas, `LN_AAPAS` = asistencia vial `pagar-pas`) — confirmado con la colección Postman real del equipo (ver [Integración: backend Quantum](#integración-backend-quantum-pagos-y-catálogo) más abajo).

**Última actualización**: 2026-08-21 (detalle técnico de la migración Reintegros SISE→Nexus verificado contra el código real del repo `reintegros-backend` + capturas adjuntas en Jira, ver sección propia más abajo — fuente: épica Jira `IMAS-4101` completa con sus 6 tareas hijas + MR `!103` de GitLab). Actualización previa: 2026-08-21 (migración de Reintegros a Nexus + rediseño de videollamadas, ver review de sprint en `transcripciones/MASCOTAS - Review-20260821_100549-Grabación de la reunión.vtt`). Actualización anterior: 2026-08-08 (auditoría completa del Excel de casos de prueba vs `tests/projects/**` — ver `docs/lecciones-aprendidas.md` para el detalle de qué se corrigió).

---

## Estado oficial de automatización (reportado por el equipo)

> Tabla tal como la reportó el equipo (mensaje de status compartido). Sirve para saber qué asumir como "ya cubierto" antes de tocar una HU — **contrastar siempre con el spec real**, ver ⚠️ Hallazgos más abajo (hay specs que dicen cubrir esto pero prueban la página equivocada).

| Producto | Compra | Login | Crear Usuario y Contraseña |
|---|---|---|---|
| Flux Capitado | ✅ | ✅ | ✅ |
| OSDE Adquirente | ✅ | ✅ | ✅ |
| OSDE Capitado | ✅ | ✅ | ✅ |
| Vetify B2C | ✅ | ✅ | ✅ |

| WebApp | Estado |
|---|---|
| Credenciales (Carga y Visualización) | ✅ |
| Videollamadas → Solicitar | Automatizado / Esperando cambios |
| Videollamadas → Reprogramar | Automatizado / Esperando cambios |
| Videollamadas → Visualizar lista | Automatizado / Esperando cambios |

"Esperando cambios" en videollamadas = el spec existe (`src/pages/vetify/webapp/videocall/`) pero el feature en producto todavía está en ajuste — no tratar un fallo ahí como regresión automática, primero confirmar si el cambio de producto ya se desplegó.

---

## Módulo: Vetify WebApp (panel logueado)

Portal al que entra un usuario con plan **ACTIVO** (ver `UserTag` más abajo). Incluye:

- **Login / Registro / Validación de póliza**: `LoginPage`, `RegistrationPage`, `PolicyValidationPage` — el registro pide DNI y lo valida contra la póliza antes de dejar completar alta.
  - **Reseteo de contraseña (IMAS-3215, automatizado 2026-08-08 en `tests/projects/vetify-b2c/user-management.spec.ts` TS-04, POM `LoginPage` extendido)**:
    - El botón "¿Olvidaste tu contraseña?" en `/auth/login` **no navega a otra URL** — expande un sub-formulario inline en la misma pantalla, con input `#emailPassRecovery` y botón "Enviar". No asumir una pantalla/ruta separada tipo `/auth/forgot-password`.
    - `POST /api/passrecovery` (body `{"email": "..."}`) responde **200 siempre**, con el mismo mensaje `{"message":"Si el email está registrado, recibirás instrucciones para recuperar tu contraseña."}` tanto para email registrado como no registrado — **no revela existencia de cuenta** (patrón de seguridad correcto, confirmado, no es un bug). La UI muestra "Te hemos enviado un correo para que puedas resetear tu contraseña" (texto distinto al de la API).
    - **Bug conocido 1 — `IMAS-4198`** (reportado a Jira 2026-08-07, ver `jira/sync-log.ndjson`): campo vacío → backend responde bien (400, `"email es requerido"`), pero el frontend ignora ese mensaje y muestra el texto genérico de "problemas técnicos" ("En este momento estamos con problemas técnicos... 0800-122-6238") en vez de indicar que falta el campo.
    - **Bug conocido 2 — `IMAS-4199`** (reportado a Jira 2026-08-07): no hay validación de formato de email en este campo — `"noesunemail"` es aceptado (200 OK, mismo mensaje de éxito). Contrasta con `RegistrationPage`, que sí valida formato.
    - **OSDE Adquirente, OSDE Capitado y Flux Capitado comparten literalmente la misma pantalla** `/auth/login` y el mismo `VetifyWebappLoginPage` (confirmado por los 3 en `docs/user-stories/IMAS-3216-*.md`/`IMAS-3217-*.md` y por corrida real) — el mismo diseño de casos se replicó a los 3 solo cambiando `siteId` del pool (`tests/projects/{osde-adquirente,osde-capitado,flux-capitado}/user-management.spec.ts` TS-04). Para Flux Capitado, CP02 usa tag `ACTIVE` en vez de `REGISTERED` porque el pool de ese producto solo tiene 1 usuario disponible tageado así — un `ACTIVE` sigue siendo un email existente, que es lo único que ese caso necesita validar.
    - **Bloqueo de automatización end-to-end (sigue vigente para los 4 productos)**: no hay infraestructura de lectura de casilla de correo en el repo (confirma IMAS-3467, subtarea de IMAS-3215, sigue en Backlog) — no se pudo automatizar más allá del envío de la solicitud (recepción/contenido del email, link de reset, cambio de contraseña). Ver `docs/impedimentos-bloqueos.md` IMP-006 y diseño de casos completo en `docs/user-stories/IMAS-3215-reseteo-contrasena-b2c-vetify.tests.md`.
- **Home / Perfil / Servicios / Menú lateral**: `HomePage`, `MyProfilePage`, `ServicesPage`, `SideMenuSection`.
  - **Perfil (`/section/myprofile`, automatizado 2026-08-08 en `tests/projects/vetify-webapp/profile.spec.ts`)**: pantalla real es una sola tarjeta (avatar + nombre + DNI + email + teléfono + botón "Editar datos"), **sin las tabs "Mis Datos"/"Mis Planes"** que el POM original asumía (código de tabs se dejó sin uso, no se rompió nada porque nada lo llamaba).
    - En modo "Editar datos" hay un aviso fijo: *"Para corregir tu nombre, mail o DNI llamá al 0800 122 1183."* — **nombre, apellido y DNI NO son editables desde la UI en absoluto**, solo teléfono (y dirección, sin explorar). No existe ningún flujo de "cambiar DNI" — cualquier caso de prueba que lo asuma está desactualizado.
    - **Bug conocido** (documentado en `TC-03 [Bug conocido]`, no reportado a Jira): `POST /api/files/upload` (foto de avatar) responde **200 para cualquier archivo**, incluido un `.txt` — no valida formato en el backend. Lo que parece "rechazo" al subir un archivo inválido es solo que el `<img>` no puede renderizarlo, así que el Avatar de Chakra cae a mostrar las iniciales como fallback; si se presiona "Guardar" en ese estado, el archivo inválido queda persistido igual como `foto_url`.
    - Guardar cambios muestra un toast **"Perfil actualizado correctamente"** — hay que esperarlo antes de recargar/verificar persistencia (ver `docs/lecciones-aprendidas.md`, entrada 2026-08-08 sobre carreras en guardados async).
- **Mensajes por sistema caído** (`SystemUnavailableComponent`, `FeatureUnavailableModal`, IMAS-3860, automatizado 2026-08-07 en `tests/projects/vetify-webapp/system-availability.spec.ts`):
  - **La app usa un Service Worker (Workbox, estrategia `NetworkFirst` sobre `/api/*`)** — cualquier test que necesite simular una caída de backend **NO puede usar `page.route()`/`context.route()` de Playwright**: confirmado que esas llamadas quedan resueltas igual (200) porque pasan por el SW, que Playwright no intercepta de forma confiable en este sitio. Hay que bloquear a nivel CDP (`Network.setBlockedURLs`, igual que "Block request URL" de DevTools) — ver helper `NetworkOutageSimulator` en `src/helpers/simulateOutage.ts`. Importante: reusar la MISMA sesión CDP para bloquear y restablecer — una sesión nueva no levanta de forma confiable el bloqueo de otra.
  - **Heartbeat de disponibilidad**: sondea `/api/brand/<host>/bootstrap` de forma continua e independiente de la pantalla en la que esté el usuario. Necesita **2 fallos consecutivos (~16-17s)** para mostrar la pantalla de caída total, y **2 chequeos sanos + 15s sin fallas (~16-24s)** para ocultarla sola. Bloquear `/api/users/me` o `/api/users/me/tour` solos NO alcanza para sostener el estado caído — el SW cae a cache y el heartbeat lo ve como sano; hay que bloquear `bootstrap` específicamente.
  - **Caída total vs. caída de una funcionalidad puntual usan el mismo copy pero distinto contenedor**: la caída total (`bootstrap` caído) reemplaza TODA la pantalla, sin ningún botón. La caída puntual muestra el mismo texto pero dentro de un `role="alertdialog"` con el CTA "Ir al inicio", superpuesto a la pantalla actual (que sigue atrás, atenuada). Ninguno de los dos casos tiene atributos `data-cy` — solo locators por texto/rol.
  - **Ojo con dónde se dispara la caída puntual**: en el flujo de videollamada, el disparador NO son las llamadas GET que cargan el formulario (motivo/adjuntos/día-horario) — es específicamente el POST final de creación del turno (`/api/services/assistance/493/create`), que solo se ejecuta al presionar "Confirmar videollamada" en la revisión. Bloquear el endpoint antes de eso no dispara nada (el formulario sigue funcionando con normalidad).
- **Mascotas y credencial** (`MyPetsPage`, `credentials/AddPetFormPage.ts`, `credentials/ViewPetPage.ts`): cargar datos de la mascota en un slot del plan y visualizar la tarjeta/credencial resultante. Mensaje de negocio: *"Dejá su credencial lista"*.
  - **La foto es obligatoria por diseño** (confirmado con negocio 2026-08-08): en el paso 5 de carga de credencial, "Continuar" permanece deshabilitado hasta subir una imagen — **no existe** botón "Omitir" para saltear la foto (a diferencia del paso de adjuntos de videollamada, que sí lo tiene). Cualquier CP que asuma "cargar credencial sin foto" está desactualizado — ver `TC-02 - [Obsoleto]` en `credentials.spec.ts`.
- **Videollamadas** (`videocall/`): agendar (`VideocallFormPage` + `CalendarSchedulingComponent`), reprogramar (`RescheduleVideocallPage`), cancelar (`CancelVideocallModal`), visualizar (`VideocallViewPage`) — consulta veterinaria por videollamada.
  - **Estado real (actualizado 2026-08-05)**: las 5 HUs del epic `IMAS-2877` (`IMAS-3899` TS-01, `IMAS-3174` TS-02, `IMAS-3889` TS-03, `IMAS-3909` TS-04, `IMAS-3894` TS-05) están automatizadas en `tests/projects/vetify-webapp/videocall.spec.ts`. Suite corre **100% verde en Desktop y Android** (proyecto `Vetify WebApp Android` en `playwright.config.ts`, habilitado 2026-08-05). Detalle de DoD/bugs abiertos por HU: `docs/coverage-register.md`.
  - **Reglas de negocio confirmadas contra el ambiente real** (no solo diseño de Figma — verificadas con la app real, algunas via error explícito de la API):
    - Límite de **2 turnos activos por mascota** (`PROGRAMMED`) — confirmado con un 422 real del backend: `"Esta mascota ya tiene 2 cita(s) abierta(s). No se pueden agendar más de 2 turnos activos por mascota."` Al tocar "Agendar nueva videollamada" con el límite alcanzado (flujo 1 mascota) aparece un modal de bloqueo sobre la pantalla de entrada, no una pantalla aparte.
    - "Cancelar" en el detalle del turno requiere que falten **≥30 min** para el turno; "Ingresar" se habilita solo en los **5 min previos**.
    - Cancelación real (`CancelVideocallModal`, rediseño IMAS-3894) es un modal simple de doble-check **sin selector de motivo** — `PUT /api/services/pets/cancel/{id}` directo. El endpoint viejo `GET /pets/cancel_reasons` (de una pantalla que ya no existe) devuelve 500 siempre; no usarlo en ningún helper nuevo.
    - Con mascota única, el sistema auto-selecciona y no muestra selector — con 2+ mascotas sí, tipo dropdown, editable desde la revisión.
  - **Mobile (viewport Android/Pixel 5) — diferencias reales de UI confirmadas, mismo negocio**:
    - El selector de horario es un **Bottom Sheet** en mobile vs un **Drawer** en Desktop (mismo contenido/reglas, DOM distinto).
    - El botón final de la pantalla "Revisá los datos y confirmá tu turno" dice **"Confirmar videollamada"** en Desktop pero **"Continuar"** en mobile (mismo label genérico que el resto del wizard en esa plataforma) — al escribir/tocar POMs de este flujo, no asumir texto de botón único cross-plataforma en pasos finales.
    - Existe un botón "Usar cámara" distinto del upload genérico de archivo, confirmado en el flujo de adjuntos mobile.
  - **Mapeo funcional completo con todas las casuísticas + trazabilidad Jira**: [`documentation/Videollamada-Nuevo-Flujo-Figma-Mapeo.md`](../documentation/Videollamada-Nuevo-Flujo-Figma-Mapeo.md); versión de casos manuales: [`documentation/Videollamada-Casos-de-Prueba-Manual.md`](../documentation/Videollamada-Casos-de-Prueba-Manual.md).
  - **Rediseño visual ya productivo** (confirmado en review de sprint 2026-08-21): se actualizó la estética/look-and-feel de todo el flujo de videollamada al nuevo diseño de la Web App (después de Home y carga de credencial en reviews anteriores). **Sin cambio funcional ni para el prestador ni para el tutor** — equipo de Prestadores (Belu, Meli) confirmó que no hace falta comunicarlo externamente. Riesgo bajo para la automatización (solo estilos), pero si algún locator por texto/rol dejó de matchear tras esta fecha, empezar a investigar por acá.
  - ⚠️ **A revalidar**: en la demo, la ventana de fechas habilitadas para agendar se describió como "segmentada por meses" (ej. habilitado hasta el 20 de septiembre) en vez de la regla de "30 días de anticipación" ya automatizada (`TC-03`/`TC-04`, `TS-03 IMAS-3889`). Puede ser la misma regla explicada distinto, o un cambio real de comportamiento — no se confirmó cuál es en esta sesión, revisar contra el ambiente real antes de asumir que `TC-03`/`TC-04` siguen midiendo la regla correcta.
  - **Límite de videollamadas por plan capitado OSDE — todavía NO implementado** (confirmado en la misma review): hoy las videollamadas son **ilimitadas para todos los tutores**. Está planeado que el plan "Esencial" de OSDE pase a tener **límite de 2 videollamadas por año** — diseño visual y técnico recién a definir en el sprint siguiente al 2026-08-21. Coincide con `IMAS-4038` ("Restricción turnos Capitados OSDE"), ya identificado en sesiones previas como **Backlog, sin desplegar** — este comentario de la review lo reconfirma como todavía-no-construido, no asumir que ya está activo en ningún ambiente.
  - **Cancelación**: confirmado de nuevo (acordado con el equipo de Prestadores) que se puede cancelar el turno hasta **30 minutos antes** de la consulta — coincide con la regla ya documentada arriba.

## Módulo: Vetify B2C + OSDE Adquirente (compra con tarjeta)

Ambos siguen el mismo modelo: landing institucional (`container.b2c.landingPage` / `container.osdeAdquiriente.landingPage`) → checkout (`checkoutPage`) → pago con MercadoPago.

- Valida la respuesta de `POST **/api/quantum/jengage/payment/pagar-mp**`: `status`, `statusMP.status`, `statusMP.idUser`, `statusMP.idMercadoPago`, `statusMP.saleConfirmProducts[]` (con `producto`/`poliza`).
- Redirección final a `/checkout/success` (OSDE agrega `?from=osde...`).
- URL institucional OSDE Adquirente en QA: `https://qa.vetify.com.ar/mas-osde-beneficios` ("Planes con OSDE").
- Tarjetas de prueba usadas en pagos reales contra Quantum (ver colección Postman): Visa `4509953566233704`/`4002768694395619`, Mastercard `5031433215406351`/`5031755734530604` — nombre titular `APRO` para forzar aprobación en el sandbox de MercadoPago (`MERCADOPAGO_PAYMENT_STATUSES.APPROVED`), `securityCode: 123`.

## Módulo: OSDE Capitado + Flux Capitado (canje de cupón)

Landing con formulario (`container.osdeCapitado.landingPage.form` / `container.fluxCapitado.landingPage.form`) → `form.completeForm({firstName, lastName, email, codArea, phoneNumber, document})` → `form.cuponInput` → `form.submitForm()`.

- **201** (éxito, tiene `id`) → mensaje *"¡MUCHAS GRACIAS!"* + *"En breve vas a recibir un correo con los pasos para activar el plan"*.
- **422** (cupón inválido) → *"El token no existe"*.
- **409** (cupón ya usado) → *"El Token ya existe (registro duplicado)"*.
- URLs QA: `https://qa.vetify.com.ar/osde` (OSDE Capitado), `https://qa.vetify.com.ar/flux` (Flux Capitado).
- Flujo de negocio real (2 pasos): 1) el equipo/backoffice **genera el cupón**, 2) el usuario final lo **canjea en el form**. QA NO genera cupones — consume un pool pre-cargado de códigos reales (ver "Datos de prueba" abajo) porque `CuponFactory.generateRegistrationCupon()` todavía no está implementado (ver IMP-001 en `docs/impedimentos-bloqueos.md`).

## Módulo: Reintegros

Flujo: el tutor solicita el reintegro de un gasto veterinario (Vetify WebApp → menú "Reintegros" → "Nuevo reintegro", `/section/nuevo-reintegro`) → el equipo de **Calidad** revisa/distribuye/valida la factura (`reintegros-backoffice.ike.qa` / `.ike.ar` en Producción) → el equipo de **Finanzas** aprueba/rechaza el pago final → CBU del tutor.

**Backend en migración a Nexus (confirmado en review de sprint, 2026-08-21)**:
- Hasta hace 2 sprints, reintegros solo funcionaba para clientes **no capitados** (mundo "Engage"/CISE) — no estaba enganchado al mundo de capitados.
- Sprint anterior: se arregló para que funcionara también con CISE. Aprovechando ese análisis, se hizo el pasaje del módulo completo a **Nexus** (nueva plataforma interna), para Capitados y Adquirentes por igual.
- **Estado real a 2026-08-21**: en Producción, reintegros sigue andando vía CISE (el mundo viejo) — la versión sobre Nexus recién se demostró en QA ese día. Pasaje a Producción anunciado para "la semana siguiente", aunque en el mismo comentario de cierre de la reunión se lo relativizó a "los próximos sprints" — no asumir una fecha exacta sin confirmar en Jira/con el equipo antes de reportar algo como ya productivo.
- Cuenta de prueba usada en la demo con rol dual Calidad+Finanzas: **Alex** (`acastellano@ikeasistencia.com.ar`) — en producción real estos son roles/personas separadas (Calidad aprueba/rechaza primero con sus propios motivos, después Finanzas aprueba/rechaza lo que Calidad ya aprobó).

**Estados (3 sistemas de estados distintos, no confundir)**:
1. **Estados de Nexus** (la plataforma interna nueva): `Aceptado` (=recién creado, nombre confuso — no significa "aprobado"), `Rechazado`, `Aprobado`, `Finalizado`, `Anulado`. Estos NO llegan directo a la UI de Calidad/Finanzas.
2. **Estados de la UI de Calidad/Finanzas** (el backoffice de reintegros): `Pendiente`, `Rechazado`, `Finanzas` (derivado a finanzas tras aprobación de Calidad).
3. **Estados que ve el tutor** (solo 3 hoy, confirmado por Cyntia Ferrari): **`Pagado`**, **`Solicitado`**, **`Desaprobado`**. Si está desaprobado, el tutor puede hacer doble clic/expandir y ve **el texto exacto que escribió la persona de Calidad o Finanzas al rechazar** — se muestra verbatim, sin traducir ni filtrar. Por eso Calidad/Finanzas deben cuidar la redacción del motivo de rechazo, ya que el cliente lo lee tal cual.
   - **No existe todavía un estado intermedio tipo "en revisión"/"en trámite"** — ya identificado como mejora en el backlog (no priorizada, "no nos hizo ruido todavía" según Cyntia), no confundir con un bug.

**Motivos de rechazo — asimetría Calidad vs. Finanzas**:
- **Finanzas** hoy solo tiene **un único motivo de rechazo**: *"datos inconsistentes"* — señalado en la review como potencialmente confuso/poco empático para un producto de salud ("reintegros en salud es más sensible", Mariana Minutella). Ya hay una tarjeta de retrabajo planeada para agregar motivos más específicos.
- **Calidad** tiene muchos más motivos ya armados y categorizados (tipo de cobertura no incluida, sin eventos disponibles, plan no cubre el monto, etc.) — con posibilidad de "doble clic" sobre el rechazo específico de cobertura.

**Distribución de factura (Calidad) — mecánica confirmada** (coincide y amplía lo ya probado en `IMAS-3923`, ver `docs/bugs/BUG-007-reintegros-dni-formato-invalido.md` para el bug de DNI relacionado):
1. Antes de validar la factura manualmente, Calidad debe **distribuir** la factura: por cada línea, poner un monto y aceptarla o "Rechazar línea" con un motivo (ej. "el plan no cubre este monto").
2. Regla de cuadratura: la suma de los montos aceptados + rechazados de todas las líneas debe dar exactamente el total de la factura, o el sistema no deja confirmar la distribución.
3. Recién después de confirmar la distribución se puede validar manualmente la factura (paso separado).
4. Al validar, el sistema trae de SISE el **"tope por evento"** (ej. $28.000 para una vacuna) y ese es el monto sugerido a reintegrar — puede ser menor al monto de la línea aceptada.
5. La **validación de ARCA (automática) confirmada que NO funciona en ambientes bajos/QA** (siempre falla, 502 "no se le está pudiendo pegar bien al servicio de arca") — **pero sí funciona en Producción**, confirmado explícitamente en esta reunión ("hasta lo último que habíamos verificado está funcionando [en producción]"). En QA, Calidad usa el botón de validación manual como bypass — esto es intencional/esperado en QA, no reportar como bug salvo que se confirme la misma falla en Producción.
6. La validación de ARCA **solo chequea validez de la factura en sí** (que exista, CAE válido, etc.) — no lee ni entiende el concepto/línea incluido, eso es responsabilidad de la distribución manual de Calidad.

**Medio de pago del reintegro**: siempre se paga por **CBU** (corta o larga/CVU) — nunca a la tarjeta con la que el cliente paga su plan. Esto resuelve de raíz la duda sobre clientes con tarjeta prepaga (que no pueden recibir débitos automáticos): como el reintegro no usa la tarjeta del plan, no hay conflicto con ese universo de clientes.

**Métricas**: no hay KPI de reintegros todavía (módulo recién en implementación/migración, sin medición formal a la fecha de julio 2026).

**Pendiente de confirmar** (abierto en la review, sin respuesta): si el dashboard de "Guardia General"/siniestralidad que usa el equipo de negocio ya refleja los datos de Nexus, o solo sigue leyendo de CISE.

### Migración técnica SISE → Nexus — detalle real (fuente: épica Jira `IMAS-4101`, analizada 2026-08-21)

> La review de sprint (arriba) da la foto de negocio; esto es el detalle técnico que sale de leer la épica completa + sus 6 tareas hijas + 30 subtareas. Nota: el sistema legado aparece nombrado como **"SISE"** en la épica técnica y como **"CISE"** en la transcripción verbal de la review — mismo sistema, probablemente error de transcripción/oído en uno de los dos.

**Por qué migrar (causa raíz)**: un capitado no compra → no pasa por Engage → nunca tiene cliente/expediente en SISE → **no podía pedir reintegro por esa vía**. La migración a Nexus es lo que lo destraba.

**Alcance**: convivencia SISE + Nexus por un tiempo (no es corte total inmediato), controlada por un **feature flag** (`IMAS-4143`, variable de entorno que decide con qué sistema se genera/edita/finaliza el expediente) — ya en Hecho.

**Pipeline de tareas, con nombre de fase (A→E)**:
1. **A — Feature Flag** (`IMAS-4143`, Hecho).
2. **B — Obtener Historial de Servicios Auxiliares** (`IMAS-4092`, En Progreso): cobertura/límites vía `auxiliaryClaimsHistory` (Nexus Customers), que ya trae `capabilityList` — alcanza para el alta, no hace falta `getAuxiliaryTypes` (cancelado, absorbido acá).
3. **C — Alta Nexus** (`IMAS-4103`, In Validation): `createPetAuxiliary` (Nexus Assistance), crea el expediente (`filecase`) con `refund.idEstado=1`/`montoAReintegrar=0`.
4. **D — Cierre Nexus** (`IMAS-4104`, In Validation): `POST /api/assistance/v1/pets/refund` con estados `1`/`3`(pago)/`5`(rechazo) sobre el `filecase`. Bug real encontrado y resuelto durante el desarrollo: el rechazo (estado 5) no cerraba correctamente — Core lo arregló entre el 14/08 y el 19/08.
5. **E — Notas Nexus** (`IMAS-4124`, In Validation): `addAuxiliaryNote` (`POST /api/assistance/v1/auxiliaries/notes`, body `{filecase, noteType: "shared", text}`) reemplaza el registro best-effort de notas en SISE. **Comportamiento confirmado real** (no se llama a mano desde el backoffice — lo dispara el propio backend solo tras un cierre exitoso en Nexus, y solo si el proveedor configurado es NEXUS):
   - Calidad rechaza (`PENDIENTE`/`RECHAZADO_FINANZAS` + motivo) → dispara nota.
   - Finanzas paga (`VALIDADO` → `PAGO_REALIZADO`) → dispara nota.
   - Finanzas marca `INCONVENIENTE` → **no** dispara nota.
   - Si el refund falla, la nota no se envía; si falla solo la nota, el rechazo/pago igual queda grabado en reintegros (la nota es best-effort, no bloqueante).

**Limitante conocido, documentado por el propio equipo (no confirmado aún con Core)**: `policy.key` en Mascotas = `{clCuenta}-{clave}`, y `clave` suele ser el DNI del titular → identifica **titular + producto**, no la mascota puntual. Con **2+ mascotas** en la misma cuenta, el `policy.key` no las distingue entre sí (la mascota puntual se resuelve aparte, por `IKE Mascotas`/`insuredObject`). **Relevante para diseño de casos**: cualquier caso de reintegro multi-mascota necesita verificar contra qué mascota específica quedó imputado el expediente, no asumir que el sistema ya lo distingue de forma nativa.

**Bloqueo real vigente a 2026-08-21 (comentario del equipo en la épica)**: el pase a **Producción queda fuera de alcance** de estos 5 tickets — falta que el equipo Core migre datos de usuarios para poder probar primero en QA. Mientras tanto hay un **parche/interim** para que los usuarios tengan servicios auxiliares. El equipo va a abrir un ticket nuevo el sprint siguiente para dejar esto formalmente documentado. **No reportar ni asumir nada de esta migración como ya productivo** hasta confirmar ese ticket nuevo.

**Trabajo de QA real, en curso (actualizado 2026-08-22)**: la subtarea `IMAS-4152` ("Pruebas QA Manuales Nexus", bajo `IMAS-4124`) ya arrancó — **5 de 11 casos ejecutados en vivo contra QA real** (alta, cierre por pago, rechazo operativo de Finanzas + rechazo definitivo de Calidad, y el escenario de fallback de catálogo). Se encontró y documentó **`BUG-015`**: el camino de rechazo directo de Calidad desde `PENDIENTE` (sin pasar por Finanzas) está bloqueado — falla con `400 BUS-009` (monto no distribuido a la línea de cobertura) y luego, ya resuelto eso, con `404 BUS-005` ("Nexus pets/refund requires clCuenta"), sin salida conocida sin pasar por el mismo pipeline que aprueba el expediente. Confirmado 2 veces de forma independiente el mismo día. Ver detalle en `docs/bugs/BUG-015-rechazo-directo-calidad-pendiente-requiere-clcuenta.md` y `docs/user-stories/IMAS-4152-pruebas-qa-manuales-nexus.tests.md` — **confirmado 2026-08-24: ya trackeado en Jira como `IMAS-4354`** (dev, Mariana Navarro, "En Progreso", creado 2026-08-21, un día antes de que lo encontráramos nosotros).

### Verificado contra el código real (repo GitLab `grupo-ike-arg/webapp-mascotas/reintegros-backend`, MR !103 `feat/IMAS-4104-on-develop → develop`, mergeada)

> La épica y sus comentarios dan la intención; esto es lo que el código realmente hace — Java/Spring, arquitectura hexagonal (ports & adapters). Reemplaza cualquier suposición de la sección anterior donde haya diferencia.

**El switch SISE/Nexus es un Router, no un flag disperso**: `ReintegrosCoreProviderRouter` implementa los mismos 3 ports que antes solo implementaba `SISEHttpClient` (alta, cierre, nota) y delega a `SISEHttpClient` o `NexusHttpClient` según `reintegros.core-provider` (enum `CoreProvider.SISE`/`NEXUS`). Ojo: **la consulta de cobertura y el lookup de cliente NO pasan por este switch** — quedan 100% en SISE a propósito, porque los capitados sí existen ahí como cliente (solo sin `engageId`), así que no hacía falta migrar esas dos consultas.

**Endpoints Nexus reales, con su path exacto** (`NexusProperties`, prefijo `nexus.*`, mismo host `qa-quantum.ike.ar` bajo dos APIs distintas — `customers` y `assistance`):
| Operación | Método/path | Nota |
|---|---|---|
| Resolver `capabilityId` (interno, previo al alta) | `GET /api/customers/aux/claimsHistory/{policyKey}` | Busca en `capabilityList` el item cuyo `capabilityCode` (parseado a int) matchee el `clSubServicio` pedido — si no lo encuentra, tira excepción de negocio (`BUS_006`). |
| Alta | `POST /api/assistance/v1/pets/auxiliaries` | Body: `serviceType:"asap"`, `assisted{capability, contact DNI, insuredObject, policy}`, `provider.internalCode` (`2080`, hardcodeado en config), `refund{idEstado:"1", montoAReintegrar:0}`. Responde `filecase` (ej. `"3147-1"`, `"2820-1"`) — si viene vacío, excepción. |
| Cierre | `POST /api/assistance/v1/pets/refund` | Usa el `filecase` como `clExpediente`. `idEstado` real: `3`=pago, `5`=rechazo (los mismos vistos en los ejemplos de curl de los comentarios). |
| Nota | `POST /api/assistance/v1/auxiliaries/notes` | Body `{filecase, noteType:"shared", text}` — `noteType` es config (`nexus.note-type`, default `"shared"`), no hardcodeado en el DTO. |

Auth Nexus: **un único API-KEY fijo por header, igual en los 3 ambientes** (no hay intercambio de token como en SISE) — confirmado en el código, coincide con el API-KEY que Mariana pegó en los comentarios de varias tarjetas.

**Máquina de estados real del expediente (`ClaimDossierState`), verificada en `DecideClaimDossierQualityUseCaseImpl` / `RegisterFinancePaymentUseCaseImpl`** — más rica que los "3 estados que ve el tutor" documentados arriba (esos son solo la proyección UI):
- **Aprobar** (`APROBAR`, Calidad): solo válido desde `PENDIENTE`/`RECHAZADO_FINANZAS` → `VALIDADO`. Requiere que **ARCA esté en un resultado final** (si no, `BUS_012`/`BUS_013`; ver bypass manual en QA ya documentado arriba) y que **todos** los expedientes de la misma solicitud ya tengan monto de gasto cargado (si no, `BUS_015`). No admite `motivoCalidadId` (el rechazo si tiene motivo libre, la aprobación no).
- **Rechazar en Calidad** (`RECHAZAR`, dos variantes):
  - Rechazo directo (primera vez): requiere `motivoCalidadId` válido del catálogo `CALIDAD` → `RECHAZADO`, dispara nota de bitácora (`SISE_ESTADO_RECHAZO_DEFINITIVO`) **y un evento que manda mail al titular** con el mensaje de cara al cliente del catálogo (`findHolderFacingMessageByActiveCalidadMotifId`) — coincide con lo documentado arriba sobre "el tutor ve el texto exacto que escribió Calidad".
  - Rechazo post-Finanzas (`postFinanceReturn`, cuando el expediente ya viene de `RECHAZADO_FINANZAS` con un `motivoOperativoFinanzasId` linkeado): **NO** debe llevar `motivoCalidadId` (viene ya resuelto de Finanzas) → también a `RECHAZADO`, mismo mecanismo de nota + evento.
- **Pagar en Finanzas** (`PAGO_REALIZADO`): solo válido desde `VALIDADO`. Cierra con `idEstado` de pago, nota `"Aviso de Pago"`, pasa a `PAGADO`, dispara evento de notificación al titular.
- **Rechazo operativo de Finanzas** (`INCONVENIENTE`): solo válido desde `VALIDADO`. Requiere `motivoOperativoFinanzasId` del catálogo `FINANZAS_OPERATIVO` → pasa a **`RECHAZADO_FINANZAS`** (un estado real e intermedio, no solo un rechazo final) — **este camino NO llama a `registrarNota` en absoluto** (confirmado en el código: la rama `INCONVENIENTE` de `RegisterFinancePaymentUseCaseImpl` no invoca el port de notas). Coincide exactamente con lo que reportó Mariana en el comentario de `IMAS-4124`: *"cuando... rechaza en finanzas (INCONVENIENTE) no mandan esta nota"*.
- **Todas las notas son best-effort real, no solo "en teoría"**: `registrarNotaBitacoraBestEffort` envuelve la llamada en un `try/catch RuntimeException` que solo loguea (`log.warn`) — un fallo de Nexus/SISE al escribir la nota **nunca revierte** el rechazo o el pago, que ya quedó confirmado en la base local antes de intentar la nota.

**Evidencia visual real** (screenshots adjuntos en Jira, `IMAS-4103`, cuenta OSDE Capitado ya documentada arriba — DNI `12540524`):
- **Backoffice Calidad/Finanzas** (pantalla real): header con Titular/Mascota/Plan/estado ("Al día"), sección "Documentación adjunta" (factura con botón "Mostrar factura"), panel derecho con Nº de expediente, badge "Validación manual" (confirma el bypass de ARCA en QA ya documentado), tipo de gasto, monto, CUIT, prestador, y "Resumen de cobertura" con tope por evento + reintegro sugerido calculado — y ahí mismo los botones **Rechazar**/**Pagar**.
- **Panel interno de Nexus** ("Iké Argentina (dev)" → módulo "Servicios auxiliares"): expediente `3147-1` con línea de tiempo real `Aceptado → Finalizado`, tarjeta "Cliente" mostrando literalmente `Osde/capitado (H)` y `Coordinador: Nexus-api`, tarjeta "Asistido" con DNI y tag `WEBAPP-REINTEGROS`. Confirma que el mismo caso queda trazable tanto del lado tutor/backoffice como del lado interno Nexus.

**Evidencia pendiente de revisar (no visualizable con las herramientas actuales)**: `IMAS-4052` tiene 7 videos adjuntos (`.mp4`/`.mov`, validación manual QA del workaround de capitados + un bug de iOS) — quedan como referencia para quien tenga que auditar ese caso puntual, no se transcribieron acá.

### ⚠️ Divergencia real entre ramas `qa` y `develop` (confirmado 2026-08-22, vía GitLab)

**Nexus SÍ está operativo en el ambiente QA real** (`REINTEGROS_CORE_PROVIDER=NEXUS` activo en `.pipeline/qa.env.yml` de la rama `qa`) — pero la rama `qa` recibió su **propio track de fixes**, aplicados directo ahí (MRs `#100`-`#115`, 18-20/08), **independiente** de `develop`:
- `#109` — agregó `contact.name` (requerido) al alta en Nexus, ausente en la versión que yo había leído de `develop`.
- `#110` — hack temporal (`TEMP_CAPABILITY_CATALOG_POLICY_KEY`, IMAS-4143): `resolveCapabilityId` prueba primero la póliza real del cliente y si `claimsHistory` no la tiene cargada en el datalake de Nexus QA (confirmado con Core que no toda póliza real está ahí), cae a una póliza catálogo fija — el `id` de capability es dato de catálogo estable por `capabilityCode`, verificado igual en cuentas distintas. Sacar este fallback en cuanto Core confirme un endpoint de catálogo real o garantice la sincronización SISE→Nexus.
- `#113`/`#115` — Nexus rechazaba `urlRefund`/`observaciones` vacíos en el cierre ("is not allowed to be empty", a diferencia de SISE) — confirmado con curl directo contra QA, fix probado end-to-end (200 OK).

**Implicancia para QA**: `qa` y `develop` no son el mismo código hoy — cada rama tiene fixes que la otra no tiene. Si se reporta un bug, aclarar contra qué rama/ambiente se vio, no asumir que el comportamiento de `develop` (lo documentado en la sección de arriba, leído de esa rama) es idéntico al de QA real. Reconciliar ambas ramas es tarea pendiente del equipo, no bloqueante para probar hoy.

Hay además una MR abierta (`#111`) con el mismo objetivo que `#113`/`#115` (ya mergeadas) — parece simplemente no cerrada, no bloquea nada.

### El servicio completo, de su propio README (`reintegros-backend`, rama `develop`)

> Solo leí 6 clases de las 549 `.java` del repo — dirigidas a la migración Nexus. Esto es distinto: es el **README real del servicio**, que sí da el mapa completo de qué hace, aunque el detalle de implementación de cada endpoint siga sin explorarse.

**Qué es el servicio (más allá de reintegros→Nexus)**: microservicio Spring Boot 4 / Java 21 que además de reintegros maneja: **cuentas de acreditación** del titular (CBU/CVU), **validación automática de comprobantes vía ARCA** (async, por **SQS** + cliente HTTP externo, no solo el bypass manual que ya sabíamos), **OCR de facturas con AWS Textract**, e integraciones con **SISE, IKE Mascotas, IKE Users y Prestadores**.

**Contrato HTTP real** (`/api/reintegros/v1/...`), con el rol JWT que exige cada área:
| Área | Rol requerido |
|---|---|
| Cuentas de acreditación, tipos de gasto, mascotas del titular, expedientes/solicitudes/documentos del titular | `cliente` |
| Catálogo de motivos de rechazo | `quality` o `finance` según ámbito |
| Backoffice de expedientes (`decision-calidad`, `comprobante-arca`, `aprobacion-manual-arca`, `registro-pago`) | `quality` / `finance` según la operación puntual |
| OCR (`/api/ocr/v1/text-recognition`) | sin rol, multipart `file` |

Auth: JWT Bearer validado contra JWKS de **Auth0** (mismo proveedor que ya conocíamos de otras apps del ecosistema, pero acá con su propio issuer/audience de reintegros) — rol insuficiente da `403 AUTH-004`, token inválido/vencido da `401 AUTH-005`.

**El feature flag de la migración tiene nombre real**: `REINTEGROS_CORE_PROVIDER` (env var que setea el enum `CoreProvider.SISE`/`NEXUS` que vimos en el código). Con `NEXUS` activo, los errores de alta/cierre contra Nexus (`pets/auxiliaries`, `pets/refund`) se reportan igual bajo los códigos `BUS-006`/`INT-004` que ya usaba SISE — no hay un código de error separado por proveedor.

**ARCA es asíncrono de verdad, no solo "falla en QA"**: hay una cola SQS (`reintegros-arca-validation`), un mecanismo de "lease" de procesamiento (`IKE_ARCA_PIPELINE_PROCESSING_LEASE_SECONDS`) y un fallback de procesamiento síncrono en la misma JVM tras el `sendMessage` (activado por default en `local-aws`, apagado en producción). Esto explica mejor **por qué** la validación automática de ARCA es poco confiable en ambientes bajos (dependencia de infraestructura async completa, no un simple call sync) — coincide con, y profundiza, lo ya documentado sobre el bypass manual en QA.

**Códigos de error más relevantes para diseño de casos de Backoffice** (catálogo completo con ~50 códigos en el README; estos son los que tocan directo el flujo Calidad/Finanzas que vamos a probar):
| Código | HTTP | Cuándo |
|---|---|---|
| `BUS-008` | 400 | Decisión de Calidad sin fila ARCA (`expediente_verificacion`) o resultado ARCA no definitivo. |
| `BUS-012` | 400 | ARCA `PENDIENTE` (validación automática todavía en curso). |
| `BUS-013` | 400 | ARCA `PENDIENTE_VERIFICACION_DATOS` (faltan datos obligatorios del comprobante). |
| `BUS-009` | 400 | Estado de expediente incorrecto para la operación (Calidad requiere `PENDIENTE`, Finanzas requiere `VALIDADO`) — coincide 1:1 con las precondiciones que vimos en el código. |
| `BUS-014` | 400 | Aprobación manual de ARCA con menos de 2 intentos fallidos previos. |
| `BUS-015` | 400 | Aprobar en Calidad sin monto cargado en algún expediente de la solicitud. |
| `BUS-006` | 502 | Alta/cierre SISE **o Nexus** con cuerpo vacío/sin `filecase`/`clExpediente`. |
| `VAL-026` | 400 | `motivoCalidadId`/`motivoOperativoFinanzasId` mal enviados según el catálogo (VET-033) o el resultado de la decisión. |

**Cómo correrlo localmente (por si algún día hace falta contra un backend real en vez de QA desplegado)**: `./mvnw spring-boot:run -Dspring-boot.run.profiles=local`, requiere JDK 21 + PostgreSQL; `docker-compose.yml` del propio módulo levanta Postgres+Redis+el servicio. Perfil `local-aws` agrega LocalStack para S3/SQS. Deploy real es **exclusivamente** GitLab CI → ECS (`develop`→dev, `qa`→qa, `main`→prod) — no hay Portainer ni deploy alternativo (fue retirado explícitamente del repo y su historial).

## Módulo: WebApp Iké (legacy) — infraestructura básica automatizada, casos reales bloqueados

**"Iké Mascotas"** es un sistema legacy de gestión de planes de mascotas, **separado de `vetify-webapp`** (no es el mismo panel con otra marca — es otra aplicación, con su propio sistema de identidad). Un usuario puede tener planes de Vetify, planes de Iké, ambos, o ninguno, y el acceso a cada WebApp debería depender exclusivamente de qué productos tiene habilitados (`IMAS-3742`: bug donde usuarios Vetify-only podían entrar indebidamente a la WebApp de Iké).

- **Infraestructura mínima ya existe** (2026-08-06): `SiteId.IKE_WEBAPP`, URL de QA `https://ikeargentina-qa.ikeapp.com` (`sites.ts`/`environment.ts`/`.env`), POM `IkeWebappLoginPage` (mismo diseño visual que el login de Vetify, sin `data-cy`, locators por rol), spec `tests/projects/ike-webapp/access-control.spec.ts`. Sin proyecto mobile habilitado todavía para este sitio.
- **Iké usa un tenant de Auth0 propio y separado del de Vetify**: `ike-webapp-staging.us.auth0.com` (confirmado vía Network tab, `POST .../oauth/token`). Una cuenta de Vetify (aunque sea real, con plan activo) **no tiene ningún registro en ese tenant** — el login falla con `403 {"error":"invalid_grant","error_description":"Wrong email or password."}`, **el mismo error exacto que da un email inventado que no existe en ningún lado**. Consecuencia importante para diseño de casos: "rechazado en el login de Iké" NO es evidencia de que el control de acceso por plan (`IMAS-3744`) esté funcionando — puede ser simplemente que la cuenta nunca tuvo alta en el sistema de identidad de Iké. Para validar de verdad los CAs de `IMAS-3742` hace falta un usuario que SÍ exista en ese tenant, con la combinación de plan que se quiera probar (solo Vetify / solo Iké / ambos / ninguno) — no alcanza con "cualquier cuenta que funcione en Vetify".
- **Provisionar un usuario de prueba de Iké en QA no es autoservicio** (a diferencia de Vetify, donde el equipo genera un usuario+plan al toque desde el backoffice de Vetify) — confirmado por el equipo en `transcripciones/Process Training - Mascotas-*.vtt`. El backoffice `reintegros-backoffice.ike.qa` (accesible con `--ignore-https-errors` por certificado propio, ver `.mcp.json`) **no sirve para esto** — es un panel de gestión de reintegros/reembolsos veterinarios (solicitudes "VETI-...", expedientes SISE), no de altas de usuario/plan.
- **Bloqueo documentado**: `docs/impedimentos-bloqueos.md` → `IMP-005`. Los 6 casos de prueba manuales de login combinatorio Vetify/Iké (`CP-04.01`-`CP-04.06`) están redactados en `documentation/Casos de Prueba.xlsx` (hoja "Registración y Adquisición") pero ninguno puede confirmarse de verdad todavía — falta un usuario con cuenta real en el tenant de Auth0 de Iké.

**Última actualización**: 2026-08-07 (IMAS-3742 — corrección de la ambigüedad de TC-01).

---

## Conceptos transversales

### `UserTag` (estado de negocio de un usuario/plan/mascota)

`ERROR`, `VERIFIED`, `REGISTERED`, `UNREGISTERED`, `PENDING_ACTIVATION`, `ACTIVE`, `NO_PLAN`, `INACTIVE_PLAN`, `PLAN_WITHOUT_PET`, `NO_EMPTY_PLAN`, `NO_PET`, `WITH_PET`. Define qué puede hacer un test con ese usuario (ej. solo un `ACTIVE` + `WITH_PET` puede probar credenciales).

### Cupones (`CuponType`: `Reusable` vs `OneTime`)

- **`OneTime`**: se consume del pool y se borra del archivo de estado al usarse (`CuponPool.consumeOneTimeCupon` hace `splice` + rescribe `src/fixtures/cupons/one-time-cupons.json`). Con lock file (`one-time-cupons.lock`) para runs concurrentes.
- **`Reusable`**: se lee de `src/fixtures/cupons/reusable-cupons.json`, no se consume (queda disponible para más tests). **Hoy está vacío** — no hay cupones reusables cargados.
- Estructura real (confirmada con mensaje del equipo): `{ "code": "TESTOSDE528865", "type": "one-time", "projects": ["OSDE_CAPITADO"] }`.

### Pooled vs Fresh users (`UserProvider`)

Pooled = usuario reutilizable filtrado por `siteId` + `tags`, con `storageState` cacheado. Fresh = usuario aislado por test. `tests/setup/account-activation-setup.ts` activa usuarios pooled `UNREGISTERED` (los registra, valida póliza/DNI, hace login, los re-tagea `ACTIVE`) para alimentar el pool con usuarios usables. `tests/setup/cookies-setup.ts` precarga cookies de consentimiento + tour de onboarding para saltar banners en los tests.

---

## Ciclo de sprint y ambientes (proceso del equipo — no es del producto, es de cómo trabaja el equipo)

| Ambiente | Uso |
|---|---|
| **Dev** | Solo desarrolladores |
| **QA** | Ambiente para probar / **no es estable** (fallos pueden ser del ambiente, no del producto — confirmar antes de reportar bug) |
| **Prod** | Producción / no se puede testear (salvo excepciones puntuales) |

Cadencia por sprint (2 semanas), por feature:
1. **Planning**: se estima complejidad como `AVG(Dev + QA)` (a veces `MAX`). Se agregan subtareas: crear/actualizar casos de prueba (a veces ticket aparte), validar en QA (solo la feature), y definir qué se va a regresionar — se dice explícito en la planning.
2. **Sprint, semana 1**: Dev construye la feature → se crean los casos de prueba → se prueba en QA → se corre la regresión definida.
3. **Sprint, semana 2**: pruebas manuales (deadline históricamente jueves 16hs ARG) → viernes Review, mostrando la feature lista para Prod.
4. **Sprint siguiente**: la feature recién entonces se automatiza (y en paralelo se preparan casos de prueba de la próxima feature) — es decir, **la automatización va un sprint detrás del desarrollo manual**, no en paralelo al mismo sprint de la feature.

---

## Datos de prueba conocidos (ambiente QA)

> Códigos/credenciales reales de QA compartidos por el equipo. Trátalos como las cuentas de `TestDataHelper` de otros proyectos hermanos: cuentas QA no-secretas pero no duplicar/exponer innecesariamente. Los cupones `OneTime` se agotan al usarse — si un test falla por "no hay cupón disponible", puede ser simplemente que el pool quedó vacío, no un bug.

**Cupones OSDE_CAPITADO** (one-time): `TESTOSDE727843`, `TESTOSDE284307`, `TESTOSDE619360` sin usar al 2026-08-03 (ya usados y por ende inválidos para un canje nuevo: `TESTOSDE734292`, `TESTOSDE528865`, `TESTOSDE686450`, `TESTOSDE168730`, `TESTOSDE376734`, `TESTOSDE672947`, `TESTOSDE426142`).

**Cupones FLUX_CAPITADO** (one-time): `TESTFLUX097535`, `TESTFLUX555847`, `TESTFLUX481610`, `TESTFLUX204611` sin usar al 2026-08-03 (ya usados: `TESTFLUX042310`, `TESTFLUX108634`, `TESTFLUX589059`, `TESTFLUX415722`, `TESTFLUX689424`, `TESTFLUX395283` — `TESTFLUX415722` es justamente el código hardcodeado en el spec de "cupón ya usado" de `flux-capitado/purchase-flow.spec.ts`, confirma que la lista es real).

> ✅ Acción tomada: los 3 códigos OSDE_CAPITADO y 4 códigos FLUX_CAPITADO sin usar se cargaron en `src/fixtures/cupons/one-time-cupons.json` (estaba vacío — por eso los tests de "canje exitoso" venían siendo skippeados por falta de cupón disponible en el pool).

**Usuario OSDE Capitado** (webapp): email `user_1783951005615@automation.com`, DNI `12540524`, password `Te1!0685f68b`.
**Usuario FLUX Capitado**: no compartido (campos vacíos en el mensaje del equipo).

---

## Integración: backend Quantum (pagos y catálogo)

Colección Postman real del equipo (`Vetify`, IKE Asistencia) — endpoints confirmados:

| Endpoint | Método | Uso |
|---|---|---|
| `{{BASE_URL}}/api/quantum/jauth/token` | GET (Basic Auth) | Obtiene `QUANTUM_AUTH_TOKEN` (token interno del portal, no confundir con Auth0 de usuarios finales) |
| `{{QUANTUM_BASE_URL}}/api/v1/jengage/payment/calculate?cuenta=<cuenta>` | POST | Calcula precio/descuento antes de pagar (`idTarjeta`, `esCredito`/`esDebito`, `cupon`, `listInvoicedProducts`) |
| `{{QUANTUM_BASE_URL}}/api/v1/jengage/payment/pagar-mp?cuenta=<cuenta>` | POST | Paga con MercadoPago (tarjeta) — usado por Vetify B2C / OSDE Adquirente vía UI, acá probado directo por API |
| `.../payment/pagar-pas?cuenta=LN_AAPAS` | POST | Pago de asistencia vial (línea de negocio distinta, no es mascotas — aparece en la misma cuenta Quantum) |
| `.../payment/crear-token-tarjeta/` | GET/POST | Tokeniza datos de tarjeta antes de pagar |
| `{{BASE_URL}}/api/v1/jauth/portal-ventas/user` | POST | Crea usuario del portal de ventas (`roles: ["VETIFY"]`) |
| `.../catalog/products?cuenta=<cuenta>` | GET | Catálogo de productos/planes |
| `.../catalog/payment-types?cuenta=<cuenta>` | GET | Tipos de pago disponibles |
| `.../catalog/brand-cards?cuenta=<cuenta>` | GET | Marcas de tarjeta soportadas |
| `.../catalog/cities` | GET | Catálogo de ciudades (usado en el form de pago, `payer.city`/`payer.province`) |
| `.../catalog/discounts?cuenta=<cuenta>` | GET | Descuentos vigentes |
| `{{IKE_API_BASE_URL}}/cliente` | POST (Api-Key) | Busca cliente por `clGrupoCuenta`/`clCuenta`/DNI — backend distinto (IKE core), no Quantum |

**`cuenta` conocidas**: `MA_VETIFY` (Vetify), `LN_MASC_CD` (otra línea de mascotas), `LN_AAPAS` (asistencia vial, no relacionado a mascotas).

**⚠️ Nota de seguridad**: la colección Postman compartida traía un **Bearer token JWT real (Auth0 client-credentials)** hardcodeado en el request `pagar-pas` y un **Api-Key real** en el request `Get Client`. **No se persistieron en este repo** — si ese token/API-Key siguen vigentes, rotarlos; usar siempre variables de entorno (`{{TOKEN}}`, `{{QUANTUM_AUTH_TOKEN}}`) nunca valores pegados directo en un request guardado en un repo compartido.

---

## ⚠️ Hallazgos / gaps detectados durante el estudio de tests

1. **Bug de copy-paste en `user-management.spec.ts`** (`tests/projects/{osde-adquirente,osde-capitado,flux-capitado}/user-management.spec.ts`): los 3 archivos son idénticos en estructura al de Vetify y **los 3 ejercitan `container.vetify.webapp.registrationPage`** (confirmado por grep en `tests/framework/*.ts` — es el ÚNICO fixture de registro que existe en todo el framework). Es decir, "Crear Usuario y Contraseña ✅" de OSDE/Flux en la tabla de estado oficial en realidad **prueba el registro de Vetify webapp, no el de OSDE/Flux**. No hay página de registro propia implementada para OSDE/Flux. Ver `docs/impedimentos-bloqueos.md` IMP-002.
2. **`siteWebappBaseUrls` (`src/config/environment.ts`) y `sites.ts`** mapean los 4 `SiteId` a la MISMA env var `VETIFY_WEBAPP_BASE_URL` — coherente con el hallazgo 1 (parece que OSDE/Flux nunca tuvieron un webapp logueado propio, solo landing+checkout/cupón). Confirmar con el equipo si es intencional antes de "corregir" cualquiera de los dos hallazgos.
3. **`CuponFactory.generateRegistrationCupon()` no está implementado** (`throw new Error(...)`, ticket `IMAS-3970` referenciado en el código) — por eso QA depende de un pool de cupones pre-cargados manualmente en vez de generarlos on-demand. Ver `docs/impedimentos-bloqueos.md` IMP-001.
