# BUG-011 — App Android: el botón "Ir a la web" (suscribir mascota sin planes libres) no navega a ningún lado

**Título**: BUG | App Android — "Ir a la web" cierra el modal pero no redirige a la web institucional
**Jira**: No creado — pendiente de OK explícito del usuario del proyecto (guardrail `jira/update-rules.md`).
**Severidad**: Medio — no es un crash ni pérdida de datos, pero bloquea por completo un flujo de negocio real (el único camino para que un usuario mobile adquiera un plan adicional) sin ningún mensaje de error visible.
**Categoría**: Flujo / Navegación
**HU relacionada**: Equivalente mobile de `credentials.spec.ts` TS-01 TC-03 (Desktop, Playwright) — no hay HU Jira propia identificada para este caso puntual.

## Información del entorno

- App Android nativa (WebView wrapper), build QA — paquete `vetify.cliente.dev`, apunta a `https://vetify-qa.ikeapp.com/`.
- Emulador `Pixel_6_QA` (AVD, Android 14, Chrome del sistema con first-run ya completado — confirmado corriendo `vetify-plus.spec.ts` por separado, que sí abre un contexto `WEBVIEW_chrome` externo sin problema).
- Usuario pooled `ACTIVE + WITH_PET + NO_EMPTY_PLAN` (todos los planes contratados ya tienen mascota asociada).
- Fecha: 2026-08-13.

## Descripción

En Desktop, cuando un usuario con todos sus planes ocupados presiona "Suscribir mascota" en `/section/mypets`, aparece un modal ("Agregar mascota" / "Para darle cobertura a una nueva mascota, primero elegí su plan en la web.") con un botón "Ir a la web" que abre `VETIFY_INSTITUTIONAL_BASE_URL` en una pestaña nueva del navegador (`credentials.spec.ts:122-126`).

En mobile, el mismo flujo muestra **el mismo modal, con el mismo texto y los mismos 2 botones** ("Ir a la web" / "Cancelar") — confirmado con un dump de HTML en vivo, DOM idéntico al de Desktop. Pero al tocar "Ir a la web": el modal se cierra (el handler del botón sí se dispara) y **no pasa nada más** — ni navegación dentro del mismo WebView, ni apertura de un navegador externo, ni ningún error visible para el usuario.

## Pasos para reproducir

1. Iniciar sesión con un usuario que tenga todos sus planes con mascota ya asociada (`ACTIVE`, `WITH_PET`, `NO_EMPTY_PLAN`).
2. Navegar a la pantalla de mascotas (`/section/mypets`).
3. Presionar "Suscribir mascota".
4. En el modal que aparece, presionar "Ir a la web".

## Resultado esperado

El sistema redirecciona a la web institucional de Vetify (`https://qa.vetify.com.ar` en QA), igual que en Desktop — ya sea dentro de la misma sesión del WebView o abriendo el navegador externo del sistema (como sí hace "Vetify PLUS" desde el menú lateral).

## Resultado actual

El modal se cierra. La URL de la app (confirmada con `browser.getUrl()`) sigue siendo `https://vetify-qa.ikeapp.com/section/mypets`, sin cambios. No aparece ningún contexto nuevo (`browser.getContexts()` solo devuelve `NATIVE_APP` + `WEBVIEW_vetify.cliente.dev`, nunca `WEBVIEW_chrome`) y el paquete en foreground no cambia (`browser.getCurrentPackage()` sigue siendo `vetify.cliente.dev`). Verificado con click vía JS y con tap nativo — mismo resultado en ambos casos, con hasta 2.5s de espera.

## Notas adicionales

- **Control case usado para descartar bug de tooling**: `vetify-plus.spec.ts` TC-01 ("Vetify PLUS" del menú lateral) SÍ logra abrir un contexto `WEBVIEW_chrome` externo desde el mismo emulador, en la misma sesión de exploración — descarta que el problema sea el first-run de Chrome del AVD o una limitación de Appium/WebdriverIO para detectar navegación externa. La diferencia real parece estar en el mecanismo: "Vetify PLUS" es (según el código ya documentado en `AsistenciaDomicilioPage.ts`/`vetify-plus.spec.ts`) un link real que el WebView intercepta a nivel de navegación (`shouldOverrideUrlLoading`, dispara un intent `ACTION_VIEW` nativo), mientras que "Ir a la web" es un `<button>` (no un `<a>`) — su handler casi seguro llama a `window.open(url, '_blank')` por JS. Los WebView de Android no soportan `window.open()`/ventanas múltiples salvo que la app implemente `WebChromeClient.onCreateWindow()` explícitamente — si no está implementado, la llamada falla en silencio, exactamente el síntoma observado.
- **Pista técnica para dev (no confirmada, a validar)**: revisar si `MainActivity`/el `WebChromeClient` de la app implementa `onCreateWindow()` con `setSupportMultipleWindows(true)`, o si conviene cambiar el botón "Ir a la web" para navegar por `location.href`/disparar el mismo mecanismo de intent que ya usa "Vetify PLUS" en vez de `window.open()`.
- Encontrado evaluando la portabilidad de `credentials.spec.ts` TS-01 TC-03 (Desktop) a mobile, como parte del punch-list de paridad Desktop/Mobile — no es la técnica de "intent externo" que se esperaba reutilizar (esa técnica sigue sirviendo para detectar el resultado, lo que cambió es que acá no hay ningún resultado que detectar).
