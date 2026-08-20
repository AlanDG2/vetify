# BUG-008 — Webapp Prestadores: "Cerrar sesión" no termina la sesión de Auth0

**Jira**: IMAS-4294
**Título**: BUG | Webapp Prestadores — "Cerrar sesión" no termina la sesión de Auth0, se puede re-entrar sin contraseña
**Severidad**: Alto — riesgo de seguridad. En un dispositivo compartido (ej. recepción de una veterinaria), cualquiera puede seguir operando la cuenta del prestador después de que este "cerró sesión", sin necesitar la contraseña.
**Categoría**: Bug de producto (frontend/auth) — Autenticación/Sesión
**HU relacionada**: N/A — encontrado explorando el flujo de IMAS-3728, no está vinculado a esa HU.

## Información del entorno

- Ambiente: QA — `https://qa.prestadores.ike.ar/`
- Cuenta usada: `acastellano@ikeasistencia.com.ar`
- Fecha: 2026-08-12

## Descripción

Al presionar "Cerrar sesión" en el menú de usuario y confirmar, la app muestra el aviso *"Para acceder a tu cuenta de usuario, tendrás que ingresar nuevamente las credenciales"* y redirige a `/signIn`. Sin embargo, al presionar "Iniciar sesión" inmediatamente después, la app vuelve a autenticar automáticamente **sin pedir usuario ni contraseña**, porque la sesión de Auth0 (SSO) nunca se cerró.

Se confirmó por inspección de red: al confirmar "Cerrar sesión", **no se dispara ninguna llamada de logout a Auth0** (no hay request a `/v2/logout` ni equivalente) — el botón solo limpia el estado local de la app (sesión/token guardado en el cliente), dejando la sesión real de Auth0 intacta.

## Pasos para reproducir

1. Iniciar sesión en `https://qa.prestadores.ike.ar/` con credenciales válidas.
2. Click en el menú de usuario (ícono superior derecho) → "Cerrar sesión" → "Confirmar".
3. En la pantalla que aparece, click en "Iniciar sesión" nuevamente.

## Resultado esperado

Debería pedir usuario y contraseña otra vez — la sesión debería estar terminada de verdad, tanto a nivel app como a nivel Auth0.

## Resultado actual

Vuelve directo al dashboard, sin pedir credenciales — confirmando que la sesión de Auth0 sigue activa pese al "Cerrar sesión".

## Notas adicionales

- Reproducido 2 veces de forma limpia (login con credenciales reales → cerrar sesión → reingresar sin credenciales, ambas veces mismo resultado).
- Confirmado por red: el flujo de logout de la app no incluye ninguna llamada al endpoint de logout de Auth0 (`qa-quantum-ikearg.us.auth0.com`).
- Encontrado incidentalmente durante el retest de IMAS-3728, no forma parte de ese ticket.
