import { SiteId } from '../../../src/config/environment';
import { UserTag } from '../../../src/providers/user/tags';
import type { TestUser } from '../../../src/providers/user/user-provider';
import { UserProvider, UserSource } from '../../../src/providers/user/user-provider';
import { VetifyMobileHomePage } from '../../pages/vetify/HomePage';
import { VetifyMobileLoginPage } from '../../pages/vetify/LoginPage';
import { VetifyMobileReintegrosPage } from '../../pages/vetify/ReintegrosPage';

// Tercera pantalla portada del menú lateral sin equivalente en Playwright (explorada en vivo con
// un dump). La cuenta pooled usada reprodujo BUG-007/IMAS-4279 (el historial de reintegros falla
// al cargar por un DNI con formato inválido en el backend) — ver
// docs/bugs/BUG-007-reintegros-dni-formato-invalido.md y qa-workspace/known-issues.md. El test
// verifica el comportamiento REAL actual (la app degrada con gracia, muestra un modal de error en
// vez de crashear) — no afirma que ese modal sea el resultado deseado, solo lo observado hoy.
describe('TS-01 Reintegros - Cuentas de acreditación e historial', () => {
    let reservedUser: TestUser | undefined;

    afterEach(() => {
        if (reservedUser) {
            UserProvider.releaseUser(reservedUser);
            reservedUser = undefined;
        }
    });

    it('TC-01 - Reintegros - Vetify - Muestra la sección de cuentas de acreditación', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const reintegrosPage = new VetifyMobileReintegrosPage();

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

        // Pasos: entrar a Reintegros desde el menú lateral.
        await homePage.openSideMenu();
        await homePage.sideMenuSection.reintegrosEntry.waitForDisplayed({ timeout: 15_000 });
        await homePage.sideMenuSection.reintegrosEntry.click();

        // Resultado esperado: la pantalla carga con la sección "Cuentas de acreditación" visible
        // (la única sección confirmada sin depender del historial de reintegros, que hoy falla por
        // BUG-007/IMAS-4279 en esta cuenta).
        await reintegrosPage.verifyLoaded();
        await reintegrosPage.cuentasEmptyStateLbl.waitForDisplayed({ timeout: 10_000 });
    });
});
