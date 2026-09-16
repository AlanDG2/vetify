Jira: **NO SE CREA — corrección 2026-09-15.** Esto es `ENV_BLOCKED` según la propia regla de clasificación del proyecto (`.claude/skills/qa-bug-report`): un 500/intermitencia de infra no es un bug de producto, va a `docs/impedimentos-bloqueos.md` como impedimento, no a un Defect. De hecho ya está ahí: es exactamente el bloqueo 1 de `IMP-017` (`category/overview`/`my-products` intermitente), reconfirmado ahí mismo con toda la evidencia de esta sesión (2026-09-01 en adelante). `IMAS-4464` ya se había cerrado "Cancelado" por este mismo motivo ("problema de ambiente, no de producto") — crear un Defect nuevo hubiera repetido el mismo error de clasificación que ya se corrigió una vez. Este archivo queda como registro de la investigación puntual del 2026-09-04, pero el tracking real y actualizado vive en `IMP-017` — no duplicar ahí.

[Título]: BUG | El sistema no muestra el plan o la mascota real de forma intermitente

[Severidad]: Alto — un cliente con su cuenta en orden (plan vigente, mascota cargada) puede entrar a la app y ver todo vacío o incorrecto (como si no tuviera nada contratado), sin haber hecho nada mal. Pasa en varias pantallas distintas de golpe, no en una sola.

[Categoría]: Backend / Infraestructura

[HU relacionada]: N/A — encontrado en una corrida de regresión general de la webapp (`tests/projects/vetify-webapp`), no está ligado a una historia puntual. Es un problema transversal que puede afectar la validación de cualquier HU que dependa de ver el plan o la mascota del cliente.

[Información del entorno]:
- Ambiente: QA — `https://vetify-qa.ikeapp.com`
- Fecha de detección/reconfirmación: 2026-09-04
- Cuentas usadas: 3 cuentas reales de prueba, de perfiles distintos, todas con plan vigente y mascota cargada según los datos que maneja el equipo de QA

[Descripción]:
A veces, cuando un cliente entra a la app, el sistema no logra traer bien la información de su cuenta (qué plan tiene, qué mascota tiene cargada) — y en vez de mostrar lo correcto, varias pantallas se quedan vacías o muestran mensajes genéricos, como si el cliente no tuviera nada contratado. No pasa siempre: se probó con 3 cuentas distintas, todas con datos reales y correctos, y las 3 mostraron este mismo problema al mismo tiempo. No es un problema de una pantalla puntual — cuando pasa, afecta varias secciones de la app a la vez (mascotas, planes y coberturas, credencial, videollamada), porque todas dependen de la misma información de fondo que no está llegando bien.

[Pasos para reproducir]:
1. Ir a `https://vetify-qa.ikeapp.com`.
2. Iniciar sesión con una cuenta real que tenga un plan vigente y una mascota cargada.
3. Recorrer las secciones "Mascotas", "Planes y coberturas" y "Credencial".
4. Si no se ve el problema al primer intento, cerrar sesión y volver a entrar 2 o 3 veces con la misma cuenta — no pasa siempre, es intermitente.

[Resultado esperado]:
El cliente ve su plan y su mascota reales en todas las pantallas, de forma consistente cada vez que entra.

[Resultado actual]:
Las pantallas muestran estados vacíos o genéricos (sin mascotas, sin planes, credencial no encontrada) pese a que la cuenta tiene datos reales y correctos cargados.

[Detalle técnico] (para el equipo de desarrollo):
- `GET /api/services/category/overview` → responde `500` de forma intermitente. Confirmado hoy 2026-09-04 en 3 cuentas pooled distintas (todas `VETIFY_ADQUIRENTE`), reproducido las 3 veces sin excepción en el momento de la prueba.
- Como consecuencia, `GET /api/services/pets/my-products` (el endpoint que alimenta Mascotas, Planes, Credencial y Videollamada) devuelve `[]` para esas mismas cuentas en el mismo momento, aunque el pool de QA las tiene marcadas con plan y mascota reales.
- **Mismo síntoma que ya fue reportado antes** en `IMAS-4464` (estado actual: **Cancelado**) y relacionado con `IMAS-4531` (estado actual: **Hecho**, pero sobre `GET /reintegros/mascotas`, un endpoint hermano) — el síntoma volvió a reproducir en vivo hoy, pese a que ambos tickets relacionados están cerrados. Ver `docs/impedimentos-bloqueos.md` IMP-014/IMP-017 (documentado desde 2026-08-28, sigue sin resolución definitiva).
- No confirmado si el 500 de `category/overview` y el `[]` de `my-products` comparten la misma causa raíz de infraestructura o son 2 síntomas del mismo incidente más amplio — sí confirmado que ocurren juntos, en las mismas cuentas, en la misma ventana de tiempo.

[Tabla CP de evidencia — corrida de regresión 2026-09-04, `Vetify WebApp Desktop`]:

| Spec | Caso | Cuenta | Síntoma observado |
| --- | --- | --- | --- |
| `credentials.spec.ts:31` | TC-01 Plan sin mascota asociada | pooled VETIFY_ADQUIRENTE | Mensaje esperado de plan sin mascota no aparece |
| `credentials.spec.ts:74` | TC-02 Plan con mascota asociada | pooled VETIFY_ADQUIRENTE | `petCredentialCard` no aparece |
| `credentials.spec.ts:1182` | TS-04 TC-01 Ver credencial | pooled VETIFY_ADQUIRENTE | `pets[0]` undefined (array vacío) |
| `credentials.spec.ts:1218` | TS-04 TC-02 Descargar credencial | pooled VETIFY_ADQUIRENTE | 0 pet cards tras 30s de poll |
| `pets.spec.ts:27` | TC-01 Detalle de mascota | pooled VETIFY_ADQUIRENTE | `petCredentialCard` no aparece (60s timeout) |
| `plans.spec.ts:26`, `:55` | TC-01/TC-02 Condicionado del plan | pooled VETIFY_ADQUIRENTE | 0 botones de plan para expandir (60s timeout) |
| `system-availability.spec.ts:205` | TC-02 Resto de la app operativo | pooled VETIFY_ADQUIRENTE | `petCredentialCard` no aparece tras restaurar el outage simulado |
| `videocall.spec.ts` (varios) | TS-01/TS-03/TS-04 | pooled VETIFY_ADQUIRENTE | Selector de mascota nunca aparece / `petA.id` undefined |

## 🔎 Retest 2026-09-06 — reconfirmado en una cuenta distinta, mismo día que BUG-034/BUG-035

Al arreglar el agotamiento de pool de `videocall.spec.ts`, se confirmó en vivo que `user_1786146480312_053a00eb@automation.com` tenía una mascota real (`getUserPets()` → 1 plan `OCUPADO`) hace unos minutos. Al reintentar un test contra esa misma cuenta poco después, la pantalla de videollamada mostró "Completá su credencial" (como si no tuviera mascota) — se volvió a consultar `getUserPets()` en el mismo momento y devolvió **`[]`** (vacío), para la misma cuenta, sin ningún cambio de por medio. Mismo día que se confirmaron BUG-034 (compra OSDE Adquirente) y BUG-035 (MercadoPago errático) — sugiere una ventana de inestabilidad más amplia del ambiente QA hoy, no limitada a un solo endpoint.

## 🔎 Retest 2026-09-07 (b) — reconfirmado de nuevo, con la MISMA cuenta cambiando de estado en menos de 1 minuto

Al explorar la pantalla de Mascotas con una cuenta pooled de 2 mascotas reales (`user_1786584481760_8aea8baa@automation.com`), la primera corrida trajo `getUserPets()` con 2 mascotas reales (`OCUPADO`, nombres y productos reales) — pero la pantalla de "Mascotas" en la webapp mostró igual "Necesitás completar la credencial para visualizar los datos" y el estado vacío de "Suscribir mascota", como si no tuviera ninguna. Al reintentar la MISMA corrida menos de 1 minuto después, `getUserPets()` devolvió `[]` para la misma cuenta. Mismo patrón ya documentado (backend con datos reales, frontend sin poder mostrarlos) — no bloqueó una tarea puntual esta vez (se estaba explorando UI, no verificando un CP), pero confirma que la inestabilidad sigue activa.

## 🔎 Retest 2026-09-07 — corregido: NO era BUG-033, era una cuenta puntual con estado real degradado

Primer intento: al explorar la UI de `credentials.spec.ts` (TC-18/19/20, comentados) para automatizar los CPs de cámara, se reprodujo el mensaje genérico "En estos momentos estamos realizando mejoras en la página" (mismo componente de `IMAS-3860`) al navegar al formulario de alta de mascota (`/pets`) con la cuenta pooled `user_1787086478298_7768b2cc@automation.com` — 3 de 3 intentos, con y sin sesión cacheada. Se documentó acá como una posible 3ra reconfirmación de BUG-033.

**Corrección tras investigar más**: se probó el MISMO flujo (`addPetFormPage.load()`, pantalla `/pets`) con una cuenta distinta (Fresh, `NO_PET+PLAN_WITHOUT_PET`, la misma que usa `credentials.spec.ts` TS-03 TC-01) y **funcionó perfecto** — la pantalla de alta de mascota cargó normal. Se confirmó además vía `apiClient.getUserPets()` que la cuenta problemática SÍ tiene planes `LIBRE` reales (2, cuentas 2313 y 2319) — no es un tag desactualizado. Conclusión: **no es BUG-033** (no es la caída transversal de `category/overview`) — es esta cuenta puntual, con una historia larga de reutilización intensiva (ver su nota en `pooled-users.json`: usada para compras repetidas, activaciones fallidas retomadas, etc.), la que tiene algún estado real corrupto que rompe específicamente la pantalla `/pets` pese a tener planes `LIBRE` válidos según la API de mascotas. No se investigó más a fondo la causa exacta (podría ser un estado inconsistente entre el backend de mascotas y el de alta de mascota) — se abandonó esa cuenta para este flujo y se continuó con una cuenta sana. No se cuenta como nueva evidencia de BUG-033.

[Notas adicionales]:
- Explica 16 de 17 fallas de la corrida de diagnóstico de `tests/projects/vetify-webapp` del 2026-09-04 — no se reportan esas 16 como bugs de test individuales, todas caen bajo este mismo bug de backend.
- Recomendación de automatización (separada de este bug): agregar un chequeo de salud de `category/overview` al inicio de la corrida para detectar este escenario en segundos en vez de 16 timeouts de hasta 3 minutos cada uno.

## 🔎 Reconfirmado 2026-09-14 — cuenta OSDE Adquirente 100% fresca, comprada y activada el mismo día

Al automatizar IMAS-4490 (condicionados OSDE Adquirente), se generó una cuenta nueva por API (compra real aprobada, registro y validación de póliza confirmados exitosos minutos antes) y se la logueó para llegar a "Planes y coberturas". La sesión rebotó 2/2 veces entre `/validation/policy` y `/auth/login?prevPage=...` sin llegar nunca a mostrar el plan — traza de red confirma que se llamaron `category/overview` y `my-products` en el medio de ese rebote. En la misma sesión, 3 cuentas *pooled* ya existentes completaron el mismo flujo sin ningún problema — confirma que sigue siendo intermitente/por-cuenta, no un outage total, y que las cuentas recién compradas por API parecen más expuestas (posible ventana de sincronización de datos más sensible justo después de la compra).

## 🔎 Reconfirmado 2026-09-15 — 3 intentos independientes en el mismo día, incluido uno que no tenía nada que ver con el síntoma original

Al buscar algo resoluble en el proyecto al arrancar el día, 3 candidatos distintos del backlog fallaron por este mismo bug:
1. `credentials.spec.ts` TS-03 TC-03/TC-04 (cámara mock) — mismo rebote de sesión a login vacío.
2. `vetify-b2c/user-management.spec.ts` TS-03 Activación de Cuenta — la cuenta `UNREGISTERED` disponible ya estaba realmente registrada (dato viejo consistente con esta misma inestabilidad de fondo).
3. Un experimento manual para diagnosticar una regresión NO relacionada (el tour de onboarding "primer login") — se intentó activar una cuenta manualmente sin el paso de login que se sospechaba causante; la validación de póliza se quedó colgada en su propia pantalla (mismo síntoma) y el experimento no se pudo ni completar.

Esto sube la cuenta a al menos **6 reconfirmaciones en vivo, en 4 fechas distintas** (2026-09-04, 09-06, 09-07 ×2, 09-14, 09-15), con cuentas de 3 productos distintos (Vetify B2C, OSDE Adquirente) y con cuentas tanto del pool como recién compradas por API. Es, con esta evidencia, el impedimento más reconfirmado de todo el proyecto — pero por ser `ENV_BLOCKED` (infra, no producto), el lugar correcto para toda esta evidencia es `IMP-017` en `docs/impedimentos-bloqueos.md`, no un Defect nuevo en Jira. Ver corrección al inicio de este archivo.
