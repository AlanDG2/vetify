import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { expect } from '@wdio/globals';
import { SiteId } from '../../../src/config/environment';
import { getRandomInt } from '../../../src/helpers/automation-utils';
import { UserTag } from '../../../src/providers/user/tags';
import type { TestUser } from '../../../src/providers/user/user-provider';
import { UserProvider, UserSource } from '../../../src/providers/user/user-provider';
import { VetifyMobileHomePage } from '../../pages/vetify/HomePage';
import { VetifyMobileLoginPage } from '../../pages/vetify/LoginPage';
import { VetifyMobileMyProfilePage } from '../../pages/vetify/MyProfilePage';

describe('TS-04 Perfil', () => {
    let reservedUser: TestUser | undefined;

    before(() => {
        // Precondición del picker nativo de fotos (IMP-011 resuelto, ver BasePage): solo muestra
        // lo que ya está indexado por MediaStore.
        const localPath = path.resolve(process.cwd(), 'src/fixtures/images/user-profile-photo.jpg');
        const devicePath = '/sdcard/Pictures/qa-profile-photo.jpg';
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

    it('TC-01 - Vetify Mobile App - ve sus datos en Mi perfil', async () => {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const myProfilePage = new VetifyMobileMyProfilePage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE],
        });
        await homePage.waitForLoaded();

        await myProfilePage.load();
        await myProfilePage.verifyProfileDataVisible();

        // La UI muestra el DNI con puntos de miles ("837.687.950"), el dato crudo del usuario no
        // los tiene ("837687950") — se compara solo por dígitos.
        const paragraphTexts = await myProfilePage.getAllParagraphTexts();
        const onlyDigits = (value: string) => value.replace(/\D/g, '');
        expect(paragraphTexts.some((text) => onlyDigits(text).includes(onlyDigits(reservedUser!.identification.number)))).toBe(true);
    });

    // Portado de tests/projects/vetify-webapp/profile.spec.ts TC-04 (Playwright). Confirmado ahí
    // en vivo (2026-08-08): nombre/apellido/DNI NO son editables — solo el teléfono.
    it('TC-02 - Vetify Mobile App - actualiza el telefono (unico dato editable)', async () => {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const myProfilePage = new VetifyMobileMyProfilePage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE],
        });
        await homePage.waitForLoaded();

        const areaCode = '11';
        const phoneNumber = getRandomInt(10000000, 99999999).toString();

        await myProfilePage.load();
        await myProfilePage.openEditData();

        expect(await myProfilePage.correctDataNoticeLbl.isExisting()).toBe(true);

        await myProfilePage.updatePhone(areaCode, phoneNumber);
        await myProfilePage.saveChanges();

        await myProfilePage.load();
        const paragraphTexts = await myProfilePage.getAllParagraphTexts();
        expect(paragraphTexts.some((text) => text.includes(phoneNumber))).toBe(true);
    });

    // Portado de tests/projects/vetify-webapp/profile.spec.ts TC-02 "Cambiar imagen de perfil"
    // (Playwright). IMP-011 (docs/impedimentos-bloqueos.md) resuelto vía selector nativo de
    // fotos de Android — ver BasePage.selectFileViaNativePicker() y MyProfilePage.changeProfilePhoto().
    it('TC-03 - Vetify Mobile App - cambia la foto de perfil', async () => {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const myProfilePage = new VetifyMobileMyProfilePage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE],
        });
        await homePage.waitForLoaded();

        await myProfilePage.load();
        await myProfilePage.openEditData();
        await myProfilePage.changeProfilePhoto();
        await myProfilePage.saveChanges();

        // Recargar y confirmar que la foto persiste — no solo que la preview se vio antes de
        // guardar (mismo criterio que el TC-02 original de Playwright).
        await myProfilePage.load();
        await myProfilePage.avatarImg.waitForDisplayed({ timeout: 15_000 });
        const avatarSrc = await myProfilePage.avatarImg.getAttribute('src');
        expect(avatarSrc).toBeTruthy();
    });
});
