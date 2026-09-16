# Pedidos técnicos listos para enviar — 2026-09-10

> **Enfoque de este doc: cada ítem es algo que OTRA PERSONA me tiene que resolver a mí — no una decisión mía.** Son pedidos de tipo **🔧 Técnico/Ambiente**: algo está roto, caído, o hace falta que alguien apruebe/entregue algo concreto — no son preguntas de negocio/proceso (esas están en el doc hermano `docs/preguntas-contextualizacion-2026-09-10.md`, mismo formato, separadas para no mezclar "arreglen esto" con "contéstenme esto"). **3 pedidos activos** (#1 y #2 se resolvieron solos, ver abajo). Cada uno autocontenido — se puede copiar y pegar tal cual en un mail/Slack/comentario de Jira, no debería hacer falta agregar nada para que la persona entienda qué se necesita.
>
> **Actualización 2026-09-14**: los pedidos #1 (API `/api/quantum/...` caída) y #2 (checkout OSDE Adquirente 401) se resolvieron sin necesitar a nadie externo — quedan como registro histórico, marcados ✅, no hace falta enviarlos.
>
> **Actualización 2026-09-16**: el pedido #5 (WebView sin contexto en Appium) se resolvió con acceso real a una Mac — eran 2 bugs técnicos verificables, no una restricción de seguridad. Queda marcado ✅. Se agregó el pedido #6 (nuevo), que sí hay que enviar: pedirle al equipo Mobile que sume `isInspectable=true` al repo fuente real (hoy solo existe como parche local).
>
> **Excluidos a propósito, con motivo:**
> - Ya tienen ticket de Jira: IMP-012 (IMAS-4431), IMP-004 (IMAS-4118), IMP-016 (IMAS-4531 — marcado "Hecho" en Jira, pero con historial de recurrencia real, reconfirmado sano en vivo 2026-09-11; ver `docs/impedimentos-bloqueos.md`).
> - **Movidos al doc de contextualización** (son preguntas de negocio/proceso, no fixes técnicos): IMP-005, IMP-009, IMP-018, IMP-020, IMP-022, IMP-024, IMP-026. Ver `docs/preguntas-contextualizacion-2026-09-10.md`.
> - No son un pedido a nadie: IMP-019 (código ya listo, solo falta que el ambiente esté sano para correrlo), IMP-010 (se resuelve solo apenas se destrabe IMP-009).
> - **IMP-001** (tokens de cupón Capitado): hoy todavía quedan tokens (7 OSDE + 8 Flux) — no es un pedido todavía, movido igual al doc de contextualización para cuando se agoten.
> - **IMP-015**: verificado en vivo que sigue resuelto desde el 2026-08-31 (mock de red) — no hacía falta ningún pedido.
> - **IMP-027/IMP-028 (los retractados)**: Alan ya había decidido esto mismo el 2026-09-01 (mantener `Automatizable=No` de forma permanente) — mandar estos pedidos hubiera contradicho una decisión ya tomada. El número IMP-027 colisionaba con un impedimento real distinto (iOS/BrowserStack), que sí se mantiene como pedidos #4 y #5 de este doc.
> - **IMP-025** (tour de onboarding, arquitectura de pool Fresh vs Pooled): es 100% una decisión propia sobre el framework de automatización, nadie externo la puede resolver por mí — no va en ningún doc de pedidos.
> - **Resueltos, no necesitan ningún pedido**: IMP-002, IMP-003, IMP-006, IMP-007, IMP-008, IMP-011, IMP-013, IMP-014, IMP-021 (+ IMP-015, ya detallado arriba).
>
> **Verificación 2026-09-11**: se revisaron los 27 impedimentos activos uno por uno — los 17 abiertos/acotados están todos representados (acá, en el doc de contextualización, o en esta lista de excluidos con motivo), y los 10 resueltos quedaron explícitos arriba. Ninguno quedó sin mapear.
>
> **Reorganización 2026-09-11**: este doc originalmente tenía 13 ítems mezclando fixes técnicos con preguntas de negocio/proceso. Se separó en 2 docs (este, técnico; y el de contextualización) para que cada uno tenga un enfoque claro. Además, 2 ítems (el viejo IMP-025 y el viejo IMP-027 "decisión interna") no tenían a nadie real del otro lado que pudiera resolverlos — se sacó uno y se reescribió el otro como 2 pedidos reales (#4 y #5 de abajo).
>
> Fuente completa de cada uno: `docs/impedimentos-bloqueos.md`.

---

## 1. ✅ RESUELTO 2026-09-14 (no hace falta enviar) — API institucional `/api/quantum/...` — IMP-017, parte 1

**Para**: ~~equipo de backend / infraestructura QA~~ — ya no aplica, lo resolvimos nosotros mismos
**Tests bloqueados**: 9 (CP01-CP09 de IMAS-4490) — **destrabados en cuanto a la URL**; siguen bloqueados por un problema de datos de catálogo distinto, ver actualización abajo

**Contexto**: para poder probar cualquier funcionalidad de OSDE Adquirente en el ambiente de QA, necesitamos poder crear cuentas de prueba nuevas de ese producto. Hasta ahora, la forma de hacerlo sin pasar por todo el flujo de compra manual era un script (`scripts/qa/create-test-account.mjs`) que habla directo con la API institucional del sitio (la que atiende `/api/quantum/...`).

**Qué encontramos**: desde el 2026-09-01, toda la base `/api/quantum/...` devuelve `404 Not Found` — no un error de negocio, un 404 genuino, como si el path no existiera en absoluto. Probamos varios endpoints distintos de esa misma base y todos dan el mismo resultado:
- `GET /api/quantum/jauth/token` → 404 (este es el endpoint de autenticación pública que usa nuestro script — sin él, no podemos ni empezar)
- `GET /api/quantum/jengage/lead/create` → 404
- `GET /api/quantum/jengage/catalog/products?cuenta=MA_VETIFY&brand=osde` → 404
- `GET /api/quantum/` (la raíz) → 404
- Para descartar que sea un problema general del ambiente: `GET /api` (sin el `/quantum`) → 200, responde normal.

**Nuestra sospecha, sin poder confirmarla nosotros**: como el resto de la API funciona bien y solo esta base específica da 404 total, parece un deploy a medio terminar en QA — como si alguien hubiese cambiado la ruta base de este servicio y se hubiera olvidado de migrar/redirigir la anterior, o el servicio que atiende ese path esté caído/desregistrado del proxy. No tenemos acceso a logs de backend para confirmar cuál de las dos cosas es.

**Lo que necesitamos que nos digan**:
1. ¿Es un deploy a medio terminar (cambiaron el path y falta terminar la migración)? Si es así, ¿cuándo se completa?
2. Si el path cambió a propósito, ¿cuál es la URL nueva? Así actualizamos nuestro script para apuntar ahí.
3. Si es simplemente que el servicio está caído, ¿pueden levantarlo?

**Impacto concreto mientras esto no se resuelva**: no podemos generar cuentas OSDE Adquirente de prueba por ningún medio automatizado — ni por este script, ni por el checkout completo (ver el pedido #2 de este mismo documento, que es un problema relacionado pero distinto). Esto bloquea completamente los 11 casos de prueba ya diseñados para validar los condicionados nuevos de OSDE Adquirente (IMAS-4490).

**Actualización 2026-09-13 — reproducido en vivo, identificado el equipo dueño real**: en llamada con Oscar Tello se reprodujo el 404 en vivo. Dato clave: *"todo lo que es engage lo administra la gente de COP... nosotros no tenemos control sobre esas APIs."* Oscar estaba armando un Postman para escalarlo a COP.

**RESUELTO 2026-09-14 — lo encontramos y arreglamos nosotros, sin necesitar a COP**: revisando una colección Postman real que ya existía en el repo (armada por alguien de Ike, "pmendoza"), encontramos que catálogo y pago de Quantum viven en un **dominio separado**: `https://qa-quantum.ike.ar/api/v1/jengage/...` — no en `qa.vetify.com.ar/api/quantum/jengage/...` como usábamos. Probamos el flujo corregido de punta a punta (Salesforce para el lead + este dominio nuevo para el pago) y **completó una compra real aprobada** (póliza `20359411`). Arreglado en el código: `VETIFY_QUANTUM_BASE_URL=https://qa-quantum.ike.ar` + `getPlans()`/`createPurchase()` corregidos en `VetifyInstitutionalApiClient`.

**Lo que queda, ya no es esto**: el catálogo real de QA hoy solo tiene 1 plan cargado (`"Vetify Classic x 1 OSDE"`) — nuestro propio filtro de marca lo excluye al pedir planes Vetify puros, dejando 0 planes disponibles para Vetify Adquirente puro (OSDE Adquirente sí funciona, justo porque el único plan es OSDE). Es un problema de **datos de catálogo**, no de código — ya cubierto por el pedido de PDF/condicionado (IMP-020) en el otro doc.

**`scripts/qa/create-test-account.mjs` — también reescrito y verificado 2026-09-14**: usaba `lead/create` contra Quantum (no existe ahí, el lead vive en Salesforce) y tenía 3 bugs propios más (tipos de dato en la tarjeta, `identification` mal anidada, cupón de Capitado apuntando a un endpoint que nunca existió). Reescrito para usar Salesforce + el pool real de cupones. Verificado en vivo: `OSDE_ADQUIRENTE` y `FLUX_CAPITADO` crean cuentas reales de punta a punta; `VETIFY_ADQUIRENTE` falla con el mensaje esperado del catálogo (no un bug).

---

## 2. ✅ RESUELTO 2026-09-14 (no hace falta enviar) — Checkout OSDE Adquirente 401 en el paso 3 — IMP-017, parte 2

**Para**: ~~equipo de backend / pagos~~ — ya no reproduce, no hace falta preguntar nada
**Tests bloqueados**: 0 — verificado en vivo (`purchase-flow.spec.ts` TC-01 OSDE Adquirente, compra real de punta a punta) 1/1 verde, 25s

**Contexto**: como alternativa al script bloqueado (ver pedido #1), probamos crear una cuenta OSDE Adquirente comprando de verdad, paso a paso, por la propia página de checkout (`qa.vetify.com.ar/checkout/form?plan=2358`).

**Qué encontramos, paso por paso**:
1. **Paso 1** (datos personales, `POST /api/sf/first-step`) → funciona perfecto, se crea el `leadId` correctamente.
2. **Paso 2** (datos de facturación, `POST /api/sf/second-step`) → funciona perfecto.
3. **Paso 3** (datos de la tarjeta) → acá se rompe. Al presionar "Finalizar" con una tarjeta de prueba válida (Visa `4509 9535 6623 3704`), pasa esto en orden:
   - `POST /api/ecommerce/validate-card` → **401**, sin ningún cuerpo de respuesta que explique por qué.
   - Inmediatamente después, `POST /api/quantum/jengage/payment/pagar-mp` → **500**.
   - Por último, `POST /api/sf/ecommerce-error` → 200 (esto es solo un log interno del error, no arregla nada).

**Nuestra sospecha, sin poder confirmarla nosotros**: los pasos 1 y 2 arman una sesión de checkout que funciona bien para esos 2 pasos — pero al llegar al paso de pago, `validate-card` parece necesitar algún tipo de token o cookie de sesión que esa sesión de checkout no tiene. No sabemos si es el mismo problema de fondo que el 404 del pedido #1 (ambos son de la familia de auth de la API institucional) o algo completamente aparte del flujo de pago.

**Lo que necesitamos que nos digan**: ¿por qué `validate-card` devuelve 401 en este punto exacto del flujo, si los 2 pasos anteriores de la misma sesión funcionaron bien? ¿Falta algo del lado del checkout (un header, un token) o es un problema del propio endpoint?

**Impacto concreto**: sin esto, tampoco podemos generar cuentas OSDE Adquirente por la vía manual del checkout — entre este bloqueo y el del pedido #1, hoy no existe NINGUNA forma de crear una cuenta OSDE Adquirente nueva en QA, ni automatizada ni manual.

**RESUELTO 2026-09-14 — ya no reproduce**: se corrió en vivo la compra completa real por UI (`purchase-flow.spec.ts` TC-01, OSDE Adquirente) — pasos 1, 2 y 3 completos, **1/1 verde**. No se investigó si se arregló solo junto con el resto de IMP-017 o por qué — no hace falta, el síntoma ya no está.

---

## 3. El checkout empieza a bloquearse tras varias compras seguidas en la misma sesión — IMP-029

**Para**: dev / infraestructura
**Asunto sugerido**: El checkout de Vetify B2C deja de cargar tras ~2 compras/interacciones seguidas desde el mismo navegador — ¿hay un rate-limit o anti-bot delante?
**Tests bloqueados**: 23 (filas de "Flujo de Compra" en `Casos de Prueba.xlsx` — Eliminar/Cambiar/Agregar cupón y las variantes de "Compra exitosa con cupón", en Vetify B2C y OSDE Adquirente; conteo exacto verificado hoy en el Excel, no una estimación)

**Contexto**: estamos automatizando nuevos casos de prueba sobre el checkout de Vetify B2C (aplicar cupones, completar el formulario de compra). El primer caso que escribimos (aplicar un cupón real) funcionó perfecto. Al escribir el segundo y tercer caso en la misma sesión de pruebas, encontramos un comportamiento nuevo.

**Qué encontramos, con evidencia concreta**: después de completar ~2 interacciones reales seguidas contra el checkout (por ejemplo: aplicar un cupón, después completar el formulario de datos personales), la página deja de cargar el listado de planes — queda completamente en blanco, mostrando solo el header con el logo y, en la esquina, el ícono de reCAPTCHA. Esperamos hasta 3 minutos completos y nunca cargó. Lo confirmamos 2 veces de forma independiente: una corrida con varios tests en paralelo, y otra corriendo los mismos tests de a uno (100% secuencial, sin ninguna concurrencia) — en ambos casos, exactamente el mismo síntoma, en el mismo punto (después de la 2da interacción real).

**Nuestra sospecha, sin poder confirmarla nosotros**: el checkout ya muestra un badge de reCAPTCHA de forma permanente en la esquina de la pantalla — es razonable pensar que existe algún mecanismo de scoring/rate-limiting detrás de eso, que empieza a bloquear la carga (en vez de mostrar un captcha explícito para resolver) cuando detecta varias interacciones rápidas y repetidas desde la misma sesión/IP — exactamente el patrón que genera un test automatizado.

**Lo que necesitamos que nos digan**:
1. ¿El ambiente de QA tiene algún mecanismo de rate-limiting o scoring anti-bot delante del checkout?
2. Si es así, ¿se puede exceptuar la IP o el rango desde donde corre nuestra automatización de QA? (Es un patrón común: muchos equipos arman un allowlist de IPs de CI/QA para este tipo de casos).

**Impacto concreto mientras esto no se resuelva**: no podemos terminar de automatizar los 23 casos de prueba de arriba — cada uno se traba apenas llega a la 2da o 3ra interacción real de la corrida.

**Actualización 2026-09-13 — teoría reforzada, sin confirmación 100%**: Oscar Tello coincide con la sospecha — especula que hay un WAF o regla anti-fraude bloqueando por muchas peticiones desde la misma IP, o un límite de interacciones por cliente/navegador en poco tiempo. No lo confirma con certeza ("no sé si eso está implementado"), pero tampoco ofrece la vía de whitelist de IP — en cambio sugiere directamente espaciar las corridas. **Conclusión práctica**: probablemente no valga la pena insistir con el pedido de excepción de IP; más realista planificar con esperas espaciadas entre interacciones reales.

---

## 4. Aprobar el pago del Apple Developer Program para destrabar la firma de la app iOS — IMP-027, parte 1

**Para**: tu líder/manager en Ike (quien apruebe gastos de herramientas de QA)
**Asunto sugerido**: Necesito aprobación para pagar US$99/año (Apple Developer Program) y así poder automatizar iOS de forma permanente
**Tests bloqueados**: toda la suite mobile de iOS (`mobile/specs/`, lado iOS) — hoy 0% automatizado en iOS, a diferencia de Android que sí corre contra emulador

**Contexto**: compilar la app iOS sin Mac ya se resolvió (gratis, vía GitHub Actions con un runner macOS) — el `.app` se genera bien y corre contra el Simulador. El problema real es más adelante: para correr los tests contra un dispositivo (real o en la nube, ej. BrowserStack), hace falta una app **firmada**, y ahí aparecen 2 caminos, ninguno gratis-y-automatizable a la vez:

1. **Apple Developer Program (US$99/año)**: con esto, la firma se puede automatizar por completo dentro de GitHub Actions (sin tocar nunca una Mac a mano) y queda reusable para siempre, para cualquier build futuro.
2. **Alquilar una Mac por bloques** (ej. MacinCloud, ~US$46 cada 10 días): sin costo recurrente fijo, pero hay que firmar a mano cada vez que se necesite un build nuevo — no se puede automatizar en CI, hay que repetir el trámite manual cada vez.

**Lo que ya está listo, esperando solo esto**: cuenta de BrowserStack creada (trial activo), repo de CI reusable armado y funcionando (compila y sube el build automáticamente), toda la investigación de qué archivo exacto hace falta (un `.ipa` firmado, no el `.app` de Simulador) ya hecha. Lo único que falta para destrabar todo de punta a punta es la firma.

**Lo que necesito que me digan**: ¿se puede aprobar el gasto de US$99/año del Apple Developer Program? Es un pago único anual, no recurrente por build — con eso, la automatización de iOS queda resuelta de forma permanente, sin volver a depender de rentar una Mac cada vez que haga falta un build nuevo.

**Qué cambia con la respuesta**: con la aprobación, se retoma la vía BrowserStack (ya con el resto del camino resuelto) y se automatiza iOS de punta a punta. Sin aprobación, la alternativa es seguir con la vía 100% gratuita (ver pedido #5, que tiene su propio bloqueo técnico sin resolver todavía).

**Actualización 2026-09-13**: el tema iOS completo (presupuesto + bloqueo técnico) se deriva a una reunión el **lunes 2026-09-14 a las 14hs con Andrés** (equipo Mobile) — Oscar Tello no supo responder esto directamente, dijo que Andrés "nos va a decir si eso es posible o no."

**Actualización 2026-09-16 — dato nuevo e importante, cambia el pedido**: se probó de punta a punta la vía de firma gratuita (Apple ID personal + iPhone físico conectado) en esta Mac — `xcodebuild archive` + `-exportArchive` produjeron un `.ipa` real, firmado y funcional (instalado y abierto en un iPhone 13 físico). **Pero al intentarlo con el bundle ID real (`com.vetify.qa.webapp`), Xcode dijo explícitamente: "The app identifier... cannot be registered to your development team because it is not available"** — ese bundle ID ya está registrado bajo OTRA cuenta de Apple Developer. **Esto es información nueva: significa que Ike (o quien haya subido la app original a la App Store/TestFlight) YA TIENE una cuenta de Apple Developer Program paga** — si no, ese bundle ID no podría estar registrado en ningún lado. La prueba se completó con un bundle ID de reemplazo (`com.alandg.vetifyqatest`, cuenta personal de Alan) solo para validar que el mecanismo funciona — no es la app real.

**Esto cambia el pedido**: en vez de pedir presupuesto para pagar un Apple Developer Program NUEVO, el pedido real y más barato es **pedir que agreguen a Alan (o a quien vaya a compilar) como miembro del Apple Developer Program que YA EXISTE** en la cuenta que tiene registrado `com.vetify.qa.webapp`/`com.vetify.webapp`. Eso no debería tener costo adicional (los equipos de Developer Program admiten varios miembros sin cargo extra) y evita pagar de nuevo algo que la empresa ya paga. **Falta confirmar quién administra esa cuenta** — probablemente el mismo equipo Mobile (Andrés).

---

## 5. ✅ RESUELTO 2026-09-16 (no hace falta enviar) — ¿Alguien del equipo mobile sabe por qué el WebView no expone contexto a Appium en el Simulador de iOS? — IMP-027, parte 2

**Para**: equipo dev mobile (iOS)
**Asunto sugerido**: Corriendo Appium contra el Simulador de iOS en CI, el WebView de la app nunca aparece como contexto inspeccionable — ¿hay algo en el código nativo que lo explique?
**Tests bloqueados**: toda la suite mobile de iOS (`mobile/specs/`) — es un camino alternativo al pedido #4 (no depende de pagar nada, pero depende de resolver esto)

**Contexto**: buscando una forma de automatizar iOS sin pagar ninguna firma, probamos correr Appium directo contra el Simulador dentro de un runner gratuito de GitHub Actions (que ya trae una Mac con Xcode). La app instala y abre bien (`getContexts()` devuelve `['NATIVE_APP']`), pero el contexto del WebView (`WEBVIEW_*`) nunca aparece, sin importar cuánto se espere.

**Qué ya descartamos, con evidencia real (8 corridas de CI)**:
- No es timing: se esperó con timeouts generosos (varios minutos), específicos para la primera sesión de iOS.
- No es el flag `isInspectable`: se confirmó por código que la app no lo tiene seteado, se probó agregándolo a mano, y el problema siguió igual.
- No es de red/DNS: se confirmó conexión real y rápida (200/302) desde el runner hacia el ambiente de QA.
- No es un problema de que la app no esté instalada: se confirmó con `simctl` que el bundle real está instalado correctamente.

**Lo que no pudimos ver, corriendo a ciegas dentro de CI**: el log interno de WebKit/XCTest (`showXcodeLog`) no trajo ninguna actividad relacionada al WebView, y el log unificado de iOS no expone actividad de apps de terceros por privacidad — no hay forma de ver "por dentro" qué está pasando sin una Mac real con pantalla.

**Lo que necesito que me digan**: ¿alguien del equipo que mantiene la app nativa (`ike-webapp-mobile`) sabe de algún motivo por el que el WebView no se exponga para depuración remota específicamente en el Simulador (aunque sí funcione en un dispositivo real, o al revés)? Por ejemplo: ¿hay alguna configuración de build, un entitlement, o una diferencia de comportamiento conocida entre Simulador y dispositivo real para el WebView de esta app en particular?

**Qué cambia con la respuesta**: si alguien ya conoce la causa, se ahorra seguir diagnosticando a ciegas en CI. Si nadie lo sabe, significa que esta vía gratuita necesita debuggearse con acceso a una Mac real con pantalla (lo cual empieza a acercarse en costo/tiempo a directamente pagar la firma del pedido #4).

**Actualización 2026-09-13 — hipótesis nueva: puede ser seguridad deliberada, no un bug**: Oscar Tello reconoció el patrón sin sorpresa ("puedes ir corriendo contra el simulador de iOS, la web de la app nunca aparece") y sugirió un motivo: *"si yo estoy pensando en un tema de vulnerabilidad de la aplicación, vos no deberías poder ver o manipular el WebView de alguna manera."* Es decir, la no-exposición podría ser intencional por seguridad, no un descuido técnico. Se propuso pedir una build especial solo-QA con el WebView expuesto — Oscar no supo confirmar viabilidad, se deriva al equipo Mobile en la reunión del lunes 2026-09-14 14hs con Andrés.

**RESUELTO 2026-09-16 — con Mac real, se encontraron 2 causas técnicas reales, NO es seguridad deliberada**: (1) Appium busca el WebView por bundle ID (`com.vetify.qa.webapp`), pero el proceso se reporta internamente como `process-vetify-qa` (nombre del scheme de Xcode) — nunca matcheaba, en ningún entorno, CI incluido. Fix: capability `additionalWebviewBundleIds: ['process-vetify-qa']`. (2) Con eso resuelto, apareció una causa nueva y distinta: la página cargaba en blanco por un error de certificado (`NSURLErrorDomain -1202`) — específico de la Mac usada para probar (tenía un antivirus con inspección HTTPS cuyo certificado no era confiado por el Simulator; no aplica a CI). Con los 2 fixes, `TC-01` y `TC-02` pasan de punta a punta — primera vez en la historia de este impedimento. **Detalle técnico completo en `docs/impedimentos-bloqueos.md` (IMP-027) y `documentation/HANDOFF-iOS-IMP027-2026-09-16.md`.**

---

## 6. Pedir que `webView.isInspectable = true` se sume como cambio permanente al código fuente de la app iOS — IMP-027, parte 3

**Para**: equipo dev mobile (iOS), dueños de `ike-webapp-mobile`
**Asunto sugerido**: ¿Podemos agregar `isInspectable = true` (solo en builds QA) al WebView de la app iOS? Ya confirmamos que hace falta para poder automatizar/depurar
**Tests bloqueados**: ninguno hoy (ya lo tenemos parcheado localmente para QA) — pero el parche vive SOLO en la copia de `ike-webapp-mobile` usada para compilar de forma local, no en el repo fuente real

**Contexto**: como parte de resolver el pedido #5 (ya cerrado, ver arriba), confirmamos con acceso real a una Mac que `webView.isInspectable = true` es **necesario** para que Safari/Appium puedan inspeccionar el WebView de la app — sin este flag, ni Safari Web Inspector ni ninguna herramienta externa pueden ver el contenido web embebido, sin importar el resto de la configuración. Grep al código real confirmó que este flag **no existe en ningún lado** de `ike-webapp-mobile` — probablemente porque nunca hizo falta hasta ahora (nadie había podido probar esto con acceso interactivo a una Mac antes de esta semana).

**Qué se hizo, para que quede claro que es un parche temporal, no un cambio ya aplicado al repo real**: se agregó localmente (fuera del control de versiones del repo fuente) en `Vetify-app/ViewController.swift`, dentro de `makeWebViewWithCustomScripts()`:
```swift
if #available(iOS 16.4, *) {
    webView.isInspectable = true
}
```
Esto se usó solo para compilar un `.app` de prueba y confirmar el diagnóstico — **no se tocó el repo fuente real de `ike-webapp-mobile`**.

**Lo que se necesita pedirle al equipo Mobile**: que evalúen agregar esta misma línea (o el equivalente que consideren seguro) al código fuente real — idealmente condicionado a builds QA únicamente (ej. detrás del mismo flag `VETIFY_QA` que ya usa `AppConfiguration.swift`), para no dejarlo activo en producción por accidente. Sin esto en el repo real, cualquier build QA futuro (los que arma CI, o los que arma cualquier otra persona) va a seguir sin ser inspeccionable, y este mismo diagnóstico habría que repetirlo desde cero.

**Qué cambia con la respuesta**: si el equipo Mobile lo suma al repo real, el diagnóstico completo de IMP-027 queda 100% reproducible para cualquiera (CI incluido) sin parches locales. Si prefieren no hacerlo (ej. por alguna política de seguridad que no se conoce todavía), es información nueva y válida — significaría que el WebView solo es inspeccionable en builds locales parcheados a mano, nunca en un build QA "oficial".

---

## Nota aparte — orden sugerido si hay que priorizar

Si hay que elegir por dónde empezar: los pedidos #1 y #2 (API institucional caída, checkout OSDE Adquirente) son los que hoy bloquean más volumen de casos (los 11 CPs de IMAS-4490 completos) y no tienen ninguna vía alternativa mientras no se resuelvan. El #3 (rate-limit del checkout) bloquea 23 casos ya escritos, listos para correr apenas se resuelva. Los #4 y #5 (iOS) no tienen fecha límite externa, pero conviene mandar el #4 (aprobación de presupuesto) cuanto antes porque es el que más tiempo de decisión ajeno puede tomar.

Las preguntas de negocio/proceso (Iké, videollamada, encuesta CE, roadmap, DNI, PDF de condicionado, build Debug Android, cupones) están en `docs/preguntas-contextualizacion-2026-09-10.md` — ese doc tiene su propio orden sugerido.
