[Título]: DEFECT | Comprar con el DNI de un usuario existente no asocia el plan a su cuenta — sin mecanismo automático ni manual de reclamo

[Severidad]: Medio — no bloquea la compra en sí (se cobra y confirma correctamente), pero el cliente que ya tiene cuenta y compra un plan adicional identificándose con su mismo DNI nunca ve ese plan en su cuenta, sin ninguna vía (automática o manual) para reclamarlo.

[Categoría]: Divergencia HU vs UI (Flujo de Compra, TS-03 Asociación de Compra con Usuario)

[HU relacionada]: N/A — el caso viene de `documentation/Casos de Prueba (1).xlsx`, hoja "Flujo de Compra", TS-03 "Asociación de Compra con Usuario", no de un ticket Jira puntual.

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
- **Incertidumbre que dejo explícita, no la escondo**: verifiqué el endpoint que la webapp usa para mostrarle sus propios planes al usuario logueado — es la interpretación más directa y natural de "el usuario ve su plan asociado". No puedo descartar al 100% que exista algún proceso de back-office/CRM (Salesforce) que vincule ambos registros manualmente por fuera de lo que la webapp expone — pero desde la perspectiva de lo que un cliente real experimenta al loguearse, la asociación descrita por el CA no ocurre.
- **Contexto de este mismo proyecto que motiva pedir confirmación de producto antes de escalar esto como Defect**: el Excel de "Flujo de Compra" ya se confirmó desactualizado/aspiracional en 2 áreas distintas esta misma semana (auditoría general del 2026-08-13 — ver `qa-workspace/decision-log.md` — y TS-04 Cupones, 2026-08-14, donde ni siquiera existe el campo de cupón en el checkout institucional). Es decir, hay precedente real de que este Excel describa comportamiento que nunca se implementó, no necesariamente una regresión. Antes de cargarlo como Defect en Jira pediría confirmación explícita de producto sobre si "asociación automática por DNI" es una funcionalidad real esperada hoy o una descripción de casos que quedó desactualizada — la fuente de verdad de esto está pendiente de PM.
- **Bug relacionado en este mismo repo**: `docs/bugs/BUG-004-tipo-documento-no-dni-no-vincula-compra.md` — describe el mecanismo REAL de vinculación (vía `/validation/policy`, solo disponible una vez, en el flujo de alta inicial de una cuenta nueva) y confirma que incluso ESE mecanismo (con DNI) funciona correctamente para el caso de una cuenta nueva. Este hallazgo (BUG-013) es distinto: es sobre una cuenta YA activa comprando un SEGUNDO plan con el mismo DNI — un escenario para el que no existe ningún mecanismo de vinculación, ni automático ni manual.
- Evidencia técnica: `tests/projects/vetify-b2c/purchase-flow.spec.ts`, suite `TS-03 Asociación de Compra con Usuario` (líneas 274-389), función helper `getLivePlanCount()` (líneas 17-30) y `purchasePlanFor()` (líneas 32-60 aprox.).
- **Decisión del usuario (2026-08-14): NO filear en Jira.** Queda solo como este `.md` local — no crear el Defect salvo que se pida explícitamente más adelante.

| CP | Condición | Esperado (Excel TS-03) | Recibido |
| --- | --- | --- | --- |
| TC-01 | Comprar con DNI de usuario existente + email nuevo | Plan asociado a la cuenta del DNI (conteo +1) | Conteo sin cambios, ni a los 30s ni a los ~10min |
| TC-02 (control) | Comprar con DNI nuevo + email de usuario existente | Plan NO asociado al usuario del email (conteo sin cambios) | Pasó — conteo sin cambios (evidencia negativa/débil, consistente con "no hay asociación automática de ningún tipo") |
| TC-03 | Comprar con DNI de un usuario + email de OTRO usuario | Plan asociado al dueño del DNI, no al del email | Conteo del dueño del DNI sin cambios (mismo resultado que TC-01); conteo del dueño del email correctamente sin cambios |
