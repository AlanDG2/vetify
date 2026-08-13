# BUG-012 — App Android: los íconos de la barra de estado (wifi, batería, notificaciones) quedan invisibles sobre la landing institucional ("Ir a la web")

**Título**: BUG | App Android — barra de estado ilegible al cargar la landing institucional desde "Ir a la web"
**Jira**: No creado — pendiente de OK explícito del usuario del proyecto (guardrail `jira/update-rules.md`).
**Severidad**: Bajo — no bloquea ningún flujo (la landing se ve y se usa bien), pero es una regresión de accesibilidad/legibilidad real: el usuario pierde visibilidad de señal, batería y notificaciones mientras está en esta pantalla.
**Categoría**: Accesibilidad / Layout
**HU relacionada**: N/A — encontrado por el usuario del proyecto validando manualmente BUG-011 (retractado) en su dispositivo físico.

## Información del entorno

- App Android nativa (WebView wrapper), build QA — paquete `vetify.cliente.dev`, apunta a `https://vetify-qa.ikeapp.com/`.
- **Dispositivo físico real**: Motorola Edge 60 (mismo dispositivo usado en BUG-009), conectado por USB.
- Fecha: 2026-08-13.
- Reportado por el usuario del proyecto en su propio dispositivo, con captura de pantalla adjunta (ver abajo).

## Descripción

En el resto de la app, la barra de estado del sistema (wifi, señal, batería, notificaciones) siempre queda visible y legible por encima del contenido — los íconos se adaptan al color de fondo de cada pantalla (blancos sobre fondo oscuro, oscuros/grises sobre fondo claro), comportamiento estándar de Android que ninguna otra pantalla de la app rompe.

Al tocar "Suscribir mascota" → "Ir a la web" (modal de suscripción sin planes libres — ver `credentials.spec.ts` TS-01 TC-03 en el comparativo Desktop/mobile), la landing institucional de Vetify carga dentro del mismo WebView y **su header (fondo blanco) se dibuja por debajo de la barra de estado en vez de respetarla** — los íconos del sistema quedan sobre esa franja blanca sin recalcular su color (siguen en el estilo claro que traían de la pantalla anterior), volviéndose prácticamente invisibles por falta de contraste. Ver la captura: en la esquina superior derecha apenas se distinguen restos de la hora/batería/señal, casi confundidos con el fondo blanco.

## Pasos para reproducir

1. Iniciar sesión en un dispositivo físico real (no reproducido/verificado en emulador) con un usuario que tenga todos sus planes con mascota ya asociada.
2. Navegar a la pantalla de mascotas y tocar "Suscribir mascota".
3. En el modal, tocar "Ir a la web".
4. Observar la barra de estado del sistema en la parte superior de la pantalla.

## Resultado esperado

Los íconos de la barra de estado (wifi/señal, batería, notificaciones) permanecen visibles y con buen contraste sobre el fondo de la landing, igual que en cualquier otra pantalla de la app.

## Resultado actual

Los íconos quedan tapados/ilegibles — el fondo blanco de la landing institucional se extiende por debajo de la barra de estado sin que el sistema recalcule el color de los íconos para mantener contraste. Ver captura adjunta.

## Notas adicionales

- **No verificado en emulador**: encontrado y confirmado exclusivamente en hardware físico real, en la misma sesión de validación manual de BUG-011 (retractado — ese SÍ era un falso negativo del emulador; este es un hallazgo nuevo e independiente, confirmado en el dispositivo real que el usuario tenía a mano). No se intentó reproducir contra el emulador todavía.
- **Alcance no confirmado más allá de esta pantalla puntual**: el usuario del proyecto no revisó si el mismo problema aparece en otro lugar de la app que cargue contenido con fondo claro similar — no asumir que es exclusivo de esta landing sin volver a probar.
- **Pista técnica para dev (no confirmada, a validar)**: revisar si la Activity/WebView no está aplicando `WindowInsetsController.setSystemBarsAppearance()` (o el equivalente vía `enforceNavigationBarContrast`/`android:windowLightStatusBar`) al cargar contenido con fondo claro dentro del mismo WebView — probablemente el color de los íconos de la barra de estado se fija una sola vez al lanzar la Activity y no se re-evalúa por navegación interna del WebView.
- Encontrado incidentalmente por el usuario del proyecto mientras validaba manualmente BUG-011 en su propio dispositivo — mismo patrón de "hallazgo lateral en hardware real" que BUG-009.
