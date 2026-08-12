import { SiteId } from '../../../src/config/environment';
import { UserTag } from '../../../src/providers/user/tags';
import type { TestUser } from '../../../src/providers/user/user-provider';
import { UserProvider, UserSource } from '../../../src/providers/user/user-provider';
import { VetifyMobileAyudaPage } from '../../pages/vetify/AyudaPage';
import { VetifyMobileHomePage } from '../../pages/vetify/HomePage';
import { VetifyMobileLoginPage } from '../../pages/vetify/LoginPage';

// Primera pantalla portada del menú lateral sin equivalente en Playwright (no hay POM que copiar,
// explorada en vivo con un dump). Pantalla estática de contacto — sin formularios ni mutaciones,
// solo verifica que la información de contacto real se muestra.
describe('TS-01 Ayuda - Información de contacto', () => {
    let reservedUser: TestUser | undefined;

    afterEach(() => {
        if (reservedUser) {
            UserProvider.releaseUser(reservedUser);
            reservedUser = undefined;
        }
    });

    it('TC-01 - Ayuda - Vetify - Muestra los canales de contacto (Emergencias y Atención al cliente)', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const ayudaPage = new VetifyMobileAyudaPage();

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

        // Pasos: entrar a Ayuda desde el menú lateral.
        await homePage.openSideMenu();
        await homePage.sideMenuSection.ayudaEntry.waitForDisplayed({ timeout: 15_000 });
        await homePage.sideMenuSection.ayudaEntry.click();

        // Resultado esperado: se muestran los canales de contacto reales.
        await ayudaPage.verifyTextVisible('Ayuda');
        await ayudaPage.verifyTextVisible('Emergencias');
        await ayudaPage.verifyTextVisible('0800 122 1183');
        await ayudaPage.verifyTextVisible('Atención al cliente');
        await ayudaPage.verifyTextVisible('+54 9 11 7248 7444');
        await ayudaPage.verifyTextVisible('info@vetify.com.ar');
    });
});
