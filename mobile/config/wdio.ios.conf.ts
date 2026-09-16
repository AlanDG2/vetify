import path from 'node:path';
import { sharedConfig } from './wdio.shared.conf';

// SOLO corre en macOS. Requiere Xcode + un Simulator creado, y appium con el driver instalado:
//   appium driver install xcuitest
// El build de iOS todavia no esta disponible (ver IMP-008 en docs/impedimentos-bloqueos.md) —
// una vez que llegue, colocarlo en mobile/apps/ y setear MOBILE_APP_PATH_IOS si el nombre
// de archivo no coincide con el default de abajo. Correrlo con:
//   npm run test:ios
// El path default se resuelve contra __dirname, no contra cwd — ver el comentario
// equivalente en wdio.android.conf.ts.
const APP_PATH = process.env.MOBILE_APP_PATH_IOS ?? path.resolve(__dirname, '..', 'apps', 'app-ios.app');

// bundleId confirmado leyendo el repo real ike-webapp-mobile:
// iOS/Vetify-app/Configurations/QA.xcconfig -> PRODUCT_BUNDLE_IDENTIFIER = com.vetify.qa.webapp
const BUNDLE_ID = process.env.MOBILE_IOS_BUNDLE_ID ?? 'com.vetify.qa.webapp';

export const config: WebdriverIO.Config = {
    ...sharedConfig,
    port: 4723,
    services: [['appium', { command: 'appium' }]],
    // Overrides de timeout específicos de iOS (ver IMP-027 en docs/impedimentos-bloqueos.md):
    // el default de 120s heredado de Android (wdio.shared.conf.ts) no alcanza para la primera
    // sesión XCUITest en una máquina nueva, que compila WebDriverAgent desde cero (varios minutos).
    connectionRetryTimeout: 600_000,
    connectionRetryCount: 1,
    capabilities: [
        {
            platformName: 'iOS',
            'appium:automationName': 'XCUITest',
            'appium:deviceName': process.env.MOBILE_IOS_DEVICE_NAME ?? 'iPhone 15',
            'appium:platformVersion': process.env.MOBILE_IOS_PLATFORM_VERSION ?? '17.5',
            'appium:app': APP_PATH,
            'appium:bundleId': BUNDLE_ID,
            'appium:autoAcceptAlerts': true,
            'appium:newCommandTimeout': 240,
            'appium:wdaLaunchTimeout': 300_000,
            'appium:wdaConnectionTimeout': 300_000,
            // Causa raíz real de IMP-027 (encontrada 2026-09-16 con logs verbose de RemoteDebugger):
            // el proceso del WebView se reporta como "process-vetify-qa" (nombre del scheme/ejecutable
            // de Xcode), no como "process-<BUNDLE_ID>" ni el bundleId mismo — Appium solo matchea contra
            // BUNDLE_ID y un puñado de bundle IDs de Apple por default, así que nunca lo encontraba.
            'appium:additionalWebviewBundleIds': ['process-vetify-qa'],
        },
    ],
};
