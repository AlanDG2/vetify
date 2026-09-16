# BUG-032 — Alta de cuenta OSDE Capitado nueva no se puede completar

**Jira: IMAS-4583 — creado, estado "Hecho".** Corrección 2026-09-15: este archivo nunca se actualizó con la referencia al ticket real tras filearlo (mismo patrón ya conocido de docs de bugs desactualizados, ver `feedback_bug_md_files_stale_after_jira_resolves`). Dado que dice "Hecho", reverificar en vivo antes de asumir que sigue arreglado — no hay retest reciente registrado acá.

**Título sugerido**: BUG | Alta de cuenta OSDE Capitado nueva falla al validar los datos personales
**Severidad**: Alto — un cliente nuevo de OSDE Capitado no puede terminar de crear su cuenta, queda trabado sin poder usar la app.
**Categoría**: Flujo
**HU relacionada**: IMAS-4092 (Fase B del épico IMAS-4101, hoy Bloqueada por IMAS-4578) — hallazgo paralelo de la misma investigación, no es un CA propio de esa HU.

## Información del entorno

- Ambiente: QA — `vetify-qa.ikeapp.com`
- Fecha: 2026-09-03/04
- Cuenta de prueba: creada especialmente para esta investigación, sin datos reales de cliente.

## Descripción

Cuando una persona nueva se registra para el plan OSDE Capitado y llega al paso donde tiene que confirmar sus datos personales (nombre y documento) para terminar de activar la cuenta, el sistema no puede completar ese paso: muestra que hubo un problema y la persona se queda sin poder avanzar. Se esperó un buen rato por si era una demora del sistema en procesar el alta, y al reintentar volvió a fallar exactamente igual.

## Pasos para reproducir

1. Registrarse como cliente nuevo de OSDE Capitado (con un cupón de alta válido).
2. Iniciar sesión con el usuario recién creado.
3. El sistema pide confirmar nombre y documento para terminar el alta.
4. Completar esos datos y confirmar.
5. El sistema no logra completar el paso.

## Resultado esperado

La cuenta queda activada y la persona puede ver su plan y usar la app con normalidad.

## Resultado actual

Aparece un error y la cuenta queda sin poder avanzar — el sistema internamente responde que no encuentra el plan asociado a la cuenta.

## Notas adicionales

- Probado dos veces con la misma cuenta, con ~20 minutos de diferencia entre intentos — mismo resultado ambas veces (no es una demora que se resuelva sola en ese lapso).
- Confirmado también manualmente en el navegador por Alan (no es un problema del script de prueba automatizado).
- Posible relación con `IMAS-4578` (identidad de mascota vacía para cuentas OSDE Capitado migradas) — mismo segmento (OSDE Capitado), podrían compartir causa raíz en cómo se asocia el plan/producto a la cuenta. A confirmar con dev. Esta cuenta es de alta NUEVA vía cupón (no migrada), a diferencia de las cuentas de IMAS-4578 que sí son migradas de producción — si comparten causa, sería una señal de que el problema es más amplio de lo que IMAS-4578 documenta hoy.

## [Detalle técnico] (para el equipo de desarrollo)

- Endpoint: `PUT /api/users/update_for_signup`
- Respuesta: `502`, body `{"message":"PLANS_UNAVAILABLE"}`
- Reproducido 2 veces independientes (script Playwright headless + navegador real), mismo resultado, ~20 min de diferencia.
- Cuenta de prueba: `user_1788489677971_7593bc58@automation.com`, DNI `1640770265`, creada vía `POST /api/registro` con token de cupón `TESTOSDE008842` (ese paso de registro sí devolvió éxito).
- `accountId` devuelto en el payload de `update_for_signup`: `2512e027-f79c-45fb-a922-8126d623b88b`.
- Request body: `{"name":"capitado","lastName":"osde","idType":"7f56cf64-17fd-45cc-842f-7c7057a242d4","idTypeName":"DNI","identification":"1640770265","accountId":"2512e027-f79c-45fb-a922-8126d623b88b"}`
