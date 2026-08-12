import { SiteId } from '../../../src/config/environment';
import { UserTag } from '../../../src/providers/user/tags';
import type { TestUser } from '../../../src/providers/user/user-provider';
import { UserProvider, UserSource } from '../../../src/providers/user/user-provider';
import { VetifyMobileAsistenciaDomicilioPage } from '../../pages/vetify/AsistenciaDomicilioPage';
import { VetifyMobileHomePage } from '../../pages/vetify/HomePage';
import { VetifyMobileLoginPage } from '../../pages/vetify/LoginPage';

// Sexta y última pantalla del menú lateral sin equivalente en Playwright (explorada en vivo con
// un dump). Pantalla estática de contacto con 2 canales (WhatsApp/Teléfono) — sin formularios ni
// mutaciones.
describe('TS-01 Asistencia a domicilio - Canales de contacto', () => {
    let reservedUser: TestUser | undefined;

    afterEach(() => {
        if (reservedUser) {
            UserProvider.releaseUser(reservedUser);
            reservedUser = undefined;
        }
    });

    it('TC-01 - Asistencia a domicilio - Vetify - "Llamanos por teléfono" abre el marcador del sistema', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const asistenciaPage = new VetifyMobileAsistenciaDomicilioPage();

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

        // Pasos: entrar a Asistencia a domicilio desde el menú lateral.
        await homePage.openSideMenu();
        await homePage.sideMenuSection.asistenciaADomicilioEntry.waitForDisplayed({ timeout: 15_000 });
        await homePage.sideMenuSection.asistenciaADomicilioEntry.click();

        // Resultado esperado: la pantalla carga con las 2 opciones de contacto.
        await asistenciaPage.verifyLoaded();

        // Pasos: elegir el canal "Llamanos por teléfono".
        await asistenciaPage.openTelefonoDetail();

        // Resultado esperado: se abre el marcador del sistema (intent nativo tel:, no un panel
        // dentro de la app).
        await asistenciaPage.verifyDialerOpened();
    });
});
