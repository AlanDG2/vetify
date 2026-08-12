import { expect } from '@wdio/globals';
import { SiteId } from '../../../src/config/environment';
import { UserTag } from '../../../src/providers/user/tags';
import type { TestUser } from '../../../src/providers/user/user-provider';
import { UserProvider, UserSource } from '../../../src/providers/user/user-provider';
import { VetifyMobileAddPetFormPage } from '../../pages/vetify/AddPetFormPage';
import { VetifyMobileHomePage } from '../../pages/vetify/HomePage';
import { VetifyMobileLoginPage } from '../../pages/vetify/LoginPage';
import { VetifyMobileMyPetsPage } from '../../pages/vetify/MyPetsPage';

// Portado de tests/projects/vetify-webapp/credentials.spec.ts TS-01 "Visualizacion de Planes".
// TC-02 de ese TS (plan CON mascota) ya esta cubierto por mobile/specs/vetify/pets.spec.ts
// TC-01 (mismo chequeo: petCards.length > 0) — no se duplica acá. TC-03 (Suscribir mascota SIN
// planes libres, espera pestaña nueva del navegador) queda fuera por ahora — mismo patron de
// "pestaña nueva" que credentials TS-04 TC-02 (Descargar credencial), no portable tal cual a la
// app (ver known-issues.md).
describe('TS-07 Credenciales - Visualizacion de Planes', () => {
    let reservedUser: TestUser | undefined;

    afterEach(() => {
        if (reservedUser) {
            UserProvider.releaseUser(reservedUser);
            reservedUser = undefined;
        }
    });

    it('TC-01 - Vetify Mobile App - plan sin mascota asociada muestra aviso y boton de completar', async () => {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const myPetsPage = new VetifyMobileMyPetsPage();

        // reserve:false + ignoreReserved:true (igual que el TC-01 original en Playwright): esta
        // cuenta se comparte entre varios TCs sin reserva exclusiva — con el default (reservar +
        // respetar reservas ajenas) el único usuario que matchea este combo en el pool quedaba
        // descartado por estar reservado por otra parte de la sesión, y el test fallaba confuso
        // esperando Home 30s (nunca había login real).
        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE, UserTag.PLAN_WITHOUT_PET],
            numberOfPlans: 1,
            reserve: false,
            ignoreReserved: true,
        });
        await homePage.waitForLoaded();

        await myPetsPage.load();
        await myPetsPage.emptyPlanNoticeLbl.waitForDisplayed({ timeout: 20_000 });

        expect(await myPetsPage.emptyPlanNoticeLbl.isDisplayed()).toBe(true);
        expect(await myPetsPage.addPetToPlanBtn.isDisplayed()).toBe(true);
    });

    // SKIP dinámico [pool sin datos]: no hay ningún usuario ACTIVE+WITH_PET+PLAN_WITHOUT_PET en
    // pooled-users.json (VETIFY_ADQUIRENTE) — verificado en vivo, 0 matches incluso sin filtrar
    // numberOfPlans. Es un gap de datos del pool compartido (Playwright/mobile), no un bug de
    // este test ni de IMP-010 — sin este chequeo, el test fallaba confuso 30s después esperando
    // Home (nunca hay login real porque loginWithUserRequest devuelve undefined sin loguear).
    it('TC-02 - Vetify Mobile App - Suscribir mascota con planes libres abre el modal de carga', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const myPetsPage = new VetifyMobileMyPetsPage();
        const addPetFormPage = new VetifyMobileAddPetFormPage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.PLAN_WITHOUT_PET],
            numberOfPlans: 2,
            reserve: false,
            ignoreReserved: true,
        });

        if (!reservedUser) {
            this.skip();
        }

        await homePage.waitForLoaded();

        await myPetsPage.load();
        await myPetsPage.addNewPlanBtn.waitForDisplayed({ timeout: 20_000 });

        const btn = await myPetsPage.addNewPlanBtn;
        await btn.click();

        await addPetFormPage.startWarningModalTitle.waitForDisplayed({ timeout: 10_000 });
        expect(await addPetFormPage.startWarningModalTitle.isDisplayed()).toBe(true);
    });
});
