import { expect } from '@wdio/globals';
import { SiteId } from '../../../src/config/environment';
import { UserTag } from '../../../src/providers/user/tags';
import type { TestUser } from '../../../src/providers/user/user-provider';
import { UserProvider, UserSource } from '../../../src/providers/user/user-provider';
import { VetifyMobileAddPetFormPage } from '../../pages/vetify/AddPetFormPage';
import { VetifyMobileHomePage } from '../../pages/vetify/HomePage';
import { VetifyMobileLoginPage } from '../../pages/vetify/LoginPage';
import { VetifyMobileMyPetsPage } from '../../pages/vetify/MyPetsPage';

// Portado de tests/projects/vetify-webapp/credentials.spec.ts TS-02 "Cargar credencial -
// Validación de Pasos" — cubre el camino feliz completo (TC-01/05/09/13/16/23 del original,
// combinados en un solo flujo en vez de tests fragmentados) porque en Appium cada test es una
// sesión nueva (reinstala la app) — encadenar pasos ya verificados evita pagar el costo de una
// sesión completa por cada paso individual.
//
// IMPORTANTE: el test llega hasta el paso 5 (foto) y verifica que la pantalla correcta está
// visible, pero NO intenta subir el archivo ni enviar el formulario final:
//  - Subir el archivo está BLOQUEADO — setear el <input type="file"> vía chromedriver crashea
//    la app entera (IPC inválida en el WebView embebido, confirmado en logcat). Ver IMP-011
//    (docs/impedimentos-bloqueos.md) para el detalle completo y los 3 caminos ya descartados.
//  - Enviar el formulario final consumiría la cuenta usada (única con ACTIVE+PLAN_WITHOUT_PET en
//    el pool), compartida con credentials.spec.ts TS-07 TC-01; completar el alta real le
//    asignaría una mascota y la rompería para cualquier corrida futura de ambos tests (mismo
//    patrón ya documentado en qa-workspace/known-issues.md sobre no auto-consumir cuentas
//    NO_PET/PLAN_WITHOUT_PET).
//
// A diferencia del original (usa la API de Playwright para pre-seleccionar un petId libre y
// navega directo a /pets/{petId}), acá se entra por UI real: Mascotas → "Completar credencial"
// (mismo botón que credentials.spec.ts TS-07 TC-01 ya confirmó visible para este mismo usuario).
// Navegar directo a /pets sin pasar por ese flujo muestra la pantalla de "en mantenimiento"
// (confirmado en vivo con un dump — necesita contexto/estado que la URL sola no trae).
describe('TS-08 Cargar credencial - Camino feliz hasta el paso de foto (sin subir ni enviar)', () => {
    let reservedUser: TestUser | undefined;

    afterEach(() => {
        if (reservedUser) {
            UserProvider.releaseUser(reservedUser);
            reservedUser = undefined;
        }
    });

    it('TC-01 - Vetify Mobile App - completa nombre, tipo/genero, raza y edad, llega al paso de foto', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const myPetsPage = new VetifyMobileMyPetsPage();
        const addPetFormPage = new VetifyMobileAddPetFormPage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE, UserTag.PLAN_WITHOUT_PET],
            reserve: false,
            ignoreReserved: true,
        });

        if (!reservedUser) {
            this.skip();
        }

        await homePage.waitForLoaded();

        const petName = `Test${Date.now()}`;
        const petType = 'Perro';
        const petGender = 'Macho';

        await myPetsPage.load();
        await myPetsPage.addPetToPlanBtn.waitForDisplayed({ timeout: 20_000 });
        const completarCredencialBtn = await myPetsPage.addPetToPlanBtn;
        await completarCredencialBtn.click();

        await addPetFormPage.startWarningModalTitle.waitForDisplayed({ timeout: 20_000 });
        await addPetFormPage.dismissStartWarningModal();

        // Paso 1: nombre
        expect(await addPetFormPage.getCurrentStepTitle()).toBe('¿Cómo se llama tu mascota?');
        await addPetFormPage.fillPetName(petName);
        await addPetFormPage.clickContinue();

        // Paso 2: tipo y género
        expect(await addPetFormPage.getCurrentStepTitle()).toBe(`${petName} es...`);
        await addPetFormPage.selectPetGender(petGender);
        await addPetFormPage.selectPetType(petType);
        await addPetFormPage.clickContinue();

        // Paso 3: raza
        expect(await addPetFormPage.getCurrentStepTitle()).toBe(`¿De qué raza es ${petName}?`);
        await addPetFormPage.selectFirstPetBreed();
        await addPetFormPage.clickContinue();

        // Paso 4: edad
        expect(await addPetFormPage.getCurrentStepTitle()).toBe(`¿Qué edad tiene ${petName}?`);
        await addPetFormPage.selectPetAgeByIndex(2, 3);
        await addPetFormPage.clickContinue();

        // Paso 5: foto — solo se confirma que se llega a la pantalla correcta. NO se sube el
        // archivo (ver IMP-011 en el comentario de arriba: crashea la app entera) ni se envía el
        // formulario final (consumiría la cuenta del pool).
        expect(await addPetFormPage.getCurrentStepTitle()).toBe(`Por último, subí una foto de ${petName}`);
        expect(await addPetFormPage.petPhotoFileInput.isExisting()).toBe(true);
    });
});
