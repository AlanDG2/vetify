[Título]: BUG | Reintegros no puede iniciarse — GET /reintegros/mascotas devuelve array vacío para múltiples cuentas

[Severidad]: Alto — bloquea el flujo principal de reintegros para todos los segmentos afectados. Un cliente real con este perfil no puede iniciar un reintegro desde la app. El flujo completo (Alta → Calidad → Cierre) depende de que el sistema pueda resolver la mascota asociada a la cuenta.

[Categoría]: Flujo / Datos

[HU relacionada]: IMAS-4101 (Migración Reintegros a Nexus) — afecta las subtareas IMAS-4092 (Historial), IMAS-4103 (Alta), y la fase de Alta de IMAS-4104 (Cierre). Referenciado como IMP-016 en el tracking de bloqueos QA.

[Información del entorno]:
- Ambiente: QA (https://vetify-qa.ikeapp.com)
- Fecha de detección: 2026-09-01
- Cuentas confirmadas afectadas:
  - `alan.gonzalez@ingenia.la` / `Hola123#` / DNI 16525485 (VETIFY_ADQUIRENTE) — verificada afectada 2026-09-01
  - Popi (OSDE Capitado, DNI 12540524)
  - Al menos 3 cuentas más de Vetify B2C y OSDE Adquirente
- Historial: el síntoma empeoró del 28/08 (registro con campos null) al 01/09 (array vacío directo)

[Descripción]: Cuando un cliente que debería poder pedir un reintegro intenta iniciar uno nuevo, el sistema le dice que no tiene mascotas registradas — aunque sí tiene un plan, sí tiene una mascota, y de hecho ya tiene reintegros procesados anteriormente. El endpoint que debería devolver la lista de mascotas asociadas a su cuenta devuelve un array vacío, y sin mascota no se puede abrir un expediente de reintegro nuevo. Esto afecta a cuentas reales que ya tienen historial de reintegros (confirmado en al menos una cuenta Capitado que el 26/08/2026 completó un reintegro de $6,00 de punta a punta).

[Pasos para reproducir]:
1. Conectar VPN.
2. Ir a https://vetify-qa.ikeapp.com.
3. Login con cuenta afectada — ejemplo: email `alan.gonzalez@ingenia.la`, contraseña `Hola123#`.
4. Ir a la sección Reintegros desde el menú.
5. Hacer clic en "Nuevo reintegro".
6. El sistema muestra: "No hay mascotas registradas para tu documento."
7. En red, `GET /api/bff/reintegros/mascotas` responde `200` con `[]` (antes del 01/09 devolvía un registro con campos null para la misma cuenta).

[Resultado esperado]: El endpoint devuelve la/s mascota/s asociada/s a la cuenta del cliente, con sus datos completos (nombre, especie, raza, foto), y el cliente puede seleccionar su mascota e iniciar el reintegro.

[Resultado actual]: `GET /api/bff/reintegros/mascotas` devuelve `[]` (array vacío). El cliente no puede avanzar. Los productos/planes del cliente sí se resuelven correctamente (`GET /api/services/pets/my-products` devuelve el plan con cuenta correcta), pero específicamente el campo `mascota` dentro del producto viene `null`.

[Notas adicionales]: El producto/plan se resuelve bien, el problema es específicamente la identidad de la mascota. Al menos una cuenta afectada (Popi) tiene historial real de reintegros procesados el 26/08/2026 (expediente 3268-1, $6,00, pago confirmado), lo que confirma que la mascota existió y funcionó. El mismo endpoint `GET /api/services/pets/my-products` para Popi devuelve el producto "Vetify Esencial OSDE" (cuenta 2349) pero con `mascota: null`. El equipo de desarrollo (Paula Scalzo) confirmó el 26/08 que "reintegros funciona OK en Nexus para todos los usuarios", pero al retestear el 28/08 y 01/09 con la misma cuenta Popi, el alta nueva no funciona.

[Mensaje al dev] (2026-09-01 — comentario enviado por QA a IMAS-4531)

Hola, armé este resumen con lo que fuimos validando esta semana:

**1. El endpoint no está caído.** Responde 200 con cuerpo JSON en 5 de 6 cuentas testeadas. No es un error de conectividad ni de red.

**2. El patrón es MIXTO, no discrimina por edad de cuenta.** Probamos con cuentas nuevas (creadas por Liliana) y cuentas viejas del pool histórico — todas muestran el mismo comportamiento errático: a veces array vacío, a veces registro con campos null, a veces con datos reales. No hay correlación con antiguedad de la cuenta.

**3. El producto se resuelve, la mascota no.** La misma sesión donde `/api/bff/reintegros/mascotas` devuelve `[]`, el endpoint `/api/services/pets/my-products` trae los planes con datos completos. El problema está específicamente en el JOIN o la query que resuelve mascotas dentro del contexto de reintegros, no en el upstream de productos.

**4. Hay un control que funciona.** Una cuenta del pool devuelve un registro con `nombre` populated. Esto confirma que el flujo puede funcionar cuando la asociación mascota-cuenta está correctamente resuelta en la tabla de unión.

**Hipótesis:** Parece un problema en la tabla de unión o la query de JOIN que resuelve mascotas para reintegros — la asociación no se está resolviendo correctamente para la mayoría de las cuentas, independiente de su antiguedad.

---

[Detalle técnico] (para el equipo de desarrollo)
- Endpoint afectado: `GET /api/bff/reintegros/mascotas`
- Endpoint hermano que SÍ funciona: `GET /api/services/pets/my-products` (devuelve el plan pero con `mascota: null`)
- Método: `GET`
- Status code: `200` (correcto)
- Response body afectado (01/09): `[]`
- Response body anterior (28/08): `[{"id":"f8693dfa-...","mascotaId":null,"nombre":null,"especieDescripcion":null,"fotoUrl":null,"idProductoEngage":"7404f953-...","fechaNacimiento":null,"raza":null}]`
- Cuenta de referencia: Popi, DNI 12540524, cuenta 2349, "Vetify Esencial OSDE", Grupo 0163
- Contexto de la migración: este bug apareció tras la migración SISE → Nexus. Las cuentas tienen planes en Nexus pero la asociación mascota/cuenta parece no haberse propagado correctamente.
- Posible causa raíz: la tabla/mapeo que vincula `mascotaId` con la identidad de la mascota en el contexto de reintegros no se sincronizó durante la migración, o la query que resuelve mascotas para reintegros está consultando una fuente de datos incorrecta.
- Referencia IMP-016 en docs/impedimentos-bloqueos.md para tracking QA.
