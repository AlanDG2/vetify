Jira: IMAS-4351 (https://ikeasistencia-arg.atlassian.net/browse/IMAS-4351) — creado 2026-08-20, tipo Error, sin HU padre (mismo patrón que BUG-004 e IMAS-4347).

[Título]: DEFECT | Comprar con el DNI de un usuario existente no asocia el plan a su cuenta — sin mecanismo automático ni manual de reclamo

[Severidad]: Medio — no bloquea la compra en sí (se cobra y confirma correctamente), pero el cliente que ya tiene cuenta y compra un plan adicional identificándose con su mismo DNI nunca ve ese plan en su cuenta, sin ninguna vía (automática o manual) para reclamarlo.

[Categoría]: Divergencia HU vs UI (Flujo de Compra, TS-03 Asociación de Compra con Usuario)

[HU relacionada]: N/A — el caso viene de `documentation/Casos de Prueba.xlsx`, hoja "Flujo de Compra", TS-03 "Asociación de Compra con Usuario", no de un ticket Jira puntual.

[Información del entorno]:
- Ambiente: QA (`https://vetify-qa.ikeapp.com` + checkout institucional)
- Cuenta usada: provisionada el 2026-08-14 específicamente para este caso (compra real vía `UserFactory.generateTestUsers()` + `activateFreshAccounts()`, con `identification` confirmada en el backend vía `/api/users/me` — `identification:"170217323"`, `idType:"DNI"`, `isClient:true`, `userIdentifications` con 1 entrada real — **antes** de correr el test, para descartar de entrada el escenario de BUG-004/BUG-010 de este mismo proyecto donde el fixture mentía sobre el estado real).
- Fecha de validación: 2026-08-14

[Descripción]:
El Excel de casos de prueba describe el resultado esperado de TS-03 como: *"El sistema asocia el plan seleccionado al usuario cuya identificación corresponde al DNI ingresado."* Se verificó comprando un plan nuevo por el checkout institucional usando el DNI de una cuenta ya registrada y activa, y confirmando el conteo de planes reales de esa cuenta (`GET /api/services/pets/my-products`, el mismo endpoint que consume la webapp para mostrarle sus planes al usuario) antes y después de la compra.

**El conteo nunca cambió** — ni con un reintento de 30s inmediatamente después de la compra, ni revisado ~10 minutos más tarde (se descartó explícitamente demora de propagación, comparando contra el patrón ya documentado en este proyecto para otro flujo, IMP-004, que sí necesita ~15min).

Se investigó además si existe un mecanismo **manual** de reclamo (re-enviar la identificación vía `/validation/policy`, el mismo formulario que usa el alta inicial para vincular la primera compra a una cuenta nueva — ver `BUG-004`). Resultado: una cuenta ya activa no puede volver a acceder a `/validation/policy` — navegar ahí directamente la desloguea (`page.waitForURL` termina en `/auth/login?prevPage=.../validation/policy`, sin sesión). O sea, ni siquiera existe una vía manual visible en la UI para que el usuario reclame la segunda compra.

Se corrieron 2 compras reales independientes con el mismo DNI (`TC-01` y `TC-03` de la suite, ambas con pago aprobado confirmado por respuesta del endpoint de pago) — ambas con el mismo resultado.

[Pasos para reproducir]:
1. Tener una cuenta ya registrada y activa en la webapp, con un plan existente.
2. Anotar la cantidad de planes visibles hoy para esa cuenta (`Mis Planes` en la webapp, o `GET /api/services/pets/my-products`).
3. Ir al checkout institucional y comprar un plan nuevo, usando el mismo tipo/número de documento (DNI) de la cuenta del paso 1, pero un email distinto (no asociado a ningún usuario).
4. Confirmar que la compra se aprueba (pantalla de éxito / respuesta 200 con `statusMP.status === 'approved'`).
5. Iniciar sesión con la cuenta del paso 1 y revisar "Mis Planes" (o volver a pegar el `GET /api/services/pets/my-products`).

[Resultado esperado]:
El plan nuevo aparece asociado a la cuenta del paso 1 (conteo de planes +1), según el CA de TS-03 del Excel de casos de prueba.

[Resultado actual]:
El conteo de planes de la cuenta del paso 1 no cambia — permanece exactamente igual al de antes de la compra, sin importar cuánto se espere. No hay ninguna pantalla, aviso o acción en la webapp que permita reclamar/vincular manualmente esa compra a la cuenta existente.

[Notas adicionales]:
- **CONFIRMADO por el equipo 2026-08-20**: se consultó al equipo (mensaje al grupo) sobre cuál es el comportamiento esperado, en vez de asumirlo del Excel. Respuesta textual: *"le aparece al usuario (por dni) los dos productos aunque haya puesto distinto email — y le van a aparecer en su webapp con la que creo la cuenta (con el mail que haya usado)"*. Esto confirma que la asociación automática por DNI (independiente del email usado en la segunda compra) SÍ es el comportamiento esperado real — coincide con lo que decía el Excel, no es una descripción desactualizada. Con esto, **BUG-013 queda confirmado como Defect real**, no una duda de expectativa.
- **Bug relacionado en este mismo repo**: `docs/bugs/BUG-004-tipo-documento-no-dni-no-vincula-compra.md` — describe el mecanismo REAL de vinculación (vía `/validation/policy`, solo disponible una vez, en el flujo de alta inicial de una cuenta nueva) y confirma que incluso ESE mecanismo (con DNI) funciona correctamente para el caso de una cuenta nueva. Este hallazgo (BUG-013) es distinto: es sobre una cuenta YA activa comprando un SEGUNDO plan con el mismo DNI — un escenario para el que no existe ningún mecanismo de vinculación, ni automático ni manual.
- **Posible relación histórica (no confirmada)**: `documentation/Pruebas OSDE.xlsx` (hoja "Adquirentes", ítem 23, ronda ~30/06) anota, sobre una cuenta distinta: *"Como se utilizó el DNI de la tarjeta de MercadoPago, arroja error de usuario duplicado"*. El síntoma ahí es un **error explícito de duplicado** (posible bloqueo de la compra), mientras que BUG-013 es una **falla silenciosa** (la compra se aprueba, pero el plan simplemente no se asocia, sin ningún error visible) — son comportamientos distintos, no se puede asumir la misma causa raíz sin reproducirlo en vivo. Se deja la referencia porque ambos casos giran en torno al mismo disparador (DNI que ya tiene una tarjeta/cuenta asociada en MercadoPago usado en una compra nueva). Ver detalle completo en `docs/conocimiento-sistema.md`, sección "Hallazgos históricos — Bitácora y regresión manual OSDE (ronda del 30/06/2026)".
- Evidencia técnica: `tests/projects/vetify-b2c/purchase-flow.spec.ts`, suite `TS-03 Asociación de Compra con Usuario` (líneas 274-389), función helper `getLivePlanCount()` (líneas 17-30) y `purchasePlanFor()` (líneas 32-60 aprox.).
- **Decisión original del usuario (2026-08-14): NO filear en Jira, pendiente de esta confirmación.** Con la confirmación de arriba, queda pendiente decidir si ahora sí se reporta como Defect.

| CP | Condición | Esperado (Excel TS-03) | Recibido |
| --- | --- | --- | --- |
| TC-01 | Comprar con DNI de usuario existente + email nuevo | Plan asociado a la cuenta del DNI (conteo +1) | Conteo sin cambios, ni a los 30s ni a los ~10min |
| TC-02 (control) | Comprar con DNI nuevo + email de usuario existente | Plan NO asociado al usuario del email (conteo sin cambios) | Pasó — conteo sin cambios (evidencia negativa/débil, consistente con "no hay asociación automática de ningún tipo") |
| TC-03 | Comprar con DNI de un usuario + email de OTRO usuario | Plan asociado al dueño del DNI, no al del email | Conteo del dueño del DNI sin cambios (mismo resultado que TC-01); conteo del dueño del email correctamente sin cambios |
