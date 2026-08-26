# Mobile (Appium + WebdriverIO)

Automatización de la app nativa WebView (Android/iOS) de Vetify. Vive separada de `tests/` (Playwright) porque Playwright no puede adjuntarse a un WebView dentro de una app nativa instalada — acá se usa Appium + WebdriverIO en su lugar.

## El switch multiplataforma

```bash
npm run test:mobile
```

Este comando detecta el sistema operativo desde el que se corre y elige el config correcto solo:

- **Mac (macOS)** → corre contra **iOS** (`wdio.ios.conf.ts`)
- **Windows / Linux** → corre contra **Android** (`wdio.android.conf.ts`)

Es el comando recomendado por defecto — nadie tiene que acordarse de cuál usar. Acepta los mismos argumentos que `wdio run` (se reenvían tal cual), por ejemplo:

```bash
npm run test:mobile -- --mochaOpts.grep "TS-07"
```

Si preferís forzar una plataforma puntual (ej. correr Android desde una Mac), seguís teniendo los comandos directos:

```bash
npm run test:android
npm run test:ios
```

## Set curado "confirmado estable"

```bash
npm run test:mobile:stable
```

Corre SOLO los archivos confirmados estables tras la última revisión (2026-08-24, Android, confirmado 2 veces con GPU real) — pensado como el set de referencia para correr con confianza (ej. primera validación en iOS, smoke rápido antes de un commit). Auto-detecta plataforma igual que `test:mobile`.

**Importante (2026-08-24)**: el pool de cuentas compartido `VETIFY_ADQUIRENTE` tiene degradación de datos más amplia de lo que se pensaba — varias cuentas que el fixture marca `WITH_PET`/`ACTIVE` ya no tienen mascota/plan real en el backend. Esto sacó 4 archivos que antes estaban en este set (ver tabla). No es timing, no es GPU, no es bug de selector — es que la cuenta reservada no tiene los datos que el fixture promete. Pendiente una auditoría completa del pool antes de poder confiar en reincorporarlos. Ver `qa-workspace/decision-log.md` 2026-08-24.

| Archivo | Estado | Nota |
|---|---|---|
| `example/app-launch.spec.ts` | ✅ Confirmado estable | |
| `vetify/ayuda.spec.ts` | ✅ Confirmado estable | |
| `vetify/facturas.spec.ts` | ✅ Confirmado estable | |
| `vetify/login.spec.ts` | ✅ Confirmado estable | |
| `vetify/navigation.spec.ts` | ✅ Confirmado estable | |
| `vetify/profile.spec.ts` | ✅ Confirmado estable (3/3) | |
| `vetify/reintegros.spec.ts` | ✅ Confirmado estable | |
| `vetify/services.spec.ts` | ✅ Confirmado estable (2/2, arreglado 2026-08-24 — selectores por data-cy quedaron rotos por un deploy, reescritos por texto) | |
| `vetify/credential-wizard.spec.ts` | ⚠️ Sacado del set 2026-08-24 | 6/6 fallando — cuenta pooled sin los datos que su tag promete (pool degradado, no bug de test) |
| `vetify/historial-atencion.spec.ts` | ⚠️ Sacado del set 2026-08-24 | Mismo motivo — cuenta pooled degradada |
| `vetify/pets.spec.ts` | ⚠️ Sacado del set 2026-08-24 | `expect(0).toBeGreaterThan(0)` — la cuenta reservada `ACTIVE+WITH_PET` no tiene mascotas reales |
| `vetify/plans.spec.ts` | ⚠️ Sacado del set 2026-08-24 | `expect(0).toBeGreaterThan(0)` — la cuenta reservada no tiene planes reales |
| `vetify/asistencia-domicilio.spec.ts` | ⚠️ No incluido | TC-01 cuelga 120s+ tras abrir el marcador telefónico nativo (`tel:`), no recupera control — estructural, no flake |
| `vetify/credentials.spec.ts` | ⚠️ Parcial | TS-07/TS-08 estables, TS-09 bloqueado — pool de cuentas fresh muerto + posible regresión de IMP-004 (ver `qa-workspace/decision-log.md` 2026-08-24) |
| `vetify/vetify-plus.spec.ts` | ⚠️ No incluido | Necesita que Chrome haya completado su first-run en el dispositivo/emulador — gap de setup, no bug |
| `vetify/videocall.spec.ts` | ⚠️ Parcial | El grupo TS-03 (7/8 TCs) confirmado bloqueado — las 2 únicas cuentas pooled que matchean su filtro (`ACTIVE+WITH_PET+NO_EMPTY_PLAN`) están muertas, retageadas `DEAD`. Necesita reprovisionar una cuenta con mascota real. Ver `qa-workspace/decision-log.md` 2026-08-25 |

Los archivos "No incluido"/"Parcial" siguen corriendo normalmente con `npm run test:mobile` (suite completa) — no están en skip, solo no forman parte del subset garantizado.

Este mismo set es el que corre el job manual `e2e_mobile_android` de `.gitlab-ci.yml` — nunca la suite completa ni `test:ios` (ese es exclusivamente para uso local en Mac). Ese job depende de 2 cosas sin confirmar todavía: que el runner de GitLab tenga KVM habilitado (ver job `check_mobile_runner`) y de un mecanismo para que el runner consiga `mobile/apps/app-android.apk` (hoy gitignored, no viaja en el repo).

Antes de arrancar Appium, el switch valida que el binario de la app exista para tu plataforma. Si falta, corta con un mensaje explicando qué falta y cómo conseguirlo — no te vas a encontrar con un error críptico de Appium a mitad de sesión.

## Los binarios NO viajan en el repo

`mobile/apps/*.apk`, `*.ipa` y `*.app` están en `.gitignore` (son binarios grandes que además cambian de versión seguido). Al clonar el repo, `mobile/apps/` va a estar vacío — hay que conseguir el binario de tu plataforma por separado.

### Android (`app-android.apk`)

Pedirle el build QA a quien lo tenga en el equipo y colocarlo en `mobile/apps/app-android.apk`. Si preferís otro nombre/ruta, `MOBILE_APP_PATH_ANDROID` lo overridea.

### iOS (`app-ios.app`) — lo que necesita tu compañera con Mac

Dos caminos:

1. **Pedir el build QA ya compilado** a quien lo tenga (dev del equipo) — más simple, no requiere Xcode del lado de QA.
2. **Compilarlo ella misma** desde el repo fuente `ike-webapp-mobile` (necesita Xcode instalado):
   ```bash
   xcodebuild -project vetify.xcodeproj -scheme vetify-qa ...
   ```
   Ver `iOS/CLAUDE.md` de ese repo para el comando completo. Bundle ID confirmado del build QA real: `com.vetify.qa.webapp` (el `CLAUDE.md` de ese repo dice `com.vetify-qa.webapp` con guion — está desactualizado, no lo uses como referencia, usá el `.xcconfig`/`project.pbxproj` real).

Cualquiera sea el camino, el resultado (`.app`) va en `mobile/apps/app-ios.app`, o `MOBILE_APP_PATH_IOS` si está en otro lado.

Contexto completo (por qué no hay un `.ipa`/`.app` ya armado en ningún lado, versión de la app, discrepancias de bundle ID, etc.): `docs/impedimentos-bloqueos.md`, sección **IMP-008**.

## Setup por plataforma

### Android (Windows o Linux)

- [adb](https://developer.android.com/tools/adb) (Android Platform-Tools)
- JDK 17 (Appium lo necesita para su propio tooling — `keytool`/`apksigner` — independiente de la versión de Java del proyecto Android)
- Android SDK Build-Tools (`apksigner.jar`, usado por Appium para verificar la firma del apk antes de instalarlo)
- Driver de Appium: `appium driver install uiautomator2`
- Un dispositivo conectado por USB (depuración USB activada y autorizada) o un emulador corriendo (`npm run emulator:start` levanta el AVD `Pixel_6_QA` ya configurado en este repo)

**Celular físico vs. emulador**: con el `.apk` release actual, el WebView solo expone el puente de debug de Chrome en un SO "userdebug" (emuladores `google_apis`) — en un celular físico real (`ro.debuggable=0`) hace falta un build **Debug** del apk, si no `browser.getContexts()` nunca muestra `WEBVIEW_*`. Ver **IMP-009** en `docs/impedimentos-bloqueos.md` para el detalle completo antes de gastar tiempo tratando de automatizar contra un celular físico con el build actual. El emulador funciona sin este bloqueo, pero tiene inestabilidad propia documentada en **IMP-010** (mismo archivo).

### iOS (solo Mac)

- Xcode instalado, con un Simulator creado (ej. "iPhone 15" / iOS 17.5 — son los defaults de `wdio.ios.conf.ts`, overrideables con `MOBILE_IOS_DEVICE_NAME` / `MOBILE_IOS_PLATFORM_VERSION` si tu Simulator es otro)
- Driver de Appium: `appium driver install xcuitest`
- El `.app` en `mobile/apps/app-ios.app` (ver arriba)

iOS todavía no se corrió nunca de punta a punta en este proyecto (bloqueado hasta ahora por no tener el `.app` — ver IMP-008). El config (`wdio.ios.conf.ts`) y el switch (`run-mobile.mjs`) están listos y comparten toda la lógica de specs/POMs con Android (mismo `wdio.shared.conf.ts`, mismos `mobile/specs/**`, mismo `mobile/pages/**`) — pero confirmar el primer test verde en iOS va a ser la primera vez que se valida esta plataforma en la práctica. Si algo no matchea (selectores, timing, comportamiento específico de iOS), es información nueva, no una regresión.

## Variables de entorno relevantes

Todas opcionales — tienen default en el config, solo hace falta setearlas si tu entorno difiere:

| Variable | Plataforma | Default | Para qué |
|---|---|---|---|
| `MOBILE_APP_PATH_ANDROID` | Android | `mobile/apps/app-android.apk` | Ruta al `.apk` si no está en la ubicación default |
| `MOBILE_ANDROID_UDID` | Android | (ninguno) | Serial del dispositivo/emulador, si hay más de uno conectado (`adb devices -l`) |
| `MOBILE_ANDROID_APP_PACKAGE` | Android | `vetify.cliente.dev` | Package de la app, si el build cambia de flavor |
| `MOBILE_ANDROID_APP_ACTIVITY` | Android | `com.example.vetify.MainActivity` | Activity principal, ídem |
| `MOBILE_ANDROID_DEVICE_NAME` | Android | `Android Device` | Nombre descriptivo del dispositivo (capability, no afecta selección real) |
| `MOBILE_APP_PATH_IOS` | iOS | `mobile/apps/app-ios.app` | Ruta al `.app` si no está en la ubicación default |
| `MOBILE_IOS_BUNDLE_ID` | iOS | `com.vetify.qa.webapp` | Bundle ID de la app, si el build cambia |
| `MOBILE_IOS_DEVICE_NAME` | iOS | `iPhone 15` | Simulator a usar |
| `MOBILE_IOS_PLATFORM_VERSION` | iOS | `17.5` | Versión de iOS del Simulator |

Además de estas, las variables de `.env` que ya usa el resto del proyecto (`VETIFY_WEBAPP_BASE_URL`, etc. — ver `.env.example` en la raíz) aplican igual acá, ya que mobile apunta al mismo ambiente QA que Playwright.

## Reportes

```bash
npm run allure:report:mobile
```

Genera y abre el reporte Allure de la última corrida mobile (separado del reporte de Playwright — `allure-results-mobile/` vs `allure-results/`).
