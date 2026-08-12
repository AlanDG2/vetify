# BUG-009 — App Android: el banner de cookies queda tapado por la barra de navegación inferior, imposible aceptar/rechazar

**Título**: BUG | App Android — banner de cookies tapado por el bottom nav, sin forma de aceptar/rechazar
**Jira**: **IMAS-4300** (tipo Error, sin parent/link, estado Backlog) — creado 2026-08-12. https://ikeasistencia-arg.atlassian.net/browse/IMAS-4300
**Severidad**: Alto — bloqueo total de una interacción de consentimiento (cookies/publicidad); el usuario no tiene ninguna forma de aceptar, rechazar ni cerrar el banner, y probablemente reaparece en cada sesión nueva.
**Categoría**: Flujo / Layout
**HU relacionada**: N/A — encontrado incidentalmente explorando cobertura mobile del menú lateral, no ligado a una HU puntual.

## Información del entorno

- App Android nativa (WebView wrapper), build QA — paquete `vetify.cliente.dev`, apunta a `https://vetify-qa.ikeapp.com/`.
- **Dispositivo real**: Motorola Edge 60, Android 16, resolución física 1220x2712, densidad 450 (override 382).
- **No reproducible en el emulador** usado para automatización (AVD `Pixel_6_QA`, viewport del WebView 320x616) — el mismo botón queda totalmente visible y tocable ahí. Sugiere que el bug depende de la altura efectiva de pantalla / inset de la barra de navegación del dispositivo real, no de todos los tamaños.
- Fecha: 2026-08-12.
- Reportado por el usuario del proyecto en su dispositivo personal, confirmado con captura de pantalla (adjunta abajo) y reconfirmado tras limpiar los datos de la app (mismo resultado).

## Descripción

Al abrir la app por primera vez (o tras limpiar sus datos), se muestra el banner "Cookies y opciones de publicidad" con el texto explicativo y 2 botones ("Aceptar todas" / "Solo esenciales"). En el dispositivo real, el banner se corta a la altura del texto — los 2 botones quedan por debajo del borde inferior visible de la pantalla, tapados por la barra de navegación fija de la app (Inicio / Veterinarias / Servicios / Mascotas / Más). No existe ninguna otra forma de cerrar el banner (no se desliza, no tiene botón de cerrar aparte) — queda un bloqueo real, no solo estético.

## Pasos para reproducir

1. Instalar el build QA de la app Android (o, si ya está instalada, limpiar sus datos: Ajustes > Apps > Vetify > Almacenamiento > Borrar datos).
2. Abrir la app e iniciar sesión con cualquier usuario.
3. Observar la pantalla de Inicio apenas termina de cargar.

## Resultado esperado

El banner "Cookies y opciones de publicidad" se muestra completo, con los botones "Aceptar todas" y "Solo esenciales" visibles y tocables dentro del área visible de la pantalla.

## Resultado actual

El banner se corta a nivel del texto explicativo — los 2 botones quedan debajo del límite inferior de la pantalla, tapados por la barra de navegación inferior fija. No hay forma de aceptar, rechazar ni cerrar el banner. Ver captura adjunta (compartida por el usuario del proyecto, celular real).

## Notas adicionales

- **No reproducible en el emulador**: se verificó puntualmente contra el AVD `Pixel_6_QA` (viewport WebView 320×616) — ahí el botón "Aceptar todas" queda con solo ~16px de margen hasta el borde de pantalla, pero SÍ visible y clickeable (confirmado con `document.elementFromPoint()` sobre el centro del botón: devuelve el botón mismo, no el bottom nav; el click nativo funciona y el banner se cierra bien). Esto no descarta el bug — solo confirma que es sensible a la altura de pantalla / inset del dispositivo, y que el emulador usado para automatización no lo reproduce.
- **No se pudo validar por automatización** contra el celular físico del usuario del proyecto — bloqueado por **IMP-009** (`docs/impedimentos-bloqueos.md`): el build QA actual es release/no-debuggable, así que Appium no puede adjuntar un contexto `WEBVIEW_*` de la app en hardware real (`getContexts()` solo devuelve `NATIVE_APP` + `WEBVIEW_chrome`, nunca `WEBVIEW_vetify.cliente.dev`). Pendiente de un build Debug para poder automatizar esto directamente en el dispositivo.
- Pista técnica para dev (no confirmada, a validar): el componente del banner de cookies probablemente usa `position: fixed`/`bottom: 0` sin considerar `env(safe-area-inset-bottom)` ni la altura real de la barra de navegación inferior de la app — revisar su z-index/posicionamiento respecto al bottom nav, y si el layout es responsivo a la altura de viewport disponible o asume un valor fijo.
- Encontrado explorando la pantalla "Vetify PLUS" para sumar cobertura mobile — hallazgo lateral, reportado directamente por el usuario del proyecto en su propio dispositivo mientras validaba otro hallazgo (ver `qa-workspace/decision-log.md`, entrada del 2026-08-12 sobre "Vetify PLUS").
