import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { expect } from '@wdio/globals';
import { SiteId } from '../../../src/config/environment';
import { UserTag } from '../../../src/providers/user/tags';
import type { TestUser } from '../../../src/providers/user/user-provider';
import { UserProvider, UserSource } from '../../../src/providers/user/user-provider';
import { VetifyMobileWebappApiClient } from '../../api/VetifyMobileWebappApiClient';
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
// IMPORTANTE: el test llega hasta el paso 5 (foto), SUBE la foto (IMP-011 resuelto — ver
// BasePage.selectFileViaNativePicker()) y confirma que el paso queda listo para continuar, pero
// NO clickea "Continuar" ni envía el formulario final: eso consumiría la cuenta usada (única con
// ACTIVE+PLAN_WITHOUT_PET en el pool), compartida con credentials.spec.ts TS-07 TC-01;
// completar el alta real le asignaría una mascota y la rompería para cualquier corrida futura de
// ambos tests (mismo patrón ya documentado en qa-workspace/known-issues.md sobre no
// auto-consumir cuentas NO_PET/PLAN_WITHOUT_PET).
//
// Precondición de este test: la foto a seleccionar debe existir en la galería del
// dispositivo/emulador ANTES de tocar el trigger — el picker nativo de Android solo muestra lo
// que ya está indexado por MediaStore. El hook `before` de abajo la sube por adb (push +
// broadcast de media-scan) usando el mismo fixture que ya usa la suite Playwright
// (`src/fixtures/images/dog-profile-photo.jpg`). Requiere `adb` en el PATH (ya configurado como
// variable de usuario persistente en esta máquina — ver qa-workspace/decision-log.md 2026-08-11).
//
// A diferencia del original (usa la API de Playwright para pre-seleccionar un petId libre y
// navega directo a /pets/{petId}), acá se entra por UI real: Mascotas → "Completar credencial"
// (mismo botón que credentials.spec.ts TS-07 TC-01 ya confirmó visible para este mismo usuario).
// Navegar directo a /pets sin pasar por ese flujo muestra la pantalla de "en mantenimiento"
// (confirmado en vivo con un dump — necesita contexto/estado que la URL sola no trae).
describe('TS-08 Cargar credencial - Camino feliz hasta el paso de foto (sube la foto, no envía)', () => {
    let reservedUser: TestUser | undefined;

    before(() => {
        const localPath = path.resolve(process.cwd(), 'src/fixtures/images/dog-profile-photo.jpg');
        const devicePath = '/sdcard/Pictures/qa-pet-photo.jpg';
        execFileSync('adb', ['push', localPath, devicePath]);
        execFileSync('adb', [
            'shell',
            'am',
            'broadcast',
            '-a',
            'android.intent.action.MEDIA_SCANNER_SCAN_FILE',
            '-d',
            `file://${devicePath}`,
        ]);
    });

    afterEach(() => {
        if (reservedUser) {
            UserProvider.releaseUser(reservedUser);
            reservedUser = undefined;
        }
    });

    it('TC-01 - Vetify Mobile App - completa nombre, tipo/genero, raza y edad, sube foto correctamente', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const myPetsPage = new VetifyMobileMyPetsPage();
        const addPetFormPage = new VetifyMobileAddPetFormPage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE, UserTag.PLAN_WITHOUT_PET],
            // numberOfPlans:1 explícito (2026-08-13): el match de tags es por subconjunto
            // (ver UserPool.matchesTags — un usuario con tags de más igual matchea), así que sin
            // este filtro esta cuenta podía "robarse" a la Cuenta A (WITH_PET+PLAN_WITHOUT_PET,
            // 2 planes, agregada al pool para TS-07 TC-02) — esta pantalla espera el botón
            // "Completar credencial" (emptyPlanNoticeLbl), Cuenta A ya no lo muestra porque tiene
            // 1 mascota completada. Ver qa-workspace/decision-log.md.
            numberOfPlans: 1,
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

        // Paso 5: foto — sube una foto real (IMP-011 resuelto vía selector nativo, ver
        // BasePage.selectFileViaNativePicker()) y confirma que el paso queda listo. NO se envía
        // el formulario final (consumiría la cuenta del pool, ver comentario arriba).
        expect(await addPetFormPage.getCurrentStepTitle()).toBe(`Por último, subí una foto de ${petName}`);
        await addPetFormPage.uploadPetFilePhoto();

        await addPetFormPage.petPhotoPreviewImg.waitForDisplayed({ timeout: 10_000 });
        expect(await addPetFormPage.changePhotoBtn.isDisplayed()).toBe(true);
        expect(await addPetFormPage.continueButton.isEnabled()).toBe(true);
    });
});

// Portado de tests/projects/vetify-webapp/credentials.spec.ts TS-02 "Cargar credencial -
// Validación de Pasos" — la parte de navegación "atrás" y validaciones de campo (TC-02/03/04/
// 06/07/10/11/12/14/17/23b del original) que TS-08 arriba no cubre (ese test solo prueba el
// camino feliz hacia adelante). Misma cuenta y mismo criterio de entrada por UI real.
describe('TS-02 Cargar credencial - Navegación "atrás" y validaciones de campo', () => {
    let reservedUser: TestUser | undefined;

    afterEach(() => {
        if (reservedUser) {
            UserProvider.releaseUser(reservedUser);
            reservedUser = undefined;
        }
    });

    async function enterWizard(myPetsPage: VetifyMobileMyPetsPage, addPetFormPage: VetifyMobileAddPetFormPage): Promise<void> {
        await myPetsPage.load();
        await myPetsPage.addPetToPlanBtn.waitForDisplayed({ timeout: 20_000 });
        await (await myPetsPage.addPetToPlanBtn).click();
        await addPetFormPage.startWarningModalTitle.waitForDisplayed({ timeout: 20_000 });
    }

    // TC-02 (paso 0 → atrás → Home) + TC-06 (paso 1 → atrás → paso 0). Confirmado en vivo que
    // cerrar el modal de advertencia YA deja al usuario en el paso 1 (no hay un paso 0 "propio"
    // separado del modal, a diferencia de cómo Desktop lo modela) — por eso "atrás" desde el
    // paso 1 vuelve al paso 0 real (heading "¡Vamos a empezar!"), y desde ahí "atrás" de nuevo
    // vuelve a Home.
    it('TC-02/TC-06 - Vetify Mobile App - "atrás" desde los pasos 0 y 1', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const myPetsPage = new VetifyMobileMyPetsPage();
        const addPetFormPage = new VetifyMobileAddPetFormPage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE, UserTag.PLAN_WITHOUT_PET],
            numberOfPlans: 1,
            reserve: false,
            ignoreReserved: true,
        });
        if (!reservedUser) this.skip();

        await homePage.waitForLoaded();
        await enterWizard(myPetsPage, addPetFormPage);
        await addPetFormPage.dismissStartWarningModal();

        // TC-06: paso 1 → atrás → paso 0.
        expect(await addPetFormPage.getCurrentStepTitle()).toBe('¿Cómo se llama tu mascota?');
        await addPetFormPage.clickBack();
        await addPetFormPage.startScreenHeadingLbl.waitForDisplayed({ timeout: 10_000 });

        // TC-02: paso 0 → atrás → Home.
        await addPetFormPage.clickBack();
        await homePage.waitForLoaded();
    });

    // TC-03 (1 char) + TC-04 (>100 chars): mismo mensaje de error y "Continuar" deshabilitado.
    it('TC-03/TC-04 - Vetify Mobile App - límite de caracteres del nombre', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const myPetsPage = new VetifyMobileMyPetsPage();
        const addPetFormPage = new VetifyMobileAddPetFormPage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE, UserTag.PLAN_WITHOUT_PET],
            numberOfPlans: 1,
            reserve: false,
            ignoreReserved: true,
        });
        if (!reservedUser) this.skip();

        await homePage.waitForLoaded();
        await enterWizard(myPetsPage, addPetFormPage);
        await addPetFormPage.dismissStartWarningModal();

        // TC-03: 1 caracter.
        await addPetFormPage.fillPetName('a');
        await addPetFormPage.blurActiveElement();
        await addPetFormPage.petNameErrorLbl.waitForDisplayed({ timeout: 10_000 });
        expect(await addPetFormPage.petNameErrorLbl.getText()).toBe('El nombre debe tener al menos 2 caracteres');
        expect(await addPetFormPage.isContinueDisabled()).toBe(true);

        // TC-04: más de 100 caracteres.
        await addPetFormPage.fillPetName('a'.repeat(101));
        await addPetFormPage.blurActiveElement();
        expect(await addPetFormPage.isContinueDisabled()).toBe(true);
    });

    // TC-07 (solo tipo) — "Continuar" permanece deshabilitado con selección parcial. TC-08 (solo
    // género) no se prueba por separado: es la misma validación vista desde el otro campo
    // requerido, y agregar el género acá mismo (sin reiniciar sesión) confirma además que ambos
    // en conjunto sí habilitan "Continuar" (TC-09, ya cubierto en TS-08 pero reforzado acá).
    it('TC-07 - Vetify Mobile App - selección parcial de tipo no habilita "Continuar"', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const myPetsPage = new VetifyMobileMyPetsPage();
        const addPetFormPage = new VetifyMobileAddPetFormPage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE, UserTag.PLAN_WITHOUT_PET],
            numberOfPlans: 1,
            reserve: false,
            ignoreReserved: true,
        });
        if (!reservedUser) this.skip();

        await homePage.waitForLoaded();
        await enterWizard(myPetsPage, addPetFormPage);
        await addPetFormPage.dismissStartWarningModal();
        await addPetFormPage.fillPetName(`Test${Date.now()}`);
        await addPetFormPage.clickContinue();

        // TC-07: solo tipo seleccionado.
        await addPetFormPage.selectPetType('Perro');
        expect(await addPetFormPage.isContinueDisabled()).toBe(true);

        // Completa con género → habilita y avanza (refuerza TC-09).
        await addPetFormPage.selectPetGender('Macho');
        expect(await addPetFormPage.isContinueDisabled()).toBe(false);
    });

    // TC-11/TC-12: el listado de razas mostrado debe coincidir con el real de la API, para Perro
    // y para Gato — se cambia de tipo volviendo al paso 2 en vez de reiniciar sesión.
    it('TC-11/TC-12 - Vetify Mobile App - listado de razas coincide con la API (perro y gato)', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const myPetsPage = new VetifyMobileMyPetsPage();
        const addPetFormPage = new VetifyMobileAddPetFormPage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE, UserTag.PLAN_WITHOUT_PET],
            numberOfPlans: 1,
            reserve: false,
            ignoreReserved: true,
        });
        if (!reservedUser) this.skip();

        await homePage.waitForLoaded();
        const apiClient = await VetifyMobileWebappApiClient.getApiClient();
        const breeds = await apiClient.getPetBreeds();
        // .trim() en la API: al menos una raza ("RHODESIAN RIDGEBACK ") tiene un espacio final en
        // el dato crudo del backend — la UI ya lo recorta al mostrarlo (confirmado en vivo), así
        // que se normaliza acá también para comparar por contenido real, no por espacios sueltos.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const expectedByType = (tipo: string) => breeds.find((t: any) => t.descripcion === tipo).razas.map((b: any) => b.descripcion.trim()).sort();

        await enterWizard(myPetsPage, addPetFormPage);
        await addPetFormPage.dismissStartWarningModal();
        await addPetFormPage.fillPetName(`Test${Date.now()}`);
        await addPetFormPage.clickContinue();
        await addPetFormPage.selectPetGender('Macho');

        // TC-11: Perro.
        await addPetFormPage.selectPetType('Perro');
        await addPetFormPage.clickContinue();
        const dogBreeds = (await addPetFormPage.getBreedOptionTexts()).sort();
        expect(dogBreeds).toEqual(expectedByType('PERRO'));

        // Volver al paso 2 y cambiar a Gato.
        await addPetFormPage.clickBack();
        await addPetFormPage.selectPetType('Gato');
        await addPetFormPage.clickContinue();

        // TC-12: Gato.
        const catBreeds = (await addPetFormPage.getBreedOptionTexts()).sort();
        expect(catBreeds).toEqual(expectedByType('GATO'));
    });

    // TC-10 (paso 2→1), TC-14 (paso 3→2), TC-17 (paso 4→3), TC-23b (paso 5→4): recorre el wizard
    // completo hacia adelante, probando "atrás" en cada paso antes de continuar de nuevo.
    it('TC-10/TC-14/TC-17/TC-23b - Vetify Mobile App - "atrás" en cada paso intermedio', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const myPetsPage = new VetifyMobileMyPetsPage();
        const addPetFormPage = new VetifyMobileAddPetFormPage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE, UserTag.PLAN_WITHOUT_PET],
            numberOfPlans: 1,
            reserve: false,
            ignoreReserved: true,
        });
        if (!reservedUser) this.skip();

        await homePage.waitForLoaded();
        const petName = `Test${Date.now()}`;

        await enterWizard(myPetsPage, addPetFormPage);
        await addPetFormPage.dismissStartWarningModal();

        // Paso 1 → nombre → continuar → paso 2.
        await addPetFormPage.fillPetName(petName);
        await addPetFormPage.clickContinue();
        expect(await addPetFormPage.getCurrentStepTitle()).toBe(`${petName} es...`);

        // TC-10: paso 2 → atrás → paso 1.
        await addPetFormPage.clickBack();
        expect(await addPetFormPage.getCurrentStepTitle()).toBe('¿Cómo se llama tu mascota?');
        await addPetFormPage.clickContinue();

        // Paso 2 → tipo/género → continuar → paso 3.
        expect(await addPetFormPage.getCurrentStepTitle()).toBe(`${petName} es...`);
        await addPetFormPage.selectPetGender('Macho');
        await addPetFormPage.selectPetType('Perro');
        await addPetFormPage.clickContinue();
        expect(await addPetFormPage.getCurrentStepTitle()).toBe(`¿De qué raza es ${petName}?`);

        // TC-14: paso 3 → atrás → paso 2.
        await addPetFormPage.clickBack();
        expect(await addPetFormPage.getCurrentStepTitle()).toBe(`${petName} es...`);
        await addPetFormPage.clickContinue();

        // Paso 3 → raza → continuar → paso 4.
        expect(await addPetFormPage.getCurrentStepTitle()).toBe(`¿De qué raza es ${petName}?`);
        await addPetFormPage.selectFirstPetBreed();
        await addPetFormPage.clickContinue();
        expect(await addPetFormPage.getCurrentStepTitle()).toBe(`¿Qué edad tiene ${petName}?`);

        // TC-17: paso 4 → atrás → paso 3.
        await addPetFormPage.clickBack();
        expect(await addPetFormPage.getCurrentStepTitle()).toBe(`¿De qué raza es ${petName}?`);
        await addPetFormPage.clickContinue();

        // Paso 4 → edad → continuar → paso 5.
        expect(await addPetFormPage.getCurrentStepTitle()).toBe(`¿Qué edad tiene ${petName}?`);
        await addPetFormPage.selectPetAgeByIndex(2, 3);
        await addPetFormPage.clickContinue();
        expect(await addPetFormPage.getCurrentStepTitle()).toBe(`Por último, subí una foto de ${petName}`);

        // TC-23b: paso 5 → atrás → paso 4. No se sube foto ni se envía nada en este test.
        await addPetFormPage.clickBack();
        expect(await addPetFormPage.getCurrentStepTitle()).toBe(`¿Qué edad tiene ${petName}?`);
    });
});
