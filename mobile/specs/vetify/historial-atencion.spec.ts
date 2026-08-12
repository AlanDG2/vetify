import { SiteId } from '../../../src/config/environment';
import { UserTag } from '../../../src/providers/user/tags';
import type { TestUser } from '../../../src/providers/user/user-provider';
import { UserProvider, UserSource } from '../../../src/providers/user/user-provider';
import { VetifyMobileHistorialAtencionPage } from '../../pages/vetify/HistorialAtencionPage';
import { VetifyMobileHomePage } from '../../pages/vetify/HomePage';
import { VetifyMobileLoginPage } from '../../pages/vetify/LoginPage';
import { VetifyMobilePetClinicalHistoryPage } from '../../pages/vetify/PetClinicalHistoryPage';

// Cuarta pantalla portada del menú lateral (Playwright solo tiene un stub de path sin locators
// reales para esta pantalla, MyAppointmentsPage.ts — se exploró en vivo igual). Requiere una
// cuenta con al menos 1 mascota para tener algo que seleccionar.
describe('TS-01 Historial de atención - Historia clínica por mascota', () => {
    let reservedUser: TestUser | undefined;

    afterEach(() => {
        if (reservedUser) {
            UserProvider.releaseUser(reservedUser);
            reservedUser = undefined;
        }
    });

    it('TC-01 - Historial de atención - Vetify - Muestra la historia clínica de una mascota', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const historialPage = new VetifyMobileHistorialAtencionPage();
        const clinicalHistoryPage = new VetifyMobilePetClinicalHistoryPage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE, UserTag.WITH_PET],
            reserve: false,
            ignoreReserved: true,
        });

        if (!reservedUser) {
            this.skip();
        }

        await homePage.waitForLoaded();

        // Pasos: entrar a Historial de atención desde el menú lateral.
        await homePage.openSideMenu();
        await homePage.sideMenuSection.historialDeAtencionEntry.waitForDisplayed({ timeout: 15_000 });
        await homePage.sideMenuSection.historialDeAtencionEntry.click();

        // Resultado esperado: la pantalla carga con la lista de mascotas (puede tardar, ver nota en el POM).
        await historialPage.waitForLoaded();
        const petName = await historialPage.getFirstPetName();

        // Pasos: elegir la primera mascota.
        await historialPage.selectFirstPet();

        // Resultado esperado: se muestra la historia clínica de esa mascota (heading con su
        // nombre) — ver el comentario en PetClinicalHistoryPage.verifyLoaded() sobre por qué no se
        // verifican las columnas de la tabla en sí.
        await clinicalHistoryPage.verifyLoaded(petName);
    });
});
