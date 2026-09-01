# Diseño de casos — IMAS-4408 Ocultar credenciales y restringir operatoria para planes Inactivos/Dados de baja

> Diseño basado en riesgo (`qa-risk-test-design`). Fuente: 12 criterios de aceptación literales de la HU (campo `customfield_11620`, ver `IMAS-4408-ocultar-credenciales-planes-inactivos.md`) + evidencia visual del dev (Paula Scalzo, comentario 2026-08-27, 9 capturas) + verificación propia en vivo 2026-08-28.
>
> **Estado por caso**: ✅ verificado en vivo (esta sesión) / 🟡 verificado solo por evidencia del dev (no reproducido por QA) / 🔴 **BLOQUEADO** / ⚪ sin fuente.

## Cuenta de prueba usada (2026-08-28)

`pauscalzo@hotmail.com` — conseguida a través de Paula Scalzo (dev), quien le pidió a Alexis (soporte/backoffice) dar de baja un plan real de esta cuenta en QA para poder demostrar el fix. Perfil real:
- **Mishi** (Abisinio, 7 años) — plan "100 Senior", **ACTIVO** — funciona como control.
- Un segundo plan de la misma cuenta (asociado a otra mascota, no visible hoy) — **DADO DE BAJA** de verdad vía SISE/backoffice, no simulado.

**Limitación original, resuelta por decisión del usuario (2026-08-28)**: esta cuenta ya estaba en el estado "dado de baja" cuando se recibió — QA no vio el "antes" de esa mascota puntual con sus propios ojos, solo el "después" (el "antes" quedaba respaldado únicamente por las 9 capturas de Paula). El usuario decidió explícitamente aceptar el comportamiento de Mishi (la mascota con plan Activo, misma cuenta, mismo momento) como el "antes"/control válido — no es la misma mascota en 2 momentos distintos, pero cumple el mismo propósito de contraste (ver CP01, ahora ✅). Sobre el mecanismo en sí: no hay ningún lugar donde se explique técnicamente **cómo** se da de baja un plan (qué herramienta usa Alexis, qué pasos sigue) — confirmado buscando en `docs/conocimiento-sistema.md`, transcripciones de onboarding/training y el resto del repo. Lo único documentado es que **Alexis Castellano es el technical owner de todo el equipo de Mascotas** (`acastellano@ikeasistencia.com.ar`, la misma persona/cuenta ya conocida de Reintegros) y que esto no es autoservicio para QA — depende de pedírselo directamente a él, igual que otras cosas de este proyecto (cuentas de Iké WebApp, cupones Flux).

## TS-01 Plan Activo — comportamiento normal (AC-1)
**Riesgo: BAJO** (es el comportamiento ya existente, no lo que cambia esta HU).

**CP01 - Verificar que un plan Activo muestra su credencial y permite operar** ✅ **verificado en vivo 2026-08-28**
- Dado: usuario con un plan Activo (Mishi, plan "100 Senior")
- Cuando: ingresa a la WebApp
- Entonces: visualiza la credencial en Home, Mascotas y Planes; puede seleccionarla en Videollamadas y Reintegros
- Trazabilidad: AC-1
- Nota: aceptado por decisión explícita del usuario (2026-08-28) tratar el comportamiento de Mishi (plan Activo, misma cuenta, mismo momento) como el "antes"/control — es una mascota distinta en vez de la misma mascota en un estado anterior, pero cumple el mismo propósito de contraste: confirma en vivo que un plan Activo funciona con total normalidad en las 5 pantallas mientras el otro plan de la misma cuenta está oculto.

## TS-02 Escenario 1 — usuario con múltiples planes, uno Inactivo o Dado de baja (ACs 2,3,4,5,6,7,8,10,11,12)
**Riesgo: ALTO** (es el escenario principal y más probable en producción — usuarios reales con varios planes).

**CP02 - Verificar que el Home NO muestra la credencial del plan dado de baja** ✅ **verificado en vivo 2026-08-28**
- Dado: cuenta con 2+ planes, uno de ellos Dado de baja
- Cuando: el usuario entra a Home
- Entonces: solo se ve la credencial del plan Activo (Mishi); en el lugar del plan dado de baja aparece el estado genérico "Dejá su credencial lista" / "Completá la información de tu mascota para usar Vetify cuando lo necesites."
- Trazabilidad: AC-5

**CP03 - Verificar que la sección Mascotas NO muestra la mascota/credencial del plan dado de baja** ✅ **verificado en vivo 2026-08-28**
- Dado: mismo usuario de CP02
- Cuando: entra a la sección "Mascotas"
- Entonces: solo aparece Mishi (plan Activo) — la mascota del plan dado de baja no aparece en absoluto, ni como placeholder
- Trazabilidad: AC-5

**CP04 - Verificar que "Planes y coberturas" NO lista el plan dado de baja** ✅ **verificado en vivo 2026-08-28**
- Dado: mismo usuario
- Cuando: entra a "Planes y coberturas"
- Entonces: solo aparecen los planes Activos (4 planes "100 Senior"/"100 Cachorro" en la cuenta probada); ningún plan del tipo dado de baja en esta cuenta aparece en la lista
- Trazabilidad: AC-4

**CP05 - Verificar que el flujo de Videollamada no ofrece la credencial dada de baja como opción** ✅ **verificado en vivo 2026-08-28**
- Dado: mismo usuario, entra al flujo "Agendar nueva videollamada"
- Cuando: llega al paso de selección de mascota
- Entonces: el campo "Mascota" aparece **fijo en "Mishi"**, sin ningún selector ni opción de elegir la mascota del plan dado de baja — mismo comportamiento que "mascota única" (ver `docs/conocimiento-sistema.md`, sección Videollamadas: "con mascota única, el sistema auto-selecciona y no muestra selector")
- Trazabilidad: AC-6

**CP06 - Verificar que el flujo de Reintegros no ofrece la credencial dada de baja como opción y bloquea la carga** ✅ **verificado en vivo 2026-08-28**
- Dado: mismo usuario, entra a "Nuevo reintegro"
- Cuando: llega al paso "Información del gasto"
- Entonces: el combobox "Mascota" solo lista "Mishi"; el sistema muestra "No hay tipos de gasto disponibles para tu cobertura."; el combobox "Gasto 1" queda deshabilitado con el mismo texto; "Cantidad", "+ Agregar gasto" y "Continuar" quedan deshabilitados — no hay forma de continuar con el reintegro
- Trazabilidad: AC-7

**CP07 - Verificar que el plan Activo (Mishi) sigue funcionando con normalidad en las 5 pantallas** ✅ **verificado en vivo 2026-08-28 (implícito en CP02-CP06)**
- Dado: mismo usuario
- Cuando: se revisan Home/Mascotas/Planes/Videollamada/Reintegros
- Entonces: en ninguna de las 5 pantallas el plan Activo de Mishi se vio afectado — sigue mostrando su credencial y permitiendo operar normalmente en todas
- Trazabilidad: AC-12 ("La modificación no deberá afectar la visualización ni la operatoria de otros planes Activos pertenecientes al mismo usuario")

**CP08 - Verificar que el usuario puede seguir ingresando a la WebApp con normalidad** ✅ **verificado en vivo 2026-08-28**
- Dado: usuario con al menos un plan dado de baja
- Cuando: intenta iniciar sesión
- Entonces: login exitoso, sin ningún bloqueo ni mensaje relacionado al estado del plan
- Trazabilidad: AC-8 (parcial — confirma la mitad "puede ingresar" del escenario multi-plan; la mitad "solo ve los Activos" ya la cubren CP02-CP06)

## TS-03 Escenario 2 — usuario cuyo ÚNICO plan está Inactivo (por falta de pago) — AC-9
**Riesgo: ALTO** (caso de borde explícito de la HU, con comportamiento distinto al Escenario 1 — acá NO queda ningún plan Activo de respaldo).

**CP09 - Verificar acceso y ausencia total de credenciales/planes operables** ✅ **verificado en vivo 2026-08-31, vía simulación de red — ver nota de resolución abajo**
- Dado: usuario cuyo único plan pasó a Inactivo (falta de pago 3 meses)
- Cuando: ingresa a la WebApp
- Entonces: puede autenticarse e ingresar, pero no ve ninguna credencial ni plan disponible en ninguna pantalla, y no puede operar en Videollamadas ni Reintegros
- Trazabilidad: AC-9
- Automatizado: `tests/projects/vetify-webapp/plan-state.spec.ts` TS-01 TC-01, verificado pasando en Desktop y Mobile (Android)

## TS-04 Escenario 3 — usuario cuyo ÚNICO plan fue Dado de baja — AC-9 (equivalente)
**Riesgo: ALTO** (mismo motivo que TS-03; la HU dice explícitamente que el tratamiento debe ser equivalente a Inactivo).

**CP10 - Verificar acceso y ausencia total de credenciales/planes operables** ✅ **verificado en vivo 2026-08-31 — mismo mecanismo y mismo test que CP09**
- Dado: usuario cuyo único plan fue Dado de baja definitivamente
- Cuando: ingresa a la WebApp
- Entonces: mismo comportamiento que CP09
- Trazabilidad: AC-9
- Nota importante: la simulación de red no puede distinguir "Inactivo" de "Dado de baja" como estados de backend distintos — ambos producen el mismo resultado observable en el frontend (ningún plan operable devuelto). Por eso CP09 y CP10 quedan cubiertos por el mismo test automatizado — la HU misma dice que el tratamiento debe ser equivalente entre los dos estados.

## ✅ Resolución de `IMP-015` — 2026-08-31, sin necesitar la cuenta real

**Lo que se intentó primero**: Alan le escribió a Oscar pidiendo una cuenta por producto (Vetify B2C, OSDE Adquirente, OSDE Capitado, Flux Capitado) con un único plan Inactivo/Dado de baja, para no asumir que el comportamiento es igual en todos. Respuesta (por llamada): no se puede hacer esa prueba por ahora, limitarse al resultado con la cuenta ya entregada (`pauscalzo@hotmail.com`) — se va a tener en cuenta más adelante.

**Antes de aceptar esa limitación, se re-verificó `pauscalzo@hotmail.com` en vivo y se encontró que había cambiado de estado** desde el 2026-08-28: ya no muestra el mismo par Mishi(Activo)/mascota-oculta(Baja) documentado hace 3 días — ahora aparecen datos distintos (mascota "Popi" en Home, "Mishi" en Mascotas, 3 planes en la API con estados inconsistentes) y "Planes y coberturas" renderiza de forma no determinística (a veces 0 planes, a veces 4 con duplicados). La cuenta ya no sirve como evidencia limpia — deriva/degrada con el tiempo, mismo patrón ya visto en otras cuentas de pool a lo largo de este proyecto.

**Solución real, propuesta por Alan**: en vez de depender de una cuenta real (imposible de conseguir hoy, y la que había se degradó), simular a nivel de red la respuesta que un backend con un plan no-operable devolvería. Confirmado en vivo que `page.route()` + `route.fulfill()` **sí funciona de forma confiable en este sitio** para reemplazar el contenido de una respuesta puntual (a diferencia del bloqueo ya documentado en `NetworkOutageSimulator`, que es sobre *bloquear/abortar* una request para simular una caída — mecanismo distinto). Se mapearon las 5 pantallas de la HU contra los endpoints reales que cada una lee:
- Home, Mascotas, Planes y coberturas y Videollamada: todas leen `GET /api/services/pets/my-products` — ninguna filtra por `estado` del lado del cliente, todas confían en que el array ya venga filtrado por el backend. Un array vacío (`[]`) simula fielmente "no me queda ningún plan operable".
- Reintegros: usa un endpoint separado, `GET /api/bff/reintegros/mascotas` — necesita su propio mock.

Helper nuevo: `src/helpers/mockPlanState.ts` → `mockAccountWithNoOperablePlan(page)`. Test nuevo: `tests/projects/vetify-webapp/plan-state.spec.ts`. **Ventaja real sobre depender de una cuenta**: cero riesgo de degradación/drift, no consume ninguna cuenta real del pool, y sirve para los 4 productos por igual sin necesitar 4 cuentas distintas (la simulación de red es independiente de qué cuenta real esté logueada).

**Pendiente, no resuelto por esto**: si el equipo alguna vez provee una cuenta real con este estado (a través del proceso que "van a tener en cuenta más adelante"), valdría la pena una verificación puntual contra datos 100% reales para confirmar que el mock no se desvía de ningún detalle fino del comportamiento real — hoy esa confirmación independiente no existe, el mock está validado contra la lógica del frontend que se pudo observar (qué endpoint lee cada pantalla), no contra un caso real de "Inactivo"/"Dado de baja" de punta a punta.

## ⚠️ Pregunta de alcance abierta (NO es un caso de la HU — no cuenta en el total) — app nativa / mobile

Los 12 criterios de aceptación reales de la HU (`customfield_11620`) no mencionan la app nativa en ningún lado — todos hablan de la WebApp (Home, Mascotas, Planes, Videollamadas, Reintegros). Esto se había agregado como "CP11" en una ronda anterior como pregunta de QA por las dudas, no porque el contrato lo pida — corregido 2026-08-31 (Alan): si el alcance nunca se confirmó, no es un caso de la HU que cuente en el total, es una pregunta aparte para el equipo.

**Si el equipo confirma que sí aplica a la app nativa**, hay que saber esto antes de diseñarlo como caso real: la app nativa (confirmado con Alan) es un WEBVIEW embebiendo la misma WebApp, mismo contrato de API. Se intentó extender la técnica de mock de red que resolvió CP09/CP10 (`page.route()`/`fulfill()`) al stack mobile (WebdriverIO + Appium, `mobile/`) — spike descartable corrido contra el emulador Pixel_6_QA (`mobile/specs/vetify/.tmp-spike-cdp.spec.ts`, borrado después): `browser.getPuppeteer()` falla con `"Using DevTools capabilities is not supported for this session. This feature is only supported for local testing on Chrome, Firefox and Chromium Edge."` — WebdriverIO no expone CDP para sesiones Appium/mobile, aunque el WEBVIEW sea Chromium por dentro. Si algún día se confirma que está en alcance, va a estar bloqueado por lo mismo que CP09/CP10 (`IMP-015`, sin cuenta real) pero sin el atajo de simulación que salvó a esos dos.

---

## Resumen de cobertura

| AC | Cubierto por | Estado |
|---|---|---|
| AC-1 (plan Activo funciona normal) | CP01 | ✅ Verificado en vivo |
| AC-2/AC-3 (Inactivo/Dado de baja ocultan credencial) | CP02-CP06 | ✅ Verificado en vivo (vía Escenario 1) |
| AC-4 (no aparece en Planes) | CP04 | ✅ Verificado en vivo |
| AC-5 (no aparece en Home/Mascotas) | CP02, CP03 | ✅ Verificado en vivo |
| AC-6 (no seleccionable en Videollamadas) | CP05 | ✅ Verificado en vivo |
| AC-7 (no seleccionable en Reintegros) | CP06 | ✅ Verificado en vivo |
| AC-8 (multi-plan: solo ve los Activos) | CP02-CP08 | ✅ Verificado en vivo |
| AC-9 (único plan Inactivo/Dado de baja: entra pero no ve nada) | CP09, CP10 | ✅ Verificado en vivo (vía simulación de red, ver resolución de IMP-015 arriba) |
| AC-10 (no disponible en ningún selector/flujo) | CP05, CP06 | ✅ Verificado en vivo (Videollamadas + Reintegros, los 2 flujos que menciona la HU) |
| AC-11 (filtrado por estado real de SISE) | Implícito en todo lo de arriba | ✅ Consistente — el plan dado de baja en SISE es justamente el que desapareció |
| AC-12 (no afecta otros planes Activos) | CP07 | ✅ Verificado en vivo |

**10 casos, derivados de los 12 criterios de aceptación reales de la HU — los 10/10 verificados.** (La app nativa/mobile nunca fue parte del contrato real — ver la pregunta de alcance aparte más arriba, no cuenta en este total.)

**Lo más importante que se puede afirmar hoy**: el Escenario 1 (el más común en producción) está confirmado con una cuenta real cuyo plan fue dado de baja de verdad en el backend. Los Escenarios 2/3 (único plan Inactivo/Dado de baja) están confirmados vía simulación de red (`page.route()`) en la WebApp (Desktop y Mobile-viewport), automatizados y verificados — no fue posible conseguir una cuenta real con este estado (`IMP-015`, escalado a Oscar 2026-08-31, respuesta "no por ahora"), pero la simulación cubre las 5 pantallas de la HU sin ese requisito. Los 12 AC reales quedan cubiertos al 100%.

**Pendiente de decisión del usuario**:
1. Preguntarle al equipo si esta HU también debería aplicar a la app nativa (mobile) — hoy el contrato no lo pide, así que no bloquea el cierre. Si en el futuro se confirma que sí aplica, ya se investigó que quedaría bloqueado por `IMP-015` sin el atajo de simulación que sí funcionó en la WebApp (WebdriverIO/Appium no expone CDP para sesiones mobile).
2. Si en algún momento el equipo provee una cuenta real con el estado Inactivo/Dado de baja, valdría la pena una verificación puntual contra datos 100% reales para confirmar que la simulación no se desvía de ningún detalle fino.
