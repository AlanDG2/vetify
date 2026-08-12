import { expect } from '@wdio/globals';
import { SiteId } from '../../../src/config/environment';
import { UserTag } from '../../../src/providers/user/tags';
import type { TestUser } from '../../../src/providers/user/user-provider';
import { UserProvider, UserSource } from '../../../src/providers/user/user-provider';
import { VetifyMobileHomePage } from '../../pages/vetify/HomePage';
import { VetifyMobileLoginPage } from '../../pages/vetify/LoginPage';
import { VetifyMobileServicesPage } from '../../pages/vetify/ServicesPage';

describe('TS-05 Servicios', () => {
    let reservedUser: TestUser | undefined;

    afterEach(() => {
        if (reservedUser) {
            UserProvider.releaseUser(reservedUser);
            reservedUser = undefined;
        }
    });

    it('TC-01 - Vetify Mobile App - ve el acceso a Videollamada en Servicios', async () => {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const servicesPage = new VetifyMobileServicesPage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE],
        });
        await homePage.waitForLoaded();

        await servicesPage.load();
        await servicesPage.goToVideocallBtn.waitForDisplayed({ timeout: 20_000 });

        expect(await servicesPage.goToVideocallBtn.isDisplayed()).toBe(true);
    });

    it('TC-02 - Vetify Mobile App - ve las tarjetas de Emergencias y Asistencia presencial en Servicios', async () => {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const servicesPage = new VetifyMobileServicesPage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE],
        });
        await homePage.waitForLoaded();

        await servicesPage.load();
        await servicesPage.emergenciasCard.waitForDisplayed({ timeout: 20_000 });

        expect(await servicesPage.emergenciasCard.isDisplayed()).toBe(true);
        expect(await servicesPage.asistenciaPresencialCard.isDisplayed()).toBe(true);
    });
});
