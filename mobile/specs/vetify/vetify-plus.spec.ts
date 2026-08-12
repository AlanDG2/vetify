import { browser } from '@wdio/globals';
import { SiteId } from '../../../src/config/environment';
import { UserTag } from '../../../src/providers/user/tags';
import type { TestUser } from '../../../src/providers/user/user-provider';
import { UserProvider, UserSource } from '../../../src/providers/user/user-provider';
import { VetifyMobileHomePage } from '../../pages/vetify/HomePage';
import { VetifyMobileLoginPage } from '../../pages/vetify/LoginPage';

// Quinta pantalla portada del menú lateral — en realidad NO es una pantalla dentro de la app:
// "Vetify PLUS" abre https://vetifyplus.com/ en el navegador del sistema (confirmado contra
// Desktop, donde abre en una pestaña nueva sin problema). Por eso no hay URL/contexto de la app
// que verificar — la única señal disponible desde Appium de que el link se abrió es un nuevo
// contexto WEBVIEW_chrome. IMPORTANTE (ver decision-log 2026-08-12): en un AVD que nunca corrió
// Chrome, este trigger queda atascado detrás del first-run de Chrome sin abrir nada — no es un
// bug de la app (confirmado manualmente en celular físico), es un gap de configuración del
// emulador. Si este test falla con solo 2 contextos, completar el first-run de Chrome en el AVD
// antes de sospechar de la app.
describe('TS-01 Vetify PLUS - Enlace externo', () => {
    let reservedUser: TestUser | undefined;

    afterEach(() => {
        if (reservedUser) {
            UserProvider.releaseUser(reservedUser);
            reservedUser = undefined;
        }
    });

    it('TC-01 - Vetify PLUS - Vetify - Abre vetifyplus.com en el navegador del sistema', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE],
            reserve: false,
            ignoreReserved: true,
        });

        if (!reservedUser) {
            this.skip();
        }

        await homePage.waitForLoaded();

        // Pasos: tocar "Vetify PLUS" desde el menú lateral.
        await homePage.openSideMenu();
        await homePage.sideMenuSection.vetifyPlusEntry.waitForDisplayed({ timeout: 15_000 });
        const entry = await homePage.sideMenuSection.vetifyPlusEntry;
        await browser.execute((el: HTMLElement) => el.click(), entry);

        // Resultado esperado: se abre un navegador externo — se detecta por un nuevo contexto
        // WEBVIEW_chrome, no por cambio de URL/paquete (la app sigue en foreground, el WebView de
        // Chrome corre en su propio proceso/contexto aparte).
        await browser.waitUntil(
            async () => {
                const contexts = await browser.getContexts();
                return contexts.some((c) => (typeof c === 'string' ? c : c.id).includes('chrome'));
            },
            {
                timeout: 15_000,
                interval: 1_000,
                timeoutMsg: 'No apareció un contexto WEBVIEW_chrome tras tocar "Vetify PLUS" — si el AVD nunca corrió Chrome antes, completar su first-run primero (ver known-issues.md).',
            },
        );
    });
});
