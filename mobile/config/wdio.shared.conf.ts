import { browser } from '@wdio/globals';
import type {} from '@wdio/types';
import { getWebappBaseUrl, SiteId } from '../../src/config/environment';

const WEBVIEW_CONTEXT_PATTERN = /WEBVIEW/;

// Config común a Android e iOS. wdio.android.conf.ts / wdio.ios.conf.ts hacen
// spread de esto y solo agregan `capabilities` + `services` específicos de plataforma.
export const sharedConfig: Omit<WebdriverIO.Config, 'capabilities'> = {
    runner: 'local',
    specs: ['../specs/**/*.spec.ts'],
    exclude: [],
    maxInstances: 1,
    logLevel: 'info',
    bail: 0,
    waitforTimeout: 30_000,
    connectionRetryTimeout: 120_000,
    connectionRetryCount: 3,
    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: 120_000,
    },
    reporters: [
        'spec',
        [
            'allure',
            {
                outputDir: 'allure-results-mobile',
                disableWebdriverStepsReporting: false,
                disableWebdriverScreenshotsReporting: false,
            },
        ],
    ],
    // 2026-08-18: con maxInstances=1 todos los specs comparten UNA sola sesión/instancia de la
    // app durante toda la corrida (nunca se relanza entre archivos). Tests como
    // asistencia-domicilio.spec.ts (marcador nativo, tel:) o vetify-plus.spec.ts (navegador del
    // sistema) abren un intent nativo y nunca vuelven a la app — encontrado en vivo: quedó el
    // emulador trabado en la app de Teléfono con el 0800 de Vetify cargado, y CADA test posterior
    // (de cualquier archivo, incluso corridas nuevas si la sesión no se resetea) fallaba
    // buscando el login de Vetify dentro del marcador. Fix genérico: forzar que la app quede en
    // foreground después de CADA test, sin importar qué haya abierto.
    //
    // 2026-08-19: eso solo no alcanzaba — un test puede terminar a mitad de un wizard/modal
    // (ej. videocall.spec.ts TS-01 TC-01 termina en un modal del alta de mascota), y el próximo
    // test que intenta loguear se encuentra con una pantalla que no es ni Login ni Home. Probado
    // terminateApp()+activateApp() (no alcanza, la SPA restaura la misma ruta desde
    // localStorage/sessionStorage) y `pm clear` vía adb (funciona pero es lento y pesado — mata y
    // reinstala datos en cada test). La solución real, mucho más liviana: navegar directo a `/`
    // dentro del WEBVIEW (`browser.url()`) — resetea el estado de ruteo de la SPA sin tocar la
    // sesión ni los datos de la app. Confirmado que funciona igual de bien y es prácticamente
    // instantáneo comparado con `pm clear`.
    afterTest: async function () {
        try {
            const caps = browser.capabilities as Record<string, unknown>;
            const appId = (caps['appium:appPackage'] as string | undefined) ?? (caps['appium:bundleId'] as string | undefined);
            if (appId) {
                await browser.activateApp(appId);
            }

            const contexts = await browser.getContexts();
            const webviewContext = contexts.find((context) => WEBVIEW_CONTEXT_PATTERN.test(typeof context === 'string' ? context : context.id));
            if (webviewContext) {
                await browser.switchContext(typeof webviewContext === 'string' ? webviewContext : webviewContext.id);
                await browser.url(`${getWebappBaseUrl(SiteId.VETIFY_ADQUIRENTE)}/`);
            }
        } catch {
            // best-effort: no bloquear la corrida por un fallo de limpieza.
        }
    },
};
