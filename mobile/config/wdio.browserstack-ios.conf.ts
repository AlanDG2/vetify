import path from 'node:path';
import { sharedConfig } from './wdio.shared.conf';

/**
 * WebdriverIO config para correr los specs de iOS en BrowserStack App Automate
 * desde una máquina Windows (sin necesidad de macOS local).
 *
 * Requisitos previos:
 *   1) Cuenta en https://www.browserstack.com (hay plan gratuito con minutos limitados)
 *   2) Haber subido el .app/.ipa a BrowserStack (via dashboard o API) y tener el hash bs://...
 *   3) Variables de entorno en .env:
 *        BROWSERSTACK_USER=<tu_user>
 *        BROWSERSTACK_KEY=<tu_access_key>
 *        BROWSERSTACK_IOS_APP=bs://<hash_de_tu_app>
 *      (o setear MOBILE_IOS_APP_BS_OVERRIDE si querés pisar el default por linea de comando)
 *
 * Como correrla:
 *   npm run test:ios:bs                       # suite completa contra iOS en la nube
 *   npm run test:ios:bs:stable                # solo el set curado estable
 *   npm run test:ios:bs -- --mochaOpts.grep "TS-01"  # filtrar por tag/title
 *
 * Notas:
 *   - Mismos specs/POMs/shared-config que la corrida local en Mac — no se duplica lógica.
 *   - El device/versión son overrideables via env (MOBILE_IOS_DEVICE_NAME / MOBILE_IOS_PLATFORM_VERSION).
 *   - El cleanup de afterTest (del shared config) funciona igual: detecta el bundleId y reactiva la app.
 *   - bstack:options genera el "sessionName" + "buildName" que aparecen en el dashboard de BS,
 *     útil para identificar la corrida entre varias personas del equipo.
 */

const USER = process.env.BROWSERSTACK_USER;
const KEY = process.env.BROWSERSTACK_KEY;
const APP = process.env.MOBILE_IOS_APP_BS_OVERRIDE ?? process.env.BROWSERSTACK_IOS_APP;

if (!USER || !KEY) {
    // Aviso temprano en vez de un error críptico de WebdriverIO al intentar autenticar.
    throw new Error(
        '[wdio.browserstack-ios.conf.ts] Faltan credenciales. ' +
        'Definí BROWSERSTACK_USER y BROWSERSTACK_KEY en .env (ver mobile/config/browserstack.example.env).'
    );
}

if (!APP) {
    throw new Error(
        '[wdio.browserstack-ios.conf.ts] Falta la app. ' +
        'Subí el .app a BrowserStack y definí BROWSERSTACK_IOS_APP=bs://<hash> en .env, ' +
        'o pasá MOBILE_IOS_APP_BS_OVERRIDE=bs://<hash> por linea de comando.'
    );
}

export const config: WebdriverIO.Config = {
    ...sharedConfig,
    user: USER,
    key: KEY,
    hostname: 'hub-cloud.browserstack.com',
    port: 443,
    path: '/wd/hub',
    protocol: 'https',
    // BrowserStack App Automate ya tiene Appium server corriendo en su nube — no levantar local.
    services: [],
    // En la nube el afterTest del shared config sigue funcionando: el capability appium:bundleId
    // hace que browser.capabilities lo devuelva, igual que en local.
    capabilities: [
        {
            platformName: 'iOS',
            'appium:automationName': 'XCUITest',
            'appium:deviceName': process.env.MOBILE_IOS_DEVICE_NAME ?? 'iPhone 15',
            'appium:platformVersion': process.env.MOBILE_IOS_PLATFORM_VERSION ?? '17.5',
            'appium:app': APP,
            'appium:bundleId': process.env.MOBILE_IOS_BUNDLE_ID ?? 'com.vetify.qa.webapp',
            'appium:autoAcceptAlerts': true,
            'appium:newCommandTimeout': 240,
            // Opciones específicas de BrowserStack (no son capabilities de Appium estándar)
            'bstack:options': {
                projectName: 'vetify-automation',
                buildName: process.env.BROWSERSTACK_BUILD_NAME ?? `ios-local-${new Date().toISOString().slice(0, 10)}`,
                sessionName: 'ios-mobile-tests',
                debug: true, // habilita el "Get a real-device session log" desde el dashboard
                networkLogs: true,
                video: true, // graba video de la corrida — clave para debug en la nube
                deviceLogs: true,
            },
        },
    ],
    // Logs de WebdriverIO → también al stdout, así ves en tu terminal qué está pasando
    // mientras BS graba del otro lado.
    logLevel: 'info',
    // Mismo outputDir que la corrida local, así `npm run allure:report:mobile` sirve para ambos.
    reporters: [
        'spec',
        [
            'allure',
            {
                outputDir: path.resolve(__dirname, '..', '..', 'allure-results-mobile'),
                disableWebdriverStepsReporting: false,
                disableWebdriverScreenshotsReporting: false,
            },
        ],
    ],
};
