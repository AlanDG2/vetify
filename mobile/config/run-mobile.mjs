#!/usr/bin/env node
// Switch multiplataforma para mobile: detecta el SO de quien lo corre y elige el config de
// WebdriverIO correcto (Android en Windows/Linux, iOS en Mac) — así el mismo comando
// (`npm run test:mobile`) funciona igual para todo el equipo sin que nadie tenga que acordarse
// de si le toca `test:android` o `test:ios`. Los overrides manuales (`npm run test:android` /
// `npm run test:ios`) siguen existiendo tal cual para cuando alguien necesita forzar una
// plataforma puntual (ej. correr Android desde un Mac).
//
// Antes de invocar `wdio run`, valida que el binario de la app exista — sin esto, un colaborador
// nuevo (típicamente quien corre iOS por primera vez en su Mac) se encuentra con un error crudo
// de Appium en vez de una instrucción clara de qué falta. Ver mobile/README.md e
// docs/impedimentos-bloqueos.md (IMP-008) para el detalle completo de cómo conseguir cada binario
// — no están en git (mobile/apps/*.apk, *.ipa, *.app en .gitignore, son binarios grandes que
// además cambian de versión seguido).
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isMac = process.platform === 'darwin';
const platform = isMac ? 'ios' : 'android';

const appPath = isMac
    ? (process.env.MOBILE_APP_PATH_IOS ?? path.resolve(__dirname, '..', 'apps', 'app-ios.app'))
    : (process.env.MOBILE_APP_PATH_ANDROID ?? path.resolve(__dirname, '..', 'apps', 'app-android.apk'));

if (!existsSync(appPath)) {
    console.error(`\n✘ No se encontró el binario de la app mobile para ${platform === 'ios' ? 'iOS' : 'Android'}.`);
    console.error(`  Se esperaba en: ${appPath}\n`);
    if (platform === 'ios') {
        console.error('  El .app de iOS no viaja en el repo (mobile/apps/*.app está en .gitignore — es un binario');
        console.error('  grande y cambia de versión seguido). Para conseguirlo:');
        console.error('    a) pedirle el build QA ya compilado a quien lo tenga (dev del equipo), o');
        console.error('    b) compilarlo vos misma desde el repo fuente ike-webapp-mobile (necesita Xcode):');
        console.error('       xcodebuild -project vetify.xcodeproj -scheme vetify-qa ...');
        console.error('  Después colocá el .app en mobile/apps/app-ios.app, o si tiene otro nombre/ruta,');
        console.error('  seteá la variable de entorno MOBILE_APP_PATH_IOS apuntando a él.');
        console.error('  Ver mobile/README.md para el detalle completo de setup en Mac (Xcode, Simulator,');
        console.error('  driver xcuitest de Appium) y docs/impedimentos-bloqueos.md (IMP-008).\n');
    } else {
        console.error('  El .apk de Android no viaja en el repo (mobile/apps/*.apk está en .gitignore).');
        console.error('  Pedile el build QA (app-android.apk) a quien lo tenga, colocalo en mobile/apps/,');
        console.error('  o seteá MOBILE_APP_PATH_ANDROID apuntando a otra ubicación.');
        console.error('  Ver mobile/README.md y docs/impedimentos-bloqueos.md (IMP-008).\n');
    }
    process.exit(1);
}

const configFile = path.resolve(__dirname, `wdio.${platform}.conf.ts`);
const extraArgs = process.argv.slice(2);

console.log(`▶ Detectado ${process.platform} → corriendo mobile en ${platform === 'ios' ? 'iOS' : 'Android'} (${path.basename(configFile)})\n`);

const result = spawnSync('npx', ['wdio', 'run', configFile, ...extraArgs], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
