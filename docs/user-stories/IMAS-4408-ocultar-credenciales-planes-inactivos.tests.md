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

**CP09 - Verificar acceso y ausencia total de credenciales/planes operables** 🔴 **BLOQUEADO — `IMP-015`, sin proceso para conseguir esta condición**
- Dado: usuario cuyo único plan pasó a Inactivo (falta de pago 3 meses)
- Cuando: ingresa a la WebApp
- Entonces: puede autenticarse e ingresar, pero no ve ninguna credencial ni plan disponible en ninguna pantalla, y no puede operar en Videollamadas ni Reintegros
- Trazabilidad: AC-9
- Bloqueo: la cuenta conseguida hoy (`pauscalzo@hotmail.com`) tiene un plan Activo de respaldo (Mishi) — no sirve para aislar este escenario. Hace falta una cuenta cuyo ÚNICO plan esté Inactivo — confirmado con Paula (dev) que esto **no tiene ningún proceso**: Alexis edita la base de datos directamente a mano, no hay panel ni self-service. Ver `IMP-015` en `docs/impedimentos-bloqueos.md`.

## TS-04 Escenario 3 — usuario cuyo ÚNICO plan fue Dado de baja — AC-9 (equivalente)
**Riesgo: ALTO** (mismo motivo que TS-03; la HU dice explícitamente que el tratamiento debe ser equivalente a Inactivo, pero no se confirmó en vivo que efectivamente lo sea).

**CP10 - Verificar acceso y ausencia total de credenciales/planes operables** 🔴 **BLOQUEADO — `IMP-015`, mismo motivo que CP09**
- Dado: usuario cuyo único plan fue Dado de baja definitivamente
- Cuando: ingresa a la WebApp
- Entonces: mismo comportamiento que CP09
- Trazabilidad: AC-9
- Bloqueo: mismo que CP09 — hace falta una cuenta con un único plan, dado de baja. Ver `IMP-015`.

## TS-05 Alcance mobile / app nativa
**Riesgo: sin clasificar — falta confirmar si está en alcance.**

**CP11 - Verificar si la app nativa (mobile) también oculta credenciales de planes Inactivos/Dados de baja** `[SIN FUENTE]`
- La HU no aclara si aplica solo a la WebApp (navegador) o también a la app nativa — no se diseña el caso hasta confirmar con el equipo
- Trazabilidad: sin fuente

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
| AC-9 (único plan Inactivo/Dado de baja: entra pero no ve nada) | CP09, CP10 | 🔴 Bloqueado — sin cuenta de este tipo |
| AC-10 (no disponible en ningún selector/flujo) | CP05, CP06 | ✅ Verificado en vivo (Videollamadas + Reintegros, los 2 flujos que menciona la HU) |
| AC-11 (filtrado por estado real de SISE) | Implícito en todo lo de arriba | ✅ Consistente — el plan dado de baja en SISE es justamente el que desapareció |
| AC-12 (no afecta otros planes Activos) | CP07 | ✅ Verificado en vivo |

**11 casos diseñados. 9 verificados en vivo hoy (CP01-CP08), 2 bloqueados (CP09/CP10, escenario de único plan) y 1 sin fuente (CP11, alcance mobile).**

**Lo más importante que se puede afirmar hoy**: el Escenario 1 (el más común en producción — un usuario con varios planes donde uno se cae) está **completamente confirmado, en las 5 pantallas que pide la HU, con una cuenta real cuyo plan fue dado de baja de verdad en el backend** (no simulado). Los únicos 2 casos genuinamente pendientes (CP09/CP10) necesitan una cuenta cuyo ÚNICO plan esté Inactivo o Dado de baja — no se puede aislar ese escenario con la cuenta de hoy porque tiene un plan Activo de respaldo (Mishi).

**Pendiente de decisión del usuario**:
1. Si vale la pena conseguir una segunda cuenta (único plan) para cerrar CP09/CP10 — confirmado que no hay ningún proceso ni self-service para esto (`IMP-015`): Alexis edita la base de datos a mano cada vez. Paula sugirió escalarlo a Oscar o directamente a Alexis, porque QA "tendría que poder evaluar esos escenarios" — reconoce que es un gap real, no solo una curiosidad.
2. Si corresponde comentar en Jira / transicionar `IMAS-4411` ("Pruebas QA") reflejando este avance (9 de 11 casos verificados).
3. Confirmar alcance mobile (CP11) con el equipo.
