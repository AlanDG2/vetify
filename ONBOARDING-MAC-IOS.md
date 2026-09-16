# Onboarding en Mac — de cero a diagnosticar iOS mobile

> Este documento es para arrancar una sesión de Claude Code **nueva, en una Mac que nunca tuvo estos proyectos**, con todo el contexto necesario para instalar, compilar y llegar al objetivo real: **por fin ver en vivo qué pasa con el WebView de la app iOS**, algo que nunca se pudo diagnosticar a ciegas desde CI (GitHub Actions) ni desde Windows (sin Mac).
>
> Leé esto de punta a punta antes de tocar nada — el objetivo final NO es "que un test pase", es **destrabar un impedimento de varias semanas** (IMP-027) que solo se puede resolver con acceso interactivo a un Simulator real.

---

## 0. Contexto — qué es cada cosa y por qué hay 2 proyectos

Esta carpeta trae **2 proyectos relacionados pero separados**:

| Carpeta | Qué es | Lenguaje/stack | Por qué está acá |
|---|---|---|---|
| `automation/` (esta carpeta, la raíz del zip) | El proyecto de QA — Playwright (web) + WebdriverIO/Appium (`automation/mobile/`, apps nativas) + toda la documentación de impedimentos/decisiones acumulada | TypeScript, Node.js | Es donde vive **todo el conocimiento QA** (`docs/impedimentos-bloqueos.md`, `qa-workspace/decision-log.md`, `docs/lecciones-aprendidas.md`) y los specs que van a correr contra la app |
| `ike-webapp-mobile/` (carpeta hermana, al lado de esta) | El código FUENTE de la app nativa Vetify (Android + iOS) — el wrapper WKWebView que carga `vetify-qa.ikeapp.com` dentro de una app | Swift (iOS) / Kotlin-Java (Android) | Es lo que hay que **compilar** para conseguir el `.app` que Appium necesita para automatizar |

**Relación entre los 2**: `automation/mobile/` (WebdriverIO) NO tiene el código de la app — solo sabe apuntar Appium a un binario ya compilado (`automation/mobile/apps/app-ios.app`). Ese binario sale de compilar `ike-webapp-mobile/iOS/vetify.xcodeproj` con Xcode. Sin ese repo fuente (o sin el `.app` ya compilado que puede venir incluido en este zip, ver sección 3), no hay nada que automatizar.

**El objetivo real de todo esto — leer antes de seguir**: `IMP-027` (`docs/impedimentos-bloqueos.md`) lleva semanas atascado en un punto exacto: **la app iOS instala y abre bien en el Simulator, pero Appium nunca detecta un contexto `WEBVIEW_*`** — o sea, no se puede automatizar nada DENTRO de la web embebida (solo lo nativo, que en esta app es casi nada, es un wrapper de una sola pantalla). Se investigó a ciegas desde CI (GitHub Actions, sin poder ver la pantalla) y se descartaron 2 hipótesis (`isInspectable`, red/DNS) sin encontrar la causa real. **Con una Mac real, el primer paso NO es correr Appium — es abrir el Simulator y mirar con tus propios ojos si Safari puede inspeccionar el WebView.** Eso es información que nunca se pudo conseguir hasta ahora. Ver sección 6 para el paso a paso exacto de este diagnóstico.

---

## 1. Prerrequisitos (instalar antes de tocar el proyecto)

- **Xcode** (App Store, gratis) — versión 16 o superior. El proyecto fuente (`vetify.xcodeproj`) requiere Xcode 16+; con una versión más vieja falla al abrirlo ("future Xcode project file format").
- Abrir Xcode una vez, aceptar la licencia, dejar que instale los componentes adicionales que pida.
- **Un Simulator creado** — Xcode > Settings > Platforms, o simplemente abrir cualquier proyecto y elegir un destino de Simulator (ej. "iPhone 16"), Xcode lo crea solo. El config de este proyecto (`mobile/config/wdio.ios.conf.ts`) usa por default `iPhone 15` / iOS `17.5` — si tu Simulator es otro, no pasa nada, se overridea con 2 variables de entorno (ver sección 4).
- **Node.js** (LTS, 18 o superior) — `brew install node` si tenés Homebrew, o el instalador oficial de nodejs.org.
- **Appium** y el driver de iOS:
  ```bash
  npm install -g appium
  appium driver install xcuitest
  ```
- **CLI de Xcode** (si `xcodebuild` no está en el PATH todavía):
  ```bash
  xcode-select --install
  ```

Verificación rápida de que todo está listo:
```bash
xcodebuild -version          # debería mostrar Xcode 16.x o superior
appium driver list --installed   # debería listar "xcuitest"
node -v                      # 18+
```

---

## 2. Instalar el proyecto `automation`

1. Descomprimir el zip de `automation` donde prefieras, por ejemplo `~/ike/vetify-automation/automation`.
2. Instalar dependencias:
   ```bash
   cd ~/ike/vetify-automation/automation
   npm install
   ```
3. Copiar `.env.example` a `.env` y completar los valores reales (pedirlos a Alan si no vienen ya en el zip — este archivo normalmente NO viaja en git por tener credenciales, revisar si `.env` real está incluido en el zip o si hay que recrearlo a mano):
   ```bash
   cp .env.example .env
   ```
   Para el trabajo de mobile específicamente, lo único que hace falta de `.env` son las variables que ya usa el resto del proyecto (`VETIFY_WEBAPP_BASE_URL`, etc.) — la app apunta al mismo ambiente QA (`https://vetify-qa.ikeapp.com`) que ya usa toda la suite de Playwright, así que cualquier cuenta del pool sirve igual.
4. Confirmar que el proyecto typechecka limpio (opcional pero recomendado antes de tocar nada):
   ```bash
   npm run typecheck
   ```

---

## 3. Conseguir el `.app` de iOS

**Antes de compilar nada, revisar si ya viene incluido en el zip**: `mobile/apps/app-ios.app` (y `app-ios.zip`) son un build real ya compilado el 2026-09-10 (vía GitHub Actions, ver IMP-027). Si están en el zip, podés arrancar directo por la sección 4 y usarlo como primera prueba — sirve para confirmar que el pipeline entero funciona antes de invertir tiempo recompilando. Ese build es solo para **Simulator** (sin firma), no anda en dispositivo físico.

**Para compilar uno nuevo (recomendado si van a pasar días/semanas desde el 09-10, o si el código fuente cambió)**:

1. Clonar o descomprimir `ike-webapp-mobile` (el repo fuente) como carpeta **hermana** de `automation` (no adentro):
   ```
   ~/ike/vetify-automation/automation/     <- este proyecto
   ~/ike/ike-webapp-mobile/                <- el código fuente de la app
   ```
2. Compilar el scheme QA para Simulator (sin firma — no hace falta Apple Developer Program ni ningún costo, esto es 100% gratis y local):
   ```bash
   cd ~/ike/ike-webapp-mobile/iOS
   xcodebuild -project vetify.xcodeproj -scheme vetify-qa \
     -configuration Debug \
     -destination 'platform=iOS Simulator,name=iPhone 15,OS=17.5' \
     -derivedDataPath build \
     CODE_SIGNING_ALLOWED=NO \
     build
   ```
   Si tu Simulator tiene otro nombre/versión, ajustá `name=`/`OS=` — o simplemente sacá el flag `-destination` entero y dejá que Xcode use el destino default (después hay que asegurarse de que `MOBILE_IOS_DEVICE_NAME`/`MOBILE_IOS_PLATFORM_VERSION` en `automation/.env` matcheen igual).
3. El `.app` queda en `build/Build/Products/Debug-iphonesimulator/vetify.app` (el nombre exacto puede variar levemente, buscar con `find build -name "*.app"` si no aparece ahí).
4. Copiarlo al lugar donde `wdio.ios.conf.ts` lo espera:
   ```bash
   cp -R build/Build/Products/Debug-iphonesimulator/*.app \
     ~/ike/vetify-automation/automation/mobile/apps/app-ios.app
   ```

**Ojo con la documentación desactualizada de `ike-webapp-mobile`**: `iOS/CLAUDE.md` de ese repo dice bundle ID `com.vetify-qa.webapp` (con guion) y versión `3.3`/build `9` — **son datos viejos**. El `.xcconfig` real (`iOS/Vetify-app/Configurations/QA.xcconfig`) y `project.pbxproj` dicen `com.vetify.qa.webapp` (con punto, sin guion) y `3.4`/build `10` — son los que hay que confiar, y son los que ya tiene cargados `automation/mobile/config/wdio.ios.conf.ts` (`BUNDLE_ID` default). No corregir el `CLAUDE.md` del otro repo (no corresponde a este trabajo), solo tenerlo en cuenta para no confundirse.

---

## 4. Variables de entorno relevantes para iOS (todas opcionales, tienen default)

En `automation/.env` (agregar solo si tu setup difiere de los defaults):

| Variable | Default | Cuándo cambiarla |
|---|---|---|
| `MOBILE_APP_PATH_IOS` | `mobile/apps/app-ios.app` | Si el `.app` quedó en otro lado |
| `MOBILE_IOS_BUNDLE_ID` | `com.vetify.qa.webapp` | Si el build cambia de bundle |
| `MOBILE_IOS_DEVICE_NAME` | `iPhone 15` | Si tu Simulator es otro modelo |
| `MOBILE_IOS_PLATFORM_VERSION` | `17.5` | Si tu Simulator corre otra versión de iOS |

---

## 5. Primera corrida — el smoke test

```bash
cd ~/ike/vetify-automation/automation
npm run test:mobile
```

Esto detecta que estás en Mac y corre automáticamente contra iOS (`wdio.ios.conf.ts`). Corre el spec más simple que existe: `mobile/specs/example/app-launch.spec.ts`.

**Qué esperar, siendo honesto sobre el estado real**:
- **TC-01** (la app instala y abre, `getContexts()` devuelve `['NATIVE_APP']`) — esto **ya pasó antes** en CI (GitHub Actions), debería pasar bien acá también.
- **TC-02** (aparece un contexto `WEBVIEW_*`) — esto es **exactamente lo que nunca funcionó**, ni en CI ni en ningún lado hasta ahora. Es esperable que falle. **No es una regresión tuya ni un error de instalación — es el impedimento que estamos acá para diagnosticar.**

Si TC-01 también falla, algo del setup está mal (Xcode, Simulator, o el `.app` no es válido) — revisar la sección 1 y 3 antes de seguir. Si TC-01 pasa y TC-02 falla, **vas exactamente donde se esperaba estar** — pasar a la sección 6.

---

## 6. El diagnóstico real — esto es lo que "éxito" significa acá

El objetivo de traer todo esto a una Mac real no es "hacer pasar TC-02" a ciegas — es **por fin poder mirar con los propios ojos** qué está pasando, algo que 8 corridas de CI (ver `IMP-027` en `docs/impedimentos-bloqueos.md`, sección "8 corridas de CI") no pudieron hacer por estar ciegas.

### Paso 1 — el chequeo más simple posible, sin Appium para nada

Antes de tocar WebdriverIO de nuevo:

1. Abrí el Simulator manualmente (`open -a Simulator`, o desde Xcode).
2. Instalá el `.app` a mano arrastrándolo al Simulator, o:
   ```bash
   xcrun simctl install booted mobile/apps/app-ios.app
   xcrun simctl launch booted com.vetify.qa.webapp
   ```
3. En una Mac real, **Safari tiene un menú Develop** (activarlo en Safari > Settings > Advanced > "Show Develop menu" si no está). Con la app corriendo en el Simulator, andá a **Safari > Develop > Simulator > [nombre del simulator]**.
4. **Acá está la pregunta clave que nunca se pudo responder desde CI**: ¿aparece el WebView de la app listado ahí, como una pestaña inspeccionable?
   - **Si SÍ aparece** → el WebView SÍ es inspeccionable por herramientas de Apple. El problema entonces es específico de Appium/WebDriverAgent (algo en cómo negocia la conexión), no una restricción de la app — seguir en el Paso 2.
   - **Si NO aparece nada, ni la app en la lista** → confirma la hipótesis de Oscar Tello (llamada 2026-09-13, ver `IMP-027`): puede ser una **decisión de seguridad deliberada** de la app (no exponer el WebView a herramientas externas), no un bug de configuración. En ese caso, el camino no es seguir depurando técnicamente — es pedir al equipo Mobile un build QA especial con el WebView expuesto a propósito (mismo concepto que se resolvió para Android en `IMP-009` con un build Debug).

**Antes de este paso, revisar si ya hay respuesta**: quedó agendada una reunión el 2026-09-14 14hs con Andrés (equipo Mobile) justo sobre este tema. Preguntarle a Alan si esa reunión pasó y qué se dijo — puede que esto ya esté resuelto o aclarado y este documento no se haya actualizado todavía.

### Paso 2 — si Safari SÍ ve el WebView, pero Appium sigue sin verlo

Esto acota el problema a la integración Appium↔WebDriverAgent, no a la app. Cosas a probar, en orden:

1. Correr con logs verbose de Appium:
   ```bash
   MOBILE_APP_PATH_IOS=mobile/apps/app-ios.app npx wdio run mobile/config/wdio.ios.conf.ts --logLevel debug
   ```
2. Activar `appium:showXcodeLog: true` en `wdio.ios.conf.ts` (ya se probó en CI sin éxito — pero en CI el log tampoco llegaba a la salida capturada por `@wdio/appium-service`, posible bug de esa integración puntual, no de Appium en sí. Localmente en Mac, correr Appium standalone en una terminal aparte (`appium --log-level debug`) en vez de dejar que WebdriverIO lo levante, para ver el log crudo sin intermediarios.
3. Confirmar la versión de WebDriverAgent que Appium está compilando/usando — la primera vez que XCUITest corre en una máquina nueva compila WDA desde cero, puede fallar silenciosamente en ese paso. Revisar `~/Library/Developer/Xcode/DerivedData/WebDriverAgent-*` por errores de compilación de WDA.
4. Probar `appium:webviewConnectTimeout` más alto, y `appium:includeSafariInWebviews: false` (por si Appium está confundiendo el listado con Safari mismo).

### Paso 3 — si Safari tampoco ve el WebView (confirma la hipótesis de seguridad)

No seguir invirtiendo tiempo técnico acá — es una decisión de producto/seguridad, no un bug para arreglar con más configuración. Pedirle a Alan que retome el pedido al equipo Mobile: un build QA con `webView.isInspectable = true` forzado (o el equivalente que el equipo Mobile considere seguro para QA), documentando que ya se descartó que sea un problema de nuestro lado (Appium, red, config) con evidencia real de Mac.

---

## 7. Checklist de "terminado con éxito"

No existe un único punto de éxito — hay 3 resultados posibles, todos son un cierre válido de esta ronda si quedan bien documentados (no inflar ninguno como "resuelto" si no lo está):

- [ ] **Éxito completo**: `TC-02` pasa (aparece `WEBVIEW_*`), se puede automatizar contenido web dentro de la app iOS igual que ya se hace en Android (emulador). En ese caso, seguir con el resto de `mobile/specs/vetify/*.spec.ts` contra iOS por primera vez — **son specs escritos y probados solo contra Android, la primera corrida en iOS puede revelar diferencias de selectores/timing, es información nueva, no una regresión** (ya lo anticipa `mobile/README.md`, sección iOS).
- [ ] **Diagnóstico real logrado, sin arreglar todavía**: se confirma con el Safari Web Inspector si el WebView es o no inspeccionable — cualquiera de las 2 respuestas es un avance real, hay que documentarlo en `IMP-027` con la fecha y el resultado exacto.
- [ ] **Bloqueado de nuevo, mismo síntoma**: si ni siquiera se puede llegar al Paso 1 (algo del setup de Xcode/Simulator falla antes), documentar el error exacto — puede ser un hallazgo nuevo específico de esta Mac, no asumir que es "lo mismo de siempre" sin confirmarlo.

En cualquiera de los 3 casos: actualizar `docs/impedimentos-bloqueos.md` (`IMP-027`) con lo que se encontró, y `qa-workspace/decision-log.md` con la decisión tomada — mismo criterio de honestidad que el resto del proyecto (no marcar nada como resuelto sin verificarlo en vivo).

---

## 8. Referencias — leer si algo no matchea lo que este documento dice

- `docs/impedimentos-bloqueos.md` — `IMP-008` (scaffold + apk Android), `IMP-009` (WebView sin debug en Android físico, mismo concepto que acá), `IMP-027` (todo el historial de iOS, la fuente de verdad más completa).
- `mobile/README.md` — guía general del proyecto mobile, incluye setup Android también.
- `qa-workspace/decision-log.md` — decisiones tomadas sesión a sesión, buscar entradas de mobile/iOS.
- `docs/lecciones-aprendidas.md` — patrones ya aprendidos (ej. emulador vs. hardware real no son intercambiables para WebView).

**Preguntas abiertas para Alan, antes de asumir nada**: ¿pasó la reunión del 2026-09-14 con Andrés (equipo Mobile)? ¿Hubo alguna novedad sobre si el WebView no-inspeccionable es a propósito? Si la respuesta ya existe, actualizar este documento y `IMP-027` antes de re-investigar algo que ya se sabe.
