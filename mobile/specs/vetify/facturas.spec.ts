import { SiteId } from '../../../src/config/environment';
import { UserTag } from '../../../src/providers/user/tags';
import type { TestUser } from '../../../src/providers/user/user-provider';
import { UserProvider, UserSource } from '../../../src/providers/user/user-provider';
import { VetifyMobileFacturasPage } from '../../pages/vetify/FacturasPage';
import { VetifyMobileHomePage } from '../../pages/vetify/HomePage';
import { VetifyMobileLoginPage } from '../../pages/vetify/LoginPage';

// Segunda pantalla portada del menú lateral sin equivalente en Playwright (explorada en vivo con
// un dump). La cuenta pooled usada no tiene facturas reales — cubre el estado vacío, que es lo
// único verificable sin datos de facturación de por medio.
describe('TS-01 Facturas - Estado vacío', () => {
    let reservedUser: TestUser | undefined;

    afterEach(() => {
        if (reservedUser) {
            UserProvider.releaseUser(reservedUser);
            reservedUser = undefined;
        }
    });

    it('TC-01 - Facturas - Vetify - Muestra el estado vacío cuando no hay facturas', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const facturasPage = new VetifyMobileFacturasPage();

        // 2026-08-20: sin reserva exclusiva, esto siempre tomaba la MISMA cuenta (la primera que
        // matchea "ACTIVE" en el pool, sin importar cuántas haya) — y esa cuenta puntual
        // (`b64bc406`) fue provisionada a propósito con plan y mascota reales para otros tests,
        // no representa una cuenta "sin facturas". Con reserva exclusiva (default), rota entre
        // las 13 cuentas ACTIVE del pool en vez de chocar siempre con la misma.
        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE],
        });

        if (!reservedUser) {
            this.skip();
        }

        await homePage.waitForLoaded();

        // Pasos: entrar a Facturas desde el menú lateral.
        await homePage.openSideMenu();
        await homePage.sideMenuSection.facturasEntry.waitForDisplayed({ timeout: 15_000 });
        await homePage.sideMenuSection.facturasEntry.click();

        // Resultado esperado: se muestra el estado vacío ("No tenés facturas disponibles...").
        await facturasPage.verifyEmptyStateVisible();
    });
});
