[Título]: DEFECT | La compra no vincula la identidad si el tipo de documento no es DNI — Quantum registra siempre '96' (DNI) sin importar el tipo elegido

[Jira]: **IMAS-4118** (tipo Error, sin parent/link ni asignado, estado Backlog) — creado 2026-08-04. https://ikeasistencia-arg.atlassian.net/browse/IMAS-4118

[Severidad]: Alto — cualquier cliente real que compre identificándose con Cédula, L.C. o L.E. (no DNI) nunca logra vincular su cuenta ("Aún no tenés cobertura con vetify"), aunque la compra se haya concretado y cobrado correctamente.

[Categoría]: Bug de producto (backend) — posible regresión de IMAS-2396/IMAS-2776.

[HU relacionada]: Ninguna HU puntual — bug transversal del flujo de compra (checkout institucional) + alta de usuario (`/validation/policy`, webapp).

[Información del entorno]:
- Ambiente: QA (`https://vetify-qa.ikeapp.com` + checkout institucional)
- Confirmado por 2 vías independientes: (1) generación de usuarios de prueba vía `UserFactory`/API directa contra el checkout, (2) compra real por la UI real de checkout — confirmado por el usuario del proyecto.
- Fecha de validación: 2026-08-04

[Descripción]:
Al comprar un plan seleccionando un tipo de documento distinto de DNI (Cédula, L.C., L.E.), la compra se concreta y cobra correctamente, pero la cuenta nunca queda vinculada a la identidad al intentar validar la cobertura en `/validation/policy` — el sistema responde **"Aún no tenés cobertura con vetify"** de forma persistente, sin importar cuánto tiempo se espere.

Mecanismo confirmado: el backend de Quantum registra la identificación del comprador con el código `'96'` (DNI) en el momento del pago, **independientemente** del tipo de documento seleccionado en el formulario de compra. La validación posterior en `/validation/policy` sí respeta el tipo que el usuario elige ahí — si ese tipo no es DNI, no coincide con lo que quedó registrado en la compra, y la vinculación falla.

**Confirmación empírica (2026-08-04)**: se generaron 3 cuentas de prueba comprando con Cédula, L.C. y L.E. respectivamente (mismo flujo de compra, solo variando el tipo de documento). Las 3 fallaron al validar con su propio tipo de documento — incluso esperando tiempo suficiente para descartar demora de propagación (se descartó timing como causa: se confirmó por separado que la demora de propagación es un fenómeno real pero distinto, ver nota abajo). Las 3 **validaron exitosamente** al repetir el mismo formulario seleccionando **"DNI"** en vez del tipo real usado en la compra (mismo número de documento, sin cambiar nada más) — confirma que la compra quedó asociada a DNI internamente, sin importar el tipo real seleccionado.

**Posible regresión**: existen 2 tickets ya cerrados sobre el mismo tema — [IMAS-2396](https://ikeasistencia-arg.atlassian.net/browse/IMAS-2396) ("Los tipos de documentos permitidos en la registración no coincide con los del formulario de adquisición") e [IMAS-2776](https://ikeasistencia-arg.atlassian.net/browse/IMAS-2776) ("Error al momento de mostrar el tipo de documento en la validación de la compra"), ambos resueltos el 2026-06-30. Es posible que el fix original solo haya unificado las **opciones mostradas** en los dropdowns de ambos formularios (que hoy sí coinciden: Cédula/DNI/L.C./L.E./Otro en ambos), sin corregir que el backend de Quantum siga grabando el código fijo `'96'` al procesar el pago sin importar la selección real.

[Pasos para reproducir]:
1. Iniciar una compra de un plan Vetify por el checkout institucional.
2. En el formulario, seleccionar un tipo de documento distinto de DNI (ej. Cédula).
3. Completar la compra con datos válidos y pago aprobado.
4. Registrarse en la webapp con el email usado en la compra.
5. En `/validation/policy`, completar el mismo tipo de documento (Cédula) y número usados en la compra.

[Resultado esperado]:
El sistema debería reconocer la cobertura y mostrar "Ya tenés cobertura con vetify", igual que ocurre siempre con DNI.

[Resultado actual]:
El sistema muestra "Aún no tenés cobertura con vetify" de forma persistente. Repitiendo el mismo formulario con "DNI" en vez del tipo real (mismo número), la validación sí es exitosa — confirma que la compra quedó registrada como DNI internamente.

[Notas adicionales]:
- Reportado como Error suelto en Jira, sin HU/parent asociado ni asignado, por decisión explícita del usuario del proyecto — para que caiga directo en el backlog y el equipo de producto/backend lo triage.
- No se linkeó formalmente a IMAS-2396/IMAS-2776 (mencionados en la descripción como contexto de posible regresión) — `createDefect()` en este proyecto solo soporta un link tipo "Blocks" hacia un `parentKey`, que acá se dejó sin usar a pedido del usuario.
- Efecto colateral en QA: `UserFactory.generateVetifyTestUser()` (`src/providers/user/user-factory.ts`) hardcodea `payerIdentification.type: '96'` en el paso de compra — el harness reproduce fielmente este comportamiento del backend real (no es un bug del harness en sí). Si en el futuro se necesitan usuarios de prueba funcionales con Cédula/L.C./L.E., ese hardcodeo del harness no es la causa raíz — hace falta que este bug de producto se resuelva primero.
- Nota de timing (relacionada pero distinta, no confundir): existe una demora normal de propagación entre la compra y su disponibilidad en `/validation/policy` — validar inmediatamente después de comprar puede fallar aunque el tipo de documento sea DNI y todo esté bien. Ese comportamiento es esperado y no es parte de este bug (ver `docs/impedimentos-bloqueos.md`, IMP-004).
