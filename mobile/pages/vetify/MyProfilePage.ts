import { $, $$, browser } from '@wdio/globals';
import { VetifyMobileLoggedBasePage } from './LoggedBasePage';

// Locators calcados de src/pages/vetify/webapp/MyProfilePage.ts (Playwright) donde fue posible.
// Esa pantalla no tiene data-cy/data-testid (confirmado ahí en vivo). Los textos "sueltos" (sin
// data-cy) usan xpath `contains(., "...")` — probado confiable en esta app — nunca
// `text()`/`starts-with()`/`normalize-space()`, que no resuelven acá (ver known-issues.md).
export class VetifyMobileMyProfilePage extends VetifyMobileLoggedBasePage {
    get avatarRoot() {
        return $('div[data-scope="avatar"][data-part="root"]');
    }

    get editDataBtn() {
        return $('//button[contains(., "Editar datos")]');
    }

    // Aviso fijo que reemplaza los inputs de nombre/apellido/DNI en modo edición (confirmado en
    // Playwright 2026-08-08: esos 3 campos NO son editables pese a lo que asumía el CP original).
    get correctDataNoticeLbl() {
        return $('//p[contains(., "Para corregir tu nombre")]');
    }

    get areaCodeInput() {
        return $('input[name="areaCode"]');
    }

    get phoneNumberInput() {
        return $('input[name="phoneNumber"]');
    }

    get saveBtn() {
        return $('//button[contains(., "Guardar")]');
    }

    get profileUpdatedToastLbl() {
        return $('//*[contains(., "Perfil actualizado correctamente")]');
    }

    // data-state="visible" explícito -- el <img> del avatar ya existe en el DOM desde el
    // principio pero oculto (hidden, data-state="hidden") mientras se muestran las iniciales de
    // fallback; solo pasa a visible cuando hay una foto real cargada.
    get avatarImg() {
        return $('img[data-scope="avatar"][data-part="image"][data-state="visible"]');
    }

    // El <input type="file"> del avatar (solo existe en modo edición) NO tiene <label for="...">
    // asociado — a diferencia del paso de foto de mascota. El trigger real confirmado en vivo es
    // el propio div del avatar (clickear el contenedor del input no dispara nada). Ver IMP-011
    // (docs/impedimentos-bloqueos.md) y BasePage.selectPhotoViaNativePicker().
    async changeProfilePhoto(): Promise<void> {
        await this.selectPhotoViaNativePicker('div[data-scope="avatar"][data-part="root"]');
    }

    async load(): Promise<void> {
        await this.navigateTo('/section/myprofile');
    }

    // Nombre completo y DNI: en Playwright se ubican con xpath (text()/preceding-sibling sobre
    // <p>) — probado en vivo contra este WebView y el motor de XPath de Appium NO resuelve
    // funciones tipo text()/starts-with()/normalize-space() acá (confirmado: la misma búsqueda
    // vía xpath no encuentra nada, pero un simple $$('p') sí trae los 14 <p> reales de la
    // pantalla, DNI incluido). Se usa CSS ($$('p')) + búsqueda de texto en JS en vez de xpath.
    async getAllParagraphTexts(): Promise<string[]> {
        const paragraphs = await $$('p');
        const texts: string[] = [];
        for (const p of paragraphs) {
            texts.push(await p.getText());
        }
        return texts;
    }

    async verifyProfileDataVisible(): Promise<void> {
        await this.avatarRoot.waitForDisplayed({ timeout: 20_000 });
        if (!(await this.editDataBtn.isExisting())) throw new Error('editDataBtn no existe en el DOM');
    }

    async openEditData(): Promise<void> {
        await this.editDataBtn.click();
        await this.saveBtn.waitForDisplayed({ timeout: 10_000 });
    }

    async updatePhone(areaCode: string, phoneNumber: string): Promise<void> {
        await this.areaCodeInput.setValue(areaCode);
        await this.phoneNumberInput.setValue(phoneNumber);
        // El teclado en pantalla queda tapando el botón "Guardar" (viewport chico, ~320x616) —
        // confirmado en vivo: sin esto, el click queda interceptado por otro elemento.
        await browser.hideKeyboard().catch(() => undefined);
    }

    async saveChanges(): Promise<void> {
        // .click() nativo (por coordenadas) queda interceptado por otro elemento en este layout
        // angosto (~320px) — confirmado en vivo con 2 coordenadas distintas en 2 corridas. Se usa
        // click vía JS (invoca el handler del DOM directo), que no depende de superposición visual.
        const btn = await this.saveBtn;
        await browser.execute((el: HTMLElement) => el.click(), btn);
        await this.profileUpdatedToastLbl.waitForDisplayed({ timeout: 10_000 });
    }
}
