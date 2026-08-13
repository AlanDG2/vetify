# BUG-011 — RETRACTADO: "Ir a la web" (suscribir mascota sin planes libres) sí navega — era un falso positivo del emulador

**Estado**: ❌ Retractado 2026-08-13. No es un bug de producto. Nunca fue filed en Jira.

## Qué se creía originalmente

Se documentó como bug real que, en mobile, tocar "Ir a la web" (modal de "Suscribir mascota" sin planes libres) cerraba el modal sin navegar a ningún lado — probado contra el emulador (AVD `Pixel_6_QA`), con click JS y tap nativo, `browser.getUrl()`/`getContexts()`/`getCurrentPackage()` sin cambios tras el click.

## Qué pasó en realidad

Validado en vivo contra un **dispositivo físico real** (Motorola Edge 60, conectado por USB) con el usuario del proyecto: **"Ir a la web" SÍ navega** — carga la landing de compra de planes correctamente. La diferencia con lo esperado es solo el mecanismo: no abre un navegador externo (como sí hace "Vetify PLUS", vía intent `ACTION_VIEW`), sino que navega **dentro del mismo WebView de la app** (misma `Activity` — confirmado con `adb shell dumpsys activity activities`: `topResumedActivity` nunca cambia de `vetify.cliente.dev/com.example.vetify.MainActivity` antes y después del click). Es decir, el botón funciona — la automatización original medía la señal equivocada (esperaba un contexto/paquete nuevo, que nunca iba a aparecer porque el mecanismo real es una navegación in-place, no una ventana nueva).

En el emulador, esa misma navegación in-place no ocurre (ni siquiera se ve el contenido institucional cargar) — es un **falso negativo específico del emulador**, no reproducible en hardware real. Mismo patrón exacto que el falso positivo de "Vetify PLUS"/Chrome-sin-first-run del 2026-08-12 (`qa-workspace/decision-log.md`) y que BUG-009 (el banner de cookies solo reproduce en hardware real, no en el emulador) — el emulador y el dispositivo físico no son intercambiables para validar comportamiento de WebView en esta app.

## Por qué no se cierra como "confirmado en hardware, sigue roto en emulador"

Porque el objetivo original era evaluar si el CASO DE NEGOCIO (Credenciales TS-01 TC-03 de Desktop) está roto en mobile — y no lo está. El emulador simplemente no es un entorno válido para automatizar/verificar este caso puntual. Se reclasifica en el comparativo Desktop/Mobile como limitación de plataforma (no se puede automatizar de forma confiable contra el emulador, y automatizar contra hardware real está bloqueado por IMP-009), no como gap ni como bug.

## Lección para la próxima vez

Antes de confirmar un hallazgo de este tipo como bug real basado solo en el emulador, agregar un control case reproducido en **hardware físico** cuando la señal que se está midiendo es "¿pasó algo visible de UI/navegación?" — un control case en el mismo emulador (como se hizo acá con `vetify-plus.spec.ts`) descarta problemas de configuración del AVD (Chrome sin first-run, etc.) pero NO descarta que el propio mecanismo de WebView bajo prueba se comporte distinto en el emulador vs. hardware real. Ver `qa-workspace/decision-log.md` (entrada 2026-08-13, "BUG-011 retractado") para el detalle completo de la validación cruzada con el usuario.
