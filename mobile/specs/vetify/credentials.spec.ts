import { browser, expect } from '@wdio/globals';
import { DateTime } from 'luxon';
import { SiteId } from '../../../src/config/environment';
import { getPetAge } from '../../../src/helpers/automation-utils';
import { UserTag } from '../../../src/providers/user/tags';
import type { TestUser } from '../../../src/providers/user/user-provider';
import { UserProvider, UserSource } from '../../../src/providers/user/user-provider';
import { VetifyMobileWebappApiClient } from '../../api/VetifyMobileWebappApiClient';
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

    // RESUELTO 2026-08-12: se provisionó una cuenta ACTIVE+WITH_PET+PLAN_WITHOUT_PET real (2
    // planes, 1 con mascota completada vía mobile, el otro deliberadamente vacío) — ver
    // qa-workspace/decision-log.md. El `this.skip()` dinámico de abajo queda como red de
    // seguridad genérica (mismo patrón que el resto del proyecto), no porque se espere que siga
    // disparando.
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

        // Click vía JS, no nativo — mismo motivo que el resto del proyecto (viewport angosto,
        // intercepción de coordenadas). Nunca se había disparado antes porque este test siempre
        // quedaba en skip por falta de cuenta en el pool (ver known-issues.md, resuelto 2026-08-12).
        const btn = await myPetsPage.addNewPlanBtn;
        await browser.execute((el: HTMLElement) => el.click(), btn);

        await addPetFormPage.startWarningModalTitle.waitForDisplayed({ timeout: 10_000 });
        expect(await addPetFormPage.startWarningModalTitle.isDisplayed()).toBe(true);
    });

    // Portado de tests/projects/vetify-webapp/credentials.spec.ts TS-01 TC-03 "Suscribir nueva
    // mascota - Sin planes libres". Confirmado en vivo (2026-08-13) que mobile SÍ muestra el mismo
    // modal que Desktop ("Agregar mascota" / "Ir a la web" / "Cancelar", DOM idéntico) — pero al
    // tocar "Ir a la web" no pasa nada más: el modal se cierra (el handler del botón se dispara) y
    // no hay navegación (URL sin cambios), ni contexto WEBVIEW_chrome nuevo, ni cambio de paquete
    // en foreground. Probado con click JS y con tap nativo, mismo resultado en ambos. Es un bug de
    // producto real, no una limitación de plataforma — el mecanismo de "intent externo" SÍ funciona
    // en este mismo emulador (control case: vetify-plus.spec.ts TC-01 abre WEBVIEW_chrome sin
    // problema). Documentado en docs/bugs/BUG-011-suscribir-mascota-ir-a-la-web-no-navega-mobile.md
    // — no filed en Jira todavía (pendiente de OK explícito del usuario del proyecto).
    it('TC-03 - [Bug conocido, BUG-011] Vetify Mobile App - Suscribir mascota sin planes libres - "Ir a la web" no navega', function () {
        this.skip();
    });
});

// Portado de tests/projects/vetify-webapp/credentials.spec.ts TS-04 "Ver Credenciales" TC-01.
// TC-02 de ese TS (Descargar credencial) no es portable — mobile usa el DownloadManager nativo de
// Android, mecanismo distinto al de "nueva pestaña" de Desktop.
describe('TS-08 Credenciales - Ver Credencial', () => {
    let reservedUser: TestUser | undefined;

    afterEach(() => {
        if (reservedUser) {
            UserProvider.releaseUser(reservedUser);
            reservedUser = undefined;
        }
    });

    it('TC-01 - Vetify Mobile App - Ver credencial muestra los datos reales de la mascota', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const myPetsPage = new VetifyMobileMyPetsPage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE, UserTag.WITH_PET],
            numberOfPlans: 1,
            reserve: false,
            ignoreReserved: true,
        });

        if (!reservedUser) {
            this.skip();
        }

        await homePage.waitForLoaded();

        const apiClient = await VetifyMobileWebappApiClient.getApiClient();
        const pets = await apiClient.getUserPets();
        const planData = pets[0];

        await myPetsPage.load();
        await myPetsPage.backButton.waitForDisplayed({ timeout: 20_000 });

        const [firstCard] = await myPetsPage.petCards;
        if (!firstCard) throw new Error('No se encontró ninguna tarjeta de mascota.');
        await browser.execute((el: HTMLElement) => el.click(), firstCard);

        // La navegación al detalle es client-side (la URL de la app no cambia, confirmado en
        // vivo) — se espera por el dato real en vez de por un cambio de ruta.
        const breedLbl = myPetsPage.petDetailBreedLbl;
        await breedLbl.waitForDisplayed({ timeout: 15_000 });

        const bodyText = await browser.execute(() => document.body.innerText);
        if (!bodyText.includes(planData.mascota.nombre)) {
            throw new Error(`Se esperaba el nombre de la mascota ("${planData.mascota.nombre}") en la pantalla de detalle.`);
        }

        expect(await breedLbl.getText()).toBe(planData.mascota.raza.descripcion);

        const age = getPetAge(DateTime.fromFormat(planData.mascota.fecha_nacimiento, 'yyyy-MM-dd'));
        expect(await myPetsPage.petDetailAgeLbl.getText()).toBe(age);
    });
});
