import { expect } from '@wdio/globals';
import { SiteId } from '../../../src/config/environment';
import { UserTag } from '../../../src/providers/user/tags';
import type { TestUser } from '../../../src/providers/user/user-provider';
import { UserProvider, UserSource } from '../../../src/providers/user/user-provider';
import { VetifyMobileHomePage } from '../../pages/vetify/HomePage';
import { VetifyMobileLoginPage } from '../../pages/vetify/LoginPage';

describe('TS-02 Navegacion', () => {
    let reservedUser: TestUser | undefined;

    afterEach(() => {
        if (reservedUser) {
            UserProvider.releaseUser(reservedUser);
            reservedUser = undefined;
        }
    });

    it('TC-01 - Vetify Mobile App - abre el menu lateral desde Home', async () => {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();

        reservedUser = await loginPage.loginWithUserRequest({ source: UserSource.Pooled, siteId: SiteId.VETIFY_ADQUIRENTE, tags: [UserTag.ACTIVE] });
        await homePage.waitForLoaded();

        await homePage.openSideMenu();
        await homePage.sideMenuSection.closeSideMenuBtn.waitForDisplayed({ timeout: 10_000 });
        expect(await homePage.sideMenuSection.closeSideMenuBtn.isDisplayed()).toBe(true);
    });

    it('TC-02 - Vetify Mobile App - cierra sesion y vuelve al login', async () => {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();

        reservedUser = await loginPage.loginWithUserRequest({ source: UserSource.Pooled, siteId: SiteId.VETIFY_ADQUIRENTE, tags: [UserTag.ACTIVE] });
        await homePage.waitForLoaded();

        await homePage.logout();

        await loginPage.emailInput.waitForDisplayed({ timeout: 15_000 });
        expect(await loginPage.emailInput.isDisplayed()).toBe(true);
    });
});
