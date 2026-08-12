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
        },
    ],
};
