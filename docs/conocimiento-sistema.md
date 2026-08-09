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

Plataforma de **venta y gestión de planes de mascotas/salud veterinaria** (marca base **Vetify**, del grupo IKE Asistencia), distribuida bajo **múltiples marcas blancas** con dos modelos de adquisición distintos:

| Modelo de adquisición | Productos/sitios | Cómo se compra |
|---|---|---|
| **Compra directa con tarjeta** (checkout MercadoPago) | `vetify-b2c`, `osde-adquirente` | Landing institucional → checkout → pago con tarjeta crédito/débito vía MercadoPago |
| **Canje de cupón** (plan corporativo/capitado, prepago por un tercero) | `osde-capitado`, `flux-capitado` | Landing con formulario → ingresar cupón de un solo uso → alta del plan sin pago |

Además existe **`vetify-webapp`**: el panel logueado donde el usuario YA con plan activo gestiona sus mascotas, ve su credencial y agenda videollamadas veterinarias.

**Backend real de pagos/catálogo**: API "Quantum" (`api/v1/jengage/...`, `api/quantum/jengage/...`), autenticación separada "jauth" (`api/quantum/jauth/token`, Auth0 para usuarios de portal). El parámetro de query `cuenta` en Quantum identifica el producto/backoffice (`MA_VETIFY` = Vetify, `LN_MASC_CD` = otra línea mascotas, `LN_AAPAS` = asistencia vial `pagar-pas`) — confirmado con la colección Postman real del equipo (ver [Integración: backend Quantum](#integración-backend-quantum-pagos-y-catálogo) más abajo).

**Última actualización**: 2026-08-08 (auditoría completa del Excel de casos de prueba vs `tests/projects/**` — ver `docs/lecciones-aprendidas.md` para el detalle de qué se corrigió).

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
