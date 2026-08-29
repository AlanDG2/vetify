# Diseño de casos — IMAS-4052 Workaround Reintegros para capitados OSDE (subtarea de IMAS-4101)

> Diseño basado en riesgo (qa-risk-test-design). Riesgo: **medio** (mensaje informativo, no toca dinero/estado — pero un enrutamiento incorrecto puede confundir a todo un segmento de clientes o, peor, dejarlos entrar a un flujo que el negocio decidió no ofrecerles). Cobertura: 1 feliz + 2 negativos/borde + 1 control diferencial (adquirente no afectado).
>
> **Fuente**: contrato real de Jira `IMAS-4052` (campo oculto `customfield_11620` — el issue es tipo "Tarea", su descripción estándar está vacía; ver `feedback_jira_tarea_customfield_description` en memoria). Objetivo/Alcance/Texto sugerido/Criterios de aceptación completos, nunca antes documentados en este repo con este nivel de detalle. Contexto completo de la épica en `docs/user-stories/IMAS-4101-migracion-reintegros-nexus.md`.
>
> **Criterios de aceptación citados textualmente del ticket**:
> 1. Si el usuario pertenece a un plan capitado de OSDE, al ingresar a Reintegros desde cualquier punto de acceso, no puede iniciar el flujo de autogestión por restricciones de IKE.
> 2. El usuario visualizará un mensaje informativo con las instrucciones para contactar al Centro de Atención al Cliente de Vetify.
> 3. El comportamiento deberá ser consistente tanto en el acceso desde el Menú Principal como desde el Quick Access.
> 4. Los clientes adquirentes no deberán verse afectados por este cambio y continuarán utilizando el flujo actual de autogestión de reintegros.
> 5. La identificación del tipo de cliente (Capitado OSDE vs. Adquirente) deberá realizarse de acuerdo con las reglas de negocio vigentes.
> 6. El workaround deberá permanecer activo hasta la disponibilidad de la solución definitiva.
> 7. Versión mobile y desktop.
>
> **Texto sugerido citado del ticket** (nunca antes documentado): *"Si necesitas realizar un reintegro podés coordinar la gestión 0800 122 1183 (24/7) opción XX"* — nota: el propio ticket deja **"opción XX" como placeholder literal, nunca completado**. Vale la pena confirmar contra el mensaje real en producción si ese placeholder se resolvió.

## Cuenta usada

Pool `OSDE_CAPITADO` (`src/fixtures/users/pooled-users.json`), 3 cuentas disponibles. Solo 1 de las 3 tiene DNI válido (7-8 dígitos) y sirve de evidencia limpia — ver nota al final.

| Cuenta | DNI | Tags | Sirve para este chequeo |
|---|---|---|---|
| `user_1783951005615@automation.com` | `12540524` (8 díg.) | ACTIVE, WITH_PET, NO_EMPTY_PLAN | ✅ Sí — usada en CP01/CP02 |
| `user_1784732342305_69985b8e@automation.com` | `167424201` (9 díg.) | NO_PET, PLAN_WITHOUT_PET, ACTIVE | ⚠️ Confundida por `BUG-007`/`IMAS-4279` (ver nota) |
| `user_1784816945816_ece7183c@automation.com` | `1913450260` (10 díg.) | REGISTERED, NO_PET, PLAN_WITHOUT_PET | ⚠️ Misma confusión, no probada por descarte directo |

**Producto confirmado real vía API** (`GET /api/services/pets/my-products`): `cuenta: 2349`, `descripcion_producto: "Vetify Esencial OSDE"`, `codigo_grupo_cuenta: "0163"` — es el código OSDE real y confirmado (Grupo 163), no un mislabeling de catálogo como en incidentes anteriores de esta sesión. La ambigüedad no está en "¿es realmente OSDE?" sino en "¿es realmente Capitado (vs. Adquirente) tal como lo tiene tageado el pool?" — ver hallazgo de CP01/CP02.

## TS-01 Enrutamiento del workaround

**CP01 - Validar que un capitado OSDE ve el mensaje informativo al acceder a Reintegros desde el Menú Principal** 🔴 **NO PASA COMO SE ESPERABA — EJECUTADO 2026-08-28**
- Dado: cuenta `user_1783951005615@automation.com` (DNI `12540524`, producto confirmado `2349` "Vetify Esencial OSDE", tag de pool `OSDE_CAPITADO`), logueada en `vetify-qa.ikeapp.com`.
- Cuando: se abre el menú hamburguesa (ícono superior izquierdo) y se hace clic en "Reintegros" (bajo la sección "Servicios").
- Entonces (esperado, AC1+AC2): debería mostrarse un mensaje informativo indicando contactar al 0800 122 1183, sin acceso al flujo real.
- **Resultado real**: navegó a `/section/myreintegros` y mostró la pantalla **real** de autogestión — "Cuentas de acreditación" (BRUBANK S.A.U., "Mio"), botón "Cambiar o agregar cuenta", y "Mis reintegros" con historial real: **Pagado (4), Solicitado (1), Desaprobado (2)**, con 3 ítems listados (mascota "Popi", montos y fechas reales, ej. "26/08/2026 $6,00 Pagado"). Ningún mensaje informativo, ningún bloqueo.
- Trazabilidad: `IMAS-4052` AC1/AC2 — no se cumplieron para esta cuenta.

**CP02 - Validar que "Nuevo reintegro" también queda bloqueado (no solo la vista de historial)** 🔴 **NO PASA COMO SE ESPERABA — EJECUTADO 2026-08-28**
- Dado: misma cuenta, ya en la pantalla de "Mis reintegros" (CP01).
- Cuando: se hace clic en el botón "Nuevo reintegro".
- Entonces (esperado, AC1): no debería poder iniciar el flujo — mensaje informativo en su lugar.
- **Resultado real**: navegó a `/section/nuevo-reintegro` y cargó el wizard real de 3 pasos ("Información del gasto" / "Cargar documentos" / "Confirmación") — bloqueado únicamente por un motivo de datos ajeno al workaround: **"No hay mascotas registradas para tu documento."** (la cuenta está tageada `WITH_PET` en el pool, pero el DNI usado en Reintegros no encontró mascota — posible desincronización de datos, no investigado más a fondo por no ser el foco de este caso). El punto clave: **el sistema permitió llegar hasta acá sin ningún mensaje del workaround** — el bloqueo que sí ocurrió es de otra naturaleza (falta de datos), no el bloqueo de negocio esperado.
- Trazabilidad: `IMAS-4052` AC1 — no se cumplió.

**CP03 - Validar el mismo comportamiento desde el "Quick Access" de Reintegros** 🟡 **NO ENCONTRADO — no se pudo ejecutar**
- Dado: cualquier cuenta (probado con la Capitado de CP01 y con la Adquirente de Paula, ver CP04).
- Cuando: se buscó un acceso directo a "Reintegros" en la sección "Accesos" de la pantalla de inicio (el candidato más obvio a "Quick Access").
- Entonces (esperado): un 2do punto de entrada, con el mismo comportamiento que el Menú Principal.
- **Resultado real**: la grilla "Accesos" de la home solo muestra 4 tiles fijos — **Emergencias, Asistencia presencial, Videollamada, Planes y coberturas** — sin ningún tile de "Reintegros", para NINGUNA de las 2 cuentas probadas (Capitado ni Adquirente). No se encontró tampoco ninguna referencia a "Quick Access"/"acceso rápido" en el código de automatización de este repo (`grep` sin resultados).
- **No se puede confirmar ni negar el comportamiento de este 2do punto de entrada** — puede ser una sección con otro nombre no identificada, una feature solo-mobile (la HU pide explícitamente "Versión mobile y desktop", AC7), o software desactualizado. Pendiente aclarar con el equipo qué es exactamente "Quick Access" en este contexto antes de dar este CP por cerrado en cualquier sentido.
- Trazabilidad: `IMAS-4052` AC3/AC7 — no verificable con la información disponible hoy.

**CP04 - Control: un cliente Adquirente NO debe verse afectado** ✅✅ **CONFIRMADO — evidencia ya recogida el mismo día (2026-08-28), sesión de retest de `IMAS-4408`**
- Dado: cuenta `pauscalzo@hotmail.com` (Paula Scalzo, mascota Mishi, plan "VETIFY 100 SENIOR x1" — no-OSDE, Adquirente).
- Cuando: se accedió a Reintegros → Nuevo reintegro.
- Entonces (AC4): el flujo de autogestión debe seguir funcionando normalmente para este segmento.
- **Resultado real**: cargó el wizard real, con la mascota Mishi preseleccionada y `GET /api/bff/reintegros/mascotas` → `200` — el flujo de autogestión funciona sin cambios para Adquirente, como se esperaba.
- Trazabilidad: `IMAS-4052` AC4 — **cumplido**. Este resultado, comparado con CP01/CP02, es lo que hace notable el hallazgo: no es que el sistema esté roto en general, es que **específicamente la cuenta tageada como Capitado OSDE se comporta igual que una Adquirente**, cuando el ticket exige que se comporten distinto.

## Hallazgo aparte, no relacionado al workaround — reconfirmación de `BUG-007`/`IMAS-4279`

Al intentar usar las otras 2 cuentas `OSDE_CAPITADO` del pool (DNI de 9 y 10 dígitos) para reforzar CP01 con una 2da cuenta, ambas fallaron — pero por el bug de longitud de DNI ya conocido (`VAL-002 "Holder document must be a 7 u 8 digit DNI"`), **no por el workaround**. `docs/bugs/BUG-007-reintegros-dni-formato-invalido.md` ya documentaba este mismo error contra `GET /api/reintegros/v1/cuentas-acreditacion` y `GET /api/reintegros/v1/expedientes` desde 2026-08-11 — esto es una **4ta y 5ta reconfirmación** con cuentas nuevas del pool `OSDE_CAPITADO` (antes solo se sabía que afectaba `VETIFY_ADQUIRENTE`), no un endpoint nuevo. Sí es una novedad separada: esta misma sesión, más temprano, se había visto la variante sobre `GET /api/reintegros/v1/mascotas` (cuenta `user_1786584481760_8aea8baa@automation.com`, DNI de 10 dígitos) — ese endpoint puntual todavía no estaba en `BUG-007.md`, se agrega ahora.

## Resumen de cobertura

| Ticket | Cubierto por | Estado |
|---|---|---|
| `IMAS-4052` (AC1, AC2 — bloqueo + mensaje) | CP01, CP02 | 🔴 **No se cumplen** para la única cuenta con evidencia limpia disponible |
| `IMAS-4052` (AC3, AC7 — Quick Access, mobile) | CP03 | 🟡 No verificable — no se identificó ese punto de entrada en esta sesión |
| `IMAS-4052` (AC4 — adquirente no afectado) | CP04 | ✅ Cumplido |
| `IMAS-4052` (AC5 — identificación correcta del tipo de cliente) | — | Sin caso dedicado — ver discusión abajo, es el núcleo de la ambigüedad |
| `IMAS-4052` (AC6 — activo hasta solución definitiva) | — | No aplica a QA funcional, es una condición de negocio/roadmap |

**2 de 7 AC funcionalmente verificables (AC1/AC2) no se cumplieron con la única cuenta que dio evidencia limpia; AC4 sí se cumplió; AC3/AC7 quedaron sin verificar por no encontrar el 2do punto de entrada.**

## 🔄 Actualización — la cuenta usada en CP01/CP02 no es un caso genérico, es la cuenta de referencia de `IMAS-4092`

Investigando por separado el ticket `IMAS-4092` (Fase B), se encontró que **la misma cuenta** usada arriba (DNI `12540524`, mascota "Popi") es la que Paula Scalzo (dev) usó el 2026-08-26 para validar que Nexus funciona para capitados — comentario + 5 capturas adjuntas en `IMAS-4092`. El panel interno de Nexus ("Iké Argentina (dev)") etiqueta a esa cuenta explícitamente como **"Osde/capitado (H)"** — confirma que es un capitado real, no un mal etiquetado del pool. La captura muestra el servicio `3268-1` de esa cuenta con ciclo completo **Aceptado → Finalizado**, $6 pagados vía Nexus.

**Esto cambia la lectura más probable de CP01/CP02**: no es necesariamente un gap del workaround — es más probable que esta cuenta puntual esté deliberadamente habilitada (a nivel de datos/entorno) para que dev/QA puedan ejercer el flujo real de Capitados en Nexus, que es justo el objetivo de `IMAS-4092`. Si `IMAS-4052` bloqueara a esta cuenta también, nadie podría haber validado nunca que Capitados sí pueden completar un reintegro — que es el resultado que Paula reportó como exitoso. Ver `docs/user-stories/IMAS-4092-...tests.md` para el detalle completo de esa investigación.

**No cambia la conclusión práctica**: sigue sin resolverse si esto es un mecanismo soportado/documentado (flag, cuenta de test dedicada) o un efecto colateral no buscado — pero baja la probabilidad de que sea un bug de `IMAS-4052` en sí. Se mantiene la recomendación de confirmar con el equipo antes de reportar nada.

## Discusión — por qué esto no se reporta todavía como bug confirmado

`IMAS-4052` está "Hecho" en Jira con sus 11 subtareas también "Hecho" (incluida `IMAS-4056` "Pruebas en QA", ejecutada por Javier Caballero — sin evidencia ni descripción documentada de cómo). El propio ticket reconoce en su AC5 que "la identificación del tipo de cliente (Capitado OSDE vs. Adquirente) deberá realizarse de acuerdo con las reglas de negocio vigentes" — es decir, ya anticipa que esa clasificación es la parte delicada. Hay 2 explicaciones igual de plausibles para lo encontrado en CP01/CP02, y no se puede distinguir cuál es la correcta sin más información:

1. **El workaround tiene un gap real**: no está identificando correctamente a esta cuenta como Capitado, y la deja pasar al flujo real (posible regresión o cobertura incompleta de las "reglas de negocio vigentes" mencionadas en AC5).
2. **El tag `OSDE_CAPITADO` del pool es incorrecto para esta cuenta específica**: el producto (2349, "Vetify Esencial OSDE") está confirmado real, pero el pool podría estar clasificando mal Capitado vs. Adquirente (ambos modelos de negocio pueden compartir el mismo código de producto) — ya pasó 2 veces antes en este mismo proyecto que un tag de segmento no reflejaba el producto real (ver `feedback_verify_segment_via_product_catalog` en memoria), aunque en esos casos previos era el catálogo de producto el que no coincidía, no específicamente el eje Capitado/Adquirente.

**No se puede resolver esta ambigüedad solo con lo que hay en este repo.** Haría falta que alguien del equipo (Liliana Picinotti, reporter de `IMAS-4052`, o quien mantenga el pool de usuarios) confirme cómo se determina Capitado vs. Adquirente para esta cuenta puntual antes de decidir si esto se reporta como bug nuevo o si es un dato mal cargado en el pool de pruebas.

## Pendiente

1. Confirmar con el equipo (Liliana Picinotti / Alexis Castellano) si `user_1783951005615@automation.com` es realmente Capitado OSDE o si el pool la tiene mal clasificada.
2. Si se confirma que es genuinamente Capitado y el workaround sigue sin bloquear, reportar como bug nuevo (severidad media — no es un flujo roto, es un control de negocio que no se está aplicando).
3. Identificar qué es exactamente "Quick Access" en este contexto (¿otra pantalla? ¿solo mobile?) para poder ejecutar CP03.
4. Confirmar si el texto real en producción resolvió el placeholder literal "opción XX" del texto sugerido, o si sigue así en el mensaje que efectivamente ven los usuarios (no se pudo ver el mensaje real hoy porque nunca apareció).
5. Sumar la ampliación de alcance de `BUG-007`/`IMAS-4279` (afecta también `cuentas-acreditacion` y `expedientes`) al doc de ese bug.
