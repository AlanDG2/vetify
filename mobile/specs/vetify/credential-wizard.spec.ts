import { execFileSync } from 'node:child_process';
import path from 'node:path';
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
// IMPORTANTE: el test llega hasta el paso 5 (foto), SUBE la foto (IMP-011 resuelto — ver
// BasePage.selectPhotoViaNativePicker()) y confirma que el paso queda listo para continuar, pero
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
        // BasePage.selectPhotoViaNativePicker()) y confirma que el paso queda listo. NO se envía
        // el formulario final (consumiría la cuenta del pool, ver comentario arriba).
        expect(await addPetFormPage.getCurrentStepTitle()).toBe(`Por último, subí una foto de ${petName}`);
        await addPetFormPage.uploadPetFilePhoto();

        await addPetFormPage.petPhotoPreviewImg.waitForDisplayed({ timeout: 10_000 });
        expect(await addPetFormPage.changePhotoBtn.isDisplayed()).toBe(true);
        expect(await addPetFormPage.continueButton.isEnabled()).toBe(true);
    });
});
