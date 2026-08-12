# BUG-007 — Reintegros no carga (400 VAL-002) por DNI con formato inválido cargado en la cuenta

**Jira**: IMAS-4279
**Título**: BUG | Reintegros bloqueado (400 VAL-002) por documento con formato inválido en la cuenta
**Severidad**: Alto — bloquea el uso completo del módulo Reintegros para la cuenta afectada (ni siquiera puede listar cuentas de acreditación o expedientes existentes), y si el origen es una falla de validación en el alta de usuario, puede estar afectando a cualquier cuenta real con un documento mal cargado.
**Categoría**: Backend / Validación
**HU relacionada**: N/A directa — afecta el módulo Reintegros de forma transversal (relacionado a IMAS-3923, retesteado en paralelo en esta sesión); el origen probable está en el flujo de registro/alta de usuario, no en Reintegros en sí.

## Información del entorno

- Ambiente: QA — `https://vetify-qa.ikeapp.com/`
- Cuenta de prueba: rol titular/adquirente, DNI cargado en Mi Perfil: `1.143.398.731`
- Fecha: 2026-08-11

## Descripción

El módulo Reintegros de la Vetify WebApp envía el documento del titular logueado a `reintegros-backend` en cada llamada (listar cuentas de acreditación, listar expedientes, crear solicitud). Ese backend valida que el documento tenga 7 u 8 dígitos (DNI argentino). La cuenta de prueba usada tiene cargado un documento de **10 dígitos** (`1143398731`) — no es un DNI válido (7-8 dígitos) ni tiene formato de CUIT (11 dígitos, `XX-XXXXXXXX-X`); coincide en cambio con el formato de un número de celular de Buenos Aires (`11 4339-8731`).

Como consecuencia, **todas** las llamadas del módulo fallan con 400, incluidas las de solo lectura al abrir la pantalla — no solo al crear una solicitud nueva. La UI absorbe el error silenciosamente y muestra un estado vacío ("Aún no tenés cuentas registradas" / "Aún no tenés reintegros solicitados") en vez de indicar que la carga falló, lo cual es engañoso para el usuario.

## Pasos para reproducir

1. Iniciar sesión en `https://vetify-qa.ikeapp.com/` con una cuenta cuyo documento registrado no tenga 7-8 dígitos.
2. Ir a Menú > Reintegros.
3. Observar la pantalla "Mis reintegros".

## Resultado esperado

La pantalla de Reintegros debería cargar con normalidad para cualquier cuenta con datos válidos. Si el documento de la cuenta no es válido, el sistema debería mostrar un mensaje de error claro (o nunca haber permitido que ese documento se guardara), no un estado vacío indistinguible de "el usuario simplemente no tiene datos todavía".

## Resultado actual

`GET /api/bff/reintegros/cuentas-acreditacion` y `GET /api/bff/reintegros/expedientes` devuelven:

```json
{"type":"about:blank","title":"Bad Request","status":400,"code":"VAL-002","message":"Holder document must be a 7 or 8 digit DNI.","instance":"/api/reintegros/v1/cuentas-acreditacion"}
```

La UI muestra "Aún no tenés cuentas registradas" y "Aún no tenés reintegros solicitados" sin ningún indicio de error.

## Notas adicionales

- **No se pudo aislar la causa raíz exacta.** El flujo de creación de usuarios está caído en QA al momento de este reporte, lo que impide generar una cuenta nueva con un documento fuera de formato para confirmar si: (a) el alta/registro de usuario no valida el formato del documento y permite guardar cualquier valor, o (b) el dato quedó mal cargado por otra vía (carga manual, importación, edición administrativa). **Cualquiera de las dos causas es un bug real** — se deja documentado explícitamente para que el equipo de dev determine el origen exacto; no se afirma cuál de las dos es, solo que el estado actual de los datos es inválido y el sistema debería haberlo prevenido en algún punto.
- Impacto secundario, aparte del bloqueo principal: la UI no distingue "sin datos" de "error de carga" — debería mostrar un mensaje de error explícito en vez de un estado vacío.
